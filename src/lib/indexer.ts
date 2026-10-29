import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as Location from "expo-location";
import * as MediaLibrary from "expo-media-library";

import * as db from "./db";
import { embedImage, isAiConfigured } from "./gemini";
import { bumpVersion, getIndexState, setIndexState } from "./store";
import { toBlob } from "./vector";

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE = 300;

let stopRequested = false;

export function stopIndexing() {
  stopRequested = true;
}

async function pool<T>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<void>,
) {
  let i = 0;
  const workers = Array.from(
    { length: Math.min(size, items.length) },
    async () => {
      while (i < items.length && !stopRequested) {
        const item = items[i++];
        await fn(item);
      }
    },
  );
  await Promise.all(workers);
}

export async function ensureMediaPermission(): Promise<boolean> {
  const current = await MediaLibrary.getPermissionsAsync(false, ["photo"]);
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const res = await MediaLibrary.requestPermissionsAsync(false, ["photo"]);
  return res.granted;
}

export async function getScanDays(): Promise<number> {
  return Number((await db.getSetting("scan_days")) ?? 365);
}

/** Step 1: read photo metadata (cheap) from the library into the local database. */
async function scanLibrary() {
  const days = await getScanDays();
  const since = Date.now() - days * DAY_MS;
  setIndexState({
    phase: "scanning",
    done: 0,
    total: 0,
    message: "사진첩을 살펴보는 중",
  });
  let offset = 0;
  let seen = 0;
  while (!stopRequested) {
    const page = await new MediaLibrary.Query()
      .eq(MediaLibrary.AssetField.MEDIA_TYPE, MediaLibrary.MediaType.IMAGE)
      .gte(MediaLibrary.AssetField.CREATION_TIME, since)
      .orderBy({ key: MediaLibrary.AssetField.CREATION_TIME, ascending: false })
      .limit(PAGE)
      .offset(offset)
      .exeForMetadata();
    if (page.length === 0) break;
    await db.insertPhotos(
      page
        .filter((m) => m.creationTime != null)
        .map((m) => ({
          id: m.id,
          createdAt: m.creationTime as number,
          width: m.width,
          height: m.height,
          favorite: m.isFavorite,
        })),
    );
    seen += page.length;
    offset += page.length;
    setIndexState({
      done: seen,
      message: `사진 ${seen.toLocaleString()}장 확인`,
    });
    bumpVersion();
    if (page.length < PAGE) break;
  }
}

/** Step 2: read GPS coordinates stored in each photo. */
async function readLocations() {
  const { pendingLocation } = await db.indexStats();
  setIndexState({
    phase: "locating",
    done: 0,
    total: pendingLocation,
    message: "사진 속 위치를 읽는 중",
  });
  let done = 0;
  while (!stopRequested) {
    const ids = await db.photosNeedingLocation(200);
    if (ids.length === 0) break;
    await pool(ids, 6, async (id) => {
      let loc: MediaLibrary.Location | null = null;
      try {
        loc = await new MediaLibrary.Asset(id).getLocation();
      } catch {}
      const valid = loc && (loc.latitude !== 0 || loc.longitude !== 0);
      await db.setLocation(
        id,
        valid && loc ? { lat: loc.latitude, lng: loc.longitude } : null,
      );
      done++;
    });
    setIndexState({ done });
    bumpVersion();
  }
}

/** "서울특별시" → "서울", "제주특별자치도" → "제주" so labels stay short. */
function shortRegion(name: string | null | undefined): string | null {
  if (!name) return null;
  return name.replace(/(특별자치시|특별자치도|특별시|광역시)$/, "") || name;
}

function placeLabel(a: Location.LocationGeocodedAddress): string {
  const big = shortRegion(a.city || a.region || a.subregion);
  const small = a.district || a.subregion || a.street;
  const parts = [big, small].filter(
    (x, i, arr): x is string => !!x && arr.indexOf(x) === i,
  );
  return parts.join(" ") || a.name || a.country || "알 수 없는 곳";
}

/** Step 3: turn coordinates into place names ("부산 해운대구"). */
async function namePlaces() {
  let perm = await Location.getForegroundPermissionsAsync();
  if (!perm.granted && perm.canAskAgain)
    perm = await Location.requestForegroundPermissionsAsync();
  if (!perm.granted) return;

  const cells = await db.placeCellsNeedingGeocode(1000);
  setIndexState({
    phase: "naming",
    done: 0,
    total: cells.length,
    message: "장소 이름을 찾는 중",
  });
  let done = 0;
  for (const cell of cells) {
    if (stopRequested) break;
    try {
      const [addr] = await Location.reverseGeocodeAsync({
        latitude: cell.lat,
        longitude: cell.lng,
      });
      if (addr) {
        await db.upsertPlace({
          key: cell.key,
          label: placeLabel(addr),
          city: addr.city ?? null,
          district: addr.district ?? null,
          region: addr.region ?? null,
          name: addr.name ?? null,
          lat: cell.lat,
          lng: cell.lng,
        });
      }
    } catch {
      // The platform geocoder is rate limited; pause and move on.
      await new Promise((r) => setTimeout(r, 2000));
    }
    done++;
    if (done % 10 === 0) {
      setIndexState({ done });
      bumpVersion();
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  bumpVersion();
}

async function photoToJpegBase64(
  id: string,
  width: number,
  height: number,
): Promise<string> {
  const uri = await new MediaLibrary.Asset(id).getUri();
  const ctx = ImageManipulator.manipulate(uri);
  ctx.resize(width >= height ? { width: 512 } : { height: 512 });
  const image = await ctx.renderAsync();
  const out = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.7,
    base64: true,
  });
  if (!out.base64) throw new Error("이미지 변환 실패");
  return out.base64;
}

/** Step 4: ask Gemini to turn each photo into a vector so it can be found by words. */
async function analyzePhotos() {
  if (!(await isAiConfigured())) return;
  const stats = await db.indexStats();
  const total = stats.total - stats.embedded;
  setIndexState({
    phase: "analyzing",
    done: 0,
    total,
    message: "AI가 사진 내용을 익히는 중",
  });
  let done = 0;
  let consecutiveErrors = 0;
  while (!stopRequested) {
    const ids = await db.photosNeedingEmbedding(30);
    if (ids.length === 0) break;
    const photos = await db.photosByIds(ids);
    await pool(ids, 3, async (id) => {
      const p = photos.get(id);
      try {
        const b64 = await photoToJpegBase64(id, p?.width ?? 1, p?.height ?? 1);
        const vec = await embedImage(b64);
        await db.setEmbedding(id, toBlob(vec));
        consecutiveErrors = 0;
      } catch (e: any) {
        await db.markEmbedFailed(id);
        consecutiveErrors++;
        if (e?.status === 400 || e?.status === 401 || e?.status === 403) {
          // Bad key or request: stop instead of burning through every photo.
          if (consecutiveErrors >= 3) {
            stopRequested = true;
            setIndexState({
              phase: "error",
              message: `AI 분석 중단: ${e.message}`,
            });
          }
        }
      }
      done++;
    });
    setIndexState({ done });
    bumpVersion();
  }
}

/** Runs every step; safe to call repeatedly — finished work is skipped. */
export async function runIndexing(): Promise<void> {
  if (getIndexState().running) return;
  stopRequested = false;
  setIndexState({ running: true, phase: "scanning", message: null });
  try {
    if (!(await ensureMediaPermission())) {
      setIndexState({ phase: "error", message: "사진 접근 권한이 필요해요" });
      return;
    }
    await scanLibrary();
    if (!stopRequested) await readLocations();
    if (!stopRequested) await namePlaces();
    if (!stopRequested) await analyzePhotos();
    if (getIndexState().phase !== "error") {
      setIndexState({
        phase: stopRequested ? "idle" : "done",
        message: stopRequested ? "일시정지됨" : null,
      });
    }
  } catch (e: any) {
    setIndexState({ phase: "error", message: e?.message ?? "알 수 없는 오류" });
  } finally {
    setIndexState({ running: false });
    bumpVersion();
  }
}

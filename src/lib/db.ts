import * as SQLite from "expo-sqlite";

import type { Mood } from "@/constants/theme";

export type Photo = {
  id: string;
  createdAt: number;
  width: number;
  height: number;
  favorite: boolean;
  lat: number | null;
  lng: number | null;
  placeKey: string | null;
  placeLabel: string | null;
  hasEmbedding: boolean;
};

export type Place = {
  key: string;
  label: string;
  city: string | null;
  district: string | null;
  region: string | null;
  name: string | null;
  lat: number;
  lng: number;
};

export type Note = {
  day: string;
  mood: Mood | null;
  text: string;
  updatedAt: number;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync("haru.db");
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS photos (
          id TEXT PRIMARY KEY NOT NULL,
          created_at INTEGER NOT NULL,
          width INTEGER,
          height INTEGER,
          favorite INTEGER DEFAULT 0,
          lat REAL,
          lng REAL,
          loc_checked INTEGER DEFAULT 0,
          place_key TEXT,
          embedding BLOB,
          embed_failed INTEGER DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS photos_created ON photos(created_at);
        CREATE INDEX IF NOT EXISTS photos_place ON photos(place_key);
        CREATE TABLE IF NOT EXISTS places (
          key TEXT PRIMARY KEY NOT NULL,
          label TEXT NOT NULL,
          city TEXT, district TEXT, region TEXT, name TEXT,
          lat REAL, lng REAL
        );
        CREATE TABLE IF NOT EXISTS notes (
          day TEXT PRIMARY KEY NOT NULL,
          mood INTEGER,
          text TEXT DEFAULT '',
          updated_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT);
      `);
      return db;
    })();
  }
  return dbPromise;
}

type PhotoDbRow = {
  id: string;
  created_at: number;
  width: number | null;
  height: number | null;
  favorite: number | null;
  lat: number | null;
  lng: number | null;
  place_key: string | null;
  label: string | null;
  has_embedding: number;
};

const PHOTO_SELECT = `
  SELECT p.id, p.created_at, p.width, p.height, p.favorite, p.lat, p.lng, p.place_key,
         pl.label, (p.embedding IS NOT NULL) AS has_embedding
  FROM photos p LEFT JOIN places pl ON pl.key = p.place_key`;

function toPhoto(r: PhotoDbRow): Photo {
  return {
    id: r.id,
    createdAt: r.created_at,
    width: r.width ?? 0,
    height: r.height ?? 0,
    favorite: !!r.favorite,
    lat: r.lat,
    lng: r.lng,
    placeKey: r.place_key,
    placeLabel: r.label,
    hasEmbedding: !!r.has_embedding,
  };
}

export async function insertPhotos(
  rows: {
    id: string;
    createdAt: number;
    width: number | null;
    height: number | null;
    favorite: boolean;
  }[],
): Promise<number> {
  const db = await getDb();
  let added = 0;
  await db.withTransactionAsync(async () => {
    for (const r of rows) {
      const res = await db.runAsync(
        "INSERT OR IGNORE INTO photos (id, created_at, width, height, favorite) VALUES (?, ?, ?, ?, ?)",
        r.id,
        r.createdAt,
        r.width,
        r.height,
        r.favorite ? 1 : 0,
      );
      added += res.changes;
    }
  });
  return added;
}

export async function photosNeedingLocation(limit: number): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string }>(
    "SELECT id FROM photos WHERE loc_checked = 0 ORDER BY created_at DESC LIMIT ?",
    limit,
  );
  return rows.map((r) => r.id);
}

export async function setLocation(
  id: string,
  loc: { lat: number; lng: number } | null,
) {
  const db = await getDb();
  if (!loc) {
    await db.runAsync("UPDATE photos SET loc_checked = 1 WHERE id = ?", id);
    return;
  }
  await db.runAsync(
    "UPDATE photos SET lat = ?, lng = ?, place_key = ?, loc_checked = 1 WHERE id = ?",
    loc.lat,
    loc.lng,
    placeKeyFor(loc.lat, loc.lng),
    id,
  );
}

/** ~1km grid cell; photos in the same cell share one reverse-geocoded place. */
export function placeKeyFor(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

export async function placeCellsNeedingGeocode(limit: number) {
  const db = await getDb();
  return db.getAllAsync<{ key: string; lat: number; lng: number; n: number }>(
    `SELECT p.place_key AS key, AVG(p.lat) AS lat, AVG(p.lng) AS lng, COUNT(*) AS n
     FROM photos p LEFT JOIN places pl ON pl.key = p.place_key
     WHERE p.place_key IS NOT NULL AND pl.key IS NULL
     GROUP BY p.place_key ORDER BY n DESC LIMIT ?`,
    limit,
  );
}

export async function upsertPlace(p: Place) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO places (key, label, city, district, region, name, lat, lng)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    p.key,
    p.label,
    p.city,
    p.district,
    p.region,
    p.name,
    p.lat,
    p.lng,
  );
}

export async function allPlaces(): Promise<(Place & { count: number })[]> {
  const db = await getDb();
  return db.getAllAsync<Place & { count: number }>(
    `SELECT pl.key, pl.label, pl.city, pl.district, pl.region, pl.name, pl.lat, pl.lng,
            COUNT(p.id) AS count
     FROM places pl JOIN photos p ON p.place_key = pl.key
     GROUP BY pl.key ORDER BY count DESC`,
  );
}

export async function photosNeedingEmbedding(limit: number): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string }>(
    "SELECT id FROM photos WHERE embedding IS NULL AND embed_failed < 3 ORDER BY created_at DESC LIMIT ?",
    limit,
  );
  return rows.map((r) => r.id);
}

export async function setEmbedding(id: string, blob: Uint8Array) {
  const db = await getDb();
  await db.runAsync("UPDATE photos SET embedding = ? WHERE id = ?", blob, id);
}

export async function markEmbedFailed(id: string) {
  const db = await getDb();
  await db.runAsync(
    "UPDATE photos SET embed_failed = embed_failed + 1 WHERE id = ?",
    id,
  );
}

export async function indexStats() {
  const db = await getDb();
  const r = await db.getFirstAsync<{
    total: number;
    located: number;
    embedded: number;
    pending_loc: number;
  }>(
    `SELECT COUNT(*) AS total,
            SUM(lat IS NOT NULL) AS located,
            SUM(embedding IS NOT NULL) AS embedded,
            SUM(loc_checked = 0) AS pending_loc
     FROM photos`,
  );
  return {
    total: r?.total ?? 0,
    located: r?.located ?? 0,
    embedded: r?.embedded ?? 0,
    pendingLocation: r?.pending_loc ?? 0,
  };
}

export async function photosInRange(
  from: number,
  to: number,
): Promise<Photo[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PhotoDbRow>(
    `${PHOTO_SELECT} WHERE p.created_at >= ? AND p.created_at < ? ORDER BY p.created_at ASC`,
    from,
    to,
  );
  return rows.map(toPhoto);
}

export async function photosByIds(ids: string[]): Promise<Map<string, Photo>> {
  const db = await getDb();
  const out = new Map<string, Photo>();
  for (let i = 0; i < ids.length; i += 400) {
    const chunk = ids.slice(i, i + 400);
    const rows = await db.getAllAsync<PhotoDbRow>(
      `${PHOTO_SELECT} WHERE p.id IN (${chunk.map(() => "?").join(",")})`,
      ...chunk,
    );
    rows.forEach((r) => out.set(r.id, toPhoto(r)));
  }
  return out;
}

export async function photoById(id: string): Promise<Photo | null> {
  return (await photosByIds([id])).get(id) ?? null;
}

export async function locatedPhotos(): Promise<Photo[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PhotoDbRow>(
    `${PHOTO_SELECT} WHERE p.lat IS NOT NULL ORDER BY p.created_at DESC`,
  );
  return rows.map(toPhoto);
}

export async function allEmbeddings(): Promise<
  {
    id: string;
    createdAt: number;
    placeKey: string | null;
    embedding: Uint8Array;
  }[]
> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    created_at: number;
    place_key: string | null;
    embedding: Uint8Array;
  }>(
    "SELECT id, created_at, place_key, embedding FROM photos WHERE embedding IS NOT NULL",
  );
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    placeKey: r.place_key,
    embedding: r.embedding,
  }));
}

export async function embeddingFor(id: string): Promise<Uint8Array | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ embedding: Uint8Array | null }>(
    "SELECT embedding FROM photos WHERE id = ?",
    id,
  );
  return r?.embedding ?? null;
}

export async function photoIdsMatching(opts: {
  from?: number;
  to?: number;
  placeKeys?: string[];
}) {
  const db = await getDb();
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts.from != null) {
    where.push("created_at >= ?");
    params.push(opts.from);
  }
  if (opts.to != null) {
    where.push("created_at < ?");
    params.push(opts.to);
  }
  if (opts.placeKeys?.length) {
    where.push(`place_key IN (${opts.placeKeys.map(() => "?").join(",")})`);
    params.push(...opts.placeKeys);
  }
  const rows = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM photos ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY created_at DESC LIMIT 500`,
    ...params,
  );
  return rows.map((r) => r.id);
}

// ---- notes ----

export async function getNote(day: string): Promise<Note | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<{
    day: string;
    mood: number | null;
    text: string | null;
    updated_at: number;
  }>("SELECT * FROM notes WHERE day = ?", day);
  return r
    ? {
        day: r.day,
        mood: (r.mood as Mood) ?? null,
        text: r.text ?? "",
        updatedAt: r.updated_at,
      }
    : null;
}

export async function saveNote(
  day: string,
  patch: { mood?: Mood | null; text?: string },
) {
  const db = await getDb();
  const prev = await getNote(day);
  const mood = patch.mood !== undefined ? patch.mood : (prev?.mood ?? null);
  const text = patch.text !== undefined ? patch.text : (prev?.text ?? "");
  await db.runAsync(
    "INSERT OR REPLACE INTO notes (day, mood, text, updated_at) VALUES (?, ?, ?, ?)",
    day,
    mood,
    text,
    Date.now(),
  );
}

export async function notesInRange(
  fromDay: string,
  toDay: string,
): Promise<Note[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    day: string;
    mood: number | null;
    text: string | null;
    updated_at: number;
  }>(
    "SELECT * FROM notes WHERE day >= ? AND day < ? ORDER BY day ASC",
    fromDay,
    toDay,
  );
  return rows.map((r) => ({
    day: r.day,
    mood: (r.mood as Mood) ?? null,
    text: r.text ?? "",
    updatedAt: r.updated_at,
  }));
}

// ---- key/value settings ----

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM kv WHERE key = ?",
    key,
  );
  return r?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)",
    key,
    value,
  );
}

export async function clearEmbeddings() {
  const db = await getDb();
  await db.runAsync("UPDATE photos SET embedding = NULL, embed_failed = 0");
}

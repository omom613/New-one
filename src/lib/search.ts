import * as db from "./db";
import { embedText, isAiConfigured } from "./gemini";
import { parseQuery, type ParsedQuery } from "./query";
import { getIndexState } from "./store";
import { dot, fromBlob } from "./vector";

type Vec = {
  id: string;
  createdAt: number;
  placeKey: string | null;
  vec: Float32Array;
};
let cache: { version: number; items: Vec[] } | null = null;

async function vectors(): Promise<Vec[]> {
  const version = getIndexState().version;
  if (cache && cache.version === version) return cache.items;
  const rows = await db.allEmbeddings();
  const items = rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    placeKey: r.placeKey,
    vec: fromBlob(r.embedding),
  }));
  cache = { version, items };
  return items;
}

export type SearchResult = {
  parsed: ParsedQuery;
  photos: db.Photo[];
  mode: "semantic" | "filter" | "empty";
  notice?: string;
};

const TOP_K = 60;

export async function search(raw: string): Promise<SearchResult> {
  const places = await db.allPlaces();
  const parsed = parseQuery(raw, places);
  const hasFilter = parsed.from != null || parsed.placeKeys.length > 0;

  if (!parsed.text) {
    if (!hasFilter) return { parsed, photos: [], mode: "empty" };
    const ids = await db.photoIdsMatching({
      from: parsed.from,
      to: parsed.to,
      placeKeys: parsed.placeKeys,
    });
    const map = await db.photosByIds(ids);
    return {
      parsed,
      photos: ids.map((id) => map.get(id)!).filter(Boolean),
      mode: "filter",
    };
  }

  if (!(await isAiConfigured())) {
    return {
      parsed,
      photos: [],
      mode: "empty",
      notice: "사진 내용으로 찾으려면 설정에서 Gemini API 키를 넣어 주세요.",
    };
  }

  const all = await vectors();
  if (all.length === 0) {
    return {
      parsed,
      photos: [],
      mode: "empty",
      notice: "아직 AI가 분석한 사진이 없어요. 사진 분석을 먼저 시작해 주세요.",
    };
  }
  const keySet = new Set(parsed.placeKeys);
  const pool = all.filter(
    (v) =>
      (parsed.from == null ||
        (v.createdAt >= parsed.from &&
          v.createdAt < (parsed.to ?? Infinity))) &&
      (keySet.size === 0 || (v.placeKey != null && keySet.has(v.placeKey))),
  );
  const q = await embedText(parsed.text);
  const ranked = pool
    .map((v) => ({ id: v.id, score: dot(q, v.vec) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K);
  const map = await db.photosByIds(ranked.map((r) => r.id));
  return {
    parsed,
    photos: ranked.map((r) => map.get(r.id)!).filter(Boolean),
    mode: "semantic",
  };
}

/** Photos that look like the given one (image-to-image, no extra API call). */
export async function similarPhotos(
  id: string,
  limit = 24,
): Promise<db.Photo[]> {
  const blob = await db.embeddingFor(id);
  if (!blob) return [];
  const target = fromBlob(blob);
  const ranked = (await vectors())
    .filter((v) => v.id !== id)
    .map((v) => ({ id: v.id, score: dot(target, v.vec) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  const map = await db.photosByIds(ranked.map((r) => r.id));
  return ranked.map((r) => map.get(r.id)!).filter(Boolean);
}

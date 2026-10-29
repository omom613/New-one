import type { Photo } from "./db";

export type Moment = {
  id: string;
  start: number;
  end: number;
  placeLabel: string | null;
  photos: Photo[];
};

const GAP_MS = 45 * 60 * 1000;

/**
 * Groups a day's photos into "moments": photos close in time at the same place.
 * Expects photos sorted by time ascending.
 */
export function groupMoments(photos: Photo[]): Moment[] {
  const out: Moment[] = [];
  let cur: Moment | null = null;
  // Last known place in the current moment (photos without GPS don't reset it).
  let curKey: string | null = null;
  for (const p of photos) {
    // Unknown location never splits a moment; a known, different place does.
    const samePlace = !p.placeKey || !curKey || p.placeKey === curKey;
    if (cur && p.createdAt - cur.end <= GAP_MS && samePlace) {
      cur.photos.push(p);
      cur.end = p.createdAt;
      cur.placeLabel = cur.placeLabel ?? p.placeLabel;
    } else {
      cur = {
        id: p.id,
        start: p.createdAt,
        end: p.createdAt,
        placeLabel: p.placeLabel,
        photos: [p],
      };
      out.push(cur);
      curKey = null;
    }
    curKey = p.placeKey ?? curKey;
  }
  return out;
}

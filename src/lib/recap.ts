import type { Mood } from "@/constants/theme";

import * as db from "./db";
import { dayKey, formatShortDate, type Range } from "./dates";
import { generateText } from "./gemini";
import { groupMoments } from "./moments";
import { haversineKm } from "./vector";

export type Recap = {
  range: Range;
  photoCount: number;
  activeDays: number;
  placeCount: number;
  distanceKm: number;
  topPlaces: { label: string; count: number }[];
  moods: Record<Mood, number>;
  averageMood: number | null;
  highlights: db.Photo[];
  days: { day: string; count: number; mood: Mood | null }[];
  notes: db.Note[];
};

export async function buildRecap(range: Range): Promise<Recap> {
  const photos = await db.photosInRange(range.from, range.to);
  const notes = await db.notesInRange(dayKey(range.from), dayKey(range.to));

  const byDay = new Map<string, db.Photo[]>();
  for (const p of photos) {
    const k = dayKey(p.createdAt);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(p);
  }

  // Distance: straight-line hops between consecutive located photos within a day.
  let distanceKm = 0;
  for (const list of byDay.values()) {
    let prev: db.Photo | null = null;
    for (const p of list) {
      if (p.lat == null || p.lng == null) continue;
      if (prev && prev.lat != null && prev.lng != null) {
        const d = haversineKm(prev.lat, prev.lng, p.lat, p.lng);
        if (d > 0.05) distanceKm += d;
      }
      prev = p;
    }
  }

  const placeCounts = new Map<string, number>();
  for (const p of photos) {
    if (p.placeLabel)
      placeCounts.set(p.placeLabel, (placeCounts.get(p.placeLabel) ?? 0) + 1);
  }
  const topPlaces = [...placeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));

  const moods = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<Mood, number>;
  let moodSum = 0;
  let moodN = 0;
  const moodByDay = new Map<string, Mood>();
  for (const n of notes) {
    if (n.mood) {
      moods[n.mood]++;
      moodSum += n.mood;
      moodN++;
      moodByDay.set(n.day, n.mood);
    }
  }

  // Highlights: favorites first, then the middle photo of each day's biggest moment.
  const picks: db.Photo[] = [];
  for (const list of byDay.values()) {
    const fav = list.find((p) => p.favorite);
    if (fav) {
      picks.push(fav);
      continue;
    }
    const biggest = groupMoments(list).sort(
      (a, b) => b.photos.length - a.photos.length,
    )[0];
    if (biggest)
      picks.push(biggest.photos[Math.floor(biggest.photos.length / 2)]);
  }
  const step = Math.max(1, Math.ceil(picks.length / 9));
  const highlights = picks.filter((_, i) => i % step === 0).slice(0, 9);

  const allDays = new Set([...byDay.keys(), ...notes.map((n) => n.day)]);
  const days = [...allDays].sort().map((day) => ({
    day,
    count: byDay.get(day)?.length ?? 0,
    mood: moodByDay.get(day) ?? null,
  }));

  return {
    range,
    photoCount: photos.length,
    activeDays: allDays.size,
    placeCount: placeCounts.size,
    distanceKm,
    topPlaces,
    moods,
    averageMood: moodN ? moodSum / moodN : null,
    highlights,
    days,
    notes,
  };
}

const MOOD_WORD: Record<Mood, string> = {
  1: "힘듦",
  2: "별로",
  3: "그럭저럭",
  4: "좋음",
  5: "최고",
};

/** Asks Gemini for a short, warm recap of the period. Only stats and notes are sent, never photos. */
export async function writeRecapSummary(r: Recap): Promise<string> {
  const lines = [
    `기간: ${r.range.label} (${formatShortDate(r.range.from)}~${formatShortDate(r.range.to - 1)})`,
    `사진 ${r.photoCount}장, 기록한 날 ${r.activeDays}일, 방문한 곳 ${r.placeCount}곳, 이동 약 ${Math.round(r.distanceKm)}km`,
    `자주 간 곳: ${r.topPlaces.map((p) => `${p.label}(${p.count})`).join(", ") || "없음"}`,
    `기분: ${
      r.days
        .filter((d) => d.mood)
        .map((d) => `${d.day} ${MOOD_WORD[d.mood!]}`)
        .join(", ") || "기록 없음"
    }`,
    `메모: ${
      r.notes
        .filter((n) => n.text)
        .map((n) => `[${n.day}] ${n.text.slice(0, 200)}`)
        .join(" / ") || "없음"
    }`,
  ];
  const prompt = `너는 따뜻하고 차분한 하루 기록 앱의 회고 도우미야.
아래 기록을 바탕으로 사용자에게 건네는 짧은 회고를 한국어로 써 줘.
- 3~4문장, 반말 말고 부드러운 존댓말
- 숫자는 꼭 필요한 것만, 과장하거나 없는 사실을 만들지 말 것
- 마지막 문장은 다음 기간을 위한 가벼운 응원

${lines.join("\n")}`;
  return generateText(prompt);
}

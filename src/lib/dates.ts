const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar day key, e.g. "2026-10-29". */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addDays(ms: number, days: number): number {
  const d = new Date(ms);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

/** Monday-based week start. */
export function startOfWeek(ms: number): number {
  const d = new Date(startOfDay(ms));
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d.getTime();
}

export function startOfMonth(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export function startOfYear(ms: number): number {
  return new Date(new Date(ms).getFullYear(), 0, 1).getTime();
}

export type Range = { from: number; to: number; label: string };

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function formatDayTitle(ms: number): string {
  const d = new Date(ms);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`;
}

export function formatFullDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}년 ${formatDayTitle(ms)}`;
}

export function formatTime(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${h12}:${pad(d.getMinutes())}`;
}

export function formatShortDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

export function greeting(now = Date.now()): string {
  const h = new Date(now).getHours();
  if (h < 5) return "늦은 밤이에요";
  if (h < 11) return "좋은 아침이에요";
  if (h < 17) return "좋은 오후예요";
  if (h < 21) return "편안한 저녁이에요";
  return "오늘 하루 수고했어요";
}

export const ranges = {
  week(now = Date.now()): Range {
    const from = startOfWeek(now);
    return { from, to: addDays(from, 7), label: "이번 주" };
  },
  month(now = Date.now()): Range {
    const from = startOfMonth(now);
    const d = new Date(from);
    return {
      from,
      to: new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(),
      label: "이번 달",
    };
  },
  year(now = Date.now()): Range {
    const from = startOfYear(now);
    return {
      from,
      to: new Date(new Date(from).getFullYear() + 1, 0, 1).getTime(),
      label: "올해",
    };
  },
};

export { DAY_MS };

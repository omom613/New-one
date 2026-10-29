import type { Place } from "./db";
import {
  addDays,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "./dates";

export type ParsedQuery = {
  text: string;
  from?: number;
  to?: number;
  placeKeys: string[];
  chips: string[];
};

type PlaceLite = Pick<Place, "key" | "label" | "city" | "district" | "region">;

const FILLER = new Set([
  "사진",
  "사진들",
  "찍은",
  "에서",
  "때",
  "보여줘",
  "찾아줘",
  "모두",
  "전부",
]);
// Only unambiguous place particles: stripping 이/가/은 would turn 고양이 (cat) into 고양 (a city).
const PARTICLE = /(에서의|에서|에|의|까지|부터|랑|하고)$/;

/** Pulls date words and place names out of a query; what's left is matched by AI. */
export function parseQuery(
  raw: string,
  places: PlaceLite[],
  now = Date.now(),
): ParsedQuery {
  let q = ` ${raw.trim()} `;
  const result: ParsedQuery = { text: "", placeKeys: [], chips: [] };
  const setRange = (from: number, to: number, chip: string, re: RegExp) => {
    if (result.from == null) {
      result.from = from;
      result.to = to;
      result.chips.push(`📅 ${chip}`);
    }
    q = q.replace(re, " ");
  };

  const today = startOfDay(now);
  const rules: [RegExp, () => [number, number, string]][] = [
    [/오늘/, () => [today, addDays(today, 1), "오늘"]],
    [/어제/, () => [addDays(today, -1), today, "어제"]],
    [
      /이번\s?주/,
      () => [startOfWeek(now), addDays(startOfWeek(now), 7), "이번 주"],
    ],
    [
      /(지난|저번)\s?주/,
      () => [addDays(startOfWeek(now), -7), startOfWeek(now), "지난주"],
    ],
    [
      /이번\s?달/,
      () => {
        const d = new Date(now);
        return [
          startOfMonth(now),
          new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(),
          "이번 달",
        ];
      },
    ],
    [
      /(지난|저번)\s?달/,
      () => {
        const d = new Date(now);
        return [
          new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime(),
          startOfMonth(now),
          "지난달",
        ];
      },
    ],
    [
      /올해/,
      () => [
        startOfYear(now),
        new Date(new Date(now).getFullYear() + 1, 0, 1).getTime(),
        "올해",
      ],
    ],
    [
      /작년/,
      () => {
        const y = new Date(now).getFullYear() - 1;
        return [
          new Date(y, 0, 1).getTime(),
          new Date(y + 1, 0, 1).getTime(),
          "작년",
        ];
      },
    ],
  ];
  for (const [re, make] of rules) {
    if (re.test(q)) {
      const [f, t, chip] = make();
      setRange(f, t, chip, re);
    }
  }
  const year = q.match(/(\d{4})\s?년/);
  const month = q.match(/(\d{1,2})\s?월/);
  const m = month ? Number(month[1]) - 1 : -1;
  if (year && m >= 0 && m < 12) {
    const y = Number(year[1]);
    setRange(
      new Date(y, m, 1).getTime(),
      new Date(y, m + 1, 1).getTime(),
      `${y}년 ${m + 1}월`,
      /(\d{4})\s?년/,
    );
    q = q.replace(/(\d{1,2})\s?월/, " ");
  } else if (year) {
    const y = Number(year[1]);
    setRange(
      new Date(y, 0, 1).getTime(),
      new Date(y + 1, 0, 1).getTime(),
      `${y}년`,
      /(\d{4})\s?년/,
    );
  } else if (m >= 0 && m < 12) {
    // A bare month means the most recent one: "11월" in October is last November.
    const nowD = new Date(now);
    const y = m > nowD.getMonth() ? nowD.getFullYear() - 1 : nowD.getFullYear();
    setRange(
      new Date(y, m, 1).getTime(),
      new Date(y, m + 1, 1).getTime(),
      `${m + 1}월`,
      /(\d{1,2})\s?월/,
    );
  }

  const rest: string[] = [];
  for (const rawTok of q.split(/\s+/).filter(Boolean)) {
    const stripped = rawTok.replace(PARTICLE, "");
    if (!stripped || FILLER.has(rawTok) || FILLER.has(stripped)) continue;
    const matchPlaces = (t: string) =>
      t.length >= 2
        ? places.filter((p) =>
            [p.city, p.district, p.region, p.label].some(
              (f) => f && f.replace(/\s/g, "").includes(t),
            ),
          )
        : [];
    let tok = rawTok;
    let hits = matchPlaces(rawTok);
    if (!hits.length && stripped !== rawTok) {
      tok = stripped;
      hits = matchPlaces(stripped);
    }
    if (hits.length) {
      result.placeKeys.push(...hits.map((h) => h.key));
      result.chips.push(`📍 ${tok}`);
    } else {
      rest.push(rawTok);
    }
  }
  result.placeKeys = [...new Set(result.placeKeys)];
  result.text = rest.join(" ").trim();
  return result;
}

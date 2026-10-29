import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Blob, Bubbles } from "@/components/blob";
import { PhotoGrid } from "@/components/photos";
import { Card, PillButton, Screen, SectionHeader, Txt } from "@/components/ui";
import { Moods, Radius, Space, type Mood, usePalette } from "@/constants/theme";
import {
  addDays,
  dayKey,
  formatShortDate,
  parseDayKey,
  ranges,
} from "@/lib/dates";
import { isAiConfigured } from "@/lib/gemini";
import { buildRecap, writeRecapSummary, type Recap } from "@/lib/recap";
import { useDataVersion } from "@/lib/store";

type Period = "week" | "month" | "year";
const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "이번 주" },
  { key: "month", label: "이번 달" },
  { key: "year", label: "올해" },
];

export default function RecapScreen() {
  const c = usePalette();
  const version = useDataVersion();
  const [period, setPeriod] = useState<Period>("week");
  const [recap, setRecap] = useState<Recap | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [ai, setAi] = useState(false);

  useFocusEffect(
    useCallback(() => {
      buildRecap(ranges[period]()).then(setRecap);
      isAiConfigured().then(setAi);
    }, [period, version]),
  );

  const choose = (p: Period) => {
    setPeriod(p);
    setSummary(null);
    setSummaryError(null);
  };

  const makeSummary = async () => {
    if (!recap) return;
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      setSummary(await writeRecapSummary(recap));
    } catch (e: any) {
      setSummaryError(e?.message ?? "요약을 만들지 못했어요");
    } finally {
      setSummaryLoading(false);
    }
  };

  const avgMood = recap?.averageMood
    ? (Math.round(recap.averageMood) as Mood)
    : null;

  return (
    <Screen>
      <View style={{ gap: 2 }}>
        <Txt variant="small" soft>
          {recap
            ? `${formatShortDate(recap.range.from)} – ${formatShortDate(recap.range.to - 1)}`
            : " "}
        </Txt>
        <Txt variant="hero">돌아보기</Txt>
      </View>

      <View style={[styles.segment, { backgroundColor: c.surfaceAlt }]}>
        {PERIODS.map((p) => (
          <Pressable
            key={p.key}
            onPress={() => choose(p.key)}
            style={[
              styles.segItem,
              period === p.key && { backgroundColor: c.surface },
            ]}
          >
            <Txt variant="small" color={period === p.key ? c.ink : c.inkSoft}>
              {p.label}
            </Txt>
          </Pressable>
        ))}
      </View>

      {recap && (
        <>
          <Card color={c.purple} style={{ gap: Space.lg }}>
            <Bubbles color="#FFFFFF" />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: Space.md,
              }}
            >
              <Blob size={64} color={c.yellow} mood={avgMood ?? "calm"} />
              <View style={{ flex: 1 }}>
                <Txt variant="title" color="#FFFFFF">
                  {recap.activeDays > 0
                    ? `${recap.activeDays}일을 기록했어요`
                    : "아직 기록이 없어요"}
                </Txt>
                <Txt variant="small" color="#FFFFFFCC">
                  {avgMood
                    ? `대체로 '${Moods[avgMood - 1].label}'였던 ${recap.range.label}`
                    : `${recap.range.label}의 하루들`}
                </Txt>
              </View>
            </View>
            <View style={styles.stats}>
              <Stat value={recap.photoCount.toLocaleString()} label="사진" />
              <Stat value={String(recap.placeCount)} label="장소" />
              <Stat value={`${Math.round(recap.distanceKm)}km`} label="이동" />
            </View>
          </Card>

          <Card color={c.yellowSoft} style={{ gap: Space.md }}>
            <Txt variant="heading">✨ AI 한 줄 회고</Txt>
            {summary ? (
              <Txt>{summary}</Txt>
            ) : (
              <Txt variant="small" soft>
                {ai
                  ? "사진은 보내지 않고, 장소·기분·메모만으로 짧은 회고를 써 드려요."
                  : "설정에서 Gemini API 키를 넣으면 AI 회고를 받을 수 있어요."}
              </Txt>
            )}
            {summaryError && (
              <Txt variant="small" color={c.pink}>
                {summaryError}
              </Txt>
            )}
            <PillButton
              label={
                !ai ? "설정에서 연결하기" : summary ? "다시 쓰기" : "회고 받기"
              }
              icon="sparkles"
              tone={ai ? "dark" : "light"}
              loading={summaryLoading}
              disabled={recap.activeDays === 0}
              onPress={ai ? makeSummary : () => router.push("/settings")}
            />
          </Card>

          {(period === "week" || recap.days.length > 0) && (
            <>
              <SectionHeader title="기분 흐름" />
              <Card>
                <View
                  style={[
                    styles.moodStrip,
                    period === "week" && {
                      justifyContent: "space-between",
                      flexWrap: "nowrap",
                      gap: 0,
                    },
                  ]}
                >
                  {stripDays(recap, period).map((d) => (
                    <Pressable
                      key={d.day}
                      style={{ alignItems: "center", gap: 4 }}
                      onPress={() =>
                        router.push({
                          pathname: "/day/[date]",
                          params: { date: d.day },
                        })
                      }
                    >
                      <Blob
                        size={34}
                        color={
                          d.mood ? c[Moods[d.mood - 1].color] : c.surfaceAlt
                        }
                        mood={d.mood ?? "sleepy"}
                        faceColor={d.mood ? undefined : c.inkSoft}
                      />
                      <Txt
                        variant="tiny"
                        soft={!d.isToday}
                        color={d.isToday ? c.orange : undefined}
                      >
                        {d.label}
                      </Txt>
                    </Pressable>
                  ))}
                </View>
              </Card>
            </>
          )}

          {recap.topPlaces.length > 0 && (
            <>
              <SectionHeader title="자주 간 곳" />
              <Card style={{ gap: Space.md }}>
                {recap.topPlaces.map((p, i) => (
                  <View key={p.label} style={styles.placeRow}>
                    <View
                      style={[
                        styles.rank,
                        { backgroundColor: i === 0 ? c.orange : c.surfaceAlt },
                      ]}
                    >
                      <Txt variant="small" color={i === 0 ? "#FFFFFF" : c.ink}>
                        {i + 1}
                      </Txt>
                    </View>
                    <Txt variant="heading" style={{ flex: 1 }}>
                      {p.label}
                    </Txt>
                    <Txt variant="small" soft>
                      {p.count}장
                    </Txt>
                  </View>
                ))}
              </Card>
            </>
          )}

          {recap.highlights.length > 0 && (
            <>
              <SectionHeader title="하이라이트" />
              <PhotoGrid photos={recap.highlights} />
            </>
          )}
        </>
      )}
    </Screen>
  );
}

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

/** Week view: all 7 days (empty ones shown asleep). Longer periods: the last 14 recorded days. */
function stripDays(recap: Recap, period: Period) {
  const todayKey = dayKey(Date.now());
  if (period === "week") {
    const byDay = new Map(recap.days.map((d) => [d.day, d]));
    return WEEKDAYS.map((label, i) => {
      const day = dayKey(addDays(recap.range.from, i));
      return {
        day,
        label,
        mood: byDay.get(day)?.mood ?? null,
        isToday: day === todayKey,
      };
    });
  }
  return recap.days.slice(-14).map((d) => ({
    day: d.day,
    label: String(parseDayKey(d.day).getDate()),
    mood: d.mood,
    isToday: d.day === todayKey,
  }));
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Txt variant="title" color="#FFFFFF">
        {value}
      </Txt>
      <Txt variant="tiny" color="#FFFFFFCC">
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: "row", borderRadius: Radius.pill, padding: 4 },
  segItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: Radius.pill,
  },
  stats: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF22",
    borderRadius: Radius.md,
    paddingVertical: Space.md,
  },
  moodStrip: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  placeRow: { flexDirection: "row", alignItems: "center", gap: Space.md },
  rank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});

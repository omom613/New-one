import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Blob, Bubbles } from "@/components/blob";
import { IndexStatusCard } from "@/components/index-status";
import { MoodPicker } from "@/components/mood-picker";
import { MomentRow, PhotoStrip } from "@/components/photos";
import {
  Card,
  IconButton,
  PillButton,
  Screen,
  SectionHeader,
  Txt,
} from "@/components/ui";
import { Radius, Space, type Mood, usePalette } from "@/constants/theme";
import * as db from "@/lib/db";
import {
  addDays,
  dayKey,
  formatDayTitle,
  greeting,
  startOfDay,
} from "@/lib/dates";
import { groupMoments, type Moment } from "@/lib/moments";
import { useDataVersion } from "@/lib/store";

export default function TodayScreen() {
  const c = usePalette();
  const version = useDataVersion();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [photoCount, setPhotoCount] = useState(0);
  const [note, setNote] = useState<db.Note | null>(null);
  const [lastYear, setLastYear] = useState<db.Photo[]>([]);

  const now = Date.now();
  const today = dayKey(now);

  useFocusEffect(
    useCallback(() => {
      const from = startOfDay(Date.now());
      db.photosInRange(from, addDays(from, 1)).then((p) => {
        setPhotoCount(p.length);
        setMoments(groupMoments(p).reverse());
      });
      db.getNote(dayKey(from)).then(setNote);
      const ly = new Date(from);
      ly.setFullYear(ly.getFullYear() - 1);
      db.photosInRange(ly.getTime(), addDays(ly.getTime(), 1)).then(
        setLastYear,
      );
    }, [version]),
  );

  const pickMood = async (m: Mood) => {
    await db.saveNote(today, { mood: m });
    setNote(await db.getNote(today));
  };

  const openToday = () =>
    router.push({ pathname: "/day/[date]", params: { date: today } });

  return (
    <Screen>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View>
          <Txt variant="small" soft>
            {formatDayTitle(now)}
          </Txt>
          <Txt variant="hero">{greeting(now)}</Txt>
        </View>
        <IconButton
          name="settings-outline"
          onPress={() => router.push("/settings")}
        />
      </View>

      <Card color={c.orange} style={{ gap: Space.lg, padding: Space.lg }}>
        <Bubbles color="#FFFFFF" />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingLeft: Space.sm,
            paddingTop: Space.sm,
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Txt variant="title" color="#FFFFFF">
              오늘 하루,{"\n"}어땠나요?
            </Txt>
            <Txt variant="small" color="#FFFFFFD9" numberOfLines={2}>
              {note?.text
                ? `“${note.text}”`
                : "기분을 고르고 한 줄 남겨 보세요"}
            </Txt>
          </View>
          <Blob size={84} color={c.yellow} mood={note?.mood ?? "calm"} />
        </View>
        {/* Mood choices sit on a white tray so every color reads clearly on orange. */}
        <View style={[styles.tray, { backgroundColor: c.surface }]}>
          <MoodPicker value={note?.mood ?? null} onChange={pickMood} />
          <Pressable
            onPress={openToday}
            style={[styles.trayAction, { borderTopColor: c.line }]}
          >
            <Ionicons name="create-outline" size={18} color={c.orange} />
            <Txt variant="heading" color={c.orange}>
              {note?.text ? "오늘 기록 이어 쓰기" : "한 줄 쓰기"}
            </Txt>
          </Pressable>
        </View>
      </Card>

      <IndexStatusCard compact />

      <SectionHeader
        title="오늘의 순간"
        action={photoCount ? `사진 ${photoCount}장` : undefined}
        onAction={openToday}
      />
      {moments.length === 0 ? (
        <Card color={c.surface} style={{ alignItems: "center", gap: Space.sm }}>
          <Blob size={56} color={c.green} mood="sleepy" />
          <Txt variant="heading">아직 오늘 찍은 사진이 없어요</Txt>
          <Txt variant="small" soft style={{ textAlign: "center" }}>
            사진을 찍으면 시간과 장소에 맞춰{"\n"}오늘의 타임라인이 그려져요
          </Txt>
        </Card>
      ) : (
        <Card>
          {moments.slice(0, 4).map((m, i, arr) => (
            <MomentRow key={m.id} moment={m} last={i === arr.length - 1} />
          ))}
          {moments.length > 4 && (
            <PillButton
              label="전체 타임라인 보기"
              tone="ghost"
              onPress={openToday}
            />
          )}
        </Card>
      )}

      {lastYear.length > 0 && (
        <>
          <SectionHeader title="1년 전 오늘" />
          <Card color={c.purpleSoft} style={{ gap: Space.md }}>
            <Txt variant="small" soft>
              작년 이맘때 {lastYear[0].placeLabel ?? "어딘가"}에 있었어요
            </Txt>
            <PhotoStrip photos={lastYear} size={96} />
            <PillButton
              label="그날 보러 가기"
              tone="light"
              onPress={() =>
                router.push({
                  pathname: "/day/[date]",
                  params: { date: dayKey(lastYear[0].createdAt) },
                })
              }
            />
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tray: {
    borderRadius: Radius.md + 4,
    paddingTop: Space.lg,
    paddingHorizontal: Space.md,
  },
  trayAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: Space.lg,
    paddingVertical: Space.md + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

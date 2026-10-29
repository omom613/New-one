import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { Blob } from "@/components/blob";
import { MoodPicker } from "@/components/mood-picker";
import { MomentRow } from "@/components/photos";
import { Card, Screen, SectionHeader, Txt } from "@/components/ui";
import { Radius, Space, Type, type Mood, usePalette } from "@/constants/theme";
import * as db from "@/lib/db";
import { addDays, formatFullDate, parseDayKey } from "@/lib/dates";
import { groupMoments, type Moment } from "@/lib/moments";
import { bumpVersion, useDataVersion } from "@/lib/store";

export default function DayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const c = usePalette();
  const version = useDataVersion();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [count, setCount] = useState(0);
  const [mood, setMood] = useState<Mood | null>(null);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dayStart = parseDayKey(date).getTime();

  useEffect(() => {
    db.photosInRange(dayStart, addDays(dayStart, 1)).then((p) => {
      setCount(p.length);
      setMoments(groupMoments(p));
    });
  }, [dayStart, version]);

  useEffect(() => {
    db.getNote(date).then((n) => {
      setMood(n?.mood ?? null);
      setText(n?.text ?? "");
    });
  }, [date]);

  // Save the note shortly after typing stops.
  const onText = (t: string) => {
    setText(t);
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await db.saveNote(date, { text: t });
      setSaved(true);
      bumpVersion();
    }, 600);
  };

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  const onMood = async (m: Mood) => {
    setMood(m);
    await db.saveNote(date, { mood: m, text });
    bumpVersion();
  };

  const places = [...new Set(moments.map((m) => m.placeLabel).filter(Boolean))];

  return (
    <Screen edges="none">
      <Stack.Screen options={{ title: "" }} />
      <View style={{ gap: 2 }}>
        <Txt variant="small" soft>
          {count ? `사진 ${count}장 · ${places.length}곳` : "사진 없는 날"}
        </Txt>
        <Txt variant="hero">{formatFullDate(dayStart)}</Txt>
      </View>

      <Card style={{ gap: Space.lg }}>
        <Txt variant="heading">이날의 기분</Txt>
        <MoodPicker value={mood} onChange={onMood} />
        <TextInput
          value={text}
          onChangeText={onText}
          placeholder="오늘을 한 줄로 남겨 볼까요?"
          placeholderTextColor={c.inkSoft}
          multiline
          style={[
            Type.body,
            styles.input,
            { color: c.ink, backgroundColor: c.surfaceAlt },
          ]}
        />
        <Txt variant="tiny" soft style={{ textAlign: "right" }}>
          {saved ? "자동 저장됨" : "저장 중…"}
        </Txt>
      </Card>

      <SectionHeader title="타임라인" />
      {moments.length === 0 ? (
        <Card style={{ alignItems: "center", gap: Space.sm }}>
          <Blob size={52} color={c.green} mood="sleepy" />
          <Txt soft>이날은 사진이 없어요</Txt>
        </Card>
      ) : (
        <Card>
          {moments.map((m, i) => (
            <MomentRow key={m.id} moment={m} last={i === moments.length - 1} />
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 110,
    borderRadius: Radius.md,
    padding: Space.lg,
    textAlignVertical: "top",
  },
});

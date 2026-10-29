import { useEffect, useState } from "react";
import { Alert, Linking, StyleSheet, TextInput, View } from "react-native";

import { IndexStatusCard } from "@/components/index-status";
import { Card, Chip, PillButton, Screen, Txt } from "@/components/ui";
import { Radius, Space, Type, usePalette } from "@/constants/theme";
import * as db from "@/lib/db";
import { embedText, getStoredKey, setStoredKey } from "@/lib/gemini";
import { getScanDays } from "@/lib/indexer";
import { bumpVersion } from "@/lib/store";

const RANGE_OPTIONS = [
  { days: 90, label: "3개월" },
  { days: 365, label: "1년" },
  { days: 365 * 3, label: "3년" },
  { days: 365 * 20, label: "전체" },
];

export default function SettingsScreen() {
  const c = usePalette();
  const [key, setKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [scanDays, setScanDays] = useState(365);

  useEffect(() => {
    getStoredKey().then((k) => setHasKey(!!k));
    getScanDays().then(setScanDays);
  }, []);

  const saveKey = async () => {
    if (!key.trim()) return;
    setTesting(true);
    try {
      await setStoredKey(key);
      await embedText("연결 테스트");
      setHasKey(true);
      setKey("");
      bumpVersion();
      Alert.alert(
        "연결됐어요",
        "이제 사진 분석을 시작하면 사진 내용으로 검색할 수 있어요.",
      );
    } catch (e: any) {
      await setStoredKey(null);
      Alert.alert(
        "연결하지 못했어요",
        e?.message ?? "키를 다시 확인해 주세요.",
      );
    } finally {
      setTesting(false);
    }
  };

  const removeKey = async () => {
    await setStoredKey(null);
    setHasKey(false);
    bumpVersion();
  };

  const chooseRange = async (days: number) => {
    setScanDays(days);
    await db.setSetting("scan_days", String(days));
  };

  const resetAi = () =>
    Alert.alert(
      "AI 분석을 처음부터 다시 할까요?",
      "사진과 기록은 그대로 두고, 검색용 분석 결과만 지워요.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "다시 분석",
          style: "destructive",
          onPress: async () => {
            await db.clearEmbeddings();
            bumpVersion();
          },
        },
      ],
    );

  return (
    <Screen edges="none">
      <Card style={{ gap: Space.md }}>
        <Txt variant="heading">Gemini API 키</Txt>
        <Txt variant="small" soft>
          사진 내용 검색과 AI 회고에 쓰여요. 키는 이 기기의 보안 저장소에만
          저장돼요. 검색을 위해 축소한 사진이 Google로 전송된다는 점을 알아
          두세요.
        </Txt>
        {hasKey ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Txt variant="heading" color={c.green}>
              ● 연결됨
            </Txt>
            <PillButton label="키 지우기" tone="light" onPress={removeKey} />
          </View>
        ) : (
          <>
            <TextInput
              value={key}
              onChangeText={setKey}
              placeholder="AIza로 시작하는 키를 붙여 넣으세요"
              placeholderTextColor={c.inkSoft}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={[
                Type.body,
                styles.input,
                { color: c.ink, backgroundColor: c.surfaceAlt },
              ]}
            />
            <PillButton
              label="저장하고 연결 확인"
              loading={testing}
              onPress={saveKey}
              disabled={!key.trim()}
            />
            <PillButton
              label="무료 키 받으러 가기"
              tone="ghost"
              onPress={() =>
                Linking.openURL("https://aistudio.google.com/apikey")
              }
            />
          </>
        )}
      </Card>

      <Card style={{ gap: Space.md }}>
        <Txt variant="heading">불러올 사진 범위</Txt>
        <Txt variant="small" soft>
          범위가 넓을수록 처음 정리하는 데 오래 걸려요.
        </Txt>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {RANGE_OPTIONS.map((o) => (
            <Chip
              key={o.days}
              label={o.label}
              active={scanDays === o.days}
              onPress={() => chooseRange(o.days)}
            />
          ))}
        </View>
      </Card>

      <IndexStatusCard inSettings />

      <PillButton
        label="AI 분석 다시 하기"
        tone="light"
        icon="refresh"
        onPress={resetAi}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { height: 52, borderRadius: Radius.md, paddingHorizontal: Space.lg },
});

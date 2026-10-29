import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { Space, usePalette } from "@/constants/theme";
import { indexStats } from "@/lib/db";
import { isAiConfigured } from "@/lib/gemini";
import { runIndexing, stopIndexing } from "@/lib/indexer";
import { useIndexState } from "@/lib/store";

import { Blob } from "./blob";
import { Card, PillButton, ProgressBar, Txt } from "./ui";

const PHASE_LABEL = {
  idle: "대기 중",
  scanning: "사진첩 확인",
  locating: "위치 읽기",
  naming: "장소 이름 찾기",
  analyzing: "AI 사진 분석",
  done: "모두 끝났어요",
  error: "문제가 생겼어요",
};

/** Shows how far photo indexing has come and lets the user start or pause it. */
export function IndexStatusCard({
  compact,
  inSettings,
}: {
  compact?: boolean;
  inSettings?: boolean;
}) {
  const c = usePalette();
  const s = useIndexState();
  const [stats, setStats] = useState({
    total: 0,
    located: 0,
    embedded: 0,
    pendingLocation: 0,
  });
  const [ai, setAi] = useState(false);

  useEffect(() => {
    indexStats().then(setStats);
    isAiConfigured().then(setAi);
  }, [s.version]);

  const fresh = stats.total === 0;
  const complete =
    !fresh &&
    stats.pendingLocation === 0 &&
    (!ai || stats.embedded >= stats.total);
  if (compact && complete && !s.running) return null;

  return (
    <Card color={c.blueSoft} style={{ gap: Space.md }}>
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: Space.md }}
      >
        <Blob
          size={52}
          color={c.blue}
          mood={s.running ? 4 : "calm"}
          faceColor="#1B1F3B"
        />
        <View style={{ flex: 1 }}>
          <Txt variant="heading">
            {fresh
              ? "사진첩과 연결해 볼까요?"
              : s.running
                ? PHASE_LABEL[s.phase]
                : "사진 정리 현황"}
          </Txt>
          <Txt variant="small" soft>
            {fresh
              ? "사진의 날짜와 위치로 하루를 자동으로 그려 드려요"
              : `사진 ${stats.total.toLocaleString()}장 · 위치 ${stats.located.toLocaleString()} · AI 분석 ${stats.embedded.toLocaleString()}`}
          </Txt>
        </View>
      </View>
      {s.running && s.total > 0 && (
        <ProgressBar value={s.done / s.total} color={c.blue} />
      )}
      {s.message && (
        <Txt variant="small" soft>
          {s.message}
          {s.running && s.total > 0
            ? ` (${s.done.toLocaleString()}/${s.total.toLocaleString()})`
            : ""}
        </Txt>
      )}
      {!ai && !fresh && (
        <Txt variant="small" soft>
          {inSettings
            ? "사진 내용 검색을 쓰려면 위에서 Gemini API 키를 넣어 주세요."
            : "사진 내용 검색을 쓰려면 설정에서 Gemini API 키를 넣어 주세요."}
        </Txt>
      )}
      <View style={{ flexDirection: "row", gap: Space.sm }}>
        {s.running ? (
          <PillButton
            label="잠시 멈추기"
            icon="pause"
            tone="light"
            onPress={stopIndexing}
            style={{ flex: 1 }}
          />
        ) : (
          <PillButton
            label={fresh ? "사진 불러오기" : "새 사진 정리하기"}
            icon="images"
            onPress={() => runIndexing()}
            style={{ flex: 1, backgroundColor: c.blue }}
          />
        )}
        {!ai && !fresh && !inSettings && (
          <PillButton
            label="설정"
            tone="light"
            onPress={() => router.push("/settings")}
          />
        )}
      </View>
    </Card>
  );
}

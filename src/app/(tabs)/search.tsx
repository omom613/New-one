import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { Blob } from "@/components/blob";
import { IndexStatusCard } from "@/components/index-status";
import { PhotoGrid } from "@/components/photos";
import { Card, Chip, Screen, Txt } from "@/components/ui";
import {
  Radius,
  Space,
  Type,
  usePalette,
  type Palette,
} from "@/constants/theme";
import { search, type SearchResult } from "@/lib/search";

const TOPICS: {
  emoji: string;
  label: string;
  query: string;
  color: keyof Palette;
}[] = [
  { emoji: "🌊", label: "바다", query: "바다", color: "blueSoft" },
  { emoji: "🌅", label: "노을", query: "노을", color: "orangeSoft" },
  { emoji: "🍰", label: "맛있는 것", query: "음식", color: "yellowSoft" },
  { emoji: "☕", label: "카페", query: "카페", color: "pinkSoft" },
  {
    emoji: "🐶",
    label: "반려동물",
    query: "강아지 고양이",
    color: "greenSoft",
  },
  { emoji: "🌸", label: "꽃과 나무", query: "꽃", color: "purpleSoft" },
];

const EXAMPLES = ["지난주 카페", "작년 바다", "오늘", "어제 저녁 음식"];

const SUGGESTIONS = [
  "바다",
  "노을",
  "음식",
  "카페",
  "강아지",
  "고양이",
  "꽃",
  "하늘",
  "친구들",
  "지난주",
  "작년 여름 바다",
];

export default function SearchScreen() {
  const c = usePalette();
  const { width } = useWindowDimensions();
  const tileW = (width - 40 - 12) / 2;
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (text: string) => {
    const query = text.trim();
    setQ(text);
    if (!query) {
      setResult(null);
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    try {
      setResult(await search(query));
    } catch (e: any) {
      setError(e?.message ?? "검색 중 문제가 생겼어요");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={{ gap: 2 }}>
        <Txt variant="small" soft>
          사진 속 내용·장소·날짜로 찾아요
        </Txt>
        <Txt variant="hero">어떤 순간을 찾으세요?</Txt>
      </View>

      <View style={[styles.searchBox, { backgroundColor: c.surface }]}>
        <Ionicons name="search" size={20} color={c.inkSoft} />
        <TextInput
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => run(q)}
          placeholder="예: 부산 바다, 지난주 카페, 케이크"
          placeholderTextColor={c.inkSoft}
          returnKeyType="search"
          style={[Type.body, styles.input, { color: c.ink }]}
        />
        {q.length > 0 && (
          <Pressable onPress={() => run("")} hitSlop={10}>
            <Ionicons name="close-circle" size={20} color={c.inkSoft} />
          </Pressable>
        )}
      </View>

      {result && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.bleed}
          contentContainerStyle={styles.chipRow}
        >
          {SUGGESTIONS.map((s) => (
            <Chip key={s} label={s} onPress={() => run(s)} active={q === s} />
          ))}
        </ScrollView>
      )}

      {loading && (
        <View style={{ alignItems: "center", padding: Space.xl }}>
          <ActivityIndicator color={c.orange} />
        </View>
      )}

      {!loading && error && (
        <Card color={c.pinkSoft}>
          <Txt variant="heading">검색하지 못했어요</Txt>
          <Txt variant="small" soft>
            {error}
          </Txt>
        </Card>
      )}

      {!loading && result && (
        <View style={{ gap: Space.md }}>
          {result.parsed.chips.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {result.parsed.chips.map((chip) => (
                <Chip key={chip} label={chip} color={c.yellowSoft} />
              ))}
              {result.parsed.text ? (
                <Chip label={`🔎 ${result.parsed.text}`} color={c.blueSoft} />
              ) : null}
            </View>
          )}
          {result.notice ? (
            <Card color={c.yellowSoft}>
              <Txt variant="small">{result.notice}</Txt>
            </Card>
          ) : result.photos.length === 0 ? (
            <Card style={{ alignItems: "center", gap: Space.sm }}>
              <Blob size={56} color={c.purple} mood={2} />
              <Txt variant="heading">맞는 사진을 찾지 못했어요</Txt>
              <Txt variant="small" soft>
                다른 단어로 찾아보거나 장소·날짜를 빼 보세요
              </Txt>
            </Card>
          ) : (
            <>
              <Txt variant="small" soft>
                {result.mode === "semantic"
                  ? `관련도 높은 순 · ${result.photos.length}장`
                  : `${result.photos.length}장`}
              </Txt>
              <PhotoGrid photos={result.photos} />
            </>
          )}
        </View>
      )}

      {!result && !loading && (
        <>
          <View style={styles.tiles}>
            {TOPICS.map((t) => (
              <Pressable
                key={t.query}
                onPress={() => run(t.query)}
                style={({ pressed }) => [
                  styles.tile,
                  {
                    width: tileW,
                    backgroundColor: c[t.color],
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}
              >
                <Txt style={{ fontSize: 34 }}>{t.emoji}</Txt>
                <Txt variant="heading">{t.label}</Txt>
              </Pressable>
            ))}
          </View>
          <View style={{ gap: Space.sm }}>
            <Txt variant="small" soft>
              장소와 날짜를 섞어서도 찾을 수 있어요
            </Txt>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {EXAMPLES.map((e) => (
                <Chip key={e} label={e} onPress={() => run(e)} />
              ))}
            </View>
          </View>
          <IndexStatusCard compact />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.lg,
    height: 54,
  },
  input: { flex: 1, height: "100%" },
  // Let the chip row scroll edge to edge while lining up with the page padding.
  bleed: { marginHorizontal: -20 },
  chipRow: { gap: 8, paddingHorizontal: 20 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: {
    height: 112,
    borderRadius: Radius.lg,
    padding: Space.lg,
    justifyContent: "space-between",
  },
});

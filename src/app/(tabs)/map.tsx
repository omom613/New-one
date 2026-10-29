import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PhotoStrip } from "@/components/photos";
import { PlacesMap, type MapCluster } from "@/components/places-map";
import { Card, PillButton, Txt } from "@/components/ui";
import { Space, usePalette } from "@/constants/theme";
import * as db from "@/lib/db";
import { dayKey, formatFullDate } from "@/lib/dates";
import { useDataVersion } from "@/lib/store";

export default function MapScreen() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const version = useDataVersion();
  const [photos, setPhotos] = useState<db.Photo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    db.locatedPhotos().then(setPhotos);
  }, [version]);

  const { clusters, byKey } = useMemo(() => {
    const groups = new Map<string, db.Photo[]>();
    for (const p of photos) {
      const k = p.placeKey!;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(p);
    }
    const list: MapCluster[] = [...groups.entries()].map(([key, ps]) => ({
      key,
      count: ps.length,
      lat: ps.reduce((s, p) => s + p.lat!, 0) / ps.length,
      lng: ps.reduce((s, p) => s + p.lng!, 0) / ps.length,
      label: ps.find((p) => p.placeLabel)?.placeLabel ?? null,
    }));
    return { clusters: list, byKey: groups };
  }, [photos]);

  const sel = selected ? byKey.get(selected) : undefined;
  const selCluster = clusters.find((cl) => cl.key === selected);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <PlacesMap
        clusters={clusters}
        selected={selected}
        onSelect={setSelected}
      />

      <View
        style={[styles.top, { top: insets.top + Space.sm }]}
        pointerEvents="none"
      >
        <View style={[styles.titlePill, { backgroundColor: c.surface }]}>
          <Txt variant="heading">내가 다녀온 곳</Txt>
          <Txt variant="small" soft>
            {clusters.length}곳 · 사진 {photos.length.toLocaleString()}장
          </Txt>
        </View>
      </View>

      {photos.length === 0 && (
        <View style={styles.bottom}>
          <Card style={{ gap: Space.sm }}>
            <Txt variant="heading">아직 위치가 있는 사진이 없어요</Txt>
            <Txt variant="small" soft>
              오늘 탭에서 사진을 불러오면 찍은 장소가 지도에 표시돼요.
            </Txt>
          </Card>
        </View>
      )}

      {sel && selCluster && (
        <View style={styles.bottom}>
          <Card style={{ gap: Space.md }}>
            <View>
              <Txt variant="title">{selCluster.label ?? "이름 없는 장소"}</Txt>
              <Txt variant="small" soft>
                사진 {sel.length}장 · 처음{" "}
                {formatFullDate(sel[sel.length - 1].createdAt)}
              </Txt>
            </View>
            <PhotoStrip photos={sel.slice(0, 30)} size={80} />
            <View style={{ flexDirection: "row", gap: Space.sm }}>
              <PillButton
                label="최근 방문한 날"
                icon="calendar-outline"
                style={{ flex: 1 }}
                onPress={() =>
                  router.push({
                    pathname: "/day/[date]",
                    params: { date: dayKey(sel[0].createdAt) },
                  })
                }
              />
              <PillButton
                label="닫기"
                tone="light"
                onPress={() => setSelected(null)}
              />
            </View>
          </Card>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  titlePill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  // Leaves room for the walking character above the tab bar.
  bottom: {
    position: "absolute",
    left: Space.lg,
    right: Space.lg,
    bottom: Space.lg + 52,
  },
});

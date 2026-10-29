import { Image } from "expo-image";
import { router } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { Radius, Space, usePalette } from "@/constants/theme";
import type { Photo } from "@/lib/db";
import type { Moment } from "@/lib/moments";
import { formatTime } from "@/lib/dates";

import { Txt } from "./ui";

/** Asset ids are directly displayable: content:// on Android, ph:// on iOS. */
export function PhotoThumb({
  photo,
  size,
  style,
  radius = Radius.sm,
}: {
  photo: Pick<Photo, "id">;
  size: number;
  style?: StyleProp<ViewStyle>;
  radius?: number;
}) {
  const c = usePalette();
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/photo/[id]", params: { id: photo.id } })
      }
      style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }, style]}
    >
      <Image
        source={{ uri: photo.id }}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: c.surfaceAlt,
        }}
        contentFit="cover"
        recyclingKey={photo.id}
        transition={150}
      />
    </Pressable>
  );
}

export function PhotoGrid({
  photos,
  columns = 3,
  inset = 40,
}: {
  photos: Photo[];
  columns?: number;
  inset?: number;
}) {
  const { width } = useWindowDimensions();
  const gap = 6;
  const size = Math.floor((width - inset - gap * (columns - 1)) / columns);
  return (
    <View style={[styles.grid, { gap }]}>
      {photos.map((p) => (
        <PhotoThumb key={p.id} photo={p} size={size} />
      ))}
    </View>
  );
}

export function PhotoStrip({
  photos,
  size = 84,
}: {
  photos: Photo[];
  size?: number;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {photos.map((p) => (
        <PhotoThumb key={p.id} photo={p} size={size} />
      ))}
    </ScrollView>
  );
}

/** One row of the day timeline: dot + time + place + photos. */
export function MomentRow({
  moment,
  last,
}: {
  moment: Moment;
  last?: boolean;
}) {
  const c = usePalette();
  const time =
    moment.end - moment.start > 10 * 60 * 1000
      ? `${formatTime(moment.start)} – ${formatTime(moment.end)}`
      : formatTime(moment.start);
  return (
    <View style={styles.momentRow}>
      <View style={styles.rail}>
        <View
          style={[
            styles.dot,
            { backgroundColor: c.orange, borderColor: c.orangeSoft },
          ]}
        />
        {!last && <View style={[styles.line, { backgroundColor: c.line }]} />}
      </View>
      <View style={{ flex: 1, gap: Space.sm, paddingBottom: Space.xl }}>
        <View>
          <Txt variant="small" soft>
            {time}
          </Txt>
          <Txt variant="heading">{moment.placeLabel ?? "어딘가에서"}</Txt>
        </View>
        <PhotoStrip photos={moment.photos} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap" },
  momentRow: { flexDirection: "row", gap: Space.md },
  rail: { width: 18, alignItems: "center" },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 4, marginTop: 4 },
  line: { width: 2, flex: 1, marginTop: 4, borderRadius: 1 },
});

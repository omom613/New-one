import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";

import { Moods, type Mood, usePalette } from "@/constants/theme";

import { Blob } from "./blob";
import { Txt } from "./ui";

export function MoodPicker({
  value,
  onChange,
  onDark,
}: {
  value: Mood | null;
  onChange: (m: Mood) => void;
  /** Use light labels when drawn on a colored card. */
  onDark?: boolean;
}) {
  const c = usePalette();
  return (
    <View style={styles.row}>
      {Moods.map((m) => {
        const selected = value === m.value;
        const dim = value != null && !selected;
        return (
          <Pressable
            key={m.value}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(m.value);
            }}
            style={[
              styles.item,
              {
                opacity: dim ? 0.45 : 1,
                transform: [{ scale: selected ? 1.12 : 1 }],
              },
            ]}
          >
            <Blob size={50} color={c[m.color]} mood={m.value} />
            <Txt
              variant="tiny"
              color={onDark ? "#FFFFFF" : undefined}
              soft={!onDark}
            >
              {m.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between" },
  item: { alignItems: "center", gap: 4 },
});

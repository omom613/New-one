import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Radius, Space, Type, usePalette } from "@/constants/theme";

type TxtProps = TextProps & {
  variant?: keyof typeof Type;
  color?: string;
  soft?: boolean;
  style?: StyleProp<TextStyle>;
};

export function Txt({
  variant = "body",
  color,
  soft,
  style,
  ...rest
}: TxtProps) {
  const c = usePalette();
  return (
    <Text
      lineBreakStrategyIOS="hangul-word"
      {...rest}
      style={[
        Type[variant],
        { color: color ?? (soft ? c.inkSoft : c.ink) },
        KEEP_WORDS,
        style,
      ]}
    />
  );
}

// Keep Korean words whole when wrapping on web (iOS uses lineBreakStrategyIOS above).
const KEEP_WORDS = (
  Platform.OS === "web" ? { wordBreak: "keep-all" } : null
) as TextStyle | null;

/** Scrollable page with the warm background and safe-area padding. */
export function Screen({
  children,
  scroll = true,
  contentStyle,
  edges = "top",
}: {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: "top" | "none";
}) {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const pad = {
    paddingTop: edges === "top" ? insets.top + Space.md : Space.md,
  };
  if (!scroll) {
    return (
      <View
        style={[{ flex: 1, backgroundColor: c.background }, pad, contentStyle]}
      >
        {children}
      </View>
    );
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={[pad, styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Card({
  children,
  color,
  style,
  onPress,
}: {
  children: ReactNode;
  color?: string;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const c = usePalette();
  const body = (
    <View style={[styles.card, { backgroundColor: color ?? c.surface }, style]}>
      {children}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      {body}
    </Pressable>
  );
}

export function PillButton({
  label,
  onPress,
  icon,
  tone = "primary",
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: ComponentProps<typeof Ionicons>["name"];
  tone?: "primary" | "light" | "ghost" | "dark";
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = usePalette();
  const bg = {
    primary: c.orange,
    light: c.surface,
    ghost: "transparent",
    dark: c.ink,
  }[tone];
  const fg = {
    primary: c.onAccent,
    light: c.ink,
    ghost: c.orange,
    dark: c.background,
  }[tone];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        tone === "ghost" && { borderWidth: 2, borderColor: c.orange },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={fg} />}
          <Text style={[Type.heading, { color: fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  onPress,
  active,
  color,
}: {
  label: string;
  onPress?: () => void;
  active?: boolean;
  color?: string;
}) {
  const c = usePalette();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? c.ink : (color ?? c.surface),
          borderColor: c.line,
        },
      ]}
    >
      <Text style={[Type.small, { color: active ? c.background : c.ink }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const c = usePalette();
  return (
    <View style={styles.sectionHeader}>
      <Txt variant="title">{title}</Txt>
      {action && (
        <Pressable onPress={onAction} hitSlop={10}>
          <Text style={[Type.small, { color: c.orange }]}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function ProgressBar({
  value,
  color,
}: {
  value: number;
  color?: string;
}) {
  const c = usePalette();
  return (
    <View style={[styles.track, { backgroundColor: c.surfaceAlt }]}>
      <View
        style={[
          styles.fill,
          {
            backgroundColor: color ?? c.orange,
            width: `${Math.max(0, Math.min(1, value)) * 100}%`,
          },
        ]}
      />
    </View>
  );
}

export function IconButton({
  name,
  onPress,
  color,
  background,
}: {
  name: ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  color?: string;
  background?: string;
}) {
  const c = usePalette();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={[styles.iconBtn, { backgroundColor: background ?? c.surface }]}
    >
      <Ionicons name={name} size={20} color={color ?? c.ink} />
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Space.lg + 4,
    paddingBottom: 120,
    gap: Space.lg,
  },
  card: { borderRadius: Radius.lg, padding: Space.xl - 4, overflow: "hidden" },
  pill: {
    height: 52,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Space.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: Space.sm,
  },
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});

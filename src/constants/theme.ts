import { useColorScheme } from "react-native";

// Warm, soft palette inspired by calm/meditation apps:
// cream background, sunny orange accent, round friendly shapes.
const brand = {
  orange: "#FF7A35",
  yellow: "#FFC43D",
  blue: "#5B7CFA",
  purple: "#8E7AF0",
  pink: "#FF8FA8",
  green: "#35B987",
};

const light = {
  ...brand,
  background: "#FFF8F1",
  surface: "#FFFFFF",
  surfaceAlt: "#F6EEE6",
  ink: "#2E2A27",
  inkSoft: "#77706A",
  line: "#EFE5DB",
  orangeSoft: "#FFE5D5",
  yellowSoft: "#FFF0C9",
  blueSoft: "#E2E8FF",
  purpleSoft: "#ECE7FF",
  pinkSoft: "#FFE3EA",
  greenSoft: "#D8F3E7",
  onAccent: "#FFFFFF",
};

// Dark mode borrows the deep indigo "night" look.
const dark: typeof light = {
  ...brand,
  background: "#15143A",
  surface: "#22215A",
  surfaceAlt: "#2C2B66",
  ink: "#F6F3FF",
  inkSoft: "#B5B1DA",
  line: "#33327A",
  orangeSoft: "#4A2E4A",
  yellowSoft: "#47405A",
  blueSoft: "#2B3473",
  purpleSoft: "#352F78",
  pinkSoft: "#4A2D5A",
  greenSoft: "#1F4357",
  onAccent: "#FFFFFF",
};

export type Palette = typeof light;

export function usePalette(): Palette {
  return useColorScheme() === "dark" ? dark : light;
}

export const Radius = { sm: 14, md: 20, lg: 28, pill: 999 };

export const Space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const Type = {
  hero: {
    fontSize: 30,
    fontWeight: "800" as const,
    letterSpacing: -0.6,
    lineHeight: 38,
  },
  title: {
    fontSize: 22,
    fontWeight: "800" as const,
    letterSpacing: -0.4,
    lineHeight: 29,
  },
  heading: { fontSize: 17, fontWeight: "700" as const, letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: "500" as const, lineHeight: 22 },
  small: { fontSize: 13, fontWeight: "600" as const },
  tiny: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 0.3 },
};

export type Mood = 1 | 2 | 3 | 4 | 5;

export const Moods: {
  value: Mood;
  label: string;
  color: keyof typeof brand;
}[] = [
  { value: 1, label: "힘들었어", color: "blue" },
  { value: 2, label: "별로", color: "purple" },
  { value: 3, label: "그럭저럭", color: "yellow" },
  { value: 4, label: "좋았어", color: "green" },
  { value: 5, label: "최고", color: "orange" },
];

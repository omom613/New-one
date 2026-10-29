import Svg, { Circle, Ellipse, Path } from "react-native-svg";

import type { Mood } from "@/constants/theme";

type Props = {
  size?: number;
  color: string;
  /** Face expression. Omit for a calm closed-eye face. */
  mood?: Mood | "calm" | "sleepy";
  faceColor?: string;
};

const BODY =
  "M52 5 C76 6 95 24 94 51 C93 77 74 95 49 94 C23 93 5 75 6 49 C7 23 28 4 52 5 Z";

const MOUTHS: Record<Mood, string> = {
  1: "M38 68 Q50 58 62 68",
  2: "M39 66 Q50 62 61 65",
  3: "M39 64 L61 64",
  4: "M37 60 Q50 72 63 60",
  5: "M35 58 Q50 80 65 58 Z",
};

/** Friendly round character used across the app. */
export function Blob({
  size = 64,
  color,
  mood = "calm",
  faceColor = "#2E2A27",
}: Props) {
  const closed = mood === "calm" || mood === "sleepy";
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d={BODY} fill={color} />
      {closed ? (
        <>
          <Path
            d="M32 46 Q38 51 44 46"
            stroke={faceColor}
            strokeWidth={3.5}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M56 46 Q62 51 68 46"
            stroke={faceColor}
            strokeWidth={3.5}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d={
              mood === "sleepy" ? "M44 64 Q50 66 56 64" : "M40 61 Q50 69 60 61"
            }
            stroke={faceColor}
            strokeWidth={3.5}
            strokeLinecap="round"
            fill="none"
          />
        </>
      ) : (
        <>
          <Ellipse cx={38} cy={45} rx={4} ry={5} fill={faceColor} />
          <Ellipse cx={62} cy={45} rx={4} ry={5} fill={faceColor} />
          <Path
            d={MOUTHS[mood]}
            stroke={faceColor}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={mood === 5 ? faceColor : "none"}
          />
        </>
      )}
      <Circle cx={27} cy={56} r={5} fill="#FFFFFF" opacity={0.25} />
      <Circle cx={73} cy={56} r={5} fill="#FFFFFF" opacity={0.25} />
    </Svg>
  );
}

/** Soft decorative circles tucked into a card's top-right corner (kept clear of text). */
export function Bubbles({
  color,
  size = 150,
}: {
  color: string;
  size?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      pointerEvents="none"
      style={{ position: "absolute", right: -size * 0.3, top: -size * 0.3 }}
    >
      <Circle cx={55} cy={45} r={42} fill={color} opacity={0.16} />
    </Svg>
  );
}

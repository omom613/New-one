import { View } from "react-native";

import { Txt } from "./ui";

export type MapCluster = {
  key: string;
  lat: number;
  lng: number;
  count: number;
  label: string | null;
};

/** Maps are mobile-only; the web build shows a placeholder. */
export function PlacesMap(_: {
  clusters: MapCluster[];
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Txt soft>지도는 휴대폰 앱에서 볼 수 있어요</Txt>
    </View>
  );
}

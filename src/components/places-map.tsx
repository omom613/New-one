import { Platform, StyleSheet, useColorScheme, View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";

import { usePalette } from "@/constants/theme";

import { Txt } from "./ui";

export type MapCluster = {
  key: string;
  lat: number;
  lng: number;
  count: number;
  label: string | null;
};

export function PlacesMap({
  clusters,
  selected,
  onSelect,
}: {
  clusters: MapCluster[];
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  const c = usePalette();
  const scheme = useColorScheme();
  const initial = initialRegion(clusters);
  return (
    <MapView
      style={StyleSheet.absoluteFill}
      initialRegion={initial}
      // Quieter base map so the orange pins stand out.
      mapType={Platform.OS === "ios" ? "mutedStandard" : "standard"}
      customMapStyle={
        Platform.OS === "android"
          ? scheme === "dark"
            ? DARK_STYLE
            : WARM_STYLE
          : undefined
      }
      userInterfaceStyle={scheme === "dark" ? "dark" : "light"}
      showsPointsOfInterests={false}
      toolbarEnabled={false}
      key={clusters.length ? "ready" : "empty"}
    >
      {clusters.map((cl) => {
        const active = cl.key === selected;
        return (
          <Marker
            key={cl.key}
            coordinate={{ latitude: cl.lat, longitude: cl.lng }}
            onPress={() => onSelect(cl.key)}
            tracksViewChanges={false}
          >
            <View
              style={[
                styles.pin,
                {
                  backgroundColor: active ? c.ink : c.orange,
                  borderColor: "#FFFFFF",
                },
              ]}
            >
              <Txt variant="tiny" color="#FFFFFF">
                {cl.count > 999 ? "999+" : cl.count}
              </Txt>
            </View>
          </Marker>
        );
      })}
    </MapView>
  );
}

function initialRegion(clusters: MapCluster[]): Region {
  if (clusters.length === 0) {
    return {
      latitude: 37.5665,
      longitude: 126.978,
      latitudeDelta: 0.3,
      longitudeDelta: 0.3,
    };
  }
  // Center on where most photos are, not on the outliers.
  const top = [...clusters].sort((a, b) => b.count - a.count)[0];
  return {
    latitude: top.lat,
    longitude: top.lng,
    latitudeDelta: 0.25,
    longitudeDelta: 0.25,
  };
}

const styles = StyleSheet.create({
  pin: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 8,
    borderRadius: 17,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
});

// Android (Google Maps) styles matching the app palette.
const WARM_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#F7F0E8" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#77706A" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#FFF8F1" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#FFFFFF" }],
  },
  {
    featureType: "road",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#CFE0FF" }],
  },
  {
    featureType: "landscape.natural",
    elementType: "geometry",
    stylers: [{ color: "#EAF3E4" }],
  },
];

const DARK_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1D1C4A" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#B5B1DA" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#15143A" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2C2B66" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#101030" }],
  },
];

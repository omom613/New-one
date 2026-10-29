import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router/js-tabs";
import type { ComponentProps } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TabWalker } from "@/components/tab-walker";
import { usePalette } from "@/constants/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

const TABS: {
  name: string;
  title: string;
  icon: IconName;
  iconActive: IconName;
}[] = [
  { name: "index", title: "오늘", icon: "sunny-outline", iconActive: "sunny" },
  {
    name: "search",
    title: "검색",
    icon: "search-outline",
    iconActive: "search",
  },
  { name: "map", title: "지도", icon: "map-outline", iconActive: "map" },
  {
    name: "recap",
    title: "리캡",
    icon: "sparkles-outline",
    iconActive: "sparkles",
  },
];

export default function TabLayout() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 64 + insets.bottom;
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: c.orange,
          tabBarInactiveTintColor: c.inkSoft,
          tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
          tabBarStyle: {
            backgroundColor: c.surface,
            // A visible top line: the little walker strolls along it.
            borderTopWidth: 2,
            borderTopColor: c.line,
            height: tabBarHeight,
            paddingTop: 8,
            elevation: 0,
          },
        }}
      >
        {TABS.map((t) => (
          <Tabs.Screen
            key={t.name}
            name={t.name}
            options={{
              title: t.title,
              tabBarIcon: ({ color, focused, size }) => (
                <Ionicons
                  name={focused ? t.iconActive : t.icon}
                  size={size}
                  color={String(color)}
                />
              ),
            }}
          />
        ))}
      </Tabs>
      <TabWalker bottom={tabBarHeight} />
    </View>
  );
}

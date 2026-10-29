import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme } from "react-native";

import { usePalette } from "@/constants/theme";
import { getDb } from "@/lib/db";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  const c = usePalette();

  useEffect(() => {
    getDb().finally(() => SplashScreen.hideAsync());
  }, []);

  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: {
      ...base.colors,
      background: c.background,
      card: c.background,
      primary: c.orange,
      text: c.ink,
    },
  };

  return (
    <ThemeProvider value={theme}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: c.background },
          headerTintColor: c.ink,
          headerTitleStyle: { fontWeight: "800" },
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: c.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="day/[date]" options={{ title: "" }} />
        <Stack.Screen
          name="photo/[id]"
          options={{ title: "", presentation: "modal" }}
        />
        <Stack.Screen
          name="settings"
          options={{ title: "설정", presentation: "modal" }}
        />
      </Stack>
    </ThemeProvider>
  );
}

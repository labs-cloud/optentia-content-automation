import "../global.css";

import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import {
  DMMono_400Regular,
  DMMono_500Medium,
} from "@expo-google-fonts/dm-mono";
import { PlayfairDisplay_600SemiBold } from "@expo-google-fonts/playfair-display";
import {
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  useFonts,
} from "@expo-google-fonts/sora";
import { buildTRPCLinks } from "@optentia/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuroraBackground } from "@/components/AuroraBackground";
import { ActiveClientProvider } from "@/contexts/ActiveClient";
import { API_BASE_URL, CLERK_PUBLISHABLE_KEY } from "@/lib/env";
import { tokenCache } from "@/lib/tokenCache";
import { trpc } from "@/lib/trpc";
import { ThemeProvider } from "@/theme/ThemeProvider";

SplashScreen.preventAutoHideAsync();

/** Builds the tRPC client with Clerk's getToken so requests carry the bearer. */
function ApiProviders({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  const [queryClient] = useState(() => new QueryClient());
  const [client] = useState(() =>
    trpc.createClient({
      links: buildTRPCLinks({
        baseUrl: API_BASE_URL,
        getToken: () => getToken(),
      }),
    }),
  );

  return (
    <trpc.Provider client={client} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    DMMono_400Regular,
    DMMono_500Medium,
    PlayfairDisplay_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <ApiProviders>
              <ActiveClientProvider>
                <StatusBar style="light" />
                <View style={{ flex: 1 }}>
                  <AuroraBackground />
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: "transparent" },
                      animation: "slide_from_right",
                    }}
                  />
                </View>
              </ActiveClientProvider>
            </ApiProviders>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ClerkProvider>
  );
}

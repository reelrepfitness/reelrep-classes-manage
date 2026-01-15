
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { I18nManager, Platform } from "react-native";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkoutProvider } from "@/contexts/WorkoutContext";
import { ShopProvider } from "@/contexts/ShopContext";
import { ClassesProvider } from "@/contexts/ClassesContext";
import { AchievementsProvider } from "@/contexts/AchievementsContext";

SplashScreen.preventAutoHideAsync();

if (Platform.OS !== 'web') {
  if (!I18nManager.isRTL) {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(true);
  }
}

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{
      headerBackTitle: "חזור",
      animation: 'slide_from_right',
    }}>
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="admin" options={{ headerShown: false }} />
      <Stack.Screen
        name="workout-log"
        options={{
          presentation: "modal",
          title: "רשום אימון",
        }}
      />
      <Stack.Screen
        name="achievements"
        options={{
          presentation: "card",
          title: "הישגים",
          headerShown: false,
        }}
      />
      <Stack.Screen name="admin-alerts" options={{ headerShown: false }} />
      <Stack.Screen name="admin/alerts-menu" options={{ headerShown: false }} />
      <Stack.Screen name="admin/push-automation" options={{ headerShown: false }} />
      <Stack.Screen
        name="shop"
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="payment"
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {
      // Ignore - splash screen may not be registered in Expo Go
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <AuthProvider>
            <WorkoutProvider>
              <ShopProvider>
                <ClassesProvider>
                  <AchievementsProvider>
                    <RootLayoutNav />
                  </AchievementsProvider>
                </ClassesProvider>
              </ShopProvider>
            </WorkoutProvider>
          </AuthProvider>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

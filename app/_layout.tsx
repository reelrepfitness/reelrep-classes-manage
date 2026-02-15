
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { I18nManager, Platform } from "react-native";
import { TamaguiProvider } from 'tamagui';
import { useFonts } from 'expo-font';
import tamaguiConfig from '../tamagui.config';
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
  const router = useRouter();
  const notificationResponseListener = useRef<Notifications.EventSubscription>();

  // Handle notification tap - deep link to profile for achievement unlocks
  useEffect(() => {
    notificationResponseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;

      // Route based on notification type
      switch (data?.type) {
        // User booking/class notifications → classes tab
        case 'push_booking_confirmed':
        case 'push_booking_cancelled':
        case 'push_class_reminder':
        case 'push_waitlist_available':
        case 'push_new_class_available':
        case 'push_inactive_reminder':
          router.push('/(tabs)');
          break;

        // Motivation → home
        case 'push_streak_motivation':
        case 'achievement_unlocked':
        case 'plates_earned':
          router.push('/(tabs)');
          break;

        // Subscription → profile
        case 'push_subscription_expiring':
        case 'subscription_expiring':
          router.push('/(tabs)/profile');
          break;

        // All admin notifications → notifications tab
        case 'notify_payment_failed':
        case 'notify_in_app_purchase':
        case 'notify_class_cancelled':
        case 'notify_form_submitted':
        case 'notify_payment_success':
        case 'notify_sub_unfrozen':
        case 'notify_new_lead':
        case 'notify_last_punch':
        case 'notify_ticket_finished':
        case 'notify_sub_expiring':
        case 'notify_user_blocked':
        case 'notify_user_unblocked':
        case 'notify_penalty_applied':
          router.push('/(tabs)/notifications');
          break;

        default:
          // Generic screen routing fallback
          if (data?.screen) {
            router.push(data.screen as any);
          }
          break;
      }
    });

    return () => {
      if (notificationResponseListener.current) {
        notificationResponseListener.current.remove();
      }
    };
  }, [router]);

  return (
    <Stack screenOptions={{
      headerBackTitle: "חזור",
      animation: 'slide_from_right',
    }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
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
      <Stack.Screen
        name="shop"
        options={{
          headerShown: false,
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="cart"
        options={{
          headerShown: false,
          presentation: "card",
          animation: 'slide_from_bottom', // Optional: nice animation for cart
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
  const [fontsLoaded] = useFonts({
    'Ploni-Regular': require('../assets/fonts/PloniRegular.otf'),
    'Ploni-Bold': require('../assets/fonts/PloniBold.otf'),
    'Ploni-Medium': require('../assets/fonts/PloniMedium.otf'),
    'Ploni-Light': require('../assets/fonts/PloniLight.otf'),
    'Ploni-Black': require('../assets/fonts/PloniBlack.otf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {
        // Ignore - splash screen may not be registered in Expo Go
      });
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null; // Keep splash screen visible while fonts load
  }

  return (
    <TamaguiProvider config={tamaguiConfig}>
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
    </TamaguiProvider>
  );
}

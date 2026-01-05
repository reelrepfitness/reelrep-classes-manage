import { Tabs } from 'expo-router';
import React, { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { SimpleTabBar } from "@/components/SimpleTabBar";

export default function TabLayout() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth');
    }
  }, [isAuthenticated, router]);

  return (
    <Tabs
      tabBar={(props) => <SimpleTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="classes" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

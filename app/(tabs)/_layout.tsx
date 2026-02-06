import React from 'react';
import { Tabs } from 'expo-router';
import { CustomTabBar } from '@/components/ui/CustomTabBar';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={() => <CustomTabBar />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="classes" />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="register" />
      <Tabs.Screen name="admin" />
    </Tabs>
  );
}

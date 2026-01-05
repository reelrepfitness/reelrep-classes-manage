import { Stack } from 'expo-router';
import React from 'react';

export default function AdminLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="clients/index" />
            <Stack.Screen name="financial/index" />
            <Stack.Screen name="boss-dashboard" />
            <Stack.Screen name="store" />
        </Stack>
    );
}

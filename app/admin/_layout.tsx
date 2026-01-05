import { Stack } from 'expo-router';
import React from 'react';

export default function AdminLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="clients" />
            <Stack.Screen name="financial" />
            <Stack.Screen name="boss-dashboard" />
        </Stack>
    );
}

import { Stack } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CustomTabBar } from '@/components/ui/CustomTabBar';

export default function AdminLayout() {
    return (
        <View style={{ flex: 1 }}>
            <StatusBar style="light" />
            <Stack
                screenOptions={{
                    headerShown: false,
                    presentation: 'card',
                    animation: 'default'
                }}
            >
                <Stack.Screen name="index" />
                <Stack.Screen name="clients" />
                <Stack.Screen name="classes" />
                <Stack.Screen name="leads" />
                <Stack.Screen name="forms/index" />
                <Stack.Screen name="financial" />
                <Stack.Screen name="store" />
                <Stack.Screen
                    name="pos/payment"
                    options={{
                        presentation: 'modal',
                    }}
                />
            </Stack>
            <CustomTabBar />
        </View>
    );
}

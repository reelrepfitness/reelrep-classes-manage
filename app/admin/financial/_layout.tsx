import { Stack } from 'expo-router';

export default function FinancialLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                presentation: 'card',
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="all-invoices" />
            <Stack.Screen name="daily-documents" />
            <Stack.Screen name="monthly-comparison" />
        </Stack>
    );
}

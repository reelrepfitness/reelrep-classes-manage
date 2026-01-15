import { Stack } from 'expo-router';

export default function ClientsLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                presentation: 'card',
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen
                name="new"
                options={{
                    presentation: 'modal',
                    animation: 'slide_from_bottom',
                }}
            />
            <Stack.Screen name="[id]" />
            <Stack.Screen name="active" />
            <Stack.Screen name="debts" />
            <Stack.Screen name="needs-attention" />
        </Stack>
    );
}

import { Stack } from 'expo-router';

export default function ClassesLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                presentation: 'card',
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="[id]" />
        </Stack>
    );
}

import React from "react";
import { View, Text } from "react-native";
import { AvatarCircles } from "../components/ui/AvatarCircles";

const avatarUrls = [
    "https://avatars.githubusercontent.com/u/16860528",
    "https://avatars.githubusercontent.com/u/20110627",
    "https://avatars.githubusercontent.com/u/106103625",
    "https://avatars.githubusercontent.com/u/59228569",
];

export default function AvatarCirclesDemo() {
    return (
        <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-neutral-900 p-8">
            <Text className="mb-8 text-xl font-bold text-gray-800 dark:text-white">
                Avatar Circles Demo
            </Text>

            <AvatarCircles
                numPeople={99}
                avatarUrls={avatarUrls}
                onPlusPress={() => console.log('Plus clicked')}
            />
        </View>
    );
}

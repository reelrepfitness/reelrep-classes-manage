import React from "react";
import { View, Text, Image, TouchableOpacity, ViewStyle } from "react-native";
import { cn } from "../../lib/utils"; // Adjust path if necessary

interface AvatarCirclesProps {
    className?: string;
    numPeople?: number;
    avatarUrls: string[];
    onPlusPress?: () => void; // Added interaction handler
}

const AvatarCircles = ({
    numPeople,
    className,
    avatarUrls,
    onPlusPress,
}: AvatarCirclesProps) => {
    return (
        <View className={cn("z-10 flex-row items-center justify-center", className)}>
            {avatarUrls.map((url, index) => (
                <Image
                    key={index}
                    source={{ uri: url }}
                    className={cn(
                        "h-10 w-10 rounded-full border-2 border-white dark:border-gray-800",
                        index > 0 && "-ml-4" // Create overlap effect manually
                    )}
                    alt={`Avatar ${index + 1}`}
                />
            ))}
            {(numPeople ?? 0) > 0 && (
                <TouchableOpacity
                    onPress={onPlusPress}
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-black dark:border-gray-800 dark:bg-white -ml-4"
                >
                    <Text className="text-xs font-medium text-white dark:text-black">
                        +{numPeople}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

export { AvatarCircles };

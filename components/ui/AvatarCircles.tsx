import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { cn } from "../../lib/utils";

interface AvatarData {
    avatarUrl: string;
    badgeIcon?: string; // Achievement badge icon URL
}

interface AvatarCirclesProps {
    className?: string;
    numPeople?: number;
    avatarUrls?: string[]; // Legacy support for string array
    avatars?: AvatarData[]; // New format with badge support
    onPlusPress?: () => void;
}

const AvatarCircles = ({
    numPeople,
    className,
    avatarUrls,
    avatars,
    onPlusPress,
}: AvatarCirclesProps) => {
    // Support both legacy string[] format and new AvatarData[] format
    const avatarData: AvatarData[] = avatars
        ? avatars
        : (avatarUrls || []).map(url => ({ avatarUrl: url }));

    return (
        <View className={cn("z-10 flex-row items-center justify-center", className)}>
            {avatarData.map((avatar, index) => (
                <View key={index} style={[styles.avatarWrapper, index > 0 && styles.overlap]}>
                    <Image
                        source={{ uri: avatar.avatarUrl }}
                        style={styles.avatar}
                    />
                    {/* Achievement Badge */}
                    {avatar.badgeIcon && (
                        <View style={styles.badgeContainer}>
                            <Image
                                source={{ uri: avatar.badgeIcon }}
                                style={styles.badgeIcon}
                            />
                        </View>
                    )}
                </View>
            ))}
            {(numPeople ?? 0) > 0 && (
                <TouchableOpacity
                    onPress={onPlusPress}
                    style={[styles.plusButton, avatarData.length > 0 && styles.overlap]}
                >
                    <Text style={styles.plusText}>
                        +{numPeople}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    avatarWrapper: {
        position: 'relative',
    },
    overlap: {
        marginLeft: -16,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    badgeContainer: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    badgeIcon: {
        width: 12,
        height: 12,
        resizeMode: 'contain',
    },
    plusButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#000000',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    plusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

export { AvatarCircles };
export type { AvatarData };

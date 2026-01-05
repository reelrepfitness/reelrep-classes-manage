import React from 'react';
import { View, Text, Image } from 'react-native';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface EnrolledUser {
    id: string;
    profiles?: {
        full_name?: string;
        name?: string;
        avatar_url?: string;
    };
}

interface EnrolledUsersAvatarsProps {
    users: EnrolledUser[];
    maxVisible?: number;
}

export function EnrolledUsersAvatars({ users, maxVisible = 3 }: EnrolledUsersAvatarsProps) {
    if (!users || users.length === 0) return null;

    const visibleUsers = users.slice(0, maxVisible);
    const remainingCount = Math.max(0, users.length - maxVisible);

    return (
        <View className="flex-row-reverse items-center mt-2">
            {visibleUsers.map((user, index) => {
                const userData = user.profiles;
                const userName = userData?.full_name || userData?.name || 'משתמש';
                const avatarUrl = userData?.avatar_url;

                return (
                    <Avatar
                        key={user.id}
                        size={28}
                        style={{
                            borderWidth: 2,
                            borderColor: 'white',
                            marginLeft: index > 0 ? -8 : 0,
                            zIndex: visibleUsers.length - index,
                        }}
                    >
                        {avatarUrl ? (
                            <AvatarImage source={{ uri: avatarUrl }} />
                        ) : null}
                        <AvatarFallback>
                            <Text className="text-xs font-bold text-gray-600">
                                {userName.charAt(0).toUpperCase()}
                            </Text>
                        </AvatarFallback>
                    </Avatar>
                );
            })}

            {remainingCount > 0 && (
                <Avatar
                    size={28}
                    style={{
                        borderWidth: 2,
                        borderColor: 'white',
                        marginLeft: -8,
                        zIndex: 0,
                        backgroundColor: '#6b7280',
                    }}
                >
                    <AvatarFallback style={{ backgroundColor: '#6b7280' }}>
                        <Text className="text-[10px] font-bold text-white">
                            +{remainingCount}
                        </Text>
                    </AvatarFallback>
                </Avatar>
            )}
        </View>
    );
}

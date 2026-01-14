import React, { useState, useMemo, forwardRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Image } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@/lib/utils';
import Colors from '@/constants/colors';

interface UserItem {
    id: string;
    name: string;
    avatarUrl?: string;
    status?: string;
    position?: number;
    joinedAt?: string;
}

interface ClassAttendeesSheetProps {
    title: string;
    subtitle: string;
    bookedUsers: UserItem[];
    waitlistUsers: UserItem[];
    bookedCount: string; // e.g., "8/8"
    waitlistCount: number;
}

export const ClassAttendeesSheet = forwardRef<BottomSheetModal, ClassAttendeesSheetProps>(
    ({ title, subtitle, bookedUsers, waitlistUsers, bookedCount, waitlistCount }, ref) => {
        const [activeTab, setActiveTab] = useState<'booked' | 'waitlist'>(waitlistCount > 0 ? 'waitlist' : 'booked');

        const snapPoints = useMemo(() => ['80%'], []);

        const renderBackdrop = (props: any) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
                opacity={0.5}
            />
        );

        const renderBookedItem = ({ item }: { item: UserItem }) => (
            <View style={styles.userRow} className="flex-row items-center justify-between py-4 border-b border-gray-50">
                <View className="flex-row items-center gap-3">
                    <View style={styles.avatarContainer}>
                        {item.avatarUrl ? (
                            <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <Text style={styles.avatarInitial}>{item.name[0]}</Text>
                            </View>
                        )}
                    </View>
                    <Text className="text-base font-bold text-[#09090B]">{item.name}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
            </View>
        );

        const renderWaitlistItem = ({ item }: { item: UserItem }) => {
            const isNextUp = item.position === 1;
            return (
                <View
                    style={[
                        styles.userRow,
                        isNextUp && styles.nextUpRow
                    ]}
                    className={cn(
                        "flex-row items-center justify-between py-4 px-3 rounded-2xl mb-1",
                        !isNextUp && "border-b border-gray-50"
                    )}
                >
                    {/* Position Number */}
                    <View style={styles.positionContainer} className="items-center justify-center">
                        <Text style={[styles.positionText, isNextUp && styles.nextUpPositionText]}>
                            #{item.position}
                        </Text>
                    </View>

                    {/* User Info */}
                    <View className="flex-1 flex-row items-center gap-3 px-3">
                        <View style={styles.avatarContainer}>
                            {item.avatarUrl ? (
                                <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                    <Text style={styles.avatarInitial}>{item.name[0]}</Text>
                                </View>
                            )}
                        </View>
                        <View>
                            <Text className="text-base font-bold text-[#09090B]">{item.name}</Text>
                            {isNextUp && (
                                <Text className="text-[10px] font-extrabold text-[#C2410C]">הבא בתור ✨</Text>
                            )}
                        </View>
                    </View>

                    {/* Joined Time */}
                    <View className="items-end">
                        <Text className="text-[10px] text-gray-400 font-medium">נרשם:</Text>
                        <Text className="text-xs font-bold text-gray-500">{item.joinedAt}</Text>
                    </View>
                </View>
            );
        };

        return (
            <BottomSheetModal
                ref={ref}
                index={0}
                snapPoints={snapPoints}
                backdropComponent={renderBackdrop}
                handleIndicatorStyle={{ backgroundColor: '#E5E7EB', width: 40 }}
                backgroundStyle={styles.sheetBackground}
            >
                <BottomSheetView style={styles.contentContainer}>
                    {/* Header */}
                    <View className="px-6 pt-2 pb-5">
                        <Text className="text-2xl font-extrabold text-[#09090B] text-right mb-1">{title}</Text>
                        <Text className="text-sm text-gray-400 text-right">{subtitle}</Text>
                    </View>

                    {/* Segmented Control */}
                    <View className="px-6 mb-6">
                        <View style={styles.tabContainer} className="flex-row p-1.5 bg-gray-100 rounded-[20px]">
                            <TouchableOpacity
                                onPress={() => setActiveTab('booked')}
                                style={[styles.tabButton, activeTab === 'booked' && styles.activeTab]}
                                className="flex-1 flex-row items-center justify-center gap-2"
                            >
                                <Text style={[styles.tabText, activeTab === 'booked' && styles.activeTabText]}>רשומים</Text>
                                <View style={[styles.badge, activeTab === 'booked' ? styles.activeBadge : styles.inactiveBadge]}>
                                    <Text style={[styles.badgeText, activeTab === 'booked' && styles.activeBadgeText]}>{bookedCount}</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setActiveTab('waitlist')}
                                style={[styles.tabButton, activeTab === 'waitlist' && styles.activeTab]}
                                className="flex-1 flex-row items-center justify-center gap-2"
                            >
                                <Text style={[styles.tabText, activeTab === 'waitlist' && styles.activeTabText]}>רשימת המתנה</Text>
                                <View style={[styles.badge, activeTab === 'waitlist' ? styles.activeBadge : styles.inactiveBadge]}>
                                    <Text style={[styles.badgeText, activeTab === 'waitlist' && styles.activeBadgeText]}>{waitlistCount}</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* List Content */}
                    <FlatList
                        data={activeTab === 'booked' ? bookedUsers : waitlistUsers}
                        renderItem={activeTab === 'booked' ? renderBookedItem : renderWaitlistItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View className="py-20 items-center opacity-30">
                                <Ionicons name="people-outline" size={48} color="#9CA3AF" />
                                <Text className="mt-4 text-gray-500 font-bold">אין משתתפים להצגה</Text>
                            </View>
                        }
                    />
                </BottomSheetView>
            </BottomSheetModal>
        );
    }
);

const styles = StyleSheet.create({
    sheetBackground: {
        backgroundColor: '#FFFFFF',
        borderRadius: 32,
    },
    contentContainer: {
        flex: 1,
    },
    tabContainer: {
        backgroundColor: '#F3F4F6',
    },
    tabButton: {
        paddingVertical: 10,
        borderRadius: 16,
    },
    activeTab: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#9CA3AF',
    },
    activeTabText: {
        color: '#09090B',
    },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    activeBadge: {
        backgroundColor: '#F3F4F6',
    },
    inactiveBadge: {
        backgroundColor: 'transparent',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#9CA3AF',
    },
    activeBadgeText: {
        color: '#da4477',
    },
    userRow: {
        direction: 'rtl',
    },
    avatarContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F3F4F6',
        overflow: 'hidden',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E5E7EB',
    },
    avatarInitial: {
        fontSize: 18,
        fontWeight: '700',
        color: '#9CA3AF',
    },
    positionContainer: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#F3F4F6',
    },
    positionText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#9CA3AF',
    },
    nextUpRow: {
        backgroundColor: '#FFF7ED',
        borderColor: '#FFEDD5',
        borderWidth: 1,
    },
    nextUpPositionText: {
        color: '#C2410C',
    },
});

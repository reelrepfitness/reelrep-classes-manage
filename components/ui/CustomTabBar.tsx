import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, I18nManager, Platform } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withTiming,
    useDerivedValue,
    interpolate,
    Extrapolation,
    useSharedValue,
} from 'react-native-reanimated';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    Home,
    Calendar,
    User,
    Dumbbell,
    ClipboardList,
    Receipt,
    Bell
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/constants/supabase';

// --- Icons Mapping ---
const getIcon = (routeName: string, color: string, size: number) => {
    switch (routeName) {
        case 'index':
        case '(tabs)':
            return <Home color={color} size={size} />;
        case 'classes':
            return <Calendar color={color} size={size} />;
        case 'register':
            return <Receipt color={color} size={size} />;
        case 'notifications':
            return <Bell color={color} size={size} />;
        case 'profile':
            return <User color={color} size={size} />;
        case 'admin':
            return <ClipboardList color={color} size={size} />;
        default:
            return <Home color={color} size={size} />;
    }
};

const TAB_ITEMS = [
    { name: 'index', label: 'בית', route: '/(tabs)' },
    { name: 'classes', label: 'יומן', route: '/(tabs)/classes' },
    { name: 'notifications', label: 'התראות', route: '/(tabs)/notifications' },
    { name: 'register', label: 'קופה', route: '/(tabs)/register', adminOnly: true },
    { name: 'profile', label: 'פרופיל', route: '/(tabs)/profile' },
    { name: 'admin', label: 'ניהול', route: '/admin', adminOnly: true },
];

interface TabBadgeProps {
    item: typeof TAB_ITEMS[0];
    isSelected: boolean;
    onSelect: () => void;
    badgeCount?: number;
}

const TabBadge = ({ item, isSelected, onSelect, badgeCount }: TabBadgeProps) => {
    const progress = useDerivedValue(() => {
        return withTiming(isSelected ? 1 : 0, { duration: 250 });
    });

    const textContainerStyle = useAnimatedStyle(() => {
        return {
            maxWidth: isSelected ? 120 : 0,
            opacity: progress.value,
            transform: [
                { translateX: interpolate(progress.value, [0, 1], [-5, 0], Extrapolation.CLAMP) }
            ],
            paddingLeft: isSelected ? 8 : 0,
        };
    });

    const activeColor = '#da4477';
    const inactiveColor = '#9CA3AF';

    // Convert badgeCount to number and ensure it's valid
    const validBadgeCount = typeof badgeCount === 'number' && badgeCount > 0 ? badgeCount : null;

    return (
        <TouchableOpacity
            onPress={onSelect}
            activeOpacity={0.8}
            style={[
                styles.badgeContainer,
                isSelected && styles.badgeSelected
            ]}
        >
            <View style={styles.iconContainer}>
                {getIcon(item.name, isSelected ? activeColor : inactiveColor, 24)}
                {validBadgeCount !== null && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{validBadgeCount > 9 ? '9+' : String(validBadgeCount)}</Text>
                    </View>
                )}
            </View>

            <Animated.View style={[styles.textContainer, textContainerStyle]}>
                <Text style={styles.label} numberOfLines={1}>
                    {item.label}
                </Text>
            </Animated.View>
        </TouchableOpacity>
    );
};

export function CustomTabBar() {
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const { isAdmin, user } = useAuth(); // Get isAdmin status and user

    // Query for unread notifications (admin sees admin_notifications, users see purchase_notifications)
    const unreadQuery = useQuery({
        queryKey: ['unread-notifications', user?.id, isAdmin],
        queryFn: async () => {
            if (!user) return 0;

            if (isAdmin) {
                const { count } = await supabase
                    .from('admin_notifications')
                    .select('*', { count: 'exact', head: true })
                    .eq('is_read', false);
                return count || 0;
            } else {
                const { count } = await supabase
                    .from('purchase_notifications')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .eq('is_read', false);
                return count || 0;
            }
        },
        enabled: !!user,
        refetchInterval: 30000, // רענון כל 30 שניות
    });

    // Determine selected tab based on pathname
    const getSelectedTab = () => {
        // Admin screens - check first since they're most specific
        if (pathname.startsWith('/admin')) return 'admin';
        if (pathname.includes('/admin')) return 'admin';
        if (pathname.includes('/notifications')) return 'notifications';
        if (pathname.includes('/classes')) return 'classes';
        if (pathname.includes('/register')) return 'register';
        if (pathname.includes('/profile')) return 'profile';
        return 'index'; // Default to home
    };

    const selectedTab = getSelectedTab();

    const handlePress = (route: string) => {
        router.push(route as any);
    };

    // Hide tab bar only on specific screens that need full screen (like payment flow)
    const hideTabBarPaths = [
        '/admin/pos/payment',
        '/admin/classes/',  // Hide on class details and workout content screens
    ];

    // Also hide on register screen (check both formats)
    const isRegisterScreen = pathname === '/register' || pathname === '/(tabs)/register' || pathname.endsWith('/register');

    if (isRegisterScreen || hideTabBarPaths.some(path => pathname.startsWith(path))) {
        return null;
    }

    const filteredTabItems = TAB_ITEMS.filter(item => !item.adminOnly || isAdmin);

    return (
        <View style={[styles.wrapper, { paddingBottom: insets.bottom + 10 }]}>
            <View style={styles.cardContainer}>
                {filteredTabItems.map((item) => (
                    <TabBadge
                        key={item.name}
                        item={item}
                        isSelected={selectedTab === item.name}
                        onSelect={() => handlePress(item.route)}
                        badgeCount={item.name === 'notifications' ? (unreadQuery.data || 0) : undefined}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        backgroundColor: 'transparent',
        zIndex: 100,
        pointerEvents: 'box-none',
    },
    cardContainer: {
        flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 999,
        padding: 6,
        gap: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        paddingHorizontal: 16,
        borderRadius: 999,
        justifyContent: 'center',
    },
    badgeSelected: {
        backgroundColor: '#F3F4F6',
    },
    iconContainer: {
        zIndex: 2,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    textContainer: {
        overflow: 'hidden',
        justifyContent: 'center',
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1c1c1c',
        textAlign: 'left',
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -8,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    }
});
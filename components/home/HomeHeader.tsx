import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Pressable,
    Image,
    Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import { useAuth } from '@/contexts/AuthContext';
import { useAchievements } from '@/contexts/AchievementsContext';
import Colors from '@/constants/colors';

const { width } = Dimensions.get('window');

// Hebrew date formatter
const getHebrewDate = () => {
    const days = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'יום שבת'];
    const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    const date = new Date();
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    return `${dayName}, ${day} ב${month}`;
};

// Menu items configuration
const MENU_ITEMS = [
    { label: 'עריכת פרופיל', icon: 'person-outline' as const, route: '/edit-profile' },
    { label: 'ניהול מנוי', icon: 'card-outline' as const, route: '/subscription-management' },
    { label: 'חשבוניות ותשלומים', icon: 'receipt-outline' as const, route: null },
    { label: 'הצהרת בריאות', icon: 'heart-outline' as const, route: null },
    { label: 'הגדרות התראות', icon: 'notifications-outline' as const, route: null },
    { label: 'פאנל ניהול', icon: 'shield-checkmark-outline' as const, route: '/admin', adminOnly: true },
    { label: 'שתף לחברים', icon: 'share-social-outline' as const, action: 'share' as const },
    { label: 'צור קשר', icon: 'chatbubble-ellipses-outline' as const, route: null },
    { label: 'התנתק', icon: 'log-out-outline' as const, action: 'signout' as const, destructive: true },
];

interface HomeHeaderProps {
    onMenuToggle?: (isOpen: boolean) => void;
}

export function HomeHeader({ onMenuToggle }: HomeHeaderProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, signOut, isAdmin, isCoach } = useAuth();
    const { getHighestCompletedAchievement } = useAchievements();

    const [isOpen, setIsOpen] = useState(false);
    const progress = useSharedValue(0);

    const userBadge = getHighestCompletedAchievement();
    const showAdminItems = isAdmin || isCoach;

    const toggleMenu = () => {
        if (isOpen) {
            progress.value = withTiming(0, { duration: 250 });
            setTimeout(() => {
                setIsOpen(false);
                onMenuToggle?.(false);
            }, 250);
        } else {
            setIsOpen(true);
            onMenuToggle?.(true);
            progress.value = withTiming(1, { duration: 250 });
        }
    };

    const handleMenuAction = async (item: typeof MENU_ITEMS[0]) => {
        toggleMenu();

        setTimeout(async () => {
            if (item.action === 'signout') {
                await signOut();
                router.replace('/(auth)/login' as any);
            } else if (item.action === 'share') {
                try {
                    await Share.share({
                        message: 'היי! בוא להתאמן איתי באפליקציית ReelRep Training 💪',
                    });
                } catch (error) {
                    console.log('Share error:', error);
                }
            } else if (item.route) {
                router.push(item.route as any);
            }
        }, 150);
    };

    // Animated styles
    const backdropStyle = useAnimatedStyle(() => ({
        opacity: interpolate(progress.value, [0, 1], [0, 1]),
        pointerEvents: progress.value > 0 ? 'auto' : 'none',
    }));

    const menuStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: interpolate(progress.value, [0, 1], [-300, 0], Extrapolation.CLAMP) }
        ],
        opacity: interpolate(progress.value, [0, 0.5, 1], [0, 0.8, 1]),
    }));



    // Filter menu items based on admin status
    const filteredMenuItems = MENU_ITEMS.filter(item => !item.adminOnly || showAdminItems);

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <Animated.View style={[styles.backdrop, backdropStyle]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={toggleMenu} />
                </Animated.View>
            )}

            {/* Menu Dropdown */}
            <View
                style={[styles.menuContainer, { top: insets.top + 60 }]}
                pointerEvents={isOpen ? 'auto' : 'none'}
            >
                <Animated.View style={menuStyle}>
                    <LinearGradient
                        colors={['#000000', '#1F2937']}
                        style={styles.dropdown}
                    >
                        {/* Subscription Quick Info */}
                        {user?.subscription && (
                            <TouchableOpacity
                                style={styles.subscriptionCard}
                                onPress={() => handleMenuAction({ label: '', icon: 'card-outline', route: '/subscription-management' })}
                            >
                                <View style={styles.subscriptionInfo}>
                                    <Text style={styles.subscriptionPlan}>
                                        {user.subscription.planName || 'מנוי'}
                                    </Text>
                                    <View style={[
                                        styles.statusBadge,
                                        { backgroundColor: user.subscription.status === 'active' ? '#10B981' : '#EF4444' }
                                    ]}>
                                        <Text style={styles.statusText}>
                                            {user.subscription.status === 'active' ? 'פעיל' : 'לא פעיל'}
                                        </Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-back" size={16} color="#94A3B8" />
                            </TouchableOpacity>
                        )}

                        {/* Menu Grid */}
                        <View style={styles.menuGrid}>
                            {filteredMenuItems.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.menuGridItem}
                                    onPress={() => handleMenuAction(item)}
                                    disabled={!item.route && !item.action}
                                >
                                    <Ionicons
                                        name={item.icon}
                                        size={20}
                                        color={item.destructive ? '#EF4444' : (item.route || item.action) ? '#FFFFFF' : '#64748B'}
                                    />
                                    <Text style={[
                                        styles.menuGridText,
                                        item.destructive && styles.destructiveText,
                                        (!item.route && !item.action) && styles.disabledText
                                    ]}>
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </LinearGradient>
                </Animated.View>
            </View>

            {/* Header Bar */}
            <LinearGradient
                colors={['#1F2937', '#000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[styles.header, { paddingTop: insets.top + 8 }]}
            >
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={toggleMenu}
                    style={styles.headerContent}
                >
                    {/* Avatar */}
                    <View style={styles.avatarContainer}>
                        {user?.profileImage ? (
                            <Image source={{ uri: user.profileImage }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <Text style={styles.avatarInitials}>
                                    {user?.name?.slice(0, 1).toUpperCase() || '?'}
                                </Text>
                            </View>
                        )}
                        {/* Achievement Badge */}
                        {userBadge && (
                            <View style={styles.avatarBadge}>
                                <Image source={{ uri: userBadge.icon }} style={styles.avatarBadgeIcon} />
                            </View>
                        )}
                    </View>

                    {/* Text */}
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.greetingTitle}>היי, {user?.name?.split(' ')[0] || 'אורח'}</Text>
                        <Text style={styles.dateSubtitle}>{getHebrewDate()}</Text>
                    </View>

                    {/* Menu Text Button */}
                    <View style={styles.menuTextContainer}>
                        <Text style={styles.menuText}>תפריט</Text>
                    </View>
                </TouchableOpacity>
            </LinearGradient >
        </>
    );
}

const styles = StyleSheet.create({
    header: {
        marginBottom: 24,
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        zIndex: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    avatarPlaceholder: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitials: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
    },
    avatarBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#1E293B',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#000000',
    },
    avatarBadgeIcon: {
        width: 16,
        height: 16,
    },
    headerTextContainer: {
        flex: 1,
        alignItems: 'flex-start',
    },
    greetingTitle: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '900',
        textAlign: 'left',
    },
    dateSubtitle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13,
        fontWeight: '500',
        marginTop: 2,
        textAlign: 'left',
    },
    menuTextContainer: {
        padding: 8,
    },
    menuText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 90,
    },
    menuContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 95,
    },
    dropdown: {
        width: '100%',
        marginHorizontal: 0,
        paddingHorizontal: 20,
        paddingVertical: 12,
        paddingBottom: 24,
        paddingTop: 30,
        marginTop: -15,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,

        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    subscriptionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
    },
    subscriptionInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    subscriptionPlan: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    statusText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
    menuGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 4,
    },
    menuGridItem: {
        width: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 8,
    },
    menuGridText: {
        fontSize: 14,
        color: '#E2E8F0',
        fontWeight: '500',
    },
    destructiveText: {
        color: '#EF4444',
    },
    disabledText: {
        color: '#64748B',
    },
});

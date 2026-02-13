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
    useAnimatedProps,
    withTiming,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useAchievements } from '@/contexts/AchievementsContext';
import { useClasses } from '@/contexts/ClassesContext';
import Colors from '@/constants/colors';

const { width } = Dimensions.get('window');

const AnimatedLottieView = Animated.createAnimatedComponent(LottieView);

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
    { label: 'יומן', icon: 'calendar-outline' as const, route: '/classes' },
    { label: 'יומן ביצועים', icon: 'barbell-outline' as const, route: '/performance' },
    { label: 'חנות', icon: 'cart-outline' as const, route: '/shop' },
    { label: 'הישגים', icon: 'trophy-outline' as const, route: '/achievements' },
    { label: 'עריכת פרופיל', icon: 'person-outline' as const, route: '/edit-profile' },
    { label: 'חשבוניות ותשלומים', icon: 'receipt-outline' as const, route: '/invoices' },
    { label: 'התנתק', icon: 'log-out-outline' as const, action: 'signout' as const, destructive: true },
];

interface HomeHeaderProps {
    onMenuToggle?: (isOpen: boolean) => void;
}

export function HomeHeader({ onMenuToggle }: HomeHeaderProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, signOut } = useAuth();
    const { getHighestCompletedAchievement } = useAchievements();
    const { bookings } = useClasses();

    const now = new Date();
    const bookedCount = bookings.filter(b => b.status === 'confirmed' && b.classDate && new Date(b.classDate) >= now).length;

    const [isOpen, setIsOpen] = useState(false);
    const progress = useSharedValue(0);

    const userBadge = getHighestCompletedAchievement();

    // Lottie hamburger icon: frame 0 = hamburger, frame 65 of 216 = X fully drawn
    const lottieAnimatedProps = useAnimatedProps(() => ({
        progress: interpolate(progress.value, [0, 1], [0, 65 / 216]),
    }));

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



    const filteredMenuItems = MENU_ITEMS;

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
                        {/* Plan Card */}
                        {(() => {
                            const sub = user?.subscription;
                            const hasActiveSub = sub?.status === 'active';
                            const isTicket = sub?.isTicket;
                            const totalSessions = sub?.totalSessions || 0;
                            const sessionsRemaining = sub?.sessionsRemaining || 0;
                            const progressPercent = totalSessions > 0 ? ((totalSessions - sessionsRemaining) / totalSessions) * 100 : 0;

                            const formatExpiry = (dateStr?: string) => {
                                if (!dateStr) return '';
                                const d = new Date(dateStr);
                                return `${d.getDate()}/${d.getMonth() + 1}`;
                            };

                            const renderPlanTitle = () => {
                                if (!sub?.planName) {
                                    return <Text style={styles.subscriptionPlan}>ללא מנוי</Text>;
                                }
                                const name = sub.planName.toUpperCase();
                                if (name.includes('ELITE')) {
                                    return <Image source={require('@/assets/images/reel-elite-white.png')} style={styles.planImage} resizeMode="contain" />;
                                } else if (name.includes('ONE')) {
                                    return <Image source={require('@/assets/images/reel-one-white.png')} style={styles.planImage} resizeMode="contain" />;
                                } else if (name.includes('3') || totalSessions === 3) {
                                    return <Image source={require('@/assets/images/3sessions-white.png')} style={styles.planImage} resizeMode="contain" />;
                                } else if (name.includes('10') || totalSessions === 10) {
                                    return <Image source={require('@/assets/images/10sessions-white.png')} style={styles.planImage} resizeMode="contain" />;
                                } else if (name.includes('20') || totalSessions === 20) {
                                    return <Image source={require('@/assets/images/20sessions-white.png')} style={styles.planImage} resizeMode="contain" />;
                                }
                                return <Text style={styles.subscriptionPlan}>{sub.planName}</Text>;
                            };

                            return (
                                <TouchableOpacity
                                    style={styles.planCard}
                                    onPress={() => handleMenuAction({
                                        label: '',
                                        icon: 'cart-outline',
                                        route: hasActiveSub ? '/subscription-management' : '/shop',
                                    })}
                                >
                                    {/* Top row: plan image + status badge + arrow */}
                                    <View style={styles.planCardTopRow}>
                                        <View style={styles.subscriptionInfo}>
                                            {renderPlanTitle()}
                                            {sub && (
                                                <View style={[
                                                    styles.statusBadge,
                                                    { backgroundColor: hasActiveSub ? '#10B981' : '#EF4444' }
                                                ]}>
                                                    <Text style={styles.statusText}>
                                                        {hasActiveSub ? 'פעיל' : 'לא פעיל'}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        <Ionicons name="chevron-back" size={16} color="#94A3B8" />
                                    </View>

                                    {/* Progress bar + details */}
                                    {hasActiveSub && isTicket ? (
                                        <View style={styles.planProgressSection}>
                                            <View style={styles.planProgressTrack}>
                                                <View style={[styles.planProgressFill, { width: `${progressPercent}%` }]} />
                                            </View>
                                            <View style={styles.planProgressLabels}>
                                                <Text style={styles.planProgressText}>
                                                    {sessionsRemaining}/{totalSessions} אימונים נותרו
                                                </Text>
                                                <Text style={styles.planExpiryText}>
                                                    עד {formatExpiry(sub?.endDate)}
                                                </Text>
                                            </View>
                                        </View>
                                    ) : hasActiveSub && !isTicket ? (
                                        <View style={styles.planProgressSection}>
                                            <View style={styles.planProgressLabels}>
                                                <Text style={styles.planProgressText}>
                                                    ∞ אימונים ללא הגבלה
                                                </Text>
                                                <Text style={styles.planExpiryText}>
                                                    עד {formatExpiry(sub?.endDate)}
                                                </Text>
                                            </View>
                                        </View>
                                    ) : null}
                                </TouchableOpacity>
                            );
                        })()}

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
                                    <View style={styles.menuLabelRow}>
                                        <Text style={[
                                            styles.menuGridText,
                                            item.destructive && styles.destructiveText,
                                            (!item.route && !item.action) && styles.disabledText
                                        ]}>
                                            {item.label}
                                        </Text>
                                        {item.label === 'יומן' && bookedCount > 0 && (
                                            <View style={styles.menuBadge}>
                                                <Text style={styles.menuBadgeText}>{bookedCount}</Text>
                                            </View>
                                        )}
                                    </View>
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

                    {/* Menu Icon */}
                    <AnimatedLottieView
                        source={require('@/assets/animations/lottieflow-menu-nav-11-2-ffffff-easey.json')}
                        autoPlay={false}
                        loop={false}
                        animatedProps={lottieAnimatedProps}
                        style={styles.menuLottie}
                    />
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
        fontSize: 24,
        fontWeight: '900',
        textAlign: 'left',
    },
    dateSubtitle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 15,
        fontWeight: '500',
        marginTop: 2,
        textAlign: 'left',
    },
    menuLottie: {
        width: 28,
        height: 28,
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
    planCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
    },
    planCardTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
    planImage: {
        width: 100,
        height: 22,
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
    planProgressSection: {
        marginTop: 12,
        gap: 6,
    },
    planProgressTrack: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    planProgressFill: {
        height: '100%',
        backgroundColor: Colors.primary,
        borderRadius: 3,
    },
    planProgressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    planProgressText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        fontWeight: '700',
        writingDirection: 'rtl',
    },
    planExpiryText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
        fontWeight: '800',
        writingDirection: 'rtl',
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
        fontWeight: '700',
    },
    destructiveText: {
        color: '#EF4444',
    },
    disabledText: {
        color: '#64748B',
    },
    menuLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    menuBadge: {
        backgroundColor: Colors.primary,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 5,
    },
    menuBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
});

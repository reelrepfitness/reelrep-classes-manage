import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Pressable,
    Platform
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    interpolate,
    Extrapolation,
    runOnJS
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface AdminHeaderProps {
    title?: string;
    disabled?: boolean;
}

const MENU_ITEMS = [
    { label: 'דשבורד', value: '/admin', icon: 'speedometer' },
    { label: 'יומן', value: '/admin/classes', icon: 'calendar' },
    { label: 'לקוחות', value: '/admin/clients', icon: 'people' },
    { label: 'לידים', value: '/admin/leads', icon: 'person-add' },
    { label: 'ניהול תרגילים', value: '/admin/exercises', icon: 'barbell' },
    { label: 'טפסים', value: '/admin/forms', icon: 'document-text' },
    { label: 'דוחות', value: '/admin/financial', icon: 'bar-chart' },
    { label: 'מנויים', value: '/admin/subscriptions', icon: 'card' },
    { label: 'התראות', value: '/admin/alerts-menu', icon: 'notifications' },
    { label: 'הגדרות', value: '/admin/settings', icon: 'settings' },
];

export function AdminHeader({ title, disabled = false }: AdminHeaderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const [isOpen, setIsOpen] = useState(false);

    // Animation values
    const progress = useSharedValue(0);

    const toggleMenu = () => {
        if (disabled) return;

        if (isOpen) {
            progress.value = withTiming(0, { duration: 250 });
            // Delay state update to allow animation to finish
            setTimeout(() => setIsOpen(false), 250);
        } else {
            setIsOpen(true);
            progress.value = withTiming(1, { duration: 250 });
        }
    };

    const handleNavigation = (value: string) => {
        toggleMenu();
        // Small delay to allow menu to start closing before navigating
        setTimeout(() => {
            if (value === 'logout') {
                // Handle logout
                console.log('Logging out...');
                router.replace('/(auth)/login' as any);
            } else {
                router.push(value as any);
            }
        }, 150);
    };

    // Animated Styles
    const backdropStyle = useAnimatedStyle(() => {
        return {
            opacity: interpolate(progress.value, [0, 1], [0, 1]),
            pointerEvents: progress.value > 0 ? 'auto' : 'none',
        };
    });

    const menuStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateY: interpolate(progress.value, [0, 1], [-300, 0], Extrapolation.CLAMP) }
            ],
            opacity: interpolate(progress.value, [0, 0.5, 1], [0, 0.8, 1]),
        };
    });

    const chevronStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { rotate: `${interpolate(progress.value, [0, 1], [0, 180])}deg` }
            ]
        };
    });

    // Helper for Icon name
    const getIconName = (name: string) => {
        // Simple mapping or pass direct ionicon names
        return Platform.OS === 'ios' ? `ios-${name}` : `md-${name}`;
    };

    // Better mapping for Expo Vector Icons (Ionicons)
    const getIoniconsName = (itemIcon: string): keyof typeof Ionicons.glyphMap => {
        switch (itemIcon) {
            case 'speedometer': return 'speedometer-outline';
            case 'calendar': return 'calendar-outline';
            case 'people': return 'people-outline';
            case 'person-add': return 'person-add-outline';
            case 'barbell': return 'barbell-outline';
            case 'document-text': return 'document-text-outline';
            case 'bar-chart': return 'stats-chart-outline';
            case 'settings': return 'settings-outline';
            case 'log-out': return 'log-out-outline';
            case 'card': return 'card-outline';
            case 'notifications': return 'notifications-outline';
            default: return 'help-outline';
        }
    }

    const currentTitle = MENU_ITEMS.find(i => i.value === pathname)?.label || title || "מסך ניהול";

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <Animated.View style={[styles.backdrop, backdropStyle]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={toggleMenu} />
                </Animated.View>
            )}

            {/* Menu Dropdown Container - Rendered under header visually but handled via zIndex */}
            <View
                style={[styles.menuContainer, { top: insets.top + 60 }]}
                pointerEvents={isOpen ? 'auto' : 'none'}
            >
                <Animated.View style={[menuStyle]}>
                    <View style={styles.dropdown}>
                        <View style={styles.menuGrid}>
                            {MENU_ITEMS.map((item, index) => {
                                const isSelected = pathname === item.value;
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.menuGridItem}
                                        onPress={() => handleNavigation(item.value)}
                                    >
                                        <Ionicons
                                            name={getIoniconsName(item.icon)}
                                            size={20}
                                            color={isSelected ? '#FFFFFF' : '#94A3B8'}
                                        />
                                        <Text style={[
                                            styles.menuGridText,
                                            isSelected && styles.selectedText
                                        ]}>
                                            {item.label}
                                        </Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </View>
                    </View>
                </Animated.View>
            </View>

            {/* Header Bar */}
            <LinearGradient
                colors={['#0F172A', '#1E293B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[styles.header, { paddingTop: insets.top }]}
            >
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={toggleMenu}
                    style={styles.headerTouchable}
                >
                    <Text style={styles.headerTitle}>{currentTitle}</Text>
                    <Animated.View style={chevronStyle}>
                        <Ionicons name="chevron-down" size={16} color="#FFFFFF" />
                    </Animated.View>
                </TouchableOpacity>
            </LinearGradient>
        </>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingBottom: 10,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        zIndex: 100, // Highest priority
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    headerTouchable: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 8,
        paddingHorizontal: 20,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        zIndex: 90, // Below header, above content
        // Blur adds a nice effect if we could use it, but plain dim is safer cross-platform without BlurView
    },
    menuContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 95, // Below header (100), above backdrop (90)
    },
    dropdown: {
        width: '100%',
        paddingHorizontal: 20,
        paddingVertical: 12,
        paddingBottom: 24,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        backgroundColor: '#1E293B',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
        marginTop: -20,
        paddingTop: 30,
    },
    menuItem: {
        paddingVertical: 14,
    },
    lastMenuItem: {
        borderBottomWidth: 0,
    },
    menuItemContent: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        gap: 12,
    },
    menuItemText: {
        fontSize: 18,
        color: '#9CA3AF',
        fontWeight: '600',
    },
    menuGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 8,
    },
    menuGridItem: {
        width: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 8,
    },
    menuGridIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuGridIconContainerSelected: {
        backgroundColor: '#3B82F6',
    },
    menuGridText: {
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '500',
    },
    selectedText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    destructiveText: {
        color: '#EF4444',
        fontWeight: '600',
    },
});

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
    { label: 'ניהול שיעורים', value: '/admin/classes', icon: 'calendar' },
    { label: 'ניהול לקוחות', value: '/admin/clients', icon: 'people' },
    { label: 'דוחות', value: '/admin/financial', icon: 'bar-chart' },
    { label: 'הגדרות', value: '/admin/settings', icon: 'settings' },
    { label: 'התנתק', value: 'logout', icon: 'log-out', isDestructive: true },
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
            progress.value = withSpring(0, { damping: 15, stiffness: 100 });
            // Delay state update to allow animation to finish
            setTimeout(() => setIsOpen(false), 300);
        } else {
            setIsOpen(true);
            progress.value = withSpring(1, { damping: 15, stiffness: 100 });
        }
    };

    const handleNavigation = (value: string) => {
        toggleMenu();
        // Small delay to allow menu to start closing before navigating
        setTimeout(() => {
            if (value === 'logout') {
                // Handle logout
                console.log('Logging out...');
                router.replace('/(auth)/login');
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
    // Common names that work cross-platform usually (or specific ones)
    const getIoniconsName = (itemIcon: string): keyof typeof Ionicons.glyphMap => {
        switch (itemIcon) {
            case 'speedometer': return 'speedometer-outline';
            case 'calendar': return 'calendar-outline';
            case 'people': return 'people-outline';
            case 'bar-chart': return 'stats-chart-outline';
            case 'settings': return 'settings-outline';
            case 'log-out': return 'log-out-outline';
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
            <View style={[styles.menuContainer, { top: insets.top + 60 }]}>
                <Animated.View style={[styles.dropdown, menuStyle]}>
                    {MENU_ITEMS.map((item, index) => {
                        const isSelected = pathname === item.value;
                        return (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.menuItem,
                                    index === MENU_ITEMS.length - 1 && styles.lastMenuItem
                                ]}
                                onPress={() => handleNavigation(item.value)}
                            >
                                <View style={styles.menuItemContent}>
                                    <Ionicons
                                        name={getIoniconsName(item.icon)}
                                        size={22}
                                        color={
                                            item.isDestructive ? '#EF4444' : '#FFFFFF'
                                        }
                                    />
                                    <Text style={[
                                        styles.menuItemText,
                                        isSelected && styles.selectedText,
                                        item.isDestructive && styles.destructiveText
                                    ]}>
                                        {item.label}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )
                    })}
                </Animated.View>
            </View>

            {/* Header Bar */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={toggleMenu}
                    style={styles.headerTouchable}
                >
                    <Text style={styles.headerTitle}>{currentTitle}</Text>
                    <Animated.View style={chevronStyle}>
                        <Ionicons name="chevron-down" size={16} color="#ffffff" />
                    </Animated.View>
                </TouchableOpacity>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    header: {
        backgroundColor: '#000000',
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        zIndex: 100, // Highest priority
        alignItems: 'center',
        justifyContent: 'center',
        // Shadow for the header itself
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 10,
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
        fontSize: 18,
        fontWeight: '700',
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
        alignItems: 'center', // Center the menu horizontally if we wanted, but we want full width or constrained? 
        // Request said: "Floating Surface appearing from underneath the header"
    },
    dropdown: {
        backgroundColor: '#000000',
        width: '100%',
        paddingHorizontal: 20,
        paddingVertical: 12,
        paddingBottom: 24,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
        // Pull it up initially so it slides down from "under" the header visually
        marginTop: -20,
        paddingTop: 30, // Add padding to push content down below the overlap
    },
    menuItem: {
        paddingVertical: 14,
    },
    lastMenuItem: {
        borderBottomWidth: 0,
    },
    menuItemContent: {
        flexDirection: 'row',
        justifyContent: 'flex-start', // Align left
        alignItems: 'center',
        gap: 12,
    },
    menuItemText: {
        fontSize: 16,
        color: '#9CA3AF',
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

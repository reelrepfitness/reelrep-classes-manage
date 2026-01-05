import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity } from 'react-native';
import {
    Tabs,
    TabsContent,
    TabsList,
    useTabsContext,
} from '@/components/ui/tabs';
import { IncomeSlide } from './slides/IncomeSlide';
import { RetentionSlide } from './slides/RetentionSlide';
import { BirthdaySlide } from './slides/BirthdaySlide';
import { Wallet, Users, Cake } from 'lucide-react-native';
import Animated, {
    useAnimatedStyle,
    withTiming,
    useSharedValue,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { useColor } from '@/hooks/useColor';

// Custom Animated Trigger Component
const AnimatedTabTrigger = ({ value, label, icon: Icon }: { value: string, label: string, icon: any }) => {
    const { activeTab, setActiveTab, registerTab, unregisterTab } = useTabsContext();
    const isActive = activeTab === value;
    const primaryColor = useColor('primary');

    // Animation values
    const flexValue = useSharedValue(isActive ? 3 : 1);
    const textOpacity = useSharedValue(isActive ? 1 : 0);

    useEffect(() => {
        registerTab(value);
        return () => unregisterTab(value);
    }, [value, registerTab, unregisterTab]);

    useEffect(() => {
        flexValue.value = withTiming(isActive ? 2.5 : 1, { duration: 300 });
        textOpacity.value = withTiming(isActive ? 1 : 0, { duration: 300 });
    }, [isActive]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            flex: flexValue.value,
        };
    });

    const animatedTextStyle = useAnimatedStyle(() => {
        return {
            opacity: textOpacity.value,
            transform: [{ translateX: withTiming(isActive ? 0 : 10, { duration: 200 }) }]
        };
    });

    // Dynamic styles based on active tab
    const getActiveBg = () => {
        if (value === 'income') return '#18181b';
        if (value === 'birthdays') return primaryColor;
        return '#fff';
    };

    const getActiveTextColor = () => {
        if (value === 'retention') return primaryColor;
        return '#fff';
    };

    return (
        <Animated.View style={[
            {
                marginHorizontal: 4,
                borderRadius: 999,
                overflow: 'hidden',
                backgroundColor: isActive ? getActiveBg() : 'transparent',
            },
            animatedStyle
        ]}>
            <TouchableOpacity
                onPress={() => setActiveTab(value)}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 10,
                    height: 48,
                }}
                activeOpacity={0.8}
            >
                <Icon size={20} color={isActive ? getActiveTextColor() : '#71717a'} />
                {isActive && (
                    <Animated.View style={[
                        { marginLeft: 8, overflow: 'hidden' },
                        animatedTextStyle
                    ]}>
                        <Text
                            numberOfLines={1}
                            style={{
                                fontWeight: '600',
                                color: getActiveTextColor(),
                                fontSize: 13
                            }}
                        >
                            {label}
                        </Text>
                    </Animated.View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
};

export const AdminActionTabs = () => {
    const [activeTab, setActiveTab] = useState('income');

    return (
        <View className="w-full mb-4">
            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                style={{ width: '100%' }}
                enableSwipe={false}
            >
                <TabsList
                    style={{
                        backgroundColor: '#f4f4f5',
                        borderRadius: 999,
                        padding: 6,
                        marginBottom: 16,
                    }}
                >
                    <AnimatedTabTrigger value="income" label="הכנסות" icon={Wallet} />
                    <AnimatedTabTrigger value="retention" label="שימור לקוחות" icon={Users} />
                    <AnimatedTabTrigger value="birthdays" label="ימי הולדת" icon={Cake} />
                </TabsList>

                <TabsContent value="income">
                    <IncomeSlide />
                </TabsContent>

                <TabsContent value="retention">
                    <RetentionSlide />
                </TabsContent>

                <TabsContent value="birthdays">
                    <BirthdaySlide />
                </TabsContent>
            </Tabs>
        </View>
    );
};

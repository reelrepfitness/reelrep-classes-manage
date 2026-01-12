import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Switch, Platform, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/constants/supabase';
import Colors from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- Types ---
type NotificationSettings = {
    id?: string;
    // Attention
    notify_payment_failed: boolean;
    notify_in_app_purchase: boolean;
    notify_class_cancelled: boolean;
    notify_form_submitted: boolean;
    notify_payment_success: boolean;
    notify_sub_unfrozen: boolean;
    notify_new_lead: boolean;
    // Action
    notify_last_punch: boolean;
    notify_ticket_finished: boolean;
    notify_sub_expiring: boolean;
    // Blocks
    notify_user_blocked: boolean;
    notify_user_unblocked: boolean;
    notify_penalty_applied: boolean;
};

// --- Mappings ---
type SettingConfig = {
    key: keyof NotificationSettings;
    label: string;
    iconIOS: keyof typeof Ionicons.glyphMap;
    iconAndroid: keyof typeof Ionicons.glyphMap;
    color: string;
};

const SECTIONS: { title: string; data: SettingConfig[] }[] = [
    {
        title: "שים לב!",
        data: [
            { key: 'notify_payment_failed', label: "חיוב נכשל", iconIOS: "card-outline", iconAndroid: "card", color: "#EF4444" },
            { key: 'notify_in_app_purchase', label: "רכישה באפליקציה", iconIOS: "cart-outline", iconAndroid: "cart", color: "#F59E0B" },
            { key: 'notify_class_cancelled', label: "ביטול אימון (לקוח)", iconIOS: "calendar-outline", iconAndroid: "calendar", color: "#EF4444" },
            { key: 'notify_form_submitted', label: "טופס דיגיטלי", iconIOS: "document-text-outline", iconAndroid: "document-text", color: "#3B82F6" },
            { key: 'notify_payment_success', label: "חיוב הצליח", iconIOS: "checkmark-circle-outline", iconAndroid: "checkmark-circle", color: "#10B981" },
            { key: 'notify_sub_unfrozen', label: "סיום הקפאה", iconIOS: "snow-outline", iconAndroid: "snow", color: "#3B82F6" },
            { key: 'notify_new_lead', label: "ליד חדש", iconIOS: "person-add-outline", iconAndroid: "person-add", color: "#8B5CF6" },
        ]
    },
    {
        title: "לטיפול",
        data: [
            { key: 'notify_last_punch', label: "ניקוב אחרון", iconIOS: "alert-circle-outline", iconAndroid: "alert-circle", color: "#F59E0B" },
            { key: 'notify_ticket_finished', label: "סיום כרטיסייה", iconIOS: "albums-outline", iconAndroid: "albums", color: "#F97316" }, // close to file tray
            { key: 'notify_sub_expiring', label: "תוקף מנוי", iconIOS: "hourglass-outline", iconAndroid: "hourglass", color: "#F59E0B" },
        ]
    },
    {
        title: "חסימות ועונשים",
        data: [
            { key: 'notify_user_blocked', label: "נחסם", iconIOS: "lock-closed-outline", iconAndroid: "lock-closed", color: "#EF4444" },
            { key: 'notify_user_unblocked', label: "שוחרר מחסימה", iconIOS: "lock-open-outline", iconAndroid: "lock-open", color: "#10B981" },
            { key: 'notify_penalty_applied', label: "ענישה/קיצור", iconIOS: "hammer-outline", iconAndroid: "hammer", color: "#EF4444" },
        ]
    }
];

export default function AdminNotificationSettings() {
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<NotificationSettings>({
        notify_payment_failed: true,
        notify_in_app_purchase: true,
        notify_class_cancelled: true,
        notify_form_submitted: true,
        notify_payment_success: true,
        notify_sub_unfrozen: true,
        notify_new_lead: true,
        notify_last_punch: true,
        notify_ticket_finished: true,
        notify_sub_expiring: true,
        notify_user_blocked: true,
        notify_user_unblocked: true,
        notify_penalty_applied: true,
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.error("No user logged in");
                return;
            }

            const { data, error } = await supabase
                .from('admin_notification_settings')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setSettings(data);
            } else {
                // If no settings exist yet, create default row for THIS user
                const newSettings = { ...settings, user_id: user.id };
                // Remove ID if present in default state to avoid conflict, though state doesn't have it by default usually
                delete (newSettings as any).id;

                const { data: newData, error: insertError } = await supabase
                    .from('admin_notification_settings')
                    .insert([newSettings])
                    .select()
                    .single();

                if (insertError) {
                    console.error('Error creating default settings:', insertError);
                } else if (newData) {
                    setSettings(newData);
                }
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSetting = async (key: keyof NotificationSettings) => {
        // 1. Optimistic Update
        const previousValue = settings[key];
        const newValue = !previousValue;

        setSettings(prev => ({ ...prev, [key]: newValue }));

        // 2. Network Request
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user");

            const { error } = await supabase
                .from('admin_notification_settings')
                .update({ [key]: newValue })
                .eq('user_id', user.id); // Update safely by User ID

            if (error) throw error;

        } catch (error) {
            console.error('Error updating setting:', error);
            // Revert state
            setSettings(prev => ({ ...prev, [key]: previousValue }));
            Alert.alert('שגיאה', 'עדכון ההגדרה נכשל');
        }
    };

    const router = useRouter();

    return (
        <View className="flex-1 bg-gray-50">
            <Stack.Screen options={{ headerShown: false }} />

            {/* Custom Header */}
            <View
                className="bg-white shadow-sm pb-4 border-b border-gray-100 z-10"
                style={{ paddingTop: insets.top }}
            >
                <View className="flex-row items-center justify-between px-4 pt-2">
                    <View style={{ width: 40 }} /> {/* Spacer for centering */}

                    <Text className="text-xl font-extrabold text-[#09090B]">הגדרות התראות</Text>

                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center border border-gray-100 shadow-sm"
                    >
                        <Ionicons name="chevron-forward" size={24} color="#09090B" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={{
                    padding: 24,
                    paddingBottom: insets.bottom + 40
                }}
            >
                {loading ? (
                    <View className="mt-10">
                        <ActivityIndicator size="large" color={Colors.primary} />
                    </View>
                ) : (
                    SECTIONS.map((section, index) => (
                        <View key={index} className="mb-6">
                            {/* Section Header */}
                            <Text className="text-lg font-bold text-gray-900 mb-3 text-right">
                                {section.title}
                            </Text>

                            {/* Card Container */}
                            <View className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                                {section.data.map((item, itemIndex) => {
                                    const isLast = itemIndex === section.data.length - 1;
                                    const iconName = Platform.OS === 'ios' ? item.iconIOS : item.iconAndroid;

                                    return (
                                        <View
                                            key={item.key}
                                            className={`flex-row justify-between items-center p-4 ${!isLast ? 'border-b border-gray-50' : ''}`}
                                        >
                                            {/* Left Side (LTR) -> Switch */}
                                            {/* In RTL environment, 'justify-between' puts first child (Switch) on Right? No. */}
                                            {/* Flex layout follows direction. If I18nManager.isRTL is true: */}
                                            {/* Child 1 (Start) -> Right. Child 2 (End) -> Left. */}
                                            {/* User requested: Right=Symbol + Text. Left=Switch. */}
                                            {/* In RTL: Start=Right. So Symbol+Text should be FIRST in DOM. Switch LAST. */}

                                            {/* Content (Icon + Label) */}
                                            <View className="flex-row items-center gap-3">
                                                {/* Icon Box */}
                                                <View
                                                    className="w-10 h-10 rounded-full items-center justify-center"
                                                    style={{ backgroundColor: `${item.color}15` }} // 15 = low opacity hex
                                                >
                                                    <Ionicons
                                                        name={iconName}
                                                        size={20}
                                                        color={item.color}
                                                    />
                                                </View>

                                                {/* Label */}
                                                <Text className="text-base font-semibold text-gray-800 text-right">
                                                    {item.label}
                                                </Text>
                                            </View>

                                            {/* Switch */}
                                            <Switch
                                                value={!!settings[item.key as keyof NotificationSettings]}
                                                onValueChange={() => toggleSetting(item.key as keyof NotificationSettings)}
                                                trackColor={{ false: '#E5E7EB', true: Platform.OS === 'ios' ? '#34C759' : Colors.primary }}
                                                thumbColor={'#FFFFFF'}
                                                ios_backgroundColor="#E5E7EB"
                                            />
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Switch, Platform, Alert, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/constants/supabase';
import Colors from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type NotificationSettings = {
    id?: string;
    notify_payment_failed: boolean;
    notify_in_app_purchase: boolean;
    notify_class_cancelled: boolean;
    notify_form_submitted: boolean;
    notify_payment_success: boolean;
    notify_sub_unfrozen: boolean;
    notify_new_lead: boolean;
    notify_last_punch: boolean;
    notify_ticket_finished: boolean;
    notify_sub_expiring: boolean;
    notify_user_blocked: boolean;
    notify_user_unblocked: boolean;
    notify_penalty_applied: boolean;
};

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
            { key: 'notify_ticket_finished', label: "סיום כרטיסייה", iconIOS: "albums-outline", iconAndroid: "albums", color: "#F97316" },
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
    const router = useRouter();
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
                const newSettings = { ...settings, user_id: user.id };
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
        const previousValue = settings[key];
        const newValue = !previousValue;

        setSettings(prev => ({ ...prev, [key]: newValue }));

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user");

            const { error } = await supabase
                .from('admin_notification_settings')
                .update({ [key]: newValue })
                .eq('user_id', user.id);

            if (error) throw error;

        } catch (error) {
            console.error('Error updating setting:', error);
            setSettings(prev => ({ ...prev, [key]: previousValue }));
            Alert.alert('שגיאה', 'עדכון ההגדרה נכשל');
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={[styles.header, { paddingTop: insets.top }]}>
                <View style={styles.headerContent}>
                    <View style={styles.spacer} />
                    <Text style={styles.headerTitle}>ניהול התראות מנהל</Text>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-forward" size={24} color="#ffffffff" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                    </View>
                ) : (
                    SECTIONS.map((section, index) => (
                        <View key={index} style={styles.section}>
                            <Text style={styles.sectionTitle}>{section.title}</Text>
                            <View style={styles.card}>
                                {section.data.map((item, itemIndex) => {
                                    const isLast = itemIndex === section.data.length - 1;
                                    const iconName = Platform.OS === 'ios' ? item.iconIOS : item.iconAndroid;

                                    return (
                                        <View key={item.key} style={[styles.row, !isLast && styles.rowBorder]}>
                                            <View style={styles.rowContent}>
                                                <View style={[styles.iconBox, { backgroundColor: `${item.color}15` }]}>
                                                    <Ionicons name={iconName} size={20} color={item.color} />
                                                </View>
                                                <Text style={styles.label}>{item.label}</Text>
                                            </View>
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        backgroundColor: '#EF4444',
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        borderBottomColor: '#F3F4F6',
    },
    headerContent: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    spacer: {
        width: 40,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#ffffffff',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
       
    },
    loadingContainer: {
        marginTop: 40,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#111827',
        marginBottom: 12,
        textAlign: 'center',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    rowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#F9FAFB',
    },
    rowContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        textAlign: 'left',
    },
});

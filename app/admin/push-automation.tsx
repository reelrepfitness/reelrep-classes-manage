import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Switch, Platform, Alert, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/constants/supabase';
import Colors from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type PushAutomationSettings = {
    id?: string;
    push_class_reminder: boolean;
    push_booking_confirmed: boolean;
    push_booking_cancelled: boolean;
    push_waitlist_available: boolean;
    push_streak_motivation: boolean;
    push_inactive_reminder: boolean;
    push_subscription_expiring: boolean;
    push_new_class_available: boolean;
};

type SettingConfig = {
    key: keyof PushAutomationSettings;
    label: string;
    description: string;
    iconIOS: keyof typeof Ionicons.glyphMap;
    iconAndroid: keyof typeof Ionicons.glyphMap;
    color: string;
};

const SECTIONS: { title: string; data: SettingConfig[] }[] = [
    {
        title: "תזכורות אימון",
        data: [
            { key: 'push_class_reminder', label: "תזכורת לפני אימון", description: "שעה לפני האימון", iconIOS: "alarm-outline", iconAndroid: "alarm", color: "#3B82F6" },
            { key: 'push_booking_confirmed', label: "אישור הרשמה", description: "לאחר הרשמה לאימון", iconIOS: "checkmark-circle-outline", iconAndroid: "checkmark-circle", color: "#10B981" },
            { key: 'push_booking_cancelled', label: "ביטול הרשמה", description: "כשמתאמן מבטל", iconIOS: "close-circle-outline", iconAndroid: "close-circle", color: "#EF4444" },
            { key: 'push_waitlist_available', label: "מקום התפנה", description: "כשמתפנה מקום מרשימת המתנה", iconIOS: "flash-outline", iconAndroid: "flash", color: "#F59E0B" },
        ]
    },
    {
        title: "מוטיבציה",
        data: [
            { key: 'push_streak_motivation', label: "עידוד רציפות", description: "שמור על הסטריק!", iconIOS: "flame-outline", iconAndroid: "flame", color: "#F97316" },
            { key: 'push_inactive_reminder', label: "תזכורת חוסר פעילות", description: "לאחר 7 ימים ללא אימון", iconIOS: "bed-outline", iconAndroid: "bed", color: "#8B5CF6" },
        ]
    },
    {
        title: "עדכונים",
        data: [
            { key: 'push_subscription_expiring', label: "מנוי עומד לפוג", description: "שבוע לפני סיום מנוי", iconIOS: "hourglass-outline", iconAndroid: "hourglass", color: "#F59E0B" },
            { key: 'push_new_class_available', label: "אימון חדש נפתח", description: "כשנוסף אימון חדש לוח", iconIOS: "add-circle-outline", iconAndroid: "add-circle", color: "#10B981" },
        ]
    }
];

export default function PushAutomationSettings() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<PushAutomationSettings>({
        push_class_reminder: true,
        push_booking_confirmed: true,
        push_booking_cancelled: true,
        push_waitlist_available: true,
        push_streak_motivation: true,
        push_inactive_reminder: true,
        push_subscription_expiring: true,
        push_new_class_available: true,
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.error("No user logged in");
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('push_automation_settings')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching push settings:', error);
            }

            if (data) {
                setSettings(data);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSetting = async (key: keyof PushAutomationSettings) => {
        const previousValue = settings[key];
        const newValue = !previousValue;

        setSettings(prev => ({ ...prev, [key]: newValue }));

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user");

            const { error } = await supabase
                .from('push_automation_settings')
                .upsert({ user_id: user.id, [key]: newValue }, { onConflict: 'user_id' });

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
                    <Text style={styles.headerTitle}>התראות למתאמן</Text>
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
                                                <View style={[styles.iconBox,]}>
                                                    <Ionicons name={iconName} size={35} color={item.color} />
                                                </View>
                                                <View style={styles.textContainer}>
                                                    <Text style={styles.label}>{item.label}</Text>
                                                    <Text style={styles.description}>{item.description}</Text>
                                                </View>
                                            </View>
                                            <Switch
                                                value={!!settings[item.key as keyof PushAutomationSettings]}
                                                onValueChange={() => toggleSetting(item.key as keyof PushAutomationSettings)}
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
        backgroundColor: '#3B82F6',
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
        flex: 1,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        flex: 1,
    },
    label: {
        fontSize: 16,
        fontWeight: '800',
        color: '#374151',
        textAlign: 'left',
    },
    description: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'left',
        marginTop: 2,
    },
});

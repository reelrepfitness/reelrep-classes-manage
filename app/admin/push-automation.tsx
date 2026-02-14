import React, { useEffect, useState, useCallback } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { View, Text, ScrollView, Switch, Platform, Alert, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/constants/supabase';
import Colors from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@/components/ui/picker';

// --- Types ---

type NotificationConfig = {
    push_class_reminder?: {
        timing: 'same_day' | 'day_before';
        time: string;
    };
    push_booking_confirmed?: {
        delay: 'instant' | '5min' | '15min';
        title: string;
        body: string;
    };
    push_booking_cancelled?: {
        delay: 'instant' | '5min' | '15min';
        title: string;
        body: string;
    };
    push_waitlist_available?: {
        delay: 'instant' | '5min';
        title: string;
        body: string;
    };
    push_streak_motivation?: {
        min_days: number;
        time: string;
        title: string;
        body: string;
    };
    push_inactive_reminder?: {
        days_threshold: number;
        time: string;
        title: string;
        body: string;
    };
    push_subscription_expiring?: {
        days_before: number;
        time: string;
        title: string;
        body: string;
    };
    push_new_class_available?: {
        delay: 'instant' | '1hour' | 'next_morning';
        time?: string;
        title: string;
        body: string;
    };
};

const CONFIG_DEFAULTS: NotificationConfig = {
    push_class_reminder: { timing: 'same_day', time: '08:00' },
    push_booking_confirmed: { delay: 'instant', title: 'הרשמה אושרה', body: 'ההרשמה לאימון אושרה בהצלחה' },
    push_booking_cancelled: { delay: 'instant', title: 'הרשמה בוטלה', body: 'ההרשמה לאימון בוטלה' },
    push_waitlist_available: { delay: 'instant', title: 'מקום התפנה!', body: 'התפנה מקום באימון שנרשמת לרשימת ההמתנה' },
    push_streak_motivation: { min_days: 3, time: '09:00', title: 'כל הכבוד!', body: 'אתה על רצף של {days} ימים! המשך כך' },
    push_inactive_reminder: { days_threshold: 7, time: '18:00', title: 'מתגעגעים אליך!', body: 'עברו {days} ימים מאז האימון האחרון שלך' },
    push_subscription_expiring: { days_before: 7, time: '10:00', title: 'המנוי עומד לפוג', body: 'המנוי שלך יפוג בעוד {days} ימים' },
    push_new_class_available: { delay: 'instant', time: '08:00', title: 'אימון חדש!', body: 'אימון חדש נוסף ללוח - בוא לבדוק!' },
};

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
    notification_config?: NotificationConfig;
};

type SettingKey = keyof Omit<PushAutomationSettings, 'id' | 'notification_config'>;

type SettingConfig = {
    key: SettingKey;
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
            { key: 'push_class_reminder', label: "תזכורת לפני אימון", description: "תזכורת לפני תחילת האימון", iconIOS: "alarm-outline", iconAndroid: "alarm", color: "#3B82F6" },
            { key: 'push_booking_confirmed', label: "אישור הרשמה", description: "לאחר הרשמה לאימון", iconIOS: "checkmark-circle-outline", iconAndroid: "checkmark-circle", color: "#10B981" },
            { key: 'push_booking_cancelled', label: "ביטול הרשמה", description: "כשמתאמן מבטל", iconIOS: "close-circle-outline", iconAndroid: "close-circle", color: "#EF4444" },
            { key: 'push_waitlist_available', label: "מקום התפנה", description: "כשמתפנה מקום מרשימת המתנה", iconIOS: "flash-outline", iconAndroid: "flash", color: "#F59E0B" },
        ]
    },
    {
        title: "מוטיבציה",
        data: [
            { key: 'push_streak_motivation', label: "עידוד רציפות", description: "שמור על הסטריק!", iconIOS: "flame-outline", iconAndroid: "flame", color: "#F97316" },
            { key: 'push_inactive_reminder', label: "תזכורת חוסר פעילות", description: "לאחר ימים ללא אימון", iconIOS: "bed-outline", iconAndroid: "bed", color: "#8B5CF6" },
        ]
    },
    {
        title: "עדכונים",
        data: [
            { key: 'push_subscription_expiring', label: "מנוי עומד לפוג", description: "לפני סיום מנוי", iconIOS: "hourglass-outline", iconAndroid: "hourglass", color: "#F59E0B" },
            { key: 'push_new_class_available', label: "אימון חדש נפתח", description: "כשנוסף אימון חדש ללוח", iconIOS: "add-circle-outline", iconAndroid: "add-circle", color: "#10B981" },
        ]
    }
];

// --- Picker options ---

const TIMING_OPTIONS = [
    { label: 'ביום האימון', value: 'same_day' },
    { label: 'יום לפני האימון', value: 'day_before' },
];

const DELAY_OPTIONS_3 = [
    { label: 'מיידי', value: 'instant' },
    { label: '5 דקות אחרי', value: '5min' },
    { label: '15 דקות אחרי', value: '15min' },
];

const DELAY_OPTIONS_2 = [
    { label: 'מיידי', value: 'instant' },
    { label: '5 דקות אחרי', value: '5min' },
];

const NEW_CLASS_DELAY_OPTIONS = [
    { label: 'מיידי', value: 'instant' },
    { label: 'שעה אחרי הוספה', value: '1hour' },
    { label: 'בבוקר למחרת', value: 'next_morning' },
];

// --- Helpers ---

function formatTimeInput(text: string): string {
    const digits = text.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    const hh = digits.slice(0, 2);
    const mm = digits.slice(2, 4);
    return `${hh}:${mm}`;
}

function getConfigValue<K extends keyof NotificationConfig>(
    config: NotificationConfig,
    key: K
): NonNullable<NotificationConfig[K]> {
    return (config[key] || CONFIG_DEFAULTS[key]) as NonNullable<NotificationConfig[K]>;
}

// --- Component ---

export default function PushAutomationScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [expandedKey, setExpandedKey] = useState<string | null>(null);
    const [settings, setSettings] = useState<PushAutomationSettings>({
        push_class_reminder: true,
        push_booking_confirmed: true,
        push_booking_cancelled: true,
        push_waitlist_available: true,
        push_streak_motivation: true,
        push_inactive_reminder: true,
        push_subscription_expiring: true,
        push_new_class_available: true,
        notification_config: {},
    });

    const config = { ...CONFIG_DEFAULTS, ...settings.notification_config } as Required<NotificationConfig>;

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setLoading(false); return; }

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

    const toggleSetting = async (key: SettingKey) => {
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

    const updateConfig = useCallback(async <K extends keyof NotificationConfig>(
        key: K,
        updates: Partial<NonNullable<NotificationConfig[K]>>
    ) => {
        const currentKeyConfig = getConfigValue(settings.notification_config || {}, key);
        const newKeyConfig = { ...currentKeyConfig, ...updates };
        const newConfig = { ...(settings.notification_config || {}), [key]: newKeyConfig };

        setSettings(prev => ({ ...prev, notification_config: newConfig }));

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user");

            const { error } = await supabase
                .from('push_automation_settings')
                .upsert({ user_id: user.id, notification_config: newConfig }, { onConflict: 'user_id' });

            if (error) throw error;
        } catch (error) {
            console.error('Error updating config:', error);
            Alert.alert('שגיאה', 'עדכון ההגדרה נכשל');
        }
    }, [settings.notification_config]);

    const toggleExpand = (key: string) => {
        setExpandedKey(prev => prev === key ? null : key);
    };

    // --- Render edit fields for each notification type ---

    const renderEditFields = (key: SettingKey) => {
        switch (key) {
            case 'push_class_reminder': {
                const c = getConfigValue(config, 'push_class_reminder');
                return (
                    <>
                        <FieldLabel text="מתי לשלוח" />
                        <Picker
                            options={TIMING_OPTIONS}
                            value={c.timing}
                            onValueChange={(v) => updateConfig('push_class_reminder', { timing: v as any })}
                            placeholder="בחר תזמון"
                            anchor="bottom"
                        />
                        <FieldLabel text="שעה" />
                        <TimeInput
                            value={c.time}
                            onChange={(v) => updateConfig('push_class_reminder', { time: v })}
                        />
                    </>
                );
            }

            case 'push_booking_confirmed': {
                const c = getConfigValue(config, 'push_booking_confirmed');
                return (
                    <>
                        <FieldLabel text="עיכוב שליחה" />
                        <Picker
                            options={DELAY_OPTIONS_3}
                            value={c.delay}
                            onValueChange={(v) => updateConfig('push_booking_confirmed', { delay: v as any })}
                            placeholder="בחר עיכוב"
                            anchor="bottom"
                        />
                        <FieldLabel text="כותרת ההתראה" />
                        <MessageInput
                            value={c.title}
                            onChangeText={(v) => updateConfig('push_booking_confirmed', { title: v })}
                        />
                        <FieldLabel text="תוכן ההתראה" />
                        <MessageInput
                            value={c.body}
                            onChangeText={(v) => updateConfig('push_booking_confirmed', { body: v })}
                            multiline
                        />
                    </>
                );
            }

            case 'push_booking_cancelled': {
                const c = getConfigValue(config, 'push_booking_cancelled');
                return (
                    <>
                        <FieldLabel text="עיכוב שליחה" />
                        <Picker
                            options={DELAY_OPTIONS_3}
                            value={c.delay}
                            onValueChange={(v) => updateConfig('push_booking_cancelled', { delay: v as any })}
                            placeholder="בחר עיכוב"
                            anchor="bottom"
                        />
                        <FieldLabel text="כותרת ההתראה" />
                        <MessageInput
                            value={c.title}
                            onChangeText={(v) => updateConfig('push_booking_cancelled', { title: v })}
                        />
                        <FieldLabel text="תוכן ההתראה" />
                        <MessageInput
                            value={c.body}
                            onChangeText={(v) => updateConfig('push_booking_cancelled', { body: v })}
                            multiline
                        />
                    </>
                );
            }

            case 'push_waitlist_available': {
                const c = getConfigValue(config, 'push_waitlist_available');
                return (
                    <>
                        <FieldLabel text="עיכוב שליחה" />
                        <Picker
                            options={DELAY_OPTIONS_2}
                            value={c.delay}
                            onValueChange={(v) => updateConfig('push_waitlist_available', { delay: v as any })}
                            placeholder="בחר עיכוב"
                            anchor="bottom"
                        />
                        <FieldLabel text="כותרת ההתראה" />
                        <MessageInput
                            value={c.title}
                            onChangeText={(v) => updateConfig('push_waitlist_available', { title: v })}
                        />
                        <FieldLabel text="תוכן ההתראה" />
                        <MessageInput
                            value={c.body}
                            onChangeText={(v) => updateConfig('push_waitlist_available', { body: v })}
                            multiline
                        />
                    </>
                );
            }

            case 'push_streak_motivation': {
                const c = getConfigValue(config, 'push_streak_motivation');
                return (
                    <>
                        <FieldLabel text="מינימום ימי רצף" />
                        <NumberInput
                            value={c.min_days}
                            onChange={(v) => updateConfig('push_streak_motivation', { min_days: v })}
                        />
                        <FieldLabel text="שעת שליחה" />
                        <TimeInput
                            value={c.time}
                            onChange={(v) => updateConfig('push_streak_motivation', { time: v })}
                        />
                        <FieldLabel text="כותרת ההתראה" />
                        <MessageInput
                            value={c.title}
                            onChangeText={(v) => updateConfig('push_streak_motivation', { title: v })}
                        />
                        <FieldLabel text="תוכן ההתראה" />
                        <MessageInput
                            value={c.body}
                            onChangeText={(v) => updateConfig('push_streak_motivation', { body: v })}
                            multiline
                        />
                    </>
                );
            }

            case 'push_inactive_reminder': {
                const c = getConfigValue(config, 'push_inactive_reminder');
                return (
                    <>
                        <FieldLabel text="ימים ללא אימון" />
                        <NumberInput
                            value={c.days_threshold}
                            onChange={(v) => updateConfig('push_inactive_reminder', { days_threshold: v })}
                        />
                        <FieldLabel text="שעת שליחה" />
                        <TimeInput
                            value={c.time}
                            onChange={(v) => updateConfig('push_inactive_reminder', { time: v })}
                        />
                        <FieldLabel text="כותרת ההתראה" />
                        <MessageInput
                            value={c.title}
                            onChangeText={(v) => updateConfig('push_inactive_reminder', { title: v })}
                        />
                        <FieldLabel text="תוכן ההתראה" />
                        <MessageInput
                            value={c.body}
                            onChangeText={(v) => updateConfig('push_inactive_reminder', { body: v })}
                            multiline
                        />
                    </>
                );
            }

            case 'push_subscription_expiring': {
                const c = getConfigValue(config, 'push_subscription_expiring');
                return (
                    <>
                        <FieldLabel text="ימים לפני תפוגה" />
                        <NumberInput
                            value={c.days_before}
                            onChange={(v) => updateConfig('push_subscription_expiring', { days_before: v })}
                        />
                        <FieldLabel text="שעת שליחה" />
                        <TimeInput
                            value={c.time}
                            onChange={(v) => updateConfig('push_subscription_expiring', { time: v })}
                        />
                        <FieldLabel text="כותרת ההתראה" />
                        <MessageInput
                            value={c.title}
                            onChangeText={(v) => updateConfig('push_subscription_expiring', { title: v })}
                        />
                        <FieldLabel text="תוכן ההתראה" />
                        <MessageInput
                            value={c.body}
                            onChangeText={(v) => updateConfig('push_subscription_expiring', { body: v })}
                            multiline
                        />
                    </>
                );
            }

            case 'push_new_class_available': {
                const c = getConfigValue(config, 'push_new_class_available');
                return (
                    <>
                        <FieldLabel text="מתי לשלוח" />
                        <Picker
                            options={NEW_CLASS_DELAY_OPTIONS}
                            value={c.delay}
                            onValueChange={(v) => updateConfig('push_new_class_available', { delay: v as any })}
                            placeholder="בחר תזמון"
                            anchor="bottom"
                        />
                        {c.delay === 'next_morning' && (
                            <>
                                <FieldLabel text="שעה" />
                                <TimeInput
                                    value={c.time || '08:00'}
                                    onChange={(v) => updateConfig('push_new_class_available', { time: v })}
                                />
                            </>
                        )}
                        <FieldLabel text="כותרת ההתראה" />
                        <MessageInput
                            value={c.title}
                            onChangeText={(v) => updateConfig('push_new_class_available', { title: v })}
                        />
                        <FieldLabel text="תוכן ההתראה" />
                        <MessageInput
                            value={c.body}
                            onChangeText={(v) => updateConfig('push_new_class_available', { body: v })}
                            multiline
                        />
                    </>
                );
            }

            default:
                return null;
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
                        <Ionicons name="chevron-forward" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <Spinner size="lg" />
                    </View>
                ) : (
                    SECTIONS.map((section, index) => (
                        <View key={index} style={styles.section}>
                            <Text style={styles.sectionTitle}>{section.title}</Text>
                            <View style={styles.card}>
                                {section.data.map((item, itemIndex) => {
                                    const isLast = itemIndex === section.data.length - 1;
                                    const iconName = Platform.OS === 'ios' ? item.iconIOS : item.iconAndroid;
                                    const isExpanded = expandedKey === item.key;

                                    return (
                                        <View key={item.key} style={[!isLast && styles.rowBorder]}>
                                            <View style={styles.row}>
                                                <TouchableOpacity
                                                    style={styles.rowContent}
                                                    activeOpacity={0.6}
                                                    onPress={() => toggleExpand(item.key)}
                                                >
                                                    <View style={styles.iconBox}>
                                                        <Ionicons name={iconName} size={35} color={item.color} />
                                                    </View>
                                                    <View style={styles.textContainer}>
                                                        <Text style={styles.label}>{item.label}</Text>
                                                        <Text style={styles.description}>{item.description}</Text>
                                                    </View>
                                                    <Ionicons
                                                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                                        size={18}
                                                        color="#9CA3AF"
                                                        style={{ marginRight: 8 }}
                                                    />
                                                </TouchableOpacity>
                                                <Switch
                                                    value={!!settings[item.key]}
                                                    onValueChange={() => toggleSetting(item.key)}
                                                    trackColor={{ false: '#E5E7EB', true: Platform.OS === 'ios' ? '#34C759' : Colors.primary }}
                                                    thumbColor="#FFFFFF"
                                                    ios_backgroundColor="#E5E7EB"
                                                />
                                            </View>

                                            {isExpanded && (
                                                <View style={styles.expandedArea}>
                                                    {renderEditFields(item.key)}
                                                </View>
                                            )}
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

// --- Sub-components ---

function FieldLabel({ text }: { text: string }) {
    return <Text style={styles.fieldLabel}>{text}</Text>;
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [local, setLocal] = useState(value);

    useEffect(() => { setLocal(value); }, [value]);

    const handleChange = (text: string) => {
        const formatted = formatTimeInput(text);
        setLocal(formatted);
    };

    const handleBlur = () => {
        if (/^\d{2}:\d{2}$/.test(local)) {
            const [hh, mm] = local.split(':').map(Number);
            if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
                onChange(local);
                return;
            }
        }
        setLocal(value);
    };

    return (
        <TextInput
            style={styles.timeInput}
            value={local}
            onChangeText={handleChange}
            onBlur={handleBlur}
            placeholder="00:00"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            maxLength={5}
            textAlign="center"
        />
    );
}

function NumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    const [local, setLocal] = useState(String(value));

    useEffect(() => { setLocal(String(value)); }, [value]);

    const handleBlur = () => {
        const num = parseInt(local, 10);
        if (!isNaN(num) && num > 0) {
            onChange(num);
        } else {
            setLocal(String(value));
        }
    };

    return (
        <TextInput
            style={styles.timeInput}
            value={local}
            onChangeText={setLocal}
            onBlur={handleBlur}
            placeholder="7"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            maxLength={3}
            textAlign="center"
        />
    );
}

function MessageInput({ value, onChangeText, multiline }: { value: string; onChangeText: (v: string) => void; multiline?: boolean }) {
    const [local, setLocal] = useState(value);

    useEffect(() => { setLocal(value); }, [value]);

    const handleBlur = () => {
        if (local.trim()) {
            onChangeText(local);
        } else {
            setLocal(value);
        }
    };

    return (
        <TextInput
            style={[styles.messageInput, multiline && styles.messageInputMultiline]}
            value={local}
            onChangeText={setLocal}
            onBlur={handleBlur}
            placeholderTextColor="#9CA3AF"
            multiline={multiline}
            textAlignVertical={multiline ? 'top' : 'center'}
            textAlign="right"
        />
    );
}

// --- Styles ---

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
        color: '#fff',
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
        borderBottomColor: '#F3F4F6',
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
        fontSize: 18,
        fontWeight: '800',
        color: '#374151',
        textAlign: 'left',
    },
    description: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'left',
        marginTop: 2,
    },
    expandedArea: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 8,
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#454646ff',
        textAlign: 'left',
        marginTop: 4,
    },
    timeInput: {
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 16,
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        width: 100,
        alignSelf: 'flex-start',
    },
    messageInput: {
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 14,
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
        writingDirection: 'rtl',
    },
    messageInputMultiline: {
        minHeight: 60,
    },
});

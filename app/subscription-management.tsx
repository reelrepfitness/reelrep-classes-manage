import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    TextInput,
    Platform,
    Image,
    Modal
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/constants/supabase';
import Colors from '@/constants/colors';
import DateTimePicker from '@react-native-community/datetimepicker';

type RequestType = 'freeze' | 'extend';

// --- Components ---
const MenuOption = ({ icon, title, subtitle, onPress, color = '#111827' }: any) => (
    <TouchableOpacity style={styles.menuOption} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>{title}</Text>
            <Text style={styles.menuSubtitle}>{subtitle}</Text>
        </View>
        <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
            <Ionicons name={icon} size={34} color={color} />
        </View>
    </TouchableOpacity>
);

const DateInput = ({ label, date, onPress }: { label: string, date: Date | undefined, onPress: () => void }) => (
    <View style={{ flex: 1 }}>
        <Text style={styles.inputLabel}>{label}</Text>
        <TouchableOpacity onPress={onPress} style={styles.dateField}>
            <Ionicons name="calendar-outline" size={18} color="#6B7280" />
            <Text style={[styles.dateText, !date && { color: '#9CA3AF' }]}>
                {date ? date.toLocaleDateString('he-IL') : 'בחר תאריך'}
            </Text>
        </TouchableOpacity>
    </View>
);

export default function SubscriptionManagementScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();

    const [activeForm, setActiveForm] = useState<RequestType | null>(null);
    const [reason, setReason] = useState('');
    const [freezeStart, setFreezeStart] = useState<Date | undefined>(undefined);
    const [freezeEnd, setFreezeEnd] = useState<Date | undefined>(undefined);
    const [extendDate, setExtendDate] = useState<Date | undefined>(undefined);
    const [submitting, setSubmitting] = useState(false);

    // Date Picker
    const [showPicker, setShowPicker] = useState<'freezeStart' | 'freezeEnd' | 'extend' | null>(null);
    // Temp date for iOS picker state before confirming
    const [tempDate, setTempDate] = useState(new Date());

    const onDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowPicker(null);
            if (selectedDate) confirmDate(selectedDate);
        } else {
            if (selectedDate) setTempDate(selectedDate);
        }
    };

    const confirmDate = (date: Date) => {
        if (showPicker === 'freezeStart') setFreezeStart(date);
        if (showPicker === 'freezeEnd') setFreezeEnd(date);
        if (showPicker === 'extend') setExtendDate(date);
        setShowPicker(null);
    };

    const openPicker = (type: 'freezeStart' | 'freezeEnd' | 'extend') => {
        const currentDate = (
            type === 'freezeStart' ? freezeStart :
                type === 'freezeEnd' ? freezeEnd :
                    extendDate
        ) || new Date();
        setTempDate(currentDate);
        setShowPicker(type);
    };

    const submitRequest = async () => {
        if (!user || !activeForm) return;

        if (!reason.trim()) {
            Alert.alert('חסר מידע', 'אנא כתוב את סיבת הבקשה');
            return;
        }

        let payload: Record<string, any> = { reason };
        let title = '';

        if (activeForm === 'freeze') {
            if (!freezeStart || !freezeEnd) {
                Alert.alert('חסר מידע', 'אנא בחר תאריכי התחלה וסיום');
                return;
            }
            if (freezeEnd <= freezeStart) {
                Alert.alert('שגיאה', 'תאריך סיום חייב להיות אחרי תאריך התחלה');
                return;
            }
            payload = { ...payload, startDate: freezeStart.toISOString(), endDate: freezeEnd.toISOString() };
            title = 'בקשה להקפאת מנוי';
        } else {
            if (!extendDate) {
                Alert.alert('חסר מידע', 'אנא בחר תאריך יעד');
                return;
            }
            payload = { ...payload, extensionDate: extendDate.toISOString() };
            title = 'בקשה להארכת מנוי';
        }

        setSubmitting(true);
        try {
            const { error } = await supabase.from('user_requests').insert({
                user_id: user.id,
                type: activeForm === 'freeze' ? 'freeze_request' : 'extension_request',
                title,
                message: `${user.name} ביקש/ה ${activeForm === 'freeze' ? 'הקפאה' : 'הארכה'}: ${reason}`,
                payload,
                status: 'pending'
            });

            if (error) throw error;
            Alert.alert('הבקשה נשלחה בהצלחה!', 'הצוות יבדוק את הבקשה ויחזור אליך.');
            setActiveForm(null);
            setReason('');
            setFreezeStart(undefined);
            setFreezeEnd(undefined);
            setExtendDate(undefined);
        } catch (error) {
            console.error(error);
            Alert.alert('שגיאה', 'משהו השתבש בשליחת הבקשה');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Custom Header with Subscription Card */}
            {/* Custom Header with Subscription Card */}
            <LinearGradient
                colors={['#374151', '#111827', '#000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.headerCard, { paddingTop: insets.top + 20, paddingBottom: 30, borderRadius: 0, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, marginTop: 0, marginBottom: 0 }]}
            >
                {/* Back Button */}
                <TouchableOpacity
                    style={{ position: 'absolute', top: insets.top + 20, left: 20, zIndex: 10, padding: 8 }}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                {(() => {
                    const sub = user?.subscription;
                    const hasActiveSubscription = sub?.status === 'active';
                    const isTicket = sub?.isTicket;
                    const totalSessions = sub?.totalSessions || 0;
                    const sessionsRemaining = sub?.sessionsRemaining || 0;
                    const sessionsUsed = totalSessions - sessionsRemaining;
                    const progressPercent = totalSessions > 0 ? (sessionsUsed / totalSessions) * 100 : 0;

                    const renderPlanTitle = () => {
                        if (!sub?.planName) {
                            return <Text style={styles.headerTitle}>הסטטוס שלי</Text>;
                        }
                        const name = sub.planName.toUpperCase();
                        if (name.includes('ELITE')) {
                            return <Image source={require('@/assets/images/reel-elite.png')} style={styles.planImage} resizeMode="contain" />;
                        } else if (name.includes('ONE')) {
                            return <Image source={require('@/assets/images/reel-one.png')} style={styles.planImage} resizeMode="contain" />;
                        } else if (name.includes('10') || totalSessions === 10) {
                            return <Image source={require('@/assets/images/10sessions.png')} style={styles.planImage} resizeMode="contain" />;
                        } else if (name.includes('20') || totalSessions === 20) {
                            return <Image source={require('@/assets/images/20sessions.png')} style={styles.planImage} resizeMode="contain" />;
                        }
                        return <Text style={styles.headerTitle}>{sub.planName}</Text>;
                    };

                    return (
                        <View style={styles.headerContent}>
                            <View style={{ marginTop: 20 }}>
                                {renderPlanTitle()}
                            </View>

                            <View style={[styles.activeBadge, !hasActiveSubscription && styles.inactiveBadge]}>
                                <View style={[styles.activeDot, !hasActiveSubscription && styles.inactiveDot]} />
                                <Text style={[styles.activeText, !hasActiveSubscription && styles.inactiveText]}>
                                    {hasActiveSubscription ? 'פעיל' : 'לא פעיל'}
                                </Text>
                            </View>

                            {hasActiveSubscription && isTicket && (
                                <View style={styles.progressContainer}>
                                    <View style={styles.progressBar}>
                                        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                                    </View>
                                    <Text style={styles.progressText}>
                                        נותרו לך {sessionsRemaining} אימונים
                                    </Text>
                                </View>
                            )}

                            <Text style={styles.expiryText}>
                                {hasActiveSubscription
                                    ? `בתוקף עד ${sub?.endDate ? new Date(sub.endDate).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }) : '-'}`
                                    : 'אין מנוי פעיל'
                                }
                            </Text>
                        </View>
                    );
                })()}
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.content}>

                <Text style={styles.sectionHeader}>פעולות זמינות</Text>

                {/* Freeze Option */}
                <View style={[styles.optionWrapper, activeForm === 'freeze' && styles.optionWrapperActive]}>
                    <MenuOption
                        icon="snow-outline"
                        title="הקפאת מנוי"
                        subtitle="עצור את המנוי לתקופה זמנית"
                        color="#2563EB"
                        onPress={() => setActiveForm(activeForm === 'freeze' ? null : 'freeze')}
                    />

                    {activeForm === 'freeze' && (
                        <View style={styles.formContainer}>
                            <Text style={styles.formTitle}>טופס בקשה להקפאה</Text>

                            <View style={{ gap: 12, marginBottom: 16 }}>

                                <TextInput
                                    style={styles.textArea}
                                    placeholder="למה תרצה להקפיא?"
                                    value={reason}
                                    onChangeText={setReason}
                                    multiline
                                    textAlignVertical="top"
                                    placeholderTextColor="#9CA3AF"
                                />

                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <DateInput label="התחלה" date={freezeStart} onPress={() => openPicker('freezeStart')} />
                                    <DateInput label="סיום" date={freezeEnd} onPress={() => openPicker('freezeEnd')} />
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.submitBtn}
                                onPress={submitRequest}
                                disabled={submitting}
                            >
                                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>שלח בקשה</Text>}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Extend Option */}
                <View style={[styles.optionWrapper, activeForm === 'extend' && styles.optionWrapperActive]}>
                    <MenuOption
                        icon="time-outline"
                        title="הארכת תוקף"
                        subtitle="הגשת בקשה להאריך את תוקף המנוי/כרטיסייה"
                        color="#059669"
                        onPress={() => setActiveForm(activeForm === 'extend' ? null : 'extend')}
                    />
                    {activeForm === 'extend' && (
                        <View style={styles.formContainer}>
                            <Text style={styles.formTitle}>טופס בקשה להארכה</Text>

                            <View style={{ gap: 12, marginBottom: 16 }}>

                                <TextInput
                                    style={styles.textArea}
                                    placeholder="פרט את הסיבה..."
                                    value={reason}
                                    onChangeText={setReason}
                                    multiline
                                    textAlignVertical="top"
                                    placeholderTextColor="#9CA3AF"
                                />
                                <DateInput label="עד מתי תרצו שאאריך?" date={extendDate} onPress={() => openPicker('extend')} />
                            </View>

                            <TouchableOpacity
                                style={styles.submitBtn}
                                onPress={submitRequest}
                                disabled={submitting}
                            >
                                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>שלח בקשה</Text>}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>



            </ScrollView>

            {/* Safe IOS Date Picker Modal */}
            <Modal visible={!!showPicker && Platform.OS === 'ios'} transparent animationType="fade">
                <View style={styles.pickerOverlay}>
                    <View style={styles.pickerContainer}>
                        <View style={styles.pickerHeader}>
                            <TouchableOpacity onPress={() => setShowPicker(null)}>
                                <Text style={styles.pickerCancel}>ביטול</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => confirmDate(tempDate)}>
                                <Text style={styles.pickerDone}>אישור</Text>
                            </TouchableOpacity>
                        </View>
                        <DateTimePicker
                            value={tempDate}
                            mode="date"
                            display="spinner"
                            onChange={onDateChange}
                            locale="he-IL"
                            textColor="#000"
                        />
                    </View>
                </View>
            </Modal>

            {/* Android Date Picker */}
            {
                !!showPicker && Platform.OS === 'android' && (
                    <DateTimePicker
                        value={tempDate}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                        locale="he-IL"
                    />
                )
            }
        </View >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    content: { padding: 20 },

    // Summary
    // Dynamic Header
    headerCard: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
    },
    headerContent: {
        alignItems: 'center',
        gap: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    planImage: {
        width: 140,
        height: 28,
        tintColor: '#FFFFFF',
    },
    activeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    activeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
    },
    activeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#10B981',
    },
    inactiveBadge: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    inactiveDot: {
        backgroundColor: '#EF4444',
        shadowColor: '#EF4444',
    },
    inactiveText: {
        color: '#EF4444',
    },
    progressContainer: {
        width: '100%',
        marginTop: 8,
        gap: 8,
    },
    progressBar: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#3B82F6', // Using explicit Blue color since Colors import might be missing
        borderRadius: 4,
    },
    progressText: {
        fontSize: 16,
        color: '#ffffffff',
        textAlign: 'center',
        fontWeight: '900',
    },
    expiryText: {
        fontSize: 14,
        color: '#9CA3AF',
        marginTop: -8,
    },

    sectionHeader: { fontSize: 18, fontWeight: '900', color: '#374151', marginBottom: 16, textAlign: 'left' },

    // Options
    optionWrapper: { marginBottom: 16, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    optionWrapperActive: { borderWidth: 2, borderColor: '#D1D5DB' },
    menuOption: { flexDirection: 'column-reverse', alignItems: 'center', padding: 16, justifyContent: 'space-between' },
    menuContent: { flex: 1, marginTop: 5 },
    menuTitle: { fontSize: 18, fontWeight: '900', color: '#111827', textAlign: 'center', marginBottom: 4 },
    menuSubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
    iconBox: { width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

    // Forms
    formContainer: { padding: 16, backgroundColor: '#F9FAFB', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    formTitle: { fontSize: 14, fontWeight: '800', color: '#000000ff', marginBottom: 12, textAlign: 'center' },
    inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4, textAlign: 'center' },
    textArea: { backgroundColor: '#fff', borderRadius: 12, padding: 12, height: 100, borderWidth: 1, borderColor: '#E5E7EB', textAlign: 'right', fontSize: 15, color: '#111827' },
    dateField: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, gap: 10, borderWidth: 1, borderColor: '#E5E7EB', height: 48 },
    dateText: { fontSize: 15, color: '#111827' },
    submitBtn: { backgroundColor: '#111827', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },

    // Picker Modal Styles
    pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    pickerContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30, alignItems: 'center' },
    pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#F9FAFB', borderTopLeftRadius: 20, borderTopRightRadius: 20, width: '100%' },
    pickerDone: { fontSize: 16, fontWeight: '600', color: '#2563EB' },
    pickerCancel: { fontSize: 16, color: '#EF4444' }
});

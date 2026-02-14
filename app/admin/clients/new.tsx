import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Spinner } from '@/components/ui/spinner';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check, CreditCard, Ticket } from 'lucide-react-native';
import Colors from '@/constants/colors';
import Fonts from '@/constants/typography';
import { supabase } from '@/constants/supabase';
import { useAdminClients, AvailablePlan } from '@/hooks/admin/useAdminClients';

interface CreateClientRequest {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    address?: string;
    city?: string;
    taxId?: string;
    remarks?: string;
    gender: 'male' | 'female';
    role: 'user' | 'coach' | 'admin';
    isAdmin: boolean;
    isCoach: boolean;
    // Plan assignment
    planType: 'none' | 'subscription' | 'ticket';
    planId?: string;
    subscriptionStart?: string;
    subscriptionEnd?: string;
    // Ticket plan details (sent for the edge function)
    ticketTotalSessions?: number;
    ticketValidityDays?: number;
}

export default function NewClientScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { fetchAvailablePlans } = useAdminClients();
    const [loading, setLoading] = useState(false);

    // Available plans from DB
    const [availablePlans, setAvailablePlans] = useState<AvailablePlan[]>([]);
    const [plansLoading, setPlansLoading] = useState(true);

    // Form state
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [taxId, setTaxId] = useState('');
    const [remarks, setRemarks] = useState('');
    const [gender, setGender] = useState<'male' | 'female' | ''>('');
    const [role, setRole] = useState<'user' | 'coach' | 'admin'>('user');
    const [isAdmin, setIsAdmin] = useState(false);
    const [isCoach, setIsCoach] = useState(false);

    // Plan assignment
    const [planType, setPlanType] = useState<'none' | 'subscription' | 'ticket'>('none');
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [subscriptionStart, setSubscriptionStart] = useState('');
    const [subscriptionEnd, setSubscriptionEnd] = useState('');

    // Load real plans from DB
    useEffect(() => {
        setPlansLoading(true);
        fetchAvailablePlans()
            .then(setAvailablePlans)
            .catch(err => console.error('Error loading plans:', err))
            .finally(() => setPlansLoading(false));
    }, [fetchAvailablePlans]);

    const filteredPlans = availablePlans.filter(p => {
        if (planType === 'subscription') return p.type === 'subscription';
        if (planType === 'ticket') return p.type === 'ticket';
        return false;
    });

    const selectedPlan = availablePlans.find(p => p.id === selectedPlanId);

    const validateForm = (): boolean => {
        if (!fullName.trim()) {
            Alert.alert('שגיאה', 'נא להזין שם מלא');
            return false;
        }
        if (!email.trim() || !email.includes('@')) {
            Alert.alert('שגיאה', 'נא להזין כתובת אימייל תקינה');
            return false;
        }
        if (!phone.trim()) {
            Alert.alert('שגיאה', 'נא להזין מספר טלפון');
            return false;
        }
        if (!password.trim() || password.length < 6) {
            Alert.alert('שגיאה', 'סיסמה חייבת להכיל לפחות 6 תווים');
            return false;
        }
        if (!gender) {
            Alert.alert('שגיאה', 'נא לבחור מגדר');
            return false;
        }
        if (planType === 'subscription' && selectedPlanId) {
            if (!subscriptionStart || !subscriptionEnd) {
                Alert.alert('שגיאה', 'נא למלא תאריכי מנוי');
                return false;
            }
            const startDate = new Date(subscriptionStart);
            const endDate = new Date(subscriptionEnd);
            if (endDate <= startDate) {
                Alert.alert('שגיאה', 'תאריך סיום המנוי חייב להיות אחרי תאריך ההתחלה');
                return false;
            }
        }
        if (planType !== 'none' && !selectedPlanId) {
            Alert.alert('שגיאה', 'נא לבחור תוכנית');
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const request: CreateClientRequest = {
                fullName: fullName.trim(),
                email: email.trim().toLowerCase(),
                phone: phone.trim(),
                password: password.trim(),
                address: address.trim() || undefined,
                city: city.trim() || undefined,
                taxId: taxId.trim() || undefined,
                remarks: remarks.trim() || undefined,
                gender: gender as 'male' | 'female',
                role,
                isAdmin,
                isCoach,
                planType,
                planId: selectedPlanId || undefined,
                subscriptionStart: subscriptionStart || undefined,
                subscriptionEnd: subscriptionEnd || undefined,
                ticketTotalSessions: selectedPlan?.total_sessions,
                ticketValidityDays: selectedPlan?.validity_days,
            };

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('No active session');
            }

            const { data, error } = await supabase.functions.invoke('create-client', {
                body: request,
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            });

            if (error) {
                throw new Error(error.message || 'Failed to create client');
            }

            if (!data?.success) {
                throw new Error(data?.error || 'Failed to create client');
            }

            Alert.alert(
                'הצלחה!',
                `הלקוח ${fullName} נוצר בהצלחה`,
                [{ text: 'אישור', onPress: () => router.back() }]
            );
        } catch (err: any) {
            console.error('[NewClient] Error:', err);
            Alert.alert('שגיאה', err.message || 'לא ניתן ליצור לקוח');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => router.back()}
                    disabled={loading}
                >
                    <X size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>לקוח חדש</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Required Fields */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>פרטים חובה</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>שם מלא *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="ישראל ישראלי"
                            placeholderTextColor="#94A3B8"
                            value={fullName}
                            onChangeText={setFullName}
                            editable={!loading}
                            textAlign="right"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>אימייל *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="israel@example.com"
                            placeholderTextColor="#94A3B8"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            editable={!loading}
                            textAlign="right"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>טלפון *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="050-1234567"
                            placeholderTextColor="#94A3B8"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            editable={!loading}
                            textAlign="right"
                        />
                    </View>

                    {/* Gender */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>מגדר *</Text>
                        <View style={styles.radioGroup}>
                            <TouchableOpacity
                                style={[styles.radioButton, gender === 'male' && styles.radioButtonSelected]}
                                onPress={() => setGender('male')}
                                disabled={loading}
                            >
                                <Text style={[styles.radioText, gender === 'male' && styles.radioTextSelected]}>זכר</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.radioButton, gender === 'female' && styles.radioButtonSelected]}
                                onPress={() => setGender('female')}
                                disabled={loading}
                            >
                                <Text style={[styles.radioText, gender === 'female' && styles.radioTextSelected]}>נקבה</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Role */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>תפקידים</Text>
                        <View style={styles.checkboxGroup}>
                            <TouchableOpacity
                                style={styles.checkbox}
                                onPress={() => {
                                    setIsAdmin(!isAdmin);
                                    if (!isAdmin) setRole('admin');
                                    else if (isCoach) setRole('coach');
                                    else setRole('user');
                                }}
                                disabled={loading}
                            >
                                <View style={[styles.checkboxBox, isAdmin && styles.checkboxBoxChecked]}>
                                    {isAdmin && <Check size={16} color="#fff" />}
                                </View>
                                <Text style={styles.checkboxLabel}>מנהל</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.checkbox}
                                onPress={() => {
                                    setIsCoach(!isCoach);
                                    if (!isCoach && !isAdmin) setRole('coach');
                                    else if (isAdmin) setRole('admin');
                                    else setRole('user');
                                }}
                                disabled={loading}
                            >
                                <View style={[styles.checkboxBox, isCoach && styles.checkboxBoxChecked]}>
                                    {isCoach && <Check size={16} color="#fff" />}
                                </View>
                                <Text style={styles.checkboxLabel}>מאמן</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>סיסמה זמנית *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="לפחות 6 תווים"
                            placeholderTextColor="#94A3B8"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            editable={!loading}
                            textAlign="right"
                        />
                        <Text style={styles.hint}>הלקוח יוכל לשנות את הסיסמה לאחר ההתחברות</Text>
                    </View>
                </View>

                {/* Optional Fields */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>פרטים נוספים (אופציונלי)</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>כתובת</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="רחוב 1, תל אביב"
                            placeholderTextColor="#94A3B8"
                            value={address}
                            onChangeText={setAddress}
                            editable={!loading}
                            textAlign="right"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>עיר</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="תל אביב"
                            placeholderTextColor="#94A3B8"
                            value={city}
                            onChangeText={setCity}
                            editable={!loading}
                            textAlign="right"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>ח.פ / ע.מ</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="123456789"
                            placeholderTextColor="#94A3B8"
                            value={taxId}
                            onChangeText={setTaxId}
                            keyboardType="number-pad"
                            editable={!loading}
                            textAlign="right"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>הערות</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="הערות נוספות..."
                            placeholderTextColor="#94A3B8"
                            value={remarks}
                            onChangeText={setRemarks}
                            multiline
                            numberOfLines={4}
                            editable={!loading}
                            textAlign="right"
                        />
                    </View>
                </View>

                {/* Plan Assignment */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>הקצאת תוכנית (אופציונלי)</Text>

                    {/* Plan Type Toggle */}
                    <View style={styles.planTypeToggle}>
                        <TouchableOpacity
                            style={[styles.planTypeBtn, planType === 'none' && styles.planTypeBtnSelected]}
                            onPress={() => { setPlanType('none'); setSelectedPlanId(null); }}
                            disabled={loading}
                        >
                            <Text style={[styles.planTypeBtnText, planType === 'none' && styles.planTypeBtnTextSelected]}>
                                ללא
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.planTypeBtn, planType === 'subscription' && styles.planTypeBtnSelected]}
                            onPress={() => { setPlanType('subscription'); setSelectedPlanId(null); }}
                            disabled={loading}
                        >
                            <CreditCard size={16} color={planType === 'subscription' ? '#fff' : '#64748B'} />
                            <Text style={[styles.planTypeBtnText, planType === 'subscription' && styles.planTypeBtnTextSelected]}>
                                מנוי
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.planTypeBtn, planType === 'ticket' && styles.planTypeBtnSelected]}
                            onPress={() => { setPlanType('ticket'); setSelectedPlanId(null); }}
                            disabled={loading}
                        >
                            <Ticket size={16} color={planType === 'ticket' ? '#fff' : '#64748B'} />
                            <Text style={[styles.planTypeBtnText, planType === 'ticket' && styles.planTypeBtnTextSelected]}>
                                כרטיסייה
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Plan Selection */}
                    {planType !== 'none' && (
                        <>
                            {plansLoading ? (
                                <Spinner size="sm" />
                            ) : filteredPlans.length === 0 ? (
                                <Text style={styles.noPlanText}>אין תוכניות זמינות</Text>
                            ) : (
                                filteredPlans.map(plan => (
                                    <TouchableOpacity
                                        key={plan.id}
                                        style={[
                                            styles.planOption,
                                            selectedPlanId === plan.id && styles.planOptionSelected,
                                        ]}
                                        onPress={() => setSelectedPlanId(plan.id)}
                                        disabled={loading}
                                    >
                                        <View style={styles.planOptionMain}>
                                            <Text style={[
                                                styles.planOptionName,
                                                selectedPlanId === plan.id && { color: Colors.primary },
                                            ]}>
                                                {plan.name}
                                            </Text>
                                            <Text style={styles.planOptionDetails}>
                                                {plan.type === 'ticket'
                                                    ? `${plan.total_sessions} אימונים • ${plan.validity_days} ימים`
                                                    : plan.sessions_per_week
                                                        ? `${plan.sessions_per_week} אימונים בשבוע`
                                                        : 'ללא הגבלה'}
                                            </Text>
                                        </View>
                                        <Text style={[
                                            styles.planOptionPrice,
                                            selectedPlanId === plan.id && { color: Colors.primary },
                                        ]}>
                                            ₪{plan.price}
                                        </Text>
                                    </TouchableOpacity>
                                ))
                            )}

                            {/* Subscription dates */}
                            {planType === 'subscription' && selectedPlanId && (
                                <View style={styles.dateInputs}>
                                    <View style={styles.dateInputGroup}>
                                        <Text style={styles.label}>תאריך התחלה</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={subscriptionStart}
                                            onChangeText={setSubscriptionStart}
                                            placeholder="YYYY-MM-DD"
                                            placeholderTextColor="#94A3B8"
                                            editable={!loading}
                                            textAlign="right"
                                        />
                                    </View>
                                    <View style={styles.dateInputGroup}>
                                        <Text style={styles.label}>תאריך סיום</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={subscriptionEnd}
                                            onChangeText={setSubscriptionEnd}
                                            placeholder="YYYY-MM-DD"
                                            placeholderTextColor="#94A3B8"
                                            editable={!loading}
                                            textAlign="right"
                                        />
                                    </View>
                                </View>
                            )}

                            {/* Ticket info */}
                            {planType === 'ticket' && selectedPlan && (
                                <View style={styles.ticketInfo}>
                                    <Text style={styles.ticketInfoText}>
                                        {selectedPlan.total_sessions} אימונים • תוקף {selectedPlan.validity_days} ימים מרגע ההקצאה
                                    </Text>
                                </View>
                            )}
                        </>
                    )}
                </View>
            </ScrollView>

            {/* Submit Button */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity
                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                    activeOpacity={0.7}
                >
                    {loading ? (
                        <Spinner size="sm" />
                    ) : (
                        <>
                            <Check size={20} color="#fff" />
                            <Text style={styles.submitButtonText}>צור לקוח</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    },
    closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontFamily: Fonts.black, color: '#0F172A' },
    scrollView: { flex: 1 },
    scrollContent: { padding: 20 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 20, fontFamily: Fonts.black, color: '#0F172A', marginBottom: 16, textAlign: 'center' },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 18, fontFamily: Fonts.bold, color: '#475569', marginBottom: 8, textAlign: 'left' },
    input: {
        backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
        paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#0F172A',
    },
    textArea: { height: 100, textAlignVertical: 'top', paddingTop: 14 },
    hint: { fontSize: 12, color: '#94A3B8', marginTop: 6, textAlign: 'right' },
    footer: {
        backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1F5F9',
        paddingHorizontal: 20, paddingTop: 16,borderTopLeftRadius: 30,borderTopRightRadius: 30,
    },
    submitButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 16, gap: 4,
    },
    submitButtonDisabled: { opacity: 0.6 },
    submitButtonText: { fontSize: 20, fontFamily: Fonts.bold, color: '#fff' },

    // Radio & Checkbox
    radioGroup: { flexDirection: 'row', gap: 12 },
    radioButton: {
        flex: 1, paddingVertical: 12, paddingHorizontal: 16,
        borderWidth: 2, borderColor: '#E2E8F0', borderRadius: 12, alignItems: 'center',
    },
    radioButtonSelected: { borderColor: Colors.primary },
    radioText: { fontSize: 15, fontFamily: Fonts.medium, color: '#64748B' },
    radioTextSelected: { color: Colors.primary },
    checkboxGroup: { flexDirection: 'row', gap: 16 },
    checkbox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    checkboxBox: {
        width: 24, height: 24, borderWidth: 2, borderColor: '#E2E8F0',
        borderRadius: 6, alignItems: 'center', justifyContent: 'center',
    },
    checkboxBoxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    checkboxLabel: { fontSize: 17, fontFamily: Fonts.medium, color: '#475569' },

    // Plan Type Toggle
    planTypeToggle: { flexDirection: 'row-reverse', gap: 10, marginBottom: 16 },
    planTypeBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 12, borderWidth: 2, borderColor: '#E2E8F0', borderRadius: 12, backgroundColor: '#fff',
    },
    planTypeBtnSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary },
    planTypeBtnText: { fontSize: 14, fontFamily: Fonts.bold, color: '#64748B' },
    planTypeBtnTextSelected: { color: '#fff' },

    // Plan Options
    planOption: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
        borderWidth: 2, borderColor: '#F1F5F9',
    },
    planOptionSelected: { borderColor: Colors.primary, backgroundColor: '#FCE4EC' },
    planOptionMain: { flex: 1 },
    planOptionName: { fontSize: 16, fontFamily: Fonts.bold, color: '#0F172A', textAlign: 'right' },
    planOptionDetails: { fontSize: 13, color: '#64748B', marginTop: 2, textAlign: 'right' },
    planOptionPrice: { fontSize: 16, fontFamily: Fonts.black, color: '#0F172A', marginLeft: 12 },
    noPlanText: { fontSize: 14, color: '#94A3B8', textAlign: 'center', paddingVertical: 16 },

    // Date inputs
    dateInputs: { flexDirection: 'row', gap: 12, marginTop: 8 },
    dateInputGroup: { flex: 1 },

    // Ticket info
    ticketInfo: {
        backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12, marginTop: 8,
        borderWidth: 1, borderColor: '#FEF3C7',
    },
    ticketInfoText: { fontSize: 13, fontFamily: Fonts.medium, color: '#92400E', textAlign: 'right' },
});

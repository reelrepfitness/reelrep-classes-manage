import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { supabase } from '@/constants/supabase';

interface CreateClientRequest {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    address?: string;
    city?: string;
    taxId?: string;
    remarks?: string;
    // NEW FIELDS
    gender: 'male' | 'female';
    role: 'user' | 'coach' | 'admin';
    isAdmin: boolean;
    isCoach: boolean;
    subscriptionType: 'basic' | 'premium' | 'vip' | 'unlimited' | 'cancelled';
    subscriptionStatus: 'active' | 'cancelled';
    subscriptionStart?: string;
    subscriptionEnd?: string;
    classesPerMonth: number;
}

export default function NewClientScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);

    // Form state
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [taxId, setTaxId] = useState('');
    const [remarks, setRemarks] = useState('');

    // NEW FIELDS
    const [gender, setGender] = useState<'male' | 'female' | ''>('');
    const [role, setRole] = useState<'user' | 'coach' | 'admin'>('user');
    const [isAdmin, setIsAdmin] = useState(false);
    const [isCoach, setIsCoach] = useState(false);
    const [subscriptionType, setSubscriptionType] = useState<'basic' | 'premium' | 'vip' | 'unlimited' | 'cancelled'>('cancelled');
    const [subscriptionStatus, setSubscriptionStatus] = useState<'active' | 'cancelled'>('cancelled');
    const [subscriptionStart, setSubscriptionStart] = useState('');
    const [subscriptionEnd, setSubscriptionEnd] = useState('');
    const [classesPerMonth, setClassesPerMonth] = useState(0);

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
        // NEW: Gender validation
        if (!gender) {
            Alert.alert('שגיאה', 'נא לבחור מגדר');
            return false;
        }
        // NEW: Subscription dates validation
        if (subscriptionType !== 'cancelled' && subscriptionStatus === 'active') {
            if (!subscriptionStart || !subscriptionEnd) {
                Alert.alert('שגיאה', 'נא למלא תאריכי מנוי עבור מנוי פעיל');
                return false;
            }
            const startDate = new Date(subscriptionStart);
            const endDate = new Date(subscriptionEnd);
            if (endDate <= startDate) {
                Alert.alert('שגיאה', 'תאריך סיום המנוי חייב להיות אחרי תאריך ההתחלה');
                return false;
            }
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
                // NEW FIELDS
                gender: gender as 'male' | 'female',
                role,
                isAdmin,
                isCoach,
                subscriptionType,
                subscriptionStatus,
                subscriptionStart: subscriptionStart || undefined,
                subscriptionEnd: subscriptionEnd || undefined,
                classesPerMonth,
            };

            // Get session for auth
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
                [
                    {
                        text: 'אישור',
                        onPress: () => router.back(),
                    },
                ]
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

                    {/* Gender Selector */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>מגדר *</Text>
                        <View style={styles.radioGroup}>
                            <TouchableOpacity
                                style={[styles.radioButton, gender === 'male' && styles.radioButtonSelected]}
                                onPress={() => setGender('male')}
                                disabled={loading}
                            >
                                <Text style={[styles.radioText, gender === 'male' && styles.radioTextSelected]}>
                                    זכר
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.radioButton, gender === 'female' && styles.radioButtonSelected]}
                                onPress={() => setGender('female')}
                                disabled={loading}
                            >
                                <Text style={[styles.radioText, gender === 'female' && styles.radioTextSelected]}>
                                    נקבה
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Role Selector */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>תפקידים</Text>
                        <View style={styles.checkboxGroup}>
                            <TouchableOpacity
                                style={styles.checkbox}
                                onPress={() => {
                                    setIsAdmin(!isAdmin);
                                    if (!isAdmin) {
                                        setRole('admin');
                                    } else if (isCoach) {
                                        setRole('coach');
                                    } else {
                                        setRole('user');
                                    }
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
                                    if (!isCoach && !isAdmin) {
                                        setRole('coach');
                                    } else if (isAdmin) {
                                        setRole('admin');
                                    } else {
                                        setRole('user');
                                    }
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

                {/* Subscription Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>פרטי מנוי (אופציונלי)</Text>

                    {/* Subscription Type */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>סוג מנוי</Text>
                        <View style={styles.subscriptionTypeContainer}>
                            {['cancelled', 'basic', 'premium', 'vip', 'unlimited'].map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[
                                        styles.subscriptionTypeButton,
                                        subscriptionType === type && styles.subscriptionTypeButtonSelected,
                                    ]}
                                    onPress={() => {
                                        setSubscriptionType(type as any);
                                        if (type === 'cancelled') {
                                            setSubscriptionStatus('cancelled');
                                        }
                                    }}
                                    disabled={loading}
                                >
                                    <Text
                                        style={[
                                            styles.subscriptionTypeText,
                                            subscriptionType === type && styles.subscriptionTypeTextSelected,
                                        ]}
                                    >
                                        {type === 'cancelled' ? 'ללא מנוי' :
                                         type === 'basic' ? 'בסיסי' :
                                         type === 'premium' ? 'פרימיום' :
                                         type === 'vip' ? 'VIP' : 'ללא הגבלה'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Conditional: Show subscription details only if not cancelled */}
                    {subscriptionType !== 'cancelled' && (
                        <>
                            {/* Subscription Status */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>סטטוס מנוי</Text>
                                <View style={styles.radioGroup}>
                                    <TouchableOpacity
                                        style={[styles.radioButton, subscriptionStatus === 'active' && styles.radioButtonSelected]}
                                        onPress={() => setSubscriptionStatus('active')}
                                        disabled={loading}
                                    >
                                        <Text style={[styles.radioText, subscriptionStatus === 'active' && styles.radioTextSelected]}>
                                            פעיל
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.radioButton, subscriptionStatus === 'cancelled' && styles.radioButtonSelected]}
                                        onPress={() => setSubscriptionStatus('cancelled')}
                                        disabled={loading}
                                    >
                                        <Text style={[styles.radioText, subscriptionStatus === 'cancelled' && styles.radioTextSelected]}>
                                            בוטל
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Subscription Start Date */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>תאריך התחלה</Text>
                                <TextInput
                                    style={styles.input}
                                    value={subscriptionStart}
                                    onChangeText={setSubscriptionStart}
                                    placeholder="YYYY-MM-DD (לדוגמא: 2025-01-15)"
                                    placeholderTextColor="#94A3B8"
                                    editable={!loading}
                                    textAlign="right"
                                />
                            </View>

                            {/* Subscription End Date */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>תאריך סיום</Text>
                                <TextInput
                                    style={styles.input}
                                    value={subscriptionEnd}
                                    onChangeText={setSubscriptionEnd}
                                    placeholder="YYYY-MM-DD (לדוגמא: 2025-07-15)"
                                    placeholderTextColor="#94A3B8"
                                    editable={!loading}
                                    textAlign="right"
                                />
                            </View>

                            {/* Classes Per Month */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>מספר אימונים בחודש</Text>
                                <TextInput
                                    style={styles.input}
                                    value={classesPerMonth > 0 ? classesPerMonth.toString() : ''}
                                    onChangeText={(text) => setClassesPerMonth(Number(text) || 0)}
                                    keyboardType="number-pad"
                                    placeholder="8"
                                    placeholderTextColor="#94A3B8"
                                    editable={!loading}
                                    textAlign="right"
                                />
                            </View>
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
                        <ActivityIndicator color="#fff" />
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
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    closeButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 16,
        textAlign: 'right',
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 8,
        textAlign: 'right',
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#0F172A',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
        paddingTop: 14,
    },
    hint: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 6,
        textAlign: 'right',
    },
    footer: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    submitButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        borderRadius: 16,
        paddingVertical: 16,
        gap: 8,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#fff',
    },
    // NEW STYLES
    radioGroup: {
        flexDirection: 'row-reverse',
        gap: 12,
    },
    radioButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        alignItems: 'center',
    },
    radioButtonSelected: {
        borderColor: Colors.primary,
        backgroundColor: '#FCE4EC',
    },
    radioText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#64748B',
    },
    radioTextSelected: {
        color: Colors.primary,
    },
    checkboxGroup: {
        flexDirection: 'row-reverse',
        gap: 16,
    },
    checkbox: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
    },
    checkboxBox: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxBoxChecked: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    checkboxLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#475569',
    },
    subscriptionTypeContainer: {
        flexDirection: 'column',
        gap: 8,
    },
    subscriptionTypeButton: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    subscriptionTypeButtonSelected: {
        borderColor: Colors.primary,
        backgroundColor: '#FCE4EC',
    },
    subscriptionTypeText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#64748B',
        textAlign: 'center',
    },
    subscriptionTypeTextSelected: {
        color: Colors.primary,
    },
});

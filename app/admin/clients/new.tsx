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
});

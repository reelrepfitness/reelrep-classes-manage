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
import { CRMManager } from '@/lib/services/crm-manager';
import { LeadSource } from '@/constants/crm-types';

const SOURCE_OPTIONS: { value: LeadSource; label: string }[] = [
    { value: 'direct', label: 'הגיע ישירות' },
    { value: 'referral', label: 'חבר מביא חבר' },
    { value: 'instagram', label: 'אינסטגרם' },
    { value: 'facebook', label: 'פייסבוק' },
    { value: 'google', label: 'גוגל' },
    { value: 'website', label: 'אתר' },
    { value: 'whatsapp', label: 'וואטסאפ' },
    { value: 'other', label: 'אחר' },
];

export default function NewLeadScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [source, setSource] = useState<LeadSource>('direct');
    const [notes, setNotes] = useState('');

    const handleSubmit = async () => {
        if (!name.trim()) {
            Alert.alert('שגיאה', 'נא להזין שם');
            return;
        }
        if (!phone.trim()) {
            Alert.alert('שגיאה', 'נא להזין מספר טלפון');
            return;
        }

        setLoading(true);
        try {
            const result = await CRMManager.createLead({
                name: name.trim(),
                phone: phone.trim(),
                email: email.trim() || undefined,
                source,
                notes: notes.trim() || undefined,
            });

            if (result.success) {
                Alert.alert(
                    'הצלחה!',
                    `הליד ${name} נוצר בהצלחה`,
                    [{ text: 'אישור', onPress: () => router.back() }]
                );
            } else {
                Alert.alert('שגיאה', result.error || 'לא ניתן ליצור ליד');
            }
        } catch (err: any) {
            console.error('[NewLead] Error:', err);
            Alert.alert('שגיאה', err.message || 'לא ניתן ליצור ליד');
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
                <Text style={styles.headerTitle}>ליד חדש</Text>
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
                        <Text style={styles.label}>שם *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="ישראל ישראלי"
                            placeholderTextColor="#94A3B8"
                            value={name}
                            onChangeText={setName}
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
                </View>

                {/* Optional Fields */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>פרטים נוספים</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>אימייל</Text>
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

                    {/* Source Selector */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>מקור</Text>
                        <View style={styles.sourceGrid}>
                            {SOURCE_OPTIONS.map((opt) => (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[
                                        styles.sourceButton,
                                        source === opt.value && styles.sourceButtonSelected,
                                    ]}
                                    onPress={() => setSource(opt.value)}
                                    disabled={loading}
                                >
                                    <Text
                                        style={[
                                            styles.sourceText,
                                            source === opt.value && styles.sourceTextSelected,
                                        ]}
                                    >
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>הערות</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="הערות נוספות..."
                            placeholderTextColor="#94A3B8"
                            value={notes}
                            onChangeText={setNotes}
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
                            <Text style={styles.submitButtonText}>צור ליד</Text>
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
        flexDirection: 'row',
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
        fontSize: 18,
        fontWeight: '900',
        color: '#0F172A',
        marginBottom: 16,
        textAlign: 'left',
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '900',
        color: '#475569',
        marginBottom: 8,
        textAlign: 'left',
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
    sourceGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    sourceButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        backgroundColor: '#fff',
    },
    sourceButtonSelected: {
        borderColor: Colors.primary,
        backgroundColor: '#FCE4EC',
    },
    sourceText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    sourceTextSelected: {
        color: Colors.primary,
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

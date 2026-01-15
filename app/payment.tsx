import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { XCircle } from 'lucide-react-native';
import { supabase } from '@/constants/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentWebView } from '@/components/shop/PaymentWebView';

export default function PaymentScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { refreshUser } = useAuth();
    const { formUrl, invoiceId } = useLocalSearchParams<{ formUrl: string; invoiceId: string }>();

    // Polling לסטטוס התשלום
    useEffect(() => {
        if (!invoiceId) return;

        console.log('[Payment] Starting polling for invoice:', invoiceId);

        // Poll כל 5 שניות למשך דקה
        let pollCount = 0;
        const maxPolls = 12; // 12 * 5 = 60 שניות

        const interval = setInterval(async () => {
            pollCount++;
            console.log('[Payment] Polling attempt:', pollCount);

            try {
                const { data, error } = await supabase
                    .from('invoices')
                    .select('payment_status')
                    .eq('id', invoiceId)
                    .single();

                if (error) {
                    console.error('[Payment] Polling error:', error);
                    return;
                }

                console.log('[Payment] Invoice status:', data?.payment_status);

                if (data?.payment_status === 'paid') {
                    clearInterval(interval);

                    // רענון נתוני המשתמש
                    console.log('[Payment] Refreshing user data...');
                    if (refreshUser) {
                        await refreshUser();
                    }

                    // ניווט למסך הצלחה
                    router.replace(`/payment-success?invoiceId=${invoiceId}`);
                } else if (data?.payment_status === 'failed') {
                    clearInterval(interval);
                    Alert.alert('תשלום נכשל', 'מצטערים, התשלום לא עבר. אנא נסה שוב.');
                }

                // עצירת polling לאחר 60 שניות
                if (pollCount >= maxPolls) {
                    clearInterval(interval);
                    console.log('[Payment] Polling stopped after max attempts');
                }
            } catch (err) {
                console.error('[Payment] Polling exception:', err);
            }
        }, 5000);

        return () => {
            clearInterval(interval);
        };
    }, [invoiceId, refreshUser, router]);

    const handleNavigationStateChange = (navState: any) => {
        // Check if user reached success page
        if (navState.url.includes('payment-success') || navState.url.includes('success')) {
            console.log('[Payment] Navigation detected success URL');
            router.replace(`/payment-success?invoiceId=${invoiceId}`);
        }
    };

    if (!formUrl) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
                <View style={styles.errorContainer}>
                    <XCircle size={64} color="#EF4444" />
                    <Text style={styles.errorText}>שגיאה: לא נמצא קישור לתשלום</Text>
                </View>
            </View>
        );
    }

    return (
        <>
            <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <PaymentWebView
                    formUrl={formUrl}
                    onNavigationStateChange={handleNavigationStateChange}
                    onGoBack={() => router.back()}
                />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        gap: 16,
    },
    errorText: {
        fontSize: 16,
        color: '#EF4444',
        textAlign: 'center',
        marginTop: 16,
    },
});

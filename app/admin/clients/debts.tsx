import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, DollarSign } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/constants/supabase';
import Colors from '@/constants/colors';

export default function DebtsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const { data: clients = [], isLoading } = useQuery({
        queryKey: ['admin-debts'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select(`
          id,
          name,
          full_name,
          email,
          user_subscriptions(
            id,
            outstanding_balance,
            subscription_plans(name)
          )
        `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[Admin] Error fetching debts:', error);
                return [];
            }

            // Filter clients with outstanding balance
            const filtered = (data || []).filter((client: any) => {
                return client.user_subscriptions?.some((sub: any) =>
                    (sub.outstanding_balance || 0) > 0
                );
            });

            // Sort by outstanding balance descending
            return filtered.sort((a: any, b: any) => {
                const aBalance = a.user_subscriptions?.[0]?.outstanding_balance || 0;
                const bBalance = b.user_subscriptions?.[0]?.outstanding_balance || 0;
                return bBalance - aBalance;
            });
        },
    });

    const totalDebt = useMemo(() => {
        if (!clients || !Array.isArray(clients)) return 0;
        return clients.reduce((sum, client: any) => {
            const balance = client.user_subscriptions?.[0]?.outstanding_balance || 0;
            return sum + balance;
        }, 0);
    }, [clients]);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronRight size={24} color={Colors.text} />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>חייבים</Text>
                    <Text style={styles.subtitle}>
                        סה"כ: ₪{totalDebt.toFixed(0)} • {clients.length} לקוחות
                    </Text>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {(Array.isArray(clients) ? clients : []).map((client: any) => {
                    const subscription = client.user_subscriptions?.[0];
                    const balance = subscription?.outstanding_balance || 0;
                    const plan = subscription?.subscription_plans;

                    return (
                        <View key={client.id} style={styles.clientCard}>
                            <View style={styles.clientInfo}>
                                <View style={styles.clientHeader}>
                                    <View style={styles.debtBadge}>
                                        <DollarSign size={16} color={Colors.error} />
                                        <Text style={styles.debtAmount}>₪{balance.toFixed(0)}</Text>
                                    </View>
                                    <Text style={styles.clientName}>{client.full_name || client.name}</Text>
                                </View>

                                <Text style={styles.clientEmail}>{client.email}</Text>

                                {plan && <Text style={styles.planName}>{plan.name}</Text>}
                            </View>
                        </View>
                    );
                })}

                {clients.length === 0 && !isLoading && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>אין חובות</Text>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backButton: {
        padding: 8,
        marginLeft: 8,
    },
    headerContent: {
        flex: 1,
        alignItems: 'flex-start',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.text,
        textAlign: 'right',
        writingDirection: 'rtl',
    },
    subtitle: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.textSecondary,
        textAlign: 'right',
        writingDirection: 'rtl',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    clientCard: {
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        borderLeftWidth: 4,
        borderLeftColor: Colors.error,
    },
    clientInfo: {
        alignItems: 'flex-end',
    },
    clientHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 4,
        width: '100%',
        justifyContent: 'flex-end',
    },
    debtBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: Colors.error + '20',
    },
    debtAmount: {
        fontSize: 14,
        fontWeight: '800',
        color: Colors.error,
    },
    clientName: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.text,
        textAlign: 'right',
        writingDirection: 'rtl',
    },
    clientEmail: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.textSecondary,
        textAlign: 'right',
        marginBottom: 4,
    },
    planName: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: Colors.textSecondary,
    },
});

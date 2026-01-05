import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Pause } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/constants/supabase';
import Colors from '@/constants/colors';

export default function FrozenPlansScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const { data: clients = [], isLoading } = useQuery({
        queryKey: ['admin-frozen-plans'],
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
            freeze_reason,
            freeze_start_date,
            freeze_end_date,
            plan_status,
            subscription_plans(name)
          )
        `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[Admin] Error fetching frozen plans:', error);
                return [];
            }

            // Filter clients with frozen plans
            const filtered = (data || []).filter((client: any) => {
                return client.user_subscriptions?.some((sub: any) =>
                    sub.plan_status === 'frozen'
                );
            });

            // Sort by freeze start date descending
            return filtered.sort((a: any, b: any) => {
                const aDate = new Date(a.user_subscriptions?.[0]?.freeze_start_date || 0);
                const bDate = new Date(b.user_subscriptions?.[0]?.freeze_start_date || 0);
                return bDate.getTime() - aDate.getTime();
            });
        },
    });

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color={Colors.text} />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>הקפאות</Text>
                    <Text style={styles.subtitle}>{clients.length} מנויים מוקפאים</Text>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {(clients || []).map((client: any) => {
                    const subscription = client.user_subscriptions?.[0];
                    const plan = subscription?.subscription_plans;
                    const freezeStart = subscription?.freeze_start_date
                        ? new Date(subscription.freeze_start_date).toLocaleDateString('he-IL')
                        : '';
                    const freezeEnd = subscription?.freeze_end_date
                        ? new Date(subscription.freeze_end_date).toLocaleDateString('he-IL')
                        : '';

                    return (
                        <View key={client.id} style={styles.clientCard}>
                            <View style={styles.clientInfo}>
                                <View style={styles.clientHeader}>
                                    <View style={styles.frozenBadge}>
                                        <Pause size={14} color='#06b6d4' />
                                        <Text style={styles.frozenText}>מוקפא</Text>
                                    </View>
                                    <Text style={styles.clientName}>{client.full_name || client.name}</Text>
                                </View>

                                <Text style={styles.clientEmail}>{client.email}</Text>

                                {plan && <Text style={styles.planName}>{plan.name}</Text>}

                                {subscription?.freeze_reason && (
                                    <Text style={styles.freezeReason}>סיבה: {subscription.freeze_reason}</Text>
                                )}

                                {freezeStart && freezeEnd && (
                                    <Text style={styles.freezeDates}>
                                        {freezeStart} - {freezeEnd}
                                    </Text>
                                )}
                            </View>
                        </View>
                    );
                })}

                {clients.length === 0 && !isLoading && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>אין מנויים מוקפאים</Text>
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
        alignItems: 'flex-end',
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
        borderLeftColor: '#06b6d4',
    },
    clientInfo: {
        alignItems: 'flex-end',
    },
    clientHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
        width: '100%',
        justifyContent: 'flex-end',
    },
    frozenBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: '#06b6d4' + '20',
    },
    frozenText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#06b6d4',
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
        marginBottom: 4,
    },
    freezeReason: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.textSecondary,
        textAlign: 'right',
        writingDirection: 'rtl',
        marginBottom: 2,
    },
    freezeDates: {
        fontSize: 12,
        fontWeight: '500',
        color: Colors.textSecondary,
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

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Ticket, CreditCard } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/constants/supabase';
import Colors from '@/constants/colors';

export default function NeedsAttentionScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const { data: clients = [], isLoading } = useQuery({
        queryKey: ['admin-needs-attention'],
        queryFn: async () => {
            const threeDaysFromNow = new Date();
            threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

            const { data, error } = await supabase
                .from('profiles')
                .select(`
          id,
          name,
          full_name,
          email,
          user_subscriptions(
            id,
            subscription_id,
            is_active,
            end_date,
            sessions_remaining,
            subscription_plans(name, type)
          )
        `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[Admin] Error fetching needs attention:', error);
                return [];
            }

            // Filter clients with active subscriptions expiring soon
            const filtered = (data || []).filter((client: any) => {
                return client.user_subscriptions?.some((sub: any) => {
                    if (!sub.is_active) return false;
                    const endDate = new Date(sub.end_date);
                    return endDate <= threeDaysFromNow;
                });
            });

            // Sort by end date
            return filtered.sort((a: any, b: any) => {
                const aDate = new Date(a.user_subscriptions?.[0]?.end_date || 0);
                const bDate = new Date(b.user_subscriptions?.[0]?.end_date || 0);
                return aDate.getTime() - bDate.getTime();
            });
        },
    });

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronRight size={24} color={Colors.text} />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>דורשים טיפול</Text>
                    <Text style={styles.subtitle}>{clients.length} לקוחות</Text>
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
                    const isTicket = plan?.type === 'ticket';
                    const endDate = new Date(subscription?.end_date);
                    const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                    return (
                        <View key={client.id} style={styles.clientCard}>
                            <View style={styles.clientInfo}>
                                <View style={styles.clientHeader}>
                                    <View
                                        style={[
                                            styles.typeBadge,
                                            { backgroundColor: isTicket ? Colors.accent + '20' : Colors.primary + '20' },
                                        ]}
                                    >
                                        {isTicket ? (
                                            <Ticket size={14} color={Colors.accent} />
                                        ) : (
                                            <CreditCard size={14} color={Colors.primary} />
                                        )}
                                        <Text
                                            style={[
                                                styles.typeText,
                                                { color: isTicket ? Colors.accent : Colors.primary },
                                            ]}
                                        >
                                            {isTicket ? 'כרטיסייה' : 'מנוי'}
                                        </Text>
                                    </View>
                                    <Text style={styles.clientName}>{client.full_name || client.name}</Text>
                                </View>

                                <Text style={styles.clientEmail}>{client.email}</Text>

                                {plan && (
                                    <View style={styles.planInfo}>
                                        <Text style={styles.planName}>{plan.name}</Text>
                                        <Text
                                            style={[
                                                styles.daysLeft,
                                                { color: daysLeft <= 1 ? Colors.error : '#f59e0b' },
                                            ]}
                                        >
                                            {daysLeft <= 0
                                                ? 'פג תוקף'
                                                : daysLeft === 1
                                                    ? 'יום אחד נותר'
                                                    : `${daysLeft} ימים נותרו`}
                                        </Text>
                                    </View>
                                )}

                                {isTicket && subscription?.sessions_remaining !== undefined && (
                                    <Text style={styles.sessionsRemaining}>
                                        {subscription.sessions_remaining} אימונים נותרו
                                    </Text>
                                )}
                            </View>
                        </View>
                    );
                })}

                {clients.length === 0 && !isLoading && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>אין לקוחות הדורשים טיפול</Text>
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
        textAlign: 'left',
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
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    typeText: {
        fontSize: 12,
        fontWeight: '700',
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
        marginBottom: 8,
    },
    planInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    planName: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
    },
    daysLeft: {
        fontSize: 13,
        fontWeight: '700',
    },
    sessionsRemaining: {
        fontSize: 12,
        fontWeight: '600',
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

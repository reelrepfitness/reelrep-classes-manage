import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Search } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/constants/supabase';
import Colors from '@/constants/colors';

export default function ActiveClientsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [showAll, setShowAll] = useState(false);

    const { data: clients = [], isLoading } = useQuery({
        queryKey: ['admin-clients', showAll],
        queryFn: async () => {
            let query = supabase
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
            start_date,
            end_date,
            subscription_plans(name, type)
          )
        `)
                .order('created_at', { ascending: false });

            const { data, error } = await query;

            if (error) {
                console.error('[Admin] Error fetching clients:', error);
                return [];
            }

            // Filter by active subscriptions if needed
            if (!showAll && data) {
                return data.filter((client: any) =>
                    client.user_subscriptions?.some((sub: any) => sub.is_active)
                );
            }

            return data || [];
        },
    });

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color={Colors.text} />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>רשימת לקוחות</Text>
                    <Text style={styles.subtitle}>
                        {clients.length} {showAll ? 'לקוחות' : 'מנויים פעילים'}
                    </Text>
                </View>
            </View>

            {/* Toggle for All/Active */}
            <View style={styles.toggleContainer}>
                <Switch
                    value={showAll}
                    onValueChange={setShowAll}
                    trackColor={{ false: Colors.border, true: Colors.primary }}
                    thumbColor={Colors.card}
                />
                <Text style={styles.toggleLabel}>הצג את כל הלקוחות (כולל לשעבר)</Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {(clients || []).map((client: any) => {
                    const subscription = client.user_subscriptions?.[0];
                    const plan = subscription?.subscription_plans;
                    const isActive = subscription?.is_active;

                    return (
                        <View key={client.id} style={styles.clientCard}>
                            <View style={styles.clientInfo}>
                                <Text style={styles.clientName}>{client.full_name || client.name}</Text>
                                <Text style={styles.clientEmail}>{client.email}</Text>
                                {plan && (
                                    <View style={styles.planInfo}>
                                        <View
                                            style={[
                                                styles.statusBadge,
                                                { backgroundColor: isActive ? Colors.success + '20' : Colors.border },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.statusText,
                                                    { color: isActive ? Colors.success : Colors.textSecondary },
                                                ]}
                                            >
                                                {isActive ? 'פעיל' : 'לא פעיל'}
                                            </Text>
                                        </View>
                                        <Text style={styles.planName}>{plan.name}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    );
                })}

                {clients.length === 0 && !isLoading && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>אין לקוחות להצגה</Text>
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
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 12,
    },
    toggleLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
        textAlign: 'right',
        writingDirection: 'rtl',
        flex: 1,
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
    clientName: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.text,
        textAlign: 'right',
        writingDirection: 'rtl',
        marginBottom: 4,
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
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
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

import React, { useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Users, ChevronRight } from 'lucide-react-native';
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
            plan_id,
            is_active,
            start_date,
            end_date,
            plans:plan_id(name, category)
          )
        `)
                .order('created_at', { ascending: false });

            const { data, error } = await query;
            if (error) return [];

            if (!showAll && data) {
                return data.filter((client: any) =>
                    client.user_subscriptions?.some((sub: any) => sub.is_active)
                );
            }
            return data || [];
        },
    });

    return (
        <View style={styles.container}>
            {/* Header Area */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronRight size={24} color="#000" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>רשימת לקוחות</Text>
                    <Text style={styles.headerSubtitle}>
                        {clients.length} {showAll ? 'לקוחות' : 'מנויים פעילים'}
                    </Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Toggle Section */}
            <View style={styles.toggleRow}>
                <View style={styles.toggleTextContainer}>
                    <Text style={styles.toggleLabel}>הצג את כל הלקוחות</Text>
                    <Text style={styles.toggleSublabel}>כולל מנויים שהסתיימו</Text>
                </View>
                <Switch
                    value={showAll}
                    onValueChange={setShowAll}
                    trackColor={{ false: '#E2E8F0', true: Colors.primary }}
                    thumbColor="#fff"
                />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
                showsVerticalScrollIndicator={false}
            >
                {isLoading ? (
                    <View style={styles.centered}>
                        <Spinner size="sm" />
                    </View>
                ) : (clients || []).map((client: any) => {
                    const subscription = client.user_subscriptions?.[0];
                    const plan = (subscription?.plans as any);
                    const isActive = subscription?.is_active;

                    return (
                        <TouchableOpacity
                            key={client.id}
                            style={styles.clientCard}
                            onPress={() => router.push(`/admin/clients/${client.id}`)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.cardHeader}>
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarText}>{(client.full_name || client.name)?.charAt(0) || '?'}</Text>
                                </View>
                                <View style={styles.clientInfo}>
                                    <Text style={styles.clientName}>{client.full_name || client.name}</Text>
                                    <Text style={styles.clientEmail}>{client.email}</Text>
                                </View>
                            </View>

                            <View style={styles.cardFooter}>
                                <View style={styles.planBadge}>
                                    <View style={[styles.statusDot, { backgroundColor: isActive ? '#22C55E' : '#94A3B8' }]} />
                                    <Text style={styles.planName}>{plan?.name || 'ללא מנוי'}</Text>
                                </View>
                                <ChevronLeft size={18} color="#CBD5E1" />
                            </View>
                        </TouchableOpacity>
                    );
                })}

                {clients.length === 0 && !isLoading && (
                    <View style={styles.emptyState}>
                        <Users size={40} color="#E2E8F0" />
                        <Text style={styles.emptyText}>אין לקוחות להצגה</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#fff',
    },
    backButton: {
        padding: 4,
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0F172A',
    },
    headerSubtitle: {
        fontSize: 15,
        color: '#64748B',
        fontWeight: '600',
        marginTop: 2,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: '#F8FAFC',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    toggleTextContainer: {
        alignItems: 'flex-start',
    },
    toggleLabel: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
    },
    toggleSublabel: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 2,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    clientCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.primary,
    },
    clientInfo: {
        flex: 1,
        marginLeft: 10,
        alignItems: 'flex-start',
    },
    clientName: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 2,
    },
    clientEmail: {
        fontSize: 14,
        color: '#64748B',
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F8FAFC',
    },
    planBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    planName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#475569',
    },
    centered: {
        padding: 40,
        alignItems: 'center',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
        gap: 12,
    },
    emptyText: {
        fontSize: 15,
        color: '#94A3B8',
        fontWeight: '600',
    },
});

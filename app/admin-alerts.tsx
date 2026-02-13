import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    RefreshControl,
    Platform,
    StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import {
    AlertTriangle,
    TrendingUp,
    Info,
    XCircle,
    CreditCard,
    UserPlus,
    Bell,
    CheckCircle2,
    AlertOctagon,
    Clock
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/constants/supabase';
// Removed date-fns imports to avoid extra dependency
// import { format } from 'date-fns';
// import { he } from 'date-fns/locale';

// Simple date formatter for HH:mm dd/MM
const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${hours}:${minutes} ${day}/${month}`;
};

// --- Types ---

type AlertType = 'urgent' | 'business' | 'system';

interface AlertItem {
    id: string;
    type: AlertType;
    subtype: 'no_show' | 'risk_client' | 'lead_no_response' | 'new_lead' | 'new_subscription' | 'conversion' | 'system_msg';
    title: string;
    body: string;
    timestamp: string;
    data?: any; // To store raw data for navigation if needed
}

// --- Icons Mapping ---

const getAlertIcon = (subtype: AlertItem['subtype'], color: string) => {
    const size = 24;
    switch (subtype) {
        case 'no_show': return <XCircle size={size} color={color} />;
        case 'risk_client': return <AlertOctagon size={size} color={color} />;
        case 'lead_no_response': return <Clock size={size} color={color} />;
        case 'new_lead': return <UserPlus size={size} color={color} />;
        case 'new_subscription': return <CreditCard size={size} color={color} />;
        case 'conversion': return <CheckCircle2 size={size} color={color} />;
        case 'system_msg': return <Info size={size} color={color} />;
        default: return <Bell size={size} color={color} />;
    }
};

const TAB_COLORS = {
    urgent: '#FF4D4D',   // Red
    business: '#10B981', // Green
    system: '#3B82F6',   // Blue
};

// --- Component ---

export default function AdminAlertsScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<AlertType>('urgent');
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAlerts = useCallback(async () => {
        try {
            setLoading(true);

            // 1. Fetch Urgent Alerts
            // 1a. Recent No-Shows (Last 7 days)
            const { data: noShows } = await supabase
                .from('class_bookings')
                .select(`
          id,
          created_at,
          class:classes(title, date, time),
          user:profiles(name, phone)
        `)
                .eq('status', 'no_show')
                .order('created_at', { ascending: false })
                .limit(10);

            // 1b. Leads No Response (Mock logic: status='no_response')
            const { data: noResponseLeads } = await supabase
                .from('leads')
                .select('id, name, created_at, phone')
                .eq('status', 'no_response')
                .limit(10);

            // 2. Fetch Business Alerts
            // 2a. New Leads (Last 7 days)
            const { data: newLeads } = await supabase
                .from('leads')
                .select('id, name, source, created_at')
                .eq('status', 'new')
                .order('created_at', { ascending: false })
                .limit(10);

            // 2b. New Subscriptions (Active, created recently)
            const { data: newSubs } = await supabase
                .from('user_subscriptions')
                .select(`
          id,
          created_at,
          user:profiles(name),
          plan:subscription_plans(name)
        `)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(10);

            // --- Map Data to AlertItems ---

            const urgentItems: AlertItem[] = [
                ...(noShows?.map((booking: any) => {
                    const userName = Array.isArray(booking.user) ? booking.user[0]?.name : booking.user?.name;
                    const classTitle = Array.isArray(booking.class) ? booking.class[0]?.title : booking.class?.title;

                    return {
                        id: `ns-${booking.id}`,
                        type: 'urgent' as AlertType,
                        subtype: 'no_show' as const,
                        title: 'החמצת אימון',
                        body: `${userName || 'מתאמן'} לא הגיע לשיעור ${classTitle || 'אימון'}`,
                        timestamp: booking.created_at,
                    };
                }) || []),
                ...(noResponseLeads?.map(lead => ({
                    id: `nr-${lead.id}`,
                    type: 'urgent' as AlertType,
                    subtype: 'lead_no_response' as const,
                    title: 'ליד ללא מענה',
                    body: `${lead.name} לא עונה להודעות - נדרש טיפול מיידי`,
                    timestamp: lead.created_at,
                })) || [])
            ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            const businessItems: AlertItem[] = [
                ...(newLeads?.map(lead => ({
                    id: `nl-${lead.id}`,
                    type: 'business' as AlertType,
                    subtype: 'new_lead' as const,
                    title: 'ליד חדש!',
                    body: `${lead.name} הצטרף דרך ${lead.source || 'חיפוש'}`,
                    timestamp: lead.created_at,
                })) || []),
                ...(newSubs?.map((sub: any) => {
                    const userName = Array.isArray(sub.user) ? sub.user[0]?.name : sub.user?.name;
                    const planName = Array.isArray(sub.plan) ? sub.plan[0]?.name : sub.plan?.name;

                    return {
                        id: `ns-${sub.id}`,
                        type: 'business' as AlertType,
                        subtype: 'new_subscription' as const,
                        title: 'מנוי חדש',
                        body: `${userName || 'לקוח'} רכש ${planName || 'מנוי'}`,
                        timestamp: sub.created_at,
                    };
                }) || [])
            ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            // Combine all
            setAlerts([...urgentItems, ...businessItems]);

        } catch (error) {
            console.error('Error fetching alerts:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchAlerts();
    }, [fetchAlerts]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchAlerts();
    };

    // Filter based on active tab
    const filteredAlerts = alerts.filter(a => a.type === activeTab);

    // Stats for badges
    const getCount = (type: AlertType) => alerts.filter(a => a.type === type).length;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Image
                        source={require('../assets/images/icon.png')}
                        style={styles.headerIcon}
                    />
                </View>
                <Text style={styles.headerTitle}>מרכז התראות</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* --- Tabs --- */}
            <View style={styles.tabsContainer}>
                {(['urgent', 'business'] as AlertType[]).map((tab) => {
                    const isActive = activeTab === tab;
                    const count = getCount(tab);
                    let label = '';
                    if (tab === 'urgent') label = 'דחוף';
                    if (tab === 'business') label = 'עסקי';

                    return (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            style={[
                                styles.tabButton,
                                isActive && styles.activeTabButton,
                                { borderColor: isActive ? TAB_COLORS[tab] : 'transparent' }
                            ]}
                        >
                            <Text style={[styles.tabText, isActive && { color: TAB_COLORS[tab], fontWeight: '700' }]}>
                                {label}
                            </Text>
                            {count > 0 && (
                                <View style={[styles.badge, { backgroundColor: isActive ? TAB_COLORS[tab] : '#E5E7EB' }]}>
                                    <Text style={[styles.badgeText, isActive && { color: 'white' }]}>{count}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* --- Content --- */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FF3366" />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {filteredAlerts.length === 0 ? (
                        <View style={styles.emptyState}>
                            <CheckCircle2 size={48} color="#D1D5DB" />
                            <Text style={styles.emptyText}>אין התראות חדשות</Text>
                        </View>
                    ) : (
                        filteredAlerts.map((item) => (
                            <View key={item.id} style={styles.card}>
                                {/* Color Strip */}
                                <View style={[styles.cardStrip, { backgroundColor: TAB_COLORS[item.type] }]} />

                                {/* Content */}
                                <View style={styles.cardContent}>
                                    <View style={styles.cardHeader}>
                                        <View style={styles.iconContainer}>
                                            {getAlertIcon(item.subtype, TAB_COLORS[item.type])}
                                        </View>
                                        <View style={styles.textContainer}>
                                            <Text style={styles.cardTitle}>{item.title}</Text>
                                            <Text style={styles.timestamp}>
                                                {item.timestamp ? formatDate(item.timestamp) : ''}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={styles.cardBody}>{item.body}</Text>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F8FA',
        direction: 'rtl', // Ensure layout is RTL aware where possible, though direct flex-direction row-reverse works best
    },
    header: {
        flexDirection: 'row-reverse', // RTL Header
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        backgroundColor: '#F7F8FA',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
    },
    tabsContainer: {
        flexDirection: 'row-reverse', // RTL Tabs
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        marginHorizontal: 4,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: 'transparent',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    activeTabButton: {
        backgroundColor: '#FFFFFF',
        // Border color is set dynamically
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
        marginRight: 6,
    },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        minWidth: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6B7280',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        gap: 12,
    },
    emptyText: {
        fontSize: 16,
        color: '#9CA3AF',
    },
    card: {
        flexDirection: 'row-reverse', // RTL Card Layout
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 12,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    cardStrip: {
        width: 6,
        height: '100%',
    },
    cardContent: {
        flex: 1,
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row-reverse', // RTL Header
        alignItems: 'center',
        marginBottom: 8,
    },
    iconContainer: {
        marginLeft: 12,
    },
    textContainer: {
        flex: 1,
        alignItems: 'flex-end', // RTL Text Align
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    timestamp: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    cardBody: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
        textAlign: 'right', // RTL Body Text
    },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
    Platform,
    ActivityIndicator,
    TextInput,
    RefreshControl
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    ChevronRight,
    Plus,
    Minus,
    Calendar,
    Snowflake,
    Trash2,
    MessageCircle,
    Phone,
    Save,
    Clock,
    CheckCircle2,
    AlertCircle,
    XCircle
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '@/constants/supabase';

// --- Types ---
interface ClientData {
    id: string;
    full_name: string;
    phone: string;
    avatar_url: string;
    status: 'active' | 'frozen' | 'inactive';
    highestAchievement?: {
        id: string;
        name: string;
        icon: string;
        task_requirement: number;
    } | null;
    attendedCount: number;
}

interface SubscriptionData {
    id: string;
    classes_remaining: number;
    expiry_date: Date;
    is_frozen: boolean;
    plan_name: string;
}

interface TicketData {
    id: string;
    punches_remaining: number;
    expiry_date: Date;
    is_frozen: boolean;
    plan_name: string;
}

export default function ClientManagerScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // UI State
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Data State
    const [client, setClient] = useState<ClientData | null>(null);
    const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
    const [ticket, setTicket] = useState<TicketData | null>(null);

    // --- Fetch Real Data from Supabase ---
    const fetchClientData = useCallback(async () => {
        if (!id) return;

        try {
            // 1. Fetch profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, phone_number, avatar_url, email')
                .eq('id', id)
                .single();

            if (profileError) {
                console.error('Error fetching profile:', profileError);
                return;
            }

            // 2. Fetch active subscription
            const { data: subscriptionData } = await supabase
                .from('user_subscriptions')
                .select('*, subscription_plans(*)')
                .eq('user_id', id)
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            // 3. Fetch active ticket
            const { data: ticketData } = await supabase
                .from('user_tickets')
                .select('*, ticket_plans(*)')
                .eq('user_id', id)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            // 4. Fetch completed achievements to get highest badge
            const { data: userAchievements } = await supabase
                .from('user_achievements')
                .select(`
                    achievement_id,
                    achievements:achievement_id (
                        id,
                        name,
                        icon,
                        task_requirement
                    )
                `)
                .eq('user_id', id)
                .eq('completed', true);

            // 5. Count total attended classes
            const { count: attendedCount } = await supabase
                .from('class_bookings')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', id)
                .or('status.eq.completed,attended_at.not.is.null');

            // Find highest achievement (by task_requirement)
            const sortedAchievements = (userAchievements || [])
                .filter((ua: any) => ua.achievements)
                .map((ua: any) => ua.achievements)
                .sort((a: any, b: any) => (b.task_requirement || 0) - (a.task_requirement || 0));

            const highestAchievement = sortedAchievements[0] || null;

            // Determine client status
            let status: 'active' | 'frozen' | 'inactive' = 'inactive';
            if (subscriptionData?.is_frozen || ticketData?.is_frozen) {
                status = 'frozen';
            } else if (subscriptionData?.is_active || ticketData?.status === 'active') {
                status = 'active';
            }

            setClient({
                id: profile.id,
                full_name: profile.full_name || profile.email || 'לקוח',
                phone: profile.phone_number || '',
                avatar_url: profile.avatar_url || '',
                status,
                highestAchievement,
                attendedCount: attendedCount || 0,
            });

            // Set subscription if exists
            if (subscriptionData) {
                setSubscription({
                    id: subscriptionData.id,
                    classes_remaining: subscriptionData.classes_remaining || 0,
                    expiry_date: new Date(subscriptionData.end_date || subscriptionData.expiry_date),
                    is_frozen: subscriptionData.is_frozen || false,
                    plan_name: subscriptionData.subscription_plans?.name || 'מנוי',
                });
            } else {
                setSubscription(null);
            }

            // Set ticket if exists
            if (ticketData) {
                setTicket({
                    id: ticketData.id,
                    punches_remaining: ticketData.punches_remaining || 0,
                    expiry_date: new Date(ticketData.expiry_date),
                    is_frozen: ticketData.is_frozen || false,
                    plan_name: ticketData.ticket_plans?.name || 'כרטיסייה',
                });
            } else {
                setTicket(null);
            }

        } catch (error) {
            console.error('Error fetching client data:', error);
        }
    }, [id]);

    useEffect(() => {
        setLoading(true);
        fetchClientData().finally(() => setLoading(false));
    }, [fetchClientData]);

    // Pull-to-refresh handler
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchClientData();
        setRefreshing(false);
    }, [fetchClientData]);

    const handleUpdateSubscription = async (updates: Partial<SubscriptionData>) => {
        if (!subscription) return;
        // Optimistic Update
        setSubscription(prev => prev ? { ...prev, ...updates } : null);

        // Sync with Supabase
        try {
            const dbUpdates: any = {};
            if (updates.classes_remaining !== undefined) dbUpdates.classes_remaining = updates.classes_remaining;
            if (updates.is_frozen !== undefined) dbUpdates.is_frozen = updates.is_frozen;
            if (updates.expiry_date !== undefined) dbUpdates.end_date = updates.expiry_date.toISOString();

            const { error } = await supabase
                .from('user_subscriptions')
                .update(dbUpdates)
                .eq('id', subscription.id);

            if (error) {
                console.error('Error updating subscription:', error);
                Alert.alert('שגיאה', 'לא ניתן לעדכן את המנוי');
            }
        } catch (error) {
            console.error('Error updating subscription:', error);
        }
    };

    // --- Actions ---

    const handleWhatsApp = () => {
        if (!client) return;
        // Linking.openURL(`whatsapp://send?phone=${client.phone}`);
        Alert.alert('WhatsApp', `Opening chat with ${client.phone}`);
    };

    const toggleFreeze = () => {
        if (!subscription || !client) return;
        const newStatus = !subscription.is_frozen;

        if (newStatus) {
            Alert.alert(
                'הקפאת מנוי',
                'האם אתה בטוח שברצונך להקפיא את המנוי? הלקוח לא יוכל להירשם לשיעורים.',
                [
                    { text: 'ביטול', style: 'cancel' },
                    {
                        text: 'הקפא',
                        style: 'default',
                        onPress: () => {
                            handleUpdateSubscription({ is_frozen: true });
                            setClient(prev => prev ? { ...prev, status: 'frozen' } : null);
                        }
                    }
                ]
            );
        } else {
            handleUpdateSubscription({ is_frozen: false });
            setClient(prev => prev ? { ...prev, status: 'active' } : null);
        }
    };

    const handleCancelSubscription = () => {
        if (!client) return;
        Alert.alert(
            'ביטול מנוי',
            'פעולה זו תבטל את המנוי לצמיתות. האם להמשיך?',
            [
                { text: 'לא', style: 'cancel' },
                {
                    text: 'כן, בטל מנוי',
                    style: 'destructive',
                    onPress: () => {
                        setClient(prev => prev ? { ...prev, status: 'inactive' } : null);
                        // Logic to cancel in DB
                        router.back();
                    }
                }
            ]
        );
    };

    const adjustEntries = (amount: number) => {
        if (!subscription) return;
        const newValue = Math.max(0, subscription.classes_remaining + amount);
        handleUpdateSubscription({ classes_remaining: newValue });
    };

    const extendDate = (type: 'week' | 'month') => {
        if (!subscription) return;
        const current = new Date(subscription.expiry_date);
        const newDate = new Date(current);

        if (type === 'week') {
            newDate.setDate(newDate.getDate() + 7);
        } else {
            newDate.setMonth(newDate.getMonth() + 1);
        }

        handleUpdateSubscription({ expiry_date: newDate });
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            handleUpdateSubscription({ expiry_date: selectedDate });
        }
    };

    // --- Render Helpers ---

    const getStatusColor = () => {
        if (subscription?.is_frozen) return '#3B82F6'; // Blue
        if (client?.status === 'inactive') return '#EF4444'; // Red
        return '#34C759'; // Green
    };

    const getStatusText = () => {
        if (subscription?.is_frozen) return 'מוקפא';
        if (client?.status === 'inactive') return 'לא פעיל';
        return 'פעיל';
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!client) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.headerTitle}>לקוח לא נמצא</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <ChevronRight size={28} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>ניהול לקוח</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* 1. Profile Section */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        {client.avatar_url ? (
                            <Image source={{ uri: client.avatar_url }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <Text style={styles.avatarInitials}>
                                    {client.full_name?.charAt(0) || '?'}
                                </Text>
                            </View>
                        )}
                        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
                        {/* Achievement Badge */}
                        {client.highestAchievement?.icon && (
                            <Image
                                source={{ uri: client.highestAchievement.icon }}
                                style={styles.achievementBadge}
                            />
                        )}
                    </View>

                    <Text style={styles.clientName}>{client.full_name}</Text>

                    {client.phone ? (
                        <TouchableOpacity style={styles.phoneButton} onPress={handleWhatsApp}>
                            <MessageCircle size={16} color="#25D366" fill="#25D366" />
                            <Text style={styles.phoneText}>{client.phone}</Text>
                        </TouchableOpacity>
                    ) : null}

                    <View style={[styles.statusChip, { backgroundColor: getStatusColor() + '15' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor() }]}>
                            {getStatusText()}
                        </Text>
                    </View>
                </View>

                {/* 2. Subscription Hero Card */}
                {subscription && (
                <View style={[
                    styles.heroCard,
                    subscription.is_frozen && styles.heroCardFrozen
                ]}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>יתרה בכרטיסייה</Text>
                        <Text style={styles.planName}>{subscription.plan_name}</Text>
                    </View>

                    <View style={styles.counterContainer}>
                        <TouchableOpacity 
                            style={styles.counterBtn} 
                            onPress={() => adjustEntries(-1)}
                            activeOpacity={0.7}
                        >
                            <Minus size={24} color={subscription.is_frozen ? '#94A3B8' : '#000'} />
                        </TouchableOpacity>
                        
                        <Text style={[
                            styles.counterValue,
                            subscription.is_frozen && { color: '#94A3B8' }
                        ]}>
                            {subscription.classes_remaining}
                        </Text>
                        
                        <TouchableOpacity 
                            style={[styles.counterBtn, { backgroundColor: '#000' }]} 
                            onPress={() => adjustEntries(1)}
                            activeOpacity={0.7}
                        >
                            <Plus size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.dateSection}>
                        <View style={styles.dateRow}>
                            <Calendar size={18} color="#64748B" />
                            <Text style={styles.dateLabel}>בתוקף עד:</Text>
                            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                                <Text style={styles.dateValue}>
                                    {subscription.expiry_date.toLocaleDateString('he-IL')}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.quickActions}>
                            <TouchableOpacity 
                                style={styles.chip} 
                                onPress={() => extendDate('week')}
                            >
                                <Text style={styles.chipText}>+ שבוע</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.chip} 
                                onPress={() => extendDate('month')}
                            >
                                <Text style={styles.chipText}>+ חודש</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
                )}

                {/* 3. Admin Actions Grid */}
                {subscription && (
                <>
                <Text style={styles.sectionTitle}>פעולות מנהל</Text>

                <View style={styles.actionsGrid}>
                    <TouchableOpacity
                        style={[
                            styles.actionCard,
                            subscription.is_frozen && styles.actionCardActive
                        ]}
                        onPress={toggleFreeze}
                        activeOpacity={0.8}
                    >
                        <View style={[
                            styles.iconCircle,
                            { backgroundColor: subscription.is_frozen ? '#fff' : '#EFF6FF' }
                        ]}>
                            <Snowflake
                                size={24}
                                color={subscription.is_frozen ? '#3B82F6' : '#3B82F6'}
                            />
                        </View>
                        <Text style={[
                            styles.actionTitle,
                            subscription.is_frozen && { color: '#fff' }
                        ]}>
                            {subscription.is_frozen ? 'הפשר מנוי' : 'הקפא מנוי'}
                        </Text>
                        <Text style={[
                            styles.actionSubtitle,
                            subscription.is_frozen && { color: 'rgba(255,255,255,0.8)' }
                        ]}>
                            {subscription.is_frozen ? 'החזר לפעילות' : 'עצור זמנית'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionCard, styles.actionCardDanger]}
                        onPress={handleCancelSubscription}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: '#FEF2F2' }]}>
                            <Trash2 size={24} color="#EF4444" />
                        </View>
                        <Text style={[styles.actionTitle, { color: '#EF4444' }]}>ביטול מנוי</Text>
                        <Text style={styles.actionSubtitle}>סיום התקשרות</Text>
                    </TouchableOpacity>
                </View>
                </>
                )}

            </ScrollView>

            {showDatePicker && subscription && (
                <DateTimePicker
                    value={subscription.expiry_date}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7', // Apple standard background gray
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: '#F2F2F7',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    
    // Profile Section
    profileSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarContainer: {
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        marginBottom: 16,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: '#fff',
    },
    statusIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 3,
        borderColor: '#fff',
    },
    achievementBadge: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 3,
        borderColor: '#fff',
        backgroundColor: '#fff',
    },
    avatarPlaceholder: {
        backgroundColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitials: {
        fontSize: 36,
        fontWeight: '700',
        color: '#6B7280',
    },
    clientName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#000',
        marginBottom: 8,
    },
    phoneButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    phoneText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#000',
    },
    statusChip: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
    },

    // Hero Card
    heroCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        marginBottom: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 10,
    },
    heroCardFrozen: {
        backgroundColor: '#F8FAFF', // Very light blue
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    cardTitle: {
        fontSize: 16,
        color: '#64748B',
        fontWeight: '600',
    },
    planName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#000',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        overflow: 'hidden',
    },
    counterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    counterBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    counterValue: {
        fontSize: 48,
        fontWeight: '800',
        color: '#000',
        fontVariant: ['tabular-nums'],
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginBottom: 20,
    },
    dateSection: {
        gap: 16,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dateLabel: {
        fontSize: 15,
        color: '#64748B',
        marginLeft: 8,
    },
    dateValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
    },
    quickActions: {
        flexDirection: 'row',
        gap: 12,
    },
    chip: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#000',
    },

    // Actions Grid
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
        marginBottom: 16,
        textAlign: 'left', // Hebrew RTL
    },
    actionsGrid: {
        flexDirection: 'row',
        gap: 16,
    },
    actionCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 4,
        alignItems: 'flex-start',
    },
    actionCardActive: {
        backgroundColor: '#3B82F6',
    },
    actionCardDanger: {
        backgroundColor: '#fff',
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
        marginBottom: 4,
    },
    actionSubtitle: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
    },
});


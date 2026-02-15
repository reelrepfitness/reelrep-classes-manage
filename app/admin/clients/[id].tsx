import React, { useState, useEffect, useCallback } from 'react';
import { Spinner } from '@/components/ui/spinner';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
    TextInput,
    RefreshControl,
    Linking,
    Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Plus,
    Minus,
    Calendar,
    Snowflake,
    Trash2,
    MessageCircle,
    Ban,
    ShieldOff,
    Clock,
    TrendingUp,
    AlertTriangle,
    DollarSign,
    Ticket,
    CreditCard,
    Bell,
    FileText,
    Send,
    StickyNote,
    History,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import Fonts from '@/constants/typography';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
    useAdminClients,
    ClientDetail,
    AvailablePlan,
    BookingHistoryItem,
    InvoiceHistoryItem,
    PastPlanItem,
    ClientNote,
} from '@/hooks/admin/useAdminClients';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/constants/supabase';

export default function ClientManagerScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const {
        fetchClientDetail,
        fetchAvailablePlans,
        updateSubscription,
        updateTicketSessions,
        freezeSubscription,
        unfreezeSubscription,
        cancelSubscription,
        cancelTicket,
        assignSubscription,
        assignTicket,
        blockClient,
        unblockClient,
        addClientNote,
        deleteClientNote,
    } = useAdminClients();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);

    const [client, setClient] = useState<ClientDetail | null>(null);
    const [availablePlans, setAvailablePlans] = useState<AvailablePlan[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [assignStartDate, setAssignStartDate] = useState('');
    const [assignEndDate, setAssignEndDate] = useState('');
    const [freezeReasonInput, setFreezeReasonInput] = useState('');
    const [showFreezeInput, setShowFreezeInput] = useState(false);

    // Collapsible sections
    const [showBookings, setShowBookings] = useState(false);
    const [showInvoices, setShowInvoices] = useState(false);
    const [showPastPlans, setShowPastPlans] = useState(false);

    // Notes
    const [noteInput, setNoteInput] = useState('');
    const [addingNote, setAddingNote] = useState(false);

    // Send notification modal
    const [notificationModalVisible, setNotificationModalVisible] = useState(false);
    const [notifTitle, setNotifTitle] = useState('');
    const [notifBody, setNotifBody] = useState('');
    const [sendingNotification, setSendingNotification] = useState(false);

    // ─── Data Loading ───

    const loadData = useCallback(async () => {
        if (!id) return;
        try {
            const [detail, plans] = await Promise.all([
                fetchClientDetail(id),
                fetchAvailablePlans(),
            ]);
            setClient(detail);
            setAvailablePlans(plans);
        } catch (error) {
            console.error('Error fetching client data:', error);
        }
    }, [id, fetchClientDetail, fetchAvailablePlans]);

    useEffect(() => {
        setLoading(true);
        loadData().finally(() => setLoading(false));
    }, [loadData]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);

    // ─── Subscription Actions ───

    const handleAdjustSessions = async (amount: number) => {
        if (!client?.subscription) return;
        const current = client.subscription.sessions_remaining ?? 0;
        const newValue = Math.max(0, current + amount);

        // Optimistic
        setClient(prev => prev && prev.subscription ? {
            ...prev,
            subscription: { ...prev.subscription, sessions_remaining: newValue },
        } : prev);

        try {
            await updateSubscription(client.subscription.id, { sessions_remaining: newValue });
        } catch {
            Alert.alert('שגיאה', 'לא ניתן לעדכן');
            await loadData();
        }
    };

    const onStartDateChange = async (_: any, selectedDate?: Date) => {
        setShowStartDatePicker(false);
        if (!selectedDate || !client?.subscription) return;

        setClient(prev => prev && prev.subscription ? {
            ...prev,
            subscription: { ...prev.subscription, start_date: selectedDate.toISOString() },
        } : prev);

        try {
            await updateSubscription(client.subscription.id, { start_date: selectedDate.toISOString() });
        } catch {
            Alert.alert('שגיאה', 'לא ניתן לעדכן');
            await loadData();
        }
    };

    const onEndDateChange = async (_: any, selectedDate?: Date) => {
        setShowEndDatePicker(false);
        if (!selectedDate || !client?.subscription) return;

        setClient(prev => prev && prev.subscription ? {
            ...prev,
            subscription: { ...prev.subscription, end_date: selectedDate.toISOString() },
        } : prev);

        try {
            await updateSubscription(client.subscription.id, { end_date: selectedDate.toISOString() });
        } catch {
            Alert.alert('שגיאה', 'לא ניתן לעדכן');
            await loadData();
        }
    };

    const handleFreeze = () => {
        if (!client?.subscription) return;
        const isFrozen = client.subscription.plan_status === 'frozen';

        if (isFrozen) {
            // Unfreeze
            Alert.alert('הפשרת מנוי', 'להחזיר את המנוי לפעילות?', [
                { text: 'ביטול', style: 'cancel' },
                {
                    text: 'הפשר',
                    onPress: async () => {
                        try {
                            await unfreezeSubscription(client.subscription!.id);
                            await loadData();
                        } catch {
                            Alert.alert('שגיאה', 'לא ניתן להפשיר');
                        }
                    },
                },
            ]);
        } else {
            setShowFreezeInput(true);
        }
    };

    const confirmFreeze = async () => {
        if (!client?.subscription) return;
        try {
            await freezeSubscription(client.subscription.id, freezeReasonInput);
            setShowFreezeInput(false);
            setFreezeReasonInput('');
            await loadData();
        } catch {
            Alert.alert('שגיאה', 'לא ניתן להקפיא');
        }
    };

    const handleCancelSubscription = () => {
        if (!client?.subscription) return;
        Alert.alert('ביטול מנוי', 'פעולה זו תבטל את המנוי. האם להמשיך?', [
            { text: 'לא', style: 'cancel' },
            {
                text: 'כן, בטל מנוי',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await cancelSubscription(client.subscription!.id);
                        await loadData();
                    } catch {
                        Alert.alert('שגיאה', 'לא ניתן לבטל');
                    }
                },
            },
        ]);
    };

    // ─── Ticket Actions ───

    const handleAdjustTicketSessions = async (amount: number) => {
        if (!client?.ticket) return;
        const newValue = Math.max(0, client.ticket.sessions_remaining + amount);

        setClient(prev => prev && prev.ticket ? {
            ...prev,
            ticket: { ...prev.ticket, sessions_remaining: newValue },
        } : prev);

        try {
            await updateTicketSessions(client.ticket.id, newValue);
        } catch {
            Alert.alert('שגיאה', 'לא ניתן לעדכן');
            await loadData();
        }
    };

    const handleCancelTicket = () => {
        if (!client?.ticket) return;
        Alert.alert('ביטול כרטיסייה', 'האם לבטל את הכרטיסייה?', [
            { text: 'לא', style: 'cancel' },
            {
                text: 'כן, בטל',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await cancelTicket(client.ticket!.id);
                        await loadData();
                    } catch {
                        Alert.alert('שגיאה', 'לא ניתן לבטל');
                    }
                },
            },
        ]);
    };

    // ─── Plan Assignment ───

    const handleAssignPlan = async () => {
        if (!client || !selectedPlanId) return;
        const plan = availablePlans.find(p => p.id === selectedPlanId);
        if (!plan) return;

        try {
            if (plan.type === 'subscription') {
                if (!assignStartDate || !assignEndDate) {
                    Alert.alert('שגיאה', 'נא למלא תאריכי התחלה וסיום');
                    return;
                }
                await assignSubscription(client.id, plan.id, assignStartDate, assignEndDate);
            } else {
                await assignTicket(client.id, plan.id, plan.total_sessions!, plan.validity_days!);
            }
            setSelectedPlanId(null);
            setAssignStartDate('');
            setAssignEndDate('');
            await loadData();
            Alert.alert('הצלחה', 'התוכנית הוקצתה בהצלחה');
        } catch (error: any) {
            Alert.alert('שגיאה', error.message || 'לא ניתן להקצות תוכנית');
        }
    };

    // ─── Block/Unblock ───

    const handleToggleBlock = () => {
        if (!client) return;
        const isBlocked = client.block_end_date && new Date(client.block_end_date) > new Date();

        if (isBlocked) {
            Alert.alert('הסרת חסימה', 'להסיר את החסימה מלקוח זה?', [
                { text: 'ביטול', style: 'cancel' },
                {
                    text: 'הסר חסימה',
                    onPress: async () => {
                        try {
                            await unblockClient(client.id);
                            await loadData();
                        } catch {
                            Alert.alert('שגיאה', 'לא ניתן להסיר חסימה');
                        }
                    },
                },
            ]);
        } else {
            // Block for 30 days by default
            const blockEnd = new Date();
            blockEnd.setDate(blockEnd.getDate() + 30);
            Alert.alert('חסימת לקוח', 'לחסום את הלקוח ל-30 יום?', [
                { text: 'ביטול', style: 'cancel' },
                {
                    text: 'חסום',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await blockClient(client.id, blockEnd.toISOString());
                            await loadData();
                        } catch {
                            Alert.alert('שגיאה', 'לא ניתן לחסום');
                        }
                    },
                },
            ]);
        }
    };

    // ─── Notes ───

    const handleAddNote = async () => {
        if (!client || !user?.id || !noteInput.trim()) return;
        setAddingNote(true);
        try {
            await addClientNote(client.id, user.id, noteInput.trim());
            setNoteInput('');
            await loadData();
        } catch {
            Alert.alert('שגיאה', 'לא ניתן להוסיף הערה');
        } finally {
            setAddingNote(false);
        }
    };

    const handleDeleteNote = (noteId: string) => {
        Alert.alert('מחיקת הערה', 'למחוק את ההערה?', [
            { text: 'ביטול', style: 'cancel' },
            {
                text: 'מחק',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteClientNote(noteId);
                        await loadData();
                    } catch {
                        Alert.alert('שגיאה', 'לא ניתן למחוק');
                    }
                },
            },
        ]);
    };

    // ─── Send Notification ───

    const handleOpenNotificationModal = () => {
        if (!client) return;
        setNotifTitle(`הודעה ל-${client.full_name}`);
        setNotifBody('');
        setNotificationModalVisible(true);
    };

    const handleSendNotification = async () => {
        if (!client || !notifBody.trim()) {
            Alert.alert('שגיאה', 'יש להזין תוכן להתראה');
            return;
        }
        setSendingNotification(true);
        try {
            const { error } = await supabase.functions.invoke('send-push-notification', {
                body: {
                    user_ids: [client.id],
                    title: notifTitle.trim() || `הודעה ל-${client.full_name}`,
                    body: notifBody.trim(),
                    notification_type: 'general',
                    data: { screen: '/(tabs)' },
                },
            });
            if (error) throw error;
            setNotificationModalVisible(false);
            Alert.alert('הצלחה', 'ההתראה נשלחה');
        } catch {
            Alert.alert('שגיאה', 'שליחת ההתראה נכשלה');
        } finally {
            setSendingNotification(false);
        }
    };

    // ─── WhatsApp ───

    const handleWhatsApp = () => {
        if (!client?.phone_number) return;
        const phone = client.phone_number.replace(/[^0-9]/g, '');
        const intlPhone = phone.startsWith('0') ? '972' + phone.slice(1) : phone;
        Linking.openURL(`https://wa.me/${intlPhone}`);
    };

    // ─── Helpers ───

    const getStatusColor = () => {
        if (client?.subscription?.plan_status === 'frozen') return '#3B82F6';
        if (!client?.subscription && !client?.ticket) return '#EF4444';
        if (client?.subscription?.plan_status === 'active' || client?.ticket?.status === 'active') return '#34C759';
        return '#EF4444';
    };

    const getStatusText = () => {
        if (client?.subscription?.plan_status === 'frozen') return 'מוקפא';
        if (!client?.subscription && !client?.ticket) return 'לא פעיל';
        if (client?.subscription?.plan_status === 'active' || client?.ticket?.status === 'active') return 'פעיל';
        return 'לא פעיל';
    };

    const formatDate = (dateStr: string) => {
        try { return new Date(dateStr).toLocaleDateString('he-IL'); } catch { return dateStr; }
    };

    const getMemberDuration = () => {
        if (!client?.created_at) return '';
        const start = new Date(client.created_at);
        const now = new Date();
        const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
        if (months < 1) return 'פחות מחודש';
        if (months < 12) return `${months} חודשים`;
        const years = Math.floor(months / 12);
        const rem = months % 12;
        return rem > 0 ? `${years} שנים ו-${rem} חודשים` : `${years} שנים`;
    };

    const isBlocked = client?.block_end_date && new Date(client.block_end_date) > new Date();
    const hasNoPlan = !client?.subscription && !client?.ticket;

    const getBookingStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return '#10B981';
            case 'confirmed': return '#3B82F6';
            case 'cancelled': return '#EF4444';
            case 'no_show': return '#F59E0B';
            default: return '#94A3B8';
        }
    };

    const getBookingStatusText = (status: string) => {
        switch (status) {
            case 'completed': return 'השתתף';
            case 'confirmed': return 'מאושר';
            case 'cancelled': return 'בוטל';
            case 'no_show': return 'לא הגיע';
            default: return status;
        }
    };

    const getPaymentStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return '#10B981';
            case 'pending': return '#F59E0B';
            case 'cancelled': return '#EF4444';
            default: return '#94A3B8';
        }
    };

    const getPaymentStatusText = (status: string) => {
        switch (status) {
            case 'paid': return 'שולם';
            case 'pending': return 'ממתין';
            case 'cancelled': return 'בוטל';
            default: return status;
        }
    };

    const getPaymentTypeText = (type: number | null) => {
        switch (type) {
            case 1: return 'מזומן';
            case 2: return 'אשראי';
            case 4: return 'העברה בנקאית';
            case 6: return 'Bit';
            case 11: return 'הוראת קבע';
            default: return '';
        }
    };

    const getPlanStatusText = (status: string) => {
        switch (status) {
            case 'expired': return 'פג תוקף';
            case 'cancelled': return 'בוטל';
            case 'depleted': return 'נוצל';
            case 'frozen': return 'מוקפא';
            default: return status;
        }
    };

    // ─── Render ───

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Spinner size="lg" />
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
            <LinearGradient
                colors={[Colors.gradient1, Colors.gradient2]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: insets.top }]}
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <ChevronRight size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>ניהול לקוח</Text>
                <View style={{ width: 28 }} />
            </LinearGradient>

            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* ── Profile Section ── */}
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
                        {client.highestAchievement?.icon && (
                            <Image source={{ uri: client.highestAchievement.icon }} style={styles.achievementBadge} />
                        )}
                    </View>

                    <Text style={styles.clientName}>{client.full_name}</Text>
                    <Text style={styles.clientEmail}>{client.email}</Text>

                    {client.phone_number ? (
                        <TouchableOpacity style={styles.phoneButton} onPress={handleWhatsApp}>
                            <MessageCircle size={16} color="#25D366" fill="#25D366" />
                            <Text style={styles.phoneText}>{client.phone_number}</Text>
                        </TouchableOpacity>
                    ) : null}

                    <View style={[styles.statusChip, { backgroundColor: getStatusColor() + '15' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor() }]}>
                            {getStatusText()}
                        </Text>
                    </View>

                    {isBlocked && (
                        <View style={styles.blockedBanner}>
                            <Ban size={14} color="#EF4444" />
                            <Text style={styles.blockedBannerText}>
                                חסום עד {formatDate(client.block_end_date!)}
                            </Text>
                        </View>
                    )}
                </View>

                {/* ── Stats Card ── */}
                <View style={styles.statsCard}>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <TrendingUp size={18} color={Colors.primary} />
                            <Text style={styles.statValue}>{client.attendedCount}</Text>
                            <Text style={styles.statLabel}>שיעורים</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Clock size={18} color={Colors.primary} />
                            <Text style={styles.statValue}>{getMemberDuration()}</Text>
                            <Text style={styles.statLabel}>חברות</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <AlertTriangle size={18} color={client.late_cancellations > 0 ? '#f59e0b' : '#94A3B8'} />
                            <Text style={styles.statValue}>{client.late_cancellations}</Text>
                            <Text style={styles.statLabel}>ביטולים מאוחרים</Text>
                        </View>
                    </View>
                    {client.lastClassDate && (
                        <Text style={styles.lastClassText}>
                            שיעור אחרון: {formatDate(client.lastClassDate)}
                        </Text>
                    )}
                </View>

                {/* ── Subscription Card ── */}
                {client.subscription && (
                    <View style={[
                        styles.heroCard,
                        client.subscription.plan_status === 'frozen' && styles.heroCardFrozen,
                    ]}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardHeaderLeft}>
                                <CreditCard size={18} color="#64748B" />
                                <Text style={styles.cardTitle}>מנוי</Text>
                            </View>
                            <Text style={styles.planName}>{client.subscription.plan_name}</Text>
                        </View>

                        {/* Sessions Counter */}
                        {client.subscription.sessions_remaining !== null && (
                            <>
                                <Text style={styles.counterLabel}>אימונים נותרים</Text>
                                <View style={styles.counterContainer}>
                                    <TouchableOpacity
                                        style={styles.counterBtn}
                                        onPress={() => handleAdjustSessions(-1)}
                                    >
                                        <Minus size={24} color={client.subscription.plan_status === 'frozen' ? '#94A3B8' : '#000'} />
                                    </TouchableOpacity>
                                    <Text style={[
                                        styles.counterValue,
                                        client.subscription.plan_status === 'frozen' && { color: '#94A3B8' },
                                    ]}>
                                        {client.subscription.sessions_remaining}
                                    </Text>
                                    <TouchableOpacity
                                        style={[styles.counterBtn, { backgroundColor: '#000' }]}
                                        onPress={() => handleAdjustSessions(1)}
                                    >
                                        <Plus size={24} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                        <View style={styles.divider} />

                        {/* Dates */}
                        <View style={styles.dateSection}>
                            <View style={styles.dateRow}>
                                <Calendar size={18} color="#64748B" />
                                <Text style={styles.dateLabel}>תאריך התחלה:</Text>
                                <TouchableOpacity onPress={() => setShowStartDatePicker(true)}>
                                    <Text style={styles.dateValue}>
                                        {formatDate(client.subscription.start_date)}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.dateRow}>
                                <Calendar size={18} color="#64748B" />
                                <Text style={styles.dateLabel}>תאריך סיום:</Text>
                                <TouchableOpacity onPress={() => setShowEndDatePicker(true)}>
                                    <Text style={styles.dateValue}>
                                        {formatDate(client.subscription.end_date)}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Outstanding Balance */}
                        {(client.subscription.outstanding_balance > 0 || client.subscription.has_debt) && (
                            <View style={styles.debtBanner}>
                                <DollarSign size={16} color="#EF4444" />
                                <Text style={styles.debtText}>
                                    חוב: ₪{client.subscription.outstanding_balance || client.subscription.debt_amount || 0}
                                </Text>
                            </View>
                        )}

                        {/* Freeze Info */}
                        {client.subscription.plan_status === 'frozen' && client.subscription.freeze_start_date && (
                            <View style={styles.freezeInfo}>
                                <Snowflake size={14} color="#3B82F6" />
                                <Text style={styles.freezeInfoText}>
                                    מוקפא מ-{formatDate(client.subscription.freeze_start_date)}
                                    {client.subscription.freeze_reason ? ` • ${client.subscription.freeze_reason}` : ''}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* ── Ticket Card ── */}
                {client.ticket && (
                    <View style={styles.heroCard}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardHeaderLeft}>
                                <Ticket size={18} color="#f59e0b" />
                                <Text style={styles.cardTitle}>כרטיסייה</Text>
                            </View>
                            <Text style={styles.planName}>{client.ticket.plan_name}</Text>
                        </View>

                        <Text style={styles.counterLabel}>אימונים נותרים</Text>
                        <View style={styles.counterContainer}>
                            <TouchableOpacity
                                style={styles.counterBtn}
                                onPress={() => handleAdjustTicketSessions(-1)}
                            >
                                <Minus size={24} color="#000" />
                            </TouchableOpacity>
                            <Text style={styles.counterValue}>
                                {client.ticket.sessions_remaining}
                                <Text style={styles.counterTotal}>/{client.ticket.total_sessions}</Text>
                            </Text>
                            <TouchableOpacity
                                style={[styles.counterBtn, { backgroundColor: '#000' }]}
                                onPress={() => handleAdjustTicketSessions(1)}
                            >
                                <Plus size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.dateRow}>
                            <Calendar size={18} color="#64748B" />
                            <Text style={styles.dateLabel}>בתוקף עד:</Text>
                            <Text style={styles.dateValue}>{formatDate(client.ticket.expiry_date)}</Text>
                        </View>

                        {client.ticket.has_debt && (
                            <View style={styles.debtBanner}>
                                <DollarSign size={16} color="#EF4444" />
                                <Text style={styles.debtText}>חוב: ₪{client.ticket.debt_amount || 0}</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.cancelTicketBtn}
                            onPress={handleCancelTicket}
                        >
                            <Trash2 size={16} color="#EF4444" />
                            <Text style={styles.cancelTicketText}>בטל כרטיסייה</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Assign Plan (if no active plan) ── */}
                {hasNoPlan && (
                    <View style={styles.assignSection}>
                        <Text style={styles.sectionTitle}>הקצאת תוכנית</Text>

                        {availablePlans.map(plan => (
                            <TouchableOpacity
                                key={plan.id}
                                style={[
                                    styles.planOption,
                                    selectedPlanId === plan.id && styles.planOptionSelected,
                                ]}
                                onPress={() => setSelectedPlanId(plan.id)}
                            >
                                <View style={styles.planOptionLeft}>
                                    {plan.type === 'ticket' ? (
                                        <Ticket size={18} color={selectedPlanId === plan.id ? Colors.primary : '#64748B'} />
                                    ) : (
                                        <CreditCard size={18} color={selectedPlanId === plan.id ? Colors.primary : '#64748B'} />
                                    )}
                                    <View>
                                        <Text style={[
                                            styles.planOptionName,
                                            selectedPlanId === plan.id && { color: Colors.primary },
                                        ]}>
                                            {plan.name}
                                        </Text>
                                        <Text style={styles.planOptionPrice}>₪{plan.price}</Text>
                                    </View>
                                </View>
                                <Text style={styles.planOptionType}>
                                    {plan.type === 'ticket'
                                        ? `${plan.total_sessions} אימונים`
                                        : 'מנוי'}
                                </Text>
                            </TouchableOpacity>
                        ))}

                        {/* Date inputs for subscription plans */}
                        {selectedPlanId && availablePlans.find(p => p.id === selectedPlanId)?.type === 'subscription' && (
                            <View style={styles.dateInputs}>
                                <View style={styles.dateInputGroup}>
                                    <Text style={styles.dateInputLabel}>תאריך התחלה</Text>
                                    <TextInput
                                        style={styles.dateInput}
                                        value={assignStartDate}
                                        onChangeText={setAssignStartDate}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor="#94A3B8"
                                        textAlign="right"
                                    />
                                </View>
                                <View style={styles.dateInputGroup}>
                                    <Text style={styles.dateInputLabel}>תאריך סיום</Text>
                                    <TextInput
                                        style={styles.dateInput}
                                        value={assignEndDate}
                                        onChangeText={setAssignEndDate}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor="#94A3B8"
                                        textAlign="right"
                                    />
                                </View>
                            </View>
                        )}

                        {selectedPlanId && (
                            <TouchableOpacity style={styles.assignButton} onPress={handleAssignPlan}>
                                <Plus size={18} color="#fff" />
                                <Text style={styles.assignButtonText}>הקצה תוכנית</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* ── Freeze Reason Input ── */}
                {showFreezeInput && (
                    <View style={styles.freezeInputCard}>
                        <Text style={styles.freezeInputTitle}>סיבת הקפאה (אופציונלי)</Text>
                        <TextInput
                            style={styles.freezeTextInput}
                            value={freezeReasonInput}
                            onChangeText={setFreezeReasonInput}
                            placeholder="לדוגמא: חופשה, פציעה..."
                            placeholderTextColor="#94A3B8"
                            textAlign="right"
                        />
                        <View style={styles.freezeInputActions}>
                            <TouchableOpacity
                                style={styles.freezeInputCancel}
                                onPress={() => { setShowFreezeInput(false); setFreezeReasonInput(''); }}
                            >
                                <Text style={styles.freezeInputCancelText}>ביטול</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.freezeInputConfirm} onPress={confirmFreeze}>
                                <Snowflake size={16} color="#fff" />
                                <Text style={styles.freezeInputConfirmText}>הקפא</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* ── Past Plans ── */}
                {client.pastPlans.length > 0 && (
                    <View style={styles.sectionCard}>
                        <TouchableOpacity
                            style={styles.sectionHeader}
                            onPress={() => setShowPastPlans(!showPastPlans)}
                        >
                            <View style={styles.sectionHeaderLeft}>
                                <History size={18} color="#64748B" />
                                <Text style={styles.sectionHeaderTitle}>היסטוריית תוכניות</Text>
                            </View>
                            <View style={styles.sectionHeaderRight}>
                                <View style={styles.countBadge}>
                                    <Text style={styles.countBadgeText}>{client.pastPlans.length}</Text>
                                </View>
                                {showPastPlans ? <ChevronUp size={20} color="#94A3B8" /> : <ChevronDown size={20} color="#94A3B8" />}
                            </View>
                        </TouchableOpacity>
                        {showPastPlans && client.pastPlans.map(plan => (
                            <View key={plan.id} style={styles.historyItem}>
                                <View style={styles.historyItemLeft}>
                                    {plan.type === 'ticket' ? (
                                        <Ticket size={16} color="#F59E0B" />
                                    ) : (
                                        <CreditCard size={16} color="#64748B" />
                                    )}
                                    <View>
                                        <Text style={styles.historyItemTitle}>{plan.name}</Text>
                                        <Text style={styles.historyItemDate}>
                                            {formatDate(plan.start_date)} - {formatDate(plan.end_date)}
                                            {plan.sessions_info ? ` • ${plan.sessions_info} נותרו` : ''}
                                        </Text>
                                    </View>
                                </View>
                                <View style={[styles.statusBadge, { backgroundColor: '#FEF2F2' }]}>
                                    <Text style={[styles.statusBadgeText, { color: '#EF4444' }]}>
                                        {getPlanStatusText(plan.status)}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* ── Booking History ── */}
                {client.recentBookings.length > 0 && (
                    <View style={styles.sectionCard}>
                        <TouchableOpacity
                            style={styles.sectionHeader}
                            onPress={() => setShowBookings(!showBookings)}
                        >
                            <View style={styles.sectionHeaderLeft}>
                                <Calendar size={18} color="#64748B" />
                                <Text style={styles.sectionHeaderTitle}>היסטוריית הזמנות</Text>
                            </View>
                            <View style={styles.sectionHeaderRight}>
                                <View style={styles.countBadge}>
                                    <Text style={styles.countBadgeText}>{client.recentBookings.length}</Text>
                                </View>
                                {showBookings ? <ChevronUp size={20} color="#94A3B8" /> : <ChevronDown size={20} color="#94A3B8" />}
                            </View>
                        </TouchableOpacity>
                        {showBookings && client.recentBookings.map(booking => (
                            <View key={booking.id} style={styles.historyItem}>
                                <View style={styles.historyItemLeft}>
                                    <View style={[styles.statusDot, { backgroundColor: getBookingStatusColor(booking.status) }]} />
                                    <View>
                                        <Text style={styles.historyItemTitle}>{booking.class_title}</Text>
                                        <Text style={styles.historyItemDate}>
                                            {booking.class_date ? formatDate(booking.class_date) : formatDate(booking.booked_at)}
                                            {booking.class_time ? ` • ${booking.class_time}` : ''}
                                        </Text>
                                    </View>
                                </View>
                                <View style={[styles.statusBadge, { backgroundColor: getBookingStatusColor(booking.status) + '15' }]}>
                                    <Text style={[styles.statusBadgeText, { color: getBookingStatusColor(booking.status) }]}>
                                        {getBookingStatusText(booking.status)}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* ── Invoice/Payment History ── */}
                {client.invoices.length > 0 && (
                    <View style={styles.sectionCard}>
                        <TouchableOpacity
                            style={styles.sectionHeader}
                            onPress={() => setShowInvoices(!showInvoices)}
                        >
                            <View style={styles.sectionHeaderLeft}>
                                <FileText size={18} color="#64748B" />
                                <Text style={styles.sectionHeaderTitle}>חשבוניות ותשלומים</Text>
                            </View>
                            <View style={styles.sectionHeaderRight}>
                                <View style={styles.countBadge}>
                                    <Text style={styles.countBadgeText}>{client.invoices.length}</Text>
                                </View>
                                {showInvoices ? <ChevronUp size={20} color="#94A3B8" /> : <ChevronDown size={20} color="#94A3B8" />}
                            </View>
                        </TouchableOpacity>
                        {showInvoices && client.invoices.map(inv => (
                            <TouchableOpacity
                                key={inv.id}
                                style={styles.historyItem}
                                onPress={() => inv.pdf_url && Linking.openURL(inv.pdf_url)}
                                disabled={!inv.pdf_url}
                            >
                                <View style={styles.historyItemLeft}>
                                    <DollarSign size={16} color={getPaymentStatusColor(inv.payment_status)} />
                                    <View>
                                        <Text style={styles.historyItemTitle}>
                                            ₪{inv.total_amount.toFixed(0)}
                                            {inv.green_invoice_number ? ` • #${inv.green_invoice_number}` : ''}
                                        </Text>
                                        <Text style={styles.historyItemDate}>
                                            {formatDate(inv.created_at)}
                                            {getPaymentTypeText(inv.payment_type) ? ` • ${getPaymentTypeText(inv.payment_type)}` : ''}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.invoiceRight}>
                                    <View style={[styles.statusBadge, { backgroundColor: getPaymentStatusColor(inv.payment_status) + '15' }]}>
                                        <Text style={[styles.statusBadgeText, { color: getPaymentStatusColor(inv.payment_status) }]}>
                                            {getPaymentStatusText(inv.payment_status)}
                                        </Text>
                                    </View>
                                    {inv.pdf_url && <FileText size={14} color="#94A3B8" />}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* ── Admin Notes ── */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionHeaderLeft}>
                            <StickyNote size={18} color="#64748B" />
                            <Text style={styles.sectionHeaderTitle}>הערות מנהל</Text>
                        </View>
                        {client.notes.length > 0 && (
                            <View style={styles.countBadge}>
                                <Text style={styles.countBadgeText}>{client.notes.length}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.noteInputRow}>
                        <TextInput
                            style={styles.noteInput}
                            value={noteInput}
                            onChangeText={setNoteInput}
                            placeholder="הוסף הערה..."
                            placeholderTextColor="#94A3B8"
                            textAlign="right"
                            multiline
                        />
                        <TouchableOpacity
                            style={[styles.noteAddBtn, !noteInput.trim() && { opacity: 0.4 }]}
                            onPress={handleAddNote}
                            disabled={!noteInput.trim() || addingNote}
                        >
                            {addingNote ? (
                                <Spinner size="sm" />
                            ) : (
                                <Send size={18} color="#fff" />
                            )}
                        </TouchableOpacity>
                    </View>

                    {client.notes.map(note => (
                        <TouchableOpacity
                            key={note.id}
                            style={styles.noteItem}
                            onLongPress={() => handleDeleteNote(note.id)}
                        >
                            <Text style={styles.noteText}>{note.note}</Text>
                            <Text style={styles.noteMeta}>
                                {note.admin_name} • {formatDate(note.created_at)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Admin Actions Grid ── */}
                <Text style={styles.sectionTitle}>פעולות מנהל</Text>
                <View style={styles.actionsGrid}>
                    {/* Send Notification */}
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={handleOpenNotificationModal}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: '#F0FDF4' }]}>
                            <Bell size={24} color="#10B981" />
                        </View>
                        <Text style={styles.actionTitle}>שלח התראה</Text>
                        <Text style={styles.actionSubtitle}>הודעה ללקוח</Text>
                    </TouchableOpacity>

                    {/* Freeze/Unfreeze (only if subscription) */}
                    {client.subscription && (
                        <TouchableOpacity
                            style={[
                                styles.actionCard,
                                client.subscription.plan_status === 'frozen' && styles.actionCardActive,
                            ]}
                            onPress={handleFreeze}
                        >
                            <View style={[
                                styles.iconCircle,
                                { backgroundColor: client.subscription.plan_status === 'frozen' ? '#fff' : '#EFF6FF' },
                            ]}>
                                <Snowflake size={24} color="#3B82F6" />
                            </View>
                            <Text style={[
                                styles.actionTitle,
                                client.subscription.plan_status === 'frozen' && { color: '#fff' },
                            ]}>
                                {client.subscription.plan_status === 'frozen' ? 'הפשר מנוי' : 'הקפא מנוי'}
                            </Text>
                            <Text style={[
                                styles.actionSubtitle,
                                client.subscription.plan_status === 'frozen' && { color: 'rgba(255,255,255,0.8)' },
                            ]}>
                                {client.subscription.plan_status === 'frozen' ? 'החזר לפעילות' : 'עצור זמנית'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Cancel Subscription */}
                    {client.subscription && (
                        <TouchableOpacity
                            style={[styles.actionCard, styles.actionCardDanger]}
                            onPress={handleCancelSubscription}
                        >
                            <View style={[styles.iconCircle, { backgroundColor: '#FEF2F2' }]}>
                                <Trash2 size={24} color="#EF4444" />
                            </View>
                            <Text style={[styles.actionTitle, { color: '#EF4444' }]}>ביטול מנוי</Text>
                            <Text style={styles.actionSubtitle}>סיום התקשרות</Text>
                        </TouchableOpacity>
                    )}

                    {/* Block/Unblock */}
                    <TouchableOpacity
                        style={[styles.actionCard, isBlocked && styles.actionCardBlocked]}
                        onPress={handleToggleBlock}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: isBlocked ? '#FEF2F2' : '#F1F5F9' }]}>
                            {isBlocked ? (
                                <ShieldOff size={24} color="#EF4444" />
                            ) : (
                                <Ban size={24} color="#64748B" />
                            )}
                        </View>
                        <Text style={[styles.actionTitle, isBlocked && { color: '#EF4444' }]}>
                            {isBlocked ? 'הסר חסימה' : 'חסום לקוח'}
                        </Text>
                        <Text style={styles.actionSubtitle}>
                            {isBlocked ? 'אפשר הרשמה מחדש' : 'מנע הרשמה לשיעורים'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {showStartDatePicker && client.subscription && (
                <DateTimePicker
                    value={new Date(client.subscription.start_date)}
                    mode="date"
                    display="default"
                    onChange={onStartDateChange}
                />
            )}

            {showEndDatePicker && client.subscription && (
                <DateTimePicker
                    value={new Date(client.subscription.end_date)}
                    mode="date"
                    display="default"
                    onChange={onEndDateChange}
                />
            )}

            {/* Send Notification Modal */}
            <Modal visible={notificationModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>שלח התראה</Text>
                            <TouchableOpacity onPress={() => setNotificationModalVisible(false)}>
                                <Text style={{ fontSize: 18, color: '#94A3B8' }}>X</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtext}>שליחת התראה ל-{client.full_name}</Text>

                        <Text style={styles.modalLabel}>כותרת</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={notifTitle}
                            onChangeText={setNotifTitle}
                            placeholder="כותרת ההתראה"
                            placeholderTextColor="#94A3B8"
                            textAlign="right"
                        />

                        <Text style={styles.modalLabel}>תוכן ההודעה</Text>
                        <TextInput
                            style={[styles.modalInput, { minHeight: 100 }]}
                            value={notifBody}
                            onChangeText={setNotifBody}
                            placeholder="כתוב את ההודעה כאן..."
                            placeholderTextColor="#94A3B8"
                            textAlign="right"
                            multiline
                            textAlignVertical="top"
                            autoFocus
                        />

                        <TouchableOpacity
                            style={[styles.modalSendBtn, sendingNotification && { opacity: 0.6 }]}
                            onPress={handleSendNotification}
                            disabled={sendingNotification}
                        >
                            {sendingNotification ? (
                                <Spinner size="sm" />
                            ) : (
                                <Bell size={18} color="#fff" />
                            )}
                            <Text style={styles.modalSendBtnText}>
                                {sendingNotification ? 'שולח...' : 'שלח התראה'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F2F7' },
    centered: { justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        marginBottom:10,
        overflow: 'hidden',
    },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
    headerTitle: { fontSize: 24, fontFamily: Fonts.black, color: '#fff' },
    scrollContent: { paddingHorizontal: 20, paddingTop: 10 },

    // Profile
    profileSection: { alignItems: 'center', marginBottom: 24 },
    avatarContainer: {
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        marginBottom: 25,
    },
    avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#fff' },
    statusIndicator: {
        position: 'absolute', bottom: 2, right: 2, width: 24, height: 24,
        borderRadius: 12, borderWidth: 3, borderColor: '#fff',
    },
    achievementBadge: {
        position: 'absolute', bottom: 0, left: 0, width: 32, height: 32,
        borderRadius: 16, borderWidth: 3, borderColor: '#fff', backgroundColor: '#fff',
    },
    avatarPlaceholder: { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
    avatarInitials: { fontSize: 36, fontFamily: Fonts.bold, color: '#6B7280' },
    clientName: { fontSize: 24, fontFamily: Fonts.bold, color: '#000', marginBottom: 4 },
    clientEmail: { fontSize: 14, color: '#64748B', marginBottom: 8 },
    phoneButton: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6,
        marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 4,
    },
    phoneText: { fontSize: 14, fontWeight: '500', color: '#000' },
    statusChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontSize: 12, fontFamily: Fonts.bold },
    blockedBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8,
        backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    },
    blockedBannerText: { fontSize: 12, fontWeight: '600', color: '#EF4444' },

    // Stats Card
    statsCard: {
        backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10,
    },
    statsRow: { flexDirection: 'row', alignItems: 'center' },
    statItem: { flex: 1, alignItems: 'center', gap: 4 },
    statDivider: { width: 1, height: 40, backgroundColor: '#E5E7EB' },
    statValue: { fontSize: 20, fontFamily: Fonts.black, color: '#0F172A', textAlign: 'center' },
    statLabel: { fontSize: 13, fontFamily: Fonts.medium, color: '#94A3B8' },
    lastClassText: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 12 },

    // Hero Card (Subscription/Ticket)
    heroCard: {
        backgroundColor: '#fff', borderRadius: 24, padding: 24, marginBottom: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 24,
    },
    heroCardFrozen: { backgroundColor: '#F8FAFF', borderWidth: 1, borderColor: '#DBEAFE' },
    cardHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
    },
    cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardTitle: { fontSize: 16, color: '#64748B', fontWeight: '600' },
    planName: {
        fontSize: 16, fontWeight: '700', color: '#000', backgroundColor: '#F3F4F6',
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, overflow: 'hidden',
    },
    counterLabel: { fontSize: 13, color: '#94A3B8', fontWeight: '600', textAlign: 'center', marginBottom: 8 },
    counterContainer: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24,
    },
    counterBtn: {
        width: 50, height: 50, borderRadius: 25, backgroundColor: '#F3F4F6',
        alignItems: 'center', justifyContent: 'center',
    },
    counterValue: { fontSize: 48, fontWeight: '800', color: '#000', fontVariant: ['tabular-nums'] },
    counterTotal: { fontSize: 24, fontWeight: '600', color: '#94A3B8' },
    divider: { height: 1, backgroundColor: '#E5E7EB', marginBottom: 20 },
    dateSection: { gap: 12 },
    dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    dateLabel: { fontSize: 15, color: '#64748B', marginLeft: 8, flex: 1, textAlign: 'left',},
    dateValue: { fontSize: 18, fontWeight: '700', color: '#000', textAlign: 'left',flex:3 },
    debtBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16,
        backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    },
    debtText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
    freezeInfo: {
        flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12,
        backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    },
    freezeInfoText: { fontSize: 12, fontWeight: '600', color: '#3B82F6', flex: 1 },
    cancelTicketBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        marginTop: 16, paddingVertical: 10, borderRadius: 12,
        borderWidth: 1, borderColor: '#FECACA',
    },
    cancelTicketText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },

    // Assign Plan
    assignSection: { marginBottom: 24 },
    planOption: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10,
        borderWidth: 2, borderColor: '#F1F5F9',
    },
    planOptionSelected: { borderColor: Colors.primary },
    planOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    planOptionName: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
    planOptionPrice: { fontSize: 13, color: '#64748B', marginTop: 2 },
    planOptionType: { fontSize: 12, fontWeight: '600', color: '#94A3B8' },
    dateInputs: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    dateInputGroup: { flex: 1 },
    dateInputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6, textAlign: 'right' },
    dateInput: {
        backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
        paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: '#0F172A',
    },
    assignButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 14,
    },
    assignButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },

    // Freeze Input
    freezeInputCard: {
        backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 24,
        borderWidth: 1, borderColor: '#DBEAFE',
    },
    freezeInputTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 12, textAlign: 'right' },
    freezeTextInput: {
        backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
        paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0F172A', marginBottom: 16,
    },
    freezeInputActions: { flexDirection: 'row', gap: 12 },
    freezeInputCancel: {
        flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12,
        borderWidth: 1, borderColor: '#E2E8F0',
    },
    freezeInputCancelText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
    freezeInputConfirm: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        backgroundColor: '#3B82F6', paddingVertical: 12, borderRadius: 12,
    },
    freezeInputConfirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },

    // Actions Grid
    sectionTitle: { fontSize: 20, fontFamily: Fonts.bold, color: '#000', marginBottom: 16, textAlign: 'left' },
    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    actionCard: {
        width: '47%', backgroundColor: '#fff', borderRadius: 20, padding: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05,
        shadowRadius: 10, alignItems: 'flex-start',
    },
    actionCardActive: { backgroundColor: '#3B82F6' },
    actionCardDanger: { backgroundColor: '#fff' },
    actionCardBlocked: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#FECACA' },
    iconCircle: {
        width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    },
    actionTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 4 },
    actionSubtitle: { fontSize: 12, color: '#64748B', fontWeight: '500' },

    // Collapsible Sections
    sectionCard: {
        backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8,
    },
    sectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
    countBadge: {
        backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
    },
    countBadgeText: { fontSize: 13, fontWeight: '700', color: '#64748B' },

    // History Items
    historyItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 4,
    },
    historyItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    historyItemTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
    historyItemDate: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
    statusDot: { width: 10, height: 10, borderRadius: 5 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    statusBadgeText: { fontSize: 13, fontWeight: '700' },
    invoiceRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

    // Notes
    noteInputRow: {
        flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 12,
    },
    noteInput: {
        flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
        paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#0F172A', maxHeight: 80,
    },
    noteAddBtn: {
        width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primary,
        alignItems: 'center', justifyContent: 'center',
    },
    noteItem: {
        paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 4,
    },
    noteText: { fontSize: 14, color: '#0F172A', textAlign: 'right', lineHeight: 20 },
    noteMeta: { fontSize: 11, color: '#94A3B8', textAlign: 'right', marginTop: 4 },

    // Modal
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20,
    },
    modalContainer: {
        backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '100%',
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
    modalSubtext: { fontSize: 13, color: '#94A3B8', textAlign: 'right', marginBottom: 16 },
    modalLabel: { fontSize: 14, fontWeight: '600', color: '#374151', textAlign: 'right', marginBottom: 6 },
    modalInput: {
        backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
        fontSize: 15, color: '#0F172A', textAlign: 'right', marginBottom: 14,
    },
    modalSendBtn: {
        backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
        flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 6,
    },
    modalSendBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

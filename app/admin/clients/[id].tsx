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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
    ChevronRight,
    Plus,
    Minus,
    Calendar,
    Snowflake,
    Trash2,
    MessageCircle,
    Ban,
    ShieldOff,
    Clock,
    Award,
    TrendingUp,
    AlertTriangle,
    DollarSign,
    Ticket,
    CreditCard,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import Fonts from '@/constants/typography';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
    useAdminClients,
    ClientDetail,
    AvailablePlan,
} from '@/hooks/admin/useAdminClients';

export default function ClientManagerScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
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
    } = useAdminClients();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [client, setClient] = useState<ClientDetail | null>(null);
    const [availablePlans, setAvailablePlans] = useState<AvailablePlan[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [assignStartDate, setAssignStartDate] = useState('');
    const [assignEndDate, setAssignEndDate] = useState('');
    const [freezeReasonInput, setFreezeReasonInput] = useState('');
    const [showFreezeInput, setShowFreezeInput] = useState(false);

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

    const handleExtendDate = async (type: 'week' | 'month') => {
        if (!client?.subscription) return;
        const current = new Date(client.subscription.end_date);
        const newDate = new Date(current);
        if (type === 'week') newDate.setDate(newDate.getDate() + 7);
        else newDate.setMonth(newDate.getMonth() + 1);

        setClient(prev => prev && prev.subscription ? {
            ...prev,
            subscription: { ...prev.subscription, end_date: newDate.toISOString() },
        } : prev);

        try {
            await updateSubscription(client.subscription.id, { end_date: newDate.toISOString() });
        } catch {
            Alert.alert('שגיאה', 'לא ניתן לעדכן');
            await loadData();
        }
    };

    const onDateChange = async (_: any, selectedDate?: Date) => {
        setShowDatePicker(false);
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

                        {/* Expiry */}
                        <View style={styles.dateSection}>
                            <View style={styles.dateRow}>
                                <Calendar size={18} color="#64748B" />
                                <Text style={styles.dateLabel}>בתוקף עד:</Text>
                                <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                                    <Text style={styles.dateValue}>
                                        {formatDate(client.subscription.end_date)}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.quickActions}>
                                <TouchableOpacity style={styles.chip} onPress={() => handleExtendDate('week')}>
                                    <Text style={styles.chipText}>+ שבוע</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.chip} onPress={() => handleExtendDate('month')}>
                                    <Text style={styles.chipText}>+ חודש</Text>
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

                {/* ── Admin Actions Grid ── */}
                <Text style={styles.sectionTitle}>פעולות מנהל</Text>
                <View style={styles.actionsGrid}>
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

            {showDatePicker && client.subscription && (
                <DateTimePicker
                    value={new Date(client.subscription.end_date)}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                />
            )}
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
        fontSize: 14, fontWeight: '700', color: '#000', backgroundColor: '#F3F4F6',
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
    dateSection: { gap: 16 },
    dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    dateLabel: { fontSize: 15, color: '#64748B', marginLeft: 8, flex: 1 },
    dateValue: { fontSize: 16, fontWeight: '700', color: '#000' },
    quickActions: { flexDirection: 'row', gap: 12 },
    chip: { backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
    chipText: { fontSize: 13, fontWeight: '600', color: '#000' },
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
});

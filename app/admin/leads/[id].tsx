// app/admin/leads/[id].tsx
// Lead Detail — Command Center

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Alert,
    TextInput,
    Modal,
    Linking,
    RefreshControl,
    ActivityIndicator,
    Platform,

} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { CRMManager } from '@/lib/services/crm-manager';
import { Lead, LeadInteraction, LeadStatus, MessageTemplate } from '@/constants/crm-types';
import Colors from '@/constants/colors';

// ─── Constants ──────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
    direct: 'ישירות',
    referral: 'חבר מביא חבר',
    instagram: 'אינסטגרם',
    facebook: 'פייסבוק',
    google: 'גוגל',
    website: 'אתר',
    whatsapp: 'וואטסאפ',
    other: 'אחר',
};

const SOURCE_COLORS: Record<string, string> = {
    website: '#10b981',
    instagram: '#E1306C',
    facebook: '#1877F2',
    referral: '#8b5cf6',
    google: '#EA4335',
    whatsapp: '#25D366',
    direct: '#6b7280',
    other: '#94A3B8',
};

const STATUS_LABELS: Record<LeadStatus, string> = {
    new: 'חדש',
    contacted: 'יצרנו קשר',
    interested: 'מעוניין/ת',
    trial_scheduled: 'ניסיון נקבע',
    trial_completed: 'ניסיון הושלם',
    converted: 'לקוח!',
    not_interested: 'לא רלוונטי',
    no_response: 'אין מענה',
};

const STATUS_COLORS: Record<LeadStatus, string> = {
    new: '#94A3B8',
    contacted: '#3B82F6',
    interested: '#8B5CF6',
    trial_scheduled: '#F59E0B',
    trial_completed: '#10B981',
    converted: Colors.primary,
    not_interested: '#EF4444',
    no_response: '#6b7280',
};

const PIPELINE_STAGES: LeadStatus[] = [
    'new',
    'contacted',
    'interested',
    'trial_scheduled',
    'trial_completed',
    'converted',
];

const EXITED_STATUSES: LeadStatus[] = ['not_interested', 'no_response'];

// ─── Helpers ──────────────────────────────────────────

function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'עכשיו';
    if (diffMins < 60) return `לפני ${diffMins} דק׳`;
    if (diffHours < 24) return `לפני ${diffHours} שע׳`;
    if (diffDays === 1) return 'אתמול';
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`;
    return new Date(dateStr).toLocaleDateString('he-IL');
}

function getStageIndex(status: LeadStatus): number {
    const idx = PIPELINE_STAGES.indexOf(status);
    return idx >= 0 ? idx : -1;
}

// ─── Component ──────────────────────────────────────────

export default function LeadDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();

    const [lead, setLead] = useState<Lead | null>(null);
    const [interactions, setInteractions] = useState<LeadInteraction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);

    // Modals
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Form state
    const [messageText, setMessageText] = useState('');
    const [noteText, setNoteText] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    const [savingNote, setSavingNote] = useState(false);
    const [trialDate, setTrialDate] = useState(new Date());

    // Info section expand
    const [infoExpanded, setInfoExpanded] = useState(false);

    // ─── Data Loading ─────────────────

    const loadData = useCallback(async () => {
        if (!id) return;
        try {
            const [leadData, templatesData] = await Promise.all([
                CRMManager.getLeadWithInteractions(id),
                CRMManager.getMessageTemplates(),
            ]);
            setLead(leadData.lead);
            setInteractions(leadData.interactions);
            setTemplates(templatesData);
        } catch (error) {
            console.error('[LeadDetail] Error loading:', error);
            Alert.alert('שגיאה', 'לא הצלחנו לטעון את פרטי הליד');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, [loadData]);

    // ─── Handlers ─────────────────

    const handleStatusChange = async (newStatus: LeadStatus) => {
        const label = STATUS_LABELS[newStatus] || newStatus;
        Alert.alert(
            'שינוי סטטוס',
            `לשנות סטטוס ל"${label}"?`,
            [
                { text: 'ביטול', style: 'cancel' },
                {
                    text: 'שינוי',
                    onPress: async () => {
                        const success = await CRMManager.updateLeadStatus(id, newStatus);
                        if (success) {
                            await loadData();
                        } else {
                            Alert.alert('שגיאה', 'לא הצלחנו לעדכן את הסטטוס');
                        }
                    },
                },
            ]
        );
    };

    const handleCall = () => {
        if (!lead) return;
        Linking.openURL(`tel:${lead.phone}`);
    };

    const handleCopyPhone = () => {
        if (!lead) return;
        Alert.alert('הועתק!', lead.phone);
    };

    const handleCopyEmail = () => {
        if (!lead?.email) return;
        Alert.alert('הועתק!', lead.email);
    };

    const handleSendWhatsApp = async () => {
        if (!messageText.trim() || !lead) return;
        setSendingMessage(true);
        try {
            const success = await CRMManager.sendWhatsAppMessage(id, messageText);
            if (success) {
                setMessageText('');
                setShowWhatsAppModal(false);
                await loadData();
            } else {
                Alert.alert('שגיאה', 'לא הצלחנו לשלוח את ההודעה');
            }
        } catch (error) {
            Alert.alert('שגיאה', 'לא הצלחנו לשלוח את ההודעה');
        } finally {
            setSendingMessage(false);
        }
    };

    const handleAddNote = async () => {
        if (!noteText.trim()) return;
        setSavingNote(true);
        try {
            await CRMManager.addInteraction({
                lead_id: id,
                interaction_type: 'note',
                subject: 'הערה',
                message: noteText.trim(),
            });
            setNoteText('');
            setShowNoteModal(false);
            await loadData();
        } catch (error) {
            Alert.alert('שגיאה', 'לא ניתן לשמור הערה');
        } finally {
            setSavingNote(false);
        }
    };

    const handleScheduleTrial = () => {
        setTrialDate(new Date());
        setShowDatePicker(true);
    };

    const handleDateChange = async (_event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (selectedDate) {
            setTrialDate(selectedDate);
            if (Platform.OS === 'android') {
                await confirmScheduleTrial(selectedDate);
            }
        }
    };

    const confirmScheduleTrial = async (date: Date) => {
        setShowDatePicker(false);
        const success = await CRMManager.scheduleTrialClass(id, date.toISOString());
        if (success) {
            await loadData();
        } else {
            Alert.alert('שגיאה', 'לא הצלחנו לקבוע אימון ניסיון');
        }
    };

    const handleMarkTrialCompleted = () => {
        Alert.alert(
            'אימון ניסיון',
            'לסמן שהאימון הושלם?',
            [
                { text: 'ביטול', style: 'cancel' },
                {
                    text: 'הושלם!',
                    onPress: async () => {
                        const success = await CRMManager.markTrialCompleted(id);
                        if (success) await loadData();
                        else Alert.alert('שגיאה', 'לא הצלחנו לעדכן');
                    },
                },
            ]
        );
    };

    const handleTrialNoShow = () => {
        Alert.alert(
            'לא הגיע',
            'לסמן שהליד לא הגיע לאימון?',
            [
                { text: 'ביטול', style: 'cancel' },
                {
                    text: 'כן',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await CRMManager.updateLeadStatus(id, 'no_response');
                        if (success) await loadData();
                    },
                },
            ]
        );
    };

    const handleConvertLead = () => {
        Alert.alert(
            'המרה ללקוח! 🎉',
            'להמיר את הליד ללקוח משלם?',
            [
                { text: 'ביטול', style: 'cancel' },
                {
                    text: 'המר!',
                    onPress: async () => {
                        const success = await CRMManager.convertLead(id, '');
                        if (success) {
                            Alert.alert('מזל טוב! 🎉', 'הליד הומר ללקוח בהצלחה!');
                            await loadData();
                        } else {
                            Alert.alert('שגיאה', 'לא הצלחנו להמיר');
                        }
                    },
                },
            ]
        );
    };

    const handleDelete = () => {
        Alert.alert(
            'מחיקת ליד',
            `למחוק את ${lead?.name}? פעולה זו לא ניתנת לביטול.`,
            [
                { text: 'ביטול', style: 'cancel' },
                {
                    text: 'מחק',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await CRMManager.deleteLead(id);
                        if (success) {
                            router.back();
                        } else {
                            Alert.alert('שגיאה', 'לא ניתן למחוק ליד');
                        }
                    },
                },
            ]
        );
    };

    // ─── Loading State ─────────────────

    if (loading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} />
            </View>
        );
    }

    if (!lead) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <Text style={styles.errorText}>ליד לא נמצא</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>חזרה</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const currentStageIndex = getStageIndex(lead.status);
    const isExited = EXITED_STATUSES.includes(lead.status);
    const sourceColor = SOURCE_COLORS[lead.source] || '#94A3B8';
    const statusColor = STATUS_COLORS[lead.status] || '#94A3B8';

    // ─── Render Sections ─────────────────

    const renderHeader = () => (
        <LinearGradient
            colors={['#0F172A', '#1E293B']}
            style={[styles.header, { paddingTop: insets.top + 12 }]}
        >
            <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
                <Ionicons name="trash-outline" size={22} color="#EF4444" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>פרטי ליד</Text>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                <Ionicons name="arrow-forward" size={24} color="#fff" />
            </TouchableOpacity>
        </LinearGradient>
    );

    const renderIdentityCard = () => (
        <View style={styles.identityCard}>
            <View style={styles.identityRow}>
                {/* Source Badge */}
                <View style={[styles.sourceBadge, { backgroundColor: sourceColor + '18' }]}>
                    <Text style={[styles.sourceBadgeText, { color: sourceColor }]}>
                        {SOURCE_LABELS[lead.source] || lead.source}
                    </Text>
                </View>

                {/* Info */}
                <View style={styles.identityInfo}>
                    <Text style={styles.identityName}>{lead.name}</Text>
                    <TouchableOpacity onPress={handleCopyPhone} activeOpacity={0.6}>
                        <Text style={styles.identityPhone}>{lead.phone}</Text>
                    </TouchableOpacity>
                    {lead.email && (
                        <TouchableOpacity onPress={handleCopyEmail} activeOpacity={0.6}>
                            <Text style={styles.identityEmail}>{lead.email}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Avatar */}
                <View style={[styles.avatar, { backgroundColor: statusColor + '20' }]}>
                    <Text style={[styles.avatarText, { color: statusColor }]}>
                        {lead.name.charAt(0)}
                    </Text>
                </View>
            </View>
        </View>
    );

    const renderPipeline = () => {
        return (
            <View style={styles.pipelineCard}>
                <Text style={styles.sectionTitle}>מסע הליד</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.pipelineScroll}
                    style={{ direction: 'rtl' }}
                >
                    {PIPELINE_STAGES.map((stage, index) => {
                        const isCompleted = currentStageIndex >= 0 && index < currentStageIndex;
                        const isCurrent = stage === lead.status;
                        const isFuture = currentStageIndex >= 0 && index > currentStageIndex;
                        const isNextStep = currentStageIndex >= 0 && index === currentStageIndex + 1;
                        const stageColor = STATUS_COLORS[stage];

                        return (
                            <View key={stage} style={styles.pipelineStepContainer}>
                                {/* Connecting Line (before) */}
                                {index > 0 && (
                                    <View
                                        style={[
                                            styles.pipelineLine,
                                            {
                                                backgroundColor: isCompleted || isCurrent
                                                    ? stageColor
                                                    : '#E2E8F0',
                                            },
                                        ]}
                                    />
                                )}

                                {/* Circle + Label */}
                                <TouchableOpacity
                                    style={styles.pipelineStep}
                                    onPress={() => {
                                        if (isNextStep && !isExited) {
                                            handleStatusChange(stage);
                                        }
                                    }}
                                    disabled={!isNextStep || isExited}
                                    activeOpacity={isNextStep ? 0.6 : 1}
                                >
                                    <View
                                        style={[
                                            styles.pipelineCircle,
                                            isCurrent && styles.pipelineCircleCurrent,
                                            isCompleted && { backgroundColor: stageColor },
                                            isCurrent && { backgroundColor: stageColor, borderColor: stageColor },
                                            isFuture && { borderColor: '#E2E8F0', backgroundColor: '#fff' },
                                            isExited && !isCompleted && !isCurrent && { borderColor: '#E2E8F0', backgroundColor: '#fff' },
                                        ]}
                                    >
                                        {isCompleted ? (
                                            <Ionicons name="checkmark" size={14} color="#fff" />
                                        ) : isCurrent ? (
                                            <View style={[styles.pipelineDot, { backgroundColor: '#fff' }]} />
                                        ) : null}
                                    </View>
                                    <Text
                                        style={[
                                            styles.pipelineLabel,
                                            isCurrent && { color: stageColor, fontWeight: '700' },
                                            isCompleted && { color: stageColor },
                                            isFuture && { color: '#94A3B8' },
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {STATUS_LABELS[stage]}
                                    </Text>
                                    {isNextStep && !isExited && (
                                        <Text style={[styles.pipelineTap, { color: stageColor }]}>
                                            לחץ
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </ScrollView>

                {/* Exited indicator */}
                {isExited && (
                    <View style={styles.exitedBanner}>
                        <Ionicons
                            name={lead.status === 'not_interested' ? 'close-circle' : 'time'}
                            size={18}
                            color="#EF4444"
                        />
                        <Text style={styles.exitedText}>
                            {STATUS_LABELS[lead.status]}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    const renderQuickActions = () => {
        const actions = [
            {
                icon: 'logo-whatsapp' as const,
                label: 'WhatsApp',
                color: '#25D366',
                onPress: () => setShowWhatsAppModal(true),
            },
            {
                icon: 'call' as const,
                label: 'התקשר',
                color: '#3B82F6',
                onPress: handleCall,
            },
            {
                icon: 'calendar' as const,
                label: 'קבע ניסיון',
                color: '#F59E0B',
                onPress: handleScheduleTrial,
            },
            {
                icon: 'document-text' as const,
                label: 'הוסף הערה',
                color: '#8B5CF6',
                onPress: () => setShowNoteModal(true),
            },
        ];

        return (
            <View style={styles.actionsGrid}>
                {actions.map((action) => (
                    <TouchableOpacity
                        key={action.label}
                        style={styles.actionCard}
                        onPress={action.onPress}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.actionIconCircle, { backgroundColor: action.color + '15' }]}>
                            <Ionicons name={action.icon} size={22} color={action.color} />
                        </View>
                        <Text style={styles.actionLabel}>{action.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    const renderTrialCard = () => {
        // Trial scheduled but not completed
        if (lead.status === 'trial_scheduled' && lead.trial_class_date) {
            const trialDateObj = new Date(lead.trial_class_date);
            return (
                <View style={[styles.trialCard, { borderColor: '#F59E0B' }]}>
                    <View style={styles.trialHeader}>
                        <Ionicons name="calendar" size={22} color="#F59E0B" />
                        <Text style={styles.trialTitle}>אימון ניסיון קבוע</Text>
                    </View>
                    <Text style={styles.trialDate}>
                        {trialDateObj.toLocaleDateString('he-IL', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })}
                    </Text>
                    <View style={styles.trialActions}>
                        <TouchableOpacity
                            style={[styles.trialButton, { backgroundColor: '#10B981' }]}
                            onPress={handleMarkTrialCompleted}
                        >
                            <Ionicons name="checkmark" size={18} color="#fff" />
                            <Text style={styles.trialButtonText}>הגיע</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.trialButton, { backgroundColor: '#EF4444' }]}
                            onPress={handleTrialNoShow}
                        >
                            <Ionicons name="close" size={18} color="#fff" />
                            <Text style={styles.trialButtonText}>לא הגיע</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.trialButton, { backgroundColor: '#6b7280' }]}
                            onPress={handleScheduleTrial}
                        >
                            <Ionicons name="refresh" size={18} color="#fff" />
                            <Text style={styles.trialButtonText}>שנה</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        // Trial completed
        if (lead.status === 'trial_completed' || lead.trial_class_completed) {
            return (
                <View style={[styles.trialCard, { borderColor: '#10B981' }]}>
                    <View style={styles.trialHeader}>
                        <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                        <Text style={styles.trialTitle}>אימון ניסיון הושלם</Text>
                    </View>
                    {lead.trial_class_feedback && (
                        <Text style={styles.trialFeedback}>{lead.trial_class_feedback}</Text>
                    )}
                    <TouchableOpacity
                        style={[styles.convertButton]}
                        onPress={handleConvertLead}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.convertButtonText}>המרה ללקוח! 🎉</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        // No trial & early status
        if (['new', 'contacted', 'interested'].includes(lead.status)) {
            return (
                <TouchableOpacity
                    style={styles.trialBanner}
                    onPress={handleScheduleTrial}
                    activeOpacity={0.7}
                >
                    <Ionicons name="calendar-outline" size={20} color="#F59E0B" />
                    <Text style={styles.trialBannerText}>
                        לא נקבע אימון ניסיון — קבע עכשיו
                    </Text>
                    <Ionicons name="chevron-back" size={18} color="#F59E0B" />
                </TouchableOpacity>
            );
        }

        return null;
    };

    const renderLeadInfo = () => (
        <View style={styles.infoCard}>
            <TouchableOpacity
                style={styles.infoToggle}
                onPress={() => setInfoExpanded(!infoExpanded)}
                activeOpacity={0.7}
            >
                <Ionicons
                    name={infoExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#94A3B8"
                />
                <Text style={styles.sectionTitle}>פרטי ליד</Text>
            </TouchableOpacity>

            {infoExpanded && (
                <View style={styles.infoContent}>
                    {/* Source */}
                    <View style={styles.infoRow}>
                        <View style={[styles.infoSourceDot, { backgroundColor: sourceColor }]} />
                        <Text style={styles.infoValue}>
                            {SOURCE_LABELS[lead.source] || lead.source}
                        </Text>
                        <Text style={styles.infoLabel}>מקור</Text>
                    </View>

                    {/* Tags */}
                    {lead.tags && lead.tags.length > 0 && (
                        <View style={styles.infoRow}>
                            <View style={styles.tagsRow}>
                                {lead.tags.map((tag, i) => (
                                    <View key={i} style={styles.tag}>
                                        <Text style={styles.tagText}>{tag}</Text>
                                    </View>
                                ))}
                            </View>
                            <Text style={styles.infoLabel}>תגיות</Text>
                        </View>
                    )}

                    {/* Notes */}
                    {lead.notes && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoValue}>{lead.notes}</Text>
                            <Text style={styles.infoLabel}>הערות</Text>
                        </View>
                    )}

                    {/* Referral */}
                    {lead.referred_by_user_id && (
                        <View style={styles.referralBanner}>
                            <Ionicons name="people" size={18} color={Colors.primary} />
                            <Text style={styles.referralText}>חבר מביא חבר 🎉</Text>
                        </View>
                    )}

                    {/* Dates */}
                    <View style={styles.datesRow}>
                        <View style={styles.dateItem}>
                            <Text style={styles.dateLabel}>נוצר</Text>
                            <Text style={styles.dateValue}>{timeAgo(lead.created_at)}</Text>
                        </View>
                        <View style={styles.dateItem}>
                            <Text style={styles.dateLabel}>עודכן</Text>
                            <Text style={styles.dateValue}>{timeAgo(lead.updated_at)}</Text>
                        </View>
                        <View style={styles.dateItem}>
                            <Text style={styles.dateLabel}>קשר אחרון</Text>
                            <Text
                                style={[
                                    styles.dateValue,
                                    !lead.last_contact_at && { color: '#EF4444' },
                                ]}
                            >
                                {lead.last_contact_at
                                    ? timeAgo(lead.last_contact_at)
                                    : 'אין עדיין'}
                            </Text>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );

    const renderTimeline = () => {
        const INTERACTION_ICONS: Record<string, string> = {
            whatsapp_sent: 'logo-whatsapp',
            whatsapp_received: 'logo-whatsapp',
            phone_call: 'call',
            email_sent: 'mail',
            meeting: 'people',
            trial_class: 'fitness',
            note: 'document-text',
            status_change: 'swap-horizontal',
        };

        const INTERACTION_COLORS: Record<string, string> = {
            whatsapp_sent: '#25D366',
            whatsapp_received: '#128C7E',
            phone_call: '#3B82F6',
            email_sent: '#8B5CF6',
            meeting: '#EC4899',
            trial_class: '#F59E0B',
            note: '#6b7280',
            status_change: '#10B981',
        };

        // Build timeline items: interactions + auto "created" entry
        const timelineItems = [
            ...interactions,
        ];

        return (
            <View style={styles.timelineCard}>
                <Text style={styles.sectionTitle}>ציר זמן</Text>

                {timelineItems.length === 0 && !lead.created_at ? (
                    <View style={styles.emptyTimeline}>
                        <Ionicons name="chatbubble-outline" size={32} color="#CBD5E1" />
                        <Text style={styles.emptyTimelineText}>
                            אין פעילות עדיין — שלח הודעה ראשונה!
                        </Text>
                        <TouchableOpacity
                            style={styles.emptyWhatsAppCta}
                            onPress={() => setShowWhatsAppModal(true)}
                        >
                            <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                            <Text style={styles.emptyCtaText}>שלח WhatsApp</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.timeline}>
                        {timelineItems.map((item, index) => {
                            const iconName = INTERACTION_ICONS[item.interaction_type] || 'ellipse';
                            const iconColor = INTERACTION_COLORS[item.interaction_type] || '#6b7280';
                            const isLast = index === timelineItems.length - 1 && !lead.created_at;

                            return (
                                <View key={item.id} style={styles.timelineItem}>
                                    {/* Connector line */}
                                    <View style={styles.timelineConnector}>
                                        <View
                                            style={[
                                                styles.timelineCircle,
                                                { backgroundColor: iconColor },
                                            ]}
                                        >
                                            <Ionicons
                                                name={iconName as any}
                                                size={14}
                                                color="#fff"
                                            />
                                        </View>
                                        {(!isLast || lead.created_at) && (
                                            <View style={styles.timelineLineDown} />
                                        )}
                                    </View>

                                    {/* Content */}
                                    <View style={styles.timelineContent}>
                                        <View style={styles.timelineRow}>
                                            <Text style={styles.timelineTime}>
                                                {timeAgo(item.created_at)}
                                            </Text>
                                            <Text style={styles.timelineSubject}>
                                                {item.subject || item.interaction_type}
                                            </Text>
                                        </View>
                                        {item.message && (
                                            <Text style={styles.timelineMessage} numberOfLines={3}>
                                                {item.message}
                                            </Text>
                                        )}
                                        {item.is_automated && (
                                            <View style={styles.automatedBadge}>
                                                <Ionicons name="flash" size={11} color="#F59E0B" />
                                                <Text style={styles.automatedText}>אוטומטי</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            );
                        })}

                        {/* Auto "created" entry */}
                        {lead.created_at && (
                            <View style={styles.timelineItem}>
                                <View style={styles.timelineConnector}>
                                    <View
                                        style={[
                                            styles.timelineCircle,
                                            { backgroundColor: '#94A3B8' },
                                        ]}
                                    >
                                        <Ionicons name="add" size={14} color="#fff" />
                                    </View>
                                </View>
                                <View style={styles.timelineContent}>
                                    <View style={styles.timelineRow}>
                                        <Text style={styles.timelineTime}>
                                            {timeAgo(lead.created_at)}
                                        </Text>
                                        <Text style={styles.timelineSubject}>ליד נוצר</Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                )}
            </View>
        );
    };

    const renderWhatsAppModal = () => (
        <Modal
            visible={showWhatsAppModal}
            animationType="slide"
            transparent
            onRequestClose={() => setShowWhatsAppModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
                    <View style={styles.modalHeader}>
                        <View style={{ width: 24 }} />
                        <Text style={styles.modalTitle}>שליחת WhatsApp</Text>
                        <TouchableOpacity onPress={() => setShowWhatsAppModal(false)}>
                            <Ionicons name="close" size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    {/* Template Chips */}
                    {templates.length > 0 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.templateChips}
                            style={{ direction: 'rtl' }}
                        >
                            {templates.map((t) => (
                                <TouchableOpacity
                                    key={t.id}
                                    style={styles.templateChip}
                                    onPress={() => {
                                        const msg = t.message_text
                                            .replace(/{name}/g, lead.name)
                                            .replace(/{phone}/g, lead.phone);
                                        setMessageText(msg);
                                    }}
                                >
                                    <Text style={styles.templateChipText}>{t.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}

                    <TextInput
                        style={styles.messageInput}
                        multiline
                        numberOfLines={6}
                        placeholder="כתוב הודעה..."
                        placeholderTextColor="#94A3B8"
                        value={messageText}
                        onChangeText={setMessageText}
                        textAlign="right"
                    />

                    <TouchableOpacity
                        style={[
                            styles.modalSendButton,
                            (!messageText.trim() || sendingMessage) && { opacity: 0.5 },
                        ]}
                        onPress={handleSendWhatsApp}
                        disabled={!messageText.trim() || sendingMessage}
                    >
                        {sendingMessage ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="send" size={18} color="#fff" />
                                <Text style={styles.modalSendText}>שלח</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const renderNoteModal = () => (
        <Modal
            visible={showNoteModal}
            animationType="slide"
            transparent
            onRequestClose={() => setShowNoteModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
                    <View style={styles.modalHeader}>
                        <View style={{ width: 24 }} />
                        <Text style={styles.modalTitle}>הוספת הערה</Text>
                        <TouchableOpacity onPress={() => setShowNoteModal(false)}>
                            <Ionicons name="close" size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        style={styles.messageInput}
                        multiline
                        numberOfLines={6}
                        placeholder="כתוב הערה..."
                        placeholderTextColor="#94A3B8"
                        value={noteText}
                        onChangeText={setNoteText}
                        textAlign="right"
                    />

                    <TouchableOpacity
                        style={[
                            styles.modalSendButton,
                            { backgroundColor: '#8B5CF6' },
                            (!noteText.trim() || savingNote) && { opacity: 0.5 },
                        ]}
                        onPress={handleAddNote}
                        disabled={!noteText.trim() || savingNote}
                    >
                        {savingNote ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="checkmark" size={18} color="#fff" />
                                <Text style={styles.modalSendText}>שמור</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    // ─── Main Render ─────────────────

    return (
        <View style={styles.container}>
            {renderHeader()}

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {renderIdentityCard()}
                {renderPipeline()}
                {renderQuickActions()}
                {renderTrialCard()}
                {renderLeadInfo()}
                {renderTimeline()}
            </ScrollView>

            {renderWhatsAppModal()}
            {renderNoteModal()}

            {/* Date Picker */}
            {showDatePicker && (
                <Modal transparent animationType="fade">
                    <View style={styles.datePickerOverlay}>
                        <View style={styles.datePickerContainer}>
                            <View style={styles.datePickerHeader}>
                                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                    <Text style={styles.datePickerCancel}>ביטול</Text>
                                </TouchableOpacity>
                                <Text style={styles.datePickerTitle}>בחר תאריך</Text>
                                <TouchableOpacity onPress={() => confirmScheduleTrial(trialDate)}>
                                    <Text style={styles.datePickerDone}>אישור</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={trialDate}
                                mode="date"
                                display="spinner"
                                onChange={handleDateChange}
                                minimumDate={new Date()}
                                locale="he"
                            />
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F1F5F9',
    },
    errorText: {
        textAlign: 'center',
        marginTop: 60,
        fontSize: 16,
        color: '#64748B',
    },
    backButton: {
        alignSelf: 'center',
        marginTop: 16,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: Colors.primary,
    },
    backButtonText: {
        color: '#fff',
        fontWeight: '700',
    },

    // Header
    header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    headerButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#fff',
    },

    scrollView: {
        flex: 1,
    },

    // Identity Card
    identityCard: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    identityRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 14,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 24,
        fontWeight: '800',
    },
    identityInfo: {
        flex: 1,
        alignItems: 'flex-start',
    },
    identityName: {
        fontSize: 22,
        fontWeight: '900',
        color: '#0F172A',
        marginBottom: 4,
    },
    identityPhone: {
        fontSize: 15,
        color: '#3B82F6',
        fontWeight: '600',
        marginBottom: 2,
    },
    identityEmail: {
        fontSize: 13,
        color: '#64748B',
    },
    sourceBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        alignSelf: 'flex-start',
    },
    sourceBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },

    // Pipeline
    pipelineCard: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0F172A',
        textAlign: 'left',
        marginBottom: 14,
    },
    pipelineScroll: {
        paddingVertical: 8,
        gap: 0,
    },
    pipelineStepContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    pipelineLine: {
        width: 24,
        height: 2,
        marginTop: 14,
    },
    pipelineStep: {
        alignItems: 'center',
        width: 64,
    },
    pipelineCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    pipelineCircleCurrent: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 3,
    },
    pipelineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    pipelineLabel: {
        fontSize: 10,
        color: '#64748B',
        marginTop: 6,
        textAlign: 'center',
        fontWeight: '600',
    },
    pipelineTap: {
        fontSize: 9,
        fontWeight: '700',
        marginTop: 2,
    },
    exitedBanner: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    exitedText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#EF4444',
    },

    // Quick Actions
    actionsGrid: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginTop: 12,
        gap: 10,
    },
    actionCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    actionIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    actionLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#334155',
    },

    // Trial Card
    trialCard: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 20,
        padding: 20,
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    trialHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    trialTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
    },
    trialDate: {
        fontSize: 15,
        color: '#475569',
        textAlign: 'right',
        marginBottom: 14,
    },
    trialFeedback: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'right',
        marginBottom: 14,
    },
    trialActions: {
        flexDirection: 'row',
        gap: 10,
    },
    trialButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 6,
    },
    trialButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
    },
    convertButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    convertButtonText: {
        fontSize: 17,
        fontWeight: '800',
        color: '#fff',
    },
    trialBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginHorizontal: 16,
        marginTop: 12,
        backgroundColor: '#FFFBEB',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    trialBannerText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: '#92400E',
        textAlign: 'left',
    },

    // Lead Info
    infoCard: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    infoToggle: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    infoContent: {
        marginTop: 16,
    },
    infoRow: {
        flexDirection: 'row-reverse',
        alignItems: 'flex-start',
        marginBottom: 14,
        gap: 12,
    },
    infoLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#94A3B8',
        width: 70,
        textAlign: 'left',
    },
    infoValue: {
        flex: 1,
        fontSize: 14,
        color: '#334155',
        textAlign: 'right',
    },
    infoSourceDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginTop: 4,
    },
    tagsRow: {
        flex: 1,
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 6,
    },
    tag: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    tagText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#475569',
    },
    referralBanner: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FCE4EC',
        padding: 12,
        borderRadius: 12,
        marginBottom: 14,
    },
    referralText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primary,
    },
    datesRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    dateItem: {
        alignItems: 'center',
    },
    dateLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
        marginBottom: 4,
    },
    dateValue: {
        fontSize: 12,
        fontWeight: '700',
        color: '#334155',
    },

    // Timeline
    timelineCard: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    emptyTimeline: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    emptyTimelineText: {
        fontSize: 14,
        color: '#94A3B8',
        marginTop: 8,
        marginBottom: 14,
        textAlign: 'center',
    },
    emptyWhatsAppCta: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#25D36615',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    emptyCtaText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#25D366',
    },
    timeline: {},
    timelineItem: {
        flexDirection: 'row-reverse',
        marginBottom: 2,
    },
    timelineConnector: {
        alignItems: 'center',
        width: 36,
    },
    timelineCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timelineLineDown: {
        width: 2,
        flex: 1,
        backgroundColor: '#E2E8F0',
        minHeight: 16,
    },
    timelineContent: {
        flex: 1,
        paddingRight: 10,
        paddingBottom: 16,
    },
    timelineRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    timelineSubject: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A',
        textAlign: 'right',
    },
    timelineTime: {
        fontSize: 11,
        color: '#94A3B8',
    },
    timelineMessage: {
        fontSize: 13,
        color: '#64748B',
        lineHeight: 19,
        textAlign: 'right',
    },
    automatedBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 3,
        marginTop: 4,
    },
    automatedText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#F59E0B',
    },

    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
    },
    templateChips: {
        gap: 8,
        paddingBottom: 14,
    },
    templateChip: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
    },
    templateChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#475569',
    },
    messageInput: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        padding: 14,
        fontSize: 15,
        color: '#0F172A',
        minHeight: 120,
        textAlignVertical: 'top',
        marginBottom: 14,
    },
    modalSendButton: {
        backgroundColor: '#25D366',
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 14,
        gap: 8,
    },
    modalSendText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },

    // Date Picker
    datePickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    datePickerContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 30,
    },
    datePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    datePickerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
    },
    datePickerCancel: {
        fontSize: 15,
        color: '#64748B',
        fontWeight: '600',
    },
    datePickerDone: {
        fontSize: 15,
        color: Colors.primary,
        fontWeight: '700',
    },
});

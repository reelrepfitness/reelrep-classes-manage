import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Modal,
    TextInput,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components/ui/icon';
import UserAddIcon from '@/components/UserAddIcon';
import Colors from '@/constants/colors';
import { supabase } from '@/constants/supabase';

// --- Helper Functions ---
const formatDate = (dateStr: string) => {
    const days = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'יום שבת'];
    const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    const date = new Date(dateStr);
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
};

const getTimeUntilClass = (classDate: Date) => {
    const now = new Date();
    const diff = classDate.getTime() - now.getTime();

    if (diff < 0) return 'השיעור התחיל';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
        return `מתחיל בעוד: ${hours}h ${minutes}m`;
    }
    return `מתחיל בעוד: ${minutes}m`;
};

const getProgressColor = (ratio: number) => {
    if (ratio >= 1) return '#EF4444'; // Full - Red
    if (ratio >= 0.7) return '#F59E0B'; // Filling - Yellow
    return '#10B981'; // Open - Green
};

// --- Collapsible Training Content Card ---
const TrainingContentCard = ({
    description,
    onAddContent
}: {
    description?: string;
    onAddContent: () => void;
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <View style={trainingContentStyles.card}>
            <View style={trainingContentStyles.header}>
                <TouchableOpacity
                    style={trainingContentStyles.headerLeft}
                    onPress={() => setIsExpanded(!isExpanded)}
                    activeOpacity={0.7}
                >
                    <Text style={trainingContentStyles.title}>תוכן האימון</Text>
                    <Icon
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#6B7280"
                        strokeWidth={2.5}
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    style={trainingContentStyles.addButton}
                    onPress={onAddContent}
                    activeOpacity={0.7}
                >
                    <Icon name="plus" size={20} color={Colors.primary} strokeWidth={2.5} />
                </TouchableOpacity>
            </View>
            {isExpanded && (
                <View style={trainingContentStyles.content}>
                    <Text style={trainingContentStyles.description}>
                        {description || 'אין תיאור לאימון זה.'}
                    </Text>
                </View>
            )}
        </View>
    );
};

const trainingContentStyles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 8,
    },
    addButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: `${Colors.primary}15`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
    },
    content: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 12,
    },
    description: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 22,
        textAlign: 'right',
    },
});

// --- Add Client Modal ---
interface AddClientModalProps {
    visible: boolean;
    onClose: () => void;
    onAddClient: (client: any) => void;
    classId: string;
}

const AddClientModal = ({ visible, onClose, onAddClient, classId }: AddClientModalProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    const searchClients = useCallback(async (query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            const { data } = await supabase
                .from('profiles')
                .select('id, full_name, name, email, avatar_url, subscription_status')
                .or(`full_name.ilike.%${query}%,name.ilike.%${query}%,email.ilike.%${query}%`)
                .limit(10);

            setSearchResults(data || []);
        } catch (error) {
            console.error('Error searching clients:', error);
        } finally {
            setSearching(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            searchClients(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, searchClients]);

    const handleSelectClient = async (client: any) => {
        onAddClient(client);
        setSearchQuery('');
        setSearchResults([]);
        onClose();
    };

    const handleCreateLead = async () => {
        if (!searchQuery.trim()) return;

        try {
            const { data, error } = await supabase
                .from('profiles')
                .insert({
                    full_name: searchQuery.trim(),
                    is_lead: true,
                    subscription_status: 'none',
                })
                .select()
                .single();

            if (error) throw error;

            Alert.alert('ליד נוצר', `${searchQuery} נוסף כליד חדש`);
            onAddClient(data);
            setSearchQuery('');
            setSearchResults([]);
            onClose();
        } catch (error) {
            Alert.alert('שגיאה', 'לא ניתן ליצור ליד חדש');
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={modalStyles.overlay}>
                <View style={modalStyles.container}>
                    <View style={modalStyles.header}>
                        <Text style={modalStyles.title}>הוסף משתתף</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Icon name="x" size={24} color="#6B7280" strokeWidth={2} />
                        </TouchableOpacity>
                    </View>

                    <View style={modalStyles.searchContainer}>
                        <Icon name="search" size={20} color="#9CA3AF" strokeWidth={2} />
                        <TextInput
                            style={modalStyles.searchInput}
                            placeholder="חפש לקוח..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>

                    {searching && (
                        <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 16 }} />
                    )}

                    <ScrollView style={modalStyles.resultsList}>
                        {searchResults.map((client) => (
                            <TouchableOpacity
                                key={client.id}
                                style={modalStyles.resultItem}
                                onPress={() => handleSelectClient(client)}
                            >
                                <View style={modalStyles.resultInfo}>
                                    <Text style={modalStyles.resultName}>
                                        {client.full_name || client.name}
                                    </Text>
                                    <Text style={modalStyles.resultEmail}>{client.email}</Text>
                                </View>
                                <View style={[
                                    modalStyles.subscriptionBadge,
                                    { backgroundColor: client.subscription_status === 'active' ? '#D1FAE5' : '#FEE2E2' }
                                ]}>
                                    <Text style={[
                                        modalStyles.subscriptionText,
                                        { color: client.subscription_status === 'active' ? '#059669' : '#DC2626' }
                                    ]}>
                                        {client.subscription_status === 'active' ? 'מנוי פעיל' : 'ללא מנוי'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}

                        {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                            <TouchableOpacity
                                style={modalStyles.createLeadButton}
                                onPress={handleCreateLead}
                            >
                                <Icon name="user-plus" size={20} color={Colors.primary} strokeWidth={2} />
                                <Text style={modalStyles.createLeadText}>
                                    יצירת ליד חדש: "{searchQuery}"
                                </Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

// --- Participant Actions Modal ---
interface ParticipantActionsModalProps {
    visible: boolean;
    participant: any;
    classDate: Date;
    onClose: () => void;
    onMoveToWaitingList: () => void;
    onRemove: (isLate: boolean) => void;
}

const ParticipantActionsModal = ({
    visible,
    participant,
    classDate,
    onClose,
    onMoveToWaitingList,
    onRemove
}: ParticipantActionsModalProps) => {
    const profile = participant?.profiles;
    const fullName = profile?.full_name || profile?.name || 'משתתף';

    const hoursUntilClass = (classDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);
    const isLessThan6Hours = hoursUntilClass < 6 && hoursUntilClass > 0;

    const handleRemove = () => {
        if (isLessThan6Hours) {
            Alert.alert(
                'מחיקת משתתף',
                'השיעור מתחיל בפחות מ-6 שעות. מהו סוג הביטול?',
                [
                    { text: 'ביטול', style: 'cancel' },
                    { text: 'ביטול רגיל', onPress: () => onRemove(false) },
                    { text: 'ביטול מאוחר', style: 'destructive', onPress: () => onRemove(true) },
                ]
            );
        } else {
            Alert.alert(
                'מחיקת משתתף',
                `האם למחוק את ${fullName} מהשיעור?`,
                [
                    { text: 'ביטול', style: 'cancel' },
                    { text: 'מחק', style: 'destructive', onPress: () => onRemove(false) },
                ]
            );
        }
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <TouchableOpacity style={modalStyles.overlay} activeOpacity={1} onPress={onClose}>
                <View style={modalStyles.actionsContainer}>
                    <Text style={modalStyles.actionsTitle}>{fullName}</Text>

                    <TouchableOpacity
                        style={modalStyles.actionItem}
                        onPress={() => { onMoveToWaitingList(); onClose(); }}
                    >
                        <Icon name="clock" size={20} color="#F59E0B" strokeWidth={2} />
                        <Text style={modalStyles.actionText}>העבר לרשימת המתנה</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[modalStyles.actionItem, modalStyles.actionItemDanger]}
                        onPress={handleRemove}
                    >
                        <Icon name="trash-2" size={20} color="#EF4444" strokeWidth={2} />
                        <Text style={[modalStyles.actionText, { color: '#EF4444' }]}>
                            מחק מהשיעור
                        </Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const modalStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        width: '100%',
        maxHeight: '70%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingHorizontal: 12,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
        textAlign: 'right',
    },
    resultsList: {
        marginTop: 16,
        maxHeight: 300,
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    resultInfo: {
        flex: 1,
    },
    resultName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        textAlign: 'right',
    },
    resultEmail: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'right',
        marginTop: 2,
    },
    subscriptionBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginLeft: 12,
    },
    subscriptionText: {
        fontSize: 11,
        fontWeight: '600',
    },
    createLeadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        marginTop: 8,
    },
    createLeadText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.primary,
    },
    actionsContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        width: '100%',
    },
    actionsTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 16,
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    actionItemDanger: {
        borderBottomWidth: 0,
    },
    actionText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
    },
});

export default function AdminClassDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [classItem, setClassItem] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState<any[]>([]);

    // Modal states
    const [addClientModalVisible, setAddClientModalVisible] = useState(false);
    const [selectedParticipant, setSelectedParticipant] = useState<any>(null);
    const [participantModalVisible, setParticipantModalVisible] = useState(false);

    const fetchClassData = useCallback(async () => {
        if (!id) return;

        try {
            setLoading(true);

            if (id.startsWith('virtual_')) {
                const scheduleId = id.replace('virtual_', '');

                const { data: schedule, error } = await supabase
                    .from('class_schedules')
                    .select('*')
                    .eq('id', scheduleId)
                    .single();

                if (error || !schedule) {
                    setClassItem(null);
                    return;
                }

                setClassItem({
                    id: id,
                    title: schedule.name,
                    instructor: schedule.coach_name || 'מאמן',
                    date: new Date().toISOString().split('T')[0],
                    time: schedule.start_time,
                    capacity: schedule.max_participants || 15,
                    enrolled: 0,
                    description: schedule.description,
                    classDate: new Date(),
                });
                setParticipants([]);
            } else {
                const { data: classInstance, error } = await supabase
                    .from('classes')
                    .select('*, bookings:class_bookings(count)')
                    .eq('id', id)
                    .single();

                if (error || !classInstance) {
                    setClassItem(null);
                    return;
                }

                const classDate = new Date(classInstance.class_date);
                const timeStr = classDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

                setClassItem({
                    id: classInstance.id,
                    title: classInstance.name_hebrew || classInstance.name,
                    instructor: classInstance.coach_name || 'מאמן',
                    date: classDate.toISOString().split('T')[0],
                    time: timeStr,
                    capacity: classInstance.max_participants || 15,
                    enrolled: classInstance.bookings?.[0]?.count || 0,
                    description: classInstance.description,
                    classDate: classDate,
                });

                const { data: bookingsData } = await supabase
                    .from('class_bookings')
                    .select('*, profiles:user_id(id, name, email, avatar_url, full_name)')
                    .eq('class_id', id)
                    .in('status', ['confirmed', 'completed', 'no_show', 'late', 'waiting_list']);

                setParticipants(bookingsData || []);
            }
        } catch (error) {
            console.error('Error fetching class:', error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchClassData();
    }, [fetchClassData]);

    const handleAddContent = () => {
        router.push(`/admin/classes/workout-content?classId=${id}`);
    };

    const handleAddClient = async (client: any, forceStatus?: 'confirmed' | 'waiting_list') => {
        if (!classItem || classItem.id.startsWith('virtual_')) {
            Alert.alert('שגיאה', 'לא ניתן להוסיף משתתפים לשיעור וירטואלי');
            return;
        }

        const isFull = confirmedParticipants.length >= classItem.capacity;

        // If class is full and no forceStatus specified, ask user
        if (isFull && !forceStatus) {
            Alert.alert(
                'השיעור מלא',
                'השיעור הגיע לתפוסה מקסימלית. מה לעשות?',
                [
                    { text: 'ביטול', style: 'cancel' },
                    {
                        text: 'לשבץ בחריגה',
                        onPress: () => handleAddClient(client, 'confirmed')
                    },
                    {
                        text: 'לשבץ להמתנה',
                        onPress: () => handleAddClient(client, 'waiting_list')
                    },
                ]
            );
            return;
        }

        try {
            const { error } = await supabase
                .from('class_bookings')
                .insert({
                    class_id: classItem.id,
                    user_id: client.id,
                    status: forceStatus || 'confirmed',
                    booked_at: new Date().toISOString(),
                });

            if (error) throw error;

            const statusText = forceStatus === 'waiting_list' ? 'נוסף לרשימת המתנה' : 'נוסף לשיעור';
            Alert.alert('הצלחה', `${client.full_name || client.name} ${statusText}`);
            fetchClassData();
        } catch (error) {
            Alert.alert('שגיאה', 'לא ניתן להוסיף משתתף');
        }
    };

    // Get confirmed participants for capacity check
    const confirmedParticipants = participants.filter(p =>
        ['confirmed', 'completed', 'no_show', 'late'].includes(p.status)
    );

    const handleAttendance = async (participant: any, status: 'completed' | 'no_show') => {
        // Optimistic update - change UI immediately
        const previousParticipants = [...participants];
        setParticipants(prev =>
            prev.map(p => p.id === participant.id ? { ...p, status } : p)
        );

        try {
            const { error } = await supabase
                .from('class_bookings')
                .update({ status })
                .eq('id', participant.id);

            if (error) throw error;
            // Success - UI already updated, no need to refetch
        } catch (error) {
            // Revert on error
            setParticipants(previousParticipants);
            Alert.alert('שגיאה', 'לא ניתן לעדכן נוכחות');
        }
    };

    const handleMoveToWaitingList = async () => {
        if (!selectedParticipant) return;

        try {
            const { error } = await supabase
                .from('class_bookings')
                .update({ status: 'waiting_list' })
                .eq('id', selectedParticipant.id);

            if (error) throw error;

            Alert.alert('הצלחה', 'הועבר לרשימת המתנה');
            fetchClassData();
        } catch (error) {
            Alert.alert('שגיאה', 'לא ניתן להעביר לרשימת המתנה');
        }
    };

    const handleRemoveParticipant = async (isLate: boolean) => {
        if (!selectedParticipant) return;

        try {
            const { error } = await supabase
                .from('class_bookings')
                .delete()
                .eq('id', selectedParticipant.id);

            if (error) throw error;

            if (isLate) {
                // TODO: Mark as late cancellation for billing
                Alert.alert('הצלחה', 'המשתתף הוסר (ביטול מאוחר)');
            } else {
                Alert.alert('הצלחה', 'המשתתף הוסר');
            }
            fetchClassData();
        } catch (error) {
            Alert.alert('שגיאה', 'לא ניתן להסיר משתתף');
        }
    };

    // Footer action handlers
    const handleSendNotification = () => {
        if (confirmedParticipants.length === 0) {
            Alert.alert('אין משתתפים', 'אין משתתפים רשומים לשיעור זה');
            return;
        }
        Alert.alert(
            'שלח התראה',
            `לשלוח התראה ל-${confirmedParticipants.length} משתתפים?`,
            [
                { text: 'ביטול', style: 'cancel' },
                {
                    text: 'שלח',
                    onPress: () => {
                        // TODO: Implement push notification to participants
                        Alert.alert('הצלחה', 'ההתראה נשלחה לכל המשתתפים');
                    }
                },
            ]
        );
    };

    const handleDuplicateContent = () => {
        if (!classItem?.description) {
            Alert.alert('אין תוכן', 'אין תוכן אימון לשכפל');
            return;
        }
        // Navigate to a screen where they can select which class to copy to
        router.push(`/admin/classes/duplicate-content?content=${encodeURIComponent(classItem.description)}`);
    };

    const handleCancelClass = () => {
        Alert.alert(
            'ביטול אימון',
            'האם אתה בטוח שברצונך לבטל את האימון?',
            [
                { text: 'חזור', style: 'cancel' },
                {
                    text: 'שלח התראה על הביטול',
                    onPress: async () => {
                        // TODO: Send notification then cancel
                        Alert.alert('האימון בוטל', 'התראה נשלחה לכל המשתתפים');
                        router.back();
                    }
                },
                {
                    text: 'המשך ללא התראה',
                    style: 'destructive',
                    onPress: async () => {
                        // TODO: Cancel without notification
                        Alert.alert('האימון בוטל', 'האימון בוטל ללא שליחת התראה');
                        router.back();
                    }
                },
            ]
        );
    };

    const progressRatio = classItem ? classItem.enrolled / classItem.capacity : 0;
    const progressColor = getProgressColor(progressRatio);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>טוען...</Text>
            </View>
        );
    }

    if (!classItem) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>שיעור לא נמצא</Text>
            </View>
        );
    }

    const formattedDate = formatDate(classItem.date);
    const countdown = getTimeUntilClass(classItem.classDate || new Date());

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.container}>
                {/* Header Notch */}
                <LinearGradient
                    colors={['#1F2937', '#111827']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.headerNotch, { paddingTop: insets.top }]}
                >
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
                        <Icon name="chevron-right" size={24} color="#FFFFFF" strokeWidth={2.5} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle} numberOfLines={1}>{classItem.title}</Text>
                        {/* Progress Bar */}
                        <View style={styles.progressContainer}>
                            <View style={styles.progressBarBg}>
                                <View
                                    style={[
                                        styles.progressBarFill,
                                        { width: `${Math.min(progressRatio * 100, 100)}%`, backgroundColor: progressColor }
                                    ]}
                                />
                            </View>
                            <Text style={styles.progressText}>
                                {classItem.enrolled}/{classItem.capacity}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.headerSpacer} />
                </LinearGradient>

                <ScrollView
                    contentContainerStyle={{
                        paddingTop: 24,
                        paddingBottom: insets.bottom + 120, // Extra padding for footer
                        paddingHorizontal: 20,
                    }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Hero Section */}
                    <View style={styles.heroSection}>
                        <View style={styles.heroDetails}>
                            <View style={styles.detailRow}>
                                <Icon name="calendar" size={18} color="#6B7280" strokeWidth={2} />
                                <Text style={styles.detailText}>{formattedDate}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Icon name="clock" size={18} color="#6B7280" strokeWidth={2} />
                                <Text style={styles.detailText}>{classItem.time}</Text>
                            </View>
                        </View>
                        <Text style={styles.countdown}>{countdown}</Text>
                    </View>

                    {/* Trainer Info */}
                    <View style={styles.trainerCard}>
                        <View style={styles.trainerRow}>
                            <View style={styles.trainerInfo}>
                                <Image
                                    source={require('@/assets/images/coach.png')}
                                    style={styles.trainerAvatarImage}
                                />
                                <View style={styles.trainerText}>
                                    <Text style={styles.trainerName}>{classItem.instructor || 'מאמן'}</Text>
                                    <Text style={styles.trainerRole}>מאמן</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Training Content Collapsible */}
                    <TrainingContentCard
                        description={classItem.description}
                        onAddContent={handleAddContent}
                    />

                    {/* Slots Section */}
                    <View style={styles.slotsCard}>
                        <Text style={styles.sectionTitle}>משתתפים רשומים</Text>
                        <Text style={styles.slotsSubtitle}>
                            {confirmedParticipants.length} / {classItem.capacity} תפוסים
                        </Text>

                        <View style={styles.slotsGrid}>
                            {Array.from({ length: classItem.capacity }, (_, index) => {
                                const participant = confirmedParticipants[index];
                                const isTaken = !!participant;
                                const profile = participant?.profiles;
                                const fullName = profile?.full_name || profile?.name || '';
                                const nameParts = fullName.split(' ');
                                const firstName = nameParts[0] || '';
                                const lastName = nameParts.slice(1).join(' ') || '';
                                const attendanceStatus = participant?.status;

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.slotBox,
                                            isTaken && styles.slotTaken,
                                        ]}
                                        activeOpacity={0.7}
                                        onPress={() => {
                                            if (isTaken) {
                                                setSelectedParticipant(participant);
                                                setParticipantModalVisible(true);
                                            } else {
                                                setAddClientModalVisible(true);
                                            }
                                        }}
                                    >
                                        {isTaken ? (
                                            <LinearGradient
                                                colors={
                                                    attendanceStatus === 'completed'
                                                        ? ['#10B981', '#059669'] // Green for attended
                                                        : attendanceStatus === 'no_show'
                                                            ? ['#EF4444', '#DC2626'] // Red for no-show
                                                            : ['#FFFFFF', '#F9FAFB'] // White for pending
                                                }
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={styles.slotTakenGradient}
                                            >
                                                <View style={styles.slotTakenContent}>
                                                    <View style={styles.slotNameContainer}>
                                                        <Text style={[
                                                            styles.slotFirstName,
                                                            !attendanceStatus && { color: '#111827' } // Dark text on white bg
                                                        ]} numberOfLines={1}>
                                                            {firstName || 'משתתף'}
                                                        </Text>
                                                        {lastName ? (
                                                            <Text style={[
                                                                styles.slotLastName,
                                                                !attendanceStatus && { color: '#6B7280' } // Gray text on white bg
                                                            ]} numberOfLines={1}>
                                                                {lastName}
                                                            </Text>
                                                        ) : null}
                                                    </View>
                                                    {/* Attendance Icons */}
                                                    <View style={styles.attendanceIcons}>
                                                        <TouchableOpacity
                                                            style={[
                                                                styles.attendanceBtn,
                                                                !attendanceStatus && styles.attendanceBtnWhiteBg,
                                                                attendanceStatus === 'completed' && styles.attendanceBtnActiveOnGreen
                                                            ]}
                                                            onPress={(e) => {
                                                                e.stopPropagation();
                                                                handleAttendance(participant, 'completed');
                                                            }}
                                                        >
                                                            <Icon
                                                                name="check"
                                                                size={16}
                                                                color={attendanceStatus === 'completed' ? '#FFFFFF' : '#10B981'}
                                                                strokeWidth={3}
                                                            />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            style={[
                                                                styles.attendanceBtn,
                                                                !attendanceStatus && styles.attendanceBtnWhiteBg,
                                                                attendanceStatus === 'no_show' && styles.attendanceBtnActiveOnRed
                                                            ]}
                                                            onPress={(e) => {
                                                                e.stopPropagation();
                                                                handleAttendance(participant, 'no_show');
                                                            }}
                                                        >
                                                            <Icon
                                                                name="x"
                                                                size={16}
                                                                color={attendanceStatus === 'no_show' ? '#FFFFFF' : '#EF4444'}
                                                                strokeWidth={3}
                                                            />
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            </LinearGradient>
                                        ) : (
                                            <View style={styles.slotContent}>
                                                <Icon name="plus" size={28} color="#9CA3AF" strokeWidth={2.5} />
                                                <Text style={styles.slotAvailable}>פנוי</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </ScrollView>
            </View>

            {/* Modals */}
            <AddClientModal
                visible={addClientModalVisible}
                onClose={() => setAddClientModalVisible(false)}
                onAddClient={handleAddClient}
                classId={classItem?.id || ''}
            />

            <ParticipantActionsModal
                visible={participantModalVisible}
                participant={selectedParticipant}
                classDate={classItem?.classDate || new Date()}
                onClose={() => setParticipantModalVisible(false)}
                onMoveToWaitingList={handleMoveToWaitingList}
                onRemove={handleRemoveParticipant}
            />

            {/* Footer Actions */}
            <LinearGradient
                colors={['#1F2937', '#111827']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}
            >
                <View style={styles.footerActions}>
                    <TouchableOpacity
                        style={[styles.footerBtn, styles.footerBtnDanger]}
                        onPress={handleCancelClass}
                    >
                        <Icon name="x-circle" size={20} color="#EF4444" strokeWidth={2} />
                        <Text style={[styles.footerBtnText, { color: '#EF4444' }]}>בטל אימון</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.footerBtn}
                        onPress={() => setAddClientModalVisible(true)}
                    >
                        <UserAddIcon size={20} color="#FFFFFF" />
                        <Text style={styles.footerBtnText}>הוסף משתתף</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.footerBtn}
                        onPress={handleDuplicateContent}
                    >
                        <Icon name="copy" size={20} color="#FFFFFF" strokeWidth={2} />
                        <Text style={styles.footerBtnText}>שכפל תוכן</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.footerBtn}
                        onPress={handleSendNotification}
                    >
                        <Icon name="bell" size={20} color="#FFFFFF" strokeWidth={2} />
                        <Text style={styles.footerBtnText}>שלח התראה</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '500',
    },

    // Header Notch
    headerNotch: {
        paddingHorizontal: 16,
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    headerBackButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
    },
    progressBarBg: {
        flex: 1,
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    headerSpacer: {
        width: 44,
    },

    // Hero Section
    heroSection: {
        marginBottom: 24,
    },
    heroDetails: {
        gap: 8,
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailText: {
        fontSize: 16,
        color: '#374151',
        fontWeight: '500',
    },
    countdown: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '600',
        textAlign: 'left',
        marginTop: 8,
    },

    // Trainer Card
    trainerCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    trainerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    trainerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    trainerAvatarImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    trainerText: {
        alignItems: 'flex-start',
    },
    trainerName: {
        fontSize: 17,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'left',
    },
    trainerRole: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
        textAlign: 'left',
    },

    // Slots Card
    slotsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'left',
        marginBottom: 6,
    },
    slotsSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
        textAlign: 'left',
        marginBottom: 16,
    },
    slotsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    slotBox: {
        width: '48%',
        height: 80,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 0,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
    },
    slotTaken: {
        overflow: 'hidden',
        padding: 0,
    },
    slotTakenGradient: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        paddingHorizontal: 8,
    },
    slotTakenContent: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        justifyContent: 'space-between',
    },
    slotNameContainer: {
        flex: 1,
        gap: 0,
    },
    attendanceIcons: {
        flexDirection: 'column',
        gap: 4,
    },
    attendanceBtn: {
        width: 28,
        height: 28,
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    attendanceBtnActive: {
        backgroundColor: 'rgba(16,185,129,0.2)',
    },
    attendanceBtnDanger: {
        backgroundColor: 'rgba(239,68,68,0.2)',
    },
    attendanceBtnWhiteBg: {
        backgroundColor: '#F3F4F6',
    },
    attendanceBtnActiveOnGreen: {
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    attendanceBtnActiveOnRed: {
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    slotContent: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    slotFirstName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'left',
    },
    slotLastName: {
        fontSize: 12,
        fontWeight: '500',
        color: '#9CA3AF',
        textAlign: 'left',
    },
    slotAvailable: {
        fontSize: 9,
        fontWeight: '600',
        color: '#9CA3AF',
        textAlign: 'center',
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 16,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    footerActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    footerBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        gap: 4,
    },
    footerBtnText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    footerBtnDanger: {
        // Optional: can add special styling for danger button
    },
});
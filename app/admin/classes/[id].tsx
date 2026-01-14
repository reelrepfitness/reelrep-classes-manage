import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    Platform,
    Alert,
    ActivityIndicator,
    Linking
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { Ionicons } from '@expo/vector-icons';
import { 
    ChevronRight, 
    Plus, 
    Trash2, 
    Phone, 
    Megaphone
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import Animated, { FadeInUp, SlideInDown } from 'react-native-reanimated';
import { supabase } from '@/constants/supabase';

// --- Types ---
interface Participant {
    id: string; // booking_id
    user_id: string;
    full_name: string;
    avatar_url: string;
    subscription_status: 'active' | 'frozen' | 'expired' | 'ticket';
    checked_in: boolean;
    phone: string;
    booking_status: string;
}

interface ClassData {
    id: string;
    name: string;
    time: string;
    trainer_name: string;
    registered_count: number;
    max_capacity: number;
    waitlist_count: number;
    status: 'open' | 'filling' | 'full';
}

export default function ClassManagementScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // State
    const [activeTab, setActiveTab] = useState<'participants' | 'waitlist'>('participants');
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [waitlist, setWaitlist] = useState<Participant[]>([]);
    const [classData, setClassData] = useState<ClassData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchClassData();
    }, [id]);

    const fetchClassData = async () => {
        try {
            setLoading(true);

            // Check if ID is virtual
            if (typeof id === 'string' && id.startsWith('virtual_')) {
                const scheduleId = id.replace('virtual_', '');
                
                const { data: schedule, error: schedError } = await supabase
                    .from('class_schedules')
                    .select('*')
                    .eq('id', scheduleId)
                    .single();

                if (schedError) throw schedError;

                // Virtual Class has no bookings yet
                setParticipants([]);
                setWaitlist([]);

                // Parse time for display (using schedule's start_time)
                const [hours, minutes] = schedule.start_time.split(':');
                const timeStr = `${hours}:${minutes}`;

                setClassData({
                    id: id, // keep virtual id
                    name: schedule.name, // or schedule.name_hebrew if available
                    time: timeStr,
                    trainer_name: schedule.coach_name || 'מאמן',
                    registered_count: 0,
                    max_capacity: schedule.max_participants || 15,
                    waitlist_count: 0,
                    status: 'open'
                });

            } else {
                // Real Class Instance
                // 1. Fetch Class Details
                const { data: classDetails, error: classError } = await supabase
                    .from('classes')
                    .select('*')
                    .eq('id', id)
                    .single();
                
                if (classError) throw classError;

                // 2. Fetch Bookings with Profile & Subscription
                const { data: bookings, error: bookingsError } = await supabase
                    .from('class_bookings')
                    .select(`
                        id,
                        status,
                        attended_at,
                        user_id,
                        profile:profiles (
                            id,
                            full_name,
                            avatar_url,
                            phone,
                            user_subscriptions (
                                is_active,
                                status,
                                plan:subscription_plans(type)
                            )
                        )
                    `)
                    .eq('class_id', id);

                if (bookingsError) throw bookingsError;

                // Process Bookings
                const active: Participant[] = [];
                const waiting: Participant[] = [];

                bookings?.forEach((booking: any) => {
                    const profile = booking.profile;
                    if (!profile) return;

                    const sub = profile.user_subscriptions?.[0]; // Assume first is relevant or sort by active
                    let subStatus: Participant['subscription_status'] = 'expired';
                    if (sub?.is_active) {
                        subStatus = sub.plan?.type === 'ticket' ? 'ticket' : 'active';
                    } else if (sub?.status === 'frozen') {
                        subStatus = 'frozen';
                    }

                    const participant: Participant = {
                        id: booking.id,
                        user_id: profile.id,
                        full_name: profile.full_name || 'Unknown',
                        avatar_url: profile.avatar_url || 'https://i.pravatar.cc/150',
                        phone: profile.phone || '',
                        subscription_status: subStatus,
                        checked_in: !!booking.attended_at || booking.status === 'completed',
                        booking_status: booking.status
                    };

                    if (booking.status === 'waiting_list') {
                        waiting.push(participant);
                    } else if (booking.status !== 'cancelled') {
                        active.push(participant);
                    }
                });

                setParticipants(active);
                setWaitlist(waiting);

                // Set Class Data
                const dateObj = new Date(classDetails.class_date);
                const timeStr = dateObj.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                
                setClassData({
                    id: classDetails.id,
                    name: classDetails.name_hebrew || classDetails.name,
                    time: timeStr,
                    trainer_name: classDetails.coach_name || '',
                    registered_count: active.length,
                    max_capacity: classDetails.max_participants || 15,
                    waitlist_count: waiting.length,
                    status: active.length >= (classDetails.max_participants || 15) ? 'full' : 'open'
                });
            }

        } catch (error) {
            console.error('Error fetching class data:', error);
            Alert.alert('שגיאה', 'לא ניתן לטעון את נתוני השיעור');
        } finally {
            setLoading(false);
        }
    };

    // --- Actions ---

    const handleCheckIn = async (bookingId: string, currentStatus: boolean) => {
        // Optimistic Update
        setParticipants(prev => prev.map(p => 
            p.id === bookingId ? { ...p, checked_in: !currentStatus } : p
        ));

        try {
            const updates = currentStatus 
                ? { status: 'confirmed', attended_at: null } // Uncheck
                : { status: 'completed', attended_at: new Date().toISOString() }; // Check in

            const { error } = await supabase
                .from('class_bookings')
                .update(updates)
                .eq('id', bookingId);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating check-in:', error);
            Alert.alert('שגיאה', 'עדכון נוכחות נכשל');
            fetchClassData(); // Revert on error
        }
    };

    const handleRemove = (bookingId: string) => {
        Alert.alert(
            'הסרת מתאמן',
            'האם אתה בטוח שברצונך להסיר את המתאמן מהשיעור?',
            [
                { text: 'ביטול', style: 'cancel' },
                { 
                    text: 'הסר', 
                    style: 'destructive', 
                    onPress: async () => {
                        try {
                            // Optimistic Remove
                            if (activeTab === 'participants') {
                                setParticipants(prev => prev.filter(p => p.id !== bookingId));
                                setClassData(prev => prev ? ({ ...prev, registered_count: prev.registered_count - 1 }) : null);
                            } else {
                                setWaitlist(prev => prev.filter(p => p.id !== bookingId));
                                setClassData(prev => prev ? ({ ...prev, waitlist_count: prev.waitlist_count - 1 }) : null);
                            }

                            const { error } = await supabase
                                .from('class_bookings')
                                .delete() // Or update status to 'cancelled'
                                .eq('id', bookingId);
                            
                            if (error) throw error;
                        } catch (error) {
                            console.error('Error removing participant:', error);
                            fetchClassData();
                        }
                    }
                }
            ]
        );
    };

    const handleWhatsApp = (phone: string) => {
        if (!phone) {
            Alert.alert('שגיאה', 'לא קיים מספר טלפון למתאמן זה');
            return;
        }
        const cleanPhone = phone.replace(/\D/g, '').replace(/^0/, '972');
        Linking.openURL(`whatsapp://send?phone=${cleanPhone}`);
    };

    const handlePromoteFromWaitlist = (bookingId: string) => {
        Alert.alert(
            'הוספה לשיעור',
            'להעביר את המתאמן מרשימת ההמתנה לשיעור?',
            [
                { text: 'ביטול', style: 'cancel' },
                {
                    text: 'אישור',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('class_bookings')
                                .update({ status: 'confirmed' })
                                .eq('id', bookingId);

                            if (error) throw error;
                            fetchClassData(); // Refetch to update lists correctly
                        } catch (error) {
                            console.error('Error promoting:', error);
                            Alert.alert('שגיאה', 'הפעולה נכשלה');
                        }
                    }
                }
            ]
        );
    };

    const handleBroadcast = () => {
        Alert.alert('הודעה תפוצה', 'פונקציונליות זו תתווסף בקרוב');
    };

    const handleAddClient = () => {
        Alert.alert('הוספה ידנית', 'פונקציונליות זו תתווסף בקרוב');
    };

    // --- Render Helpers ---

    const renderIcon = (iosSymbol: string, androidIcon: any, color: string, size: number = 20) => {
        if (Platform.OS === 'ios') {
            return (
                <SymbolView 
                    name={iosSymbol} 
                    tintColor={color} 
                    size={size}
                    style={{ width: size, height: size }}
                    resizeMode="scaleAspectFit"
                />
            );
        }
        return <Ionicons name={androidIcon} size={size} color={color} />;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active': return { color: '#34C759', text: 'מנוי' };
            case 'ticket': return { color: '#F59E0B', text: 'כרטיסייה' };
            case 'frozen': return { color: '#3B82F6', text: 'מוקפא' };
            case 'expired': return { color: '#EF4444', text: 'פג תוקף' };
            default: return { color: '#9CA3AF', text: 'לא ידוע' };
        }
    };

    const currentList = activeTab === 'participants' ? participants : waitlist;
    const progress = classData ? classData.registered_count / classData.max_capacity : 0;
    const progressColor = progress >= 1 ? '#EF4444' : progress > 0.8 ? '#F59E0B' : '#34C759';

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!classData) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text>השיעור לא נמצא</Text>
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
                <Text style={styles.headerTitle}>ניהול שיעור</Text>
                <View style={{ width: 28 }} /> 
            </View>

            <ScrollView 
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* 1. Status Card */}
                <View style={styles.statusCard}>
                    <View style={styles.statusCardHeader}>
                        <View>
                            <Text style={styles.className}>{classData.name}</Text>
                            <Text style={styles.classDetails}>{classData.time} • {classData.trainer_name}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: progressColor + '15' }]}>
                            <Text style={[styles.statusText, { color: progressColor }]}>
                                {classData.registered_count >= classData.max_capacity ? 'מלא' : 'פתוח'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.capacityContainer}>
                        <View style={styles.capacityLabels}>
                            <Text style={styles.capacityText}>
                                {classData.registered_count}/{classData.max_capacity} רשומים
                            </Text>
                            <Text style={styles.capacityPercentage}>
                                {Math.round(progress * 100)}%
                            </Text>
                        </View>
                        <View style={styles.progressBarBg}>
                            <View 
                                style={[
                                    styles.progressBarFill, 
                                    { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: progressColor }
                                ]} 
                            />
                        </View>
                    </View>
                </View>

                {/* 2. Segmented Control */}
                <View style={styles.segmentedControl}>
                    <TouchableOpacity 
                        style={[styles.segment, activeTab === 'participants' && styles.activeSegment]}
                        onPress={() => setActiveTab('participants')}
                    >
                        <Text style={[styles.segmentText, activeTab === 'participants' && styles.activeSegmentText]}>
                            רשומים
                        </Text>
                        <View style={[styles.badge, activeTab === 'participants' ? styles.activeBadge : styles.inactiveBadge]}>
                            <Text style={[styles.badgeText, activeTab === 'participants' && styles.activeBadgeText]}>
                                {participants.length}
                            </Text>
                        </View>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.segment, activeTab === 'waitlist' && styles.activeSegment]}
                        onPress={() => setActiveTab('waitlist')}
                    >
                        <Text style={[styles.segmentText, activeTab === 'waitlist' && styles.activeSegmentText]}>
                            המתנה
                        </Text>
                        {waitlist.length > 0 && (
                            <View style={[styles.badge, activeTab === 'waitlist' ? styles.activeBadge : styles.inactiveBadge]}>
                                <Text style={[styles.badgeText, activeTab === 'waitlist' && styles.activeBadgeText]}>
                                    {waitlist.length}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* 3. Participants List */}
                <View style={styles.listContainer}>
                    {currentList.map((participant, index) => (
                        <Animated.View 
                            key={participant.id}
                            entering={FadeInUp.delay(index * 50)}
                            style={styles.participantRow}
                        >
                            <View style={styles.participantInfo}>
                                <Image source={{ uri: participant.avatar_url }} style={styles.avatar} />
                                <View>
                                    <Text style={styles.participantName}>{participant.full_name}</Text>
                                    <Text style={[
                                        styles.subscriptionStatus, 
                                        { color: getStatusBadge(participant.subscription_status).color }
                                    ]}>
                                        {getStatusBadge(participant.subscription_status).text}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.actionsContainer}>
                                <TouchableOpacity 
                                    style={styles.iconBtn}
                                    onPress={() => handleWhatsApp(participant.phone)}
                                >
                                    {renderIcon('phone.circle.fill', 'logo-whatsapp', '#25D366', 28)}
                                </TouchableOpacity>

                                {activeTab === 'participants' ? (
                                    <TouchableOpacity 
                                        style={styles.iconBtn}
                                        onPress={() => handleCheckIn(participant.id, participant.checked_in)}
                                    >
                                        {participant.checked_in ? (
                                            renderIcon('checkmark.circle.fill', 'checkmark-circle', '#34C759', 28)
                                        ) : (
                                            renderIcon('circle', 'ellipse-outline', '#E5E7EB', 28)
                                        )}
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity 
                                        style={styles.iconBtn}
                                        onPress={() => handlePromoteFromWaitlist(participant.id)}
                                    >
                                        {renderIcon('plus.circle.fill', 'add-circle', '#3B82F6', 28)}
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity 
                                    style={[styles.iconBtn, { marginLeft: 4 }]}
                                    onPress={() => handleRemove(participant.id)}
                                >
                                    {renderIcon('trash', 'trash-outline', '#EF4444', 22)}
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    ))}
                    
                    {currentList.length === 0 && (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>
                                {activeTab === 'participants' ? 'אין נרשמים לשיעור זה' : 'רשימת ההמתנה ריקה'}
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* 4. Footer Actions */}
            <Animated.View 
                entering={SlideInDown.delay(300)}
                style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}
            >
                <TouchableOpacity style={styles.broadcastBtn} onPress={handleBroadcast}>
                    <Megaphone size={20} color="#64748B" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.addClientBtn} onPress={handleAddClient}>
                    <Plus size={24} color="#fff" />
                    <Text style={styles.addClientText}>הוסף מתאמן ידנית</Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
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
    
    // Status Card
    statusCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 4,
    },
    statusCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    className: {
        fontSize: 20,
        fontWeight: '800',
        color: '#000',
        marginBottom: 4,
        textAlign: 'left',
    },
    classDetails: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
        textAlign: 'left',
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
    capacityContainer: {
        gap: 8,
    },
    capacityLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    capacityText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    capacityPercentage: {
        fontSize: 13,
        fontWeight: '700',
        color: '#000',
    },
    progressBarBg: {
        height: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },

    // Segmented Control
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: '#E5E7EB', // Slightly darker for contrast
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
    },
    segment: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 10,
        gap: 8,
    },
    activeSegment: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    segmentText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    activeSegmentText: {
        color: '#000',
    },
    badge: {
        backgroundColor: '#D1D5DB',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        minWidth: 20,
        alignItems: 'center',
    },
    activeBadge: {
        backgroundColor: '#F3F4F6',
    },
    inactiveBadge: {
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
    },
    activeBadgeText: {
        color: '#000',
    },

    // List
    listContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
        overflow: 'hidden',
    },
    participantRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    participantInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F3F4F6',
    },
    participantName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#000',
        textAlign: 'left',
    },
    subscriptionStatus: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'left',
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBtn: {
        padding: 4,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '500',
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 12,
        paddingHorizontal: 20,
        flexDirection: 'row',
        gap: 12,
    },
    broadcastBtn: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addClientBtn: {
        flex: 1,
        height: 52,
        backgroundColor: Colors.primary,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    addClientText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
});
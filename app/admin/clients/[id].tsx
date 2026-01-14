import React, { useState, useEffect } from 'react';
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
    TextInput
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
}

interface SubscriptionData {
    classes_remaining: number;
    expiry_date: Date;
    is_frozen: boolean;
    plan_name: string;
}

// --- Mock Initial Data (Replace with Supabase Fetch) ---
const MOCK_CLIENT: ClientData = {
    id: 'c1',
    full_name: 'אביב גפן',
    phone: '050-1234567',
    avatar_url: 'https://i.pravatar.cc/150?u=aviv',
    status: 'active',
};

const MOCK_SUBSCRIPTION: SubscriptionData = {
    classes_remaining: 8,
    expiry_date: new Date('2025-06-15'),
    is_frozen: false,
    plan_name: 'כרטיסיית 10 כניסות',
};

export default function ClientManagerScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    
    // UI State
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Data State (Optimistic UI)
    const [client, setClient] = useState<ClientData>(MOCK_CLIENT);
    const [subscription, setSubscription] = useState<SubscriptionData>(MOCK_SUBSCRIPTION);
    
    // --- Supabase Integration (Mocked) ---
    useEffect(() => {
        // TODO: Uncomment and adapt for real data fetching
        /*
        const fetchData = async () => {
            setLoading(true);
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).single();
            const { data: sub } = await supabase.from('subscriptions').select('*').eq('user_id', id).single();
            if (profile) setClient(profile);
            if (sub) setSubscription(sub);
            setLoading(false);
        };
        fetchData();
        */
       // Simulating fetch delay
       // setLoading(true);
       // setTimeout(() => setLoading(false), 500);
    }, [id]);

    const handleUpdateSubscription = async (updates: Partial<SubscriptionData>) => {
        // Optimistic Update
        setSubscription(prev => ({ ...prev, ...updates }));

        // TODO: Sync with Supabase
        /*
        const { error } = await supabase
            .from('subscriptions')
            .update(updates)
            .eq('user_id', id);
        
        if (error) Alert.alert('Error', error.message);
        */
    };

    // --- Actions ---

    const handleWhatsApp = () => {
        // Linking.openURL(`whatsapp://send?phone=${client.phone}`);
        Alert.alert('WhatsApp', `Opening chat with ${client.phone}`);
    };

    const toggleFreeze = () => {
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
                            setClient(prev => ({ ...prev, status: 'frozen' }));
                        }
                    }
                ]
            );
        } else {
            handleUpdateSubscription({ is_frozen: false });
            setClient(prev => ({ ...prev, status: 'active' }));
        }
    };

    const handleCancelSubscription = () => {
        Alert.alert(
            'ביטול מנוי',
            'פעולה זו תבטל את המנוי לצמיתות. האם להמשיך?',
            [
                { text: 'לא', style: 'cancel' },
                { 
                    text: 'כן, בטל מנוי', 
                    style: 'destructive',
                    onPress: () => {
                        setClient(prev => ({ ...prev, status: 'inactive' }));
                        // Logic to cancel in DB
                        router.back();
                    }
                }
            ]
        );
    };

    const adjustEntries = (amount: number) => {
        const newValue = Math.max(0, subscription.classes_remaining + amount);
        handleUpdateSubscription({ classes_remaining: newValue });
    };

    const extendDate = (type: 'week' | 'month') => {
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
        if (subscription.is_frozen) return '#3B82F6'; // Blue
        if (client.status === 'inactive') return '#EF4444'; // Red
        return '#34C759'; // Green
    };

    const getStatusText = () => {
        if (subscription.is_frozen) return 'מוקפא';
        if (client.status === 'inactive') return 'לא פעיל';
        return 'פעיל';
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={Colors.primary} />
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
            >
                {/* 1. Profile Section */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <Image source={{ uri: client.avatar_url }} style={styles.avatar} />
                        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
                    </View>
                    
                    <Text style={styles.clientName}>{client.full_name}</Text>
                    
                    <TouchableOpacity style={styles.phoneButton} onPress={handleWhatsApp}>
                        <MessageCircle size={16} color="#25D366" fill="#25D366" />
                        <Text style={styles.phoneText}>{client.phone}</Text>
                    </TouchableOpacity>

                    <View style={[styles.statusChip, { backgroundColor: getStatusColor() + '15' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor() }]}>
                            {getStatusText()}
                        </Text>
                    </View>
                </View>

                {/* 2. Subscription Hero Card */}
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

                {/* 3. Admin Actions Grid */}
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

            </ScrollView>

            {showDatePicker && (
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


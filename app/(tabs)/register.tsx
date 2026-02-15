import React, { useState, useEffect, useCallback } from 'react';
import { Spinner } from '@/components/ui/spinner';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    Image,
    Platform,
    UIManager,
    Dimensions,
    Modal,
    Pressable,
    LayoutAnimation,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { supabase } from '@/constants/supabase';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
    Search,
    ChevronDown,
    Check,
    X,
    Calendar,
    Tag,
    User,
    ChevronRight,
} from 'lucide-react-native';
import { RegisterIcon } from '@/components/QuickToolsIcons';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

// --- Icons Helper ---
const RenderIcon = ({ name, iosName, size = 24, color = '#000', style }: { name: any, iosName: string, size?: number, color?: string, style?: any }) => {
    if (Platform.OS === 'ios') {
        return <SymbolView name={iosName as any} size={size} tintColor={color} resizeMode="scaleAspectFit" style={style} />;
    }
    return <Ionicons name={name} size={size} color={color} style={style} />;
};

// --- Types ---
interface Profile {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    avatar_url?: string;
}

interface Plan {
    id: string;
    name: string;
    name_hebrew?: string;
    description?: string;
    price: number;
    type: 'subscription' | 'ticket';
    total_sessions?: number;
    validity_days?: number;
    sessions_per_week?: number;
}

export default function POSCartScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    // --- State ---
    const [searchQuery, setSearchQuery] = useState('');
    const [clients, setClients] = useState<Profile[]>([]);
    const [selectedClient, setSelectedClient] = useState<Profile | null>(null);
    const [loadingClients, setLoadingClients] = useState(false);

    const [activeTab, setActiveTab] = useState<'subscription' | 'ticket'>('subscription');
    const [plans, setPlans] = useState<Plan[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [loadingPlans, setLoadingPlans] = useState(false);

    // Date customization
    const [customStartDate, setCustomStartDate] = useState<Date>(new Date());
    const [customEndDate, setCustomEndDate] = useState<Date>(new Date());

    // Calendar modal state
    const [showCalendarModal, setShowCalendarModal] = useState(false);
    const [editingDateType, setEditingDateType] = useState<'start' | 'end'>('start');
    const [calendarDisplayDate, setCalendarDisplayDate] = useState<Date>(new Date());

    // --- Data Fetching ---
    useEffect(() => {
        if (searchQuery.length < 2) {
            setClients([]);
            return;
        }
        const timer = setTimeout(async () => {
            setLoadingClients(true);
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, avatar_url')
                    .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
                    .limit(5);
                if (!error) setClients(data || []);
            } finally {
                setLoadingClients(false);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        const fetchPlans = async () => {
            setLoadingPlans(true);
            try {
                let data: any[] = [];
                if (activeTab === 'subscription') {
                    const { data: subs } = await supabase
                        .from('plans')
                        .select('id,name,is_unlimited,sessions_per_week,description,price_upfront,price_per_month')
                        .eq('is_active', true)
                        .eq('category', 'subscription');
                    data = (subs || []).map((p: any) => ({
                        ...p,
                        type: 'subscription',
                        price: p.price_upfront ? Number(p.price_upfront) : 0,
                        pricePerMonth: p.price_per_month ? Number(p.price_per_month) : undefined,
                    }));
                } else {
                    const { data: ticks } = await supabase
                        .from('plans')
                        .select('*')
                        .eq('is_active', true)
                        .eq('category', 'ticket');
                    data = (ticks || []).map((p: any) => ({
                        ...p,
                        type: 'ticket',
                        price: p.price_total ? Number(p.price_total) : 0,
                    }));
                }
                setPlans(data);
            } catch (e) {
                console.error('[POS] Error fetching plans:', e);
            } finally {
                setLoadingPlans(false);
            }
        };
        fetchPlans();
    }, [activeTab]);

    // Handle plan selection with animation and default dates
    const handleSelectPlan = (planId: string) => {
        if (Platform.OS !== 'web') {
            Haptics.selectionAsync();
        }
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        if (selectedPlanId === planId) {
            setSelectedPlanId(null);
            return;
        }

        setSelectedPlanId(planId);
        const plan = plans.find(p => p.id === planId);
        if (!plan) return;

        const start = new Date();
        let end = new Date();

        if (plan.type === 'subscription') {
            end.setMonth(end.getMonth() + 6);
        } else {
            const validityDays = plan.validity_days || 90;
            end.setDate(end.getDate() + validityDays);
        }

        setCustomStartDate(start);
        setCustomEndDate(end);
    };

    // Get selected plan
    const selectedPlan = plans.find(p => p.id === selectedPlanId) || null;

    // --- Logic ---
    const calculateTotal = () => {
        if (!selectedPlan) return 0;
        return selectedPlan.price;
    };

    // Render plan image based on name
    const renderPlanImage = (plan: Plan) => {
        const name = (plan.name || '').toUpperCase();
        if (name.includes('ELITE')) {
            return <Image source={require('@/assets/images/reel-elite.png')} style={styles.planImage} resizeMode="contain" />;
        } else if (name.includes('ONE')) {
            return <Image source={require('@/assets/images/reel-one.png')} style={styles.planImage} resizeMode="contain" />;
        } else if (plan.total_sessions === 10 || name.includes('10')) {
            return <Image source={require('@/assets/images/10sessions.png')} style={styles.planImage} resizeMode="contain" />;
        } else if (plan.total_sessions === 20 || name.includes('20')) {
            return <Image source={require('@/assets/images/20sessions.png')} style={styles.planImage} resizeMode="contain" />;
        }
        return <Text style={styles.planNameFallback}>{plan.name}</Text>;
    };

    const handleProceed = () => {
        if (!selectedClient) {
            Alert.alert('חסר לקוח', 'אנא בחר לקוח כדי להמשיך');
            return;
        }
        if (!selectedPlan) {
            Alert.alert('לא נבחר מוצר', 'אנא בחר מנוי או כרטיסייה');
            return;
        }

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        const total = calculateTotal();
        const items = [{
            id: selectedPlan.id,
            name: selectedPlan.name_hebrew || selectedPlan.name,
            price: selectedPlan.price,
            type: selectedPlan.type,
            total_sessions: selectedPlan.total_sessions,
        }];

        router.push({
            pathname: '/admin/pos/payment',
            params: {
                clientId: selectedClient.id,
                clientName: selectedClient.full_name,
                clientEmail: selectedClient.email,
                clientPhone: selectedClient.phone || '',
                totalAmount: total.toString(),
                cartItems: JSON.stringify(items),
                planId: selectedPlan.id,
                planType: selectedPlan.type,
                startDate: customStartDate.toISOString(),
                endDate: customEndDate.toISOString(),
            }
        });
    };

    const formatDateHebrew = (date: Date) => {
        return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    // Calendar helper functions
    const DAYS_HEBREW = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
    const MONTHS_HEBREW = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

    const getCalendarDays = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const weeks: (number | null)[][] = [];
        let currentWeek: (number | null)[] = [];

        for (let i = 0; i < firstDay; i++) currentWeek.push(null);

        for (let day = 1; day <= daysInMonth; day++) {
            currentWeek.push(day);
            if (currentWeek.length === 7) {
                weeks.push([...currentWeek]);
                currentWeek = [];
            }
        }

        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) currentWeek.push(null);
            weeks.push(currentWeek);
        }

        return weeks;
    };

    const handleCalendarDateSelect = (day: number) => {
        const selectedDate = new Date(calendarDisplayDate.getFullYear(), calendarDisplayDate.getMonth(), day);

        // Validate: end date cannot be before start date
        if (editingDateType === 'end' && selectedDate < customStartDate) {
            return;
        }

        if (editingDateType === 'start') {
            setCustomStartDate(selectedDate);
            // If new start is after end, adjust end
            if (selectedDate > customEndDate) {
                const newEnd = new Date(selectedDate);
                newEnd.setMonth(newEnd.getMonth() + 6);
                setCustomEndDate(newEnd);
            }
        } else {
            setCustomEndDate(selectedDate);
        }

        setShowCalendarModal(false);
    };

    const navigateCalendarMonth = (direction: 'prev' | 'next') => {
        const newDate = new Date(calendarDisplayDate);
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        setCalendarDisplayDate(newDate);
    };

    const handleClientSelect = (client: Profile) => {
        if (Platform.OS !== 'web') {
            Haptics.selectionAsync();
        }
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelectedClient(client);
        setSearchQuery('');
    };

    const handleRemoveClient = () => {
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelectedClient(null);
    };



    return (
        <View style={styles.container}>
            {/* Header - Shop Style */}
            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                {/* Back Button - Left side (RTL: visually on right) */}
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-forward" size={24} color="#1a1a2e" />
                </TouchableOpacity>

                <RegisterIcon size={48} />
                <Text style={styles.headerSubtitle}>בחרו לקוח ומוצר להמשך</Text>

                {/* Segmented Control */}
                <View style={styles.segmentedControl}>
                    <TouchableOpacity
                        onPress={() => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setActiveTab('subscription');
                            setSelectedPlanId(null);
                        }}
                        style={[
                            styles.segmentButton,
                            activeTab === 'subscription' && styles.segmentButtonActive
                        ]}
                    >
                        <Text style={[
                            styles.segmentText,
                            activeTab === 'subscription' && styles.segmentTextActive
                        ]}>מנויים</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setActiveTab('ticket');
                            setSelectedPlanId(null);
                        }}
                        style={[
                            styles.segmentButton,
                            activeTab === 'ticket' && styles.segmentButtonActive
                        ]}
                    >
                        <Text style={[
                            styles.segmentText,
                            activeTab === 'ticket' && styles.segmentTextActive
                        ]}>כרטיסיות</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Content */}
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Client Selection - Simplified when selected */}
                {selectedClient ? (
                    <View style={styles.selectedClientCard}>
                        <View style={styles.clientAvatar}>
                            <Text style={styles.clientInitials}>
                                {selectedClient.full_name?.[0]?.toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.clientDetails}>
                            <Text style={styles.clientName}>{selectedClient.full_name}</Text>
                            <Text style={styles.clientEmail}>{selectedClient.email}</Text>
                        </View>
                        <TouchableOpacity onPress={handleRemoveClient} style={styles.removeClientButton}>
                            <X size={20} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardHeaderRight}>
                                <View style={styles.iconCircle}>
                                    <User size={18} color="#64748b" />
                                </View>
                                <Text style={styles.cardTitle}>בחר לקוח</Text>
                            </View>
                        </View>

                        <View style={styles.searchInputContainer}>
                            <Search size={18} color="#94a3b8" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="חפש לפי שם או אימייל..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholderTextColor="#94a3b8"
                            />
                        </View>

                        {searchQuery.length > 1 && (
                            <View style={styles.searchResults}>
                                {loadingClients ? (
                                    <Spinner size="sm" />
                                ) : clients.length === 0 ? (
                                    <Text style={styles.noResults}>לא נמצאו תוצאות</Text>
                                ) : (
                                    clients.map((client, index) => (
                                        <TouchableOpacity
                                            key={client.id}
                                            style={[
                                                styles.searchResultItem,
                                                index !== clients.length - 1 && styles.searchResultBorder
                                            ]}
                                            onPress={() => handleClientSelect(client)}
                                        >
                                            <View style={styles.resultAvatar}>
                                                <Text style={styles.resultInitials}>
                                                    {client.full_name?.[0]?.toUpperCase()}
                                                </Text>
                                            </View>
                                            <View style={styles.resultInfo}>
                                                <Text style={styles.resultName}>{client.full_name}</Text>
                                                <Text style={styles.resultEmail}>{client.email}</Text>
                                            </View>
                                            <ChevronRight size={18} color="#94a3b8" />
                                        </TouchableOpacity>
                                    ))
                                )}
                            </View>
                        )}
                    </View>
                )}

                {/* Plans - Expandable Cards like Shop */}
                {loadingPlans ? (
                    <Spinner size="lg" />
                ) : (
                    plans.map((plan) => {
                        const isSelected = selectedPlanId === plan.id;
                        const isTicket = plan.type === 'ticket';

                        return (
                            <TouchableOpacity
                                key={plan.id}
                                onPress={() => handleSelectPlan(plan.id)}
                                activeOpacity={0.9}
                                style={[
                                    styles.planCard,
                                    isSelected && styles.planCardSelected
                                ]}
                            >
                                {/* Header Row */}
                                <View style={styles.planCardHeader}>
                                    <View style={styles.planCardLeft}>
                                        {renderPlanImage(plan)}

                                        {/* Badge */}
                                        {!isTicket && (
                                            <LinearGradient
                                                colors={[Colors.gradient1, Colors.gradient2]}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={styles.planBadge}
                                            >
                                                <Text style={styles.planBadgeText}>חופשי חודשי</Text>
                                            </LinearGradient>
                                        )}
                                        {isTicket && (
                                            <LinearGradient
                                                colors={[Colors.gradient1, Colors.gradient2]}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={styles.planBadge}
                                            >
                                                <Text style={styles.planBadgeText}>
                                                    {plan.total_sessions === 10 ? '69₪ לאימון' : plan.total_sessions === 20 ? '54₪ לאימון' : `${plan.total_sessions} אימונים`}
                                                </Text>
                                            </LinearGradient>
                                        )}
                                    </View>

                                    <View style={styles.planCardRight}>
                                        <Text style={styles.planPrice}>₪{plan.price}</Text>
                                        {!isTicket && <Text style={styles.planPriceSub}>ל-6 חודשים</Text>}
                                    </View>
                                </View>

                                {/* Description (always visible) */}
                                {plan.description && (
                                    <Text style={styles.planDescription} numberOfLines={isSelected ? undefined : 1}>
                                        {plan.description.split('\n')[0]}
                                    </Text>
                                )}

                                {/* Expanded Content - Only Date Pickers */}
                                {isSelected && (
                                    <View style={styles.expandedContent}>
                                        {/* Start Date Picker */}
                                        <TouchableOpacity
                                            style={styles.datePickerRowInline}
                                            onPress={() => {
                                                setEditingDateType('start');
                                                setCalendarDisplayDate(customStartDate);
                                                setShowCalendarModal(true);
                                            }}
                                        >
                                            <Text style={styles.datePickerLabelInline}>תאריך התחלה:</Text>
                                            <View style={styles.datePickerValueContainer}>
                                                <Text style={styles.datePickerValueText}>{formatDateHebrew(customStartDate)}</Text>
                                                <Calendar size={18} color={Colors.primary} />
                                            </View>
                                        </TouchableOpacity>

                                        {/* End Date Picker */}
                                        <TouchableOpacity
                                            style={styles.datePickerRowInline}
                                            onPress={() => {
                                                setEditingDateType('end');
                                                setCalendarDisplayDate(customEndDate);
                                                setShowCalendarModal(true);
                                            }}
                                        >
                                            <Text style={styles.datePickerLabelInline}>תאריך סיום:</Text>
                                            <View style={styles.datePickerValueContainer}>
                                                <Text style={styles.datePickerValueText}>{formatDateHebrew(customEndDate)}</Text>
                                                <Calendar size={18} color={Colors.primary} />
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {/* Expand Indicator */}
                                {!isSelected && (
                                    <View style={styles.expandIndicator}>
                                        <ChevronDown size={20} color="#e2e8f0" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })
                )}


            </ScrollView>

            {/* Sticky Footer - Animated like Shop */}
            {selectedPlanId && selectedClient && (
                <Animated.View
                    entering={SlideInDown.duration(400)}
                    exiting={SlideOutDown.duration(300)}
                    style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}
                >
                    <View style={styles.footerContent}>
                        <View style={styles.footerLeft}>
                            <Text style={styles.footerLabel}>סה"כ לתשלום</Text>
                            <Text style={styles.footerTotal}>₪{calculateTotal().toFixed(0)}</Text>
                        </View>

                        <TouchableOpacity
                            onPress={handleProceed}
                            activeOpacity={0.8}
                            style={styles.proceedButton}
                        >
                            <LinearGradient
                                colors={['#60A5FA', '#3B82F6']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.proceedGradient}
                            >
                                <Text style={styles.proceedText}>המשך לתשלום</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            )}

            {/* Calendar Modal */}
            <Modal visible={showCalendarModal} transparent animationType="slide">
                <Pressable
                    style={styles.calendarModalOverlay}
                    onPress={() => setShowCalendarModal(false)}
                >
                    <Pressable style={styles.calendarModalContent} onPress={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <View style={styles.calendarModalHeader}>
                            <TouchableOpacity
                                onPress={() => setShowCalendarModal(false)}
                                style={styles.modalCloseButton}
                            >
                                <X size={20} color="#64748b" />
                            </TouchableOpacity>
                            <Text style={styles.calendarModalTitle}>
                                {editingDateType === 'start' ? 'בחר תאריך התחלה' : 'בחר תאריך סיום'}
                            </Text>
                            <View style={{ width: 32 }} />
                        </View>

                        {/* Month Navigation */}
                        <View style={styles.calendarNavigation}>
                            <TouchableOpacity
                                onPress={() => navigateCalendarMonth('next')}
                                style={styles.calendarNavButton}
                            >
                                <ChevronRight size={20} color="#374151" />
                            </TouchableOpacity>
                            <Text style={styles.calendarMonthYear}>
                                {MONTHS_HEBREW[calendarDisplayDate.getMonth()]} {calendarDisplayDate.getFullYear()}
                            </Text>
                            <TouchableOpacity
                                onPress={() => navigateCalendarMonth('prev')}
                                style={styles.calendarNavButton}
                            >
                                <ChevronDown size={20} color="#374151" style={{ transform: [{ rotate: '90deg' }] }} />
                            </TouchableOpacity>
                        </View>

                        {/* Day Headers */}
                        <View style={styles.calendarDayHeaders}>
                            {DAYS_HEBREW.map((day, idx) => (
                                <View key={idx} style={styles.calendarDayHeader}>
                                    <Text style={styles.calendarDayHeaderText}>{day}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Calendar Grid */}
                        <View style={styles.calendarGrid}>
                            {getCalendarDays(calendarDisplayDate).map((week, weekIdx) => (
                                <View key={weekIdx} style={styles.calendarWeek}>
                                    {week.map((day, dayIdx) => {
                                        if (day === null) {
                                            return <View key={dayIdx} style={styles.calendarDayEmpty} />;
                                        }

                                        const cellDate = new Date(calendarDisplayDate.getFullYear(), calendarDisplayDate.getMonth(), day);
                                        const isToday = new Date().toDateString() === cellDate.toDateString();
                                        const isSelected = editingDateType === 'start'
                                            ? customStartDate.toDateString() === cellDate.toDateString()
                                            : customEndDate.toDateString() === cellDate.toDateString();
                                        const isDisabled = editingDateType === 'end' && cellDate < customStartDate;

                                        return (
                                            <TouchableOpacity
                                                key={dayIdx}
                                                style={[
                                                    styles.calendarDay,
                                                    isToday && styles.calendarDayToday,
                                                    isSelected && styles.calendarDaySelected,
                                                    isDisabled && styles.calendarDayDisabled,
                                                ]}
                                                onPress={() => !isDisabled && handleCalendarDateSelect(day)}
                                                disabled={isDisabled}
                                            >
                                                <Text style={[
                                                    styles.calendarDayText,
                                                    isToday && styles.calendarDayTextToday,
                                                    isSelected && styles.calendarDayTextSelected,
                                                    isDisabled && styles.calendarDayTextDisabled,
                                                ]}>
                                                    {day}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            ))}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },

    // Header - Shop Style
    header: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        backgroundColor: '#fff',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 5,
        zIndex: 10,
    },
    backButton: {
        position: 'absolute',
        left: 20,
        top: 60,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '500',
        marginTop: 8,
        marginBottom: 20,
    },

    // Segmented Control
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        borderRadius: 100,
        padding: 4,
        width: '100%',
        maxWidth: 300,
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    segmentButtonActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    segmentText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748b',
    },
    segmentTextActive: {
        color: '#1a1a2e',
    },

    // Scroll Content
    scrollContent: {
        padding: 20,
        paddingBottom: 200,
        gap: 16,
    },

    // Card Base
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 4,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    cardHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a2e',
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircleActive: {
        backgroundColor: Colors.primary,
    },
    removeButton: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#fef2f2',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Client Selection
    selectedClientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        gap: 14,
    },
    clientAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clientInitials: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 18,
    },
    clientDetails: {
        flex: 1,
    },
    clientName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a2e',
        textAlign: 'left',
    },
    clientEmail: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 2,
        textAlign: 'left',
    },

    // Search
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 16,
        marginTop: 0,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: 10,
    },
    searchInput: {
        flex: 1,
        height: 48,
        fontSize: 15,
        color: '#1a1a2e',
        textAlign: 'right',
    },
    searchResults: {
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        paddingHorizontal: 18,
        gap: 12,
    },
    searchResultBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    resultAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    resultInitials: {
        color: '#64748b',
        fontWeight: '600',
        fontSize: 14,
    },
    resultInfo: {
        flex: 1,
    },
    resultName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1a1a2e',
        textAlign: 'left',
    },
    resultEmail: {
        fontSize: 12,
        color: '#94a3b8',
        textAlign: 'left',
    },
    noResults: {
        padding: 20,
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: 14,
    },

    // Plan Cards
    planCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    planCardSelected: {
        borderColor: `${Colors.primary}30`,
        backgroundColor: '#fafafa',
        shadowColor: Colors.primary,
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
    },
    planCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    planCardLeft: {
        flex: 1,
        marginRight: 16,
        gap: 10,
    },
    planCardRight: {
        alignItems: 'flex-end',
    },
    planImage: {
        width: 140,
        height: 28,
    },
    planNameFallback: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a2e',
    },
    planBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 100,
        alignSelf: 'flex-start',
    },
    planBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#fff',
    },
    planPrice: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1a1a2e',
    },
    planPriceSub: {
        fontSize: 12,
        color: '#94a3b8',
    },
    planDescription: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 12,
        textAlign: 'left',
        lineHeight: 20,
    },
    expandedContent: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        gap: 12,
    },
    datePickerRowInline: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8fafc',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    datePickerLabelInline: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    datePickerValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    datePickerValueText: {
        fontSize: 14,
        color: '#1a1a2e',
        fontWeight: '500',
    },
    expandIndicator: {
        alignItems: 'center',
        marginTop: 8,
    },

    // Discount Section
    discountHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 18,
    },
    discountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 18,
        paddingBottom: 18,
    },
    discountInput: {
        flex: 1,
        height: 48,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a2e',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    discountTypeButton: {
        width: 48,
        height: 48,
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    discountTypeText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#374151',
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 10,
    },
    footerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    footerLeft: {
        flex: 1,
        marginRight: 16,
    },
    footerLabel: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500',
    },
    footerTotal: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1a1a2e',
    },
    proceedButton: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    proceedGradient: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    proceedText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 8,
        paddingHorizontal: 20,
        paddingBottom: 34,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        marginBottom: 20,
    },
    modalCloseButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a2e',
    },
    datePickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    datePickerLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#f8fafc',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    datePickerValue: {
        fontSize: 15,
        color: '#1a1a2e',
        fontWeight: '500',
    },
    modalConfirmButton: {
        backgroundColor: Colors.primary,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 20,
    },
    modalConfirmText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },

    // Selected Client Card
    selectedClientCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 4,
    },
    removeClientButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#fef2f2',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Calendar Modal
    calendarModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    calendarModalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 8,
        paddingHorizontal: 20,
        paddingBottom: 34,
    },
    calendarModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        marginBottom: 16,
    },
    calendarModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a2e',
    },
    calendarNavigation: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    calendarNavButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    calendarMonthYear: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a2e',
    },
    calendarDayHeaders: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    calendarDayHeader: {
        flex: 1,
        alignItems: 'center',
    },
    calendarDayHeaderText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#94a3b8',
    },
    calendarGrid: {
        marginBottom: 16,
    },
    calendarWeek: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    calendarDayEmpty: {
        flex: 1,
        aspectRatio: 1,
    },
    calendarDay: {
        flex: 1,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
    },
    calendarDayToday: {
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    calendarDaySelected: {
        backgroundColor: Colors.primary,
    },
    calendarDayDisabled: {
        opacity: 0.3,
    },
    calendarDayText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1a1a2e',
    },
    calendarDayTextToday: {
        color: Colors.primary,
        fontWeight: '700',
    },
    calendarDayTextSelected: {
        color: '#fff',
        fontWeight: '700',
    },
    calendarDayTextDisabled: {
        color: '#cbd5e1',
    },
});

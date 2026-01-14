import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { supabase } from '@/constants/supabase';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

// --- Icons Helper ---
const RenderIcon = ({ name, iosName, size = 24, color = '#000', style }: { name: any, iosName: string, size?: number, color?: string, style?: any }) => {
    if (Platform.OS === 'ios') {
        return <SymbolView name={iosName} size={size} tintColor={color} resizeMode="scaleAspectFit" style={style} />;
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
    price: number;
    type: 'subscription' | 'ticket';
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
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [loadingPlans, setLoadingPlans] = useState(false);

    const [discountValue, setDiscountValue] = useState('');
    const [discountType, setDiscountType] = useState<'nis' | '%'>('nis');
    const [showDiscountInput, setShowDiscountInput] = useState(false);

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
                    .select('id, full_name, email, avatar_url') // Phone excluded as per previous fix
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
                    const { data: subs } = await supabase.from('subscription_plans').select('*').eq('is_active', true);
                    console.log('[POS] Raw subscription plans:', subs);
                    // Map price-6-months to price field
                    data = (subs || []).map((p: any) => {
                        const price = p['price-6-months'] || 0;
                        console.log(`[POS] Plan ${p.name}: price-6-months = ${p['price-6-months']}, mapped price = ${price}`);
                        return {
                            ...p,
                            type: 'subscription',
                            price
                        };
                    });
                } else {
                    const { data: ticks } = await supabase.from('ticket_plans').select('*').eq('is_active', true);
                    console.log('[POS] Raw ticket plans:', ticks);
                    data = (ticks || []).map((p: any) => ({ ...p, type: 'ticket' }));
                }
                console.log('[POS] Final plans:', data);
                setPlans(data);
            } catch (e) {
                console.error('[POS] Error fetching plans:', e);
            } finally {
                setLoadingPlans(false);
            }
        };
        fetchPlans();
    }, [activeTab]);

    // --- Logic ---
    const calculateTotal = () => {
        if (!selectedPlan) return 0;
        let price = selectedPlan.price;
        const disc = parseFloat(discountValue) || 0;
        if (disc > 0) {
            if (discountType === 'nis') price -= disc;
            else price -= price * (disc / 100);
        }
        return Math.max(0, price);
    };

    const handleProceed = () => {
        if (!selectedClient) {
            Alert.alert('חסר לקוח', 'אנא בחר לקוח כדי להמשיך');
            return;
        }
        if (!selectedPlan) {
            Alert.alert('עגלה ריקה', 'אנא בחר מוצר כדי להמשיך');
            return;
        }

        const total = calculateTotal();
        const items = [{
            id: selectedPlan.id,
            name: selectedPlan.name_hebrew || selectedPlan.name,
            price: selectedPlan.price,
            type: selectedPlan.type
        }];

        router.push({
            pathname: '/admin/pos/payment',
            params: {
                clientId: selectedClient.id,
                clientName: selectedClient.full_name,
                clientEmail: selectedClient.email,
                clientPhone: selectedClient.phone || '', // Fallback if missing
                totalAmount: total.toString(),
                cartItems: JSON.stringify(items),
                planId: selectedPlan.id, // For legacy logic support
                planType: selectedPlan.type,
            }
        });
    };

    return (
        <View style={styles.container}>
            {/* Header: Client Selection */}
            <LinearGradient
                colors={['#1a1a1a', '#000000', '#000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[styles.header, { paddingTop: insets.top }]}
            >
                <Text style={styles.screenTitle}>קופה רושמת</Text>

                {selectedClient ? (
                    <Animated.View entering={FadeIn} style={styles.selectedClientCard}>
                        <View style={styles.clientAvatar}>
                            <Text style={styles.clientInitials}>{selectedClient.full_name?.[0]}</Text>
                        </View>
                        <View style={styles.clientInfo}>
                            <Text style={styles.clientName}>{selectedClient.full_name}</Text>
                            <Text style={styles.clientSub}>{selectedClient.email}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setSelectedClient(null)} style={styles.removeClientBtn}>
                            <RenderIcon name="close" iosName="xmark" size={16} color="#fff" />
                        </TouchableOpacity>
                    </Animated.View>
                ) : (
                    <View style={styles.searchBar}>
                        <RenderIcon name="search" iosName="magnifyingglass" size={20} color="#9CA3AF" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="חפש לקוח..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>
                )}

                {/* Search Results */}
                {!selectedClient && searchQuery.length > 1 && (
                    <View style={styles.searchResults}>
                        {loadingClients ? <ActivityIndicator color={Colors.primary} /> : (
                            clients.map(client => (
                                <TouchableOpacity
                                    key={client.id}
                                    style={styles.resultItem}
                                    onPress={() => { setSelectedClient(client); setSearchQuery(''); }}
                                >
                                    <Text style={styles.resultName}>{client.full_name}</Text>
                                    <Text style={styles.resultEmail}>{client.email}</Text>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                )}
            </LinearGradient>

            {/* Body: Product Selection */}
            <View style={{ flex: 1 }}>
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'subscription' && styles.activeTab]}
                        onPress={() => setActiveTab('subscription')}
                    >
                        <RenderIcon name="card" iosName="creditcard.fill" size={18} color={activeTab === 'subscription' ? '#fff' : '#4B5563'} />
                        <Text style={[styles.tabText, activeTab === 'subscription' && styles.activeTabText]}>מנויים</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'ticket' && styles.activeTab]}
                        onPress={() => setActiveTab('ticket')}
                    >
                        <RenderIcon name="ticket" iosName="ticket.fill" size={18} color={activeTab === 'ticket' ? '#fff' : '#4B5563'} />
                        <Text style={[styles.tabText, activeTab === 'ticket' && styles.activeTabText]}>כרטיסיות</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.gridContent} showsVerticalScrollIndicator={false}>
                    {loadingPlans ? (
                        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
                    ) : (
                        <View style={styles.grid}>
                            {plans.map(plan => {
                                const isSelected = selectedPlan?.id === plan.id;
                                return (
                                    <TouchableOpacity
                                        key={plan.id}
                                        style={[styles.card, isSelected && styles.selectedCard]}
                                        onPress={() => setSelectedPlan(plan)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={[styles.cardIcon, isSelected && { backgroundColor: Colors.primary }]}>
                                            <RenderIcon
                                                name={plan.type === 'subscription' ? 'ribbon' : 'ticket'}
                                                iosName={plan.type === 'subscription' ? 'crown.fill' : 'ticket.fill'}
                                                size={24}
                                                color={isSelected ? '#fff' : Colors.primary}
                                            />
                                        </View>
                                        <Text style={styles.cardPrice}>₪{plan.price}</Text>
                                        <Text style={styles.cardTitle} numberOfLines={2}>{plan.name_hebrew || plan.name}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
            </View>

            {/* Sticky Footer */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
                <View style={[styles.footer, { paddingBottom: insets.bottom + 85 }]}>
                    {/* 85 is approx for CustomTabBar height */}

                    {/* Discount Row */}
                    <TouchableOpacity style={styles.discountToggle} onPress={() => setShowDiscountInput(!showDiscountInput)}>
                        <RenderIcon name="pricetag" iosName="tag.fill" size={14} color="#6B7280" />
                        <Text style={styles.discountLabel}>
                            {discountValue ? `הנחה: ${discountValue}${discountType === 'nis' ? '₪' : '%'}` : 'הוסף הנחה'}
                        </Text>
                    </TouchableOpacity>

                    {showDiscountInput && (
                        <Animated.View entering={FadeInUp} style={styles.discountInputRow}>
                            <TextInput
                                style={styles.discInput}
                                placeholder="0"
                                keyboardType="numeric"
                                value={discountValue}
                                onChangeText={setDiscountValue}
                                autoFocus
                            />
                            <TouchableOpacity onPress={() => setDiscountType(t => t === 'nis' ? '%' : 'nis')} style={styles.discTypeBtn}>
                                <Text style={styles.discTypeText}>{discountType === 'nis' ? '₪' : '%'}</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    <View style={styles.footerMain}>
                        <View>
                            <Text style={styles.totalLabel}>סה"כ לתשלום</Text>
                            <Text style={styles.totalValue}>₪{calculateTotal().toFixed(0)}</Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.proceedBtn, (!selectedClient || !selectedPlan) && styles.proceedBtnDisabled]}
                            onPress={handleProceed}
                            disabled={!selectedClient || !selectedPlan}
                        >
                            <Text style={styles.proceedText}>המשך לתשלום</Text>
                            <RenderIcon name="arrow-forward" iosName="arrow.right" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },

    // Header
    header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, overflow: 'hidden', zIndex: 10 },
    screenTitle: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'left', marginBottom: 12 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    searchInput: { flex: 1, textAlign: 'right', marginLeft: 10, fontSize: 16, height: '100%', color: '#fff' },

    searchResults: { position: 'absolute', top: 120, left: 20, right: 20, backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, padding: 8 },
    resultItem: { padding: 12, borderBottomWidth: 1, borderColor: '#F3F4F6' },
    resultName: { fontWeight: '700', fontSize: 16, textAlign: 'left' },
    resultEmail: { color: '#6B7280', fontSize: 12, textAlign: 'left' },

    selectedClientCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    clientAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
    clientInitials: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    clientInfo: { flex: 1, marginLeft: 12, alignItems: 'flex-start' },
    clientName: { fontWeight: '700', color: '#fff', fontSize: 16 },
    clientSub: { color: '#D1D5DB', fontSize: 12 },
    removeClientBtn: { padding: 8 },

    // Tabs
    tabsContainer: { flexDirection: 'row', padding: 16, gap: 12 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: '#fff', borderRadius: 12, gap: 8, borderWidth: 1, borderColor: '#E5E7EB' },
    activeTab: { backgroundColor: '#111827', borderColor: '#111827' },
    tabText: { fontWeight: '600', color: '#4B5563' },
    activeTabText: { color: '#fff' },

    // Grid
    gridContent: { paddingHorizontal: 16, paddingBottom: 20 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    card: { width: (width - 44) / 2, backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 4 },
    selectedCard: { borderColor: Colors.primary, backgroundColor: '#FEF2F2' },
    cardIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    cardPrice: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
    cardTitle: { fontSize: 14, color: '#4B5563', textAlign: 'center', height: 40 },

    // Footer
    footer: { backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#E5E7EB', padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10 },
    discountToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    discountLabel: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
    discountInputRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    discInput: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 8, padding: 8, textAlign: 'center', fontSize: 16 },
    discTypeBtn: { width: 40, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
    discTypeText: { fontWeight: '700', color: '#374151' },

    footerMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontSize: 14, color: '#6B7280' },
    totalValue: { fontSize: 32, fontWeight: '900', color: '#111827' },

    proceedBtn: { backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 16, gap: 8 },
    proceedBtnDisabled: { backgroundColor: '#D1D5DB' },
    proceedText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

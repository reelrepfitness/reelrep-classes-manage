import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Platform,
    TextInput,
    Modal,
    KeyboardAvoidingView,
    ActivityIndicator,
    I18nManager,
    Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { supabase } from '@/constants/supabase';
import { useGreenInvoice } from '@/app/hooks/useGreenInvoice';
import { PaymentType } from '@/types/green-invoice';
import * as Linking from 'expo-linking';

// Ensure RTL
I18nManager.allowRTL(true);

const TAB_BAR_HEIGHT = 80;
const { width } = Dimensions.get('window');

// --- Config ---
const PAYMENT_METHODS = [
    { id: 'credit_card', label: 'כרטיס אשראי', icon: 'card', iosIcon: 'creditcard.fill', color: '#2563EB', bg: '#EFF6FF' },
    { id: 'cash', label: 'מזומן', icon: 'cash', iosIcon: 'banknote.fill', color: '#059669', bg: '#ECFDF5' },
    { id: 'bit', label: 'ביט / אפליקציה', icon: 'phone-portrait', iosIcon: 'iphone.circle.fill', color: '#7C3AED', bg: '#F5F3FF', image: require('@/assets/images/bit-icon.png') },
    { id: 'debt', label: 'רשום כחוב', icon: 'document-text', iosIcon: 'signature', color: '#DC2626', bg: '#FEF2F2' },
];

// --- Icons Helper ---
const RenderIcon = ({ name, iosName, size = 24, color = '#000', style }: any) => {
    if (Platform.OS === 'ios') {
        return <SymbolView name={iosName} size={size} tintColor={color} resizeMode="scaleAspectFit" style={style} />;
    }
    return <Ionicons name={name} size={size} color={color} style={style} />;
};

export default function POSPaymentScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();

    // Data parsing
    const clientData = {
        id: params.clientId as string,
        name: params.clientName as string,
    };
    const totalAmount = parseFloat(params.totalAmount as string || '0');
    const items = params.cartItems ? JSON.parse(params.cartItems as string) : [];

    // State
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
    const [amountInput, setAmountInput] = useState('');

    const { createInvoice } = useGreenInvoice();

    // Computed
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingAmount = Math.max(0, totalAmount - totalPaid);
    const isFullyPaid = remainingAmount < 0.1;

    // Mock Suggestions
    const suggestions = searchQuery.length > 0
        ? ['ישראל ישראלי', 'אבי כהן', 'דני לוי', 'רוני דואני', 'אלירן סבג'].filter(s => s.includes(searchQuery))
        : [];

    const handleMethodPress = (methodId: string) => {
        if (remainingAmount <= 0) return;
        setSelectedMethod(methodId);
        setAmountInput(remainingAmount.toString());
        setModalVisible(true);
    };

    const confirmAddPayment = () => {
        const amt = parseFloat(amountInput);
        if (isNaN(amt) || amt <= 0) return;
        setPayments(prev => [...prev, { id: Date.now().toString(), method: selectedMethod, amount: amt }]);
        setModalVisible(false);
    };

    const removePayment = (id: string) => {
        setPayments(prev => prev.filter(p => p.id !== id));
    };

    const handleFinish = async () => {
        setLoading(true);
        // Simulation for UI check
        setTimeout(() => {
            setLoading(false);
            Alert.alert("הצלחה", "חשבונית הופקה בהצלחה!");
        }, 1500);
    };

    return (
        <View style={styles.container}>

            {/* --- 1. Header Section --- */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                        <RenderIcon name="arrow-forward" iosName="arrow.right" size={22} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>תשלום וסיום עסקה</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <RenderIcon name="search" iosName="magnifyingglass" size={18} color="#9CA3AF" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="חפש לקוח לשיוך..."
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={(t) => { setSearchQuery(t); setShowSuggestions(t.length > 0); }}
                        textAlign="right"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearchQuery(''); setShowSuggestions(false); }}>
                            <RenderIcon name="close" iosName="xmark.circle.fill" size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* --- 2. Main Content --- */}
            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 200 }]} showsVerticalScrollIndicator={false}>

                {/* Hero Amount */}
                <View style={styles.heroCard}>
                    <Text style={styles.heroLabel}>יתרה לתשלום</Text>
                    {isFullyPaid ? (
                        <View style={styles.successBadge}>
                            <RenderIcon name="checkmark-circle" iosName="checkmark.circle.fill" size={24} color="#059669" />
                            <Text style={styles.successText}>הכל שולם!</Text>
                        </View>
                    ) : (
                        <Text style={styles.heroAmount}>₪{remainingAmount.toLocaleString()}</Text>
                    )}
                </View>

                {/* Payment Methods Grid */}
                <Text style={styles.sectionHeader}>איך תרצה לשלם?</Text>
                <View style={styles.gridContainer}>
                    {PAYMENT_METHODS.map((method) => (
                        <TouchableOpacity
                            key={method.id}
                            style={[styles.card, { backgroundColor: method.bg }, remainingAmount <= 0 && styles.disabledCard]}
                            onPress={() => handleMethodPress(method.id)}
                            activeOpacity={0.7}
                            disabled={remainingAmount <= 0}
                        >
                            <View style={styles.cardContent}>
                                {method.image ? (
                                    <Image source={method.image} style={styles.cardImage} contentFit="contain" />
                                ) : (
                                    <RenderIcon name={method.icon} iosName={method.iosIcon} size={32} color={method.color} />
                                )}
                                <Text style={[styles.cardLabel, { color: method.color }]}>{method.label}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Added Payments List */}
                {payments.length > 0 && (
                    <View style={styles.summaryContainer}>
                        <Text style={styles.sectionHeader}>פירוט תשלומים</Text>
                        {payments.map((p) => {
                            const m = PAYMENT_METHODS.find(x => x.id === p.method);
                            return (
                                <View key={p.id} style={styles.paymentRow}>
                                    <View style={styles.paymentRowRight}>
                                        <View style={[styles.miniIcon, { backgroundColor: m?.bg }]}>
                                            <RenderIcon name={m?.icon} iosName={m?.iosIcon} size={16} color={m?.color} />
                                        </View>
                                        <Text style={styles.paymentText}>{m?.label}</Text>
                                    </View>
                                    <View style={styles.paymentRowLeft}>
                                        <Text style={styles.paymentAmount}>₪{p.amount}</Text>
                                        <TouchableOpacity onPress={() => removePayment(p.id)} style={styles.trashBtn}>
                                            <RenderIcon name="trash" iosName="trash" size={16} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            {/* --- 3. Absolute Suggestions Layer (Fixes Z-Index Issue) --- */}
            {showSuggestions && suggestions.length > 0 && (
                <View style={[styles.suggestionsLayer, { top: insets.top + 120 }]}>
                    {suggestions.map((item, idx) => (
                        <TouchableOpacity
                            key={idx}
                            style={styles.suggestionRow}
                            onPress={() => { setSearchQuery(item); setShowSuggestions(false); }}
                        >
                            <RenderIcon name="person" iosName="person.circle" size={20} color="#6B7280" />
                            <Text style={styles.suggestionText}>{item}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* --- 4. Floating Footer --- */}
            <View style={[styles.footerContainer, { bottom: insets.bottom + TAB_BAR_HEIGHT + 10 }]}>
                {/* Top Actions Row */}
                <View style={styles.footerActions}>
                    <TouchableOpacity style={styles.discountBtn}>
                        <RenderIcon name="pricetag" iosName="tag.fill" size={14} color={Colors.primary} />
                        <Text style={styles.discountText}>הוסף הנחה</Text>
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.totalLabel}>סה"כ לתשלום</Text>
                        <Text style={styles.totalValue}>₪{totalAmount.toLocaleString()}</Text>
                    </View>
                </View>

                {/* Main Action Button */}
                <TouchableOpacity
                    style={[styles.mainButton, (!isFullyPaid || loading) && styles.btnDisabled]}
                    onPress={handleFinish}
                    disabled={!isFullyPaid || loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Text style={styles.mainButtonText}>סיים והפק חשבונית</Text>
                            <RenderIcon name="arrow-back" iosName="checkmark.circle.fill" size={20} color="#fff" />
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* --- 5. Amount Modal --- */}
            <Modal visible={modalVisible} transparent animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
                    <TouchableOpacity style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
                    <View style={styles.modalCard}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>הכנס סכום לתשלום</Text>
                        <View style={styles.inputRow}>
                            <Text style={styles.currencySymbol}>₪</Text>
                            <TextInput
                                style={styles.amountInput}
                                value={amountInput}
                                onChangeText={setAmountInput}
                                keyboardType="decimal-pad"
                                autoFocus
                                textAlign="center"
                            />
                        </View>
                        <TouchableOpacity style={styles.confirmBtn} onPress={confirmAddPayment}>
                            <Text style={styles.confirmBtnText}>אישור והוספה</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },

    // Header
    header: { backgroundColor: '#fff', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderColor: '#F3F4F6', zIndex: 10 },
    headerTop: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
    iconButton: { width: 40, height: 40, backgroundColor: '#F3F4F6', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

    // Search
    searchContainer: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: '#E5E7EB' },
    searchInput: { flex: 1, textAlign: 'right', fontSize: 16, color: '#111', marginRight: 8, height: '100%' },

    // Suggestions Absolute Layer
    suggestionsLayer: {
        position: 'absolute', left: 20, right: 20, backgroundColor: '#fff',
        borderRadius: 16, paddingVertical: 8, zIndex: 9999, elevation: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20
    },
    suggestionRow: { flexDirection: 'row-reverse', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: '#F3F4F6', gap: 10 },
    suggestionText: { fontSize: 16, color: '#374151' },

    content: { padding: 20 },

    // Hero
    heroCard: { alignItems: 'center', marginBottom: 30, marginTop: 10 },
    heroLabel: { fontSize: 14, color: '#6B7280', marginBottom: 6, fontWeight: '500' },
    heroAmount: { fontSize: 48, fontWeight: '800', color: '#EF4444', letterSpacing: -1 },
    successBadge: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 6 },
    successText: { color: '#059669', fontWeight: '700', fontSize: 18 },

    // Grid
    sectionHeader: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 12, textAlign: 'right' },
    gridContainer: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12, marginBottom: 30 },
    card: { width: (width - 52) / 2, height: 110, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)' },
    disabledCard: { opacity: 0.4 },
    cardContent: { alignItems: 'center', gap: 8 },
    cardImage: { width: 32, height: 32 },
    cardLabel: { fontSize: 14, fontWeight: '700' },

    // Summary List
    summaryContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
    paymentRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    paymentRowRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
    miniIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    paymentText: { fontSize: 15, fontWeight: '600', color: '#374151' },
    paymentRowLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
    paymentAmount: { fontSize: 16, fontWeight: '700', color: '#111' },
    trashBtn: { padding: 6, backgroundColor: '#FEF2F2', borderRadius: 8 },

    // Footer
    footerContainer: {
        position: 'absolute', left: 16, right: 16, backgroundColor: '#fff',
        borderRadius: 24, padding: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 10,
        zIndex: 50
    },
    footerActions: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    totalLabel: { fontSize: 12, color: '#6B7280', textAlign: 'left' },
    totalValue: { fontSize: 22, fontWeight: '800', color: '#111', textAlign: 'left' },
    discountBtn: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 6 },
    discountText: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
    mainButton: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 16, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 10 },
    btnDisabled: { backgroundColor: '#E5E7EB' },
    mainButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },

    // Modal
    modalContainer: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
    modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalHandle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
    inputRow: { flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
    currencySymbol: { fontSize: 32, fontWeight: '700', color: '#9CA3AF', marginLeft: 8 },
    amountInput: { fontSize: 48, fontWeight: '800', color: '#111', minWidth: 100, textAlign: 'center' },
    confirmBtn: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
    confirmBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' }
});
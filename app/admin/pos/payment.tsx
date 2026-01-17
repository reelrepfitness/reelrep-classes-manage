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
    LayoutAnimation,
    UIManager,
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
import * as Haptics from 'expo-haptics';
import { Tag, ChevronDown, Check } from 'lucide-react-native';

// Ensure RTL
I18nManager.allowRTL(true);

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TAB_BAR_HEIGHT = 80;
const { width } = Dimensions.get('window');

// Payment method images from assets
const PAYMENT_IMAGES = {
    credit_card: require('@/assets/images/credit-card.webp'),
    bit: require('@/assets/images/bit.webp'),
    cash: require('@/assets/images/cash.webp'),
    debt: require('@/assets/images/debt.webp'),
};

const PAYMENT_OPTIONS = [
    { id: 'credit_card', label: 'כרטיס אשראי', image: PAYMENT_IMAGES.credit_card },
    { id: 'bit', label: 'ביט', image: PAYMENT_IMAGES.bit },
    { id: 'cash', label: 'מזומן', image: PAYMENT_IMAGES.cash },
    { id: 'debt', label: 'רשום כחוב', icon: 'document-text', iosIcon: 'signature' },
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
        email: params.clientEmail as string,
        phone: params.clientPhone as string || '',
    };
    const totalAmount = parseFloat(params.totalAmount as string || '0');
    const items = params.cartItems ? JSON.parse(params.cartItems as string) : [];
    const planId = params.planId as string;
    const planType = params.planType as string;
    const startDate = params.startDate as string || new Date().toISOString();
    const endDate = params.endDate as string;

    // State
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

    // Discount State (moved from register)
    const [discountValue, setDiscountValue] = useState('');
    const [discountType, setDiscountType] = useState<'nis' | '%'>('nis');
    const [showDiscountSection, setShowDiscountSection] = useState(false);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [amountInput, setAmountInput] = useState('');

    const { createInvoice } = useGreenInvoice();

    // Calculate discount
    const calculateDiscount = () => {
        const disc = parseFloat(discountValue) || 0;
        if (disc <= 0) return 0;
        if (discountType === 'nis') return disc;
        return totalAmount * (disc / 100);
    };

    const discountedAmount = Math.max(0, totalAmount - calculateDiscount());

    // Computed
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingAmount = Math.max(0, discountedAmount - totalPaid);
    const isFullyPaid = remainingAmount < 0.1;

    const toggleDiscountSection = () => {
        if (Platform.OS !== 'web') {
            Haptics.selectionAsync();
        }
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowDiscountSection(!showDiscountSection);
    };

    const handleMethodPress = (methodId: string) => {
        if (Platform.OS !== 'web') {
            Haptics.selectionAsync();
        }
        setSelectedMethod(methodId);

        // If remaining amount, open modal for amount input
        if (remainingAmount > 0) {
            setAmountInput(remainingAmount.toString());
            setModalVisible(true);
        }
    };

    const confirmAddPayment = () => {
        const amt = parseFloat(amountInput);
        if (isNaN(amt) || amt <= 0) return;
        setPayments(prev => [...prev, { id: Date.now().toString(), method: selectedMethod, amount: amt }]);
        setModalVisible(false);
    };

    const removePayment = (id: string) => {
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setPayments(prev => prev.filter(p => p.id !== id));
    };

    const handleFinish = async () => {
        setLoading(true);
        try {
            // Determine payment method (use first payment or 'mixed' if multiple)
            const paymentMethod = payments.length === 1
                ? payments[0].method
                : payments.length > 1 ? 'mixed' : 'unknown';

            if (planType === 'ticket') {
                // Create ticket
                const item = items[0];
                const { error } = await supabase.from('user_tickets').insert({
                    user_id: clientData.id,
                    plan_id: planId,
                    total_sessions: item.total_sessions || 0,
                    sessions_remaining: item.total_sessions || 0,
                    status: 'active',
                    purchase_date: startDate,
                    expiry_date: endDate,
                    payment_method: paymentMethod,
                    payment_reference: `ADMIN-POS-${Date.now()}`,
                });
                if (error) throw error;
            } else {
                // Create subscription
                const { error } = await supabase.from('user_subscriptions').insert({
                    user_id: clientData.id,
                    plan_id: planId,
                    status: 'active',
                    is_active: true,
                    start_date: startDate,
                    end_date: endDate,
                    payment_method: paymentMethod,
                    payment_reference: `ADMIN-POS-${Date.now()}`,
                    sessions_used_this_week: 0,
                });
                if (error) throw error;
            }

            // Create invoice record
            const { error: invoiceError } = await supabase.from('invoices').insert({
                user_id: clientData.id,
                amount: discountedAmount,
                payment_status: 'paid',
                payment_method: paymentMethod,
                cart_items: items,
                discount_amount: calculateDiscount(),
                created_at: new Date().toISOString(),
            });

            if (invoiceError) {
                console.warn('[POS] Invoice creation warning:', invoiceError);
                // Don't fail the whole operation for invoice error
            }

            Alert.alert("הצלחה", "המנוי/כרטיסייה נוצרו בהצלחה!", [
                { text: "אישור", onPress: () => router.replace('/(tabs)/register') }
            ]);
        } catch (error) {
            console.error('[POS] Error creating subscription/ticket:', error);
            Alert.alert("שגיאה", "אירעה שגיאה ביצירת המנוי. נסה שנית.");
        } finally {
            setLoading(false);
        }
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

                {/* Selected Client Display (replacing search bar) */}
                <View style={styles.selectedClientContainer}>
                    <View style={styles.clientAvatarSmall}>
                        <Text style={styles.clientInitialsSmall}>
                            {clientData.name?.[0]?.toUpperCase() || '?'}
                        </Text>
                    </View>
                    <View style={styles.clientInfoContainer}>
                        <Text style={styles.clientNameSmall}>{clientData.name}</Text>
                        <Text style={styles.clientEmailSmall}>{clientData.email}</Text>
                    </View>
                </View>
            </View>

            {/* --- 2. Main Content --- */}
            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 200 }]} showsVerticalScrollIndicator={false}>

                {/* Discount Card (moved from register) */}
                <View style={styles.discountCard}>
                    <TouchableOpacity
                        onPress={toggleDiscountSection}
                        style={styles.discountHeader}
                        activeOpacity={0.7}
                    >
                        <View style={styles.discountHeaderRight}>
                            <View style={[styles.discountIconCircle, discountValue && styles.discountIconCircleActive]}>
                                <Tag size={16} color={discountValue ? '#fff' : '#64748b'} />
                            </View>
                            <Text style={styles.discountTitle}>
                                {discountValue ? `הנחה: ${discountValue}${discountType === 'nis' ? '₪' : '%'}` : 'הוסף הנחה'}
                            </Text>
                        </View>
                        <ChevronDown
                            size={20}
                            color="#94a3b8"
                            style={{ transform: [{ rotate: showDiscountSection ? '180deg' : '0deg' }] }}
                        />
                    </TouchableOpacity>

                    {showDiscountSection && (
                        <View style={styles.discountInputContainer}>
                            <TextInput
                                style={styles.discountInput}
                                placeholder="0"
                                keyboardType="numeric"
                                value={discountValue}
                                onChangeText={setDiscountValue}
                                textAlign="center"
                            />
                            <TouchableOpacity
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                                    setDiscountType(t => t === 'nis' ? '%' : 'nis');
                                }}
                                style={styles.discountTypeButton}
                            >
                                <Text style={styles.discountTypeText}>{discountType === 'nis' ? '₪' : '%'}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

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

                {/* Payment Methods Grid - 2x2 with cart.tsx styling */}
                <Text style={styles.sectionHeader}>איך תרצה לשלם?</Text>
                <View style={styles.paymentGrid}>
                    {PAYMENT_OPTIONS.map((option) => {
                        const isSelected = selectedMethod === option.id;
                        return (
                            <TouchableOpacity
                                key={option.id}
                                onPress={() => handleMethodPress(option.id)}
                                activeOpacity={0.7}
                                disabled={remainingAmount <= 0}
                                style={[
                                    styles.paymentTile,
                                    isSelected && styles.paymentTileSelected,
                                    remainingAmount <= 0 && styles.paymentTileDisabled,
                                ]}
                            >
                                {isSelected && (
                                    <View style={styles.checkBadge}>
                                        <Check size={10} color="#fff" strokeWidth={3} />
                                    </View>
                                )}
                                {option.image ? (
                                    <Image
                                        source={option.image}
                                        style={styles.paymentImage}
                                        contentFit="contain"
                                    />
                                ) : (
                                    <RenderIcon
                                        name={option.icon}
                                        iosName={option.iosIcon}
                                        size={48}
                                        color={isSelected ? '#da4477' : '#64748b'}
                                    />
                                )}
                                <Text style={[
                                    styles.paymentLabel,
                                    isSelected && styles.paymentLabelSelected
                                ]}>
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Added Payments List */}
                {payments.length > 0 && (
                    <View style={styles.summaryContainer}>
                        <Text style={styles.sectionHeader}>פירוט תשלומים</Text>
                        {payments.map((p) => {
                            const m = PAYMENT_OPTIONS.find(x => x.id === p.method);
                            return (
                                <View key={p.id} style={styles.paymentRow}>
                                    <View style={styles.paymentRowRight}>
                                        <View style={styles.miniIcon}>
                                            {m?.image ? (
                                                <Image source={m.image} style={{ width: 20, height: 20 }} contentFit="contain" />
                                            ) : (
                                                <RenderIcon name={m?.icon} iosName={m?.iosIcon} size={16} color="#64748b" />
                                            )}
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

            {/* --- 3. Sticky Footer --- */}
            <View style={[styles.footerContainer, { paddingBottom: insets.bottom + 16 }]}>
                {/* Top Row - Total */}
                <View style={styles.footerRow}>
                    <Text style={styles.totalLabel}>סה"כ לתשלום</Text>
                    <Text style={styles.totalValue}>₪{discountedAmount.toLocaleString()}</Text>
                </View>
                {calculateDiscount() > 0 && (
                    <View style={styles.footerRow}>
                        <Text style={styles.discountLabel}>הנחה:</Text>
                        <Text style={styles.discountValue}>-₪{calculateDiscount().toLocaleString()}</Text>
                    </View>
                )}

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

            {/* --- 4. Amount Modal --- */}
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
    header: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderColor: '#F3F4F6',
        zIndex: 10,
    },
    headerTop: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
    iconButton: {
        width: 40,
        height: 40,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Selected Client Display
    selectedClientContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 14,
        gap: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    clientAvatarSmall: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clientInitialsSmall: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
    clientInfoContainer: {
        flex: 1,
    },
    clientNameSmall: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a2e',
        textAlign: 'left',
    },
    clientEmailSmall: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 2,
        textAlign: 'left',
    },

    content: { padding: 20 },

    // Discount Card
    discountCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 4,
    },
    discountHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 18,
    },
    discountHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    discountIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    discountIconCircleActive: {
        backgroundColor: Colors.primary,
    },
    discountTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1a1a2e',
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

    // Hero
    heroCard: { alignItems: 'center', marginBottom: 30, marginTop: 10 },
    heroLabel: { fontSize: 14, color: '#6B7280', marginBottom: 6, fontWeight: '500' },
    heroAmount: { fontSize: 48, fontWeight: '800', color: '#EF4444', letterSpacing: -1 },
    successBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    successText: { color: '#059669', fontWeight: '700', fontSize: 18 },

    // Payment Grid - 2x2 with cart.tsx styling
    sectionHeader: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111',
        marginBottom: 12,
        textAlign: 'right',
    },
    paymentGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 30,
    },
    paymentTile: {
        width: '47%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingVertical: 14,
        borderWidth: 2,
        borderColor: '#e2e8f0',
        minHeight: 100,
        opacity: 0.5,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    paymentTileSelected: {
        borderColor: '#1a1a2e',
        opacity: 1,
        transform: [{ scale: 1.05 }],
    },
    paymentTileDisabled: {
        opacity: 0.3,
    },
    checkBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#1a1a2e',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    paymentImage: {
        width: 80,
        height: 80,
    },
    paymentLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1a1a2e',
        marginTop: 4,
    },
    paymentLabelSelected: {
        fontWeight: '700',
        color: '#da4477',
    },

    // Summary List
    summaryContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    paymentRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    paymentRowRight: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
    },
    miniIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    paymentText: { fontSize: 15, fontWeight: '600', color: '#374151' },
    paymentRowLeft: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
    },
    paymentAmount: { fontSize: 16, fontWeight: '700', color: '#111' },
    trashBtn: { padding: 6, backgroundColor: '#FEF2F2', borderRadius: 8 },

    // Footer - Sticky at bottom
    footerContainer: {
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
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    totalLabel: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    totalValue: {
        fontSize: 22,
        fontWeight: '800',
        color: '#111',
    },
    discountLabel: {
        fontSize: 13,
        color: '#10b981',
        fontWeight: '500',
    },
    discountValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#10b981',
    },
    mainButton: {
        backgroundColor: Colors.primary,
        borderRadius: 16,
        paddingVertical: 16,
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    btnDisabled: { backgroundColor: '#E5E7EB' },
    mainButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },

    // Modal
    modalContainer: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
    modalCard: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 24,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
    inputRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    currencySymbol: { fontSize: 32, fontWeight: '700', color: '#9CA3AF', marginLeft: 8 },
    amountInput: { fontSize: 48, fontWeight: '800', color: '#111', minWidth: 100, textAlign: 'center' },
    confirmBtn: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
    confirmBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
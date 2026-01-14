import React, { useState, useMemo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
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
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Colors from '@/constants/colors';
import { supabase } from '@/constants/supabase';
import { useGreenInvoice } from '@/app/hooks/useGreenInvoice';
import { PaymentType } from '@/types/green-invoice';
import { SearchBarWithSuggestions } from '@/components/ui/searchbar';
import * as Linking from 'expo-linking';

// Ensure RTL
I18nManager.allowRTL(true);

// --- Types ---
type PaymentMethod = 'credit_card' | 'cash' | 'bit' | 'debt';

interface Payment {
    id: string;
    method: PaymentMethod;
    amount: number;
}

// --- Icons Helper ---
const RenderIcon = ({ name, iosName, size = 24, color = '#000', style }: { name: any, iosName: string, size?: number, color?: string, style?: any }) => {
    if (Platform.OS === 'ios') {
        return <SymbolView name={iosName as any} size={size} tintColor={color} resizeMode="scaleAspectFit" style={style} />;
    }
    return <Ionicons name={name} size={size} color={color} style={style} />;
};

// --- Config ---
const PAYMENT_METHODS: { id: PaymentMethod, label: string, icon: string, iosIcon: string, color: string, bg: string, image?: any }[] = [
    { id: 'credit_card', label: 'כרטיס אשראי', icon: 'card', iosIcon: 'creditcard.fill', color: '#2563EB', bg: '#EFF6FF', image: require('@/assets/images/credit-card-icon.svg') },
    { id: 'cash', label: 'מזומן', icon: 'cash', iosIcon: 'banknote.fill', color: '#059669', bg: '#ECFDF5', image: require('@/assets/images/cash-icon.svg') },
    { id: 'bit', label: 'ביט / אפליקציה', icon: 'phone-portrait', iosIcon: 'iphone.circle.fill', color: '#7C3AED', bg: '#fff', image: require('@/assets/images/bit-icon.png') },
    { id: 'debt', label: 'רשום כחוב', icon: 'document-text', iosIcon: 'signature', color: '#DC2626', bg: '#FEF2F2' },
];

export default function POSPaymentScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();

    // Data
    const clientData = {
        id: params.clientId as string,
        name: params.clientName as string,
        email: params.clientEmail as string,
        phone: params.clientPhone as string,
    };
    const totalAmount = parseFloat(params.totalAmount as string || '0');
    const items = params.cartItems ? JSON.parse(params.cartItems as string) : [];

    // State
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
    const [amountInput, setAmountInput] = useState('');

    // Mock suggestions
    const suggestions = ['ישראל ישראלי', 'אבי כהן', 'דני לוי'];

    const handleSearch = (text: string) => {
        setSearchQuery(text);
    };

    const { createInvoice } = useGreenInvoice();

    // Computed
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingAmount = Math.max(0, totalAmount - totalPaid);
    const isFullyPaid = remainingAmount < 0.1;

    // Actions
    const handleMethodPress = (method: PaymentMethod) => {
        if (remainingAmount <= 0) return;
        setSelectedMethod(method);
        setAmountInput(remainingAmount.toString());
        setModalVisible(true);
    };

    const confirmAddPayment = () => {
        const amt = parseFloat(amountInput);
        if (isNaN(amt) || amt <= 0) return;
        if (amt > remainingAmount + 0.1) {
            Alert.alert('שגיאה', 'הסכום גבוה מהיתרה לתשלום.');
            return;
        }

        setPayments(prev => [...prev, {
            id: Date.now().toString(),
            method: selectedMethod!,
            amount: amt
        }]);
        setModalVisible(false);
    };

    const removePayment = (id: string) => {
        setPayments(prev => prev.filter(p => p.id !== id));
    };

    const handleFinish = async () => {
        try {
            setLoading(true);

            // Map payment methods to Green Invoice payment types
            const paymentTypeMap: Record<PaymentMethod, PaymentType> = {
                'credit_card': PaymentType.CREDIT_CARD,
                'cash': PaymentType.CASH,
                'bit': PaymentType.BIT,
                'debt': PaymentType.CASH, // Record debt as cash payment
            };

            // Get primary payment method
            const mainPayment = payments[0];
            const greenInvoicePaymentType = paymentTypeMap[mainPayment.method];

            // Map cart items to invoice items with SKUs
            // If items don't have SKU, try to infer from type or use generic SKU
            const invoiceItems = items.map((item: any) => {
                // Determine SKU based on item type or use provided SKU
                let sku = item.sku || 'MISC-001'; // Default to misc if no SKU

                // Try to infer SKU from item name if not provided
                if (!item.sku) {
                    const nameLower = (item.name || '').toLowerCase();
                    if (nameLower.includes('מנוי חודשי')) sku = 'SUB-MONTHLY';
                    else if (nameLower.includes('מנוי') || nameLower.includes('subscription')) sku = 'SUB-MONTHLY';
                    else if (nameLower.includes('10') && nameLower.includes('כניסות')) sku = 'CARD-10';
                    else if (nameLower.includes('20') && nameLower.includes('כניסות')) sku = 'CARD-20';
                    else if (nameLower.includes('כרטיסייה')) sku = 'CARD-10';
                    else if (nameLower.includes('פרימיום')) sku = 'PREMIUM-PACKAGE';
                    else if (nameLower.includes('אימון אישי')) sku = 'PT-SINGLE';
                }

                return {
                    sku,
                    quantity: item.quantity || 1,
                    price: item.price,
                    customDescription: item.name,
                };
            });

            // Create invoice via Green Invoice
            console.log('[POS] Creating invoice for client:', clientData.id);
            console.log('[POS] Client data:', clientData);
            console.log('[POS] Invoice items:', JSON.stringify(invoiceItems, null, 2));
            console.log('[POS] Payment type:', greenInvoicePaymentType);

            const result = await createInvoice({
                clientId: clientData.id,
                items: invoiceItems,
                paymentType: greenInvoicePaymentType,
                remarks: `תשלום POS - ${items.map((i: any) => i.name).join(', ')}`,
                sendEmail: true, // Automatically send PDF to client
            });

            if (result.success) {
                console.log('[POS] Invoice created successfully:', result.invoice?.id);

                // Log internal transactions for tracking
                await supabase.from('transactions').insert(
                    payments.map(p => ({
                        user_id: clientData.id,
                        amount: p.amount,
                        payment_method: p.method,
                        description: `POS: ${items.map((i: any) => i.name).join(', ')}`,
                        status: 'completed',
                        created_at: new Date().toISOString()
                    }))
                );

                // Show success with option to view PDF
                Alert.alert(
                    "הצלחה! 🎉",
                    `העסקה הושלמה והחשבונית נשלחה ללקוח!\n\nחשבונית מספר: ${result.invoice?.green_invoice_number || 'N/A'}\nסכום: ₪${totalAmount.toFixed(2)}`,
                    [
                        {
                            text: "הצג חשבונית PDF",
                            onPress: () => {
                                if (result.pdfUrl) {
                                    Linking.openURL(result.pdfUrl);
                                }
                            }
                        },
                        {
                            text: "סגור",
                            style: "cancel",
                            onPress: () => router.dismissAll()
                        }
                    ]
                );
            } else {
                throw new Error(result.error || 'Failed to create invoice');
            }

        } catch (e: any) {
            console.error('[POS] Error completing transaction:', e);
            Alert.alert(
                "שגיאה",
                `לא הצלחנו להשלים את העסקה:\n\n${e.message || "אירעה שגיאה לא צפויה"}`,
                [{ text: "אישור" }]
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={['#1a1a1a', '#000000', '#000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[styles.header, { paddingTop: insets.top }]}
            >
                <View style={styles.headerTopRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <RenderIcon name="arrow-forward" iosName="arrow.right" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>קופה רושמת</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <SearchBarWithSuggestions
                        placeholder="חפש לקוח..."
                        value={searchQuery}
                        onChangeText={handleSearch}
                        onSearch={handleSearch}
                        suggestions={suggestions}
                        containerStyle={{
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderWidth: 1,
                            borderRadius: 16,
                            height: 50,
                            flexDirection: 'row-reverse'
                        }}
                        inputStyle={{
                            color: '#fff',
                            textAlign: 'right',
                            fontSize: 16
                        }}
                        placeholderTextColor="#9CA3AF"
                        showClearButton={true}
                        showSuggestions={true}
                        leftIcon={<RenderIcon name="search" iosName="magnifyingglass" size={20} color="#9CA3AF" />}
                    />
                </View>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Hero Amount */}
                <View style={styles.amountCard}>
                    <Text style={styles.amountLabel}>יתרה לתשלום</Text>
                    {isFullyPaid ? (
                        <View style={styles.paidBadge}>
                            <RenderIcon name="checkmark-circle" iosName="checkmark.circle.fill" size={20} color="#059669" />
                            <Text style={styles.paidText}>העסקה שולמה במלואה</Text>
                        </View>
                    ) : (
                        <Text style={styles.amountValue}>₪{remainingAmount.toFixed(2)}</Text>
                    )}
                </View>

                {/* Methods Grid */}
                <Text style={styles.sectionTitle}>בחר אמצעי תשלום</Text>
                <View style={styles.grid}>
                    {PAYMENT_METHODS.map(m => (
                        <TouchableOpacity
                            key={m.id}
                            style={[styles.methodCard, { backgroundColor: m.bg }, remainingAmount <= 0 && styles.disabledCard]}
                            onPress={() => handleMethodPress(m.id)}
                            disabled={remainingAmount <= 0}
                            activeOpacity={0.7}
                        >
                            <View style={styles.cardIconContainer}>
                                {m.image ? (
                                    <Image source={m.image} style={{ width: 64, height: 64 }} contentFit="contain" />
                                ) : (
                                    <RenderIcon name={m.icon} iosName={m.iosIcon} size={48} color={m.color} />
                                )}
                            </View>
                            <View style={styles.cardTextContainer}>
                                <Text style={[styles.methodLabel, { color: m.color }]}>{m.label}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Payments List (Receipt View) */}
                {payments.length > 0 && (
                    <View style={styles.receiptContainer}>
                        <Text style={styles.sectionTitle}>פירוט תשלומים</Text>
                        <View style={styles.receiptList}>
                            {payments.map(p => (
                                <View key={p.id} style={styles.receiptRow}>
                                    <View style={styles.receiptRowRight}>
                                        <Text style={styles.receiptMethod}>
                                            {PAYMENT_METHODS.find(m => m.id === p.method)?.label}
                                        </Text>
                                        <Text style={styles.receiptAmount}>₪{p.amount.toFixed(2)}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => removePayment(p.id)} style={styles.deleteBtn}>
                                        <RenderIcon name="trash" iosName="trash" size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            <View style={styles.receiptTotalRow}>
                                <Text style={styles.receiptTotalLabel}>סה"כ שולם:</Text>
                                <Text style={styles.receiptTotalValue}>₪{totalPaid.toFixed(2)}</Text>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Sticky Footer */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <BlurView intensity={20} style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
                    <TouchableOpacity
                        style={[styles.chargeBtn, (!isFullyPaid || loading) && styles.disabledBtn]}
                        onPress={handleFinish}
                        disabled={!isFullyPaid || loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.chargeBtnText}>סיים עסקה והפק חשבונית</Text>
                                <RenderIcon name="checkmark" iosName="checkmark" size={20} color="#fff" />
                            </>
                        )}
                    </TouchableOpacity>
                </BlurView>
            </KeyboardAvoidingView>

            {/* Amount Modal */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            כמה תרצה לשלם ב{PAYMENT_METHODS.find(m => m.id === selectedMethod)?.label}?
                        </Text>

                        <View style={styles.inputWrapper}>
                            <Text style={styles.currencyPrefix}>₪</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={amountInput}
                                onChangeText={setAmountInput}
                                keyboardType="decimal-pad"
                                autoFocus
                                textAlign="center"
                            />
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalVisible(false)}>
                                <Text style={styles.btnTextCancel}>ביטול</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn]} onPress={confirmAddPayment}>
                                <Text style={styles.btnTextConfirm}>הוסף תשלום</Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },

    // Header
    header: {
        // backgroundColor removed (handled by gradient)
        paddingHorizontal: 20,
        paddingBottom: 24,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        overflow: 'hidden'
    },
    headerTopRow: {
        flexDirection: 'row-reverse', // RTL
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    backButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#fff'
    },
    searchContainer: {
        width: '100%',
    },
    searchBar: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#fff',
        textAlign: 'right',
        fontWeight: '500'
    },

    content: {
        padding: 20,
        paddingBottom: 150
    },

    // Hero Amount
    amountCard: {
        alignItems: 'center',
        marginBottom: 32,
        paddingVertical: 20,
    },
    amountLabel: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '600',
        marginBottom: 8
    },
    amountValue: {
        fontSize: 48,
        fontWeight: '800',
        color: '#EF4444', // Red for debt
        letterSpacing: -1
    },
    paidBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8
    },
    paidText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#059669'
    },

    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 16,
        textAlign: 'right' // RTL
    },

    // Grid
    grid: {
        flexDirection: 'row-reverse', // RTL flow
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 32
    },
    methodCard: {
        width: '48%',
        height: 160, // Fixed height for ratio
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0, // Remove padding to let flex containers work freely
        // Subtle shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 2,
        overflow: 'hidden'
    },
    cardIconContainer: {
        flex: 0.7,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10
    },
    cardTextContainer: {
        flex: 0.3,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingHorizontal: 4
    },
    disabledCard: {
        opacity: 0.4
    },
    methodLabel: {
        fontSize: 15,
        fontWeight: '700',
        textAlign: 'center'
    },

    // Receipt List
    receiptContainer: {
        backgroundColor: '#F9FAFB',
        borderRadius: 20,
        padding: 20,
    },
    receiptList: {
        gap: 12
    },
    receiptRow: {
        flexDirection: 'row-reverse', // RTL
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderColor: '#E5E7EB'
    },
    receiptRowRight: {
        flexDirection: 'row-reverse', // RTL
        alignItems: 'center',
        gap: 12
    },
    receiptMethod: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937'
    },
    receiptAmount: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827'
    },
    deleteBtn: {
        padding: 8,
        backgroundColor: '#FEE2E2',
        borderRadius: 10
    },
    receiptTotalRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        marginTop: 4
    },
    receiptTotalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280'
    },
    receiptTotalValue: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.primary
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        borderTopWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)'
    },
    chargeBtn: {
        backgroundColor: Colors.primary,
        flexDirection: 'row-reverse', // RTL Icon
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: 16,
        gap: 10,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6
    },
    disabledBtn: {
        backgroundColor: '#D1D5DB',
        shadowOpacity: 0
    },
    chargeBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800'
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)', // Darker dim
        justifyContent: 'center',
        padding: 24
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
        elevation: 10
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 24,
        textAlign: 'center'
    },
    inputWrapper: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        borderBottomWidth: 2,
        borderColor: Colors.primary,
        marginBottom: 32,
        paddingBottom: 8
    },
    currencyPrefix: {
        fontSize: 32,
        fontWeight: '700',
        color: '#9CA3AF',
        marginLeft: 8
    },
    modalInput: {
        fontSize: 40,
        fontWeight: '800',
        color: '#111827',
        minWidth: 120,
        textAlign: 'center'
    },
    modalButtons: {
        flexDirection: 'row-reverse', // RTL
        gap: 12,
        width: '100%'
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center'
    },
    cancelBtn: {
        backgroundColor: '#F3F4F6'
    },
    confirmBtn: {
        backgroundColor: Colors.primary
    },
    btnTextCancel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#4B5563'
    },
    btnTextConfirm: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff'
    }
});
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Alert,
    TextInput,
    Platform,
    UIManager,
    LayoutAnimation,
    StyleSheet,
    Modal,
    Pressable,
    Image,
    Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { useRouter } from 'expo-router';
import {
    Trash2,
    ChevronRight,
    ChevronLeft,
    Lock,
    Check,
    Percent,
    ShoppingBag,
    Minus,
    Plus,
    X,
} from 'lucide-react-native';
import { useShop } from '@/contexts/ShopContext';
import Colors from '@/constants/colors';
import { Spinner } from '@/components/ui/spinner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/constants/supabase';
import { useGreenInvoice } from '@/hooks/useGreenInvoice';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Payment type constants
const PAYMENT_TYPES = {
    CASH: 1,
    CREDIT_CARD: 2,
    BIT: 6,
};

// Payment method images
const PAYMENT_IMAGES = {
    credit_card: require('@/assets/images/credit-card.webp'),
    bit: require('@/assets/images/bit.webp'),
    cash: require('@/assets/images/cash.webp'),
};

const PAYMENT_OPTIONS = [
    {
        id: 'credit_card',
        label: 'כרטיס אשראי',
        type: PAYMENT_TYPES.CREDIT_CARD,
        image: PAYMENT_IMAGES.credit_card,
    },
    {
        id: 'bit',
        label: 'Bit',
        type: PAYMENT_TYPES.BIT,
        image: PAYMENT_IMAGES.bit,
    },
    {
        id: 'cash',
        label: 'מזומן',
        type: PAYMENT_TYPES.CASH,
        image: PAYMENT_IMAGES.cash,
    },
];

export default function CartScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { cart, removeFromCart, getTotal, clearCart, updateQuantity } = useShop();
    const { user } = useAuth();
    const { createPaymentForm } = useGreenInvoice();
    const [processingPayment, setProcessingPayment] = useState(false);
    const [selectedPaymentType, setSelectedPaymentType] = useState<number>(PAYMENT_TYPES.CREDIT_CARD);
    const [couponCode, setCouponCode] = useState('');
    const [couponApplied, setCouponApplied] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [couponId, setCouponId] = useState<string | null>(null);
    const [showCouponInput, setShowCouponInput] = useState(false);
    const [validatingCoupon, setValidatingCoupon] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
    const [paymentConfirmPhase, setPaymentConfirmPhase] = useState<'entering' | 'flying' | 'approved'>('entering');
    const [paymentConfirmTitle, setPaymentConfirmTitle] = useState('');
    const [paymentConfirmMessage, setPaymentConfirmMessage] = useState('');
    const paymentLottieRef = useRef<LottieView>(null);

    const subtotal = getTotal();
    const total = subtotal - discount;

    const handlePaymentSelect = useCallback((type: number) => {
        if (Platform.OS !== 'web') {
            Haptics.selectionAsync();
        }
        setSelectedPaymentType(type);
    }, []);

    const handleRemoveItem = useCallback((itemId: string) => {
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        removeFromCart(itemId);
    }, [removeFromCart]);

    const handleUpdateQuantity = useCallback((itemId: string, newQuantity: number) => {
        if (Platform.OS !== 'web') {
            Haptics.selectionAsync();
        }
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        updateQuantity(itemId, newQuantity);
    }, [updateQuantity]);

    // Calculate total items (sum of all quantities)
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    const toggleCouponInput = useCallback(() => {
        if (Platform.OS !== 'web') {
            Haptics.selectionAsync();
        }
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowCouponInput(!showCouponInput);
    }, [showCouponInput]);

    const [couponLabel, setCouponLabel] = useState('');

    const handleApplyCoupon = useCallback(async () => {
        if (!couponCode.trim() || !user) return;
        setValidatingCoupon(true);
        try {
            const planIds = cart.map(item => item.package.planId);
            const { data, error } = await supabase.rpc('validate_coupon', {
                p_code: couponCode,
                p_user_id: user.id,
                p_plan_ids: planIds,
            });
            if (error) throw error;
            if (!data?.valid) {
                Alert.alert('קוד לא תקין', data?.reason || 'הקוד שהזנת אינו קיים או פג תוקפו');
                return;
            }
            const discountAmt = data.discount_type === 'percentage'
                ? subtotal * (data.discount_value / 100)
                : Math.min(data.discount_value, subtotal);
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setDiscount(discountAmt);
            setCouponApplied(true);
            setCouponId(data.coupon_id);
            setCouponLabel(
                data.discount_type === 'percentage'
                    ? `-${data.discount_value}%`
                    : `-₪${data.discount_value}`
            );
        } catch (err: any) {
            Alert.alert('שגיאה', err.message || 'אירעה שגיאה בבדיקת הקופון');
        } finally {
            setValidatingCoupon(false);
        }
    }, [couponCode, subtotal, user, cart]);

    const openPaymentModal = useCallback(() => {
        if (!user) {
            Alert.alert('שגיאה', 'יש להתחבר כדי לבצע רכישה');
            return;
        }
        if (cart.length === 0) {
            Alert.alert('שגיאה', 'הסל ריק');
            return;
        }
        if (Platform.OS !== 'web') {
            Haptics.selectionAsync();
        }
        setShowPaymentModal(true);
    }, [user, cart.length]);

    const handlePaymentConfirmDismiss = useCallback(() => {
        setPaymentConfirmPhase('approved');
    }, []);

    useEffect(() => {
        if (showPaymentConfirm && paymentLottieRef.current) {
            if (paymentConfirmPhase === 'entering') {
                paymentLottieRef.current.play(0, 66);
            } else if (paymentConfirmPhase === 'flying') {
                paymentLottieRef.current.play(10, 66);
            } else {
                paymentLottieRef.current.play(75, 179);
            }
        }
    }, [showPaymentConfirm, paymentConfirmPhase]);

    const handleCheckout = async () => {
        setShowPaymentModal(false);

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        // Calculate fresh from current state to avoid stale closure issues
        const currentSubtotal = getTotal();
        const finalAmount = Math.max(0, currentSubtotal - discount);
        const invoiceId = `invoice-${Date.now()}`;
        const purchaseDescription = `רכישה: ${cart.map(i => i.package.name).join(', ')}`;

        const cartItemsFormatted = cart.map(item => ({
            plan_id: item.package.planId,
            plan_type: item.package.planType as 'subscription' | 'ticket',
            name: item.package.name,
            quantity: item.quantity,
            price: item.package.price,
            duration_months: item.package.durationMonths,
            total_sessions: item.package.totalClasses,
            validity_days: item.package.expiryDays,
            payment_option: item.package.paymentOption,
        }));

        setProcessingPayment(true);

        try {
            // ── FREE PURCHASE (100% coupon) — handle first, regardless of payment method ──
            if (finalAmount <= 0) {
                const { data: invoiceData, error: invoiceError } = await supabase
                    .from('invoices')
                    .insert({
                        user_id: user.id,
                        client_id: user.id,
                        green_invoice_id: `free-${Date.now()}`,
                        green_document_type: 320,
                        amount: 0,
                        vat_amount: 0,
                        total_amount: 0,
                        payment_type: selectedPaymentType,
                        payment_status: 'paid',
                        items: cartItemsFormatted.map(item => ({
                            description: item.name,
                            quantity: item.quantity,
                            price: item.price,
                            currency: 'ILS',
                            vatType: 0,
                        })),
                        cart_items: cartItemsFormatted,
                        description: purchaseDescription,
                        ...(couponId ? { coupon_id: couponId, discount_amount: discount } : {}),
                    })
                    .select('id')
                    .single();

                if (invoiceError || !invoiceData) {
                    console.error('[Shop] Free purchase invoice error:', invoiceError);
                    throw new Error('שגיאה ביצירת חשבונית');
                }

                // Mark coupon as used
                if (couponId) {
                    await supabase.rpc('use_coupon', { p_coupon_id: couponId });
                }

                // Create tickets/subscriptions immediately
                for (const item of cartItemsFormatted) {
                    if (item.plan_type === 'ticket') {
                        const expiryDate = new Date();
                        expiryDate.setDate(expiryDate.getDate() + (item.validity_days || 90));
                        const { error: ticketError } = await supabase.from('user_tickets').insert({
                            user_id: user!.id,
                            plan_id: item.plan_id,
                            total_sessions: item.total_sessions || 0,
                            sessions_remaining: item.total_sessions || 0,
                            status: 'active',
                            purchase_date: new Date().toISOString(),
                            expiry_date: expiryDate.toISOString(),
                            payment_method: 'coupon',
                            payment_reference: `COUPON-${invoiceData.id}`,
                            invoice_id: invoiceData.id,
                            has_debt: false,
                            debt_amount: 0,
                        });
                        if (ticketError) {
                            console.error('[Shop] Ticket insert error:', ticketError);
                            throw new Error('שגיאה ביצירת כרטיסייה');
                        }
                    } else {
                        // Subscription types: 'subscription', 'unlimited', etc.
                        const startDate = new Date();
                        const endDate = new Date();
                        endDate.setMonth(endDate.getMonth() + (item.duration_months || 1));
                        const { error: subError } = await supabase.from('user_subscriptions').insert({
                            user_id: user!.id,
                            plan_id: item.plan_id,
                            start_date: startDate.toISOString(),
                            end_date: endDate.toISOString(),
                            is_active: true,
                            plan_status: 'active',
                            payment_method: 'coupon',
                            payment_reference: `COUPON-${invoiceData.id}`,
                            invoice_id: invoiceData.id,
                            has_debt: false,
                            debt_amount: 0,
                            outstanding_balance: 0,
                        });
                        if (subError) {
                            console.error('[Shop] Subscription insert error:', subError);
                            throw new Error('שגיאה ביצירת מנוי');
                        }
                    }
                }

                setPaymentConfirmTitle('הרכישה הושלמה!');
                setPaymentConfirmMessage('המנוי/כרטיסייה הופעלו בהצלחה.');
                setPaymentConfirmPhase('entering');
                setShowPaymentConfirm(true);
                return;
            }

            // ── CREDIT CARD ──
            if (selectedPaymentType === PAYMENT_TYPES.CREDIT_CARD) {
                const { formUrl, paymentId } = await createPaymentForm(
                    invoiceId,
                    finalAmount,
                    purchaseDescription,
                    user.name || user.email,
                    user.email,
                    cartItemsFormatted
                );

                if (formUrl) {
                    // Store coupon info on the invoice for credit card path
                    if (couponId) {
                        await supabase
                            .from('invoices')
                            .update({ coupon_id: couponId, discount_amount: discount })
                            .eq('id', paymentId);
                        await supabase.rpc('use_coupon', { p_coupon_id: couponId });
                    }
                    router.push({
                        pathname: '/payment',
                        params: { formUrl, invoiceId: paymentId },
                    });
                } else {
                    throw new Error('לא התקבל קישור לתשלום');
                }
            } else {
                // ── MANUAL PAYMENT (cash/bit) ──
                const { data: invoiceData, error: invoiceError } = await supabase
                    .from('invoices')
                    .insert({
                        user_id: user.id,
                        client_id: user.id,
                        green_invoice_id: `pending-${Date.now()}`,
                        green_document_type: 320,
                        amount: finalAmount,
                        vat_amount: finalAmount * 0.17,
                        total_amount: finalAmount * 1.17,
                        payment_type: selectedPaymentType,
                        payment_status: 'pending',
                        items: cartItemsFormatted.map(item => ({
                            description: item.name,
                            quantity: item.quantity,
                            price: item.price,
                            currency: 'ILS',
                            vatType: 0,
                        })),
                        cart_items: cartItemsFormatted,
                        description: purchaseDescription,
                        ...(couponId ? { coupon_id: couponId, discount_amount: discount } : {}),
                    })
                    .select('id')
                    .single();

                if (invoiceError || !invoiceData) {
                    console.error('[Shop] Invoice insert error:', invoiceError);
                    throw new Error('שגיאה ביצירת חשבונית');
                }

                // Mark coupon as used
                if (couponId) {
                    await supabase.rpc('use_coupon', { p_coupon_id: couponId });
                }

                // Create pending approval for admin
                const paymentMethodLabel = selectedPaymentType === PAYMENT_TYPES.BIT ? 'bit' : 'cash';
                const { data: approvalData, error: approvalError } = await supabase
                    .from('pending_payment_approvals')
                    .insert({
                        invoice_id: invoiceData.id,
                        user_id: user!.id,
                        payment_method: paymentMethodLabel,
                        amount: finalAmount,
                        cart_items: cartItemsFormatted,
                        status: 'pending',
                    })
                    .select('id')
                    .single();

                if (approvalError) {
                    console.error('[Shop] Approval insert error:', approvalError);
                    throw new Error('שגיאה ביצירת בקשת אישור');
                }

                // Notify admins — in-app notification
                await supabase.from('admin_notifications').insert({
                    type: 'payment_approval',
                    title: 'בקשת תשלום חדשה',
                    message: `${user.name || user.email} ביקש/ה לרכוש ${cart.map(i => i.package.name).join(', ')} - ₪${finalAmount}`,
                    payload: {
                        approval_id: approvalData.id,
                        client_id: user.id,
                        client_name: user.name || user.email,
                        amount: finalAmount,
                        payment_method: paymentMethodLabel,
                        cart_items: cartItemsFormatted,
                    },
                    is_read: false,
                    status: 'pending',
                });

                // Push-notify all admins
                const { data: admins } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('is_admin', true);

                if (admins?.length) {
                    supabase.functions.invoke('send-push-notification', {
                        body: {
                            user_ids: admins.map((a: any) => a.id),
                            title: 'בקשת תשלום חדשה',
                            body: `${user.name || user.email} מבקש/ת אישור ל${cart.map(i => i.package.name).join(', ')} - ₪${finalAmount}`,
                            notification_type: 'payment_approval',
                            data: { approval_id: approvalData.id },
                        },
                    }).catch(err => console.warn('[Shop] Push notification error:', err));
                }

                setPaymentConfirmTitle(
                    selectedPaymentType === PAYMENT_TYPES.BIT ? 'תשלום ב-Bit' : 'תשלום במזומן'
                );
                setPaymentConfirmMessage(
                    `סכום לתשלום: ₪${finalAmount}\n\n` +
                    (selectedPaymentType === PAYMENT_TYPES.BIT
                        ? 'אנא בצע העברה למספר: 050-XXX-XXXX\n'
                        : 'אנא הגע לסטודיו לביצוע התשלום.\n') +
                    'המנוי/כרטיסייה יופעלו לאחר אישור המנהל.'
                );
                setPaymentConfirmPhase('entering');
                setShowPaymentConfirm(true);
            }
        } catch (error: any) {
            console.error('[Shop] Payment error:', error);
            Alert.alert('שגיאה', error.message || 'אירעה שגיאה בתהליך התשלום');
        } finally {
            setProcessingPayment(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Text style={styles.backText}>חזור</Text>
                    <ChevronRight size={20} color="#1a1a2e" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>סל קניות</Text>
                <View style={{ width: 60 }} />
            </View>

            <KeyboardAwareScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: 160 }
                ]}
                showsVerticalScrollIndicator={false}
            >
                {cart.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconContainer}>
                            <ShoppingBag size={48} color="#cbd5e1" />
                        </View>
                        <Text style={styles.emptyTitle}>העגלה ריקה</Text>
                        <Text style={styles.emptySubtitle}>הוסף פריטים מהחנות כדי להתחיל</Text>
                    </View>
                ) : (
                    <>
                        {/* Cart Items Card */}
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.itemCount}>{totalItems} פריטים</Text>
                                <Text style={styles.cardTitle}>פריטים בהזמנה</Text>
                            </View>

                            {cart.map((item, index) => (
                                <View
                                    key={item.id}
                                    style={[
                                        styles.cartItem,
                                        index !== cart.length - 1 && styles.cartItemBorder
                                    ]}
                                >
                                    <Text style={styles.itemPrice}>
                                        ₪{(item.package.price * item.quantity).toLocaleString()}
                                    </Text>

                                    {/* Quantity Controls */}
                                    <View style={styles.quantityContainer}>
                                        <TouchableOpacity
                                            onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                            style={styles.quantityButton}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Plus size={16} color="#64748b" strokeWidth={2.5} />
                                        </TouchableOpacity>
                                        <Text style={styles.quantityText}>{item.quantity}</Text>
                                        <TouchableOpacity
                                            onPress={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                            style={styles.quantityButton}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Minus size={16} color="#64748b" strokeWidth={2.5} />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.itemInfo}>
                                        <Text style={styles.itemName}>{item.package.name}</Text>
                                        <Text style={styles.itemDuration}>
                                            {item.package.durationMonths
                                                ? `${item.package.durationMonths} חודשים`
                                                : `${item.package.totalClasses} כניסות`}
                                        
                                        </Text>
                                    </View>

                                    <TouchableOpacity
                                        onPress={() => handleRemoveItem(item.id)}
                                        style={styles.deleteButton}
                                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                    >
                                        <Trash2 size={16} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>

                        {/* Coupon Section */}
                        <View style={styles.card}>
                            <TouchableOpacity
                                onPress={toggleCouponInput}
                                style={styles.couponHeader}
                                activeOpacity={0.7}
                            >
                                <View style={styles.couponHeaderRight}>
                                    <View style={[styles.couponIcon, couponApplied && styles.couponIconActive]}>
                                        <Percent size={16} color={couponApplied ? '#fff' : '#64748b'} />
                                    </View>
                                    <Text style={styles.couponTitle}>
                                        {couponApplied ? 'קופון הופעל!' : 'יש לך קוד קופון?'}
                                    </Text>
                                </View>
                                {couponApplied ? (
                                    <View style={styles.couponBadge}>
                                        <Check size={14} color="#10b981" />
                                        <Text style={styles.couponBadgeText}>{couponLabel}</Text>
                                    </View>
                                ) : (
                                    <ChevronLeft
                                        size={20}
                                        color="#94a3b8"
                                        style={{ transform: [{ rotate: showCouponInput ? '-90deg' : '0deg' }] }}
                                    />
                                )}
                            </TouchableOpacity>

                            {showCouponInput && !couponApplied && (
                                <View style={styles.couponInputContainer}>
                                    <TextInput
                                        value={couponCode}
                                        onChangeText={setCouponCode}
                                        placeholder="הזן קוד קופון"
                                        placeholderTextColor="#94a3b8"
                                        style={styles.couponInput}
                                        textAlign="right"
                                        autoCapitalize="characters"
                                    />
                                    <TouchableOpacity
                                        onPress={handleApplyCoupon}
                                        style={[
                                            styles.applyButton,
                                            (!couponCode.trim() || validatingCoupon) && styles.applyButtonDisabled
                                        ]}
                                        disabled={!couponCode.trim() || validatingCoupon}
                                    >
                                        {validatingCoupon ? (
                                            <Spinner size="sm" />
                                        ) : (
                                            <Text style={[
                                                styles.applyButtonText,
                                                !couponCode.trim() && styles.applyButtonTextDisabled
                                            ]}>
                                                החל
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {/* Price Summary */}
                        <View style={styles.card}>
                            <View style={styles.priceRow}>
                                <Text style={styles.priceLabel}>סיכום ביניים</Text>
                                <Text style={styles.priceValue}>₪{subtotal.toLocaleString()}</Text>
                            </View>

                            {discount > 0 && (
                                <View style={styles.priceRow}>
                                    <Text style={styles.discountLabel}>הנחת קופון</Text>
                                    <Text style={styles.discountValue}>-₪{discount.toLocaleString()}</Text>
                                </View>
                            )}

                            <View style={styles.totalDivider} />

                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>סה״כ לתשלום</Text>
                                <View>
                                    <Text style={styles.totalValue}>₪{total.toLocaleString()}</Text>
                                    <Text style={styles.vatText}>כולל מע״מ</Text>
                                </View>
                            </View>
                        </View>

                    </>
                )}
            </KeyboardAwareScrollView>

            {/* Payment Method Modal */}
            <Modal
                visible={showPaymentModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowPaymentModal(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowPaymentModal(false)}
                >
                    <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <TouchableOpacity
                                onPress={() => setShowPaymentModal(false)}
                                style={styles.modalCloseButton}
                            >
                                <X size={20} color="#64748b" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>בחר אמצעי תשלום</Text>
                            <View style={{ width: 32 }} />
                        </View>

                        {/* Payment Options */}
                        <View style={styles.paymentMethods}>
                            {PAYMENT_OPTIONS.map((option) => {
                                const isSelected = selectedPaymentType === option.type;

                                return (
                                    <TouchableOpacity
                                        key={option.id}
                                        onPress={() => handlePaymentSelect(option.type)}
                                        activeOpacity={0.7}
                                        style={[
                                            styles.paymentTile,
                                            isSelected && styles.paymentTileSelected
                                        ]}
                                    >
                                        {isSelected && (
                                            <View style={styles.checkBadge}>
                                                <Check size={10} color="#fff" strokeWidth={3} />
                                            </View>
                                        )}

                                        <Image
                                            source={option.image}
                                            style={styles.paymentImage}
                                            resizeMode="contain"
                                        />

                                        <View style={styles.paymentLabelContainer}>
                                            <Text style={[
                                                styles.paymentLabel,
                                                isSelected && styles.paymentLabelSelected
                                            ]} numberOfLines={1}>
                                                {option.label}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Total in Modal */}
                        <View style={styles.modalTotal}>
                            <Text style={styles.modalTotalValue}>₪{total.toLocaleString()}</Text>
                            <Text style={styles.modalTotalLabel}>סה״כ לתשלום</Text>
                        </View>

                        {/* Confirm Button */}
                        <TouchableOpacity
                            onPress={handleCheckout}
                            disabled={processingPayment}
                            activeOpacity={0.9}
                            style={styles.modalCheckoutButton}
                        >
                            <LinearGradient
                                colors={['#da74baff', '#933f78']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.checkoutGradient}
                            >
                                {processingPayment ? (
                                    <Spinner size="sm" />
                                ) : (
                                    <>
                                        <Lock size={18} color="white" strokeWidth={2.5} />
                                        <Text style={styles.checkoutText}>אישור תשלום</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Payment Confirmation Modal with 2-phase Lottie */}
            <Modal
                visible={showPaymentConfirm}
                transparent
                animationType="fade"
                onRequestClose={() => {}}
            >
                <View style={styles.confirmOverlay}>
                    <View style={styles.confirmDialog}>
                        <View style={styles.confirmLottieContainer}>
                            <LottieView
                                ref={paymentLottieRef}
                                source={require('@/assets/animations/transfer money.json')}
                                loop={paymentConfirmPhase === 'flying'}
                                style={styles.confirmLottie}
                                onAnimationFinish={() => {
                                    if (paymentConfirmPhase === 'entering') {
                                        setPaymentConfirmPhase('flying');
                                    } else if (paymentConfirmPhase === 'approved') {
                                        setShowPaymentConfirm(false);
                                        clearCart();
                                        router.back();
                                    }
                                }}
                            />
                        </View>
                        <Text style={styles.confirmTitle}>{paymentConfirmTitle}</Text>
                        <Text style={styles.confirmMessage}>{paymentConfirmMessage}</Text>
                        {paymentConfirmPhase !== 'approved' && (
                            <TouchableOpacity
                                style={styles.confirmButton}
                                onPress={handlePaymentConfirmDismiss}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.confirmButtonText}>הבנתי</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Sticky Footer */}
            {cart.length > 0 && (
                <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
                    <TouchableOpacity
                        onPress={openPaymentModal}
                        activeOpacity={0.9}
                        style={styles.checkoutButton}
                    >
                        <LinearGradient
                            colors={['#60A5FA', '#3B82F6']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.checkoutGradient}
                        >
                            <Lock size={18} color="white" strokeWidth={2.5} />
                            <Text style={styles.checkoutText}>המשך לתשלום</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    backButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 2,
    },
    backText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1a1a2e',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1a1a2e',
    },
    scrollContent: {
        padding: 20,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a2e',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 15,
        color: '#64748b',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 4,
    },
    cardHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a2e',
    },
    itemCount: {
        fontSize: 18,
        fontWeight: '600',
        color: '#94a3b8',
    },
    cartItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    cartItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    deleteButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#fef2f2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemInfo: {
        flex: 1,
        alignItems: 'flex-start',
        marginHorizontal: 14,
    },
    itemName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a1a2e',
        textAlign: 'right',
    },
    itemDuration: {
        fontSize: 14,
        color: '#64748b',
        marginTop: -3,
    },
    itemUnitPrice: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 2,
    },
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: 10,
        paddingHorizontal: 4,
        paddingVertical: 4,
        marginRight: 12,
    },
    quantityButton: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    quantityText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1a1a2e',
        minWidth: 28,
        textAlign: 'center',
    },
    itemPrice: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a2e',
        minWidth: 70,
        textAlign: 'right',
    },
    couponHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 18,
    },
    couponHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    couponIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    couponIconActive: {
        backgroundColor: '#10b981',
    },
    couponTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a1a2e',
    },
    couponBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#ecfdf5',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    couponBadgeText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#10b981',
    },
    couponInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 18,
        paddingBottom: 18,
    },
    couponInput: {
        flex: 1,
        height: 48,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 15,
        fontWeight: '500',
        color: '#1a1a2e',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    applyButton: {
        height: 48,
        paddingHorizontal: 24,
        backgroundColor: Colors.primary,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    applyButtonDisabled: {
        backgroundColor: '#e2e8f0',
    },
    applyButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
    applyButtonTextDisabled: {
        color: '#94a3b8',
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    priceLabel: {
        fontSize: 14,
        color: '#64748b',
    },
    priceValue: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1a1a2e',
    },
    discountLabel: {
        fontSize: 14,
        color: '#10b981',
    },
    discountValue: {
        fontSize: 15,
        fontWeight: '600',
        color: '#10b981',
    },
    totalDivider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginHorizontal: 20,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a1a2e',
    },
    totalValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1a1a2e',
    },
    vatText: {
        fontSize: 13,
        color: '#94a3b8',
        marginTop: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a2e',
        textAlign: 'right',
        marginBottom: 14,
        marginTop: 8,
    },
    paymentMethods: {
        flexDirection: 'row',
        gap: 10,
    },
    paymentTile: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingTop: 14,
        paddingBottom: 14,
        paddingHorizontal: 6,
        borderWidth: 2,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
        position: 'relative',
        minHeight: 100,
        opacity: 0.5,
    },
    paymentTileSelected: {
        borderColor: '#1a1a2e',
        opacity: 1,
        transform: [{ scale: 1.05 }],
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
        marginBottom: 0,
    },
    paymentLabelContainer: {
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    paymentLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1a1a2e',
        textAlign: 'center',
    },
    paymentLabelSelected: {
        fontWeight: '700',
        color: '#da4477',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        borderTopRightRadius:20,
        borderTopLeftRadius:20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 10,
    },
    footerTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    footerTotalLabel: {
        fontSize: 14,
        color: '#64748b',
    },
    footerTotalValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1a1a2e',
    },
    checkoutButton: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    checkoutGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 18,
    },
    checkoutText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
    },
    // Modal styles
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
        maxHeight: '70%',
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
        fontSize: 20,
        fontWeight: '800',
        color: '#1a1a2e',
    },
    modalTotal: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 20,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        marginTop: 20,
    },
    modalTotalLabel: {
        fontSize: 17,
        fontWeight: '600',
        color: '#64748b',
    },
    modalTotalValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1a1a2e',
    },
    modalCheckoutButton: {
        borderRadius: 16,
        overflow: 'hidden',
        marginTop: 8,
    },
    confirmOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: 24,
    },
    confirmDialog: {
        width: SCREEN_WIDTH - 48,
        maxWidth: 340,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 20,
    },
    confirmLottieContainer: {
        alignItems: 'center',
        marginBottom: 8,
    },
    confirmLottie: {
        width: 320,
        height: 320,
        marginVertical: -50,
    },
    confirmTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 8,
    },
    confirmMessage: {
        fontSize: 16,
        fontWeight: '500',
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    confirmButton: {
        backgroundColor: Colors.primary,
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 40,
        alignItems: 'center',
    },
    confirmButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

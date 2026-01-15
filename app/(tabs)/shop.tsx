import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ShoppingCart, X, CreditCard, Banknote, Smartphone, AlertCircle, Sparkles } from 'lucide-react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { supabase } from '@/constants/supabase';
import { useShop } from '@/contexts/ShopContext';
import { useAuth } from '@/contexts/AuthContext';
import { useGreenInvoice } from '@/app/hooks/useGreenInvoice';
import { CartBottomSheet } from '@/components/shop/CartBottomSheet';
import { hebrew } from '@/constants/hebrew';
import { cn } from '@/lib/utils';
import { useRouter } from 'expo-router';
import { PaymentType } from '@/types/green-invoice';

type PaymentMethodType = 'credit_card' | 'bit' | 'cash' | 'debt';

interface PaymentOption {
    id: PaymentMethodType;
    label: string;
    icon: React.ReactNode;
    greenInvoiceType: PaymentType;
}

export default function ShopScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useAuth();
    const {
        packages,
        isLoading,
        cart,
        addToCart,
        removeFromCart,
        getTotal,
        getDiscountedTotal,
        clearCart,
    } = useShop();

    const { createPaymentForm, loading: invoiceLoading } = useGreenInvoice();
    const cartBottomSheetRef = useRef<BottomSheet>(null);

    const [selectedCategory, setSelectedCategory] = useState<'subscriptions' | 'tickets'>('subscriptions');
    const [processingPayment, setProcessingPayment] = useState(false);

    const shopTabs = [
        { key: 'subscriptions', label: 'מנויים' },
        { key: 'tickets', label: 'כרטיסיות' },
    ] as const;

    const paymentOptions: PaymentOption[] = [
        {
            id: 'credit_card',
            label: 'כרטיס אשראי',
            icon: <CreditCard size={20} color="#09090B" />,
            greenInvoiceType: PaymentType.CREDIT_CARD,
        },
        {
            id: 'bit',
            label: 'Bit / אפליקציה',
            icon: <Smartphone size={20} color="#09090B" />,
            greenInvoiceType: PaymentType.BIT,
        },
        {
            id: 'cash',
            label: 'מזומן (בסטודיו)',
            icon: <Banknote size={20} color="#09090B" />,
            greenInvoiceType: PaymentType.CASH,
        },
    ];

    const handleAddToCart = (pkg: any) => {
        addToCart(pkg);
        // Optionally open bottom sheet when item added
        // cartBottomSheetRef.current?.expand();
    };

    const isInCart = (pkgId: string) => {
        return cart.some(item => item.package.id === pkgId);
    };

    // Handle checkout from CartBottomSheet
    const handleCheckout = async (paymentType: number) => {
        if (!user) {
            Alert.alert('שגיאה', 'יש להתחבר כדי לבצע רכישה');
            return;
        }

        if (cart.length === 0) {
            Alert.alert('שגיאה', 'הסל ריק');
            return;
        }

        const finalAmount = getTotal();
        const invoiceId = `invoice-${Date.now()}`;

        const cartItemsFormatted = cart.map(item => ({
            plan_id: item.package.planId,
            plan_type: item.package.planType as 'subscription' | 'ticket',
            name: item.package.name,
            quantity: item.quantity,
            price: item.package.price,
            duration_months: item.package.durationMonths,
            total_sessions: item.package.totalClasses,
            validity_days: item.package.expiryDays,
        }));

        setProcessingPayment(true);

        try {
            if (paymentType === 2) { // CREDIT_CARD
                const { formUrl, paymentId } = await createPaymentForm(
                    invoiceId,
                    finalAmount,
                    `רכישה: ${cart.map(i => i.package.name).join(', ')}`,
                    user.name || user.email,
                    user.email,
                    cartItemsFormatted
                );

                if (formUrl) {
                    router.push({
                        pathname: '/payment',
                        params: { formUrl, invoiceId: paymentId },
                    });
                } else {
                    throw new Error('לא התקבל קישור לתשלום');
                }
            } else if (paymentType === 6 || paymentType === 1) { // BIT or CASH
                const { data: invoice } = await supabase
                    .from('invoices')
                    .insert({
                        id: invoiceId,
                        user_id: user.id,
                        client_id: user.id,
                        green_invoice_id: `pending-${invoiceId}`,
                        green_document_type: 320,
                        amount: finalAmount,
                        vat_amount: finalAmount * 0.17,
                        total_amount: finalAmount * 1.17,
                        payment_type: paymentType,
                        payment_status: 'pending',
                        cart_items: cartItemsFormatted,
                        description: `רכישה: ${cart.map(i => i.package.name).join(', ')}`,
                    })
                    .select()
                    .single();

                await supabase
                    .from('pending_payment_approvals')
                    .insert({
                        invoice_id: invoiceId,
                        user_id: user.id,
                        payment_method: paymentType === 6 ? 'bit' : 'cash',
                        amount: finalAmount,
                        cart_items: cartItemsFormatted,
                        status: 'pending',
                    });

                Alert.alert(
                    paymentType === 6 ? 'תשלום ב-Bit' : 'תשלום במזומן',
                    `סכום לתשלום: ₪${finalAmount}\n\n` +
                    (paymentType === 6
                        ? 'אנא בצע העברה למספר: 050-XXX-XXXX\n'
                        : 'אנא הגע לסטודיו לביצוע התשלום.\n') +
                    'המנוי/כרטיסייה יופעלו לאחר אישור המנהל.',
                    [{ text: 'הבנתי', onPress: () => { clearCart(); } }]
                );
            }
        } catch (error: any) {
            console.error('[Shop] Payment error:', error);
            Alert.alert('שגיאה', error.message || 'אירעה שגיאה בתהליך התשלום');
        } finally {
            setProcessingPayment(false);
        }
    };

    const filteredPackages = selectedCategory === 'subscriptions'
        ? packages.filter(pkg => pkg.planType !== 'ticket')
        : packages.filter(pkg => pkg.planType === 'ticket');

    return (
        <View className="flex-1 bg-background">
            {/* Header Section */}
            <View style={{ paddingTop: insets.top }} className="bg-background pb-4 border-b border-gray-100 shadow-sm">
                <View className="px-5 pt-2 mb-4">
                    <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-3xl font-extrabold text-[#09090B] text-right">חנות והטבות</Text>

                        {/* Cart Button with Badge */}
                        <TouchableOpacity
                            onPress={() => cartBottomSheetRef.current?.expand()}
                            className="relative p-2"
                        >
                            <ShoppingCart size={24} color="#D81B60" />
                            {cart.length > 0 && (
                                <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[20px] h-5 items-center justify-center px-1 border-2 border-white">
                                    <Text className="text-white text-xs font-bold">{cart.length}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                    <Text className="text-sm text-gray-500 text-right font-medium">בחר מנוי או כרטיסייה</Text>
                </View>

                {/* Category Tabs */}
                <View className="flex-row gap-2 px-5">
                    {shopTabs.map(tab => (
                        <TouchableOpacity
                            key={tab.key}
                            onPress={() => setSelectedCategory(tab.key)}
                            className={cn(
                                "flex-1 py-3 rounded-xl items-center border transition-all",
                                selectedCategory === tab.key
                                    ? "bg-[#09090B] border-[#09090B]"
                                    : "bg-white border-gray-200"
                            )}
                        >
                            <Text className={cn(
                                "text-sm font-bold",
                                selectedCategory === tab.key ? "text-white" : "text-gray-600"
                            )}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Content */}
            <ScrollView
                className="flex-1 bg-gray-50/50"
                contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >

                {isLoading ? (
                    <View className="bg-white rounded-2xl p-6 items-center border border-gray-100">
                        <ActivityIndicator size="large" color="#D81B60" />
                        <Text className="text-base font-bold text-[#09090B] text-center mt-2">
                            {selectedCategory === 'subscriptions' ? 'טוען מנויים...' : 'טוען כרטיסיות...'}
                        </Text>
                    </View>
                ) : filteredPackages.length > 0 ? (
                    filteredPackages.map((pkg) => {
                        const inCart = isInCart(pkg.id);
                        const isTicket = pkg.planType === 'ticket';

                        return (
                            <View
                                key={pkg.id}
                                className={cn(
                                    "bg-white rounded-2xl p-5 mb-4 border shadow-sm relative overflow-hidden",
                                    pkg.popular ? "border-primary border-2" : "border-gray-200"
                                )}
                            >
                                {/* Popular Badge */}
                                {pkg.popular && (
                                    <View className="absolute top-0 left-0 bg-primary px-3 py-1 rounded-br-xl">
                                        <View className="flex-row items-center gap-1">
                                            <Sparkles size={12} color="#FFFFFF" />
                                            <Text className="text-white text-xs font-bold">{hebrew.shop.popular}</Text>
                                        </View>
                                    </View>
                                )}

                                {/* Package Header */}
                                <View className="mb-5">
                                    <View className="flex-row justify-between items-center mb-2">
                                        <Text className="text-2xl font-extrabold text-[#09090B] text-right flex-1">{pkg.name}</Text>
                                        <View className="bg-primary/10 px-3 py-1 rounded-full">
                                            <Text className="text-xs font-bold text-primary">{pkg.durationLabel}</Text>
                                        </View>
                                    </View>

                                    {/* Price */}
                                    <View className="flex-row items-baseline mb-2">
                                        <Text className="text-4xl font-extrabold text-primary text-right">{pkg.price.toFixed(0)}</Text>
                                        <Text className="text-lg font-bold text-primary mr-1">{pkg.currency}</Text>
                                        {!isTicket && (
                                            <Text className="text-base text-gray-500 mr-1">/{hebrew.shop.month}</Text>
                                        )}
                                    </View>

                                    <Text className="text-sm text-gray-500 text-right">
                                        {isTicket
                                            ? `${pkg.totalClasses} כניסות`
                                            : pkg.planType === 'unlimited'
                                                ? 'אימונים ללא הגבלה'
                                                : `${pkg.classesPerMonth || 0} אימונים בחודש`}
                                    </Text>
                                </View>

                                {/* Features */}
                                <View className="gap-3 mb-5">
                                    {pkg.features.map((feature, index) => (
                                        <View key={index} className="flex-row items-center gap-3">
                                            <Check size={16} color="#10b981" />
                                            <Text className="text-sm text-[#09090B] flex-1 text-right">{feature}</Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Add to Cart Button */}
                                <TouchableOpacity
                                    onPress={() => !inCart && handleAddToCart(pkg)}
                                    disabled={inCart}
                                    className={cn(
                                        "py-4 rounded-xl items-center border",
                                        inCart
                                            ? "bg-gray-100 border-gray-200"
                                            : "bg-primary border-primary active:opacity-90"
                                    )}
                                >
                                    <Text className={cn(
                                        "font-bold text-base",
                                        inCart ? "text-gray-500" : "text-white"
                                    )}>
                                        {inCart ? 'בסל' : hebrew.shop.addToCart}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        );
                    })
                ) : (
                    <View className="bg-white rounded-2xl p-6 items-center border border-gray-100">
                        <Text className="text-base font-bold text-[#09090B] text-center mb-1">
                            {selectedCategory === 'subscriptions' ? 'אין מנויים להצגה' : 'אין כרטיסיות להצגה'}
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Cart Bottom Sheet */}
            <CartBottomSheet
                bottomSheetRef={cartBottomSheetRef}
                onCheckout={handleCheckout}
            />
        </View>
    );
}

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ShoppingCart, Minus, Plus, ArrowRight } from 'lucide-react-native';
import { useShop } from '@/contexts/ShopContext';
import { hebrew } from '@/constants/hebrew';
import { cn } from '@/lib/utils';
import { useRouter } from 'expo-router';

export default function AdminStoreScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const {
        packages,
        isLoading,
        cart,
        addToCart,
        removeFromCart,
        getTotal,
        totalPlates,
        platesToUse,
        getDiscountedTotal,
        getMaxPlatesUsable,
        applyPlates,
        resetPlates,
        checkout,
        isProcessing,
    } = useShop();

    const [showPlateInput, setShowPlateInput] = useState<boolean>(false);
    const [platesInput, setPlatesInput] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<'subscriptions' | 'tickets'>('subscriptions');

    const shopTabs = [
        { key: 'subscriptions', label: 'מנויים' },
        { key: 'tickets', label: 'כרטיסיות' },
    ] as const;

    const handleAddToCart = (pkg: any) => {
        addToCart(pkg);
    };

    const isInCart = (pkgId: string) => {
        return cart.some(item => item.package.id === pkgId);
    };

    const filteredPackages = selectedCategory === 'subscriptions'
        ? packages.filter(pkg => pkg.planType !== 'ticket')
        : packages.filter(pkg => pkg.planType === 'ticket');

    const handleCheckout = async () => {
        try {
            const result = await checkout({
                paymentMethod: { id: 'manual', type: 'cash', isDefault: true },
                billingAddress: 'Admin Store',
            });

            if (result.success) {
                Alert.alert('הצלחה', result.message, [
                    { text: 'אישור', onPress: () => router.back() }
                ]);
            }
        } catch (error: any) {
            Alert.alert('שגיאה', error.message || 'אירעה שגיאה בביצוע התשלום');
        }
    };

    return (
        <View className="flex-1 bg-background">
            {/* Header Section */}
            <View style={{ paddingTop: insets.top }} className="bg-background pb-4 border-b border-gray-100 shadow-sm">
                <View className="px-5 pt-2 mb-4">
                    <View className="flex-row-reverse justify-between items-center mb-2">
                        <View className="flex-row items-center gap-3">
                            <Text className="text-3xl font-extrabold text-[#09090B]">חנות מנהלים</Text>
                            <TouchableOpacity onPress={() => router.back()} className="p-2">
                                <ArrowRight size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        {cart.length > 0 && (
                            <View className="flex-row-reverse items-center bg-primary px-3 py-1.5 rounded-full gap-1">
                                <ShoppingCart size={18} color="#FFFFFF" />
                                <Text className="text-white text-sm font-bold">{cart.length}</Text>
                            </View>
                        )}
                    </View>
                    <Text className="text-sm text-gray-500 text-right font-medium">רכישת מנויים וכרטיסיות עבור לקוחות</Text>
                </View>

                {/* Category Tabs */}
                <View className="flex-row-reverse gap-2 px-5">
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
                                    "bg-white rounded-2xl p-5 mb-4 border shadow-sm relative",
                                    pkg.popular ? "border-primary border-2" : "border-gray-200"
                                )}
                            >
                                {/* Package Header */}
                                <View className="mb-5">
                                    <View className="flex-row-reverse justify-between items-center mb-2">
                                        <Text className="text-2xl font-extrabold text-[#09090B] text-right">{pkg.name}</Text>
                                        <View className="bg-primary/10 px-3 py-1 rounded-full">
                                            <Text className="text-xs font-bold text-primary">{pkg.durationLabel}</Text>
                                        </View>
                                    </View>

                                    {/* Price */}
                                    <View className="flex-row-reverse items-baseline mb-2">
                                        <Text className="text-4xl font-extrabold text-primary">{pkg.price.toFixed(0)}</Text>
                                        <Text className="text-lg font-bold text-primary mr-1">{pkg.currency}</Text>
                                        {!isTicket && (
                                            <Text className="text-base text-gray-500 mr-1">/{hebrew.shop.month}</Text>
                                        )}
                                    </View>

                                    <Text className="text-sm text-gray-500 text-right">
                                        {isTicket
                                            ? `נותרו ${pkg.totalClasses} כניסות`
                                            : pkg.planType === 'unlimited'
                                                ? 'אימונים ללא הגבלה'
                                                : `${pkg.classesPerMonth || 0} אימונים בחודש`}
                                    </Text>
                                </View>

                                {/* Features */}
                                <View className="gap-3 mb-5">
                                    {pkg.features.map((feature, index) => (
                                        <View key={index} className="flex-row-reverse items-center gap-3">
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

                {/* Cart Summary & Checkout */}
                {cart.length > 0 && (
                    <View className="bg-white rounded-2xl p-5 mt-2 border border-blue-200 shadow-sm border-2">
                        <Text className="text-xl font-bold text-[#09090B] text-right mb-4">{hebrew.shop.cart}</Text>

                        {/* Items List */}
                        {cart.map(item => (
                            <View key={item.id} className="flex-row-reverse justify-between items-center mb-2 border-b border-gray-100 pb-2">
                                <Text className="text-right flex-1">{item.package.name} ({item.package.durationLabel})</Text>
                                <TouchableOpacity onPress={() => removeFromCart(item.id)}>
                                    <Minus size={16} color="red" />
                                </TouchableOpacity>
                            </View>
                        ))}

                        {/* Total */}
                        <View className="flex-row-reverse justify-between items-center mb-4 mt-4">
                            <Text className="text-lg font-semibold text-[#09090B]">
                                {hebrew.shop.total}:
                            </Text>
                            <Text className="text-2xl font-extrabold text-primary">
                                {getTotal()} ₪
                            </Text>
                        </View>

                        {/* Checkout Button */}
                        <TouchableOpacity
                            onPress={handleCheckout}
                            disabled={isProcessing}
                            className={cn(
                                "bg-black py-4 rounded-xl items-center shadow-md shadow-gray-300",
                                isProcessing && "opacity-70"
                            )}
                        >
                            {isProcessing ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-lg font-bold text-white">בצע רכישה (Simulated Cash)</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

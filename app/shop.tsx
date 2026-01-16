import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    LayoutAnimation,
    Platform,
    UIManager,
    Dimensions,
    Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingCart, Check, X, CreditCard, Banknote, Smartphone, ChevronDown, Sparkles } from 'lucide-react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { SlideInUp, SlideOutDown, SlideInDown, SlideOutUp } from 'react-native-reanimated';
import { Icon } from '@/components/ui/icon';
import { supabase } from '@/constants/supabase';
import { useShop } from '@/contexts/ShopContext';
import { useAuth } from '@/contexts/AuthContext';
import { useGreenInvoice } from '@/app/hooks/useGreenInvoice';
import { CartBottomSheet } from '@/components/shop/CartBottomSheet';
import { hebrew } from '@/constants/hebrew';
import { cn } from '@/lib/utils';
import { useRouter, useNavigation } from 'expo-router';
import Colors from '@/constants/colors';
import { Package } from '@/types/shop';
import { ShoppingCartIcon } from '@/components/QuickToolsIcons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

export default function ShopScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const navigation = useNavigation();
    const { user } = useAuth();
    const {
        packages,
        isLoading,
        cart,
        addToCart,
        clearCart,
        getTotal
    } = useShop();

    const { createPaymentForm } = useGreenInvoice();
    const cartBottomSheetRef = useRef<BottomSheet>(null);

    const [selectedCategory, setSelectedCategory] = useState<'subscriptions' | 'tickets'>('subscriptions');
    const [selectedPkgId, setSelectedPkgId] = useState<string | null>(null);

    // Expand card logic
    const handleSelectPackage = (pkgId: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelectedPkgId(pkgId === selectedPkgId ? null : pkgId);
    };

    const handlePurchaseNow = () => {
        const pkg = packages.find(p => p.id === selectedPkgId);
        if (pkg) {
            addToCart(pkg);
            router.push('/cart');
        }
    };

    const filteredPackages = (selectedCategory === 'subscriptions'
        ? packages.filter(pkg => pkg.planType !== 'ticket')
        : packages.filter(pkg => pkg.planType === 'ticket'))
        .filter(pkg => !pkg.name.includes('התנסות')); // Hide trial cards

    return (
        <View className="flex-1 bg-white">
            {/* Header */}
            <View
                style={{
                    paddingTop: insets.top + 20,
                    paddingBottom: 24,
                    borderBottomLeftRadius: 30,
                    borderBottomRightRadius: 30,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.05,
                    shadowRadius: 15,
                    elevation: 5,
                    zIndex: 10,
                }}
                className="bg-white px-6 items-center"
            >
                <ShoppingCartIcon size={48} />
                <Text className="text-slate-500 text-sm font-medium mb-6 mt-2">בחרו את התוכנית שהכי מתאימה עבורכם</Text>

                {/* Segmented Control */}
                <View className="flex-row bg-slate-100 p-1 rounded-full w-full max-w-[300px]">
                    <TouchableOpacity
                        onPress={() => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setSelectedCategory('subscriptions');
                            setSelectedPkgId(null);
                        }}
                        className={cn(
                            "flex-1 py-2 rounded-full items-center justify-center",
                            selectedCategory === 'subscriptions' ? "bg-white shadow-sm" : ""
                        )}
                    >
                        <Text className={cn(
                            "text-sm font-bold",
                            selectedCategory === 'subscriptions' ? "text-slate-900" : "text-slate-500"
                        )}>מנויים</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setSelectedCategory('tickets');
                            setSelectedPkgId(null);
                        }}
                        className={cn(
                            "flex-1 py-2 rounded-full items-center justify-center",
                            selectedCategory === 'tickets' ? "bg-white shadow-sm" : ""
                        )}
                    >
                        <Text className={cn(
                            "text-sm font-bold",
                            selectedCategory === 'tickets' ? "text-slate-900" : "text-slate-500"
                        )}>כרטיסיות</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Content */}
            <ScrollView
                contentContainerStyle={{ padding: 24, paddingBottom: 200, gap: 16 }}
                showsVerticalScrollIndicator={false}
                className="bg-white"
            >
                {isLoading ? (
                    <ActivityIndicator size="large" color={Colors.primary} className="mt-10" />
                ) : (
                    filteredPackages.map((pkg) => {
                        const isSelected = selectedPkgId === pkg.id;
                        const isTicket = pkg.planType === 'ticket';
                        const isReelOne = pkg.name.toUpperCase().includes('ONE');

                        return (
                            <TouchableOpacity
                                key={pkg.id}
                                onPress={() => handleSelectPackage(pkg.id)}
                                activeOpacity={0.9}
                                style={{
                                    shadowColor: isSelected ? Colors.primary : "#000",
                                    shadowOffset: { width: 0, height: isSelected ? 8 : 4 },
                                    shadowOpacity: isSelected ? 0.15 : 0.05,
                                    shadowRadius: isSelected ? 20 : 12,
                                    elevation: isSelected ? 8 : 2,
                                }}
                                className={cn(
                                    "bg-white rounded-3xl p-6 border transition-all",
                                    isSelected ? "border-primary/30 bg-slate-50/50" : "border-slate-100"
                                )}
                            >
                                {/* Header Row */}
                                <View className="flex-row justify-between items-start mb-4">
                                    <View className="flex-1 mr-2">
                                        {(() => {
                                            const isReelElite = pkg.name.toUpperCase().includes('ELITE');
                                            const isReelOne = pkg.name.toUpperCase().includes('ONE');
                                            const is10Sessions = pkg.planType === 'ticket' && pkg.totalClasses === 10;
                                            const is20Sessions = pkg.planType === 'ticket' && pkg.totalClasses === 20;

                                            if (isReelElite) {
                                                return <Image source={require('@/assets/images/reel-elite.png')} style={{ width: 140, height: 28 }} resizeMode="contain" className="mb-1" />;
                                            } else if (isReelOne) {
                                                return <Image source={require('@/assets/images/reel-one.png')} style={{ width: 140, height: 28 }} resizeMode="contain" className="mb-1" />;
                                            } else if (is10Sessions) {
                                                return <Image source={require('@/assets/images/10sessions.png')} style={{ width: 140, height: 28 }} resizeMode="contain" className="mb-1" />;
                                            } else if (is20Sessions) {
                                                return <Image source={require('@/assets/images/20sessions.png')} style={{ width: 140, height: 28 }} resizeMode="contain" className="mb-1" />;
                                            } else {
                                                return (
                                                    <Text className={cn(
                                                        "text-xl font-bold text-left mb-1",
                                                        isSelected ? "text-primary" : "text-slate-900"
                                                    )}>{pkg.name}</Text>
                                                );
                                            }
                                        })()}

                                        <View className="flex-row flex-wrap gap-2 mt-2">
                                            {isReelOne ? [
                                                <LinearGradient
                                                    key="gold"
                                                    colors={['#FFD700', '#DAA520']} // Gold Gradient
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 }}
                                                >
                                                    <Text className="text-[10px] font-bold text-white uppercase tracking-wider">החבילה המשתלמת</Text>
                                                </LinearGradient>,

                                                <LinearGradient
                                                    key="pink"
                                                    colors={[Colors.gradient1, Colors.gradient2]} // Pink Gradient
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 }}
                                                >
                                                    <Text className="text-[10px] font-bold text-white">חופשי חודשי</Text>
                                                </LinearGradient>,

                                                <LinearGradient
                                                    key="teal"
                                                    colors={['#2DD4BF', '#14B8A6']} // Teal Gradient
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 }}
                                                >
                                                    <Text className="text-[10px] font-bold text-white">ליווי תזונה</Text>
                                                </LinearGradient>
                                            ] : isTicket ? (
                                                <LinearGradient
                                                    colors={[Colors.gradient1, Colors.gradient2]}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 }}
                                                >
                                                    <Text className="text-[10px] font-bold text-white">
                                                        {pkg.totalClasses === 10 ? '69₪ לאימון' : pkg.totalClasses === 20 ? '54₪ לאימון' : ''}
                                                    </Text>
                                                </LinearGradient>
                                            ) : (
                                                pkg.popular && (
                                                    <LinearGradient
                                                        colors={[Colors.gradient1, Colors.gradient2]}
                                                        start={{ x: 0, y: 0 }}
                                                        end={{ x: 1, y: 0 }}
                                                        style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 }}
                                                    >
                                                        <Text className="text-[10px] font-bold text-white">חופשי חודשי</Text>
                                                    </LinearGradient>
                                                )
                                            )}
                                        </View>
                                    </View>
                                    <View className="items-end">
                                        {pkg.name?.toUpperCase().includes('ELITE') && pkg.pricePerMonth ? (
                                            <>
                                                <Text className="text-3xl font-extrabold text-slate-900">
                                                    {pkg.currency}{pkg.pricePerMonth}
                                                </Text>
                                                <Text className="text-xs text-slate-400">לחודש</Text>
                                            </>
                                        ) : pkg.name?.toUpperCase().includes('ONE') ? (
                                            <>
                                                <Text className="text-3xl font-extrabold text-slate-900">
                                                    {pkg.currency}{pkg.price}
                                                </Text>
                                                <Text className="text-xs text-slate-400">לחצי שנה</Text>
                                            </>
                                        ) : (
                                            <Text className="text-3xl font-extrabold text-slate-900">
                                                {pkg.currency}{pkg.price}
                                            </Text>
                                        )}
                                    </View>
                                </View>

                                {/* Hero Feature (Always Visible) - Hide check icon for tickets */}
                                {!isTicket && (
                                    <View className="flex-row items-center gap-3 mb-4 mt-2">
                                        <View className="bg-green-50 w-8 h-8 rounded-full items-center justify-center">
                                            <Check size={14} color="#10B981" strokeWidth={3} />
                                        </View>
                                        <Text className="text-sm font-medium text-slate-700 flex-1 text-left">
                                            {pkg.features[0]}
                                        </Text>
                                    </View>
                                )}
                                {isTicket && (
                                    <Text className="text-sm font-medium text-slate-700 text-left">
                                        {pkg.features[0]}
                                    </Text>
                                )}

                                {/* Expanded Content */}
                                {isSelected && (
                                    <View className="pt-4 border-t border-slate-100 gap-3">
                                        {pkg.features.slice(1).map((feature, idx) => {
                                            // Check if feature contains 'reel rep.plus' and replace with inline logo
                                            if (feature.toLowerCase().includes('reel rep.plus') || feature.toLowerCase().includes('reelrep.plus')) {
                                                const parts = feature.split(/reel\s*rep\.?\s*plus/i);
                                                return (
                                                    <View key={idx} className="flex-row items-center gap-3">
                                                        <Icon name="check-circle" size={18} color={Colors.primary} />
                                                        <View className="flex-row items-center flex-1 flex-wrap">
                                                            <Text className="text-sm text-slate-600 text-left">{parts[0]}</Text>
                                                            <Image
                                                                source={require('@/assets/images/logo-reelrep-plus-black.png')}
                                                                style={{ width: 80, height: 16, marginHorizontal: 2 }}
                                                                resizeMode="contain"
                                                            />
                                                            {parts[1] && <Text className="text-sm text-slate-600 text-left">{parts[1]}</Text>}
                                                        </View>
                                                    </View>
                                                );
                                            }
                                            return (
                                                <View key={idx} className="flex-row items-center gap-3">
                                                    <Icon name="check-circle" size={18} color={Colors.primary} />
                                                    <Text className="text-sm text-slate-600 text-left flex-1">{feature}</Text>
                                                </View>
                                            );
                                        })}
                                        {pkg.disclaimer && (
                                            <View className="mt-2">
                                                <Text className="text-xs text-slate-400 text-left">
                                                    {pkg.disclaimer}
                                                </Text>
                                            </View>
                                        )}
                                        {!isTicket && (
                                            <View className="mt-2">
                                                <Text className="text-xs text-slate-400 text-left">
                                                    חיוב כל {pkg.durationMonths} חודשים
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* Expand Indicator */}
                                {!isSelected && (
                                    <View className="items-center mt-2">
                                        <ChevronDown size={20} color="#E2E8F0" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>

            {/* Sticky Action Footer */}
            {selectedPkgId && (
                <Animated.View
                    entering={SlideInDown.duration(400)}
                    exiting={SlideOutDown.duration(300)}
                    style={{
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: -4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 10,
                        elevation: 10,
                        zIndex: 50,
                    }}
                    className="absolute bottom-0 left-0 right-0 bg-white px-6 pt-3 pb-8 rounded-t-3xl border-t border-slate-50"
                >
                    <View className="flex-row justify-between items-center">
                        <View className="flex-1 mr-4">
                            <Text className="text-xs text-slate-400 font-medium text-left">התוכנית שבחרת</Text>
                            <Text className="text-base font-bold text-slate-900 text-left" numberOfLines={1}>
                                {packages.find(p => p.id === selectedPkgId)?.name}
                            </Text>
                        </View>

                        <TouchableOpacity onPress={handlePurchaseNow} activeOpacity={0.8} className="flex-shrink-0">
                            <LinearGradient
                                colors={['#60A5FA', '#3B82F6']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{ paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 }}
                            >
                                <Text className="text-white font-bold text-base">המשך לתשלום</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            )}
        </View>
    );
}

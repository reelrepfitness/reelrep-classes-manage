import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ShoppingCart, Minus, Plus } from 'lucide-react-native';
import { useShop } from '@/contexts/ShopContext';
import { hebrew } from '@/constants/hebrew';
import { cn } from '@/lib/utils';

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
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
    resetPlates
  } = useShop();

  const [showPlateInput, setShowPlateInput] = useState<boolean>(false);
  const [platesInput, setPlatesInput] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'subscriptions' | 'tickets' | 'products'>('subscriptions');

  const shopTabs = [
    { key: 'subscriptions', label: 'מנויים' },
    { key: 'tickets', label: 'כרטיסיות' },
    { key: 'products', label: 'מוצרים' },
  ] as const;

  const handleAddToCart = (pkg: any) => {
    addToCart(pkg);
    Alert.alert(hebrew.common.success, 'נוסף לסל בהצלחה!');
  };

  const isInCart = (pkgId: string) => {
    return cart.some(item => item.package.id === pkgId);
  };

  const filteredPackages = selectedCategory === 'subscriptions'
    ? packages.filter(pkg => pkg.planType !== 'ticket')
    : selectedCategory === 'tickets'
      ? packages.filter(pkg => pkg.planType === 'ticket')
      : []; // products - empty for now

  return (
    <View className="flex-1 bg-background">
      {/* Header Section */}
      <View style={{ paddingTop: insets.top }} className="bg-background pb-4 border-b border-gray-100 shadow-sm">
        <View className="px-5 pt-2 mb-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-3xl font-extrabold text-[#09090B] text-right">חנות</Text>
            {cart.length > 0 && (
              <View className="flex-row items-center bg-primary px-3 py-1.5 rounded-full gap-1">
                <ShoppingCart size={18} color="#FFFFFF" />
                <Text className="text-white text-sm font-bold">{cart.length}</Text>
              </View>
            )}
          </View>
          <Text className="text-sm text-gray-500 text-right font-medium">בחר את הדרך שלך להתאמן</Text>
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
        {selectedCategory === 'products' ? (
          <View className="bg-white rounded-2xl p-6 items-center border border-gray-100">
            <Text className="text-base font-bold text-[#09090B] text-center mb-1">
              חנות מוצרים תעלה בקרוב
            </Text>
            <Text className="text-sm text-gray-500 text-center">
              בקרוב תמצאו כאן ביגוד, אביזרים ומוצרים משלימים
            </Text>
          </View>
        ) : isLoading ? (
          <View className="bg-white rounded-2xl p-6 items-center border border-gray-100">
            <Text className="text-base font-bold text-[#09090B] text-center mb-1">
              {selectedCategory === 'subscriptions' ? 'טוען מנויים...' : 'טוען כרטיסיות...'}
            </Text>
            <Text className="text-sm text-gray-500 text-center">מתעדכן בהיצע העדכני מהסטודיו</Text>
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
                {pkg.popular && (
                  <View className="absolute -top-3 right-5 bg-primary px-4 py-1.5 rounded-full">
                    <Text className="text-xs font-bold text-white">הכי משתלם</Text>
                  </View>
                )}

                {/* Package Header */}
                <View className="mb-5">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-2xl font-extrabold text-[#09090B] text-right">{pkg.name}</Text>
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
                      ? `נותרו ${pkg.totalClasses} כניסות`
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
            <Text className="text-sm text-gray-500 text-center">בדקו שוב מאוחר יותר</Text>
          </View>
        )}

        {/* Cart Summary */}
        {cart.length > 0 && (
          <View className="bg-white rounded-2xl p-5 mt-2 border border-gray-200 shadow-sm">
            <Text className="text-xl font-bold text-[#09090B] text-right mb-4">{hebrew.shop.cart}</Text>

            {/* Plates Balance */}
            <View className="flex-row items-center bg-[#09090B] rounded-xl p-4 mb-4 gap-3">
              <Image
                source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/qmix9kvsaxeiodcudbn96' }}
                className="w-10 h-10"
                resizeMode="contain"
              />
              <View className="flex-1">
                <Text className="text-xs text-gray-400 text-right mb-1">{hebrew.shop.plateBalance}</Text>
                <Text className="text-lg font-extrabold text-white text-right">{totalPlates} פלטות</Text>
              </View>
            </View>

            {/* Plates Input Section */}
            {getMaxPlatesUsable() > 0 && (
              <View className="mb-4">
                {!showPlateInput ? (
                  <TouchableOpacity
                    onPress={() => {
                      setShowPlateInput(true);
                      setPlatesInput('');
                    }}
                    className="bg-primary py-3.5 rounded-xl items-center"
                  >
                    <Text className="text-base font-bold text-white">{hebrew.shop.usePlates}</Text>
                  </TouchableOpacity>
                ) : (
                  <View className="bg-gray-50 rounded-xl p-4 gap-3 border border-gray-200">
                    {/* Plates Input Row */}
                    <View className="flex-row items-center gap-3">
                      <TouchableOpacity
                        onPress={() => {
                          const current = parseInt(platesInput) || 0;
                          const newValue = Math.max(0, current - 10);
                          setPlatesInput(newValue.toString());
                          applyPlates(newValue);
                        }}
                        className="bg-white border border-gray-200 rounded-lg w-11 h-11 items-center justify-center"
                      >
                        <Minus size={20} color="#09090B" />
                      </TouchableOpacity>

                      <TextInput
                        className="flex-1 bg-white border border-gray-200 rounded-lg py-3 px-4 text-lg font-bold text-[#09090B] text-center"
                        value={platesInput}
                        onChangeText={(text) => {
                          const num = parseInt(text) || 0;
                          setPlatesInput(text);
                          applyPlates(num);
                        }}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor="#71717A"
                      />

                      <TouchableOpacity
                        onPress={() => {
                          const current = parseInt(platesInput) || 0;
                          const newValue = Math.min(getMaxPlatesUsable(), current + 10);
                          setPlatesInput(newValue.toString());
                          applyPlates(newValue);
                        }}
                        className="bg-white border border-gray-200 rounded-lg w-11 h-11 items-center justify-center"
                      >
                        <Plus size={20} color="#09090B" />
                      </TouchableOpacity>
                    </View>

                    <Text className="text-xs text-gray-500 text-center">
                      {hebrew.shop.maxPlates}: {getMaxPlatesUsable()}
                    </Text>

                    {/* Action Buttons */}
                    <View className="flex-row gap-3">
                      <TouchableOpacity
                        onPress={() => {
                          const max = getMaxPlatesUsable();
                          setPlatesInput(max.toString());
                          applyPlates(max);
                        }}
                        className="flex-1 bg-primary py-2.5 rounded-lg items-center"
                      >
                        <Text className="text-sm font-semibold text-white">השתמש במקסימום</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          setShowPlateInput(false);
                          setPlatesInput('');
                          resetPlates();
                        }}
                        className="flex-1 bg-white border border-gray-200 py-2.5 rounded-lg items-center"
                      >
                        <Text className="text-sm font-semibold text-[#09090B]">{hebrew.common.cancel}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Discount Display */}
            {platesToUse > 0 && (
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-base font-semibold text-green-600">{hebrew.shop.platesApplied}:</Text>
                <Text className="text-lg font-bold text-green-600">-{platesToUse} ₪</Text>
              </View>
            )}

            {/* Divider */}
            <View className="h-px bg-gray-200 my-2" />

            {/* Total */}
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold text-[#09090B]">
                {platesToUse > 0 ? hebrew.shop.originalPrice : hebrew.shop.total}:
              </Text>
              <Text className={cn(
                "text-2xl font-extrabold text-primary",
                platesToUse > 0 && "line-through opacity-50"
              )}>
                {getTotal()} ₪
              </Text>
            </View>

            {/* Final Price (if plates applied) */}
            {platesToUse > 0 && (
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-[#09090B]">{hebrew.shop.finalPrice}:</Text>
                <Text className="text-3xl font-extrabold text-green-600 text-right">{getDiscountedTotal()} ₪</Text>
              </View>
            )}

            {/* Checkout Button */}
            <TouchableOpacity
              onPress={() => Alert.alert('תשלום', `סך הכל לתשלום: ${getDiscountedTotal()} ₪${platesToUse > 0 ? `\nהנחה של ${platesToUse} פלטות הופעלה!` : ''}`)}
              className="bg-primary py-4 rounded-xl items-center shadow-md shadow-gray-300"
            >
              <Text className="text-lg font-bold text-white">{hebrew.shop.checkout}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

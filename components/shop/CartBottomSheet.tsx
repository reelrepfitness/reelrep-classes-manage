import React, { useMemo, RefObject } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { X, CreditCard, Smartphone, Banknote } from 'lucide-react-native';
import { useShop } from '@/contexts/ShopContext';
import Colors from '@/constants/colors';

interface CartBottomSheetProps {
  bottomSheetRef: RefObject<BottomSheet>;
  onCheckout: (paymentType: number) => void;
  onChange?: (index: number) => void;
}

// Payment type constants from Green Invoice
const PAYMENT_TYPES = {
  CASH: 1,
  CREDIT_CARD: 2,
  BIT: 6,
};

const PAYMENT_OPTIONS = [
  {
    id: 'credit_card',
    label: 'כרטיס אשראי',
    type: PAYMENT_TYPES.CREDIT_CARD,
    icon: CreditCard,
    color: Colors.primary || '#da4477',
  },
  {
    id: 'bit',
    label: 'Bit / אפליקציה',
    type: PAYMENT_TYPES.BIT,
    icon: Smartphone,
    color: '#4ade80',
  },
  {
    id: 'cash',
    label: 'מזומן (בסטודיו)',
    type: PAYMENT_TYPES.CASH,
    icon: Banknote,
    color: '#fbbf24',
  },
];

export function CartBottomSheet({ bottomSheetRef, onCheckout, onChange }: CartBottomSheetProps) {
  const { cart, removeFromCart, getTotal } = useShop();
  const snapPoints = useMemo(() => ['50%', '85%'], []);

  const handleCheckoutPress = (paymentType: number) => {
    // Close the bottom sheet first
    bottomSheetRef.current?.close();
    // Then trigger checkout
    setTimeout(() => onCheckout(paymentType), 300);
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      index={-1}
      onChange={onChange}
      enablePanDownToClose
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🛒 עגלת הקניות שלי</Text>
        </View>

        {/* Cart Items or Empty State */}
        {cart.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🛒</Text>
            <Text style={styles.emptyText}>העגלה ריקה</Text>
            <Text style={styles.emptySubtext}>הוסף פריטים כדי להמשיך</Text>
          </View>
        ) : (
          <>
            {/* Cart Items List */}
            <View style={styles.itemsList}>
              {cart.map((item) => (
                <View key={item.id} style={styles.cartItem}>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeFromCart(item.id)}
                  >
                    <X size={20} color={Colors.error || '#ef4444'} />
                  </TouchableOpacity>

                  <View style={styles.itemContent}>
                    <Text style={styles.itemName}>{item.package.name}</Text>
                    <Text style={styles.itemDetails}>
                      {item.package.durationMonths
                        ? `${item.package.durationMonths} חודשים`
                        : `${item.package.totalClasses} כניסות`}
                    </Text>
                    <View style={styles.itemPricing}>
                      <Text style={styles.itemQuantity}>כמות: {item.quantity}</Text>
                      <Text style={styles.itemPrice}>
                        ₪{(item.package.price * item.quantity).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Total Section */}
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>סה"כ לתשלום:</Text>
              <Text style={styles.totalAmount}>₪{getTotal().toFixed(2)}</Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Payment Options */}
            <View style={styles.paymentSection}>
              <Text style={styles.paymentTitle}>בחר אמצעי תשלום:</Text>
              {PAYMENT_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.paymentButton, { borderColor: option.color }]}
                    onPress={() => handleCheckoutPress(option.type)}
                    activeOpacity={0.7}
                  >
                    <Icon size={24} color={option.color} />
                    <Text style={[styles.paymentLabel, { color: option.color }]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Bottom Spacing */}
            <View style={styles.bottomSpacing} />
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: Colors.background || '#181818',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: Colors.border || '#333',
    width: 40,
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text || '#fff',
    textAlign: 'right',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text || '#fff',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary || '#aaa',
  },

  // Cart Items
  itemsList: {
    marginBottom: 20,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: Colors.card || '#222',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border || '#333',
  },
  removeButton: {
    marginLeft: 12,
    padding: 4,
  },
  itemContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text || '#fff',
    marginBottom: 4,
    textAlign: 'right',
  },
  itemDetails: {
    fontSize: 14,
    color: Colors.textSecondary || '#aaa',
    marginBottom: 8,
    textAlign: 'right',
  },
  itemPricing: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
  },
  itemQuantity: {
    fontSize: 12,
    color: Colors.textSecondary || '#aaa',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary || '#da4477',
  },

  // Total Section
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.card || '#222',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.primary || '#da4477',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text || '#fff',
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary || '#da4477',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.border || '#333',
    marginBottom: 20,
  },

  // Payment Section
  paymentSection: {
    marginBottom: 20,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text || '#fff',
    marginBottom: 16,
    textAlign: 'right',
  },
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card || '#222',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    gap: 12,
  },
  paymentLabel: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Bottom Spacing
  bottomSpacing: {
    height: 20,
  },
});

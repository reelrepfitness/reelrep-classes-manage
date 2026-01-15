import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/constants/supabase';
import { Check, X, Clock, CreditCard, Smartphone, Banknote, AlertCircle } from 'lucide-react-native';
import { Stack } from 'expo-router';
import Colors from '@/constants/colors';

interface PendingApproval {
  id: string;
  invoice_id: string;
  user_id: string;
  payment_method: 'bit' | 'bank_transfer' | 'cash' | 'debt';
  amount: number;
  cart_items: any[];
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profiles?: {
    name: string;
    email: string;
    phone: string;
  };
}

const paymentMethodLabels: Record<string, string> = {
  bit: 'Bit',
  bank_transfer: 'העברה בנקאית',
  cash: 'מזומן',
  debt: 'חוב',
};

const paymentMethodIcons: Record<string, any> = {
  bit: Smartphone,
  bank_transfer: CreditCard,
  cash: Banknote,
  debt: AlertCircle,
};

export default function PendingPaymentsScreen() {
  const queryClient = useQueryClient();

  const approvalsQuery = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_payment_approvals')
        .select('*, profiles(name, email, phone)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PendingApproval[];
    },
    refetchInterval: 30000, // רענון כל 30 שניות
  });

  const approveMutation = useMutation({
    mutationFn: async ({ approvalId, action, notes }: {
      approvalId: string;
      action: 'approve' | 'reject';
      notes?: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke(
        'manual-payment-approval',
        {
          body: { approvalId, action, adminNotes: notes },
          headers: { Authorization: `Bearer ${session?.access_token}` },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      Alert.alert('הצלחה', 'הפעולה בוצעה בהצלחה');
    },
    onError: (error: any) => {
      Alert.alert('שגיאה', error.message || 'אירעה שגיאה');
    },
  });

  const handleApprove = (approvalId: string) => {
    Alert.alert(
      'אישור תשלום',
      'האם אתה בטוח שברצונך לאשר תשלום זה?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'אשר',
          onPress: () => approveMutation.mutate({ approvalId, action: 'approve' }),
        },
      ]
    );
  };

  const handleReject = (approvalId: string) => {
    Alert.prompt(
      'דחיית תשלום',
      'אנא הזן סיבה לדחייה (אופציונלי)',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'דחה',
          onPress: (notes) => approveMutation.mutate({ approvalId, action: 'reject', notes }),
        },
      ],
      'plain-text'
    );
  };

  const renderItem = ({ item }: { item: PendingApproval }) => {
    const Icon = paymentMethodIcons[item.payment_method] || Clock;
    const methodLabel = paymentMethodLabels[item.payment_method] || item.payment_method;

    return (
      <View className="bg-white rounded-2xl p-5 mb-4 border border-gray-200 shadow-sm">
        {/* User Info */}
        <View className="mb-4">
          <Text className="text-xl font-bold text-[#09090B] text-right mb-1">
            {item.profiles?.name || 'לא ידוע'}
          </Text>
          {item.profiles?.phone && (
            <Text className="text-sm text-gray-500 text-right">
              טלפון: {item.profiles.phone}
            </Text>
          )}
          {item.profiles?.email && (
            <Text className="text-sm text-gray-500 text-right">
              {item.profiles.email}
            </Text>
          )}
        </View>

        {/* Payment Info */}
        <View className="mb-4 pb-4 border-b border-gray-100">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <Icon size={20} color={Colors.primary} />
              <Text className="text-base font-medium text-gray-700">
                {methodLabel}
              </Text>
            </View>
            <Text className="text-2xl font-extrabold text-primary">
              ₪{item.amount}
            </Text>
          </View>

          {/* Cart Items */}
          {item.cart_items && item.cart_items.length > 0 && (
            <View className="mt-2">
              <Text className="text-sm font-medium text-gray-600 mb-1">פריטים:</Text>
              {item.cart_items.map((cartItem: any, index: number) => (
                <Text key={index} className="text-sm text-gray-500 text-right">
                  • {cartItem.name} ({cartItem.quantity}x ₪{cartItem.price})
                </Text>
              ))}
            </View>
          )}

          <Text className="text-xs text-gray-400 text-right mt-2">
            נוצר: {new Date(item.created_at).toLocaleString('he-IL')}
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => handleApprove(item.id)}
            disabled={approveMutation.isPending}
            className="flex-1 bg-green-500 py-3 rounded-xl flex-row items-center justify-center gap-2"
          >
            <Check size={20} color="#FFFFFF" />
            <Text className="text-white font-bold text-base">אשר</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleReject(item.id)}
            disabled={approveMutation.isPending}
            className="flex-1 bg-red-500 py-3 rounded-xl flex-row items-center justify-center gap-2"
          >
            <X size={20} color="#FFFFFF" />
            <Text className="text-white font-bold text-base">דחה</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'תשלומים ממתינים',
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <View className="flex-1 bg-gray-50">
        {approvalsQuery.isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text className="text-gray-500 mt-4">טוען תשלומים...</Text>
          </View>
        ) : approvalsQuery.error ? (
          <View className="flex-1 items-center justify-center p-6">
            <AlertCircle size={48} color="#EF4444" />
            <Text className="text-red-500 mt-4 text-center">
              שגיאה בטעינת תשלומים
            </Text>
            <TouchableOpacity
              onPress={() => approvalsQuery.refetch()}
              className="mt-4 bg-primary py-2 px-6 rounded-lg"
            >
              <Text className="text-white font-bold">נסה שוב</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={approvalsQuery.data}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={
              <View className="bg-white rounded-2xl p-8 items-center border border-gray-200">
                <Clock size={48} color="#9CA3AF" />
                <Text className="text-gray-600 mt-4 text-center font-medium">
                  אין תשלומים ממתינים
                </Text>
                <Text className="text-gray-400 mt-2 text-center text-sm">
                  תשלומים חדשים יופיעו כאן
                </Text>
              </View>
            }
            refreshing={approvalsQuery.isRefetching}
            onRefresh={() => approvalsQuery.refetch()}
          />
        )}

        {/* Processing Overlay */}
        {approveMutation.isPending && (
          <View className="absolute inset-0 bg-black/30 items-center justify-center">
            <View className="bg-white rounded-2xl p-6 items-center">
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text className="text-gray-700 mt-4 font-medium">מעבד...</Text>
            </View>
          </View>
        )}
      </View>
    </>
  );
}

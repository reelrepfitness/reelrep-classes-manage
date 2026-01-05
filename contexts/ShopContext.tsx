import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { CartItem, SubscriptionPackage, PaymentMethod } from '@/constants/types';
import { useAuth } from './AuthContext';
import { supabase } from '@/constants/supabase';

const CART_STORAGE_KEY = '@reelrep_cart';

export const [ShopProvider, useShop] = createContextHook(() => {
  const { user, refreshUser } = useAuth(); // Destructure refreshUser
  const [cart, setCart] = useState<CartItem[]>([]);
  const [platesToUse, setPlatesToUse] = useState<number>(0);

  const plansQuery = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      console.log('[Shop] Fetching subscription plans...');
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id,name,type,sessions_per_week,description,"price-3-months","price-6-months"')
        .eq('is_active', true)
        .order('type', { ascending: true });
      if (error) {
        console.error('[Shop] Error fetching subscription plans:', error);
        throw error;
      }
      console.log('[Shop] Subscription plans:', data);
      return data || [];
    },
  });

  const ticketPlansQuery = useQuery({
    queryKey: ['ticket-plans'],
    queryFn: async () => {
      console.log('[Shop] Fetching ticket plans...');
      const { data, error } = await supabase
        .from('ticket_plans')
        .select('*')
        .eq('is_active', true)
        .order('total_sessions', { ascending: true });
      if (error) {
        console.error('[Shop] Error fetching ticket plans:', error);
        throw error;
      }
      console.log('[Shop] Ticket plans:', data);
      return data || [];
    },
  });

  const packages: SubscriptionPackage[] = useMemo(() => {
    const subscriptions = !plansQuery.data ? [] : plansQuery.data.flatMap(plan => {
      const durations = [
        { key: 'price-3-months' as const, months: 3 },
        { key: 'price-6-months' as const, months: 6 },
      ];

      return durations.flatMap(({ key, months }) => {
        const priceValue = plan[key];
        const price = priceValue ? Number(priceValue) : null;
        if (!price || Number.isNaN(price)) return [];

        const isUnlimited = plan.type === 'unlimited';
        const highlight = plan.name?.includes('חופשי');
        const classesPerMonth = plan.sessions_per_week ? plan.sessions_per_week * 4 : 0;
        const durationLabel = `${months} חודשים`;

        const baseFeatures: string[] = [];
        if (plan.description) baseFeatures.push(plan.description);
        if (isUnlimited) {
          baseFeatures.push('אימונים ללא הגבלה');
        } else if (plan.sessions_per_week) {
          baseFeatures.push(`${plan.sessions_per_week} אימונים בשבוע (~${classesPerMonth} בחודש)`);
        }

        return {
          id: `${plan.id}-${months}`,
          planId: plan.id,
          type: plan.type as 'basic' | 'premium' | 'vip' | 'limited' | 'unlimited',
          planType: plan.type,
          name: plan.name,
          price,
          currency: '₪',
          duration: 'monthly',
          durationLabel,
          durationMonths: months,
          features: baseFeatures,
          classesPerMonth,
          popular: highlight && months === 6,
          highlight,
        } as SubscriptionPackage;
      });
    });

    const tickets = !ticketPlansQuery.data ? [] : ticketPlansQuery.data.map(plan => ({
      id: plan.id,
      planId: plan.id,
      type: 'ticket' as const,
      planType: 'ticket',
      name: plan.name,
      price: Number(plan.price),
      currency: '₪',
      duration: 'one-time',
      durationLabel: `${plan.total_sessions} אימונים`,
      durationMonths: 0,
      features: [
        plan.description || '',
        `תקף ל-${plan.validity_days} יום`,
      ].filter(Boolean),
      classesPerMonth: plan.total_sessions,
      totalClasses: plan.total_sessions,
      expiryDays: plan.validity_days,
      popular: plan.total_sessions === 20,
    } as SubscriptionPackage));

    return [...subscriptions, ...tickets];
  }, [plansQuery.data, ticketPlansQuery.data]);

  const cartQuery = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(`${CART_STORAGE_KEY}_${user?.id}`);
      return stored ? JSON.parse(stored) : [];
    },
    enabled: !!user,
  });

  const syncMutation = useMutation({
    mutationFn: async (cart: CartItem[]) => {
      if (user) {
        await AsyncStorage.setItem(`${CART_STORAGE_KEY}_${user.id}`, JSON.stringify(cart));
      }
      return cart;
    },
  });

  const { mutate: syncCart } = syncMutation;

  useEffect(() => {
    if (cartQuery.data !== undefined) {
      setCart(cartQuery.data);
    }
  }, [cartQuery.data]);

  const addToCart = useCallback((pkg: SubscriptionPackage) => {
    const existing = cart.find(item => item.package.id === pkg.id);

    if (existing) {
      const updated = cart.map(item =>
        item.package.id === pkg.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
      setCart(updated);
      syncCart(updated);
    } else {
      const newItem: CartItem = {
        id: Date.now().toString(),
        package: pkg,
        quantity: 1,
      };
      const updated = [...cart, newItem];
      setCart(updated);
      syncCart(updated);
    }
  }, [cart, syncCart]);

  const removeFromCart = useCallback((itemId: string) => {
    const updated = cart.filter(item => item.id !== itemId);
    setCart(updated);
    syncCart(updated);
  }, [cart, syncCart]);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    const updated = cart.map(item =>
      item.id === itemId ? { ...item, quantity } : item
    );
    setCart(updated);
    syncCart(updated);
  }, [cart, syncCart, removeFromCart]);

  const clearCart = useCallback(() => {
    setCart([]);
    syncCart([]);
  }, [syncCart]);

  const getTotal = useCallback(() => {
    return cart.reduce((total, item) => total + item.package.price * item.quantity, 0);
  }, [cart]);

  const getDiscountedTotal = useCallback(() => {
    const total = getTotal();
    return Math.max(0, total - platesToUse);
  }, [getTotal, platesToUse]);

  const getMaxPlatesUsable = useCallback(() => {
    const total = getTotal();
    const userPlateBalance = user?.plateBalance || 0;
    return Math.min(userPlateBalance, total);
  }, [getTotal, user?.plateBalance]);

  const applyPlates = useCallback((amount: number) => {
    const maxUsable = getMaxPlatesUsable();
    setPlatesToUse(Math.min(Math.max(0, amount), maxUsable));
  }, [getMaxPlatesUsable]);

  const resetPlates = useCallback(() => {
    setPlatesToUse(0);
  }, []);

  const checkoutMutation = useMutation({
    mutationFn: async (paymentData: {
      paymentMethod: PaymentMethod;
      billingAddress?: string;
    }) => {
      console.log('Processing payment...', paymentData);

      if (!user) throw new Error('User not logged in');

      const timestamp = new Date().toISOString();
      const errors: any[] = [];

      // Process all items in cart
      await Promise.all(cart.map(async (item) => {
        try {
          if (item.package.type === 'ticket') {
            // Handle Ticket Plan
            const daysValid = item.package.expiryDays || 90; // Default to 90 if missing
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + daysValid);

            const { error } = await supabase.from('user_tickets').insert({
              user_id: user.id,
              plan_id: item.package.planId,
              total_sessions: item.package.totalClasses || 0,
              sessions_remaining: item.package.totalClasses || 0,
              status: 'active',
              purchase_date: timestamp,
              expiry_date: expiryDate.toISOString(),
              payment_method: paymentData.paymentMethod.type,
              payment_reference: 'PROCESSED_IN_APP', // Placeholder for real payment ref
            });
            if (error) throw error;

          } else {
            // Handle Subscription Plan
            const months = item.package.durationMonths || 1;
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + months);

            // console.log('Supabase config:', supabase.supabaseUrl); 

            const { error } = await supabase.from('user_subscriptions').insert({
              user_id: user.id,
              plan_id: item.package.planId,
              status: 'active',
              start_date: timestamp,
              end_date: endDate.toISOString(),
              payment_method: paymentData.paymentMethod.type,
              payment_reference: 'PROCESSED_IN_APP',
              sessions_used_this_week: 0,
            });
            if (error) throw error;
          }
        } catch (err) {
          console.error('Error processing item:', item, err);
          errors.push(err);
        }
      }));

      if (errors.length > 0) {
        throw new Error('Some items failed to process');
      }

      await new Promise(resolve => setTimeout(resolve, 1000)); // Small UX delay
      clearCart();

      // Refresh user data (subscription status) after successful purchase
      if (refreshUser) {
        // console.log('Refetching user subscription...');
        refreshUser();
      }

      return {
        success: true,
        orderId: `ORD-${Date.now()}`,
        message: 'התשלום בוצע והמנוי/כרטיסייה הופעלו בהצלחה',
      };
    },
  });

  const { mutateAsync: processCheckout } = checkoutMutation;

  const checkout = useCallback(async (paymentData: {
    paymentMethod: PaymentMethod;
    billingAddress?: string;
  }) => {
    return processCheckout(paymentData);
  }, [processCheckout]);

  return useMemo(() => ({
    cart,
    packages,
    isLoading: cartQuery.isLoading || plansQuery.isLoading || ticketPlansQuery.isLoading,
    isProcessing: checkoutMutation.isPending,
    platesToUse,
    totalPlates: user?.plateBalance || 0,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotal,
    getDiscountedTotal,
    getMaxPlatesUsable,
    applyPlates,
    resetPlates,
    checkout,
  }), [cart, packages, cartQuery.isLoading, plansQuery.isLoading, ticketPlansQuery.isLoading, checkoutMutation.isPending, platesToUse, user?.plateBalance, addToCart, removeFromCart, updateQuantity, clearCart, getTotal, getDiscountedTotal, getMaxPlatesUsable, applyPlates, resetPlates, checkout]);
});

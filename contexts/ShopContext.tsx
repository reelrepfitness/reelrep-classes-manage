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

  const plansQuery = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      console.log('[Shop] Fetching plans...');
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) {
        console.error('[Shop] Error fetching plans:', error);
        throw error;
      }
      console.log('[Shop] Plans:', data);
      return data || [];
    },
  });

  const packages: SubscriptionPackage[] = useMemo(() => {
    if (!plansQuery.data) return [];

    const allPlans = plansQuery.data;
    const subPlans = allPlans.filter((p: any) => p.category === 'subscription');
    const ticketPlans = allPlans.filter((p: any) => p.category === 'ticket');

    // Generate subscription package variants based on payment options
    const subscriptions: SubscriptionPackage[] = subPlans.flatMap((plan: any) => {
      const isUnlimited = plan.is_unlimited;
      const highlight = plan.name?.includes('ELITE') || plan.name?.includes('ONE');
      const classesPerMonth = plan.sessions_per_week ? plan.sessions_per_week * 4 : 0;

      const baseFeatures: string[] = [];
      if (plan.description) {
        const descriptionLines = plan.description.split('\n').filter((line: string) => line.trim());
        baseFeatures.push(...descriptionLines);
      }

      const variants: SubscriptionPackage[] = [];

      // Upfront payment option — shows full commitment duration
      if (plan.allow_upfront && plan.price_upfront) {
        variants.push({
          id: `${plan.id}-upfront`,
          planId: plan.id,
          type: isUnlimited ? 'unlimited' : 'limited',
          planType: isUnlimited ? 'unlimited' : 'subscription',
          name: plan.name,
          price: Number(plan.price_upfront),
          pricePerMonth: plan.price_per_month ? Number(plan.price_per_month) : undefined,
          currency: '₪',
          duration: 'monthly',
          durationLabel: `${plan.duration_months} חודשים`,
          durationMonths: plan.duration_months,
          features: baseFeatures,
          classesPerMonth,
          popular: highlight,
          highlight,
          greenInvoiceUrl: plan.green_invoice_url || undefined,
          disclaimer: plan.disclaimer || undefined,
          paymentOption: 'upfront',
        });
      }

      // Recurring payment option (הוראת קבע) — monthly price
      if (plan.allow_recurring && plan.price_per_month) {
        variants.push({
          id: `${plan.id}-recurring`,
          planId: plan.id,
          type: isUnlimited ? 'unlimited' : 'limited',
          planType: isUnlimited ? 'unlimited' : 'subscription',
          name: plan.name,
          price: Number(plan.price_per_month),
          pricePerMonth: Number(plan.price_per_month),
          currency: '₪',
          duration: 'monthly',
          durationLabel: 'לחודש (הו״ק)',
          durationMonths: 1,
          features: baseFeatures,
          classesPerMonth,
          popular: false,
          highlight: false,
          greenInvoiceUrl: plan.green_invoice_url || undefined,
          disclaimer: plan.disclaimer || undefined,
          paymentOption: 'recurring',
        });
      }

      // Monthly manual payment option — monthly price
      if (plan.allow_monthly && plan.price_per_month) {
        variants.push({
          id: `${plan.id}-monthly`,
          planId: plan.id,
          type: isUnlimited ? 'unlimited' : 'limited',
          planType: isUnlimited ? 'unlimited' : 'subscription',
          name: plan.name,
          price: Number(plan.price_per_month),
          pricePerMonth: Number(plan.price_per_month),
          currency: '₪',
          duration: 'monthly',
          durationLabel: 'לחודש',
          durationMonths: 1,
          features: baseFeatures,
          classesPerMonth,
          popular: false,
          highlight: false,
          greenInvoiceUrl: plan.green_invoice_url || undefined,
          disclaimer: plan.disclaimer || undefined,
          paymentOption: 'monthly_manual',
        });
      }

      // Fallback: if no payment options set, show upfront with price_upfront or price_per_month
      if (variants.length === 0) {
        const fallbackPrice = plan.price_upfront || plan.price_per_month;
        if (fallbackPrice) {
          variants.push({
            id: `${plan.id}-default`,
            planId: plan.id,
            type: isUnlimited ? 'unlimited' : 'limited',
            planType: isUnlimited ? 'unlimited' : 'subscription',
            name: plan.name,
            price: Number(fallbackPrice),
            pricePerMonth: plan.price_per_month ? Number(plan.price_per_month) : undefined,
            currency: '₪',
            duration: 'monthly',
            durationLabel: plan.duration_months > 1 ? `${plan.duration_months} חודשים` : 'לחודש',
            durationMonths: plan.duration_months || 1,
            features: baseFeatures,
            classesPerMonth,
            popular: highlight,
            highlight,
            greenInvoiceUrl: plan.green_invoice_url || undefined,
            disclaimer: plan.disclaimer || undefined,
            paymentOption: 'upfront',
          });
        }
      }

      return variants;
    });

    // Ticket packages
    const tickets: SubscriptionPackage[] = ticketPlans.map((plan: any) => ({
      id: plan.id,
      planId: plan.id,
      type: 'ticket' as const,
      planType: 'ticket',
      name: plan.name,
      price: Number(plan.price_total),
      currency: '₪',
      duration: 'one-time',
      durationLabel: `${plan.total_sessions} אימונים`,
      durationMonths: 0,
      features: [plan.description || ''].filter(Boolean),
      classesPerMonth: plan.total_sessions,
      totalClasses: plan.total_sessions,
      expiryDays: plan.validity_days,
      popular: plan.total_sessions === 20,
      greenInvoiceUrl: plan.green_invoice_url || undefined,
      disclaimer: plan.disclaimer || undefined,
    }));

    // Sort subscriptions: ELITE before ONE
    const sortedSubscriptions = subscriptions.sort((a, b) => {
      const aIsElite = a.name?.toUpperCase().includes('ELITE') ? 0 : 1;
      const bIsElite = b.name?.toUpperCase().includes('ELITE') ? 0 : 1;
      return aIsElite - bIsElite;
    });

    return [...sortedSubscriptions, ...tickets];
  }, [plansQuery.data]);

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

  const forceResetCart = useCallback(async () => {
    setCart([]);
    try {
      if (user) {
        await AsyncStorage.removeItem(`${CART_STORAGE_KEY}_${user.id}`);
      }
    } catch (error) {
      console.error('Error clearing cart from storage:', error);
    }
  }, [user]);

  const getTotal = useCallback(() => {
    return cart.reduce((total, item) => total + item.package.price * item.quantity, 0);
  }, [cart]);

  const getDiscountedTotal = useCallback(() => {
    return getTotal();
  }, [getTotal]);

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
    isLoading: cartQuery.isLoading || plansQuery.isLoading,
    isProcessing: checkoutMutation.isPending,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    forceResetCart,
    getTotal,
    getDiscountedTotal,
    checkout,
  }), [cart, packages, cartQuery.isLoading, plansQuery.isLoading, checkoutMutation.isPending, addToCart, removeFromCart, updateQuantity, clearCart, forceResetCart, getTotal, getDiscountedTotal, checkout]);
});

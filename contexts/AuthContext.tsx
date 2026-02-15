import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '@/constants/types';
import { supabase } from '@/constants/supabase';
import { Session } from '@supabase/supabase-js';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const authQuery = useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[Auth] Initial session check:', session?.user?.email);
      return session;
    },
  });

  useEffect(() => {
    if (authQuery.data !== undefined) {
      setSession(authQuery.data);
      setSessionId(authQuery.data?.user?.id || null);
    }
  }, [authQuery.data]);

  const profileQuery = useQuery({
    queryKey: ['profile', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, full_name, avatar_url, is_admin, is_coach, total_workouts, gender, phone_number, birthday')
          .eq('id', sessionId)
          .single();
        if (error) {
          if (error.code === '42P17') {
            console.warn('[Auth] RLS policy has infinite recursion. Fix Supabase policies. Using fallback.');
            return null;
          }
          console.error('[Auth] Profile fetch error:', error.message);
          return null;
        }
        console.log('[Auth] Profile data:', data);
        return data;
      } catch (err) {
        console.error('[Auth] Profile fetch exception:', err);
        return null;
      }
    },
    enabled: !!sessionId,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch user subscription OR Active Ticket from database
  const subscriptionQuery = useQuery({
    queryKey: ['subscription', sessionId],
    queryFn: async () => {
      if (!sessionId) {
        console.log('[Auth] Subscription fetch skipped: No sessionId');
        return null;
      }
      console.log('[Auth] Fetching subscription/ticket for:', sessionId);
      try {
        // 1. Fetch Subscription
        const { data: subData, error: subError } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', sessionId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (subData) {
          // Found active subscription - fetch plan from unified plans table
          const { data: planData } = await supabase
            .from('plans')
            .select('name, category, sessions_per_week, is_unlimited, image_url')
            .eq('id', subData.plan_id)
            .single();

          return { ...subData, plan: planData };
        }

        // 2. If no active subscription, Fetch Active Ticket
        const { data: ticketData } = await supabase
          .from('user_tickets')
          .select('*')
          .eq('user_id', sessionId)
          .eq('status', 'active')
          .gt('expiry_date', new Date().toISOString())
          .gt('sessions_remaining', 0)
          .order('purchase_date', { ascending: false })
          .limit(1)
          .single();

        if (ticketData) {
          console.log('[Auth] Found active ticket:', ticketData);
          // Fetch ticket plan details from unified plans table
          const { data: ticketPlanData } = await supabase
            .from('plans')
            .select('name, image_url, total_sessions')
            .eq('id', ticketData.plan_id)
            .single();

          return {
            ...ticketData,
            plan: ticketPlanData,
            type: 'ticket' // Marker
          };
        }

        return null;

      } catch (err) {
        console.error('[Auth] Subscription fetch exception:', err);
        return null;
      }
    },
    enabled: !!sessionId,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (session?.user && profileQuery.data !== undefined) {
      const profile = profileQuery.data;
      const subscription = subscriptionQuery.data;

      let userSubscription: User['subscription'] | undefined;

      if (subscription) {
        // Check if it is a plan or a ticket based on returned data structure
        // We will unify the structure in subscriptionQuery next
        const plan = subscription.plan as any;
        const now = new Date();
        // If it's a ticket, it might not have 'active' status in the same way, but checking end_date is good
        const endDate = new Date(subscription.end_date || subscription.expiry_date);
        const isActive = (subscription.is_active || subscription.status === 'active') && endDate > now;

        if (isActive) {
          userSubscription = {
            type: plan?.is_unlimited ? 'unlimited' : (plan?.category === 'ticket' ? 'ticket' : (subscription.total_sessions ? (subscription.total_sessions === 20 ? '20-class' : '10-class') : 'basic')),
            status: 'active',
            startDate: subscription.start_date || subscription.purchase_date,
            endDate: subscription.end_date || subscription.expiry_date,
            classesPerMonth: plan?.sessions_per_week ? plan.sessions_per_week * 4 : (subscription.total_sessions || 0),
            classesUsed: subscription.sessions_remaining !== undefined
              ? (subscription.total_sessions - subscription.sessions_remaining)
              : 0,
            // New fields for plan display
            planName: plan?.name,
            planImageUrl: plan?.image_url,
            isTicket: !!subscription.total_sessions,
            totalSessions: subscription.total_sessions,
            sessionsRemaining: subscription.sessions_remaining,
          };
        }
      }

      const user: User = {
        id: session.user.id,
        name: profile?.full_name || profile?.name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
        email: session.user.email || '',
        role: profile?.is_admin ? 'admin' : (profile?.is_coach ? 'coach' : 'user'),
        profileImage: profile?.avatar_url || session.user.user_metadata?.avatar_url || '',
        gender: profile?.gender || undefined,
        subscription: userSubscription,
        stats: {
          totalWorkouts: profile?.total_workouts || 0,
          totalMinutes: 0,
          currentStreak: 0,
        },
      };
      setCurrentUser(user);
    } else if (!session?.user) {
      setCurrentUser(null);
    }
  }, [session, profileQuery.data, subscriptionQuery.data]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      console.log('[Auth] State change:', _event, newSession?.user?.email);
      setSession(newSession);
      setSessionId(newSession?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithPassword = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      console.log('[Auth] Signing in with password:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        console.error('[Auth] Sign in error:', error);
        throw error;
      }
      console.log('[Auth] Sign in success:', data.user?.email);
      return data;
    },
  });

  const signInWithOTP = useMutation({
    mutationFn: async (email: string) => {
      console.log('[Auth] Sending OTP to:', email);
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
      });
      if (error) {
        console.error('[Auth] OTP error:', error);
        throw error;
      }
      console.log('[Auth] OTP sent successfully');
      return data;
    },
  });

  const verifyOTP = useMutation({
    mutationFn: async ({ email, token }: { email: string; token: string }) => {
      console.log('[Auth] Verifying OTP for:', email);
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (error) {
        console.error('[Auth] OTP verification error:', error);
        throw error;
      }
      console.log('[Auth] OTP verified successfully');
      return data;
    },
  });

  const resetPassword = useMutation({
    mutationFn: async (email: string) => {
      console.log('[Auth] Sending password reset to:', email);
      const { data, error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        console.error('[Auth] Password reset error:', error);
        throw error;
      }
      console.log('[Auth] Password reset email sent');
      return data;
    },
  });

  const signOut = useCallback(async () => {
    console.log('[Auth] Signing out');
    await supabase.auth.signOut();
    setCurrentUser(null);
    setSession(null);
    setSessionId(null);
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      setCurrentUser(updatedUser);
    }
  }, [currentUser]);

  return useMemo(() => ({
    user: currentUser,
    session,
    isAuthenticated: currentUser !== null && session !== null,
    isAdmin: currentUser?.role === 'admin',
    isCoach: currentUser?.role === 'coach' || currentUser?.role === 'admin',
    isLoading: authQuery.isLoading || profileQuery.isLoading || subscriptionQuery.isLoading,
    signInWithPassword,
    signInWithOTP,
    verifyOTP,
    resetPassword,
    signOut,
    updateUser,
    refreshUser: async () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', sessionId] });
      await Promise.all([
        profileQuery.refetch(),
        subscriptionQuery.refetch()
      ]);
    },
  }), [currentUser, session, authQuery.isLoading, profileQuery.isLoading, subscriptionQuery.isLoading, signInWithPassword, signInWithOTP, verifyOTP, resetPassword, signOut, updateUser, profileQuery.refetch, subscriptionQuery.refetch]);
});

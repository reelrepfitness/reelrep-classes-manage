import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '@/constants/types';
import { supabase } from '@/constants/supabase';
import { Session } from '@supabase/supabase-js';

export const [AuthProvider, useAuth] = createContextHook(() => {
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
          .select('id, name, full_name, avatar_url, is_admin, is_coach, plate_balance')
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

  // Fetch user subscription from database
  const subscriptionQuery = useQuery({
    queryKey: ['subscription', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      try {
        const { data, error } = await supabase
          .from('user_subscriptions')
          .select(`
            *,
            plan:subscription_plans!user_subscriptions_plan_id_fkey(
              name,
              type,
              sessions_per_week
            )
          `)
          .eq('user_id', sessionId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No active subscription found
            console.log('[Auth] No active subscription found');
            return null;
          }
          console.error('[Auth] Subscription fetch error:', error.message);
          return null;
        }
        console.log('[Auth] Subscription data:', data);
        return data;
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

      if (subscription && subscription.plan) {
        const plan = subscription.plan as any;
        const now = new Date();
        const endDate = new Date(subscription.end_date);
        const isActive = subscription.is_active && endDate > now;

        userSubscription = {
          type: plan.type || 'basic',
          status: isActive ? 'active' : 'expired',
          startDate: subscription.start_date,
          endDate: subscription.end_date,
          classesPerMonth: plan.sessions_per_week ? plan.sessions_per_week * 4 : 0,
          classesUsed: profile?.classes_used || 0,
        };
      }

      const user: User = {
        id: session.user.id,
        name: profile?.name || profile?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
        email: session.user.email || '',
        role: profile?.is_admin ? 'admin' : (profile?.is_coach ? 'coach' : 'user'),
        profileImage: profile?.avatar_url || session.user.user_metadata?.avatar_url || '',
        subscription: userSubscription,
        plateBalance: profile?.plate_balance || 0,
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
  }), [currentUser, session, authQuery.isLoading, profileQuery.isLoading, subscriptionQuery.isLoading, signInWithPassword, signInWithOTP, verifyOTP, resetPassword, signOut, updateUser]);
});

import { useState, useCallback } from 'react';
import { supabase } from '@/constants/supabase';

// ─── Types ───────────────────────────────────────────────

export interface ClientListItem {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  avatar_url: string | null;
  block_end_date: string | null;
  created_at: string;
  late_cancellations: number;
  // Joined subscription data (latest active)
  subscription?: {
    id: string;
    plan_name: string;
    plan_status: string;
    is_active: boolean;
    sessions_remaining: number | null;
    end_date: string;
    outstanding_balance: number;
    has_debt: boolean;
  } | null;
  // Joined ticket data (latest active)
  ticket?: {
    id: string;
    plan_name: string;
    status: string;
    sessions_remaining: number;
    total_sessions: number;
    expiry_date: string;
    has_debt: boolean;
  } | null;
}

export interface ClientDetail {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  avatar_url: string | null;
  gender: string | null;
  birthday: string | null;
  created_at: string;
  block_end_date: string | null;
  late_cancellations: number;
  total_workouts: number;
  // Computed
  attendedCount: number;
  lastClassDate: string | null;
  highestAchievement: {
    id: string;
    name: string;
    icon: string;
    task_requirement: number;
  } | null;
  // Relations
  subscription: SubscriptionDetail | null;
  ticket: TicketDetail | null;
}

export interface SubscriptionDetail {
  id: string;
  subscription_id: string;
  plan_name: string;
  plan_type: string;
  sessions_per_week: number | null;
  plan_status: string;
  is_active: boolean;
  start_date: string;
  end_date: string;
  sessions_remaining: number | null;
  outstanding_balance: number;
  has_debt: boolean;
  debt_amount: number | null;
  freeze_reason: string | null;
  freeze_start_date: string | null;
  freeze_end_date: string | null;
  payment_method: string | null;
}

export interface TicketDetail {
  id: string;
  plan_id: string;
  plan_name: string;
  status: string;
  total_sessions: number;
  sessions_remaining: number;
  purchase_date: string;
  expiry_date: string;
  has_debt: boolean;
  debt_amount: number | null;
  notes: string | null;
}

export interface AvailablePlan {
  id: string;
  name: string;
  type: 'subscription' | 'ticket';
  price: number;
  sessions_per_week?: number | null;
  total_sessions?: number;
  validity_days?: number;
}

// ─── Hook ────────────────────────────────────────────────

export function useAdminClients() {
  const [loading, setLoading] = useState(false);

  // ─── Fetch all clients with their latest subscription/ticket ───

  const fetchClients = useCallback(async (): Promise<ClientListItem[]> => {
    // 1. Fetch all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone_number, avatar_url, block_end_date, created_at, late_cancellations')
      .order('full_name', { ascending: true });

    if (profilesError) throw profilesError;
    if (!profiles || profiles.length === 0) return [];

    const userIds = profiles.map(p => p.id);

    // 2. Fetch active subscriptions for all users
    const { data: subscriptions } = await supabase
      .from('user_subscriptions')
      .select(`
        id, user_id, plan_status, is_active, sessions_remaining, end_date,
        outstanding_balance, has_debt,
        subscription_plans:subscription_id ( name )
      `)
      .in('user_id', userIds)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // 3. Fetch active tickets for all users
    const { data: tickets } = await supabase
      .from('user_tickets')
      .select(`
        id, user_id, status, sessions_remaining, total_sessions, expiry_date, has_debt,
        ticket_plans:plan_id ( name )
      `)
      .in('user_id', userIds)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    // Build lookup maps (latest per user)
    const subMap = new Map<string, any>();
    for (const sub of (subscriptions || [])) {
      if (!subMap.has(sub.user_id)) {
        subMap.set(sub.user_id, sub);
      }
    }

    const ticketMap = new Map<string, any>();
    for (const t of (tickets || [])) {
      if (!ticketMap.has(t.user_id)) {
        ticketMap.set(t.user_id, t);
      }
    }

    // Merge
    return profiles.map(p => {
      const sub = subMap.get(p.id);
      const tkt = ticketMap.get(p.id);

      return {
        ...p,
        late_cancellations: p.late_cancellations || 0,
        subscription: sub ? {
          id: sub.id,
          plan_name: (sub.subscription_plans as any)?.name || 'מנוי',
          plan_status: sub.plan_status || 'active',
          is_active: sub.is_active,
          sessions_remaining: sub.sessions_remaining,
          end_date: sub.end_date,
          outstanding_balance: Number(sub.outstanding_balance) || 0,
          has_debt: sub.has_debt || false,
        } : null,
        ticket: tkt ? {
          id: tkt.id,
          plan_name: (tkt.ticket_plans as any)?.name || 'כרטיסייה',
          status: tkt.status,
          sessions_remaining: tkt.sessions_remaining,
          total_sessions: tkt.total_sessions,
          expiry_date: tkt.expiry_date,
          has_debt: tkt.has_debt || false,
        } : null,
      };
    });
  }, []);

  // ─── Fetch single client detail ───

  const fetchClientDetail = useCallback(async (userId: string): Promise<ClientDetail | null> => {
    // 1. Profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone_number, avatar_url, gender, birthday, created_at, block_end_date, late_cancellations, total_workouts')
      .eq('id', userId)
      .single();

    if (profileError || !profile) return null;

    // 2. Active subscription
    const { data: subData } = await supabase
      .from('user_subscriptions')
      .select(`
        id, subscription_id, plan_status, is_active, start_date, end_date,
        sessions_remaining, outstanding_balance, has_debt, debt_amount,
        freeze_reason, freeze_start_date, freeze_end_date, payment_method,
        subscription_plans:subscription_id ( name, type, sessions_per_week )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 3. Active ticket
    const { data: ticketData } = await supabase
      .from('user_tickets')
      .select(`
        id, plan_id, status, total_sessions, sessions_remaining,
        purchase_date, expiry_date, has_debt, debt_amount, notes,
        ticket_plans:plan_id ( name )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 4. Attended classes count + last class date
    const { count: attendedCount } = await supabase
      .from('class_bookings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('attended_at', 'is', null);

    const { data: lastBooking } = await supabase
      .from('class_bookings')
      .select('attended_at')
      .eq('user_id', userId)
      .not('attended_at', 'is', null)
      .order('attended_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 5. Highest achievement
    const { data: userAchievements } = await supabase
      .from('user_achievements')
      .select(`
        achievement_id,
        achievements:achievement_id (
          id, name, icon, task_requirement
        )
      `)
      .eq('user_id', userId)
      .eq('completed', true);

    const sortedAchievements = (userAchievements || [])
      .filter((ua: any) => ua.achievements)
      .map((ua: any) => ua.achievements)
      .sort((a: any, b: any) => (b.task_requirement || 0) - (a.task_requirement || 0));

    const highestAchievement = sortedAchievements[0] || null;

    // Build subscription detail
    let subscription: SubscriptionDetail | null = null;
    if (subData) {
      const plan = subData.subscription_plans as any;
      subscription = {
        id: subData.id,
        subscription_id: subData.subscription_id,
        plan_name: plan?.name || 'מנוי',
        plan_type: plan?.type || 'unlimited',
        sessions_per_week: plan?.sessions_per_week || null,
        plan_status: subData.plan_status || 'active',
        is_active: subData.is_active,
        start_date: subData.start_date,
        end_date: subData.end_date,
        sessions_remaining: subData.sessions_remaining,
        outstanding_balance: Number(subData.outstanding_balance) || 0,
        has_debt: subData.has_debt || false,
        debt_amount: subData.debt_amount ? Number(subData.debt_amount) : null,
        freeze_reason: subData.freeze_reason,
        freeze_start_date: subData.freeze_start_date,
        freeze_end_date: subData.freeze_end_date,
        payment_method: subData.payment_method,
      };
    }

    // Build ticket detail
    let ticket: TicketDetail | null = null;
    if (ticketData) {
      const tPlan = ticketData.ticket_plans as any;
      ticket = {
        id: ticketData.id,
        plan_id: ticketData.plan_id,
        plan_name: tPlan?.name || 'כרטיסייה',
        status: ticketData.status,
        total_sessions: ticketData.total_sessions,
        sessions_remaining: ticketData.sessions_remaining,
        purchase_date: ticketData.purchase_date,
        expiry_date: ticketData.expiry_date,
        has_debt: ticketData.has_debt || false,
        debt_amount: ticketData.debt_amount ? Number(ticketData.debt_amount) : null,
        notes: ticketData.notes,
      };
    }

    return {
      id: profile.id,
      full_name: profile.full_name || profile.email || 'לקוח',
      email: profile.email,
      phone_number: profile.phone_number,
      avatar_url: profile.avatar_url,
      gender: profile.gender,
      birthday: profile.birthday,
      created_at: profile.created_at,
      block_end_date: profile.block_end_date,
      late_cancellations: profile.late_cancellations || 0,
      total_workouts: profile.total_workouts || 0,
      attendedCount: attendedCount || 0,
      lastClassDate: lastBooking?.attended_at || null,
      highestAchievement,
      subscription,
      ticket,
    };
  }, []);

  // ─── Fetch available plans ───

  const fetchAvailablePlans = useCallback(async (): Promise<AvailablePlan[]> => {
    const [{ data: subs }, { data: tickets }] = await Promise.all([
      supabase
        .from('subscription_plans')
        .select('id, name, type, full_price_in_advance, sessions_per_week')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('ticket_plans')
        .select('id, name, total_sessions, validity_days, price')
        .eq('is_active', true)
        .order('name'),
    ]);

    const plans: AvailablePlan[] = [];

    for (const s of (subs || [])) {
      plans.push({
        id: s.id,
        name: s.name,
        type: 'subscription',
        price: Number(s.full_price_in_advance),
        sessions_per_week: s.sessions_per_week,
      });
    }

    for (const t of (tickets || [])) {
      plans.push({
        id: t.id,
        name: t.name,
        type: 'ticket',
        price: Number(t.price),
        total_sessions: t.total_sessions,
        validity_days: t.validity_days,
      });
    }

    return plans;
  }, []);

  // ─── Mutations ─────────────────────────────────────────

  const assignSubscription = useCallback(async (
    userId: string,
    planId: string,
    startDate: string,
    endDate: string,
  ) => {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        subscription_id: planId,
        start_date: startDate,
        end_date: endDate,
        is_active: true,
        plan_status: 'active',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }, []);

  const assignTicket = useCallback(async (
    userId: string,
    planId: string,
    totalSessions: number,
    validityDays: number,
  ) => {
    const now = new Date();
    const expiry = new Date(now);
    expiry.setDate(expiry.getDate() + validityDays);

    const { data, error } = await supabase
      .from('user_tickets')
      .insert({
        user_id: userId,
        plan_id: planId,
        status: 'active',
        total_sessions: totalSessions,
        sessions_remaining: totalSessions,
        purchase_date: now.toISOString(),
        expiry_date: expiry.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }, []);

  const updateSubscription = useCallback(async (
    subId: string,
    updates: {
      sessions_remaining?: number;
      end_date?: string;
      plan_status?: string;
      outstanding_balance?: number;
      has_debt?: boolean;
      debt_amount?: number | null;
    },
  ) => {
    const { error } = await supabase
      .from('user_subscriptions')
      .update(updates)
      .eq('id', subId);

    if (error) throw error;
  }, []);

  const updateTicketSessions = useCallback(async (
    ticketId: string,
    sessionsRemaining: number,
  ) => {
    const updates: any = { sessions_remaining: sessionsRemaining };
    if (sessionsRemaining <= 0) {
      updates.status = 'depleted';
    }

    const { error } = await supabase
      .from('user_tickets')
      .update(updates)
      .eq('id', ticketId);

    if (error) throw error;
  }, []);

  const freezeSubscription = useCallback(async (subId: string, reason: string) => {
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        plan_status: 'frozen',
        freeze_reason: reason || null,
        freeze_start_date: new Date().toISOString(),
        freeze_end_date: null,
      })
      .eq('id', subId);

    if (error) throw error;
  }, []);

  const unfreezeSubscription = useCallback(async (subId: string) => {
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        plan_status: 'active',
        freeze_end_date: new Date().toISOString(),
      })
      .eq('id', subId);

    if (error) throw error;
  }, []);

  const cancelSubscription = useCallback(async (subId: string) => {
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        is_active: false,
        plan_status: 'expired',
      })
      .eq('id', subId);

    if (error) throw error;
  }, []);

  const cancelTicket = useCallback(async (ticketId: string) => {
    const { error } = await supabase
      .from('user_tickets')
      .update({ status: 'cancelled' })
      .eq('id', ticketId);

    if (error) throw error;
  }, []);

  const blockClient = useCallback(async (userId: string, endDate: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ block_end_date: endDate })
      .eq('id', userId);

    if (error) throw error;
  }, []);

  const unblockClient = useCallback(async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ block_end_date: null })
      .eq('id', userId);

    if (error) throw error;
  }, []);

  return {
    loading,
    setLoading,
    fetchClients,
    fetchClientDetail,
    fetchAvailablePlans,
    assignSubscription,
    assignTicket,
    updateSubscription,
    updateTicketSessions,
    freezeSubscription,
    unfreezeSubscription,
    cancelSubscription,
    cancelTicket,
    blockClient,
    unblockClient,
  };
}

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
  // History
  recentBookings: BookingHistoryItem[];
  invoices: InvoiceHistoryItem[];
  pastPlans: PastPlanItem[];
  notes: ClientNote[];
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

export interface BookingHistoryItem {
  id: string;
  status: string;
  booked_at: string;
  attended_at: string | null;
  cancelled_at: string | null;
  class_title: string;
  class_date: string | null;
  class_time: string | null;
}

export interface InvoiceHistoryItem {
  id: string;
  total_amount: number;
  payment_status: string;
  payment_type: number | null;
  description: string | null;
  created_at: string;
  pdf_url: string | null;
  green_invoice_number: number | null;
}

export interface PastPlanItem {
  id: string;
  name: string;
  type: 'subscription' | 'ticket';
  status: string;
  start_date: string;
  end_date: string;
  sessions_info?: string;
}

export interface ClientNote {
  id: string;
  note: string;
  admin_name: string;
  created_at: string;
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
        plans:plan_id ( name )
      `)
      .in('user_id', userIds)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // 3. Fetch active tickets for all users
    const { data: tickets } = await supabase
      .from('user_tickets')
      .select(`
        id, user_id, status, sessions_remaining, total_sessions, expiry_date, has_debt,
        plans:plan_id ( name )
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
          plan_name: (sub.plans as any)?.name || 'מנוי',
          plan_status: sub.plan_status || 'active',
          is_active: sub.is_active,
          sessions_remaining: sub.sessions_remaining,
          end_date: sub.end_date,
          outstanding_balance: Number(sub.outstanding_balance) || 0,
          has_debt: sub.has_debt || false,
        } : null,
        ticket: tkt ? {
          id: tkt.id,
          plan_name: (tkt.plans as any)?.name || 'כרטיסייה',
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
        id, plan_id, plan_status, is_active, start_date, end_date,
        sessions_remaining, outstanding_balance, has_debt, debt_amount,
        freeze_reason, freeze_start_date, freeze_end_date, payment_method,
        plans:plan_id ( name, category, is_unlimited, sessions_per_week )
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
        plans:plan_id ( name )
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
      .eq('status', 'completed');

    const { data: lastBooking } = await supabase
      .from('class_bookings')
      .select('booked_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('booked_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 6. Recent bookings history
    const { data: recentBookingsData } = await supabase
      .from('class_bookings')
      .select(`id, status, booked_at, attended_at, cancelled_at, classes:class_id ( title, class_date, time )`)
      .eq('user_id', userId)
      .order('booked_at', { ascending: false })
      .limit(20);

    // 7. Invoice history (from DB, no external API calls)
    const { data: invoiceData } = await supabase
      .from('invoices')
      .select('id, total_amount, payment_status, payment_type, description, created_at, pdf_url, green_invoice_number')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    // 8. Past plans
    const { data: pastSubs } = await supabase
      .from('user_subscriptions')
      .select(`id, plan_status, start_date, end_date, plans:plan_id ( name )`)
      .eq('user_id', userId)
      .eq('is_active', false)
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: pastTickets } = await supabase
      .from('user_tickets')
      .select(`id, status, total_sessions, sessions_remaining, purchase_date, expiry_date, plans:plan_id ( name )`)
      .eq('user_id', userId)
      .neq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10);

    // 9. Admin notes
    const { data: notesData } = await supabase
      .from('admin_client_notes')
      .select('id, note, created_at, profiles:admin_id ( full_name )')
      .eq('client_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

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
      const plan = subData.plans as any;
      subscription = {
        id: subData.id,
        subscription_id: subData.plan_id,
        plan_name: plan?.name || 'מנוי',
        plan_type: plan?.is_unlimited ? 'unlimited' : (plan?.category || 'subscription'),
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
      const tPlan = ticketData.plans as any;
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

    // Build booking history
    const recentBookings: BookingHistoryItem[] = (recentBookingsData || []).map((b: any) => ({
      id: b.id,
      status: b.status,
      booked_at: b.booked_at,
      attended_at: b.attended_at,
      cancelled_at: b.cancelled_at,
      class_title: b.classes?.title || 'שיעור',
      class_date: b.classes?.class_date || null,
      class_time: b.classes?.time || null,
    }));

    // Build invoice history
    const invoices: InvoiceHistoryItem[] = (invoiceData || []).map((inv: any) => ({
      id: inv.id,
      total_amount: Number(inv.total_amount) || 0,
      payment_status: inv.payment_status || 'pending',
      payment_type: inv.payment_type,
      description: inv.description,
      created_at: inv.created_at,
      pdf_url: inv.pdf_url,
      green_invoice_number: inv.green_invoice_number,
    }));

    // Build past plans
    const pastPlans: PastPlanItem[] = [
      ...(pastSubs || []).map((s: any) => ({
        id: s.id,
        name: (s.plans as any)?.name || 'מנוי',
        type: 'subscription' as const,
        status: s.plan_status || 'expired',
        start_date: s.start_date,
        end_date: s.end_date,
      })),
      ...(pastTickets || []).map((t: any) => ({
        id: t.id,
        name: (t.plans as any)?.name || 'כרטיסייה',
        type: 'ticket' as const,
        status: t.status,
        start_date: t.purchase_date,
        end_date: t.expiry_date,
        sessions_info: `${t.sessions_remaining}/${t.total_sessions}`,
      })),
    ];

    // Build notes
    const notes: ClientNote[] = (notesData || []).map((n: any) => ({
      id: n.id,
      note: n.note,
      admin_name: (n.profiles as any)?.full_name || 'מנהל',
      created_at: n.created_at,
    }));

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
      lastClassDate: lastBooking?.booked_at || null,
      highestAchievement,
      subscription,
      ticket,
      recentBookings,
      invoices,
      pastPlans,
      notes,
    };
  }, []);

  // ─── Fetch available plans ───

  const fetchAvailablePlans = useCallback(async (): Promise<AvailablePlan[]> => {
    const { data, error } = await supabase
      .from('plans')
      .select('id, name, category, price_per_month, price_upfront, price_total, sessions_per_week, total_sessions, validity_days')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      type: p.category as 'subscription' | 'ticket',
      price: Number(p.category === 'ticket' ? p.price_total : (p.price_upfront || p.price_per_month)),
      sessions_per_week: p.sessions_per_week,
      total_sessions: p.total_sessions,
      validity_days: p.validity_days,
    }));
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
        plan_id: planId,
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
      start_date?: string;
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

  const addClientNote = useCallback(async (clientId: string, adminId: string, note: string) => {
    const { error } = await supabase
      .from('admin_client_notes')
      .insert({ client_id: clientId, admin_id: adminId, note });

    if (error) throw error;
  }, []);

  const deleteClientNote = useCallback(async (noteId: string) => {
    const { error } = await supabase
      .from('admin_client_notes')
      .delete()
      .eq('id', noteId);

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
    addClientNote,
    deleteClientNote,
  };
}

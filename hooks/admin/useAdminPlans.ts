import { useCallback } from 'react';
import { supabase } from '@/constants/supabase';

// ─── Types ───────────────────────────────────────────────

export interface SubscriptionPlan {
  id: string;
  name: string;
  type: string;
  sessions_per_week: number | null;
  full_price_in_advance: number;
  'price-per-month': number | null;
  description: string | null;
  desclaimers: string | null;
  image_url: string | null;
  green_invoice_URL: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TicketPlan {
  id: string;
  name: string;
  total_sessions: number;
  validity_days: number;
  price: number;
  description: string | null;
  disclaimer: string | null;
  image_url: string | null;
  green_invoice_URL: string | null;
  is_for_new_members_only: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Hook ────────────────────────────────────────────────

export function useAdminPlans() {

  // ── Subscription Plans ──

  const fetchSubscriptionPlans = useCallback(async (): Promise<SubscriptionPlan[]> => {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }, []);

  const createSubscriptionPlan = useCallback(async (plan: Partial<SubscriptionPlan>) => {
    const { data, error } = await supabase
      .from('subscription_plans')
      .insert(plan)
      .select()
      .single();
    if (error) throw error;
    return data;
  }, []);

  const updateSubscriptionPlan = useCallback(async (id: string, updates: Partial<SubscriptionPlan>) => {
    const { error } = await supabase
      .from('subscription_plans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }, []);

  const deleteSubscriptionPlan = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('subscription_plans')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }, []);

  // ── Ticket Plans ──

  const fetchTicketPlans = useCallback(async (): Promise<TicketPlan[]> => {
    const { data, error } = await supabase
      .from('ticket_plans')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }, []);

  const createTicketPlan = useCallback(async (plan: Partial<TicketPlan>) => {
    const { data, error } = await supabase
      .from('ticket_plans')
      .insert(plan)
      .select()
      .single();
    if (error) throw error;
    return data;
  }, []);

  const updateTicketPlan = useCallback(async (id: string, updates: Partial<TicketPlan>) => {
    const { error } = await supabase
      .from('ticket_plans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }, []);

  const deleteTicketPlan = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('ticket_plans')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }, []);

  return {
    fetchSubscriptionPlans,
    createSubscriptionPlan,
    updateSubscriptionPlan,
    deleteSubscriptionPlan,
    fetchTicketPlans,
    createTicketPlan,
    updateTicketPlan,
    deleteTicketPlan,
  };
}

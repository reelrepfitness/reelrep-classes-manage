import { useCallback } from 'react';
import { supabase } from '@/constants/supabase';

// ─── Types ───────────────────────────────────────────────

export interface Plan {
  id: string;
  name: string;
  category: 'subscription' | 'ticket';
  price_per_month: number | null;
  price_upfront: number | null;
  price_total: number | null;
  duration_months: number;
  sessions_per_week: number | null;
  total_sessions: number | null;
  validity_days: number;
  is_unlimited: boolean;
  allow_recurring: boolean;
  allow_upfront: boolean;
  allow_monthly: boolean;
  description: string | null;
  disclaimer: string | null;
  image_url: string | null;
  sort_order: number;
  is_for_new_members_only: boolean;
  green_invoice_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Backward-compat aliases for files that still import the old names
export type SubscriptionPlan = Plan;
export type TicketPlan = Plan;

// ─── Hook ────────────────────────────────────────────────

export function useAdminPlans() {

  const fetchPlans = useCallback(async (category?: 'subscription' | 'ticket'): Promise<Plan[]> => {
    let query = supabase
      .from('plans')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (category) {
      query = query.eq('category', category);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }, []);

  const createPlan = useCallback(async (plan: Partial<Plan>) => {
    const { data, error } = await supabase
      .from('plans')
      .insert(plan)
      .select()
      .single();
    if (error) throw error;
    return data;
  }, []);

  const updatePlan = useCallback(async (id: string, updates: Partial<Plan>) => {
    const { error } = await supabase
      .from('plans')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  }, []);

  const deletePlan = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }, []);

  // Backward-compat wrappers
  const fetchSubscriptionPlans = useCallback(() => fetchPlans('subscription'), [fetchPlans]);
  const fetchTicketPlans = useCallback(() => fetchPlans('ticket'), [fetchPlans]);
  const createSubscriptionPlan = createPlan;
  const createTicketPlan = createPlan;
  const updateSubscriptionPlan = updatePlan;
  const updateTicketPlan = updatePlan;
  const deleteSubscriptionPlan = deletePlan;
  const deleteTicketPlan = deletePlan;

  return {
    fetchPlans,
    createPlan,
    updatePlan,
    deletePlan,
    // Backward-compat
    fetchSubscriptionPlans,
    fetchTicketPlans,
    createSubscriptionPlan,
    createTicketPlan,
    updateSubscriptionPlan,
    updateTicketPlan,
    deleteSubscriptionPlan,
    deleteTicketPlan,
  };
}

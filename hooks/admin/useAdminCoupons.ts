import { useCallback } from 'react';
import { supabase } from '@/constants/supabase';

// ─── Types ───────────────────────────────────────────────

export interface Coupon {
  id: string;
  code: string;
  name: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses: number | null;
  times_used: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface CouponUserAssignment {
  id: string;
  coupon_id: string;
  user_id: string;
  created_at: string;
  user?: { id: string; full_name: string; email: string; avatar_url: string | null };
}

export interface CouponPlanAssignment {
  id: string;
  coupon_id: string;
  plan_id: string;
  plan_type: 'subscription' | 'ticket';
  created_at: string;
  plan_name?: string;
}

export interface CouponDetail extends Coupon {
  users: CouponUserAssignment[];
  plans: CouponPlanAssignment[];
}

// ─── Hook ────────────────────────────────────────────────

export function useAdminCoupons() {

  const fetchCoupons = useCallback(async (): Promise<Coupon[]> => {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }, []);

  const fetchCouponDetail = useCallback(async (id: string): Promise<CouponDetail | null> => {
    // Fetch coupon
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    if (!coupon) return null;

    // Fetch user assignments with profile data
    const { data: userAssignments } = await supabase
      .from('coupon_user_assignments')
      .select('id, coupon_id, user_id, created_at')
      .eq('coupon_id', id);

    // Enrich with profile data
    const enrichedUsers: CouponUserAssignment[] = [];
    if (userAssignments && userAssignments.length > 0) {
      const userIds = userAssignments.map(a => a.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      for (const assignment of userAssignments) {
        const profile = profiles?.find(p => p.id === assignment.user_id);
        enrichedUsers.push({
          ...assignment,
          user: profile || undefined,
        });
      }
    }

    // Fetch plan assignments and enrich with names
    const { data: planAssignments } = await supabase
      .from('coupon_plan_assignments')
      .select('id, coupon_id, plan_id, plan_type, created_at')
      .eq('coupon_id', id);

    const enrichedPlans: CouponPlanAssignment[] = [];
    if (planAssignments && planAssignments.length > 0) {
      const allPlanIds = planAssignments.map(p => p.plan_id);
      const planNames: Record<string, string> = {};

      if (allPlanIds.length > 0) {
        const { data } = await supabase.from('plans').select('id, name').in('id', allPlanIds);
        data?.forEach(p => { planNames[p.id] = p.name; });
      }

      for (const assignment of planAssignments) {
        enrichedPlans.push({
          ...assignment,
          plan_name: planNames[assignment.plan_id],
        });
      }
    }

    return { ...coupon, users: enrichedUsers, plans: enrichedPlans };
  }, []);

  const createCoupon = useCallback(async (data: Partial<Coupon>) => {
    const { data: coupon, error } = await supabase
      .from('coupons')
      .insert({ ...data, code: data.code?.toUpperCase() })
      .select()
      .single();
    if (error) throw error;
    return coupon;
  }, []);

  const updateCoupon = useCallback(async (id: string, updates: Partial<Coupon>) => {
    const { error } = await supabase
      .from('coupons')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }, []);

  const deleteCoupon = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }, []);

  // ── User Assignments ──

  const assignUser = useCallback(async (couponId: string, userId: string) => {
    const { error } = await supabase
      .from('coupon_user_assignments')
      .insert({ coupon_id: couponId, user_id: userId });
    if (error) {
      if (error.code === '23505') throw new Error('המשתמש כבר משויך לקופון');
      throw error;
    }
  }, []);

  const removeUser = useCallback(async (couponId: string, userId: string) => {
    const { error } = await supabase
      .from('coupon_user_assignments')
      .delete()
      .eq('coupon_id', couponId)
      .eq('user_id', userId);
    if (error) throw error;
  }, []);

  // ── Plan Assignments ──

  const assignPlan = useCallback(async (couponId: string, planId: string, planType: 'subscription' | 'ticket') => {
    const { error } = await supabase
      .from('coupon_plan_assignments')
      .insert({ coupon_id: couponId, plan_id: planId, plan_type: planType });
    if (error) {
      if (error.code === '23505') throw new Error('התוכנית כבר משויכת לקופון');
      throw error;
    }
  }, []);

  const removePlan = useCallback(async (couponId: string, planId: string) => {
    const { error } = await supabase
      .from('coupon_plan_assignments')
      .delete()
      .eq('coupon_id', couponId)
      .eq('plan_id', planId);
    if (error) throw error;
  }, []);

  return {
    fetchCoupons,
    fetchCouponDetail,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    assignUser,
    removeUser,
    assignPlan,
    removePlan,
  };
}

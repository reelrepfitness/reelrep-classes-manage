// hooks/admin/useKPIDashboard.ts — KPI Dashboard data hook

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/constants/supabase';
import { useGreenInvoice } from '@/hooks/useGreenInvoice';
import type {
  KPIDashboardData,
  FinancialKPIs,
  RetentionKPIs,
  BreakEvenKPIs,
  MonthOverMonth,
  ExpenseFormData,
  MarketingFormData,
  StudioConfigFormData,
} from '@/types/kpi';
import {
  calculateMRR,
  calculateARPM,
  calculateCAC,
  calculateLTV,
  calculateLTVCACRatio,
  calculateChurnRate,
  calculateRetentionRate,
  calculateBreakEvenMembers,
  calculateRevenuePerSqm,
} from '@/utils/kpi-calculations';

export function useKPIDashboard(month: number, year: number) {
  const [data, setData] = useState<KPIDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const autoSyncChecked = useRef(false);

  const { syncFinancialData } = useGreenInvoice();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Date boundaries for the selected month
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59);
      const monthStartISO = monthStart.toISOString();
      const monthEndISO = monthEnd.toISOString();

      // Previous month for comparison
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;

      // Expense date range for this month (YYYY-MM-DD format)
      const expDateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
      const expDateTo = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

      // Run all queries in parallel
      const [
        activeSubsResult,
        churnResult,
        marketingResult,
        expensesResult,
        configResult,
        statsResult,
        newMembersResult,
        allActiveForTenureResult,
        giExpensesResult,
        prevMonthResult,
      ] = await Promise.all([
        // 1. Active subscriptions with plan prices (for MRR)
        supabase
          .from('user_subscriptions')
          .select('id, user_id, start_date, subscription_id, subscription_plans(id, "price-per-month")')
          .eq('is_active', true)
          .eq('plan_status', 'active'),

        // 2. Churn log for this month
        supabase
          .from('member_churn_log')
          .select('*')
          .gte('churn_date', monthStartISO)
          .lte('churn_date', monthEndISO),

        // 3. Marketing spend for this month
        supabase
          .from('marketing_spend')
          .select('*')
          .eq('month', month)
          .eq('year', year),

        // 4. Monthly expenses for this month (manual)
        supabase
          .from('monthly_expenses')
          .select('*')
          .eq('month', month)
          .eq('year', year),

        // 5. Studio config (all rows)
        supabase
          .from('studio_config')
          .select('*'),

        // 6. Financial stats cache (Green Invoice synced income/expenses)
        supabase
          .from('financial_stats_cache')
          .select('*')
          .eq('month', month)
          .eq('year', year)
          .maybeSingle(),

        // 7. New members this month (subscriptions started this month)
        supabase
          .from('user_subscriptions')
          .select('id, start_date')
          .gte('start_date', monthStartISO)
          .lte('start_date', monthEndISO),

        // 8. All active subscriptions for tenure calculation
        supabase
          .from('user_subscriptions')
          .select('id, start_date, is_active, plan_status')
          .eq('is_active', true),

        // 9. Green Invoice expense breakdown for this month
        // NOTE: All financial KPIs use pre-VAT amounts (לפני מע"מ)
        supabase
          .from('expenses')
          .select('category, amount')
          .gte('expense_date', expDateFrom)
          .lte('expense_date', expDateTo),

        // 10. Previous month stats for comparison
        supabase
          .from('financial_stats_cache')
          .select('*')
          .eq('month', prevMonth)
          .eq('year', prevYear)
          .maybeSingle(),
      ]);

      // Extract data
      const activeSubs = activeSubsResult.data || [];
      const churnLogs = churnResult.data || [];
      const marketingSpends = marketingResult.data || [];
      const monthlyExpenses = expensesResult.data || [];
      const configRows = configResult.data || [];
      const statsCache = statsResult.data;
      const newMembers = newMembersResult.data || [];
      const allActiveForTenure = allActiveForTenureResult.data || [];
      const giExpenses = giExpensesResult.data || [];
      const prevMonthStats = prevMonthResult.data;

      // Build config map
      const config: Record<string, string> = {};
      configRows.forEach((row: any) => {
        config[row.key] = row.value;
      });

      // Set last sync time from config
      if (config['last_gi_sync_at']) {
        setLastSyncTime(config['last_gi_sync_at']);
      }

      const studioAreaSqm = parseFloat(config['studio_area_sqm'] || '0');
      const targetMRR = parseFloat(config['target_mrr'] || '0');
      const targetMembers = parseFloat(config['target_members'] || '0');

      // --- Financial KPIs ---
      const subsWithPrice = activeSubs.map((sub: any) => ({
        price_per_month: sub.subscription_plans?.['price-per-month'] || 0,
      }));
      const mrr = calculateMRR(subsWithPrice);
      const activeMembers = activeSubs.length;
      const arpm = calculateARPM(mrr, activeMembers);

      const totalIncome = statsCache?.total_income || 0;
      const greenExpenses = statsCache?.total_expenses || 0;

      const totalFixedCosts = monthlyExpenses
        .filter((e: any) => e.is_fixed)
        .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      const totalVariableCosts = monthlyExpenses
        .filter((e: any) => !e.is_fixed)
        .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      const totalManualExpenses = totalFixedCosts + totalVariableCosts;
      const totalExpenses = greenExpenses + totalManualExpenses;
      const netProfit = totalIncome - totalExpenses;

      const financial: FinancialKPIs = {
        mrr,
        activeMembers,
        arpm,
        totalIncome,
        totalExpenses,
        netProfit,
        totalFixedCosts,
        totalVariableCosts,
      };

      // --- Expense breakdown from Green Invoice expenses ---
      // NOTE: All financial KPIs use pre-VAT amounts (לפני מע"מ)
      const expensesByCategory: Record<string, number> = {};
      giExpenses.forEach((e: any) => {
        const cat = e.category || 'אחר';
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + (e.amount || 0);
      });

      // --- Income breakdown from stats cache ---
      const incomeByPaymentType: Record<string, number> = statsCache?.income_by_payment_type || {};

      // --- Month-over-month comparison ---
      const prevIncome = prevMonthStats?.total_income || 0;
      const prevExpenses = prevMonthStats?.total_expenses || 0;
      const prevProfit = prevMonthStats?.net_profit || 0;

      const monthOverMonth: MonthOverMonth = {
        incomeChange: prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : 0,
        expenseChange: prevExpenses > 0 ? ((greenExpenses - prevExpenses) / prevExpenses) * 100 : 0,
        profitChange: prevProfit !== 0 ? ((netProfit - prevProfit) / Math.abs(prevProfit)) * 100 : 0,
      };

      // --- Anomaly detection ---
      const anomalies: string[] = [];
      if (monthOverMonth.expenseChange > 50 && prevExpenses > 0) {
        anomalies.push(`הוצאות עלו ב-${Math.round(monthOverMonth.expenseChange)}% מחודש קודם`);
      }
      if (monthOverMonth.incomeChange < -30 && prevIncome > 0) {
        anomalies.push(`הכנסות ירדו ב-${Math.abs(Math.round(monthOverMonth.incomeChange))}% מחודש קודם`);
      }
      if (netProfit < 0 && prevProfit >= 0 && prevProfit > 0) {
        anomalies.push('החודש עברתם להפסד לראשונה');
      }

      // --- Retention KPIs ---
      const churnedThisMonth = churnLogs.length;
      const activeAtStartOfMonth = Math.max(0, activeMembers + churnedThisMonth - newMembers.length);
      const churnRate = calculateChurnRate(churnedThisMonth, activeAtStartOfMonth);
      const retentionRate = calculateRetentionRate(churnRate);

      const now = new Date();
      let avgTenureMonths = 0;
      if (allActiveForTenure.length > 0) {
        const totalMonths = allActiveForTenure.reduce((sum: number, sub: any) => {
          const start = new Date(sub.start_date);
          const diffMs = now.getTime() - start.getTime();
          const months = diffMs / (1000 * 60 * 60 * 24 * 30.44);
          return sum + Math.max(0, months);
        }, 0);
        avgTenureMonths = totalMonths / allActiveForTenure.length;
      }
      if (avgTenureMonths === 0 && churnLogs.length > 0) {
        const churnAvg = churnLogs.reduce((s: number, c: any) => s + (c.months_subscribed || 0), 0) / churnLogs.length;
        avgTenureMonths = churnAvg;
      }

      const totalMarketingSpend = marketingSpends.reduce(
        (sum: number, m: any) => sum + (m.amount || 0), 0
      );
      const totalConversions = marketingSpends.reduce(
        (sum: number, m: any) => sum + (m.conversions || 0), 0
      );
      const newPayingMembers = totalConversions > 0 ? totalConversions : newMembers.length;

      const cac = calculateCAC(totalMarketingSpend, newPayingMembers);
      const ltv = calculateLTV(arpm, avgTenureMonths);
      const ltvCacRatio = calculateLTVCACRatio(ltv, cac);

      const retention: RetentionKPIs = {
        churnRate,
        retentionRate,
        churnedThisMonth,
        activeAtStartOfMonth,
        avgTenureMonths: Math.round(avgTenureMonths * 10) / 10,
        ltv,
        cac,
        ltvCacRatio,
        newMembersThisMonth: newMembers.length,
      };

      // --- Break Even KPIs ---
      const breakEvenMembers = calculateBreakEvenMembers(totalFixedCosts, arpm);
      const revenuePerSqm = calculateRevenuePerSqm(mrr, studioAreaSqm);
      const progressPercent = breakEvenMembers > 0
        ? (activeMembers / breakEvenMembers) * 100
        : (activeMembers > 0 ? 100 : 0);

      const breakEven: BreakEvenKPIs = {
        breakEvenMembers,
        breakEvenRevenue: totalFixedCosts,
        currentMembers: activeMembers,
        currentMRR: mrr,
        progressPercent,
        revenuePerSqm,
        studioAreaSqm,
      };

      // --- Member sparkline (cumulative active members over last 6 months) ---
      const memberSparkline: number[] = [];
      for (let i = 5; i >= 0; i--) {
        let sm = month - i;
        let sy = year;
        if (sm <= 0) { sm += 12; sy -= 1; }
        const monthEnd = new Date(sy, sm, 0, 23, 59, 59);
        const count = allActiveForTenure.filter((sub: any) => new Date(sub.start_date) <= monthEnd).length;
        memberSparkline.push(count);
      }

      setData({
        financial,
        retention,
        breakEven,
        targets: { targetMRR, targetMembers },
        config,
        expensesByCategory,
        incomeByPaymentType,
        monthOverMonth,
        anomalies,
        memberSparkline,
      });
    } catch (err: any) {
      console.error('KPI Dashboard error:', err);
      setError(err.message || 'שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-sync on first load if stale > 1 hour
  useEffect(() => {
    if (!data || autoSyncChecked.current) return;
    autoSyncChecked.current = true;

    const lastSync = data.config['last_gi_sync_at'];
    if (lastSync) {
      const elapsed = Date.now() - new Date(lastSync).getTime();
      const ONE_HOUR = 60 * 60 * 1000;
      if (elapsed > ONE_HOUR) {
        triggerSync().catch(console.error);
      }
    }
  }, [data]);

  // --- Sync function ---
  const triggerSync = useCallback(async () => {
    setSyncing(true);
    try {
      await syncFinancialData();
      const syncTime = new Date().toISOString();
      // Update last sync time in config
      await supabase
        .from('studio_config')
        .update({ value: syncTime, updated_at: syncTime })
        .eq('key', 'last_gi_sync_at');
      setLastSyncTime(syncTime);
      // Reload all data
      await loadData();
    } catch (err: any) {
      console.error('Sync failed:', err);
      throw err;
    } finally {
      setSyncing(false);
    }
  }, [syncFinancialData, loadData]);

  // --- CRUD functions for modals ---

  const addExpense = async (formData: ExpenseFormData, m: number, y: number) => {
    const { error: err } = await supabase
      .from('monthly_expenses')
      .insert({
        month: m,
        year: y,
        category: formData.category,
        description: formData.description || null,
        amount: parseFloat(formData.amount) || 0,
        is_fixed: formData.is_fixed,
        vendor_name: formData.vendor_name || null,
        notes: formData.notes || null,
      });
    if (err) throw err;
    await loadData();
  };

  const addMarketingSpend = async (formData: MarketingFormData, m: number, y: number) => {
    const { error: err } = await supabase
      .from('marketing_spend')
      .upsert({
        month: m,
        year: y,
        channel: formData.channel,
        amount: parseFloat(formData.amount) || 0,
        leads_generated: parseInt(formData.leads_generated) || 0,
        trials_booked: parseInt(formData.trials_booked) || 0,
        conversions: parseInt(formData.conversions) || 0,
        notes: formData.notes || null,
      }, { onConflict: 'year,month,channel' });
    if (err) throw err;
    await loadData();
  };

  const updateConfig = async (formData: StudioConfigFormData) => {
    const updates = [
      { key: 'studio_area_sqm', value: formData.studio_area_sqm },
      { key: 'target_mrr', value: formData.target_mrr },
      { key: 'target_members', value: formData.target_members },
      { key: 'current_rent', value: formData.current_rent },
    ];
    for (const u of updates) {
      const { error: err } = await supabase
        .from('studio_config')
        .update({ value: u.value, updated_at: new Date().toISOString() })
        .eq('key', u.key);
      if (err) throw err;
    }
    await loadData();
  };

  return {
    data,
    loading,
    error,
    syncing,
    lastSyncTime,
    refresh: loadData,
    triggerSync,
    addExpense,
    addMarketingSpend,
    updateConfig,
  };
}

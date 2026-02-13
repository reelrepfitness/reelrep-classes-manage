// utils/kpi-calculations.ts — Pure KPI calculation functions (no Supabase imports)

import type { KPIStatus } from '@/types/kpi';

/**
 * MRR = SUM of monthly price for all active subscriptions
 */
export function calculateMRR(
  activeSubscriptions: Array<{ price_per_month: number | null }>
): number {
  return activeSubscriptions.reduce(
    (sum, sub) => sum + (sub.price_per_month || 0),
    0
  );
}

/**
 * Average Revenue Per Member = MRR / active members
 */
export function calculateARPM(mrr: number, activeMembers: number): number {
  if (activeMembers === 0) return 0;
  return mrr / activeMembers;
}

/**
 * Customer Acquisition Cost = marketing spend / new paying members
 */
export function calculateCAC(
  marketingSpendTotal: number,
  newPayingMembers: number
): number {
  if (newPayingMembers === 0) return 0;
  return marketingSpendTotal / newPayingMembers;
}

/**
 * Lifetime Value = ARPM * average tenure in months
 */
export function calculateLTV(arpm: number, avgTenureMonths: number): number {
  return arpm * avgTenureMonths;
}

/**
 * LTV:CAC ratio
 */
export function calculateLTVCACRatio(ltv: number, cac: number): number {
  if (cac === 0) return 0;
  return ltv / cac;
}

/**
 * Churn Rate = (churned this month / active at start of month) * 100
 */
export function calculateChurnRate(
  churnedThisMonth: number,
  activeAtStartOfMonth: number
): number {
  if (activeAtStartOfMonth === 0) return 0;
  return (churnedThisMonth / activeAtStartOfMonth) * 100;
}

/**
 * Retention Rate = 100 - churn rate
 */
export function calculateRetentionRate(churnRate: number): number {
  return Math.max(0, 100 - churnRate);
}

/**
 * Break-even members = total fixed costs / ARPM
 */
export function calculateBreakEvenMembers(
  totalFixedCosts: number,
  arpm: number
): number {
  if (arpm === 0) return 0;
  return Math.ceil(totalFixedCosts / arpm);
}

/**
 * Revenue per square meter = MRR / studio area
 */
export function calculateRevenuePerSqm(
  mrr: number,
  studioAreaSqm: number
): number {
  if (studioAreaSqm === 0) return 0;
  return mrr / studioAreaSqm;
}

/**
 * Determine KPI status color.
 * invertedLogic = true for metrics where LOWER is better (churn, CAC)
 */
export function getKPIStatus(
  current: number,
  target: number,
  invertedLogic = false
): KPIStatus {
  if (target === 0) return 'good';

  if (invertedLogic) {
    if (current <= target) return 'good';
    if (current <= target * 1.1) return 'warning';
    return 'bad';
  }

  const ratio = current / target;
  if (ratio >= 1) return 'good';
  if (ratio >= 0.9) return 'warning';
  return 'bad';
}

/**
 * Format number as Israeli currency: ₪12,500
 */
export function formatCurrency(amount: number): string {
  if (isNaN(amount) || !isFinite(amount)) return '₪0';
  const abs = Math.abs(Math.round(amount));
  const formatted = abs.toLocaleString('en-US');
  return amount < 0 ? `-₪${formatted}` : `₪${formatted}`;
}

/**
 * Format percentage: 85.5%
 */
export function formatPercent(value: number, decimals = 1): string {
  if (isNaN(value) || !isFinite(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format ratio: 3.2x
 */
export function formatRatio(value: number): string {
  if (isNaN(value) || !isFinite(value) || value === 0) return '0x';
  return `${value.toFixed(1)}x`;
}

// types/kpi.ts — KPI Financial Dashboard types

// --- Database row types ---

export interface MonthlyExpense {
  id: string;
  month: number;
  year: number;
  category: string;
  description: string | null;
  amount: number;
  is_fixed: boolean;
  vendor_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketingSpend {
  id: string;
  month: number;
  year: number;
  channel: string;
  amount: number;
  leads_generated: number;
  trials_booked: number;
  conversions: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudioConfig {
  id: string;
  key: string;
  value: string;
  label: string | null;
  updated_at: string;
}

export interface MemberChurnLog {
  id: string;
  user_id: string | null;
  subscription_id: string | null;
  churn_date: string;
  reason: string | null;
  price_at_churn: number | null;
  plan_name: string | null;
  months_subscribed: number;
  created_at: string;
}

// --- Computed KPI types ---

export interface FinancialKPIs {
  mrr: number;
  activeMembers: number;
  arpm: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  totalFixedCosts: number;
  totalVariableCosts: number;
}

export interface MonthOverMonth {
  incomeChange: number;
  expenseChange: number;
  profitChange: number;
}

export interface RetentionKPIs {
  churnRate: number;
  retentionRate: number;
  churnedThisMonth: number;
  activeAtStartOfMonth: number;
  avgTenureMonths: number;
  ltv: number;
  cac: number;
  ltvCacRatio: number;
  newMembersThisMonth: number;
}

export interface BreakEvenKPIs {
  breakEvenMembers: number;
  breakEvenRevenue: number;
  currentMembers: number;
  currentMRR: number;
  progressPercent: number;
  revenuePerSqm: number;
  studioAreaSqm: number;
}

export interface KPIDashboardData {
  financial: FinancialKPIs;
  retention: RetentionKPIs;
  breakEven: BreakEvenKPIs;
  targets: {
    targetMRR: number;
    targetMembers: number;
  };
  config: Record<string, string>;
  expensesByCategory: Record<string, number>;
  incomeByPaymentType: Record<string, number>;
  monthOverMonth: MonthOverMonth;
  anomalies: string[];
  memberSparkline: number[];
}

// --- UI helper types ---

export type KPIStatus = 'good' | 'warning' | 'bad';

// --- Form types for modals ---

export interface ExpenseFormData {
  category: string;
  description: string;
  amount: string;
  is_fixed: boolean;
  vendor_name: string;
  notes: string;
}

export interface MarketingFormData {
  channel: string;
  amount: string;
  leads_generated: string;
  trials_booked: string;
  conversions: string;
  notes: string;
}

export interface StudioConfigFormData {
  studio_area_sqm: string;
  target_mrr: string;
  target_members: string;
  current_rent: string;
}

// --- Constants ---

export const EXPENSE_CATEGORIES = [
  'שכירות',
  'חשמל',
  'מים',
  'ארנונה',
  'ביטוח',
  'שכר עובדים',
  'ציוד',
  'תחזוקה',
  'שיווק',
  'רישיונות',
  'אחר',
] as const;

export const MARKETING_CHANNELS = [
  'אינסטגרם',
  'פייסבוק',
  'גוגל',
  'TikTok',
  'הפניות',
  'שלטים/פליירים',
  'אחר',
] as const;

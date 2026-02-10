// ============================================
// useGreenInvoice Hook
// ============================================
// React Native hook for Green Invoice integration
// Uses secure Edge Functions to interact with Green Invoice API

import { useState } from 'react';
import { supabase } from '@/constants/supabase';
import type {
  CreateInvoiceRequest,
  CreateInvoiceResponse,
  SyncFinancialDataResponse,
  Invoice,
  Expense,
  Product,
  FinancialStats,
  InvoiceFilters,
  ExpenseFilters,
  DashboardSummary,
  PaymentType,
} from '@/types/green-invoice';

export function useGreenInvoice() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new invoice via Edge Function
   * @param request Invoice creation data
   * @returns Created invoice with PDF URL
   */
  const createInvoice = async (
    request: CreateInvoiceRequest
  ): Promise<CreateInvoiceResponse> => {
    setLoading(true);
    setError(null);

    try {
      console.log('[useGreenInvoice] Creating invoice with request:', JSON.stringify(request, null, 2));

      // Get the current session to pass auth token to Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session. Please log in again.');
      }

      const { data, error: fnError } = await supabase.functions.invoke<CreateInvoiceResponse>(
        'create-invoice',
        {
          body: request,
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      // Log raw response for debugging
      console.log('[useGreenInvoice] Raw response:', { data, fnError });

      if (fnError) {
        console.error('[useGreenInvoice] Edge function error:', fnError);
        
        // Try to extract error details from the data even if fnError exists
        // Sometimes the Edge Function returns error details in the response body
        if (data && !data.success) {
          const errorMsg = data.error || 'Edge Function failed';
          const errorDetails = data.details ? `\n\nDetails: ${JSON.stringify(data.details, null, 2)}` : '';
          const apiError = data.apiError ? `\n\nAPI Error: ${JSON.stringify(data.apiError, null, 2)}` : '';
          throw new Error(`${errorMsg}${errorDetails}${apiError}`);
        }
        
        // Otherwise use the generic error
        const errorDetails = fnError.message || fnError.toString();
        throw new Error(`Edge Function Error: ${errorDetails}`);
      }

      if (!data) {
        throw new Error('No data returned from Edge Function');
      }

      if (!data.success) {
        // Extract detailed error from the response
        const errorMsg = data.error || 'Failed to create invoice';
        const errorDetails = data.details ? `\n\nDetails: ${JSON.stringify(data.details, null, 2)}` : '';
        const apiError = data.apiError ? `\n\nAPI Error: ${JSON.stringify(data.apiError, null, 2)}` : '';
        throw new Error(`${errorMsg}${errorDetails}${apiError}`);
      }

      console.log('[useGreenInvoice] Invoice created successfully:', data.invoice?.id);
      return data;
    } catch (err: any) {
      console.error('[useGreenInvoice] Error in createInvoice:', err);
      const errorMsg = err.message || 'Failed to create invoice';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sync all financial data from Green Invoice
   * Fetches invoices and expenses and saves to Supabase
   * @returns Sync summary with totals
   */
  const syncFinancialData = async (): Promise<SyncFinancialDataResponse> => {
    setLoading(true);
    setError(null);

    try {
      // Get the current session to pass auth token to Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session. Please log in again.');
      }

      const { data, error: fnError } = await supabase.functions.invoke<SyncFinancialDataResponse>(
        'sync-financial-data',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (fnError) {
        console.error('[useGreenInvoice] Sync error:', fnError);
        throw fnError;
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to sync data');
      }

      return data;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to sync financial data';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get invoices from Supabase database
   * @param filters Optional filters for querying
   * @returns List of invoices
   */
  const getInvoices = async (filters?: InvoiceFilters): Promise<Invoice[]> => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status && filters.status.length > 0) {
        query = query.in('payment_status', filters.status);
      }

      if (filters?.paymentType && filters.paymentType.length > 0) {
        query = query.in('payment_type', filters.paymentType);
      }

      if (filters?.clientId) {
        query = query.eq('client_id', filters.clientId);
      }

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      if (filters?.minAmount) {
        query = query.gte('total_amount', filters.minAmount);
      }

      if (filters?.maxAmount) {
        query = query.lte('total_amount', filters.maxAmount);
      }

      const { data, error: dbError } = await query;

      if (dbError) throw dbError;

      return (data as Invoice[]) || [];
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch invoices';
      setError(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get expenses from Supabase database
   * @param filters Optional filters for querying
   * @returns List of expenses
   */
  const getExpenses = async (filters?: ExpenseFilters): Promise<Expense[]> => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      // Apply filters
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters?.category && filters.category.length > 0) {
        query = query.in('category', filters.category);
      }

      if (filters?.vendorName) {
        query = query.ilike('vendor_name', `%${filters.vendorName}%`);
      }

      if (filters?.dateFrom) {
        query = query.gte('expense_date', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('expense_date', filters.dateTo);
      }

      if (filters?.minAmount) {
        query = query.gte('total_amount', filters.minAmount);
      }

      if (filters?.maxAmount) {
        query = query.lte('total_amount', filters.maxAmount);
      }

      const { data, error: dbError } = await query;

      if (dbError) throw dbError;

      return (data as Expense[]) || [];
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch expenses';
      setError(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get products from catalog
   * @param activeOnly Only get active products
   * @returns List of products
   */
  const getProducts = async (activeOnly = true): Promise<Product[]> => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase.from('product_catalog').select('*').order('name');

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error: dbError } = await query;

      if (dbError) throw dbError;

      return (data as Product[]) || [];
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch products';
      setError(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get financial stats for a specific period
   * @param year Year (default: current year)
   * @param month Month (1-12, default: current month)
   * @returns Financial stats
   */
  const getFinancialStats = async (
    year?: number,
    month?: number
  ): Promise<FinancialStats | null> => {
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const targetYear = year || now.getFullYear();
      const targetMonth = month || now.getMonth() + 1;

      const { data, error: dbError } = await supabase
        .from('financial_stats_cache')
        .select('*')
        .eq('year', targetYear)
        .eq('month', targetMonth)
        .single();

      if (dbError && dbError.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is okay
        throw dbError;
      }

      return data as FinancialStats | null;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch financial stats';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get dashboard summary with all key metrics
   * @param month Optional month (1-12, defaults to current month)
   * @param year Optional year (defaults to current year)
   * @returns Complete dashboard summary
   */
  const getDashboardSummary = async (
    month?: number,
    year?: number
  ): Promise<DashboardSummary | null> => {
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const currentYear = year || now.getFullYear();
      const currentMonth = month || now.getMonth() + 1;

      // Get current month stats
      const currentStats = await getFinancialStats(currentYear, currentMonth);

      // Get last month stats
      const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      const lastMonthStats = await getFinancialStats(lastMonthYear, lastMonth);

      // Get YTD stats (sum of all months this year)
      const { data: ytdData } = await supabase
        .from('financial_stats_cache')
        .select('total_income, total_expenses, net_profit')
        .eq('year', currentYear);

      const ytdIncome = ytdData?.reduce((sum, s) => sum + (s.total_income || 0), 0) || 0;
      const ytdExpenses = ytdData?.reduce((sum, s) => sum + (s.total_expenses || 0), 0) || 0;
      const ytdProfit = ytdIncome - ytdExpenses;

      // Calculate trends
      const incomeChange = lastMonthStats?.total_income
        ? ((currentStats?.total_income || 0) - lastMonthStats.total_income) / lastMonthStats.total_income * 100
        : 0;

      const profitChange = lastMonthStats?.net_profit
        ? ((currentStats?.net_profit || 0) - lastMonthStats.net_profit) / lastMonthStats.net_profit * 100
        : 0;

      // Get top clients
      const { data: topClientsData } = await supabase
        .from('invoices')
        .select('client_id, profiles(full_name), total_amount')
        .eq('payment_status', 'paid')
        .order('total_amount', { ascending: false })
        .limit(5);

      const topClients = topClientsData?.map(invoice => ({
        clientId: invoice.client_id,
        clientName: (invoice as any).profiles?.full_name || 'Unknown',
        totalSpent: invoice.total_amount,
        invoiceCount: 1, // This would need aggregation in real implementation
      })) || [];

      // Build payment breakdown from current stats
      const paymentBreakdown = currentStats?.income_by_payment_type
        ? Object.entries(currentStats.income_by_payment_type).map(([type, amount]) => ({
            type: parseInt(type) as PaymentType,
            label: getPaymentTypeLabel(parseInt(type)),
            amount: amount as number,
            count: 0, // Would need separate query
            percentage: ((amount as number) / (currentStats.total_income || 1)) * 100,
          }))
        : [];

      // Build expense breakdown
      const expenseBreakdown = currentStats?.expenses_by_category
        ? Object.entries(currentStats.expenses_by_category).map(([category, amount]) => ({
            category,
            amount: amount as number,
            count: 0,
            percentage: ((amount as number) / (currentStats.total_expenses || 1)) * 100,
          }))
        : [];

      const summary: DashboardSummary = {
        currentMonth: {
          income: currentStats?.total_income || 0,
          expenses: currentStats?.total_expenses || 0,
          profit: currentStats?.net_profit || 0,
          invoiceCount: currentStats?.total_invoices || 0,
        },
        lastMonth: {
          income: lastMonthStats?.total_income || 0,
          expenses: lastMonthStats?.total_expenses || 0,
          profit: lastMonthStats?.net_profit || 0,
        },
        ytd: {
          income: ytdIncome,
          expenses: ytdExpenses,
          profit: ytdProfit,
        },
        incomeChange,
        profitChange,
        topClients,
        paymentBreakdown,
        expenseBreakdown,
        lastSyncedAt: currentStats?.last_synced_at || new Date().toISOString(),
      };

      return summary;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch dashboard summary';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Mark invoice as paid
   * @param invoiceId Invoice ID
   */
  const markInvoiceAsPaid = async (invoiceId: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (updateError) throw updateError;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to mark invoice as paid';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancel an invoice
   * @param invoiceId Invoice ID
   */
  const cancelInvoice = async (invoiceId: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          payment_status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (updateError) throw updateError;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to cancel invoice';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return {
    // State
    loading,
    error,

    // Invoice operations
    createInvoice,
    getInvoices,
    markInvoiceAsPaid,
    cancelInvoice,

    // Data sync
    syncFinancialData,

    // Data retrieval
    getExpenses,
    getProducts,
    getFinancialStats,
    getDashboardSummary,
    createPaymentForm: async (
      invoiceId: string,
      amount: number,
      description: string,
      clientName?: string,
      clientEmail?: string,
      cartItems?: any[]
    ) => {
      setLoading(true);
      setError(null);

      try {
        console.log('[useGreenInvoice] Creating payment form...');

        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          throw new Error('No active session');
        }

        const { data, error: fnError } = await supabase.functions.invoke(
          'create-payment-form',
          {
            body: { invoiceId, amount, description, clientName, clientEmail, cartItems },
            headers: { Authorization: `Bearer ${session.access_token}` },
          }
        );

        console.log('[useGreenInvoice] Response:', { data, fnError });

        // Check if Edge Function returned an error response
        if (fnError) {
          console.error('[useGreenInvoice] Function invoke error:', fnError);

          // Try to extract detailed error from response
          if (data && !data.success) {
            const errorDetails = data.details ? `\n\nDetailed Error:\n${JSON.stringify(data.details, null, 2)}` : '';
            throw new Error(`${data.error || 'Payment form creation failed'}${errorDetails}`);
          }

          throw new Error(fnError.message || 'Edge Function returned a non-2xx status code.');
        }

        if (!data?.success) {
          const errorDetails = data?.details ? `\n\nDetailed Error:\n${JSON.stringify(data.details, null, 2)}` : '';
          throw new Error(`${data?.error || 'Failed to create payment form'}${errorDetails}`);
        }

        return { formUrl: data.formUrl, paymentId: data.paymentId };
      } catch (err: any) {
        console.error('[useGreenInvoice] Payment form error:', err);
        const errorMsg = err.message || 'Failed to create payment form';
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
  };
}

/**
 * Helper function to get payment type label
 */
function getPaymentTypeLabel(type: number): string {
  const labels: Record<number, string> = {
    1: 'מזומן',
    2: 'אשראי',
    4: 'העברה בנקאית',
    6: 'Bit',
    11: 'הוראת קבע',
  };
  return labels[type] || 'אחר';
}

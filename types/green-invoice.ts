// ============================================
// GREEN INVOICE TYPE DEFINITIONS
// ============================================

/**
 * Payment Types in Green Invoice
 * @see https://app.greeninvoice.co.il/documents
 */
export enum PaymentType {
  CASH = 1,           // מזומן
  CREDIT_CARD = 2,    // אשראי
  BANK_TRANSFER = 4,  // העברה בנקאית
  BIT = 6,            // Bit / אפליקציה
  STANDING_ORDER = 11 // הוראת קבע
}

/**
 * Document Types in Green Invoice
 */
export enum DocumentType {
  INVOICE_RECEIPT = 320,  // חשבונית מס/קבלה
  INVOICE = 305,          // חשבונית
  RECEIPT = 400,          // קבלה
  QUOTE = 100,            // הצעת מחיר
  DELIVERY_NOTE = 200,    // תעודת משלוח
  CREDIT_INVOICE = 330,   // חשבונית זיכוי
  PROFORMA = 10          // פרופורמה
}

/**
 * Invoice Status
 */
export type InvoiceStatus = 'pending' | 'paid' | 'cancelled';

/**
 * Expense Status
 */
export type ExpenseStatus = 'pending' | 'approved' | 'rejected';

/**
 * Product Types
 */
export type ProductType = 'subscription' | 'card' | 'premium' | 'personal_training' | 'merchandise';

// ============================================
// DATABASE MODELS
// ============================================

/**
 * Invoice record from database
 */
export interface Invoice {
  id: string;
  client_id: string | null;

  // Green Invoice data
  green_invoice_id: string;
  green_invoice_number: number | null;
  green_document_type: DocumentType;

  // Financial details
  amount: number;
  vat_amount: number;
  total_amount: number;

  // Payment
  payment_type: PaymentType;
  payment_status: InvoiceStatus;

  // Items
  items: InvoiceItem[];

  // Metadata
  description: string | null;
  remarks: string | null;
  pdf_url: string | null;

  // Timestamps
  created_at: string;
  sent_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  updated_at: string;
}

/**
 * Invoice item structure (stored in JSONB)
 */
export interface InvoiceItem {
  sku: string;
  quantity: number;
  price: number;
  description?: string;
  catalogNum?: string;
  currency?: string;
  vatType?: number;
}

/**
 * Expense record from database
 */
export interface Expense {
  id: string;
  green_expense_id: string;

  // Financial
  amount: number;
  vat_amount: number;
  total_amount: number;

  // Categorization
  category: string;
  vendor_name: string | null;

  // Metadata
  description: string;
  receipt_url: string | null;
  notes: string | null;
  status: ExpenseStatus;

  // Timestamps
  expense_date: string;
  created_at: string;
  updated_at: string;
}

/**
 * Product from catalog
 */
export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  base_price: number;
  vat_rate: number;
  type: ProductType;
  default_payment_type: PaymentType;
  is_active: boolean;
  green_invoice_item_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Financial stats cache
 */
export interface FinancialStats {
  id: string;
  year: number;
  month: number;

  // Income
  total_income: number;
  total_invoices: number;
  avg_invoice_amount: number;

  // Expenses
  total_expenses: number;
  total_expense_records: number;

  // Net
  net_profit: number;

  // Breakdowns
  income_by_payment_type: Record<string, number>;
  expenses_by_category: Record<string, number>;

  // Timestamps
  last_synced_at: string;
  created_at: string;
}

// ============================================
// GREEN INVOICE API TYPES
// ============================================

/**
 * Green Invoice Client object
 */
export interface GreenInvoiceClient {
  id?: string;
  name: string;
  emails: string[];
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  zip?: string;
  taxId?: string;
  add?: boolean; // Auto-create if doesn't exist
}

/**
 * Green Invoice Income Line Item
 */
export interface GreenInvoiceIncomeItem {
  catalogNum: string;
  description: string;
  quantity: number;
  price: number;
  currency: 'ILS' | 'USD' | 'EUR';
  vatType: 0 | 1; // 0 = ללא מע"מ, 1 = כולל מע"מ
  discount?: number;
}

/**
 * Green Invoice Payment object
 */
export interface GreenInvoicePayment {
  paymentType: PaymentType;
  price: number;
  currency: 'ILS' | 'USD' | 'EUR';
  dealType?: number; // For credit cards: 1=רגיל, 2=תשלומים
  numPayments?: number; // For credit cards in installments
  cardNum?: string; // Last 4 digits
}

/**
 * Green Invoice Document Request
 */
export interface GreenInvoiceDocumentRequest {
  description: string;
  type: DocumentType;
  lang: 'he' | 'en';
  currency: 'ILS' | 'USD' | 'EUR';
  client: GreenInvoiceClient;
  income: GreenInvoiceIncomeItem[];
  payment: GreenInvoicePayment[];
  signed?: boolean; // Send email with PDF
  rounding?: boolean;
  remarks?: string;
  footer?: string;
  emailContent?: {
    subject?: string;
    body?: string;
  };
}

/**
 * Green Invoice Document Response
 */
export interface GreenInvoiceDocumentResponse {
  id: string;
  number: number;
  type: DocumentType;
  url: {
    he?: string;
    en?: string;
    origin?: string;
  };
  amount: number;
  amountPaid: number;
  currency: string;
  created: string;
  client: {
    id: string;
    name: string;
    emails: string[];
  };
}

/**
 * Green Invoice Error Response
 */
export interface GreenInvoiceError {
  errorCode: number;
  errorMessage: string;
}

/**
 * Green Invoice Authentication Response
 */
export interface GreenInvoiceAuthResponse {
  token: string;
}

// ============================================
// EDGE FUNCTION REQUEST/RESPONSE TYPES
// ============================================

/**
 * Request to create invoice via Edge Function
 */
export interface CreateInvoiceRequest {
  clientId: string;
  items: Array<{
    sku: string;
    quantity: number;
    price: number;
    customDescription?: string;
  }>;
  paymentType: PaymentType;
  remarks?: string;
  sendEmail?: boolean;
}

/**
 * Response from create invoice Edge Function
 */
export interface CreateInvoiceResponse {
  success: boolean;
  invoice?: Invoice;
  pdfUrl?: string;
  error?: string;
  details?: string | any;
  apiError?: any; // Raw error from Green Invoice API
}

/**
 * Response from sync financial data Edge Function
 */
export interface SyncFinancialDataResponse {
  success: boolean;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    documentCount: number;
    expenseCount: number;
  };
  documents: any[];
  expenses: any[];
  error?: string;
}

/**
 * Response from auth Edge Function
 */
export interface AuthResponse {
  token?: string;
  error?: string;
}

// ============================================
// DASHBOARD / ANALYTICS TYPES
// ============================================

/**
 * Revenue trend data point
 */
export interface RevenueTrendData {
  month: string;
  income: number;
  expenses: number;
  profit: number;
}

/**
 * Payment type breakdown
 */
export interface PaymentTypeBreakdown {
  type: PaymentType;
  label: string;
  amount: number;
  count: number;
  percentage: number;
}

/**
 * Expense category breakdown
 */
export interface ExpenseCategoryBreakdown {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

/**
 * Dashboard summary stats
 */
export interface DashboardSummary {
  // Current month
  currentMonth: {
    income: number;
    expenses: number;
    profit: number;
    invoiceCount: number;
  };

  // Last month
  lastMonth: {
    income: number;
    expenses: number;
    profit: number;
  };

  // Year to date
  ytd: {
    income: number;
    expenses: number;
    profit: number;
  };

  // Trends
  incomeChange: number; // Percentage change vs last month
  profitChange: number;

  // Top clients
  topClients: Array<{
    clientId: string;
    clientName: string;
    totalSpent: number;
    invoiceCount: number;
  }>;

  // Payment breakdown
  paymentBreakdown: PaymentTypeBreakdown[];

  // Expense breakdown
  expenseBreakdown: ExpenseCategoryBreakdown[];

  // Last sync
  lastSyncedAt: string;
}

// ============================================
// FORM TYPES
// ============================================

/**
 * Form data for creating an invoice
 */
export interface InvoiceFormData {
  client: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  items: Array<{
    productId: string;
    sku: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  paymentType: PaymentType;
  remarks?: string;
  sendEmail: boolean;
}

/**
 * Filter options for invoices list
 */
export interface InvoiceFilters {
  status?: InvoiceStatus[];
  paymentType?: PaymentType[];
  dateFrom?: string;
  dateTo?: string;
  clientId?: string;
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Filter options for expenses list
 */
export interface ExpenseFilters {
  status?: ExpenseStatus[];
  category?: string[];
  dateFrom?: string;
  dateTo?: string;
  vendorName?: string;
  minAmount?: number;
  maxAmount?: number;
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Helper to get payment type label in Hebrew
 */
export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  [PaymentType.CASH]: 'מזומן',
  [PaymentType.CREDIT_CARD]: 'אשראי',
  [PaymentType.BANK_TRANSFER]: 'העברה בנקאית',
  [PaymentType.BIT]: 'Bit / אפליקציה',
  [PaymentType.STANDING_ORDER]: 'הוראת קבע'
};

/**
 * Helper to get invoice status label in Hebrew
 */
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  pending: 'ממתין לתשלום',
  paid: 'שולם',
  cancelled: 'בוטל'
};

/**
 * Helper to get expense status label in Hebrew
 */
export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  pending: 'ממתין לאישור',
  approved: 'אושר',
  rejected: 'נדחה'
};

/**
 * Common expense categories
 */
export const EXPENSE_CATEGORIES = [
  'ציוד',
  'שכר דירה',
  'שיווק ופרסום',
  'שכר עובדים',
  'חשמל ומים',
  'תחזוקה',
  'ביטוח',
  'רישיונות ואגרות',
  'אחר'
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

-- ============================================
-- GREEN INVOICE INTEGRATION - COMPLETE SCHEMA
-- ============================================
-- This migration creates all tables needed for Green Invoice integration
-- Run this in your Supabase SQL Editor

-- ============================================
-- TABLE 1: INVOICES
-- ============================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Green Invoice data
  green_invoice_id TEXT UNIQUE NOT NULL,
  green_invoice_number INTEGER,
  green_document_type INTEGER NOT NULL, -- 320 = חשבונית מס/קבלה

  -- Financial details
  amount DECIMAL(10,2) NOT NULL, -- סכום לפני מע"ם
  vat_amount DECIMAL(10,2) NOT NULL, -- 18% מע"ם
  total_amount DECIMAL(10,2) NOT NULL, -- סה"כ כולל מע"ם

  -- Payment
  payment_type INTEGER NOT NULL CHECK (payment_type IN (1,2,4,6,11)),
  -- 1=מזומן, 2=אשראי, 4=העברה, 6=Bit, 11=הוראת קבע
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),

  -- Product/Service details (JSONB for flexibility)
  items JSONB NOT NULL,
  -- Example: [{"sku": "SUB-001", "quantity": 1, "price": 500, "description": "מנוי חודשי"}]

  -- Metadata
  description TEXT,
  remarks TEXT,
  pdf_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_green_id ON invoices(green_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_type ON invoices(payment_type);

-- ============================================
-- TABLE 2: EXPENSES
-- ============================================

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Green Invoice data
  green_expense_id TEXT UNIQUE NOT NULL,

  -- Financial details
  amount DECIMAL(10,2) NOT NULL,
  vat_amount DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,

  -- Categorization
  category TEXT NOT NULL, -- "ציוד", "שכר דירה", "שיווק", "שכר עובדים", etc.
  vendor_name TEXT,

  -- Metadata
  description TEXT NOT NULL,
  receipt_url TEXT,
  notes TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Timestamps
  expense_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_green_id ON expenses(green_expense_id);

-- ============================================
-- TABLE 3: PRODUCT CATALOG
-- ============================================

CREATE TABLE IF NOT EXISTS product_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Product details
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Pricing
  base_price DECIMAL(10,2) NOT NULL,
  vat_rate DECIMAL(5,2) DEFAULT 18.00,

  -- Product type
  type TEXT NOT NULL CHECK (type IN ('subscription', 'card', 'premium', 'personal_training', 'merchandise')),
  default_payment_type INTEGER DEFAULT 1 CHECK (default_payment_type IN (1,2,4,6,11)),

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  green_invoice_item_id TEXT, -- If synced with Green Invoice items
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_product_catalog_sku ON product_catalog(sku);
CREATE INDEX IF NOT EXISTS idx_product_catalog_active ON product_catalog(is_active) WHERE is_active = true;

-- Seed data for Reel Rep Training products
INSERT INTO product_catalog (sku, name, description, base_price, type, default_payment_type) VALUES
  ('SUB-MONTHLY', 'מנוי חודשי', 'מנוי חודשי ללא הגבלה', 0, 'subscription', 11),
  ('SUB-QUARTERLY', 'מנוי רבעוני', 'מנוי ל-3 חודשים', 0, 'subscription', 2),
  ('SUB-ANNUAL', 'מנוי שנתי', 'מנוי שנתי עם הטבה', 0, 'subscription', 2),
  ('CARD-10', 'כרטיסייה 10 כניסות', 'כרטיסייה ל-10 אימונים', 0, 'card', 1),
  ('CARD-20', 'כרטיסייה 20 כניסות', 'כרטיסייה ל-20 אימונים', 0, 'card', 1),
  ('PREMIUM-PACKAGE', 'חבילת פרימיום', 'אימונים אישיים + תכנית תזונה', 0, 'premium', 2),
  ('PT-SINGLE', 'אימון אישי בודד', 'אימון אישי חד פעמי', 0, 'personal_training', 1)
ON CONFLICT (sku) DO NOTHING;

-- ============================================
-- TABLE 4: FINANCIAL STATS CACHE
-- ============================================
-- For faster dashboard loading

CREATE TABLE IF NOT EXISTS financial_stats_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Period
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,

  -- Income stats
  total_income DECIMAL(10,2) DEFAULT 0,
  total_invoices INTEGER DEFAULT 0,
  avg_invoice_amount DECIMAL(10,2) DEFAULT 0,

  -- Expense stats
  total_expenses DECIMAL(10,2) DEFAULT 0,
  total_expense_records INTEGER DEFAULT 0,

  -- Net
  net_profit DECIMAL(10,2) DEFAULT 0,

  -- Payment breakdown (JSONB for flexibility)
  income_by_payment_type JSONB DEFAULT '{}'::jsonb,
  -- Example: {"1": 5000, "2": 10000, "11": 8000}

  expenses_by_category JSONB DEFAULT '{}'::jsonb,
  -- Example: {"ציוד": 2000, "שכר דירה": 5000}

  -- Timestamps
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(year, month)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_stats_cache_period ON financial_stats_cache(year DESC, month DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_stats_cache ENABLE ROW LEVEL SECURITY;

-- INVOICES POLICIES
-- Admin only access
CREATE POLICY "Admin full access to invoices" ON invoices
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can view their own invoices
CREATE POLICY "Users can view their own invoices" ON invoices
  FOR SELECT
  USING (auth.uid() = client_id);

-- EXPENSES POLICIES
-- Admin only
CREATE POLICY "Admin full access to expenses" ON expenses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- PRODUCT CATALOG POLICIES
-- Everyone can view active products
CREATE POLICY "Anyone can view active products" ON product_catalog
  FOR SELECT
  USING (is_active = true);

-- Admin can manage products
CREATE POLICY "Admin can manage products" ON product_catalog
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- FINANCIAL STATS CACHE POLICIES
-- Admin only
CREATE POLICY "Admin full access to stats cache" ON financial_stats_cache
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update stats cache
CREATE OR REPLACE FUNCTION refresh_financial_stats(
  p_year INTEGER,
  p_month INTEGER
) RETURNS void AS $$
BEGIN
  -- Calculate stats for the given month
  INSERT INTO financial_stats_cache (year, month, total_income, total_invoices, total_expenses, net_profit, last_synced_at)
  SELECT
    p_year,
    p_month,
    COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as total_income,
    COUNT(*) FILTER (WHERE payment_status = 'paid') as total_invoices,
    (SELECT COALESCE(SUM(total_amount), 0) FROM expenses
     WHERE EXTRACT(YEAR FROM expense_date) = p_year
     AND EXTRACT(MONTH FROM expense_date) = p_month) as total_expenses,
    COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) -
    (SELECT COALESCE(SUM(total_amount), 0) FROM expenses
     WHERE EXTRACT(YEAR FROM expense_date) = p_year
     AND EXTRACT(MONTH FROM expense_date) = p_month) as net_profit,
    NOW()
  FROM invoices
  WHERE EXTRACT(YEAR FROM created_at) = p_year
    AND EXTRACT(MONTH FROM created_at) = p_month
  ON CONFLICT (year, month)
  DO UPDATE SET
    total_income = EXCLUDED.total_income,
    total_invoices = EXCLUDED.total_invoices,
    total_expenses = EXCLUDED.total_expenses,
    net_profit = EXCLUDED.net_profit,
    last_synced_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON product_catalog
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- GRANTS
-- ============================================

-- Grant permissions to authenticated users
GRANT SELECT ON invoices TO authenticated;
GRANT SELECT ON product_catalog TO authenticated;

-- Grant full permissions to service role (for Edge Functions)
GRANT ALL ON invoices TO service_role;
GRANT ALL ON expenses TO service_role;
GRANT ALL ON product_catalog TO service_role;
GRANT ALL ON financial_stats_cache TO service_role;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Green Invoice Integration Schema Created!';
  RAISE NOTICE '📊 Tables created: invoices, expenses, product_catalog, financial_stats_cache';
  RAISE NOTICE '🔒 RLS policies enabled for admin-only access';
  RAISE NOTICE '🎯 Sample products inserted into catalog';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next steps:';
  RAISE NOTICE '1. Deploy the Edge Functions';
  RAISE NOTICE '2. Set GREEN_INVOICE_ID and GREEN_INVOICE_SECRET in Supabase secrets';
  RAISE NOTICE '3. Test with a small invoice (₪1)';
  RAISE NOTICE '4. Update product prices in product_catalog table';
END $$;

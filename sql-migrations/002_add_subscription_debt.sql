-- Migration: Add debt support to user_subscriptions
-- Purpose: Track subscriptions purchased with "mark as debt" payment method

ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id),
  ADD COLUMN IF NOT EXISTS has_debt BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS debt_amount DECIMAL(10,2);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_has_debt ON user_subscriptions(has_debt) WHERE has_debt = true;
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_invoice ON user_subscriptions(invoice_id);

-- Add comments
COMMENT ON COLUMN user_subscriptions.invoice_id IS 'Link to originating invoice';
COMMENT ON COLUMN user_subscriptions.has_debt IS 'True if user selected "Mark as Debt" payment option';
COMMENT ON COLUMN user_subscriptions.debt_amount IS 'Outstanding debt amount for this subscription';

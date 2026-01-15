-- Migration: Add debt support to user_tickets
-- Purpose: Track tickets purchased with "mark as debt" payment method

ALTER TABLE user_tickets
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id),
  ADD COLUMN IF NOT EXISTS has_debt BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS debt_amount DECIMAL(10,2);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_tickets_has_debt ON user_tickets(has_debt) WHERE has_debt = true;
CREATE INDEX IF NOT EXISTS idx_user_tickets_invoice ON user_tickets(invoice_id);

-- Add comments
COMMENT ON COLUMN user_tickets.invoice_id IS 'Link to originating invoice';
COMMENT ON COLUMN user_tickets.has_debt IS 'True if user selected "Mark as Debt" payment option';
COMMENT ON COLUMN user_tickets.debt_amount IS 'Outstanding debt amount for this ticket';

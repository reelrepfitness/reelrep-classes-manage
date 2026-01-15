-- Migration: Add cart linkage to invoices table
-- Purpose: Store complete cart data in invoices for subscription/ticket creation

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS cart_items JSONB,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES user_subscriptions(id),
  ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES user_tickets(id),
  ADD COLUMN IF NOT EXISTS debt_status TEXT DEFAULT 'none' CHECK (debt_status IN ('none', 'pending', 'active')),
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_debt_status ON invoices(debt_status) WHERE debt_status != 'none';

-- Add comments for documentation
COMMENT ON COLUMN invoices.cart_items IS 'JSONB array of purchased items with plan_id, type, quantity, price, duration';
COMMENT ON COLUMN invoices.subscription_id IS 'Link to created user_subscription (if applicable)';
COMMENT ON COLUMN invoices.ticket_id IS 'Link to created user_ticket (if applicable)';
COMMENT ON COLUMN invoices.debt_status IS 'Tracks debt payments: none=normal, pending=awaiting approval, active=user has active sub with debt';

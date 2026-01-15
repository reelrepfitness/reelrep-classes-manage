-- Migration: Create pending_payment_approvals table
-- Purpose: Track manual payment approvals for Bit/Cash/Debt payments

CREATE TABLE IF NOT EXISTS pending_payment_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('bit', 'bank_transfer', 'cash', 'debt')),
  amount DECIMAL(10,2) NOT NULL,
  cart_items JSONB NOT NULL,
  user_notes TEXT,
  admin_notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pending_approvals_status ON pending_payment_approvals(status);
CREATE INDEX IF NOT EXISTS idx_pending_approvals_user ON pending_payment_approvals(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_approvals_payment_method ON pending_payment_approvals(payment_method);

-- Enable RLS
ALTER TABLE pending_payment_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins manage all approvals" ON pending_payment_approvals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id::uuid = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Users view own approvals" ON pending_payment_approvals
  FOR SELECT USING (user_id = auth.uid());

-- Add comments
COMMENT ON TABLE pending_payment_approvals IS 'Stores manual payment approval requests for Bit/Bank/Cash/Debt payments';
COMMENT ON COLUMN pending_payment_approvals.payment_method IS 'Payment method: bit, bank_transfer, cash, or debt';
COMMENT ON COLUMN pending_payment_approvals.cart_items IS 'Copy of cart items from invoice';
COMMENT ON COLUMN pending_payment_approvals.status IS 'Approval status: pending, approved, or rejected';

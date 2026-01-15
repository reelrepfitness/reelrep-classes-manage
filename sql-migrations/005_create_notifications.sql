-- Migration: Create purchase_notifications table
-- Purpose: Store in-app notifications for purchases

CREATE TABLE IF NOT EXISTS purchase_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  invoice_id UUID REFERENCES invoices(id),
  notification_type TEXT NOT NULL CHECK (notification_type IN ('purchase_success', 'purchase_failed', 'payment_pending', 'debt_activated')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  push_sent BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_purchase_notifications_user ON purchase_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_notifications_unread ON purchase_notifications(user_id, is_read) WHERE is_read = false;

-- Enable RLS
ALTER TABLE purchase_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own notifications
CREATE POLICY "Users view own notifications" ON purchase_notifications
  FOR SELECT USING (user_id = auth.uid());

-- RLS Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users update own notifications" ON purchase_notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Add comments
COMMENT ON TABLE purchase_notifications IS 'In-app notifications for purchase events';
COMMENT ON COLUMN purchase_notifications.notification_type IS 'Type: purchase_success, purchase_failed, payment_pending, debt_activated';

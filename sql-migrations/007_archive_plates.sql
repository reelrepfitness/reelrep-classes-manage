-- Migration: Archive and remove plates system
-- Purpose: Complete removal of plate balance system

-- Step 1: Create archive table for existing balances
CREATE TABLE IF NOT EXISTS plate_balance_archive (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  balance INTEGER NOT NULL,
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Archive existing plate balances
INSERT INTO plate_balance_archive (user_id, balance)
SELECT id, plate_balance FROM profiles WHERE plate_balance > 0
ON CONFLICT DO NOTHING;

-- Step 3: Reset all balances to 0
UPDATE profiles SET plate_balance = 0 WHERE plate_balance > 0;

-- Step 4: Drop plates tables
DROP TABLE IF EXISTS plates_transactions CASCADE;
DROP TABLE IF EXISTS plates_discounts CASCADE;

-- Step 5: Remove plate_balance column (optional - can be done later after verification)
-- Uncomment this line after confirming no issues:
-- ALTER TABLE profiles DROP COLUMN IF EXISTS plate_balance;

-- Add comment
COMMENT ON TABLE plate_balance_archive IS 'Archived plate balances before system removal';

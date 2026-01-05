-- Add missing columns to user_subscriptions table for admin dashboard features

-- Add outstanding_balance for tracking cash payment debts
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS outstanding_balance numeric DEFAULT 0;

-- Add plan_status for tracking frozen/active/expired states
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS plan_status text DEFAULT 'active' CHECK (plan_status IN ('active', 'frozen', 'expired'));

-- Add freeze management columns
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS freeze_reason text;

ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS freeze_start_date timestamp with time zone;

ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS freeze_end_date timestamp with time zone;

-- Add sessions_remaining for ticket plans
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS sessions_remaining integer;

-- Add payment_method for tracking how users pay
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'online' CHECK (payment_method IN ('cash', 'card', 'online', 'bank_transfer'));

-- Create index for plan_status for faster queries
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_status 
ON public.user_subscriptions(plan_status);

-- Create index for outstanding_balance for debt queries
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_outstanding_balance 
ON public.user_subscriptions(outstanding_balance) 
WHERE outstanding_balance > 0;

COMMENT ON COLUMN public.user_subscriptions.outstanding_balance IS 'Amount owed by user for cash payments';
COMMENT ON COLUMN public.user_subscriptions.plan_status IS 'Current status of the subscription plan';
COMMENT ON COLUMN public.user_subscriptions.freeze_reason IS 'Reason for freezing the subscription (vacation, injury, etc)';
COMMENT ON COLUMN public.user_subscriptions.sessions_remaining IS 'Number of sessions remaining for ticket plans';
COMMENT ON COLUMN public.user_subscriptions.payment_method IS 'How the user pays for their subscription';

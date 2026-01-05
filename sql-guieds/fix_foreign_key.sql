-- Fix missing foreign key relationship between user_subscriptions and subscription_plans

-- First, add the foreign key constraint
ALTER TABLE public.user_subscriptions
ADD CONSTRAINT user_subscriptions_subscription_id_fkey 
FOREIGN KEY (subscription_id) 
REFERENCES public.subscription_plans(id) 
ON DELETE RESTRICT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_subscription_id 
ON public.user_subscriptions(subscription_id);

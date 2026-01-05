-- Migration to add missing payment columns
-- Run this in your Supabase SQL Editor

-- Add columns to user_subscriptions if they don't exist
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'user_subscriptions' and column_name = 'payment_reference') then
        alter table public.user_subscriptions add column payment_reference text null;
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'user_subscriptions' and column_name = 'payment_method') then
        alter table public.user_subscriptions add column payment_method text null;
    end if;
end $$;

-- Add columns to user_tickets if they don't exist
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'user_tickets' and column_name = 'payment_reference') then
        alter table public.user_tickets add column payment_reference text null;
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'user_tickets' and column_name = 'payment_method') then
        alter table public.user_tickets add column payment_method text null;
    end if;
end $$;

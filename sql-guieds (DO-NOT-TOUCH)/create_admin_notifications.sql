-- Create admin_notifications table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('freeze_request', 'extension_request', 'other')),
    title TEXT NOT NULL,
    message TEXT,
    payload JSONB, -- Stores specific data like { reason: '...', startDate: '...', endDate: '...' }
    deep_link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications" ON public.admin_notifications
    FOR SELECT
    USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));

-- Admins can update notifications (mark read, change status)
CREATE POLICY "Admins can update notifications" ON public.admin_notifications
    FOR UPDATE
    USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));

-- Users can insert notifications (requests)
CREATE POLICY "Users can insert notifications" ON public.admin_notifications
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can view their own notifications (optional, if you want them to see history)
CREATE POLICY "Users can view own notifications" ON public.admin_notifications
    FOR SELECT
    USING (auth.uid() = user_id);

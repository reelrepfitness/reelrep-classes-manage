-- Create user_requests table for actionable items (Inbox)
CREATE TABLE IF NOT EXISTS public.user_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('freeze_request', 'extension_request', 'other')),
    title TEXT NOT NULL,
    message TEXT,
    payload JSONB, -- Stores specific data like dates, reason
    deep_link TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
    admin_notes TEXT,
    processed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_requests ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admins can view/edit all
CREATE POLICY "Admins can do everything on user_requests" ON public.user_requests
    FOR ALL
    USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));

-- Users can insert their own requests
CREATE POLICY "Users can insert requests" ON public.user_requests
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can view their own requests status
CREATE POLICY "Users can view own requests" ON public.user_requests
    FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================
-- COMPLETE DATABASE MIGRATION SCRIPT
-- Reel Rep Training App
-- ============================================
-- This script creates ALL necessary tables for the app
-- Run this in your Supabase SQL editor
-- ============================================

-- ============================================
-- 1. PROFILES TABLE SETUP
-- ============================================

-- Ensure profiles table has all necessary columns
DO $$
BEGIN
  -- Basic profile fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'name') THEN
    ALTER TABLE profiles ADD COLUMN name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
    ALTER TABLE profiles ADD COLUMN full_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
    ALTER TABLE profiles ADD COLUMN email TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_admin') THEN
    ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_coach') THEN
    ALTER TABLE profiles ADD COLUMN is_coach BOOLEAN DEFAULT false;
  END IF;

  -- Plate balance
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'plate_balance') THEN
    ALTER TABLE profiles ADD COLUMN plate_balance INTEGER DEFAULT 0;
  END IF;

  -- Subscription fields (for legacy support)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_type') THEN
    ALTER TABLE profiles ADD COLUMN subscription_type VARCHAR(50);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_status') THEN
    ALTER TABLE profiles ADD COLUMN subscription_status VARCHAR(50);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_start') THEN
    ALTER TABLE profiles ADD COLUMN subscription_start TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_end') THEN
    ALTER TABLE profiles ADD COLUMN subscription_end TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'classes_per_month') THEN
    ALTER TABLE profiles ADD COLUMN classes_per_month INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'classes_used') THEN
    ALTER TABLE profiles ADD COLUMN classes_used INTEGER DEFAULT 0;
  END IF;

  -- Blocking and penalties
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'block_end_date') THEN
    ALTER TABLE profiles ADD COLUMN block_end_date TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'late_cancellations') THEN
    ALTER TABLE profiles ADD COLUMN late_cancellations INTEGER DEFAULT 0;
  END IF;

  -- Stats
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'total_workouts') THEN
    ALTER TABLE profiles ADD COLUMN total_workouts INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'created_at') THEN
    ALTER TABLE profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
    ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- ============================================
-- 2. SUBSCRIPTION PLANS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_hebrew TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('unlimited', 'limited', 'basic', 'premium', 'vip')),
  sessions_per_week INTEGER,
  sessions_per_month INTEGER,
  duration_months INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(10, 2) NOT NULL,
  description TEXT,
  description_hebrew TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_type ON public.subscription_plans(type);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON public.subscription_plans(is_active);

-- ============================================
-- 3. USER SUBSCRIPTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'paused')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  sessions_used_this_week INTEGER NOT NULL DEFAULT 0,
  sessions_used_this_month INTEGER NOT NULL DEFAULT 0,
  week_start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT date_trunc('week', NOW()),
  month_start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT date_trunc('month', NOW()),
  payment_method TEXT,
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON public.user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_end_date ON public.user_subscriptions(end_date);

-- ============================================
-- 4. CLASS SCHEDULES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS class_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_hebrew TEXT NOT NULL,
  coach_name TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  max_participants INTEGER NOT NULL DEFAULT 20,
  required_subscription_level INTEGER NOT NULL DEFAULT 1,
  location TEXT,
  location_hebrew TEXT,
  description TEXT,
  description_hebrew TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_class_schedules_day ON class_schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_class_schedules_active ON class_schedules(is_active);

-- ============================================
-- 5. CLASSES TABLE (Instance of a scheduled class)
-- ============================================

CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES class_schedules(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_hebrew TEXT NOT NULL,
  coach_name TEXT NOT NULL,
  class_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  max_participants INTEGER NOT NULL DEFAULT 20,
  current_participants INTEGER NOT NULL DEFAULT 0,
  required_subscription_level INTEGER NOT NULL DEFAULT 1,
  location TEXT,
  location_hebrew TEXT,
  class_type TEXT DEFAULT 'general',
  is_cancelled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(schedule_id, class_date)
);

CREATE INDEX IF NOT EXISTS idx_classes_schedule_id ON classes(schedule_id);
CREATE INDEX IF NOT EXISTS idx_classes_date ON classes(class_date);
CREATE INDEX IF NOT EXISTS idx_classes_cancelled ON classes(is_cancelled);

-- ============================================
-- 6. CLASS BOOKINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS class_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
  booking_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  attended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_class_bookings_user_id ON class_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_class_bookings_class_id ON class_bookings(class_id);
CREATE INDEX IF NOT EXISTS idx_class_bookings_status ON class_bookings(status);

-- ============================================
-- 7. ACHIEVEMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_hebrew TEXT NOT NULL,
  catagory TEXT,
  icon TEXT NOT NULL,
  description TEXT,
  description_hebrew TEXT,
  task_requirement INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  task_type TEXT CHECK (task_type IN ('total_weight', 'challenge', 'disapline', 'classes_attended')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_achievements_active ON achievements(is_active);
CREATE INDEX IF NOT EXISTS idx_achievements_task_type ON achievements(task_type);

-- ============================================
-- 8. USER ACHIEVEMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  date_earned TIMESTAMP WITH TIME ZONE,
  is_challenge BOOLEAN DEFAULT false,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_completed ON user_achievements(completed);

-- ============================================
-- 9. WORKOUTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  workout_date DATE NOT NULL,
  duration INTEGER NOT NULL,
  calories INTEGER,
  workout_type TEXT NOT NULL CHECK (workout_type IN ('strength', 'cardio', 'yoga', 'hiit', 'pilates', 'boxing', 'dance', 'other')),
  notes TEXT,
  heart_rate_avg INTEGER,
  heart_rate_max INTEGER,
  distance DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(workout_date DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_type ON workouts(workout_type);

-- ============================================
-- 10. WORKOUT EXERCISES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  sets INTEGER NOT NULL DEFAULT 1,
  reps INTEGER NOT NULL DEFAULT 1,
  weight DECIMAL(10, 2),
  notes TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id);

-- ============================================
-- 11. PLATES TRANSACTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS plates_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earned', 'spent', 'bonus', 'refund')),
  source VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plates_transactions_user_id ON plates_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_plates_transactions_created_at ON plates_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plates_transactions_type ON plates_transactions(transaction_type);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plates_transactions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Subscription plans policies
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.subscription_plans;
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans FOR SELECT USING (is_active = true);

-- User subscriptions policies
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.user_subscriptions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can insert own subscriptions" ON public.user_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can update own subscriptions" ON public.user_subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- Class schedules policies
DROP POLICY IF EXISTS "Anyone can view active schedules" ON public.class_schedules;
CREATE POLICY "Anyone can view active schedules" ON public.class_schedules FOR SELECT USING (is_active = true);

-- Classes policies
DROP POLICY IF EXISTS "Anyone can view classes" ON public.classes;
CREATE POLICY "Anyone can view classes" ON public.classes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service can manage classes" ON public.classes;
CREATE POLICY "Service can manage classes" ON public.classes FOR ALL USING (auth.role() = 'service_role');

-- Class bookings policies
DROP POLICY IF EXISTS "Anyone can read bookings" ON public.class_bookings;
CREATE POLICY "Anyone can read bookings" ON public.class_bookings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own bookings" ON public.class_bookings;
CREATE POLICY "Users can insert own bookings" ON public.class_bookings FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own bookings" ON public.class_bookings;
CREATE POLICY "Users can update own bookings" ON public.class_bookings FOR UPDATE USING (auth.uid() = user_id);

-- Achievements policies
DROP POLICY IF EXISTS "Anyone can read achievements" ON public.achievements;
CREATE POLICY "Anyone can read achievements" ON public.achievements FOR SELECT USING (true);

-- User achievements policies
DROP POLICY IF EXISTS "Anyone can read user achievements" ON public.user_achievements;
CREATE POLICY "Anyone can read user achievements" ON public.user_achievements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own achievements" ON public.user_achievements;
CREATE POLICY "Users can manage own achievements" ON public.user_achievements FOR ALL USING (auth.uid() = user_id);

-- Workouts policies
DROP POLICY IF EXISTS "Users can view own workouts" ON public.workouts;
CREATE POLICY "Users can view own workouts" ON public.workouts FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own workouts" ON public.workouts;
CREATE POLICY "Users can insert own workouts" ON public.workouts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own workouts" ON public.workouts;
CREATE POLICY "Users can update own workouts" ON public.workouts FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own workouts" ON public.workouts;
CREATE POLICY "Users can delete own workouts" ON public.workouts FOR DELETE USING (auth.uid() = user_id);

-- Workout exercises policies
DROP POLICY IF EXISTS "Users can view own workout exercises" ON public.workout_exercises;
CREATE POLICY "Users can view own workout exercises" ON public.workout_exercises FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workouts WHERE workouts.id = workout_exercises.workout_id AND workouts.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage own workout exercises" ON public.workout_exercises;
CREATE POLICY "Users can manage own workout exercises" ON public.workout_exercises FOR ALL
  USING (EXISTS (SELECT 1 FROM public.workouts WHERE workouts.id = workout_exercises.workout_id AND workouts.user_id = auth.uid()));

-- Plates transactions policies
DROP POLICY IF EXISTS "Users can view own transactions" ON public.plates_transactions;
CREATE POLICY "Users can view own transactions" ON public.plates_transactions FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON public.user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_class_schedules_updated_at ON public.class_schedules;
CREATE TRIGGER update_class_schedules_updated_at BEFORE UPDATE ON public.class_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_classes_updated_at ON public.classes;
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_class_bookings_updated_at ON public.class_bookings;
CREATE TRIGGER update_class_bookings_updated_at BEFORE UPDATE ON public.class_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workouts_updated_at ON public.workouts;
CREATE TRIGGER update_workouts_updated_at BEFORE UPDATE ON public.workouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to award achievement plates
CREATE OR REPLACE FUNCTION award_achievement_plates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
    DECLARE
      achievement_points INTEGER;
      achievement_name TEXT;
    BEGIN
      SELECT points, name_hebrew INTO achievement_points, achievement_name
      FROM public.achievements
      WHERE id = NEW.achievement_id;

      -- Add plates
      UPDATE public.profiles
      SET plate_balance = plate_balance + achievement_points
      WHERE id = NEW.user_id;

      -- Record transaction
      INSERT INTO public.plates_transactions (user_id, amount, transaction_type, source, description)
      VALUES (NEW.user_id, achievement_points, 'earned', 'achievement', 'הושג הישג: ' || achievement_name);
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_award_achievement_plates ON public.user_achievements;
CREATE TRIGGER trigger_award_achievement_plates
  AFTER UPDATE ON public.user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION award_achievement_plates();

-- ============================================
-- SAMPLE DATA (Optional)
-- ============================================

-- Insert sample subscription plans
INSERT INTO public.subscription_plans (name, name_hebrew, type, sessions_per_month, duration_months, price, description_hebrew)
VALUES
  ('Unlimited Monthly', 'ללא הגבלה חודשי', 'unlimited', NULL, 1, 399.00, 'אימונים ללא הגבלה למשך חודש'),
  ('Premium Monthly', 'פרימיום חודשי', 'premium', 12, 1, 299.00, '12 אימונים בחודש'),
  ('Basic Monthly', 'בסיסי חודשי', 'basic', 8, 1, 199.00, '8 אימונים בחודש')
ON CONFLICT DO NOTHING;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Complete database migration successful!';
  RAISE NOTICE '📊 Tables created/updated:';
  RAISE NOTICE '   - profiles';
  RAISE NOTICE '   - subscription_plans';
  RAISE NOTICE '   - user_subscriptions';
  RAISE NOTICE '   - class_schedules';
  RAISE NOTICE '   - classes';
  RAISE NOTICE '   - class_bookings';
  RAISE NOTICE '   - achievements';
  RAISE NOTICE '   - user_achievements';
  RAISE NOTICE '   - workouts';
  RAISE NOTICE '   - workout_exercises';
  RAISE NOTICE '   - plates_transactions';
  RAISE NOTICE '🔒 RLS policies enabled';
  RAISE NOTICE '⚡ Triggers configured';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next steps:';
  RAISE NOTICE '1. Verify tables in Supabase dashboard';
  RAISE NOTICE '2. Update application code to use new tables';
  RAISE NOTICE '3. Test all CRUD operations';
END $$;

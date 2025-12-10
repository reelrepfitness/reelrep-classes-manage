-- ============================================
-- MIGRATION SCRIPT FOR EXISTING SCHEMA
-- Reel Rep Training App
-- ============================================
-- This script adds missing tables and columns to your existing database
-- Safe to run multiple times
-- ============================================

-- ============================================
-- 1. UPDATE EXISTING PROFILES TABLE
-- ============================================

-- Add any missing columns to profiles table
DO $$
BEGIN
  -- full_name already exists, skip

  -- plate_balance already exists

  -- Make sure all needed columns exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'total_workouts') THEN
    ALTER TABLE public.profiles ADD COLUMN total_workouts INTEGER DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- 2. CREATE WORKOUTS TABLE (NEW)
-- ============================================

CREATE TABLE IF NOT EXISTS public.workouts (
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
  distance NUMERIC(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON public.workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON public.workouts(workout_date DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_type ON public.workouts(workout_type);

-- ============================================
-- 3. CREATE WORKOUT EXERCISES TABLE (NEW)
-- ============================================

CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  sets INTEGER NOT NULL DEFAULT 1,
  reps INTEGER NOT NULL DEFAULT 1,
  weight NUMERIC(10, 2),
  notes TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON public.workout_exercises(workout_id);

-- ============================================
-- 4. ADD MISSING COLUMNS TO ACHIEVEMENTS
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'achievements' AND column_name = 'name_hebrew') THEN
    ALTER TABLE public.achievements ADD COLUMN name_hebrew TEXT;
    -- Copy name to name_hebrew if empty
    UPDATE public.achievements SET name_hebrew = name WHERE name_hebrew IS NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'achievements' AND column_name = 'description_hebrew') THEN
    ALTER TABLE public.achievements ADD COLUMN description_hebrew TEXT;
  END IF;
END $$;

-- ============================================
-- 5. UPDATE CLASS_BOOKINGS TABLE
-- ============================================

DO $$
BEGIN
  -- Add booking_date column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_bookings' AND column_name = 'booking_date') THEN
    ALTER TABLE public.class_bookings ADD COLUMN booking_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    -- Copy from booked_at if exists
    UPDATE public.class_bookings SET booking_date = booked_at WHERE booked_at IS NOT NULL;
  END IF;
END $$;

-- ============================================
-- 6. ENABLE RLS ON NEW TABLES
-- ============================================

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. CREATE RLS POLICIES FOR WORKOUTS
-- ============================================

-- Workouts policies
DROP POLICY IF EXISTS "Users can view own workouts" ON public.workouts;
CREATE POLICY "Users can view own workouts" ON public.workouts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own workouts" ON public.workouts;
CREATE POLICY "Users can insert own workouts" ON public.workouts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own workouts" ON public.workouts;
CREATE POLICY "Users can update own workouts" ON public.workouts
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own workouts" ON public.workouts;
CREATE POLICY "Users can delete own workouts" ON public.workouts
  FOR DELETE USING (auth.uid() = user_id);

-- Workout exercises policies
DROP POLICY IF EXISTS "Users can view own workout exercises" ON public.workout_exercises;
CREATE POLICY "Users can view own workout exercises" ON public.workout_exercises
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workouts
    WHERE workouts.id = workout_exercises.workout_id
    AND workouts.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can manage own workout exercises" ON public.workout_exercises;
CREATE POLICY "Users can manage own workout exercises" ON public.workout_exercises
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.workouts
    WHERE workouts.id = workout_exercises.workout_id
    AND workouts.user_id = auth.uid()
  ));

-- ============================================
-- 8. CREATE/UPDATE TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for workouts
DROP TRIGGER IF EXISTS update_workouts_updated_at ON public.workouts;
CREATE TRIGGER update_workouts_updated_at
  BEFORE UPDATE ON public.workouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update trigger for profiles (if not exists)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. FIX ACHIEVEMENT PLATES TRIGGER
-- ============================================

-- Function to award achievement plates
CREATE OR REPLACE FUNCTION award_achievement_plates()
RETURNS TRIGGER AS $$
DECLARE
  achievement_points INTEGER;
  achievement_name TEXT;
BEGIN
  IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
    -- Get the achievement points
    SELECT points, COALESCE(name_hebrew, name) INTO achievement_points, achievement_name
    FROM public.achievements
    WHERE id = NEW.achievement_id;

    -- Add plates to profile
    UPDATE public.profiles
    SET plate_balance = plate_balance + achievement_points
    WHERE id::TEXT = NEW.user_id;  -- Note: user_id in user_achievements is TEXT

    -- Record transaction
    INSERT INTO public.plates_transactions (user_id, amount, transaction_type, source, description)
    VALUES (
      (SELECT id FROM auth.users WHERE id::TEXT = NEW.user_id),
      achievement_points,
      'earned',
      'achievement',
      'הושג הישג: ' || achievement_name
    );
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
-- 10. GRANT PERMISSIONS
-- ============================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workouts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_exercises TO authenticated;

-- Grant full permissions to service role
GRANT ALL ON public.workouts TO service_role;
GRANT ALL ON public.workout_exercises TO service_role;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '📊 Changes made:';
  RAISE NOTICE '   - Added workouts table';
  RAISE NOTICE '   - Added workout_exercises table';
  RAISE NOTICE '   - Updated profiles table';
  RAISE NOTICE '   - Updated achievements table';
  RAISE NOTICE '   - Added RLS policies';
  RAISE NOTICE '   - Added triggers';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Your database is now ready!';
  RAISE NOTICE '';
  RAISE NOTICE 'Note: This migration worked with your existing schema.';
  RAISE NOTICE 'Existing tables were preserved and only new tables/columns were added.';
END $$;

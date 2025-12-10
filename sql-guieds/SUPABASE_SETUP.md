# Supabase Database Setup

This document outlines the required Supabase tables and structure for the app to work with real data.

## Required Tables

### 1. `profiles` table
```sql
-- This table should already exist from Supabase Auth
-- Make sure it has these columns:
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_image TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plate_balance INTEGER DEFAULT 0;
```

### 2. `class_bookings` table
```sql
CREATE TABLE class_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL,
  status TEXT DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'completed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX idx_class_bookings_user_id ON class_bookings(user_id);
CREATE INDEX idx_class_bookings_class_id ON class_bookings(class_id);
CREATE INDEX idx_class_bookings_status ON class_bookings(status);
```

### 3. `achievements` table
```sql
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_hebrew TEXT NOT NULL,
  catagory TEXT,
  icon TEXT NOT NULL,
  description_hebrew TEXT,
  task_requirement INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  task_type TEXT, -- 'total_weight', 'challenge', 'disapline', 'classes_attended'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. `user_achievements` table (join table)
```sql
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  date_earned TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Indexes
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement_id ON user_achievements(achievement_id);
```

### 5. `class_schedules` table (already exists)
This table should already exist based on the code.

## Row Level Security (RLS) Policies

Enable RLS on all tables and add appropriate policies:

```sql
-- Enable RLS (profiles should already have RLS enabled)
ALTER TABLE class_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Profiles policies (if not already set)
CREATE POLICY IF NOT EXISTS "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Class bookings policies
CREATE POLICY "Anyone can read bookings" ON class_bookings FOR SELECT USING (true);
CREATE POLICY "Users can insert own bookings" ON class_bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bookings" ON class_bookings FOR UPDATE USING (auth.uid() = user_id);

-- Achievements policies
CREATE POLICY "Anyone can read achievements" ON achievements FOR SELECT USING (true);

-- User achievements policies
CREATE POLICY "Anyone can read user achievements" ON user_achievements FOR SELECT USING (true);
CREATE POLICY "Users can manage own achievements" ON user_achievements FOR ALL USING (auth.uid() = user_id);
```

## What Changed in the Code

1. **ClassesContext.tsx**:
   - Now fetches bookings from Supabase `class_bookings` table
   - Fetches ALL bookings to calculate accurate enrolled counts
   - `bookClass` function now saves to Supabase
   - Added `getClassBookings()` function to fetch enrolled users with their achievements

2. **classes.tsx**:
   - Bottom sheet now displays real user data from Supabase
   - Shows actual user names, profile images, and achievements
   - Enrolled count updates in real-time

## Testing

1. Make sure your Supabase project is connected
2. Create the tables above in your Supabase SQL editor
3. Add some test users to the `users` table
4. Book classes - they will be saved to `class_bookings` table
5. The enrolled count and user list should update automatically

## Migration from AsyncStorage

If you have existing bookings in AsyncStorage, you'll need to migrate them to Supabase. The code includes fallback logic to AsyncStorage if Supabase fails, but for production use, all bookings should be in Supabase.

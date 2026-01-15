-- Create exercises table
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  name_en TEXT,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('strength', 'cardio', 'olympic', 'gymnastics', 'endurance', 'other')),
  subcategory TEXT,
  measurement_type TEXT NOT NULL CHECK (measurement_type IN ('weight', 'time', 'distance', 'reps', 'points')),
  measurement_unit TEXT NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  instructions TEXT,
  muscle_groups TEXT[],
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_exercises_category ON exercises(category);
CREATE INDEX idx_exercises_name ON exercises(name);
CREATE INDEX idx_exercises_is_active ON exercises(is_active);

-- Enable RLS
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view active exercises
CREATE POLICY "Everyone can view active exercises"
  ON exercises
  FOR SELECT
  USING (is_active = true);

-- Policy: Only admins can manage exercises
CREATE POLICY "Admins can manage exercises"
  ON exercises
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Insert some common exercises as seed data
INSERT INTO exercises (name, name_en, category, subcategory, measurement_type, measurement_unit, difficulty, muscle_groups) VALUES
('דדליפט', 'Deadlift', 'strength', 'משיכות', 'weight', 'kg', 'intermediate', ARRAY['back', 'legs', 'core']),
('סקוואט אחורי', 'Back Squat', 'strength', 'רגליים', 'weight', 'kg', 'beginner', ARRAY['legs', 'core']),
('בנץ׳ פרס', 'Bench Press', 'strength', 'דחיפות', 'weight', 'kg', 'beginner', ARRAY['chest', 'shoulders', 'triceps']),
('קלין אנד ג׳רק', 'Clean & Jerk', 'olympic', 'הרמות אולימפיות', 'weight', 'kg', 'advanced', ARRAY['full-body']),
('סנאץ׳', 'Snatch', 'olympic', 'הרמות אולימפיות', 'weight', 'kg', 'advanced', ARRAY['full-body']),
('ריצה 5 ק״מ', '5k Run', 'endurance', 'ריצה', 'time', 'min:sec', 'intermediate', ARRAY['legs', 'cardio']),
('ריצה 10 ק״מ', '10k Run', 'endurance', 'ריצה', 'time', 'min:sec', 'advanced', ARRAY['legs', 'cardio']),
('משיכות (Pull-ups)', 'Pull-ups', 'gymnastics', 'משיכות', 'reps', 'reps', 'intermediate', ARRAY['back', 'arms']),
('שכיבות סמיכה', 'Push-ups', 'gymnastics', 'דחיפות', 'reps', 'reps', 'beginner', ARRAY['chest', 'shoulders', 'triceps']),
('תראסטר', 'Thruster', 'strength', 'משולב', 'weight', 'kg', 'intermediate', ARRAY['legs', 'shoulders']);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_exercises_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER exercises_updated_at
  BEFORE UPDATE ON exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_exercises_updated_at();

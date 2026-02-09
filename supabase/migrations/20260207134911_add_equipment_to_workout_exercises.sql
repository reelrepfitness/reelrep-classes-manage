-- Add equipment column to workout_exercises table
ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS equipment text;

-- Optional: Create an index for performance if we query by equipment frequently
CREATE INDEX IF NOT EXISTS idx_workout_exercises_equipment ON workout_exercises(equipment);

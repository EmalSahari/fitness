-- FitTrack schema
-- Run this in your Supabase SQL editor (supabase.com → project → SQL Editor)

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT '',
  language    TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'da')),
  plan        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  calorie_goal  INTEGER NOT NULL DEFAULT 2000,
  protein_goal  INTEGER NOT NULL DEFAULT 150,
  onboarded   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Personal stats (set during onboarding, editable later)
CREATE TABLE IF NOT EXISTS user_stats (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  age             INTEGER,
  weight_kg       NUMERIC(5,2),
  height_cm       NUMERIC(5,1),
  sex             TEXT CHECK (sex IN ('male', 'female', 'other')),
  activity_level  TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal            TEXT CHECK (goal IN ('lose_fat', 'build_muscle', 'maintain', 'performance')),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Food log
CREATE TABLE IF NOT EXISTS food_entries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  calories   INTEGER NOT NULL,
  meal_type  TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  protein    NUMERIC(6,1),
  carbs      NUMERIC(6,1),
  fat        NUMERIC(6,1),
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workout log
CREATE TABLE IF NOT EXISTS workout_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('cardio', 'strength', 'hiit', 'yoga', 'sports', 'other')),
  duration       INTEGER NOT NULL,
  calories_burned INTEGER NOT NULL,
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Weight log
CREATE TABLE IF NOT EXISTS weight_entries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  weight_kg  NUMERIC(5,2) NOT NULL,
  note       TEXT,
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;

-- Profile policies
CREATE POLICY "own_profile_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own_profile_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own_profile_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- user_stats policies
CREATE POLICY "own_stats_all" ON user_stats FOR ALL USING (auth.uid() = user_id);

-- food_entries policies
CREATE POLICY "own_food_all" ON food_entries FOR ALL USING (auth.uid() = user_id);

-- workout_entries policies
CREATE POLICY "own_workouts_all" ON workout_entries FOR ALL USING (auth.uid() = user_id);

-- weight_entries policies
CREATE POLICY "own_weight_all" ON weight_entries FOR ALL USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

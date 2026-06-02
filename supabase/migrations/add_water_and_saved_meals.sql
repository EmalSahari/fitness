-- Migration: add water_logs and saved_meals tables
-- Paste this into Supabase SQL Editor → Run

-- Water intake log
CREATE TABLE IF NOT EXISTS water_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_ml  INTEGER NOT NULL CHECK (amount_ml > 0),
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_water_logs" ON water_logs FOR ALL USING (auth.uid() = user_id);

-- Saved / favourite meals
CREATE TABLE IF NOT EXISTS saved_meals (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  calories   INTEGER NOT NULL,
  meal_type  TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  protein    NUMERIC(6,1),
  carbs      NUMERIC(6,1),
  fat        NUMERIC(6,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE saved_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_saved_meals" ON saved_meals FOR ALL USING (auth.uid() = user_id);

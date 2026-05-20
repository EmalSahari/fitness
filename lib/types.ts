export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type WorkoutType = 'cardio' | 'strength' | 'hiit' | 'yoga' | 'sports' | 'other';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type FitnessGoal = 'lose_fat' | 'build_muscle' | 'maintain' | 'performance' | 'custom';
export type Sex = 'male' | 'female' | 'other';
export type Plan = 'free' | 'pro';
export type Language = 'en' | 'da';

export interface Profile {
  id: string;
  name: string;
  language: Language;
  plan: Plan;
  calorie_goal: number;
  protein_goal: number;
  coach_memory: string;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserStats {
  id: string;
  user_id: string;
  age?: number;
  weight_kg?: number;
  height_cm?: number;
  sex?: Sex;
  activity_level?: ActivityLevel;
  goal?: FitnessGoal;
  custom_goal_text?: string;
  updated_at: string;
}

export interface FoodEntry {
  id: string;
  user_id: string;
  name: string;
  calories: number;
  meal_type: MealType;
  protein?: number;
  carbs?: number;
  fat?: number;
  date: string;
  created_at: string;
}

export interface WorkoutEntry {
  id: string;
  user_id: string;
  name: string;
  type: WorkoutType;
  duration: number;
  calories_burned: number;
  date: string;
  created_at: string;
}

export interface WeightEntry {
  id: string;
  user_id: string;
  weight_kg: number;
  note?: string;
  date: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

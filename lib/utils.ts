import type { ActivityLevel, FitnessGoal, Sex } from './types';

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });
}

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function calculateTDEE(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: Sex,
  activityLevel: ActivityLevel
): number {
  const bmr =
    sex === 'female'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age - 161
      : 10 * weightKg + 6.25 * heightCm - 5 * age + 5;

  const multipliers: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  return Math.round(bmr * multipliers[activityLevel]);
}

export function calorieGoalFromGoal(tdee: number, goal: FitnessGoal): number {
  const adjustments: Record<FitnessGoal, number> = {
    lose_fat: -500,
    build_muscle: 300,
    maintain: 0,
    performance: 200,
  };
  return Math.max(1200, tdee + adjustments[goal]);
}

// g/kg multipliers per goal: lose_fat=1.6, build_muscle=2.0, maintain=1.4, performance=1.8
export function proteinGoalFromWeight(weightKg: number, goal: FitnessGoal): number {
  const multipliers: Record<FitnessGoal, number> = {
    lose_fat: 1.6,
    build_muscle: 2.0,
    maintain: 1.4,
    performance: 1.8,
  };
  return Math.round(weightKg * multipliers[goal]);
}

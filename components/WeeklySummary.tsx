'use client';

import type { FoodEntry, WorkoutEntry } from '@/lib/types';
import { getLast7Days } from '@/lib/utils';

interface Props {
  allFood: FoodEntry[];       // last 7 days food (already fetched)
  workouts: WorkoutEntry[];   // last 7 days workouts (already fetched)
  calorieGoal: number;
}

export default function WeeklySummary({ allFood, workouts, calorieGoal }: Props) {
  const last7 = getLast7Days();

  // Days with at least one food entry
  const loggedDays = new Set(allFood.map(e => e.date)).size;

  // Avg daily calories (only days with entries)
  const calsByDay: Record<string, number> = {};
  for (const e of allFood) {
    calsByDay[e.date] = (calsByDay[e.date] ?? 0) + e.calories;
  }
  const dayValues = Object.values(calsByDay);
  const avgCals = dayValues.length > 0
    ? Math.round(dayValues.reduce((s, v) => s + v, 0) / dayValues.length)
    : 0;

  // Avg protein
  const proteinByDay: Record<string, number> = {};
  for (const e of allFood) {
    if (e.protein) proteinByDay[e.date] = (proteinByDay[e.date] ?? 0) + e.protein;
  }
  const proteinDays = Object.values(proteinByDay);
  const avgProtein = proteinDays.length > 0
    ? Math.round(proteinDays.reduce((s, v) => s + v, 0) / proteinDays.length)
    : 0;

  const totalWorkouts = workouts.length;
  const totalBurned = workouts.reduce((s, w) => s + w.calories_burned, 0);

  // Calorie adherence: days within ±15% of goal
  const adherentDays = dayValues.filter(v => Math.abs(v - calorieGoal) / calorieGoal <= 0.15).length;

  const metrics = [
    {
      label: 'Days logged',
      value: loggedDays,
      suffix: '/ 7',
      color: loggedDays >= 5 ? 'text-green-400' : loggedDays >= 3 ? 'text-amber-400' : 'text-slate-400',
      bar: loggedDays / 7,
      barColor: '#22c55e',
    },
    {
      label: 'Avg calories',
      value: avgCals,
      suffix: 'kcal/day',
      color: 'text-blue-400',
      bar: Math.min(avgCals / (calorieGoal || 2000), 1.2),
      barColor: avgCals > calorieGoal * 1.15 ? '#ef4444' : '#3b82f6',
    },
    {
      label: 'Avg protein',
      value: avgProtein,
      suffix: 'g/day',
      color: 'text-violet-400',
      bar: Math.min(avgProtein / 150, 1),
      barColor: '#8b5cf6',
    },
    {
      label: 'Workouts',
      value: totalWorkouts,
      suffix: 'sessions',
      color: 'text-emerald-400',
      bar: Math.min(totalWorkouts / 5, 1),
      barColor: '#10b981',
    },
  ];

  const streak7 = last7.filter(d => new Set(allFood.map(e => e.date)).has(d)).length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <h2 className="font-semibold text-white">This week</h2>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          {streak7} / 7 days active
        </div>
      </div>

      {/* 7-day dot grid */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex gap-1.5 justify-between">
          {last7.map((day, i) => {
            const hasFood = new Set(allFood.map(e => e.date)).has(day);
            const hasWorkout = workouts.some(w => w.date === day);
            const isToday = i === last7.length - 1;
            const label = new Date(day + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' }).slice(0, 1);
            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <div className="relative flex flex-col items-center gap-0.5">
                  <div
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      hasFood
                        ? 'bg-blue-600/20 border-blue-500/60'
                        : isToday
                        ? 'border-slate-600 border-dashed'
                        : 'border-slate-800'
                    }`}
                  >
                    {hasFood && <span className="text-blue-400 text-xs">✓</span>}
                    {hasWorkout && !hasFood && <span className="text-green-400 text-xs">⚡</span>}
                  </div>
                  {hasWorkout && hasFood && (
                    <div className="absolute -bottom-1 -right-0.5 w-3 h-3 rounded-full bg-green-500/80 border border-slate-900 flex items-center justify-center">
                      <span className="text-white" style={{ fontSize: 7 }}>⚡</span>
                    </div>
                  )}
                </div>
                <span className={`text-xs ${isToday ? 'text-blue-400 font-semibold' : 'text-slate-600'}`}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats grid */}
      <div className="px-5 pb-4 grid grid-cols-2 gap-3 mt-2">
        {metrics.map(m => (
          <div key={m.label} className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-500">{m.label}</span>
              <span className={`text-sm font-bold tabular-nums ${m.color}`}>
                {m.value.toLocaleString()}<span className="text-xs font-normal text-slate-500 ml-1">{m.suffix}</span>
              </span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(m.bar, 1) * 100}%`, background: m.barColor }}
              />
            </div>
          </div>
        ))}
      </div>

      {totalBurned > 0 && (
        <div className="px-5 pb-4">
          <div className="bg-green-500/8 border border-green-500/15 rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">Total burned this week</span>
            <span className="text-sm font-semibold text-green-400">{totalBurned.toLocaleString()} kcal</span>
          </div>
        </div>
      )}

      {adherentDays > 0 && (
        <div className="px-5 pb-4 -mt-1">
          <div className="bg-blue-500/8 border border-blue-500/15 rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">On-target days (±15% of goal)</span>
            <span className="text-sm font-semibold text-blue-400">{adherentDays} / {dayValues.length} days</span>
          </div>
        </div>
      )}
    </div>
  );
}

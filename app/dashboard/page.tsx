'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { getTodayDate, getLast7Days, clamp } from '@/lib/utils';
import type { FoodEntry, WorkoutEntry, WeightEntry } from '@/lib/types';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

const mealColors: Record<string, string> = {
  breakfast: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  lunch:     'bg-green-500/20 text-green-400 border-green-500/30',
  dinner:    'bg-violet-500/20 text-violet-400 border-violet-500/30',
  snack:     'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

// Animated counter hook
function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * target));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return value;
}

// Circular progress ring
function CalorieRing({ consumed, goal, burned }: { consumed: number; goal: number; burned: number }) {
  const size = 200;
  const strokeW = 14;
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const pct = clamp(consumed / (goal || 1), 0, 1);
  const over = consumed > goal;
  const color = over ? '#ef4444' : pct > 0.8 ? '#f59e0b' : '#3b82f6';
  const dash = pct * circ;

  const animCount = useCountUp(consumed);
  const remaining = Math.max(0, goal - consumed);

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke="#1e293b" strokeWidth={strokeW} />
          {/* Progress */}
          <circle cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={color} strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.34,1.56,0.64,1), stroke 0.3s' }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white tabular-nums">{animCount.toLocaleString()}</span>
          <span className="text-xs text-slate-400 mt-0.5">kcal eaten</span>
          <span className="text-xs font-medium mt-1" style={{ color }}>
            {over ? `${(consumed - goal).toLocaleString()} over` : `${remaining.toLocaleString()} left`}
          </span>
        </div>
      </div>

      {/* Goal + burned row */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block" />
          <span className="text-slate-400">Goal</span>
          <span className="font-semibold text-white">{goal.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
          <span className="text-slate-400">Burned</span>
          <span className="font-semibold text-green-400">{burned.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

// Animated stat card
function StatCard({ value, unit, label, color, bg }: { value: number; unit: string; label: string; color: string; bg: string }) {
  const animated = useCountUp(value);
  return (
    <div className={`${bg} border rounded-xl p-4 text-center`}>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{animated}{unit}</p>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user, profile, loading: authLoading, t } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const today = getTodayDate();
  const last7 = getLast7Days();

  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutEntry[]>([]);
  const [latestWeight, setLatestWeight] = useState<WeightEntry | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [calorieGoalInput, setCalorieGoalInput] = useState('');

  useEffect(() => {
    if (!profile) return;
    if (!profile.onboarded) { router.push('/onboarding'); return; }
    setCalorieGoalInput(String(profile.calorie_goal));
  }, [profile, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setDataLoading(false); return; }
    async function load() {
      const [foodRes, workoutRes, weightRes] = await Promise.all([
        supabase.from('food_entries').select('*').eq('user_id', user!.id).eq('date', today).order('created_at', { ascending: false }),
        supabase.from('workout_entries').select('*').eq('user_id', user!.id).in('date', last7).order('created_at', { ascending: false }),
        supabase.from('weight_entries').select('*').eq('user_id', user!.id).order('date', { ascending: false }).limit(1),
      ]);
      setFoodEntries((foodRes.data ?? []) as FoodEntry[]);
      setWorkoutEntries((workoutRes.data ?? []) as WorkoutEntry[]);
      setLatestWeight(((weightRes.data ?? [])[0] ?? null) as WeightEntry | null);
      setDataLoading(false);
    }
    load();
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading || dataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const todayFood = foodEntries;
  const todayWorkouts = workoutEntries.filter(e => e.date === today);
  const weeklyWorkoutCount = workoutEntries.length;
  const goal = profile?.calorie_goal ?? 2000;

  const totalCalIn = todayFood.reduce((s, e) => s + e.calories, 0);
  const totalCalBurned = todayWorkouts.reduce((s, e) => s + e.calories_burned, 0);
  const netCal = totalCalIn - totalCalBurned;

  const totalProtein = todayFood.reduce((s, e) => s + (e.protein ?? 0), 0);
  const totalCarbs   = todayFood.reduce((s, e) => s + (e.carbs ?? 0), 0);
  const totalFat     = todayFood.reduce((s, e) => s + (e.fat ?? 0), 0);
  const macroTotal   = totalProtein + totalCarbs + totalFat;

  async function saveCalorieGoal(val: number) {
    if (!user) return;
    await supabase.from('profiles').update({ calorie_goal: val }).eq('id', user.id);
  }

  return (
    <div className="space-y-5 pb-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('dash_title')}</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {new Date().toLocaleDateString(profile?.language === 'da' ? 'da-DK' : 'en-US', {
              weekday: 'long', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
        <Link href="/coach"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />
          </svg>
          {t('dash_ask_coach')}
        </Link>
      </div>

      {/* Calorie ring card */}
      <div className="relative bg-slate-900 border border-slate-800 rounded-xl p-5 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-10 blur-3xl"
            style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />
        </div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-white">{t('dash_calories_today')}</h2>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs text-slate-400">Net: <span className={netCal > goal ? 'text-red-400' : 'text-white'}>{netCal.toLocaleString()} kcal</span></span>
          </div>
        </div>
        <CalorieRing consumed={totalCalIn} goal={goal} burned={totalCalBurned} />
        </div>

      {/* Macro + workout stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard value={Math.round(totalProtein)} unit="g" label={t('dash_protein')}     color="text-blue-400"   bg="bg-blue-500/10 border-blue-500/20" />
        <StatCard value={Math.round(totalCarbs)}   unit="g" label={t('dash_carbs')}       color="text-amber-400"  bg="bg-amber-500/10 border-amber-500/20" />
        <StatCard value={Math.round(totalFat)}     unit="g" label={t('dash_fat')}         color="text-pink-400"   bg="bg-pink-500/10 border-pink-500/20" />
        <StatCard value={weeklyWorkoutCount}        unit=""  label={t('dash_workouts_7d')} color="text-green-400"  bg="bg-green-500/10 border-green-500/20" />
      </div>

      {/* Macros bar */}
      {macroTotal > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-white">{t('dash_macros')}</h2>
          <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
            {totalProtein > 0 && <div className="bg-blue-500 h-full transition-all duration-700" style={{ width: `${(totalProtein / macroTotal) * 100}%` }} />}
            {totalCarbs   > 0 && <div className="bg-amber-500 h-full transition-all duration-700" style={{ width: `${(totalCarbs / macroTotal) * 100}%` }} />}
            {totalFat     > 0 && <div className="bg-pink-500 h-full transition-all duration-700" style={{ width: `${(totalFat / macroTotal) * 100}%` }} />}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-slate-400">
            {[
              { label: t('dash_protein'), val: totalProtein, color: 'bg-blue-500' },
              { label: t('dash_carbs'),   val: totalCarbs,   color: 'bg-amber-500' },
              { label: t('dash_fat'),     val: totalFat,     color: 'bg-pink-500' },
            ].map(({ label, val, color }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${color} inline-block`} />
                {label} {Math.round(val)}g ({macroTotal > 0 ? Math.round((val / macroTotal) * 100) : 0}%)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Today's food */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="font-semibold text-white">{t('dash_todays_food')}</h2>
          <Link href="/food" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">{t('dash_add_meal')}</Link>
        </div>
        {todayFood.length === 0 ? (
          <div className="px-5 py-8 text-center text-slate-500 text-sm">
            {t('dash_no_food')}{' '}
            <Link href="/food" className="text-blue-400 hover:text-blue-300">{t('dash_log_first_meal')}</Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {MEAL_TYPES.map((mealType) => {
              const entries = todayFood.filter(e => e.meal_type === mealType);
              if (!entries.length) return null;
              return (
                <div key={mealType} className="px-5 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${mealColors[mealType]}`}>{mealType}</span>
                    <span className="text-xs text-slate-500">{entries.reduce((s, e) => s + e.calories, 0)} {t('dash_kcal')}</span>
                  </div>
                  {entries.map(e => (
                    <div key={e.id} className="flex justify-between text-sm py-0.5">
                      <span className="text-slate-300">{e.name}</span>
                      <span className="text-slate-400">{e.calories} {t('dash_kcal')}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Today's workouts */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="font-semibold text-white">{t('dash_todays_workouts')}</h2>
          <Link href="/workouts" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">{t('dash_log_workout_link')}</Link>
        </div>
        {todayWorkouts.length === 0 ? (
          <div className="px-5 py-8 text-center text-slate-500 text-sm">
            {t('dash_no_workouts')}{' '}
            <Link href="/workouts" className="text-blue-400 hover:text-blue-300">{t('dash_log_first_workout')}</Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {todayWorkouts.map(w => (
              <div key={w.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">{w.name}</p>
                  <p className="text-xs text-slate-500 capitalize mt-0.5">{w.type} · {w.duration} {t('wkt_duration')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-400">{w.calories_burned} {t('dash_kcal')}</p>
                  <p className="text-xs text-slate-500">{t('dash_burned')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weight + calorie goal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-white text-sm">{t('dash_latest_weight')}</h2>
            <Link href="/weight" className="text-xs text-blue-400 hover:text-blue-300">{t('dash_log_weight')}</Link>
          </div>
          {latestWeight ? (
            <div>
              <p className="text-3xl font-bold text-white">{latestWeight.weight_kg}<span className="text-lg text-slate-400 ml-1">{t('wt_kg')}</span></p>
              <p className="text-xs text-slate-500 mt-1">{new Date(latestWeight.date + 'T00:00:00').toLocaleDateString()}</p>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">{t('dash_no_weight')}</p>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="font-semibold text-white text-sm mb-3">{t('dash_calorie_goal')}</h2>
          <div className="flex items-center gap-2">
            <input type="number" value={calorieGoalInput}
              onChange={e => setCalorieGoalInput(e.target.value)}
              onBlur={() => {
                const val = parseInt(calorieGoalInput, 10);
                if (!isNaN(val) && val > 0) saveCalorieGoal(val);
              }}
              className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              min={500} max={10000} step={50} />
            <span className="text-sm text-slate-400">{t('dash_kcal_per_day')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

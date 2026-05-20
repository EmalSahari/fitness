'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { getTodayDate, getLast7Days, clamp } from '@/lib/utils';
import { calculateStreak, calculateBadges } from '@/lib/streak';
import type { FoodEntry, WorkoutEntry, WeightEntry } from '@/lib/types';
import { DashboardSkeleton } from '@/components/Skeleton';
import type { TranslationKey } from '@/lib/i18n/en';
import { getCached, setCached, invalidateCache } from '@/lib/cache';

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
function CalorieRing({ consumed, goal, burned, t }: { consumed: number; goal: number; burned: number; t: (k: TranslationKey) => string }) {
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
          <span className="text-xs text-slate-400 mt-0.5">{t('dash_kcal_eaten')}</span>
          <span className="text-xs font-medium mt-1" style={{ color }}>
            {over ? `${(consumed - goal).toLocaleString()} ${t('dash_over_ring')}` : `${remaining.toLocaleString()} ${t('dash_left')}`}
          </span>
        </div>
      </div>

      {/* Goal + burned row */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block" />
          <span className="text-slate-400">{t('dash_goal_ring')}</span>
          <span className="font-semibold text-white">{goal.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
          <span className="text-slate-400">{t('dash_burned_ring')}</span>
          <span className="font-semibold text-green-400">{burned.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

// Animated stat card
function StatCard({ value, unit, label, color, bg, glowColor }: { value: number; unit: string; label: string; color: string; bg: string; glowColor?: string }) {
  const animated = useCountUp(value);
  return (
    <div
      className={`relative ${bg} rounded-xl p-4 text-center transition-all duration-300 cursor-default overflow-hidden`}
      style={{ border: '1px solid transparent' }}
      onMouseEnter={e => { if (glowColor) (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px 2px ${glowColor}30, inset 0 0 20px ${glowColor}08`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
    >
      <div className="absolute inset-0 rounded-[inherit] border border-slate-700/50 pointer-events-none" />
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
  const [allFoodDates, setAllFoodDates] = useState<string[]>([]);
  const [totalWorkoutCount, setTotalWorkoutCount] = useState(0);
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
      const cacheKey = `dash_${user!.id}_${today}`;
      type DashCache = { food: FoodEntry[]; workouts: WorkoutEntry[]; weight: WeightEntry | null; dates: string[]; workoutCount: number };
      const cached = getCached<DashCache>(cacheKey);
      if (cached) {
        setFoodEntries(cached.food);
        setWorkoutEntries(cached.workouts);
        setLatestWeight(cached.weight);
        setAllFoodDates(cached.dates);
        setTotalWorkoutCount(cached.workoutCount);
        setDataLoading(false);
        return;
      }
      const [foodRes, workoutRes, weightRes, allDatesRes, totalWorkoutsRes] = await Promise.all([
        supabase.from('food_entries').select('*').eq('user_id', user!.id).eq('date', today).order('created_at', { ascending: false }),
        supabase.from('workout_entries').select('*').eq('user_id', user!.id).in('date', last7).order('created_at', { ascending: false }),
        supabase.from('weight_entries').select('*').eq('user_id', user!.id).order('date', { ascending: false }).limit(1),
        supabase.from('food_entries').select('date').eq('user_id', user!.id),
        supabase.from('workout_entries').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
      ]);
      const food = (foodRes.data ?? []) as FoodEntry[];
      const workouts = (workoutRes.data ?? []) as WorkoutEntry[];
      const weight = ((weightRes.data ?? [])[0] ?? null) as WeightEntry | null;
      const dates = ((allDatesRes.data ?? []) as { date: string }[]).map(r => r.date);
      const workoutCount = totalWorkoutsRes.count ?? 0;
      setCached(cacheKey, { food, workouts, weight, dates, workoutCount });
      setFoodEntries(food);
      setWorkoutEntries(workouts);
      setLatestWeight(weight);
      setAllFoodDates(dates);
      setTotalWorkoutCount(workoutCount);
      setDataLoading(false);
    }
    load();
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading || dataLoading) return <DashboardSkeleton />;

  const todayFood = foodEntries;
  const todayWorkouts = workoutEntries.filter(e => e.date === today);
  const weeklyWorkoutCount = workoutEntries.length;
  const streak = calculateStreak(allFoodDates);
  const badges = calculateBadges(streak, totalWorkoutCount, allFoodDates.length > 0);
  const goal = profile?.calorie_goal ?? 2000;
  const proteinGoal = profile?.protein_goal ?? 150;

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
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
              <span className="text-lg leading-none">🔥</span>
              <div className="text-right">
                <p className="text-sm font-bold text-orange-400 leading-none">{streak}</p>
                <p className="text-xs text-orange-400/70 leading-none mt-0.5">{t('streak_label')}</p>
              </div>
            </div>
          )}
          <Link href="/coach"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />
            </svg>
            {t('dash_ask_coach')}
          </Link>
        </div>
      </div>

      {/* Badges */}
      {badges.some(b => b.earned) && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('badges_title')}</p>
          <div className="flex gap-2 flex-wrap">
            {badges.filter(b => b.earned).map(badge => (
              <span key={badge.key}
                className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-full px-3 py-1 text-xs font-medium text-slate-300">
                {badge.emoji} {t(badge.labelKey as Parameters<typeof t>[0])}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Calorie ring card */}
      <div className="relative bg-slate-900 rounded-xl p-5 overflow-hidden" style={{ border: '1px solid rgba(59,130,246,0.2)', boxShadow: '0 0 24px rgba(59,130,246,0.06)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-10 blur-3xl"
            style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />
        </div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-white">{t('dash_calories_today')}</h2>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs text-slate-400">{t('dash_net_label')} <span className={netCal > goal ? 'text-red-400' : 'text-white'}>{netCal.toLocaleString()} kcal</span></span>
          </div>
        </div>
        <CalorieRing consumed={totalCalIn} goal={goal} burned={totalCalBurned} t={t} />
        </div>

      {/* Protein goal card + other stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Protein — spans 2 cols on mobile to give it room */}
        <div className="col-span-2 sm:col-span-2 bg-slate-900 rounded-xl p-4 space-y-2" style={{ border: '1px solid rgba(59,130,246,0.2)' }}>
          <div className="flex items-end justify-between">
            <span className="text-xs font-medium text-slate-400">{t('dash_protein')}</span>
            <span className="text-xs text-slate-500">{Math.round(totalProtein)}g / {proteinGoal}g</span>
          </div>
          <div className="text-2xl font-bold text-blue-400">{Math.round(totalProtein)}<span className="text-sm font-normal text-slate-500 ml-1">g</span></div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min((totalProtein / proteinGoal) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">
            {totalProtein >= proteinGoal
              ? '✓ Goal reached'
              : `${Math.round(proteinGoal - totalProtein)}g to go`}
          </p>
        </div>
        <StatCard value={Math.round(totalCarbs)}   unit="g" label={t('dash_carbs')}       color="text-amber-400"  bg="bg-amber-500/10"  glowColor="#f59e0b" />
        <StatCard value={Math.round(totalFat)}     unit="g" label={t('dash_fat')}         color="text-pink-400"   bg="bg-pink-500/10"   glowColor="#ec4899" />
      </div>
      {/* Workout stat */}
      <div className="grid grid-cols-1">
        <StatCard value={weeklyWorkoutCount} unit="" label={t('dash_workouts_7d')} color="text-green-400" bg="bg-green-500/10" glowColor="#22c55e" />
      </div>

      {/* Macros bar */}
      {macroTotal > 0 && (
        <div className="relative bg-slate-900 rounded-xl p-5 space-y-3" style={{ border: '1px solid rgba(99,102,241,0.18)', boxShadow: '0 0 20px rgba(99,102,241,0.05)' }}>
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
      <div className="bg-slate-900 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(245,158,11,0.15)' }}>
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
      <div className="bg-slate-900 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(34,197,94,0.15)' }}>
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

      {/* Push notification nudge */}
      <NotifNudge />

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

function NotifNudge() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if: push is supported, not already enabled/denied, and not dismissed before
    if (!('Notification' in window) || !('PushManager' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission === 'denied') return;
    if (localStorage.getItem('notif-nudge-dismissed')) return;

    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => {
        if (!sub) setVisible(true);
      })
    ).catch(() => {});
  }, []);

  if (!visible) return null;

  return (
    <div className="flex items-center gap-3 bg-blue-600/10 border border-blue-500/25 rounded-xl px-4 py-3">
      <span className="text-xl flex-shrink-0">🔔</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">Get daily reminders</p>
        <p className="text-xs text-slate-400 mt-0.5">Morning nudge + evening calorie check-in</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link href="/account" className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors px-3 py-1.5 bg-blue-500/15 rounded-lg">
          Turn on
        </Link>
        <button
          onClick={() => { localStorage.setItem('notif-nudge-dismissed', '1'); setVisible(false); }}
          className="text-slate-500 hover:text-slate-300 transition-colors p-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

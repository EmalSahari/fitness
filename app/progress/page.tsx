'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { ProgressSkeleton } from '@/components/Skeleton';
import { getTodayDate, getLastNDays } from '@/lib/utils';
import type { WeightEntry, FoodEntry, WorkoutEntry } from '@/lib/types';
import { getCached, setCached } from '@/lib/cache';
import ProgressPhotos from '@/components/ProgressPhotos';

type Period = '7d' | '30d' | '3m';
type Insight = { type: 'positive' | 'warning' | 'suggestion'; title: string; text: string };

const PERIOD_N: Record<Period, number> = { '7d': 7, '30d': 30, '3m': 90 };
const PERIOD_LABEL: Record<Period, string> = { '7d': '7D', '30d': '30D', '3m': '3M' };

const insightStyles = {
  positive:   { border: 'border-green-500/30',  bg: 'bg-green-500/8',  icon: '✅', label: 'text-green-400' },
  warning:    { border: 'border-amber-500/30',   bg: 'bg-amber-500/8',  icon: '⚠️', label: 'text-amber-400' },
  suggestion: { border: 'border-blue-500/30',    bg: 'bg-blue-500/8',   icon: '💡', label: 'text-blue-400' },
};

function getBmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-400' };
  if (bmi < 25)   return { label: 'Healthy', color: 'text-green-400' };
  if (bmi < 30)   return { label: 'Overweight', color: 'text-amber-400' };
  return { label: 'Obese', color: 'text-red-400' };
}

function WeightChart({ entries }: { entries: WeightEntry[] }) {
  if (entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date)).slice(-20);
  const weights = sorted.map(e => Number(e.weight_kg));
  const rawMin = Math.min(...weights);
  const rawMax = Math.max(...weights);
  const spread = rawMax - rawMin || 1;
  const min = rawMin - spread * 0.4;
  const max = rawMax + spread * 0.4;
  const W = 500, H = 130;
  const PAD = { left: 40, right: 16, top: 12, bottom: 28 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const px = (i: number) => PAD.left + (sorted.length === 1 ? cW / 2 : (i / (sorted.length - 1)) * cW);
  const py = (w: number) => PAD.top + cH - ((w - min) / (max - min)) * cH;
  const d = sorted.map((e, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(Number(e.weight_kg)).toFixed(1)}`).join(' ');
  const gridVals = [rawMin, (rawMin + rawMax) / 2, rawMax];
  const n = sorted.length;
  const labelIdxs = n <= 3 ? sorted.map((_, i) => i) : [0, Math.floor((n - 1) / 2), n - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 130 }}>
      <defs>
        <linearGradient id="wgrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {gridVals.map((v, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={py(v)} x2={W - PAD.right} y2={py(v)} stroke="#1e293b" strokeWidth={1} />
          <text x={PAD.left - 5} y={py(v)} textAnchor="end" dominantBaseline="middle" fill="#475569" fontSize={9}>{v.toFixed(1)}</text>
        </g>
      ))}
      <path d={`${d} L${px(sorted.length - 1)},${PAD.top + cH} L${px(0)},${PAD.top + cH} Z`} fill="url(#wgrad)" />
      <path d={d} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {sorted.map((e, i) => (
        <circle key={e.id} cx={px(i)} cy={py(Number(e.weight_kg))} r={sorted.length > 15 ? 2.5 : 4}
          fill="#0f172a" stroke="#3b82f6" strokeWidth={2} />
      ))}
      {labelIdxs.map(i => (
        <text key={i} x={px(i)} y={H - 5} textAnchor="middle" fill="#475569" fontSize={9}>
          {new Date(sorted[i].date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </text>
      ))}
    </svg>
  );
}

function CaloriesChart({ dayCalMap, goal, days }: { dayCalMap: Record<string, number>; goal: number; days: string[] }) {
  const n = days.length;
  const W = 500, H = 130;
  const PAD = { left: 40, right: 12, top: 16, bottom: 28 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const vals = days.map(d => dayCalMap[d] ?? 0);
  const maxVal = Math.max(goal * 1.25, ...vals, 1);
  const slotW = cW / n;
  const barW = Math.max(slotW * 0.72, 2);
  const goalY = PAD.top + cH * (1 - goal / maxVal);
  const gridVals = [0, Math.round(goal / 2), goal, Math.round(maxVal)];
  // Show ~6 labels regardless of period
  const labelEvery = n <= 7 ? 1 : n <= 30 ? 7 : 15;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 130 }}>
      {gridVals.map((v, i) => {
        const y = PAD.top + cH * (1 - v / maxVal);
        return (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#1e293b" strokeWidth={1} />
            <text x={PAD.left - 5} y={y} textAnchor="end" dominantBaseline="middle" fill="#475569" fontSize={9}>
              {v > 999 ? `${(v / 1000).toFixed(1)}k` : v}
            </text>
          </g>
        );
      })}
      <line x1={PAD.left} y1={goalY} x2={W - PAD.right} y2={goalY}
        stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5,4" opacity={0.7} />
      <text x={W - PAD.right + 2} y={goalY} dominantBaseline="middle" fill="#3b82f6" fontSize={8} opacity={0.8}>goal</text>

      {days.map((date, i) => {
        const cal = dayCalMap[date] ?? 0;
        const x = PAD.left + i * slotW + slotW / 2 - barW / 2;
        const barH = cal > 0 ? Math.max((cal / maxVal) * cH, 3) : 3;
        const y = PAD.top + cH - barH;
        const over = cal > goal;
        const fill = cal === 0 ? '#1e293b' : over ? '#ef4444' : '#22c55e';
        const showLabel = i % labelEvery === 0 || i === n - 1;
        const label = new Date(date + 'T00:00:00').toLocaleDateString(undefined,
          n <= 7 ? { weekday: 'narrow' } : { month: 'short', day: 'numeric' });

        return (
          <g key={date}>
            <rect x={x} y={y} width={barW} height={barH} fill={fill} rx={n > 30 ? 1 : 3}
              opacity={cal === 0 ? 0.4 : 0.9} />
            {showLabel && (
              <text x={x + barW / 2} y={H - 6} textAnchor="middle" fill="#475569" fontSize={n <= 7 ? 9 : 8}>{label}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function WorkoutBars({ workoutEntries, days }: { workoutEntries: WorkoutEntry[]; days: string[] }) {
  const n = days.length;
  const byDay: Record<string, number> = {};
  workoutEntries.forEach(w => { byDay[w.date] = (byDay[w.date] ?? 0) + w.duration; });
  const max = Math.max(...Object.values(byDay), 30);

  // For 30d/3m: compact dot grid
  if (n > 7) {
    const cols = n <= 30 ? 10 : 13;
    const rows = Math.ceil(n / cols);
    return (
      <div>
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {days.map(date => {
            const mins = byDay[date] ?? 0;
            const intensity = mins === 0 ? 0 : mins < 30 ? 1 : mins < 60 ? 2 : 3;
            const colors = ['bg-slate-800', 'bg-violet-500/40', 'bg-violet-500/70', 'bg-violet-500'];
            return (
              <div key={date} title={mins > 0 ? `${new Date(date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${mins} min` : undefined}
                className={`aspect-square rounded-sm ${colors[intensity]}`} />
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] text-slate-600">Less</span>
          {['bg-slate-800', 'bg-violet-500/40', 'bg-violet-500/70', 'bg-violet-500'].map((c, i) => (
            <div key={i} className={`w-2.5 h-2.5 rounded-sm ${c}`} />
          ))}
          <span className="text-[10px] text-slate-600">More</span>
        </div>
      </div>
    );
  }

  // 7D: original bar design
  return (
    <div className="flex items-end gap-1.5 h-14">
      {days.map(date => {
        const mins = byDay[date] ?? 0;
        const pct = mins > 0 ? Math.max((mins / max) * 100, 12) : 0;
        const day = new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'narrow' });
        return (
          <div key={date} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex flex-col justify-end" style={{ height: 44 }}>
              {mins > 0 ? (
                <div className="w-full rounded-t-sm bg-violet-500/80 transition-all duration-500" style={{ height: `${pct}%` }} title={`${mins} min`} />
              ) : (
                <div className="w-full rounded-t-sm bg-slate-800" style={{ height: 4 }} />
              )}
            </div>
            <span className="text-[9px] text-slate-600">{day}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function ProgressPage() {
  const { user, profile, loading: authLoading, t } = useAuth();
  const supabase = createClient();
  const today = getTodayDate();

  const [period, setPeriod] = useState<Period>('7d');
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutEntry[]>([]);
  const [userStats, setUserStats] = useState<{ goal?: string; custom_goal_text?: string; height_cm?: number } | null>(null);
  const [goalWeight, setGoalWeight] = useState<number | null>(null);
  const [goalInput, setGoalInput] = useState('');
  const [editingGoal, setEditingGoal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [showWeightForm, setShowWeightForm] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [saving, setSaving] = useState(false);

  const [insights, setInsights] = useState<Insight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsFetched, setInsightsFetched] = useState(false);

  const periodDays = getLastNDays(PERIOD_N[period]);
  const startDate = periodDays[0];

  const fetchData = useCallback(async () => {
    if (!user) return;
    const cacheKey = `progress_${user.id}_${period}_${startDate}`;
    type ProgCache = { w: WeightEntry[]; f: FoodEntry[]; wo: WorkoutEntry[]; s: { goal?: string; custom_goal_text?: string; height_cm?: number } | null };
    const cached = getCached<ProgCache>(cacheKey);
    if (cached) {
      setWeightEntries(cached.w);
      setFoodEntries(cached.f);
      setWorkoutEntries(cached.wo);
      setUserStats(cached.s);
      setLoading(false);
      return;
    }
    setLoading(true);
    const weightLimit = period === '3m' ? 90 : period === '30d' ? 30 : 20;
    const [w, f, wo, s] = await Promise.all([
      supabase.from('weight_entries').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(weightLimit),
      supabase.from('food_entries').select('*').eq('user_id', user.id).gte('date', startDate).lte('date', today),
      supabase.from('workout_entries').select('*').eq('user_id', user.id).gte('date', startDate).lte('date', today),
      supabase.from('user_stats').select('goal, custom_goal_text, height_cm').eq('user_id', user.id).maybeSingle(),
    ]);
    const wData = (w.data ?? []) as WeightEntry[];
    const fData = (f.data ?? []) as FoodEntry[];
    const woData = (wo.data ?? []) as WorkoutEntry[];
    const sData = s.data ?? null;
    setCached(cacheKey, { w: wData, f: fData, wo: woData, s: sData });
    setWeightEntries(wData);
    setFoodEntries(fData);
    setWorkoutEntries(woData);
    setUserStats(sData);
    setLoading(false);
  }, [user, period]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    const stored = localStorage.getItem(`goal_weight_${user.id}`);
    if (stored) setGoalWeight(parseFloat(stored));
    fetchData();
  }, [user, authLoading, fetchData]);

  // Reset insights when period changes
  useEffect(() => {
    setInsights([]);
    setInsightsFetched(false);
  }, [period]);

  function saveGoal() {
    const val = parseFloat(goalInput);
    if (isNaN(val) || val < 30 || val > 300) return;
    setGoalWeight(val);
    localStorage.setItem(`goal_weight_${user!.id}`, String(val));
    setEditingGoal(false);
    setGoalInput('');
  }

  async function logWeight() {
    const kg = parseFloat(weightInput);
    if (!user || isNaN(kg) || kg < 20) return;
    setSaving(true);
    const { data } = await supabase.from('weight_entries').insert({
      user_id: user.id, weight_kg: kg, date: today,
    }).select().single();
    if (data) setWeightEntries(prev => [data as WeightEntry, ...prev]);
    setWeightInput(''); setShowWeightForm(false); setSaving(false);
  }

  async function fetchInsights() {
    if (!user || insightsFetched) return;
    setInsightsLoading(true);
    const dayMap: Record<string, number> = {};
    foodEntries.forEach(e => { dayMap[e.date] = (dayMap[e.date] ?? 0) + e.calories; });
    const days = Object.values(dayMap);
    const avgCalories = days.length > 0 ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : 0;
    const n = PERIOD_N[period];
    const avgCaloriesBurned = workoutEntries.length > 0
      ? Math.round(workoutEntries.reduce((s, e) => s + e.calories_burned, 0) / (n / 7)) : 0;
    const res = await fetch('/api/progress-insights', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weightEntries: weightEntries.slice(0, 10), avgCalories, avgCaloriesBurned,
        workoutsPerWeek: Math.round(workoutEntries.length / (n / 7)),
        calorieGoal: profile?.calorie_goal ?? 2000,
        goal: userStats?.goal ?? profile?.calorie_goal, name: profile?.name, tdee: null,
        customGoalText: userStats?.custom_goal_text ?? null,
        periodLabel: period === '7d' ? 'last 7 days' : period === '30d' ? 'last 30 days' : 'last 3 months',
      }),
    });
    const data = await res.json();
    setInsights(data.insights ?? []);
    setInsightsFetched(true);
    setInsightsLoading(false);
  }

  if (loading) return <ProgressSkeleton />;

  const sorted = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date));
  const latest = weightEntries[0] ?? null;
  const earliest = sorted[0] ?? null;
  const weightChange = latest && earliest && latest.id !== earliest.id
    ? (Number(latest.weight_kg) - Number(earliest.weight_kg)) : null;

  const heightCm = userStats?.height_cm ?? null;
  const bmi = latest && heightCm ? Number(latest.weight_kg) / Math.pow(heightCm / 100, 2) : null;
  const bmiCat = bmi ? getBmiCategory(bmi) : null;

  const trendEntries = weightEntries.slice(0, 8);
  let weeklyTrend: number | null = null;
  if (trendEntries.length >= 2) {
    const newest = trendEntries[0];
    const oldest = trendEntries[trendEntries.length - 1];
    const daysDiff = (new Date(newest.date).getTime() - new Date(oldest.date).getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 0) weeklyTrend = ((Number(newest.weight_kg) - Number(oldest.weight_kg)) / daysDiff) * 7;
  }

  let weeksToGoal: number | null = null;
  if (goalWeight !== null && latest && weeklyTrend !== null && weeklyTrend !== 0) {
    const diff = goalWeight - Number(latest.weight_kg);
    const weeks = diff / weeklyTrend;
    if (weeks > 0) weeksToGoal = Math.round(weeks);
  }

  const dayCalMap: Record<string, number> = {};
  foodEntries.forEach(e => { dayCalMap[e.date] = (dayCalMap[e.date] ?? 0) + e.calories; });
  const calDays = Object.values(dayCalMap);
  const avgCal = calDays.length > 0 ? Math.round(calDays.reduce((a, b) => a + b, 0) / calDays.length) : 0;
  const daysLogged = calDays.length;
  const totalBurned = workoutEntries.reduce((s, e) => s + e.calories_burned, 0);
  const goal = profile?.calorie_goal ?? 2000;
  const totalDays = PERIOD_N[period];
  const periodText = period === '7d' ? t('prog_last_7') : period === '30d' ? 'Last 30 days' : 'Last 3 months';

  return (
    <div className="space-y-5 pb-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('prog_title')}</h1>
          <p className="text-slate-400 text-sm mt-0.5">{periodText} · {daysLogged} {t('prog_subtitle_days')}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Period selector */}
          <div className="flex bg-slate-800 border border-slate-700 rounded-lg p-0.5">
            {(['7d', '30d', '3m'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
                  period === p ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}>
                {PERIOD_LABEL[p]}
              </button>
            ))}
          </div>
          <button onClick={() => setShowWeightForm(!showWeightForm)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {t('prog_log_weight')}
          </button>
        </div>
      </div>

      {/* Weight form */}
      {showWeightForm && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
          <input type="number" value={weightInput} onChange={e => setWeightInput(e.target.value)}
            placeholder="e.g. 78.4" step={0.1} min={20} autoFocus
            onKeyDown={e => e.key === 'Enter' && logWeight()}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500" />
          <span className="text-slate-400 text-sm">kg</span>
          <button onClick={logWeight} disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
            {saving ? '…' : t('prog_save')}
          </button>
          <button onClick={() => setShowWeightForm(false)} className="text-slate-500 hover:text-slate-300 text-sm px-2">✕</button>
        </div>
      )}

      {/* Weight chart card */}
      <div className="bg-slate-900 rounded-xl p-5" style={{ border: '1px solid rgba(59,130,246,0.2)', boxShadow: '0 0 24px rgba(59,130,246,0.05)' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-white">{t('prog_weight_card')}</h2>
            {latest && (
              <p className="text-xs text-slate-500 mt-0.5">
                {t('prog_last_logged')} {new Date(latest.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {latest && (
              <span className="text-2xl font-bold text-white">{Number(latest.weight_kg).toFixed(1)}<span className="text-base text-slate-400 ml-1">kg</span></span>
            )}
            {weightChange !== null && (
              <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${
                weightChange < 0 ? 'bg-green-500/15 text-green-400' :
                weightChange > 0 ? 'bg-red-500/15 text-red-400' : 'bg-slate-700 text-slate-400'
              }`}>
                {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
              </span>
            )}
          </div>
        </div>
        {weightEntries.length >= 2 ? (
          <WeightChart entries={weightEntries} />
        ) : (
          <p className="text-slate-500 text-sm py-6 text-center">
            {weightEntries.length === 0 ? t('prog_no_weight') : t('prog_need_two')}
          </p>
        )}
      </div>

      {/* BMI + Weight goal */}
      {(bmi || goalWeight !== null || latest) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {bmi && bmiCat && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-2">Body Mass Index</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-white">{bmi.toFixed(1)}</span>
                <span className={`text-sm font-medium mb-0.5 ${bmiCat.color}`}>{bmiCat.label}</span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-slate-800 overflow-hidden flex">
                <div className="flex-1 bg-blue-400 rounded-l-full" />
                <div className="flex-[2.5] bg-green-400" />
                <div className="flex-[2] bg-amber-400" />
                <div className="flex-[2] bg-red-400 rounded-r-full" />
              </div>
              <div className="relative mt-1" style={{ paddingLeft: `${Math.min(Math.max((bmi - 10) / 30 * 100, 0), 98)}%` }}>
                <div className="w-1 h-2 bg-white rounded-full" />
              </div>
              <p className="text-xs text-slate-600 mt-1">Based on your height in profile</p>
            </div>
          )}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-400">Weight goal</p>
              <button onClick={() => { setEditingGoal(true); setGoalInput(goalWeight ? String(goalWeight) : ''); }}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                {goalWeight ? 'Edit' : 'Set goal'}
              </button>
            </div>
            {editingGoal ? (
              <div className="flex gap-2">
                <input type="number" value={goalInput} onChange={e => setGoalInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveGoal()}
                  placeholder="e.g. 75" step={0.5} min={30} max={300} autoFocus
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
                <button onClick={saveGoal} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3 rounded-lg transition-colors">Save</button>
                <button onClick={() => setEditingGoal(false)} className="text-slate-500 hover:text-white text-xs px-2 transition-colors">✕</button>
              </div>
            ) : goalWeight !== null && latest ? (
              <>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-white">{goalWeight}</span>
                  <span className="text-sm text-slate-400 mb-0.5">kg target</span>
                </div>
                <p className={`text-sm font-medium mt-1 ${Number(latest.weight_kg) > goalWeight ? 'text-amber-400' : 'text-green-400'}`}>
                  {Math.abs(Number(latest.weight_kg) - goalWeight).toFixed(1)} kg {Number(latest.weight_kg) > goalWeight ? 'to lose' : 'below goal 🎉'}
                </p>
                {weeksToGoal !== null && (
                  <p className="text-xs text-slate-500 mt-1">~{weeksToGoal} weeks at current trend</p>
                )}
                {weeklyTrend !== null && weeksToGoal === null && Number(latest.weight_kg) > goalWeight && (
                  <p className="text-xs text-slate-500 mt-1">{weeklyTrend > 0 ? 'Trending away from goal' : 'Not enough data yet'}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-600 mt-1">Set a target weight to track your progress.</p>
            )}
          </div>
        </div>
      )}

      {/* Calories chart */}
      <div className="bg-slate-900 rounded-xl p-5" style={{ border: '1px solid rgba(34,197,94,0.15)', boxShadow: '0 0 20px rgba(34,197,94,0.04)' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white">{t('prog_calories_week')}</h2>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-500/80 inline-block" />{t('prog_under_goal')}</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500/80 inline-block" />{t('prog_over_goal')}</span>
          </div>
        </div>
        {daysLogged > 0 ? (
          <CaloriesChart dayCalMap={dayCalMap} goal={goal} days={periodDays} />
        ) : (
          <p className="text-slate-500 text-sm py-6 text-center">{t('prog_no_food_week')}</p>
        )}
        {avgCal > 0 && (
          <div className="flex gap-4 mt-3 pt-3 border-t border-slate-800 text-sm">
            <div>
              <span className="text-slate-500">{t('prog_avg_day')} </span>
              <span className="font-semibold text-white">{avgCal.toLocaleString()}</span>
              <span className="text-slate-500"> kcal</span>
            </div>
            <div>
              <span className="text-slate-500">{t('prog_goal_label')} </span>
              <span className={`font-semibold ${avgCal > goal ? 'text-red-400' : 'text-green-400'}`}>
                {avgCal > goal ? `+${(avgCal - goal).toLocaleString()} ${t('prog_over')}` : `${(goal - avgCal).toLocaleString()} ${t('prog_under')}`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Workout activity */}
      <div className="bg-slate-900 rounded-xl p-5" style={{ border: '1px solid rgba(139,92,246,0.18)', boxShadow: '0 0 20px rgba(139,92,246,0.04)' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white">{t('prog_workout_activity')}</h2>
          <span className="text-xs text-slate-500">{workoutEntries.length} {t('prog_sessions')} · {totalBurned.toLocaleString()} {t('prog_kcal_burned')}</span>
        </div>
        <WorkoutBars workoutEntries={workoutEntries} days={periodDays} />
        {period === '7d' && <p className="text-xs text-slate-600 mt-2">{t('prog_bar_hint')}</p>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">{t('prog_avg_cal')}</p>
          <p className="text-2xl font-bold text-white">{avgCal > 0 ? avgCal.toLocaleString() : '—'}</p>
          {avgCal > 0 && (
            <p className={`text-xs mt-1 ${avgCal > goal ? 'text-red-400' : 'text-green-400'}`}>
              {avgCal > goal ? `+${avgCal - goal} ${t('prog_over_goal')}` : `${goal - avgCal} ${t('prog_under_goal')}`}
            </p>
          )}
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">{t('prog_workouts_week')}</p>
          <p className="text-2xl font-bold text-white">{workoutEntries.length}</p>
          <p className="text-xs text-slate-500 mt-1">{totalBurned.toLocaleString()} {t('prog_kcal_burned')}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">{t('prog_days_logged')}</p>
          <p className="text-2xl font-bold text-white">{daysLogged} <span className="text-slate-500 text-lg font-normal">/ {totalDays}</span></p>
          {period === '7d' && (
            <div className="flex gap-1 mt-2">
              {periodDays.map(d => (
                <div key={d} className={`flex-1 h-1.5 rounded-full ${dayCalMap[d] ? 'bg-blue-500' : 'bg-slate-700'}`} />
              ))}
            </div>
          )}
          {period !== '7d' && (
            <p className="text-xs text-slate-600 mt-1">{Math.round((daysLogged / totalDays) * 100)}% consistency</p>
          )}
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">{t('prog_net_week')}</p>
          <p className={`text-2xl font-bold ${(avgCal * totalDays - totalBurned) > goal * totalDays ? 'text-red-400' : 'text-green-400'}`}>
            {avgCal > 0 ? (avgCal * daysLogged - totalBurned).toLocaleString() : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">{t('prog_kcal_total')}</p>
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span>✨</span>
            <h2 className="font-semibold text-white">{t('prog_ai_insights')}</h2>
          </div>
          {!insightsFetched && (
            <button onClick={fetchInsights} disabled={insightsLoading}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors disabled:text-slate-500">
              {insightsLoading ? t('prog_analysing') : t('prog_analyse')}
            </button>
          )}
          {insightsFetched && (
            <button onClick={() => { setInsightsFetched(false); setInsights([]); fetchInsights(); }}
              className="text-xs text-slate-500 hover:text-slate-300">{t('prog_refresh')}</button>
          )}
        </div>
        {!insightsFetched && !insightsLoading && (
          <div className="px-5 py-8 text-center">
            <p className="text-slate-400 text-sm">{t('prog_ai_hint')}</p>
          </div>
        )}
        {insightsLoading && (
          <div className="px-5 py-8 flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">{t('prog_reading')}</p>
          </div>
        )}
        {insights.length > 0 && (
          <div className="divide-y divide-slate-800/60">
            {insights.map((ins, i) => {
              const s = insightStyles[ins.type] ?? insightStyles.suggestion;
              return (
                <div key={i} className={`px-5 py-4 ${s.bg} border-l-2 ${s.border}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{s.icon}</span>
                    <span className={`text-xs font-semibold uppercase tracking-wide ${s.label}`}>{ins.title}</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{ins.text}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Progress photos */}
      <ProgressPhotos userId={user.id} />

      {/* Weight history */}
      {weightEntries.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800">
            <h2 className="font-semibold text-white text-sm">{t('prog_weight_history')}</h2>
          </div>
          <div className="divide-y divide-slate-800/40">
            {weightEntries.slice(0, 8).map((e, i) => (
              <div key={e.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {i === 0 && <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">{t('prog_latest_badge')}</span>}
                  <span className="text-sm text-slate-400">
                    {new Date(e.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <span className="text-sm font-medium text-white">{Number(e.weight_kg).toFixed(1)} kg</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

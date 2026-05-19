'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { getTodayDate, getLast7Days } from '@/lib/utils';
import type { WeightEntry, FoodEntry, WorkoutEntry } from '@/lib/types';

type Insight = { type: 'positive' | 'warning' | 'suggestion'; title: string; text: string };

const insightStyles = {
  positive:   { border: 'border-green-500/30',  bg: 'bg-green-500/8',  icon: '✅', label: 'text-green-400' },
  warning:    { border: 'border-amber-500/30',   bg: 'bg-amber-500/8',  icon: '⚠️', label: 'text-amber-400' },
  suggestion: { border: 'border-blue-500/30',    bg: 'bg-blue-500/8',   icon: '💡', label: 'text-blue-400' },
};

function MiniChart({ entries }: { entries: WeightEntry[] }) {
  if (entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date)).slice(-10);
  const weights = sorted.map(e => Number(e.weight_kg));
  const min = Math.min(...weights) - 0.5;
  const max = Math.max(...weights) + 0.5;
  const W = 300, H = 80;
  const px = (i: number) => (i / (sorted.length - 1)) * W;
  const py = (w: number) => H - ((w - min) / (max - min)) * H;
  const d = sorted.map((e, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(Number(e.weight_kg)).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none">
      <defs>
        <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${W},${H} L0,${H} Z`} fill="url(#wg)" />
      <path d={d} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {sorted.map((e, i) => (
        <circle key={e.id} cx={px(i)} cy={py(Number(e.weight_kg))} r="3" fill="#3b82f6" />
      ))}
    </svg>
  );
}

export default function ProgressPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const supabase = createClient();
  const today = getTodayDate();
  const last7 = getLast7Days();

  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutEntry[]>([]);
  const [userStats, setUserStats] = useState<{ goal?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Weight logging
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [saving, setSaving] = useState(false);

  // AI insights
  const [insights, setInsights] = useState<Insight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsFetched, setInsightsFetched] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    Promise.all([
      supabase.from('weight_entries').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(20),
      supabase.from('food_entries').select('*').eq('user_id', user.id).in('date', last7),
      supabase.from('workout_entries').select('*').eq('user_id', user.id).in('date', last7),
      supabase.from('user_stats').select('goal').eq('user_id', user.id).single(),
    ]).then(([w, f, wo, s]) => {
      setWeightEntries((w.data ?? []) as WeightEntry[]);
      setFoodEntries((f.data ?? []) as FoodEntry[]);
      setWorkoutEntries((wo.data ?? []) as WorkoutEntry[]);
      setUserStats(s.data ?? null);
      setLoading(false);
    });
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const avgCaloriesBurned = workoutEntries.length > 0
      ? Math.round(workoutEntries.reduce((s, e) => s + e.calories_burned, 0) / 7)
      : 0;

    const res = await fetch('/api/progress-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weightEntries: weightEntries.slice(0, 10),
        avgCalories,
        avgCaloriesBurned,
        workoutsPerWeek: workoutEntries.length,
        calorieGoal: profile?.calorie_goal ?? 2000,
        goal: userStats?.goal ?? profile?.calorie_goal,
        name: profile?.name,
        tdee: null,
      }),
    });
    const data = await res.json();
    setInsights(data.insights ?? []);
    setInsightsFetched(true);
    setInsightsLoading(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const sorted = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date));
  const latest = weightEntries[0] ?? null;
  const earliest = sorted[0] ?? null;
  const weightChange = latest && earliest && latest.id !== earliest.id
    ? (Number(latest.weight_kg) - Number(earliest.weight_kg))
    : null;

  const dayCalMap: Record<string, number> = {};
  foodEntries.forEach(e => { dayCalMap[e.date] = (dayCalMap[e.date] ?? 0) + e.calories; });
  const calDays = Object.values(dayCalMap);
  const avgCal = calDays.length > 0 ? Math.round(calDays.reduce((a, b) => a + b, 0) / calDays.length) : 0;
  const daysLogged = calDays.length;
  const totalBurned = workoutEntries.reduce((s, e) => s + e.calories_burned, 0);
  const goal = profile?.calorie_goal ?? 2000;

  return (
    <div className="space-y-5 pb-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Progress</h1>
          <p className="text-slate-400 text-sm mt-0.5">Last 7 days · {daysLogged} days logged</p>
        </div>
        <button
          onClick={() => setShowWeightForm(!showWeightForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Log weight
        </button>
      </div>

      {/* Weight form */}
      {showWeightForm && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
          <input
            type="number" value={weightInput} onChange={e => setWeightInput(e.target.value)}
            placeholder="e.g. 78.4" step={0.1} min={20} autoFocus
            onKeyDown={e => e.key === 'Enter' && logWeight()}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <span className="text-slate-400 text-sm">kg</span>
          <button onClick={logWeight} disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
            {saving ? '…' : 'Save'}
          </button>
          <button onClick={() => setShowWeightForm(false)} className="text-slate-500 hover:text-slate-300 text-sm px-2">✕</button>
        </div>
      )}

      {/* Weight card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Weight</h2>
          {weightChange !== null && (
            <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${
              weightChange < 0 ? 'bg-green-500/15 text-green-400' :
              weightChange > 0 ? 'bg-red-500/15 text-red-400' : 'bg-slate-700 text-slate-400'
            }`}>
              {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
            </span>
          )}
        </div>

        {latest ? (
          <>
            <div className="flex items-end gap-2 mb-4">
              <span className="text-4xl font-bold text-white">{Number(latest.weight_kg).toFixed(1)}</span>
              <span className="text-slate-400 mb-1">kg</span>
              <span className="text-xs text-slate-500 mb-1.5 ml-1">
                {new Date(latest.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>
            <MiniChart entries={weightEntries} />
          </>
        ) : (
          <p className="text-slate-500 text-sm py-4">No weight logged yet. Hit the button above to start tracking.</p>
        )}
      </div>

      {/* Weekly stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Avg calories / day</p>
          <p className="text-2xl font-bold text-white">{avgCal > 0 ? avgCal.toLocaleString() : '—'}</p>
          {avgCal > 0 && (
            <p className={`text-xs mt-1 ${avgCal > goal ? 'text-red-400' : 'text-green-400'}`}>
              {avgCal > goal ? `+${avgCal - goal} over goal` : `${goal - avgCal} under goal`}
            </p>
          )}
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Workouts this week</p>
          <p className="text-2xl font-bold text-white">{workoutEntries.length}</p>
          <p className="text-xs text-slate-500 mt-1">{totalBurned.toLocaleString()} kcal burned</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Days food logged</p>
          <p className="text-2xl font-bold text-white">{daysLogged} <span className="text-slate-500 text-lg font-normal">/ 7</span></p>
          <div className="flex gap-1 mt-2">
            {last7.map(d => (
              <div key={d} className={`flex-1 h-1.5 rounded-full ${dayCalMap[d] ? 'bg-blue-500' : 'bg-slate-700'}`} />
            ))}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Net this week</p>
          <p className={`text-2xl font-bold ${(avgCal * 7 - totalBurned) > goal * 7 ? 'text-red-400' : 'text-green-400'}`}>
            {avgCal > 0 ? (avgCal * daysLogged - totalBurned).toLocaleString() : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">kcal total</p>
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span>✨</span>
            <h2 className="font-semibold text-white">AI Insights</h2>
          </div>
          {!insightsFetched && (
            <button
              onClick={fetchInsights}
              disabled={insightsLoading}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors disabled:text-slate-500"
            >
              {insightsLoading ? 'Analysing…' : 'Analyse my week →'}
            </button>
          )}
          {insightsFetched && (
            <button onClick={() => { setInsightsFetched(false); setInsights([]); fetchInsights(); }}
              className="text-xs text-slate-500 hover:text-slate-300">Refresh</button>
          )}
        </div>

        {!insightsFetched && !insightsLoading && (
          <div className="px-5 py-8 text-center">
            <p className="text-slate-400 text-sm">Tap "Analyse my week" to get personalised feedback based on your data.</p>
          </div>
        )}

        {insightsLoading && (
          <div className="px-5 py-8 flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Reading your data…</p>
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

      {/* Weight history */}
      {weightEntries.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800">
            <h2 className="font-semibold text-white text-sm">Weight history</h2>
          </div>
          <div className="divide-y divide-slate-800/40">
            {weightEntries.slice(0, 8).map((e, i) => (
              <div key={e.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {i === 0 && <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">Latest</span>}
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

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { getTodayDate, getLast7Days } from '@/lib/utils';
import type { WeightEntry, FoodEntry, WorkoutEntry } from '@/lib/types';
import BorderBeam from '@/components/BorderBeam';

type Insight = { type: 'positive' | 'warning' | 'suggestion'; title: string; text: string };

const insightStyles = {
  positive:   { border: 'border-green-500/30',  bg: 'bg-green-500/8',  icon: '✅', label: 'text-green-400' },
  warning:    { border: 'border-amber-500/30',   bg: 'bg-amber-500/8',  icon: '⚠️', label: 'text-amber-400' },
  suggestion: { border: 'border-blue-500/30',    bg: 'bg-blue-500/8',   icon: '💡', label: 'text-blue-400' },
};

function WeightChart({ entries }: { entries: WeightEntry[] }) {
  if (entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date)).slice(-10);
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
  const labelIdxs = sorted.length <= 3
    ? sorted.map((_, i) => i)
    : [0, Math.floor((sorted.length - 1) / 2), sorted.length - 1];

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
          <line x1={PAD.left} y1={py(v)} x2={W - PAD.right} y2={py(v)}
            stroke="#1e293b" strokeWidth={1} />
          <text x={PAD.left - 5} y={py(v)} textAnchor="end" dominantBaseline="middle"
            fill="#475569" fontSize={9}>{v.toFixed(1)}</text>
        </g>
      ))}
      <path d={`${d} L${px(sorted.length - 1)},${PAD.top + cH} L${px(0)},${PAD.top + cH} Z`} fill="url(#wgrad)" />
      <path d={d} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {sorted.map((e, i) => (
        <circle key={e.id} cx={px(i)} cy={py(Number(e.weight_kg))} r={4}
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

function WeeklyCaloriesChart({ dayCalMap, goal, last7 }: { dayCalMap: Record<string, number>; goal: number; last7: string[] }) {
  const W = 500, H = 130;
  const PAD = { left: 40, right: 12, top: 16, bottom: 28 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const vals = last7.map(d => dayCalMap[d] ?? 0);
  const maxVal = Math.max(goal * 1.25, ...vals, 1);
  const barW = (cW / 7) * 0.55;
  const goalY = PAD.top + cH * (1 - goal / maxVal);
  const gridVals = [0, Math.round(goal / 2), goal, Math.round(maxVal)];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 130 }}>
      {gridVals.map((v, i) => {
        const y = PAD.top + cH * (1 - v / maxVal);
        return (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              stroke="#1e293b" strokeWidth={1} />
            <text x={PAD.left - 5} y={y} textAnchor="end" dominantBaseline="middle"
              fill="#475569" fontSize={9}>{v > 999 ? `${(v / 1000).toFixed(1)}k` : v}</text>
          </g>
        );
      })}
      {/* Goal dashed line */}
      <line x1={PAD.left} y1={goalY} x2={W - PAD.right} y2={goalY}
        stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5,4" opacity={0.7} />
      <text x={W - PAD.right + 2} y={goalY} dominantBaseline="middle" fill="#3b82f6" fontSize={8} opacity={0.8}>goal</text>

      {last7.map((date, i) => {
        const cal = dayCalMap[date] ?? 0;
        const slotW = cW / 7;
        const x = PAD.left + i * slotW + slotW / 2 - barW / 2;
        const barH = cal > 0 ? Math.max((cal / maxVal) * cH, 4) : 3;
        const y = PAD.top + cH - barH;
        const over = cal > goal;
        const fill = cal === 0 ? '#1e293b' : over ? '#ef4444' : '#22c55e';
        const day = new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'narrow' });

        return (
          <g key={date}>
            <rect x={x} y={y} width={barW} height={barH} fill={fill} rx={3}
              opacity={cal === 0 ? 0.5 : 0.9} />
            <text x={x + barW / 2} y={H - 6} textAnchor="middle" fill="#475569" fontSize={9}>{day}</text>
          </g>
        );
      })}
    </svg>
  );
}

function WorkoutBars({ workoutEntries, last7 }: { workoutEntries: WorkoutEntry[]; last7: string[] }) {
  const byDay: Record<string, number> = {};
  workoutEntries.forEach(w => { byDay[w.date] = (byDay[w.date] ?? 0) + w.duration; });
  const max = Math.max(...Object.values(byDay), 30);

  return (
    <div className="flex items-end gap-1.5 h-14">
      {last7.map(date => {
        const mins = byDay[date] ?? 0;
        const pct = mins > 0 ? Math.max((mins / max) * 100, 12) : 0;
        const day = new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'narrow' });
        return (
          <div key={date} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex flex-col justify-end" style={{ height: 44 }}>
              {mins > 0 ? (
                <div className="w-full rounded-t-sm bg-violet-500/80 transition-all duration-500"
                  style={{ height: `${pct}%` }} title={`${mins} min`} />
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
  const { user, profile, loading: authLoading } = useAuth();
  const supabase = createClient();
  const today = getTodayDate();
  const last7 = getLast7Days();

  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutEntry[]>([]);
  const [userStats, setUserStats] = useState<{ goal?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const [showWeightForm, setShowWeightForm] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [saving, setSaving] = useState(false);

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
      ? Math.round(workoutEntries.reduce((s, e) => s + e.calories_burned, 0) / 7) : 0;
    const res = await fetch('/api/progress-insights', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weightEntries: weightEntries.slice(0, 10), avgCalories, avgCaloriesBurned,
        workoutsPerWeek: workoutEntries.length, calorieGoal: profile?.calorie_goal ?? 2000,
        goal: userStats?.goal ?? profile?.calorie_goal, name: profile?.name, tdee: null,
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
    ? (Number(latest.weight_kg) - Number(earliest.weight_kg)) : null;

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
        <button onClick={() => setShowWeightForm(!showWeightForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Log weight
        </button>
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
            {saving ? '…' : 'Save'}
          </button>
          <button onClick={() => setShowWeightForm(false)} className="text-slate-500 hover:text-slate-300 text-sm px-2">✕</button>
        </div>
      )}

      {/* Weight chart card */}
      <div className="relative bg-slate-900 rounded-xl p-5 overflow-hidden">
        <BorderBeam color="rgba(59,130,246,0.7)" duration={9} />
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-white">Weight</h2>
            {latest && (
              <p className="text-xs text-slate-500 mt-0.5">
                Last logged {new Date(latest.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
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
            {weightEntries.length === 0
              ? 'No weight logged yet. Hit the button above to start tracking.'
              : 'Log at least 2 entries to see your trend.'}
          </p>
        )}
      </div>

      {/* Calories this week chart */}
      <div className="relative bg-slate-900 rounded-xl p-5 overflow-hidden">
        <BorderBeam color="rgba(34,197,94,0.6)" duration={11} delay={4} />
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white">Calories this week</h2>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-500/80 inline-block" />Under goal</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500/80 inline-block" />Over goal</span>
          </div>
        </div>
        {daysLogged > 0 ? (
          <WeeklyCaloriesChart dayCalMap={dayCalMap} goal={goal} last7={last7} />
        ) : (
          <p className="text-slate-500 text-sm py-6 text-center">No food logged this week yet.</p>
        )}
        {avgCal > 0 && (
          <div className="flex gap-4 mt-3 pt-3 border-t border-slate-800 text-sm">
            <div>
              <span className="text-slate-500">Avg / day </span>
              <span className="font-semibold text-white">{avgCal.toLocaleString()}</span>
              <span className="text-slate-500"> kcal</span>
            </div>
            <div>
              <span className="text-slate-500">Goal </span>
              <span className={`font-semibold ${avgCal > goal ? 'text-red-400' : 'text-green-400'}`}>
                {avgCal > goal ? `+${(avgCal - goal).toLocaleString()} over` : `${(goal - avgCal).toLocaleString()} under`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Workout activity */}
      <div className="relative bg-slate-900 rounded-xl p-5 overflow-hidden">
        <BorderBeam color="rgba(139,92,246,0.7)" duration={13} delay={7} />
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white">Workout activity</h2>
          <span className="text-xs text-slate-500">{workoutEntries.length} sessions · {totalBurned.toLocaleString()} kcal burned</span>
        </div>
        <WorkoutBars workoutEntries={workoutEntries} last7={last7} />
        <p className="text-xs text-slate-600 mt-2">Bar height = workout duration (minutes)</p>
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
            <button onClick={fetchInsights} disabled={insightsLoading}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors disabled:text-slate-500">
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

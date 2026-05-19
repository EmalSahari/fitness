'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { getTodayDate, getLast7Days } from '@/lib/utils';
import type { WorkoutEntry, WorkoutType } from '@/lib/types';
import type { TranslationKey } from '@/lib/i18n/en';
import AiPromptInput from '@/components/AiPromptInput';

const WORKOUT_TYPES: { value: WorkoutType; icon: string; labelKey: TranslationKey }[] = [
  { value: 'cardio',    icon: '🏃', labelKey: 'workout_cardio' },
  { value: 'strength',  icon: '🏋️', labelKey: 'workout_strength' },
  { value: 'hiit',      icon: '⚡', labelKey: 'workout_hiit' },
  { value: 'yoga',      icon: '🧘', labelKey: 'workout_yoga' },
  { value: 'sports',    icon: '⚽', labelKey: 'workout_sports' },
  { value: 'other',     icon: '🎯', labelKey: 'workout_other' },
];

const typeColors: Record<WorkoutType, string> = {
  cardio:   'bg-blue-500/15 text-blue-400 border-blue-500/25',
  strength: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  hiit:     'bg-red-500/15 text-red-400 border-red-500/25',
  yoga:     'bg-teal-500/15 text-teal-400 border-teal-500/25',
  sports:   'bg-green-500/15 text-green-400 border-green-500/25',
  other:    'bg-slate-500/15 text-slate-400 border-slate-500/25',
};

const DEFAULT_FORM = { name: '', type: 'cardio' as WorkoutType, duration: '', caloriesBurned: '' };

export default function WorkoutsPage() {
  const { user, loading: authLoading, t } = useAuth();
  const supabase = createClient();
  const today = getTodayDate();
  const last7 = getLast7Days();

  const [entries, setEntries] = useState<WorkoutEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // AI quick-log state
  const [aiInput, setAiInput] = useState('');
  const [aiParsing, setAiParsing] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    supabase.from('workout_entries').select('*').eq('user_id', user.id).in('date', last7)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setEntries((data ?? []) as WorkoutEntry[]); setLoading(false); });
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAiParse() {
    if (!aiInput.trim()) return;
    setAiParsing(true);
    setAiError('');
    try {
      const res = await fetch('/api/parse-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: aiInput }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setAiError(data.error ?? 'Could not estimate workout. Try being more specific.');
        setAiParsing(false);
        return;
      }
      setForm({
        name: data.name ?? aiInput,
        type: (data.type as WorkoutType) ?? 'other',
        duration: String(data.duration ?? ''),
        caloriesBurned: String(data.calories_burned ?? ''),
      });
      setAiInput('');
      setShowForm(true);
    } catch {
      setAiError('Something went wrong. Please try again.');
    }
    setAiParsing(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError(t('error_wkt_name')); return; }
    const dur = parseInt(form.duration, 10);
    if (isNaN(dur) || dur <= 0) { setError(t('error_wkt_duration')); return; }
    const cal = parseInt(form.caloriesBurned, 10);
    if (isNaN(cal) || cal < 0) { setError(t('error_wkt_calories')); return; }

    setSaving(true);
    const newEntry = { user_id: user!.id, name: form.name.trim(), type: form.type, duration: dur, calories_burned: cal, date: today };
    const { data } = await supabase.from('workout_entries').insert(newEntry).select().single();
    if (data) setEntries(prev => [data as WorkoutEntry, ...prev]);
    setForm(DEFAULT_FORM);
    setError('');
    setShowForm(false);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id));
    await supabase.from('workout_entries').delete().eq('id', id);
  }

  const todayEntries = entries.filter(e => e.date === today);
  const totalBurned = todayEntries.reduce((s, e) => s + e.calories_burned, 0);
  const totalMins = todayEntries.reduce((s, e) => s + e.duration, 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('wkt_title')}</h1>
          <p className="text-slate-400 text-sm mt-0.5">{todayEntries.length} sessions · {totalMins} {t('wkt_duration')}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          {t('wkt_log_btn')}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {([
          { val: totalBurned.toLocaleString(), label: t('wkt_kcal_burned_today'), color: 'text-green-400' },
          { val: String(totalMins),             label: t('wkt_minutes_today'),     color: 'text-blue-400' },
          { val: String(entries.length),         label: t('wkt_sessions_week'),     color: 'text-violet-400' },
        ]).map(({ val, label, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{val}</p>
            <p className="text-xs text-slate-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* AI Quick Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <AiPromptInput
          value={aiInput}
          onChange={setAiInput}
          onSubmit={handleAiParse}
          isLoading={aiParsing}
          label={t('ai_label_workout')}
          sublabel={t('ai_sublabel_workout')}
          placeholder={t('ai_placeholder_workout')}
          hint={t('ai_hint')}
        />
        {aiError && <p className="text-red-400 text-xs mt-2">{aiError}</p>}
      </div>

      {showForm && (
        <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4">{t('wkt_form_title')}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-lg">{error}</div>}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">{t('wkt_name')} *</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Morning run"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">{t('wkt_type')} *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {WORKOUT_TYPES.map(({ value, icon, labelKey }) => (
                  <button key={value} type="button" onClick={() => setForm({ ...form, type: value })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      form.type === value ? 'bg-blue-600/20 border-blue-500/50 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}>
                    <span>{icon}</span>{t(labelKey)}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">{t('wkt_duration_min')} *</label>
                <input type="number" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} placeholder="45" min={1}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">{t('wkt_calories_burned')} *</label>
                <input type="number" value={form.caloriesBurned} onChange={e => setForm({ ...form, caloriesBurned: e.target.value })} placeholder="300" min={0}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                {saving ? '…' : t('wkt_save')}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setForm(DEFAULT_FORM); setError(''); }}
                className="px-4 py-2.5 text-sm text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                {t('wkt_cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Today */}
      {todayEntries.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800"><h2 className="font-semibold text-white">{t('wkt_today')}</h2></div>
          <div className="divide-y divide-slate-800/40">
            {todayEntries.map(w => <WorkoutRow key={w.id} workout={w} onDelete={handleDelete} typeColors={typeColors} t={t} />)}
          </div>
        </div>
      )}

      {/* Past week */}
      {(() => {
        const past = entries.filter(e => e.date !== today);
        if (!past.length) return null;
        const byDate = past.reduce<Record<string, WorkoutEntry[]>>((acc, w) => {
          acc[w.date] = acc[w.date] ? [...acc[w.date], w] : [w];
          return acc;
        }, {});
        return (
          <div className="space-y-3">
            <h2 className="font-semibold text-slate-400 text-sm uppercase tracking-wide">{t('wkt_this_week')}</h2>
            {Object.entries(byDate).sort(([a], [b]) => b.localeCompare(a)).map(([date, ws]) => (
              <div key={date} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-5 py-2.5 border-b border-slate-800/60 bg-slate-800/30">
                  <p className="text-xs font-medium text-slate-400">{new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                </div>
                <div className="divide-y divide-slate-800/40">
                  {ws.map(w => <WorkoutRow key={w.id} workout={w} onDelete={handleDelete} typeColors={typeColors} t={t} />)}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {entries.length === 0 && !showForm && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
          <div className="text-4xl mb-3">💪</div>
          <p className="text-slate-300 font-medium">{t('wkt_empty_title')}</p>
          <p className="text-slate-500 text-sm mt-1">{t('wkt_empty_sub')}</p>
        </div>
      )}
    </div>
  );
}

function WorkoutRow({ workout, onDelete, typeColors, t }: { workout: WorkoutEntry; onDelete: (id: string) => void; typeColors: Record<WorkoutType, string>; t: (k: TranslationKey) => string }) {
  const typeInfo = WORKOUT_TYPES.find(x => x.value === workout.type) ?? WORKOUT_TYPES[5];
  return (
    <div className="px-5 py-3.5 flex items-center justify-between group">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-xl flex-shrink-0">{typeInfo.icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-200 truncate">{workout.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs px-1.5 py-0.5 rounded border ${typeColors[workout.type]}`}>{t(typeInfo.labelKey)}</span>
            <span className="text-xs text-slate-500">{workout.duration} {t('wkt_duration')}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 ml-3 flex-shrink-0">
        <div className="text-right">
          <p className="text-sm font-medium text-green-400">{workout.calories_burned} kcal</p>
          <p className="text-xs text-slate-500">{t('wkt_burned')}</p>
        </div>
        <button onClick={() => onDelete(workout.id)}
          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
    </div>
  );
}

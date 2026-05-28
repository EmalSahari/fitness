'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getTodayDate } from '@/lib/utils';
import { invalidateCache } from '@/lib/cache';
import { notifyAiUsed } from '@/components/AiUsageBadge';
import type { MealType, WorkoutType } from '@/lib/types';

type ParsedFood = { name: string; calories: number; meal_type: MealType; protein: number | null; carbs: number | null; fat: number | null };
type ParsedWorkout = { name: string; type: WorkoutType; duration: number; calories_burned: number };

export default function LogPastDayModal({ userId, onClose, onSaved }: { userId: string; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient();
  const today = getTodayDate();

  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  });
  const [description, setDescription] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [food, setFood] = useState<ParsedFood[]>([]);
  const [workouts, setWorkouts] = useState<ParsedWorkout[]>([]);
  const [parsed, setParsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  async function handleParse() {
    if (!description.trim()) return;
    setParsing(true);
    setParseError('');
    setParsed(false);
    try {
      const res = await fetch('/api/parse-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setParseError(data.error ?? 'Could not parse.'); setParsing(false); return; }
      setFood(data.food ?? []);
      setWorkouts(data.workouts ?? []);
      setParsed(true);
      notifyAiUsed();
    } catch {
      setParseError('Something went wrong.');
    }
    setParsing(false);
  }

  function updateFood(i: number, field: keyof ParsedFood, value: string | number | null) {
    setFood(prev => prev.map((f, idx) => idx === i ? { ...f, [field]: value } : f));
  }

  function updateWorkout(i: number, field: keyof ParsedWorkout, value: string | number) {
    setWorkouts(prev => prev.map((w, idx) => idx === i ? { ...w, [field]: value } : w));
  }

  async function handleSave() {
    if (food.length === 0 && workouts.length === 0) return;
    setSaving(true);
    setSaveError('');
    try {
      if (food.length > 0) {
        const { error } = await supabase.from('food_entries').insert(
          food.map(f => ({ user_id: userId, date, name: f.name, calories: f.calories, meal_type: f.meal_type, protein: f.protein, carbs: f.carbs, fat: f.fat }))
        );
        if (error) { setSaveError(error.message); setSaving(false); return; }
      }
      if (workouts.length > 0) {
        const { error } = await supabase.from('workout_entries').insert(
          workouts.map(w => ({ user_id: userId, date, name: w.name, type: w.type, duration: w.duration, calories_burned: w.calories_burned }))
        );
        if (error) { setSaveError(error.message); setSaving(false); return; }
      }
      invalidateCache('dash_', 'progress_');
      onSaved();
      onClose();
    } catch {
      setSaveError('Something went wrong.');
    }
    setSaving(false);
  }

  const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  const WORKOUT_TYPES: WorkoutType[] = ['cardio', 'strength', 'hiit', 'yoga', 'sports', 'other'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 pb-20 sm:pb-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[88vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-white">Log a past day</h2>
            <p className="text-xs text-slate-400 mt-0.5">Describe what you ate and did — AI will fill in the details</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">

          {/* Date picker */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Which day?</label>
            <input type="date" value={date} onChange={e => { setDate(e.target.value); setParsed(false); }} max={today}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">What happened?</label>
            <textarea
              value={description}
              onChange={e => { setDescription(e.target.value); setParsed(false); }}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleParse(); }}
              placeholder={`e.g. "For breakfast I had eggs and toast. Lunch was a big burger and fries. Dinner I skipped. Did about 40 min of running in the evening."`}
              rows={4}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
            />
            {parseError && <p className="text-red-400 text-xs mt-1 break-all">{parseError}</p>}
            <button onClick={handleParse} disabled={parsing || !description.trim()}
              className="mt-2 w-full bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
              {parsing
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Parsing…</>
                : '✨ Parse with AI'}
            </button>
          </div>

          {/* Parsed food entries */}
          {parsed && food.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Food ({food.length} entries)</p>
              {food.map((f, i) => (
                <div key={i} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <input value={f.name} onChange={e => updateFood(i, 'name', e.target.value)}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500" />
                    <button onClick={() => setFood(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0 mt-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-500">kcal</label>
                      <input type="number" value={f.calories} onChange={e => updateFood(i, 'calories', parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-500" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-500">protein g</label>
                      <input type="number" value={f.protein ?? ''} onChange={e => updateFood(i, 'protein', e.target.value ? parseFloat(e.target.value) : null)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-500" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-500">carbs g</label>
                      <input type="number" value={f.carbs ?? ''} onChange={e => updateFood(i, 'carbs', e.target.value ? parseFloat(e.target.value) : null)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-500" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-500">fat g</label>
                      <input type="number" value={f.fat ?? ''} onChange={e => updateFood(i, 'fat', e.target.value ? parseFloat(e.target.value) : null)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-500" />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {MEAL_TYPES.map(m => (
                      <button key={m} onClick={() => updateFood(i, 'meal_type', m)}
                        className={`flex-1 py-1 rounded-lg text-[10px] font-medium transition-colors capitalize ${f.meal_type === m ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Parsed workouts */}
          {parsed && workouts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Workouts ({workouts.length} entries)</p>
              {workouts.map((w, i) => (
                <div key={i} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <input value={w.name} onChange={e => updateWorkout(i, 'name', e.target.value)}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500" />
                    <button onClick={() => setWorkouts(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0 mt-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-500">duration (min)</label>
                      <input type="number" value={w.duration} onChange={e => updateWorkout(i, 'duration', parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-500" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-500">kcal burned</label>
                      <input type="number" value={w.calories_burned} onChange={e => updateWorkout(i, 'calories_burned', parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-500" />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {WORKOUT_TYPES.map(t => (
                      <button key={t} onClick={() => updateWorkout(i, 'type', t)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors capitalize ${w.type === t ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {parsed && food.length === 0 && workouts.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-4">Nothing was detected. Try describing your meals and activities in more detail.</p>
          )}
        </div>

        {/* Footer */}
        {parsed && (food.length > 0 || workouts.length > 0) && (
          <div className="px-5 py-4 border-t border-slate-800 flex-shrink-0 space-y-2">
            {saveError && <p className="text-red-400 text-xs text-center">{saveError}</p>}
            <button onClick={handleSave} disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
              {saving
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
                : `Save ${food.length + workouts.length} entr${food.length + workouts.length === 1 ? 'y' : 'ies'} for ${new Date(date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

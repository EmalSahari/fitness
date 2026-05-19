'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { getTodayDate } from '@/lib/utils';
import type { FoodEntry, MealType } from '@/lib/types';
import AiPromptInput from '@/components/AiPromptInput';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const mealColors: Record<MealType, string> = {
  breakfast: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  lunch: 'bg-green-500/20 text-green-400 border-green-500/30',
  dinner: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  snack: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

const mealIcons: Record<MealType, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };

const DEFAULT_FORM = { name: '', calories: '', mealType: 'lunch' as MealType, protein: '', carbs: '', fat: '' };

export default function FoodPage() {
  const { user, loading: authLoading, t } = useAuth();
  const supabase = createClient();
  const today = getTodayDate();

  const [entries, setEntries] = useState<FoodEntry[]>([]);
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
    supabase.from('food_entries').select('*').eq('user_id', user.id).eq('date', today)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setEntries((data ?? []) as FoodEntry[]); setLoading(false); });
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAiParse() {
    if (!aiInput.trim()) return;
    setAiParsing(true);
    setAiError('');
    try {
      const res = await fetch('/api/parse-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: aiInput }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setAiError(data.error ?? 'Could not estimate nutrition. Try being more specific.');
        setAiParsing(false);
        return;
      }
      setForm({
        name: data.name ?? aiInput,
        calories: String(data.calories ?? ''),
        mealType: (data.meal_type as MealType) ?? 'lunch',
        protein: data.protein != null ? String(data.protein) : '',
        carbs: data.carbs != null ? String(data.carbs) : '',
        fat: data.fat != null ? String(data.fat) : '',
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
    if (!form.name.trim()) { setError(t('error_name_required')); return; }
    const cal = parseInt(form.calories, 10);
    if (isNaN(cal) || cal < 0) { setError(t('error_invalid_calories')); return; }

    setSaving(true);
    const newEntry = {
      user_id: user!.id,
      name: form.name.trim(),
      calories: cal,
      meal_type: form.mealType,
      protein: form.protein ? parseFloat(form.protein) : null,
      carbs: form.carbs ? parseFloat(form.carbs) : null,
      fat: form.fat ? parseFloat(form.fat) : null,
      date: today,
    };
    const { data } = await supabase.from('food_entries').insert(newEntry).select().single();
    if (data) setEntries(prev => [data as FoodEntry, ...prev]);
    setForm(DEFAULT_FORM);
    setError('');
    setShowForm(false);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id));
    await supabase.from('food_entries').delete().eq('id', id);
  }

  const totalCal = entries.reduce((s, e) => s + e.calories, 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('food_title')}</h1>
          <p className="text-slate-400 text-sm mt-0.5">{new Date().toLocaleDateString()} — {totalCal.toLocaleString()} {t('food_subtitle_kcal')}</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setAiInput(''); setAiError(''); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          {t('food_add_btn')}
        </button>
      </div>

      {/* AI Quick Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <AiPromptInput
          value={aiInput}
          onChange={setAiInput}
          onSubmit={handleAiParse}
          isLoading={aiParsing}
          label={t('ai_label_food')}
          sublabel={t('ai_sublabel_food')}
          placeholder={t('ai_placeholder_food')}
          hint={t('ai_hint')}
        />
        {aiError && <p className="text-red-400 text-xs mt-2">{aiError}</p>}
      </div>

      {showForm && (
        <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4">{t('food_form_title')}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-lg">{error}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">{t('food_name')} *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Chicken salad"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">{t('food_calories')} *</label>
                <input type="number" value={form.calories} onChange={e => setForm({ ...form, calories: e.target.value })} placeholder="350" min={0}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">{t('food_meal_type')} *</label>
                <select value={form.mealType} onChange={e => setForm({ ...form, mealType: e.target.value as MealType })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
                  {MEAL_TYPES.map(mt => <option key={mt} value={mt}>{mealIcons[mt]} {t(`meal_${mt}` as const)}</option>)}
                </select>
              </div>
            </div>
            <details className="group" open={!!(form.protein || form.carbs || form.fat)}>
              <summary className="text-sm text-slate-400 cursor-pointer hover:text-slate-300 list-none flex items-center gap-1.5">
                <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                {t('food_macros')}
              </summary>
              <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 mt-3">
                {(['protein', 'carbs', 'fat'] as const).map(macro => (
                  <div key={macro}>
                    <label className="block text-xs font-medium text-slate-400 mb-1">{t(`food_${macro}_g` as const)}</label>
                    <input type="number" placeholder="0" value={form[macro]} onChange={e => setForm({ ...form, [macro]: e.target.value })} min={0} step={0.1}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500" />
                  </div>
                ))}
              </div>
            </details>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                {saving ? '…' : t('food_save')}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setForm(DEFAULT_FORM); setError(''); }}
                className="px-4 py-2.5 text-sm text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                {t('food_cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {entries.length === 0 && !showForm ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
          <div className="text-4xl mb-3">🥗</div>
          <p className="text-slate-300 font-medium">{t('food_empty_title')}</p>
          <p className="text-slate-500 text-sm mt-1">{t('food_empty_sub')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {MEAL_TYPES.map(mealType => {
            const group = entries.filter(e => e.meal_type === mealType);
            if (!group.length) return null;
            return (
              <div key={mealType} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span>{mealIcons[mealType]}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${mealColors[mealType]}`}>{t(`meal_${mealType}` as const)}</span>
                  </div>
                  <span className="text-sm text-slate-400">{group.reduce((s, e) => s + e.calories, 0)} kcal</span>
                </div>
                <div className="divide-y divide-slate-800/40">
                  {group.map(entry => (
                    <div key={entry.id} className="px-5 py-3 flex items-start justify-between group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{entry.name}</p>
                        {(entry.protein != null || entry.carbs != null || entry.fat != null) && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {entry.protein != null && `P: ${entry.protein}g`}
                            {entry.carbs != null && ` · C: ${entry.carbs}g`}
                            {entry.fat != null && ` · F: ${entry.fat}g`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                        <span className="text-sm font-medium text-white">{entry.calories} kcal</span>
                        <button onClick={() => handleDelete(entry.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-300">{t('food_daily_total')}</span>
            <span className="font-bold text-white">{totalCal.toLocaleString()} kcal</span>
          </div>
        </div>
      )}
    </div>
  );
}

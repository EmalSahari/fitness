'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { getTodayDate } from '@/lib/utils';
import type { FoodEntry, FoodIngredient, MealType } from '@/lib/types';
import AiPromptInput from '@/components/AiPromptInput';
import BarcodeScanner from '@/components/BarcodeScanner';
import MealBuilder from '@/components/MealBuilder';
import { FoodSkeleton } from '@/components/Skeleton';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const mealColors: Record<MealType, string> = {
  breakfast: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  lunch: 'bg-green-500/20 text-green-400 border-green-500/30',
  dinner: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  snack: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

const mealIcons: Record<MealType, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };

const DEFAULT_FORM = { name: '', calories: '', mealType: 'lunch' as MealType, protein: '', carbs: '', fat: '' };

type LogFood = {
  name: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  mealType: MealType;
  ingredients?: FoodIngredient[];
};

export default function FoodPage() {
  const { user, loading: authLoading, t } = useAuth();
  const supabase = createClient();
  const today = getTodayDate();

  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [recentFoods, setRecentFoods] = useState<FoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // AI quick-log state
  const [aiInput, setAiInput] = useState('');
  const [aiParsing, setAiParsing] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiConfidence, setAiConfidence] = useState<'high' | 'medium' | 'low' | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showMealBuilder, setShowMealBuilder] = useState(false);

  // Expand / edit state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<FoodEntry | null>(null);
  const [editForm, setEditForm] = useState(DEFAULT_FORM);
  const [editIngredients, setEditIngredients] = useState<FoodIngredient[]>([]);
  const [editIngInput, setEditIngInput] = useState('');
  const [editIngParsing, setEditIngParsing] = useState(false);
  const [editIngError, setEditIngError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    Promise.all([
      supabase.from('food_entries').select('*').eq('user_id', user.id).eq('date', today)
        .order('created_at', { ascending: false }),
      supabase.from('food_entries').select('*').eq('user_id', user.id).neq('date', today)
        .order('created_at', { ascending: false }).limit(60),
    ]).then(([todayRes, recentRes]) => {
      setEntries((todayRes.data ?? []) as FoodEntry[]);
      const seen = new Set<string>();
      const deduped: FoodEntry[] = [];
      for (const e of (recentRes.data ?? []) as FoodEntry[]) {
        const key = e.name.toLowerCase().trim();
        if (!seen.has(key)) { seen.add(key); deduped.push(e); }
        if (deduped.length >= 12) break;
      }
      setRecentFoods(deduped);
      setLoading(false);
    });
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  function pickRecent(food: FoodEntry) {
    setForm({
      name: food.name,
      calories: String(food.calories),
      mealType: food.meal_type,
      protein: food.protein != null ? String(food.protein) : '',
      carbs: food.carbs != null ? String(food.carbs) : '',
      fat: food.fat != null ? String(food.fat) : '',
    });
    setShowForm(true);
    setAiInput('');
    setAiError('');
  }

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
      setAiConfidence(data.confidence ?? null);
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
    setAiConfidence(null);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id));
    if (expandedId === id) setExpandedId(null);
    await supabase.from('food_entries').delete().eq('id', id);
  }

  async function handleLogFood(food: LogFood) {
    setSaving(true);
    const newEntry = {
      user_id: user!.id,
      name: food.name,
      calories: food.calories,
      meal_type: food.mealType,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      date: today,
      ingredients: food.ingredients && food.ingredients.length > 0 ? food.ingredients : null,
    };
    const { data } = await supabase.from('food_entries').insert(newEntry).select().single();
    if (data) setEntries(prev => [data as FoodEntry, ...prev]);
    setSaving(false);
  }

  function openEdit(entry: FoodEntry, e: React.MouseEvent) {
    e.stopPropagation();
    const ings = (entry.ingredients as FoodIngredient[] | null | undefined) ?? [];
    setEditingEntry(entry);
    setEditIngredients(ings);
    setEditIngInput('');
    setEditIngError('');
    setEditForm({
      name: entry.name,
      calories: String(entry.calories),
      mealType: entry.meal_type,
      protein: entry.protein != null ? String(entry.protein) : '',
      carbs: entry.carbs != null ? String(entry.carbs) : '',
      fat: entry.fat != null ? String(entry.fat) : '',
    });
  }

  function syncTotalsFromIngredients(ings: FoodIngredient[]) {
    if (ings.length === 0) return;
    const totalCals = ings.reduce((s, i) => s + i.calories, 0);
    const totalP = ings.some(i => i.protein != null) ? Math.round(ings.reduce((s, i) => s + (i.protein ?? 0), 0) * 10) / 10 : null;
    const totalC = ings.some(i => i.carbs != null) ? Math.round(ings.reduce((s, i) => s + (i.carbs ?? 0), 0) * 10) / 10 : null;
    const totalF = ings.some(i => i.fat != null) ? Math.round(ings.reduce((s, i) => s + (i.fat ?? 0), 0) * 10) / 10 : null;
    setEditForm(prev => ({
      ...prev,
      calories: String(totalCals),
      protein: totalP != null ? String(totalP) : prev.protein,
      carbs: totalC != null ? String(totalC) : prev.carbs,
      fat: totalF != null ? String(totalF) : prev.fat,
    }));
  }

  function removeEditIngredient(idx: number) {
    const next = editIngredients.filter((_, i) => i !== idx);
    setEditIngredients(next);
    syncTotalsFromIngredients(next);
  }

  async function handleAddEditIngredient() {
    if (!editIngInput.trim()) return;
    setEditIngParsing(true);
    setEditIngError('');
    try {
      const res = await fetch('/api/parse-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: editIngInput }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setEditIngError(data.error ?? 'Could not estimate nutrition.'); setEditIngParsing(false); return; }
      const next = [...editIngredients, {
        name: data.name ?? editIngInput,
        calories: data.calories ?? 0,
        protein: data.protein ?? null,
        carbs: data.carbs ?? null,
        fat: data.fat ?? null,
      }];
      setEditIngredients(next);
      syncTotalsFromIngredients(next);
      setEditIngInput('');
    } catch {
      setEditIngError('Something went wrong.');
    }
    setEditIngParsing(false);
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEntry) return;
    const cal = parseInt(editForm.calories, 10);
    if (!editForm.name.trim() || isNaN(cal)) return;
    setEditSaving(true);
    const updated = {
      name: editForm.name.trim(),
      calories: cal,
      meal_type: editForm.mealType,
      protein: editForm.protein ? parseFloat(editForm.protein) : null,
      carbs: editForm.carbs ? parseFloat(editForm.carbs) : null,
      fat: editForm.fat ? parseFloat(editForm.fat) : null,
      ingredients: editIngredients.length > 0 ? editIngredients : null,
    };
    await supabase.from('food_entries').update(updated).eq('id', editingEntry.id);
    setEntries(prev => prev.map(e => e.id === editingEntry.id ? { ...e, ...updated } : e));
    setEditingEntry(null);
    setEditSaving(false);
  }

  const totalCal = entries.reduce((s, e) => s + e.calories, 0);

  if (loading) return <FoodSkeleton />;

  return (
    <div className="space-y-5">
      {showScanner && (
        <BarcodeScanner onAdd={food => handleLogFood({ ...food, ingredients: undefined })} onClose={() => setShowScanner(false)} />
      )}
      {showMealBuilder && (
        <MealBuilder onLog={meal => handleLogFood({ ...meal, ingredients: meal.ingredients })} onClose={() => setShowMealBuilder(false)} />
      )}

      {/* Edit modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 pb-20 sm:pb-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingEntry(null)} />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
              <h2 className="font-semibold text-white">Edit entry</h2>
              <button onClick={() => setEditingEntry(null)} className="text-slate-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
              <form id="edit-form" onSubmit={handleEditSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Name</label>
                  <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" autoFocus />
                </div>

                {/* Ingredients section */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Ingredients</p>
                  {editIngredients.length > 0 ? (
                    <div className="space-y-1.5 mb-2">
                      {editIngredients.map((ing, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{ing.name}</p>
                            <p className="text-xs text-slate-500">
                              {ing.calories} kcal
                              {ing.protein != null && ` · ${ing.protein}g P`}
                              {ing.carbs != null && ` · ${ing.carbs}g C`}
                              {ing.fat != null && ` · ${ing.fat}g F`}
                            </p>
                          </div>
                          <button type="button" onClick={() => removeEditIngredient(idx)}
                            className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 mb-2">No ingredients — add some below or fill in totals manually.</p>
                  )}
                  {/* Add ingredient input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editIngInput}
                      onChange={e => setEditIngInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddEditIngredient())}
                      placeholder="e.g. 100g chicken breast"
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button type="button" onClick={handleAddEditIngredient} disabled={editIngParsing || !editIngInput.trim()}
                      className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-3 py-2 rounded-xl transition-colors flex-shrink-0">
                      {editIngParsing
                        ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                      }
                    </button>
                  </div>
                  {editIngError && <p className="text-red-400 text-xs mt-1">{editIngError}</p>}
                </div>

                {/* Totals — auto-filled from ingredients, editable */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Totals {editIngredients.length > 0 && <span className="text-blue-400/70 normal-case font-normal">(auto-calculated)</span>}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Calories</label>
                      <input type="number" value={editForm.calories} onChange={e => setEditForm({ ...editForm, calories: e.target.value })} min={0}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Meal type</label>
                      <select value={editForm.mealType} onChange={e => setEditForm({ ...editForm, mealType: e.target.value as MealType })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
                        {MEAL_TYPES.map(mt => <option key={mt} value={mt}>{mealIcons[mt]} {t(`meal_${mt}` as const)}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {(['protein', 'carbs', 'fat'] as const).map(macro => (
                      <div key={macro}>
                        <label className="block text-xs font-medium text-slate-400 mb-1 capitalize">{macro} (g)</label>
                        <input type="number" value={editForm[macro]} onChange={e => setEditForm({ ...editForm, [macro]: e.target.value })} min={0} step={0.1} placeholder="0"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-slate-800 flex gap-2 flex-shrink-0">
              <button type="submit" form="edit-form" disabled={editSaving}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-sm font-medium py-2.5 rounded-xl transition-colors">
                {editSaving ? '…' : 'Save changes'}
              </button>
              <button type="button" onClick={() => setEditingEntry(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-sm rounded-xl transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white">{t('food_title')}</h1>
          <p className="text-slate-400 text-sm mt-0.5 truncate">{new Date().toLocaleDateString()} — {totalCal.toLocaleString()} {t('food_subtitle_kcal')}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setShowScanner(true)}
            className="flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 w-9 h-9 rounded-lg transition-colors sm:w-auto sm:h-auto sm:px-3 sm:py-2 sm:gap-1.5"
            title={t('scan_btn')}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h2M4 12h2M4 18h2M18 6h2M18 12h2M18 18h2M8 4v2M12 4v2M16 4v2M8 18v2M12 18v2M16 18v2M8 8h8v8H8z" />
            </svg>
            <span className="hidden sm:inline text-sm font-medium">{t('scan_btn')}</span>
          </button>
          <button onClick={() => setShowMealBuilder(true)}
            className="flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 w-9 h-9 rounded-lg transition-colors sm:w-auto sm:h-auto sm:px-3 sm:py-2 sm:gap-1.5"
            title="Build a meal">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="hidden sm:inline text-sm font-medium">Build meal</span>
          </button>
          <button onClick={() => { setShowForm(!showForm); setAiInput(''); setAiError(''); setAiConfidence(null); }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors whitespace-nowrap">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            <span className="hidden xs:inline">{t('food_add_btn')}</span>
            <span className="xs:hidden">Log</span>
          </button>
        </div>
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

      {/* Recent foods quick-pick */}
      {recentFoods.length > 0 && !showForm && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-0.5">{t('food_recent')}</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide sm:flex-wrap">
            {recentFoods.map(food => (
              <button key={food.id} onClick={() => pickRecent(food)}
                className="flex-shrink-0 flex flex-col items-start bg-slate-900 border border-slate-800 hover:border-blue-500/40 rounded-xl px-3.5 py-2.5 text-left transition-all group">
                <span className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors max-w-[120px] truncate">{food.name}</span>
                <span className="text-xs text-slate-500 mt-0.5">{food.calories} kcal{food.protein ? ` · ${food.protein}g protein` : ''}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4">{t('food_form_title')}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-lg">{error}</div>}
            {aiConfidence === 'low' && (
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs px-3 py-2 rounded-lg flex items-start gap-2">
                <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                <span>These are AI estimates for a homemade meal — check and adjust the values if needed.</span>
              </div>
            )}
            {aiConfidence === 'medium' && (
              <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs px-3 py-2 rounded-lg flex items-start gap-2">
                <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" /></svg>
                <span>Based on a typical recipe — adjust if your portion was larger or smaller.</span>
              </div>
            )}
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
              <div className="grid grid-cols-3 gap-3 mt-3">
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
                  {group.map(entry => {
                    const isExpanded = expandedId === entry.id;
                    const hasMacros = entry.protein != null || entry.carbs != null || entry.fat != null;
                    const hasIngredients = entry.ingredients && entry.ingredients.length > 0;
                    return (
                      <div key={entry.id}>
                        {/* Tappable row */}
                        <div
                          className="px-4 py-3 flex items-center gap-3 cursor-pointer select-none active:bg-slate-800/40 transition-colors"
                          onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-200 truncate">{entry.name}</p>
                            {hasMacros && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                {entry.protein != null && `P: ${entry.protein}g`}
                                {entry.carbs != null && ` · C: ${entry.carbs}g`}
                                {entry.fat != null && ` · F: ${entry.fat}g`}
                              </p>
                            )}
                          </div>
                          <span className="text-sm font-medium text-white flex-shrink-0">{entry.calories} kcal</span>
                          <svg
                            className={`w-4 h-4 text-slate-600 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-3 border-t border-slate-800/40 bg-slate-800/20">
                            {/* Macro bars */}
                            {hasMacros && (
                              <div className="pt-3 space-y-2">
                                {entry.protein != null && (
                                  <MacroBar label="Protein" value={entry.protein} color="bg-blue-500" max={100} unit="g" />
                                )}
                                {entry.carbs != null && (
                                  <MacroBar label="Carbs" value={entry.carbs} color="bg-amber-500" max={150} unit="g" />
                                )}
                                {entry.fat != null && (
                                  <MacroBar label="Fat" value={entry.fat} color="bg-pink-500" max={80} unit="g" />
                                )}
                              </div>
                            )}

                            {/* Ingredients list */}
                            {hasIngredients && (
                              <div className="space-y-1 pt-1">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ingredients</p>
                                {(entry.ingredients as FoodIngredient[]).map((ing, i) => (
                                  <div key={i} className="flex items-center justify-between text-xs py-0.5">
                                    <span className="text-slate-300 truncate flex-1 min-w-0 mr-2">{ing.name}</span>
                                    <span className="text-slate-500 flex-shrink-0">{ing.calories} kcal
                                      {ing.protein != null && ` · P${ing.protein}g`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={e => openEdit(entry, e)}
                                className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); handleDelete(entry.id); }}
                                className="flex items-center gap-1.5 bg-slate-700 hover:bg-red-500/20 text-slate-400 hover:text-red-400 text-xs font-medium px-3 py-2 rounded-lg transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
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

function MacroBar({ label, value, color, max, unit }: { label: string; value: number; color: string; max: number; unit: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-12 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400 w-10 text-right flex-shrink-0">{value}{unit}</span>
    </div>
  );
}

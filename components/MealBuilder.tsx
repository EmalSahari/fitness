'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import BarcodeScanner from './BarcodeScanner';
import type { MealType } from '@/lib/types';

type BuilderItem = {
  id: string;
  name: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

type Props = {
  onLog: (meal: { name: string; calories: number; protein: number | null; carbs: number | null; fat: number | null; mealType: MealType; ingredients: BuilderItem[] }) => Promise<boolean>;
  onClose: () => void;
};

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const mealIcons: Record<MealType, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };

export default function MealBuilder({ onLog, onClose }: Props) {
  const { t } = useAuth();
  const [mealName, setMealName] = useState('');
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [items, setItems] = useState<BuilderItem[]>([]);
  const [textInput, setTextInput] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState('');

  const totalCal = items.reduce((s, i) => s + i.calories, 0);
  const totalProtein = items.some(i => i.protein != null)
    ? Math.round(items.reduce((s, i) => s + (i.protein ?? 0), 0) * 10) / 10 : null;
  const totalCarbs = items.some(i => i.carbs != null)
    ? Math.round(items.reduce((s, i) => s + (i.carbs ?? 0), 0) * 10) / 10 : null;
  const totalFat = items.some(i => i.fat != null)
    ? Math.round(items.reduce((s, i) => s + (i.fat ?? 0), 0) * 10) / 10 : null;

  function addItem(item: Omit<BuilderItem, 'id'>) {
    setItems(prev => [...prev, { ...item, id: crypto.randomUUID() }]);
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  async function handleParseText() {
    if (!textInput.trim()) return;
    setParsing(true);
    setParseError('');
    try {
      const res = await fetch('/api/parse-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: textInput }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setParseError(data.error ?? 'Could not estimate nutrition.');
        setParsing(false);
        return;
      }
      addItem({
        name: data.name ?? textInput,
        calories: data.calories ?? 0,
        protein: data.protein ?? null,
        carbs: data.carbs ?? null,
        fat: data.fat ?? null,
      });
      setTextInput('');
    } catch {
      setParseError('Something went wrong.');
    }
    setParsing(false);
  }

  async function handleLog() {
    if (items.length === 0) return;
    setLogging(true);
    setLogError('');
    const name = mealName.trim() || 'Homemade meal';
    const ok = await onLog({ name, calories: totalCal, protein: totalProtein, carbs: totalCarbs, fat: totalFat, mealType, ingredients: items });
    if (ok) {
      onClose();
    } else {
      setLogError('Failed to save meal. Please try again.');
      setLogging(false);
    }
  }

  if (showScanner) {
    return (
      <BarcodeScanner
        onAdd={item => { addItem(item); setShowScanner(false); }}
        onClose={() => setShowScanner(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 pb-20 sm:pb-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[80vh] sm:max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-white">Build a meal</h2>
            <p className="text-xs text-slate-400 mt-0.5">Scan or type each ingredient, then log as one meal</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">

          {/* Meal name + type */}
          <div className="space-y-2">
            <input
              type="text"
              value={mealName}
              onChange={e => setMealName(e.target.value)}
              placeholder="Meal name (e.g. Homemade Ramen)"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <div className="flex gap-1.5">
              {MEAL_TYPES.map(mt => (
                <button key={mt} onClick={() => setMealType(mt)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    mealType === mt ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}>
                  {mealIcons[mt]}
                </button>
              ))}
            </div>
          </div>

          {/* Items list */}
          {items.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ingredients</p>
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{item.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.calories} kcal
                      {item.protein != null && ` · ${item.protein}g protein`}
                      {item.carbs != null && ` · ${item.carbs}g carbs`}
                      {item.fat != null && ` · ${item.fat}g fat`}
                    </p>
                  </div>
                  <button onClick={() => removeItem(item.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}

              {/* Totals */}
              <div className="flex items-center justify-between bg-blue-600/10 border border-blue-500/25 rounded-xl px-3 py-2.5 mt-1">
                <span className="text-xs font-semibold text-blue-300 uppercase tracking-wide">Total</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-bold text-white">{totalCal} kcal</span>
                  {totalProtein != null && <span className="text-slate-400">{totalProtein}g P</span>}
                  {totalCarbs != null && <span className="text-slate-400">{totalCarbs}g C</span>}
                  {totalFat != null && <span className="text-slate-400">{totalFat}g F</span>}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-600 text-sm">
              No ingredients yet — scan a barcode or type an ingredient below
            </div>
          )}

          {/* Add ingredient */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Add ingredient</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleParseText()}
                placeholder="e.g. 100g ramen noodles, 2 eggs…"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button onClick={handleParseText} disabled={parsing || !textInput.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-3 py-2.5 rounded-xl transition-colors flex-shrink-0">
                {parsing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                )}
              </button>
              <button onClick={() => setShowScanner(true)}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-2.5 rounded-xl transition-colors flex-shrink-0"
                title="Scan barcode">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h2M4 12h2M4 18h2M18 6h2M18 12h2M18 18h2M8 4v2M12 4v2M16 4v2M8 18v2M12 18v2M16 18v2M8 8h8v8H8z" />
                </svg>
              </button>
            </div>
            {parseError && <p className="text-red-400 text-xs">{parseError}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800 flex-shrink-0 space-y-2">
          {logError && <p className="text-red-400 text-xs text-center">{logError}</p>}
          <button onClick={handleLog} disabled={items.length === 0 || logging}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
            {logging
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
              : items.length === 0 ? 'Add at least one ingredient' : `Log meal · ${totalCal} kcal`
            }
          </button>
        </div>
      </div>
    </div>
  );
}

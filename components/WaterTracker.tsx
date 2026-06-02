'use client';

import { useEffect, useState } from 'react';
import { getTodayDate } from '@/lib/utils';

const GOAL_ML = 2500;
const QUICK_AMOUNTS = [200, 250, 330, 500];

function mlToGlasses(ml: number) {
  return Math.round(ml / 250);
}

export default function WaterTracker({ date }: { date?: string }) {
  const today = getTodayDate();
  const targetDate = date || today;
  const isToday = targetDate === today;

  const [total, setTotal] = useState(0);
  const [adding, setAdding] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    fetch(`/api/water?date=${targetDate}`)
      .then(r => r.json())
      .then(d => setTotal(d.total ?? 0))
      .catch(() => {});
  }, [targetDate]);

  async function add(ml: number) {
    if (adding) return;
    setAdding(true);
    const res = await fetch('/api/water', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount_ml: ml, date: targetDate }),
    });
    if (res.ok) setTotal(prev => prev + ml);
    setAdding(false);
  }

  async function undo() {
    if (undoing || total <= 0) return;
    setUndoing(true);
    const res = await fetch('/api/water', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: targetDate }),
    });
    if (res.ok) {
      const updated = await fetch(`/api/water?date=${targetDate}`).then(r => r.json());
      setTotal(updated.total ?? 0);
    }
    setUndoing(false);
  }

  async function addCustom() {
    const ml = parseInt(customInput, 10);
    if (!ml || ml <= 0 || ml > 5000) return;
    await add(ml);
    setCustomInput('');
    setShowCustom(false);
  }

  const pct = Math.min(total / GOAL_ML, 1);
  const over = total > GOAL_ML;
  const glasses = mlToGlasses(total);
  const goalGlasses = mlToGlasses(GOAL_ML);

  const fillColor = over
    ? '#3b82f6'
    : pct >= 0.8
    ? '#22d3ee'
    : pct >= 0.5
    ? '#38bdf8'
    : '#60a5fa';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">💧</span>
          <h3 className="font-semibold text-white text-sm">Water</h3>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <span className="font-semibold text-white">{glasses}</span>
          <span>/ {goalGlasses} glasses</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct * 100}%`, background: fillColor }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{total >= 1000 ? `${(total / 1000).toFixed(1)}L` : `${total}ml`}</span>
          <span className={over ? 'text-cyan-400' : ''}>
            {over ? `${total - GOAL_ML}ml over goal ✓` : `${GOAL_ML - total}ml to go`}
          </span>
        </div>
      </div>

      {/* Glass indicators */}
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: goalGlasses }, (_, i) => (
          <div
            key={i}
            className="w-5 h-6 rounded-sm border transition-all duration-300"
            style={{
              background: i < glasses ? fillColor + '33' : 'transparent',
              borderColor: i < glasses ? fillColor : '#334155',
            }}
          />
        ))}
        {glasses > goalGlasses && (
          <span className="text-xs text-cyan-400 self-center ml-1">+{glasses - goalGlasses} extra</span>
        )}
      </div>

      {/* Quick-add buttons */}
      {isToday && (
        <div className="space-y-2">
          <div className="flex gap-1.5 flex-wrap">
            {QUICK_AMOUNTS.map(ml => (
              <button
                key={ml}
                onClick={() => add(ml)}
                disabled={adding}
                className="flex-1 min-w-[56px] bg-slate-800 hover:bg-blue-600/20 hover:border-blue-500/40 border border-slate-700 text-slate-300 hover:text-blue-300 text-xs font-medium py-1.5 px-2 rounded-lg transition-all disabled:opacity-50"
              >
                +{ml}ml
              </button>
            ))}
            <button
              onClick={() => setShowCustom(!showCustom)}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 text-xs px-2.5 py-1.5 rounded-lg transition-colors"
              title="Custom amount"
            >
              ···
            </button>
          </div>

          {showCustom && (
            <div className="flex gap-2">
              <input
                type="number"
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustom()}
                placeholder="Custom ml"
                min={1}
                max={5000}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <button
                onClick={addCustom}
                disabled={!customInput || adding}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
              >
                Add
              </button>
            </div>
          )}

          {total > 0 && (
            <button
              onClick={undo}
              disabled={undoing}
              className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Undo last
            </button>
          )}
        </div>
      )}
    </div>
  );
}

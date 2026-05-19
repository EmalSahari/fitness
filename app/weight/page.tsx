'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { getTodayDate } from '@/lib/utils';
import type { WeightEntry } from '@/lib/types';

export default function WeightPage() {
  const { user, loading: authLoading, t } = useAuth();
  const supabase = createClient();
  const today = getTodayDate();

  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [dateInput, setDateInput] = useState(today);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    supabase.from('weight_entries').select('*').eq('user_id', user.id)
      .order('date', { ascending: false })
      .then(({ data }) => { setEntries((data ?? []) as WeightEntry[]); setLoading(false); });
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const val = parseFloat(weightInput);
    if (isNaN(val) || val < 10 || val > 500) { setError(t('error_wt_invalid')); return; }

    setSaving(true);
    const { data } = await supabase.from('weight_entries').insert({
      user_id: user!.id, weight_kg: val, note: noteInput.trim() || null, date: dateInput,
    }).select().single();
    if (data) {
      const updated = [data as WeightEntry, ...entries.filter(e => e.date !== dateInput || e.id !== data.id)];
      updated.sort((a, b) => b.date.localeCompare(a.date));
      setEntries(updated);
    }
    setWeightInput(''); setNoteInput(''); setDateInput(today);
    setShowForm(false); setSaving(false); setError('');
  }

  async function handleDelete(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id));
    await supabase.from('weight_entries').delete().eq('id', id);
  }

  const latest = entries[0];
  const first = entries.length > 1 ? entries[entries.length - 1] : null;
  const totalChange = latest && first ? (latest.weight_kg - first.weight_kg) : null;

  // Build chart data (last 30 entries)
  const chartData = [...entries].reverse().slice(-30);
  const chartMin = chartData.length > 0 ? Math.min(...chartData.map(e => e.weight_kg)) - 2 : 0;
  const chartMax = chartData.length > 0 ? Math.max(...chartData.map(e => e.weight_kg)) + 2 : 100;
  const chartRange = chartMax - chartMin || 1;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('wt_title')}</h1>
          <p className="text-slate-400 text-sm mt-0.5">{entries.length} weigh-ins logged</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          {t('wt_log_btn')}
        </button>
      </div>

      {/* Stats */}
      {latest && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">{t('wt_latest')}</p>
            <p className="text-2xl font-bold text-white">{latest.weight_kg}</p>
            <p className="text-xs text-slate-500">{t('wt_kg')}</p>
          </div>
          {totalChange !== null && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-400 mb-1">{t('wt_change')}</p>
              <p className={`text-2xl font-bold ${totalChange < 0 ? 'text-green-400' : totalChange > 0 ? 'text-red-400' : 'text-white'}`}>
                {totalChange > 0 ? '+' : ''}{totalChange.toFixed(1)}
              </p>
              <p className="text-xs text-slate-500">{t('wt_kg')} {t('wt_from_start')}</p>
            </div>
          )}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">Total logs</p>
            <p className="text-2xl font-bold text-violet-400">{entries.length}</p>
            <p className="text-xs text-slate-500">weigh-ins</p>
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length >= 2 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4">Progress chart</h2>
          <div className="relative h-32">
            <svg viewBox={`0 0 ${Math.max(chartData.length - 1, 1) * 30} 100`} className="w-full h-full" preserveAspectRatio="none">
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map(y => (
                <line key={y} x1="0" y1={y} x2={(chartData.length - 1) * 30} y2={y} stroke="#1e293b" strokeWidth="0.5" />
              ))}
              {/* Area fill */}
              <defs>
                <linearGradient id="wt-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon
                fill="url(#wt-grad)"
                points={[
                  ...chartData.map((e, i) => `${i * 30},${100 - ((e.weight_kg - chartMin) / chartRange) * 100}`),
                  `${(chartData.length - 1) * 30},100`, `0,100`,
                ].join(' ')}
              />
              {/* Line */}
              <polyline
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={chartData.map((e, i) => `${i * 30},${100 - ((e.weight_kg - chartMin) / chartRange) * 100}`).join(' ')}
              />
              {/* Dots */}
              {chartData.map((e, i) => (
                <circle key={e.id} cx={i * 30} cy={100 - ((e.weight_kg - chartMin) / chartRange) * 100} r="3" fill="#3b82f6" />
              ))}
            </svg>
            {/* Y labels */}
            <div className="absolute right-0 top-0 h-full flex flex-col justify-between text-right pr-1 pointer-events-none">
              <span className="text-xs text-slate-500">{chartMax.toFixed(1)}</span>
              <span className="text-xs text-slate-500">{chartMin.toFixed(1)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Log form */}
      {showForm && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4">{t('wt_form_title')}</h2>
          <form onSubmit={handleSave} className="space-y-4">
            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-lg">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">{t('wt_weight_kg')} *</label>
                <input type="number" value={weightInput} onChange={e => setWeightInput(e.target.value)} placeholder="75.5" step={0.1} min={10} max={500}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
                <input type="date" value={dateInput} onChange={e => setDateInput(e.target.value)} max={today}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">{t('wt_note')}</label>
              <input type="text" value={noteInput} onChange={e => setNoteInput(e.target.value)} placeholder={t('wt_note_placeholder')}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                {saving ? '…' : t('wt_save')}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setWeightInput(''); setNoteInput(''); setError(''); }}
                className="px-4 py-2.5 text-sm text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                {t('wt_cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* History */}
      {entries.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
          <div className="text-4xl mb-3">⚖️</div>
          <p className="text-slate-300 font-medium">{t('wt_empty_title')}</p>
          <p className="text-slate-500 text-sm mt-1">{t('wt_empty_sub')}</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h2 className="font-semibold text-white">{t('wt_history')}</h2>
          </div>
          <div className="divide-y divide-slate-800/40">
            {entries.map((entry, idx) => {
              const prev = entries[idx + 1];
              const diff = prev ? entry.weight_kg - prev.weight_kg : null;
              return (
                <div key={entry.id} className="px-5 py-3 flex items-center justify-between group">
                  <div>
                    <p className="text-sm font-medium text-white">{entry.weight_kg} {t('wt_kg')}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-slate-500">{new Date(entry.date + 'T00:00:00').toLocaleDateString()}</p>
                      {entry.note && <p className="text-xs text-slate-600">· {entry.note}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {diff !== null && (
                      <span className={`text-sm font-medium ${diff < 0 ? 'text-green-400' : diff > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)} {t('wt_kg')}
                      </span>
                    )}
                    <button onClick={() => handleDelete(entry.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

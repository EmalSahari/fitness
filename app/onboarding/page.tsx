'use client';

import React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { calculateTDEE, calorieGoalFromGoal } from '@/lib/utils';
import type { Sex, ActivityLevel, FitnessGoal } from '@/lib/types';

type Step = 1 | 2 | 3;

const ACTIVITY_OPTIONS: { value: ActivityLevel; emoji: string; label: string; desc: string }[] = [
  { value: 'sedentary',   emoji: '🪑', label: 'Sedentary',       desc: 'Desk job, little or no exercise' },
  { value: 'light',       emoji: '🚶', label: 'Lightly active',   desc: 'Light exercise 1–3 days/week' },
  { value: 'moderate',    emoji: '🏃', label: 'Moderately active',desc: 'Moderate exercise 3–5 days/week' },
  { value: 'active',      emoji: '💪', label: 'Very active',      desc: 'Hard exercise 6–7 days/week' },
  { value: 'very_active', emoji: '🏋️', label: 'Extra active',     desc: 'Physical job or 2× daily training' },
];

const GOAL_OPTIONS: { value: FitnessGoal; emoji: string; label: string; desc: string }[] = [
  { value: 'lose_fat',      emoji: '🔥', label: 'Lose fat',           desc: 'Calorie deficit · −500 kcal/day' },
  { value: 'build_muscle',  emoji: '💪', label: 'Build muscle',        desc: 'Calorie surplus · +300 kcal/day' },
  { value: 'maintain',      emoji: '⚖️', label: 'Maintain weight',     desc: 'Eat at maintenance calories' },
  { value: 'performance',   emoji: '⚡', label: 'Improve performance', desc: 'Fuel training · +200 kcal/day' },
];

export default function OnboardingPage() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1 fields
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [sex, setSex] = useState<Sex>('male');

  // Step 2 field
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');

  // Step 3 field
  const [goal, setGoal] = useState<FitnessGoal>('maintain');

  const tdee =
    weightKg && heightCm && age
      ? calculateTDEE(
          parseFloat(weightKg),
          parseFloat(heightCm),
          parseInt(age, 10),
          sex,
          activityLevel
        )
      : null;

  const suggestedGoal = tdee ? calorieGoalFromGoal(tdee, goal) : null;

  function validateStep1(): boolean {
    if (!name.trim()) { setError('Please enter your name.'); return false; }
    if (!age || parseInt(age) < 13 || parseInt(age) > 100) { setError('Please enter a valid age.'); return false; }
    if (!weightKg || parseFloat(weightKg) < 20) { setError('Please enter a valid weight.'); return false; }
    if (!heightCm || parseFloat(heightCm) < 100) { setError('Please enter a valid height.'); return false; }
    return true;
  }

  async function handleFinish() {
    if (!user) return;
    setLoading(true);
    setError('');

    const calorieGoal = suggestedGoal ?? 2000;

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ name: name.trim(), calorie_goal: calorieGoal, onboarded: true })
      .eq('id', user.id);

    if (profileErr) { setError(profileErr.message); setLoading(false); return; }

    // Upsert stats
    await supabase.from('user_stats').upsert({
      user_id: user.id,
      age: parseInt(age, 10),
      weight_kg: parseFloat(weightKg),
      height_cm: parseFloat(heightCm),
      sex,
      activity_level: activityLevel,
      goal,
    }, { onConflict: 'user_id' });

    // Log initial weight
    await supabase.from('weight_entries').insert({
      user_id: user.id,
      weight_kg: parseFloat(weightKg),
      note: 'Starting weight',
    });

    await refreshProfile();
    router.push('/dashboard');
  }

  const stepLabels = ['About you', 'Activity level', 'Your goal'];

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-6">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-lg font-bold text-white">FitTrack</span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          {stepLabels.map((label, i) => {
            const n = (i + 1) as Step;
            const done = step > n;
            const active = step === n;
            return (
              <React.Fragment key={label}>
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      done ? 'bg-blue-600 text-white' : active ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {done ? '✓' : n}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${active ? 'text-white' : 'text-slate-500'}`}>
                    {label}
                  </span>
                </div>
                {i < 2 && (
                  <div className={`flex-1 h-px max-w-8 ${done ? 'bg-blue-600' : 'bg-slate-800'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-7">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2.5 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white">About you</h2>
                <p className="text-slate-400 text-sm mt-0.5">We use this to calculate your daily calorie needs.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Your name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="What should we call you?"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500" autoFocus />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Age</label>
                  <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="25" min={13} max={100}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Biological sex</label>
                  <select value={sex} onChange={e => setSex(e.target.value as Sex)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Weight (kg)</label>
                  <input type="number" value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder="75" min={20} max={300} step={0.1}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Height (cm)</label>
                  <input type="number" value={heightCm} onChange={e => setHeightCm(e.target.value)} placeholder="175" min={100} max={250}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500" />
                </div>
              </div>

              <button onClick={() => { setError(''); if (validateStep1()) setStep(2); }}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors mt-2">
                Continue →
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white">How active are you day-to-day?</h2>
                <p className="text-slate-400 text-sm mt-0.5">Used to calculate your total daily energy expenditure.</p>
              </div>

              <div className="space-y-2">
                {ACTIVITY_OPTIONS.map(({ value, emoji, label, desc }) => (
                  <button key={value} onClick={() => setActivityLevel(value)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                      activityLevel === value
                        ? 'bg-blue-600/15 border-blue-500/40 text-white'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600'
                    }`}>
                    <span className="text-2xl w-8 text-center flex-shrink-0">{emoji}</span>
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-slate-500">{desc}</p>
                    </div>
                    {activityLevel === value && <div className="ml-auto w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => setStep(1)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2.5 rounded-lg text-sm transition-colors">
                  ← Back
                </button>
                <button onClick={() => setStep(3)} className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white">What is your main goal?</h2>
                <p className="text-slate-400 text-sm mt-0.5">This adjusts your calorie target accordingly.</p>
              </div>

              <div className="space-y-2">
                {GOAL_OPTIONS.map(({ value, emoji, label, desc }) => (
                  <button key={value} onClick={() => setGoal(value)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                      goal === value
                        ? 'bg-blue-600/15 border-blue-500/40 text-white'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600'
                    }`}>
                    <span className="text-2xl w-8 text-center flex-shrink-0">{emoji}</span>
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-slate-500">{desc}</p>
                    </div>
                    {goal === value && <div className="ml-auto w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                  </button>
                ))}
              </div>

              {/* TDEE summary */}
              {tdee && (
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Your estimated daily needs (TDEE)</p>
                    <p className="text-lg font-bold text-white">{tdee.toLocaleString()} kcal</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Suggested goal</p>
                    <p className="text-lg font-bold text-blue-400">{suggestedGoal?.toLocaleString()} kcal</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={() => setStep(2)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2.5 rounded-lg text-sm transition-colors">
                  ← Back
                </button>
                <button onClick={handleFinish} disabled={loading}
                  className="flex-[2] bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                  {loading ? 'Saving…' : '🚀 Start tracking'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

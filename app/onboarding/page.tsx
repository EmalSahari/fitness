'use client';

import React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { calculateTDEE, calorieGoalFromGoal, proteinGoalFromWeight } from '@/lib/utils';
import type { Sex, ActivityLevel, FitnessGoal, Language } from '@/lib/types';
import type { TranslationKey } from '@/lib/i18n/en';

type Step = 1 | 2 | 3 | 4;

const ACTIVITY_OPTIONS: { value: ActivityLevel; emoji: string; label: TranslationKey; desc: TranslationKey }[] = [
  { value: 'sedentary',   emoji: '🪑', label: 'ob_activity_sedentary',   desc: 'ob_activity_sedentary_desc' },
  { value: 'light',       emoji: '🚶', label: 'ob_activity_light',        desc: 'ob_activity_light_desc' },
  { value: 'moderate',    emoji: '🏃', label: 'ob_activity_moderate',     desc: 'ob_activity_moderate_desc' },
  { value: 'active',      emoji: '💪', label: 'ob_activity_active',       desc: 'ob_activity_active_desc' },
  { value: 'very_active', emoji: '🏋️', label: 'ob_activity_very_active',  desc: 'ob_activity_very_active_desc' },
];

const GOAL_OPTIONS: { value: FitnessGoal; emoji: string; label: TranslationKey; desc: TranslationKey }[] = [
  { value: 'lose_fat',     emoji: '🔥', label: 'ob_goal_lose_fat',      desc: 'ob_goal_lose_fat_desc' },
  { value: 'build_muscle', emoji: '💪', label: 'ob_goal_build_muscle',   desc: 'ob_goal_build_muscle_desc' },
  { value: 'maintain',     emoji: '⚖️', label: 'ob_goal_maintain',       desc: 'ob_goal_maintain_desc' },
  { value: 'performance',  emoji: '⚡', label: 'ob_goal_performance',    desc: 'ob_goal_performance_desc' },
  { value: 'custom',       emoji: '✏️', label: 'ob_goal_custom',         desc: 'ob_goal_custom_desc' },
];

const LANGUAGES: { value: Language; flag: string; label: string }[] = [
  { value: 'en', flag: '🇬🇧', label: 'English' },
  { value: 'da', flag: '🇩🇰', label: 'Dansk' },
];

export default function OnboardingPage() {
  const { user, refreshProfile, t, language, setLanguage } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [sex, setSex] = useState<Sex>('male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<FitnessGoal>('maintain');
  const [customGoalText, setCustomGoalText] = useState('');

  const tdee =
    weightKg && heightCm && age
      ? calculateTDEE(parseFloat(weightKg), parseFloat(heightCm), parseInt(age, 10), sex, activityLevel)
      : null;

  const suggestedGoal = tdee ? calorieGoalFromGoal(tdee, goal) : null;

  function validateStep1(): boolean {
    if (!name.trim()) { setError(language === 'da' ? 'Indtast venligst dit navn.' : 'Please enter your name.'); return false; }
    if (!age || parseInt(age) < 13 || parseInt(age) > 100) { setError(language === 'da' ? 'Angiv en gyldig alder.' : 'Please enter a valid age.'); return false; }
    if (!weightKg || parseFloat(weightKg) < 20) { setError(language === 'da' ? 'Angiv en gyldig vægt.' : 'Please enter a valid weight.'); return false; }
    if (!heightCm || parseFloat(heightCm) < 100) { setError(language === 'da' ? 'Angiv en gyldig højde.' : 'Please enter a valid height.'); return false; }
    return true;
  }

  async function handleFinish() {
    if (!user) return;
    setLoading(true);
    setError('');

    const calorieGoal = suggestedGoal ?? 2000;
    const proteinGoal = weightKg ? proteinGoalFromWeight(parseFloat(weightKg), goal) : 150;

    // Update core fields first, then protein_goal separately to handle schema cache lag
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ name: name.trim(), calorie_goal: calorieGoal, onboarded: true })
      .eq('id', user.id);

    if (profileErr) { setError(profileErr.message); setLoading(false); return; }

    // Best-effort — may fail if schema cache hasn't refreshed yet, non-blocking
    await supabase.from('profiles').update({ protein_goal: proteinGoal }).eq('id', user.id);

    await supabase.from('user_stats').upsert({
      user_id: user.id,
      age: parseInt(age, 10),
      weight_kg: parseFloat(weightKg),
      height_cm: parseFloat(heightCm),
      sex,
      activity_level: activityLevel,
      goal,
      ...(goal === 'custom' && customGoalText.trim() ? { custom_goal_text: customGoalText.trim() } : {}),
    }, { onConflict: 'user_id' });

    await supabase.from('weight_entries').insert({
      user_id: user.id,
      weight_kg: parseFloat(weightKg),
      note: 'Starting weight',
    });

    await refreshProfile();
    setLoading(false);
    setStep(4);
  }

  const stepLabels: TranslationKey[] = ['ob_step1', 'ob_step2', 'ob_step3'];

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

        {/* Step indicator — only shown for steps 1-3 */}
        {step < 4 && <div className="flex items-center gap-2 mb-6 justify-center">
          {stepLabels.map((labelKey, i) => {
            const n = (i + 1) as Step;
            const done = step > n;
            const active = step === n;
            return (
              <React.Fragment key={labelKey}>
                <div className="flex items-center gap-1.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    done || active ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {done ? '✓' : n}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${active ? 'text-white' : 'text-slate-500'}`}>
                    {t(labelKey)}
                  </span>
                </div>
                {i < 2 && <div className={`flex-1 h-px max-w-8 ${done ? 'bg-blue-600' : 'bg-slate-800'}`} />}
              </React.Fragment>
            );
          })}
        </div>}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-7">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2.5 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Language picker */}
              <div className="pb-2 border-b border-slate-800">
                <p className="text-xs font-medium text-slate-500 mb-2">{t('ob_language_title')}</p>
                <div className="flex gap-2">
                  {LANGUAGES.map(({ value, flag, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setLanguage(value)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        language === value
                          ? 'bg-blue-600/15 border-blue-500/40 text-blue-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-base">{flag}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-white">{t('ob_step1')}</h2>
                <p className="text-slate-400 text-sm mt-0.5">{t('ob_subtitle')}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('ob_name')}</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder={t('ob_name_placeholder')}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500" autoFocus />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('ob_age')}</label>
                  <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="25" min={13} max={100}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('ob_sex')}</label>
                  <select value={sex} onChange={e => setSex(e.target.value as Sex)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
                    <option value="male">{t('ob_sex_male')}</option>
                    <option value="female">{t('ob_sex_female')}</option>
                    <option value="other">{t('ob_sex_other')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('ob_weight_kg')}</label>
                  <input type="number" value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder="75" min={20} max={300} step={0.1}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('ob_height_cm')}</label>
                  <input type="number" value={heightCm} onChange={e => setHeightCm(e.target.value)} placeholder="175" min={100} max={250}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500" />
                </div>
              </div>

              <button onClick={() => { setError(''); if (validateStep1()) setStep(2); }}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors mt-2">
                {t('ob_continue')}
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white">{t('ob_activity_title')}</h2>
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
                      <p className="text-sm font-medium">{t(label)}</p>
                      <p className="text-xs text-slate-500">{t(desc)}</p>
                    </div>
                    {activityLevel === value && <div className="ml-auto w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setStep(1)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2.5 rounded-lg text-sm transition-colors">
                  {t('ob_back')}
                </button>
                <button onClick={() => setStep(3)} className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                  {t('ob_continue')}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4 — Pro upsell */}
          {step === 4 && (
            <div className="space-y-5 text-center">
              <div>
                <div className="text-4xl mb-3">🎉</div>
                <h2 className="text-xl font-bold text-white">You&apos;re all set{name ? `, ${name.split(' ')[0]}` : ''}!</h2>
                <p className="text-slate-400 text-sm mt-1">Your calorie goal is set to <span className="text-white font-semibold">{suggestedGoal?.toLocaleString() ?? 2000} kcal/day</span>.</p>
              </div>

              {/* Pro upsell card */}
              <div className="bg-blue-600/10 border border-blue-500/25 rounded-2xl p-5 text-left space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <span className="font-semibold text-white text-sm">Unlock Pro for unlimited AI</span>
                  <span className="ml-auto text-xs text-blue-400 font-semibold">$5.99/mo</span>
                </div>
                <div className="space-y-2">
                  {[
                    { icon: '🍽️', text: 'Unlimited AI food & workout logging' },
                    { icon: '🤖', text: 'Unlimited AI coach conversations' },
                    { icon: '📅', text: 'Log any past day with AI' },
                  ].map(f => (
                    <div key={f.text} className="flex items-center gap-2.5 text-sm text-slate-300">
                      <span className="w-4 text-center flex-shrink-0">{f.icon}</span>
                      {f.text}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500">Free plan: 10 AI actions/day · Resets at midnight</p>
              </div>

              <div className="space-y-2 pt-1">
                <UpgradeButton />
                <button onClick={() => router.push('/dashboard')}
                  className="w-full text-slate-400 hover:text-white text-sm py-2 transition-colors">
                  Start tracking for free →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white">{t('ob_goal_title')}</h2>
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
                      <p className="text-sm font-medium">{t(label)}</p>
                      <p className="text-xs text-slate-500">{t(desc)}</p>
                    </div>
                    {goal === value && <div className="ml-auto w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                  </button>
                ))}
                {goal === 'custom' && (
                  <textarea
                    value={customGoalText}
                    onChange={e => setCustomGoalText(e.target.value)}
                    placeholder={t('ob_goal_custom_placeholder')}
                    rows={2}
                    maxLength={200}
                    autoFocus
                    className="w-full bg-slate-800 border border-blue-500/40 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                )}
              </div>

              {tdee && (
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">{t('ob_tdee_label')}</p>
                    <p className="text-lg font-bold text-white">{tdee.toLocaleString()} kcal</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">{t('ob_calorie_goal_label')}</p>
                    <p className="text-lg font-bold text-blue-400">{suggestedGoal?.toLocaleString()} kcal</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={() => setStep(2)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2.5 rounded-lg text-sm transition-colors">
                  {t('ob_back')}
                </button>
                <button onClick={handleFinish} disabled={loading}
                  className="flex-[2] bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                  {loading ? '…' : t('ob_finish')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UpgradeButton() {
  const [loading, setLoading] = React.useState(false);
  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setLoading(false);
    }
  }
  return (
    <button onClick={handleUpgrade} disabled={loading}
      className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
      {loading
        ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Loading…</>
        : '✦ Upgrade to Pro — $5.99/month'
      }
    </button>
  );
}

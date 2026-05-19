'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { calculateTDEE, calorieGoalFromGoal, proteinGoalFromWeight } from '@/lib/utils';
import type { Sex, ActivityLevel, FitnessGoal, UserStats } from '@/lib/types';
import type { TranslationKey } from '@/lib/i18n/en';

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: TranslationKey; desc: TranslationKey }[] = [
  { value: 'sedentary',   label: 'ob_activity_sedentary',  desc: 'ob_activity_sedentary_desc' },
  { value: 'light',       label: 'ob_activity_light',      desc: 'ob_activity_light_desc' },
  { value: 'moderate',    label: 'ob_activity_moderate',   desc: 'ob_activity_moderate_desc' },
  { value: 'active',      label: 'ob_activity_active',     desc: 'ob_activity_active_desc' },
  { value: 'very_active', label: 'ob_activity_very_active',desc: 'ob_activity_very_active_desc' },
];

const GOAL_OPTIONS: { value: FitnessGoal; emoji: string; label: TranslationKey; desc: TranslationKey }[] = [
  { value: 'lose_fat',     emoji: '🔥', label: 'ob_goal_lose_fat',     desc: 'ob_goal_lose_fat_desc' },
  { value: 'build_muscle', emoji: '💪', label: 'ob_goal_build_muscle',  desc: 'ob_goal_build_muscle_desc' },
  { value: 'maintain',     emoji: '⚖️', label: 'ob_goal_maintain',      desc: 'ob_goal_maintain_desc' },
  { value: 'performance',  emoji: '⚡', label: 'ob_goal_performance',   desc: 'ob_goal_performance_desc' },
];

export default function AccountPage() {
  const { user, profile, t, refreshProfile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [sex, setSex] = useState<Sex>('male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<FitnessGoal>('maintain');
  const [calorieGoal, setCalorieGoal] = useState('2000');
  const [proteinGoal, setProteinGoal] = useState('150');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    if (profile) {
      setName(profile.name || '');
      setCalorieGoal(String(profile.calorie_goal || 2000));
      setProteinGoal(String(profile.protein_goal || 150));
    }

    supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        const stats = data as UserStats;
        if (stats.age)         setAge(String(stats.age));
        if (stats.weight_kg)   setWeightKg(String(stats.weight_kg));
        if (stats.height_cm)   setHeightCm(String(stats.height_cm));
        if (stats.sex)         setSex(stats.sex as Sex);
        if (stats.activity_level) setActivityLevel(stats.activity_level as ActivityLevel);
        if (stats.goal)        setGoal(stats.goal as FitnessGoal);
      });
  }, [user, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  function recalculate() {
    if (!weightKg || !heightCm || !age) return;
    const tdee = calculateTDEE(parseFloat(weightKg), parseFloat(heightCm), parseInt(age), sex, activityLevel);
    setCalorieGoal(String(calorieGoalFromGoal(tdee, goal)));
    setProteinGoal(String(proteinGoalFromWeight(parseFloat(weightKg), goal)));
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setError('');
    setSaved(false);

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        name: name.trim(),
        calorie_goal: parseInt(calorieGoal) || 2000,
        protein_goal: parseInt(proteinGoal) || 150,
      })
      .eq('id', user.id);

    if (profileErr) { setError(profileErr.message); setSaving(false); return; }

    await supabase.from('user_stats').upsert({
      user_id: user.id,
      age: age ? parseInt(age) : undefined,
      weight_kg: weightKg ? parseFloat(weightKg) : undefined,
      height_cm: heightCm ? parseFloat(heightCm) : undefined,
      sex,
      activity_level: activityLevel,
      goal,
    }, { onConflict: 'user_id' });

    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const canRecalc = !!(weightKg && heightCm && age);

  return (
    <div className="space-y-6 max-w-xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{t('acc_title')}</h1>
        <p className="text-slate-400 text-sm mt-1">{t('acc_subtitle')}</p>
      </div>

      {/* Profile */}
      <Section label={t('acc_profile_section')}>
        <Field label={t('acc_name')}>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className={input}
          />
        </Field>
        <Field label={t('acc_email')}>
          <input
            type="email"
            value={user?.email ?? ''}
            disabled
            className={`${input} opacity-50 cursor-not-allowed`}
          />
        </Field>
      </Section>

      {/* Body stats */}
      <Section label={t('acc_body_section')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t('acc_age')}>
            <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="28" min={13} max={100} className={input} />
          </Field>
          <Field label={t('acc_weight')}>
            <input type="number" value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder="75.0" step={0.1} min={20} className={input} />
          </Field>
          <Field label={t('acc_height')}>
            <input type="number" value={heightCm} onChange={e => setHeightCm(e.target.value)} placeholder="175" min={100} className={input} />
          </Field>
          <Field label={t('acc_sex')}>
            <select value={sex} onChange={e => setSex(e.target.value as Sex)} className={input}>
              <option value="male">{t('ob_sex_male')}</option>
              <option value="female">{t('ob_sex_female')}</option>
              <option value="other">{t('ob_sex_other')}</option>
            </select>
          </Field>
        </div>
      </Section>

      {/* Activity & goal */}
      <Section label={t('acc_activity_section')}>
        <Field label={t('acc_activity_level')}>
          <div className="space-y-2">
            {ACTIVITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setActivityLevel(opt.value)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                  activityLevel === opt.value
                    ? 'bg-blue-600/15 border-blue-500/40 text-blue-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                <span className="font-medium">{t(opt.label)}</span>
                <span className="text-xs text-slate-500">{t(opt.desc)}</span>
              </button>
            ))}
          </div>
        </Field>
        <Field label={t('acc_fitness_goal')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {GOAL_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setGoal(opt.value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  goal === opt.value
                    ? 'bg-blue-600/15 border-blue-500/40 text-blue-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                <span>{opt.emoji}</span>
                <div className="text-left">
                  <div>{t(opt.label)}</div>
                  <div className="text-xs text-slate-500 font-normal">{t(opt.desc)}</div>
                </div>
              </button>
            ))}
          </div>
        </Field>
      </Section>

      {/* Goals */}
      <Section label={t('acc_goals_section')}>
        {canRecalc && (
          <button
            type="button"
            onClick={recalculate}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors mb-3 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t('acc_recalculate')}
          </button>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t('acc_calorie_goal')}>
            <div className="relative">
              <input
                type="number"
                value={calorieGoal}
                onChange={e => setCalorieGoal(e.target.value)}
                min={1000}
                max={6000}
                className={input}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">kcal</span>
            </div>
          </Field>
          <Field label={t('acc_protein_goal')}>
            <div className="relative">
              <input
                type="number"
                value={proteinGoal}
                onChange={e => setProteinGoal(e.target.value)}
                min={30}
                max={500}
                className={input}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">g</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{t('acc_protein_hint')}</p>
          </Field>
        </div>
      </Section>

      {/* Actions */}
      {error && (
        <p className="text-red-400 text-sm">{t('acc_error')}</p>
      )}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {saving ? t('acc_saving') : saved ? (
          <>
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {t('acc_saved')}
          </>
        ) : t('acc_save')}
      </button>
    </div>
  );
}

const input = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors';

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{label}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

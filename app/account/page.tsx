'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { calculateTDEE, calorieGoalFromGoal, proteinGoalFromWeight } from '@/lib/utils';
import type { Sex, ActivityLevel, FitnessGoal, UserStats, Language } from '@/lib/types';
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
  const { user, profile, t, refreshProfile, language, setLanguage, signOut } = useAuth();
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

      {/* Push notifications */}
      <NotificationToggle t={t} />

      {/* Language + sign out — shown on mobile where sidebar isn't visible */}
      <div className="md:hidden bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setLanguage((language === 'en' ? 'da' : 'en') as Language)}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-slate-300 hover:bg-slate-800 transition-colors border-b border-slate-800"
        >
          <span className="text-base">{language === 'en' ? '🇩🇰' : '🇬🇧'}</span>
          <span>{language === 'en' ? 'Switch to Danish' : 'Skift til engelsk'}</span>
        </button>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>{t('nav_signout')}</span>
        </button>
      </div>
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

const MORNING_OPTIONS = [5,6,7,8,9,10];
const EVENING_OPTIONS = [16,17,18,19,20,21,22];

function fmt24(h: number) { return `${String(h).padStart(2,'0')}:00`; }

function NotificationToggle({ t }: { t: (k: TranslationKey) => string }) {
  const [status, setStatus] = useState<'idle' | 'enabled' | 'denied' | 'unsupported'>('idle');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [morningHour, setMorningHour] = useState(8);
  const [eveningHour, setEveningHour] = useState(19);
  const [savedMorning, setSavedMorning] = useState(8);
  const [savedEvening, setSavedEvening] = useState(19);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') { setStatus('denied'); return; }
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => {
        if (sub) {
          setStatus('enabled');
          // Load saved times from DB
          fetch('/api/push/subscribe').then(r => r.json()).then(d => {
            if (d.morning_hour) { setMorningHour(d.morning_hour); setSavedMorning(d.morning_hour); }
            if (d.evening_hour) { setEveningHour(d.evening_hour); setSavedEvening(d.evening_hour); }
          }).catch(() => {});
        } else {
          setStatus('idle');
        }
      })
    ).catch(() => setStatus('idle'));
  }, []);

  const timesChanged = morningHour !== savedMorning || eveningHour !== savedEvening;

  async function toggle() {
    setLoading(true);
    setErrorMsg('');

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      setErrorMsg('Push not configured. Contact support.');
      setLoading(false);
      return;
    }

    try {
      const swReady = Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Service worker timed out. Try reloading the page.')), 8000)),
      ]) as Promise<ServiceWorkerRegistration>;

      const reg = await swReady;
      const existing = await reg.pushManager.getSubscription();

      if (existing) {
        await existing.unsubscribe();
        await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: null }) });
        setStatus('idle');
      } else {
        const permission = await Notification.requestPermission();
        if (permission === 'denied') { setStatus('denied'); setLoading(false); return; }
        if (permission !== 'granted') {
          setErrorMsg('Permission not granted. Allow notifications in browser settings and try again.');
          setLoading(false);
          return;
        }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub, morningHour, eveningHour }),
        });
        setSavedMorning(morningHour);
        setSavedEvening(eveningHour);
        setStatus('enabled');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    }
    setLoading(false);
  }

  async function saveTimes() {
    setSaving(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub, morningHour, eveningHour }),
      });
      setSavedMorning(morningHour);
      setSavedEvening(eveningHour);
    } catch {
      setErrorMsg('Could not save times. Try again.');
    }
    setSaving(false);
  }

  if (status === 'unsupported') return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">{t('notif_title')}</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {status === 'denied'
              ? t('notif_denied')
              : status === 'enabled'
              ? `${fmt24(savedMorning)} & ${fmt24(savedEvening)}`
              : t('notif_subtitle')}
          </p>
        </div>
        {status !== 'denied' && (
          <button onClick={toggle} disabled={loading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-60 ${status === 'enabled' ? 'bg-blue-600' : 'bg-slate-600'}`}>
            {loading
              ? <span className="absolute inset-0 flex items-center justify-center"><span className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" /></span>
              : <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${status === 'enabled' ? 'translate-x-6' : 'translate-x-1'}`} />
            }
          </button>
        )}
      </div>

      {errorMsg && (
        <p className="text-xs text-red-400 mt-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{errorMsg}</p>
      )}

      {status !== 'denied' && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('notif_morning_label')}</label>
            <select
              value={morningHour}
              onChange={e => setMorningHour(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              {MORNING_OPTIONS.map(h => <option key={h} value={h}>{fmt24(h)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('notif_evening_label')}</label>
            <select
              value={eveningHour}
              onChange={e => setEveningHour(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              {EVENING_OPTIONS.map(h => <option key={h} value={h}>{fmt24(h)}</option>)}
            </select>
          </div>
        </div>
      )}

      {status === 'enabled' && timesChanged && (
        <button
          onClick={saveTimes}
          disabled={saving}
          className="mt-3 w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          {saving ? '…' : t('acc_save')}
        </button>
      )}

      {status === 'idle' && (
        <p className="text-xs text-slate-500 mt-3">{t('notif_subtitle')}</p>
      )}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

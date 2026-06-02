'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

export default function LandingClient() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  if (loading || user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">

      {/* Gradient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-20%] right-[-5%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-800/[0.08] blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 w-full flex items-center justify-between px-6 sm:px-10 py-5 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-base font-bold tracking-tight">FitTrack</span>
        </div>
        <div className="hidden sm:flex items-center gap-8 text-sm text-slate-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/auth/login" className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2">
            Log in
          </Link>
          <Link href="/auth/login" className="text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition-colors">
            Start free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 w-full px-6 sm:px-10 pt-20 pb-24">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 xl:gap-20 items-center">

          {/* Left */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-semibold px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              AI-powered fitness tracker
            </div>

            <h1 className="text-5xl sm:text-6xl xl:text-7xl font-black leading-[1.02] tracking-tight">
              Track food.<br />
              <span className="text-blue-400">Train smarter.</span><br />
              See results.
            </h1>

            <p className="text-slate-400 text-lg leading-relaxed max-w-lg">
              Describe your meal in plain words — AI logs calories and macros in seconds. Chat with a personal coach that knows your goals.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <Link href="/auth/login"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-7 py-3.5 rounded-2xl transition-colors">
                Get started free →
              </Link>
              <a href="#features"
                className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium px-7 py-3.5 rounded-2xl transition-colors">
                See features
              </a>
            </div>

            <p className="text-xs text-slate-600">No credit card. 10 free AI actions/day included.</p>

            <div className="flex items-center gap-6 pt-2 flex-wrap">
              {[['🍽️', 'AI food logging'], ['📸', 'Photo logging'], ['💧', 'Water tracking'], ['🔥', 'Streak tracker']].map(([icon, label]) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span>{icon}</span><span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — app preview cards */}
          <div className="relative h-[520px] hidden lg:block">

            {/* Calorie summary card */}
            <div className="absolute top-0 right-0 w-[300px] bg-slate-900 border border-slate-700/60 rounded-2xl p-5 shadow-2xl shadow-black/40">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Today&apos;s overview</p>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-3xl font-black text-white">1,840</p>
                  <p className="text-xs text-slate-500 mt-0.5">of 2,200 kcal</p>
                </div>
                <div className="relative w-16 h-16 flex-shrink-0">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="22" fill="none" stroke="#1e293b" strokeWidth="5" />
                    <circle cx="28" cy="28" r="22" fill="none" stroke="#2563eb" strokeWidth="5"
                      strokeDasharray="116.2 138.2" strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-blue-400">84%</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[['Protein', '142g', 'text-blue-400', 'bg-blue-500/10'], ['Carbs', '198g', 'text-orange-400', 'bg-orange-500/10'], ['Fat', '58g', 'text-pink-400', 'bg-pink-500/10']].map(([l, v, tc, bg]) => (
                  <div key={l} className={`${bg} rounded-xl py-2.5 text-center`}>
                    <p className={`text-sm font-bold ${tc}`}>{v}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* AI meal card */}
            <div className="absolute top-[250px] left-0 w-[256px] bg-slate-900 border border-slate-700/60 rounded-2xl p-4 shadow-2xl shadow-black/40">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs">✨</span>
                </div>
                <p className="text-xs font-semibold text-slate-300">AI logged your meal</p>
              </div>
              <p className="text-[11px] text-slate-500 italic mb-2.5">&ldquo;chicken with rice and salad&rdquo;</p>
              <div className="flex items-center justify-between bg-slate-800/60 rounded-xl px-3 py-2.5">
                <div>
                  <p className="text-sm font-bold text-white">Chicken &amp; rice</p>
                  <p className="text-xs text-blue-400 mt-0.5">487 kcal · 38g protein</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
              </div>
            </div>

            {/* Workout card */}
            <div className="absolute bottom-0 right-4 w-[240px] bg-slate-900 border border-slate-700/60 rounded-2xl p-4 shadow-2xl shadow-black/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center text-xl flex-shrink-0">🏃</div>
                <div>
                  <p className="text-sm font-bold text-white">Morning run</p>
                  <p className="text-xs text-slate-500 mt-0.5">32 min · <span className="text-orange-400">310 kcal</span></p>
                </div>
              </div>
            </div>

            {/* AI Coach bubble */}
            <div className="absolute top-[20px] left-[10px] w-[220px] bg-blue-950/80 border border-blue-800/40 rounded-2xl rounded-tl-sm px-3.5 py-3 shadow-xl">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-5 h-5 rounded-full bg-blue-500/30 flex items-center justify-center">
                  <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <span className="text-[10px] font-semibold text-blue-400">AI Coach</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">You&apos;re 82% to your goal. Have a protein snack before your workout 💪</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <div className="relative z-10 w-full border-y border-slate-800/60 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-7 grid grid-cols-3">
          {[['AI-powered', 'All food & workout parsing'], ['Free forever', '10 AI actions/day included'], ['Pro plan', '$5.99/month unlimited']].map(([big, small], i) => (
            <div key={big} className={`text-center ${i > 0 ? 'border-l border-slate-800' : ''}`}>
              <p className="font-extrabold text-white">{big}</p>
              <p className="text-xs text-slate-500 mt-1">{small}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section id="features" className="relative z-10 w-full px-6 sm:px-10 py-24">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Built for how you actually live.</h2>
            <p className="text-slate-400 mt-3 text-lg">No barcode hunting. No calorie math. Just describe it.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: '🍽️', title: 'AI Food Logging', desc: 'Say "pasta with chicken" and AI logs calories and macros instantly. Barcode scanner for packaged foods.', badge: null },
              { icon: '📸', title: 'Photo Logging', desc: 'Take a photo of your meal and AI identifies the food and estimates nutrition automatically.', badge: 'Pro' },
              { icon: '🤖', title: 'Personal AI Coach', desc: "Chat with a coach that knows today's food, your workouts, and your calorie goal.", badge: null },
              { icon: '💧', title: 'Water Tracking', desc: 'Hit your daily hydration goal with quick-add buttons. Tracks glasses and litres throughout the day.', badge: null },
              { icon: '⭐', title: 'Saved Meals', desc: 'Star your go-to meals for one-tap re-logging. No typing the same chicken and rice every day.', badge: null },
              { icon: '📊', title: 'Weekly Summary', desc: '7-day dot grid, avg calories, protein, and workouts — see your week at a glance on the dashboard.', badge: null },
              { icon: '🏋️', title: 'AI Workout Tracking', desc: '"30 min run" → logged with duration, type, and estimated calories burned. No templates.', badge: null },
              { icon: '🔥', title: 'Streak & Milestones', desc: 'Build a logging streak and unlock milestone badges. Next level at 7, 14, and 30 days.', badge: null },
              { icon: '🔔', title: 'Smart Reminders', desc: 'Daily push notifications to keep you on track. Morning nudge + evening calorie check-in.', badge: null },
            ].map(f => (
              <div key={f.title} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors relative">
                {f.badge && (
                  <span className="absolute top-4 right-4 bg-violet-600/30 text-violet-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">{f.badge}</span>
                )}
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 w-full px-6 sm:px-10 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Start free. Upgrade when you&apos;re ready.</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5 max-w-2xl">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-7">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Free</p>
              <p className="text-4xl font-black text-white">$0</p>
              <p className="text-xs text-slate-600 mb-7 mt-1">Forever</p>
              <ul className="space-y-3 mb-8">
                {[
                  'AI food logging, workouts & coach (10/day)',
                  'Barcode food scanner',
                  'Water & streak tracking',
                  'Saved meals & weekly summary',
                  'Progress charts & weight',
                ].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-400">
                    <svg className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth/login" className="block text-center bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm">Get started</Link>
            </div>
            <div className="bg-slate-900 border-2 border-blue-500/40 rounded-2xl p-7 relative">
              <div className="absolute top-5 right-5 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">Popular</div>
              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">Pro</p>
              <div className="flex items-end gap-1">
                <p className="text-4xl font-black text-white">$5.99</p>
                <p className="text-slate-500 text-sm mb-1.5">/ month</p>
              </div>
              <p className="text-xs text-slate-600 mb-7 mt-1">Cancel anytime</p>
              <ul className="space-y-3 mb-8">
                {['Unlimited AI actions (food, workouts & coach)', 'Photo-based AI food logging', 'Log any past day with AI', 'Everything in Free'].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth/login" className="block text-center bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors text-sm">✦ Start with Pro</Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 w-full border-t border-slate-800/50 bg-slate-900/20">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-24 text-center">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">Ready to start tracking?</h2>
          <p className="text-slate-400 mb-10 text-lg">Setup takes 2 minutes. No credit card required.</p>
          <Link href="/auth/login" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl transition-colors">
            Create your free account →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/40 w-full">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-7 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
            </div>
            <span>FitTrack © 2026</span>
            <span className="text-slate-800">·</span>
            <a href="https://www.sahari.io" target="_blank" rel="noopener noreferrer"
              className="hover:text-slate-400 transition-colors underline underline-offset-2">
              Made by sahari.io
            </a>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/auth/login" className="hover:text-slate-400 transition-colors">Log in</Link>
            <Link href="/auth/login" className="hover:text-slate-400 transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

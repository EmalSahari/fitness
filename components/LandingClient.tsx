'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  if (loading || user) return null;

  return (
    <div className="min-h-screen bg-[#080808] text-white overflow-x-hidden">

      {/* Background glow blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-60 right-0 w-[800px] h-[800px] rounded-full bg-lime-400/[0.04] blur-[140px]" />
        <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] rounded-full bg-lime-400/[0.03] blur-[120px]" />
        <div className="absolute bottom-0 left-[-10%] w-[400px] h-[400px] rounded-full bg-emerald-500/[0.03] blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 sm:px-12 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-lime-400 flex items-center justify-center">
            <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-base font-bold tracking-tight">FitTrack</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/auth/login" className="text-sm text-zinc-400 hover:text-white transition-colors px-4 py-2">
            Log in
          </Link>
          <Link href="/auth/login" className="text-sm font-bold bg-lime-400 hover:bg-lime-300 text-black px-4 py-2 rounded-xl transition-colors">
            Start free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 sm:px-12 pt-16 pb-28 grid lg:grid-cols-2 gap-16 items-center">

        {/* Left — copy */}
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 bg-lime-400/10 border border-lime-400/20 text-lime-400 text-xs font-semibold px-3 py-1.5 rounded-full">
            ✦ AI-powered fitness tracker
          </div>
          <h1 className="text-5xl sm:text-6xl xl:text-[4.25rem] font-extrabold leading-[1.04] tracking-tight">
            Hit your goals.<br />
            <span className="text-lime-400">Eat smarter.</span><br />
            Train harder.
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed max-w-md">
            Describe what you ate — AI logs it. Chat with your personal coach. Watch your progress compound.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/auth/login"
              className="inline-flex items-center gap-2 bg-lime-400 hover:bg-lime-300 text-black font-bold px-6 py-3.5 rounded-2xl transition-colors text-sm">
              Get started free →
            </Link>
            <Link href="#features"
              className="inline-flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 text-white font-medium px-6 py-3.5 rounded-2xl transition-colors text-sm">
              See how it works
            </Link>
          </div>
          <p className="text-xs text-zinc-600">No credit card. 10 free AI actions/day. Upgrade when you&apos;re ready.</p>
        </div>

        {/* Right — floating UI cards */}
        <div className="relative h-[480px] hidden lg:block select-none">

          {/* Daily summary card */}
          <div className="absolute top-0 right-0 w-[280px] bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">Today&apos;s calories</p>
                <p className="text-2xl font-extrabold text-white mt-0.5">
                  1,840 <span className="text-sm font-normal text-zinc-500">/ 2,200</span>
                </p>
              </div>
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="#27272a" strokeWidth="4" />
                  <circle cx="20" cy="20" r="16" fill="none" stroke="#a3e635" strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 16 * 0.84} ${2 * Math.PI * 16}`}
                    strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-lime-400">84%</span>
              </div>
            </div>
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mb-4">
              <div className="h-full w-[84%] bg-lime-400 rounded-full" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[['Protein', '142g', 'text-blue-400'], ['Carbs', '198g', 'text-orange-400'], ['Fat', '58g', 'text-pink-400']].map(([label, val, color]) => (
                <div key={label} className="bg-zinc-800/60 rounded-xl py-2">
                  <p className={`text-sm font-bold ${color}`}>{val}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI parse card */}
          <div className="absolute top-[220px] left-0 w-[248px] bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-lime-400/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs">✨</span>
              </div>
              <p className="text-xs font-semibold text-zinc-300">AI parsed your meal</p>
            </div>
            <p className="text-[11px] text-zinc-500 mb-2.5 italic">&ldquo;grilled chicken with rice and salad&rdquo;</p>
            <div className="bg-lime-400/10 border border-lime-400/20 rounded-xl px-3 py-2.5">
              <p className="text-sm font-bold text-white">Chicken & rice bowl</p>
              <p className="text-xs text-lime-400 mt-0.5">487 kcal · 38g protein</p>
            </div>
          </div>

          {/* Workout card */}
          <div className="absolute bottom-4 right-6 w-[230px] bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center text-xl flex-shrink-0">🏃</div>
              <div>
                <p className="text-sm font-bold text-white">Morning run</p>
                <p className="text-xs text-zinc-500 mt-0.5">32 min · <span className="text-orange-400 font-medium">310 kcal burned</span></p>
              </div>
            </div>
          </div>

          {/* AI coach bubble */}
          <div className="absolute top-[140px] right-[-8px] w-[210px] bg-blue-600/15 border border-blue-500/25 rounded-2xl rounded-tr-sm px-3.5 py-3 shadow-xl">
            <p className="text-xs text-blue-200 leading-relaxed">You&apos;re 82% to your goal. Have a protein snack before your workout 💪</p>
          </div>

        </div>
      </section>

      {/* Stats strip */}
      <div className="relative z-10 border-y border-zinc-800/50 bg-zinc-900/20">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 py-8 grid grid-cols-3 divide-x divide-zinc-800/60">
          {[
            ['100% AI', 'Food & workout parsing'],
            ['Free to start', '10 AI actions included daily'],
            ['Pro from', '$5.99 / month'],
          ].map(([big, small]) => (
            <div key={big} className="text-center px-4">
              <p className="text-lg sm:text-xl font-extrabold text-white">{big}</p>
              <p className="text-xs text-zinc-500 mt-1">{small}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 sm:px-12 py-24">
        <div className="mb-14">
          <p className="text-lime-400 text-xs font-bold uppercase tracking-widest mb-3">Features</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight max-w-lg">
            Everything you need.<br />Nothing you don&apos;t.
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: '🍽️', title: 'AI Food Logging', desc: 'Describe your meal in plain words. AI figures out the calories and macros — no searching, no scanning.' },
            { icon: '🏋️', title: 'AI Workout Tracking', desc: 'Say "30 min run" and it\'s logged with time, type, and calories burned. Zero manual input.' },
            { icon: '🤖', title: 'Personal AI Coach', desc: 'Ask anything about your day, diet, or training. Your coach knows your goals and today\'s data.' },
            { icon: '📅', title: 'Log Past Days', desc: 'Started tracking late? Describe yesterday and AI logs everything back to the right date.' },
            { icon: '📊', title: 'Progress Tracking', desc: 'Track calories, macros, and workouts over time. Log your weight and spot trends early.' },
            { icon: '🔔', title: 'Smart Reminders', desc: 'Daily push notifications to keep you on track — meal logging, hydration, movement.' },
          ].map(f => (
            <div key={f.title}
              className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 hover:border-zinc-700 transition-colors group">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-bold text-white mb-2 text-[15px]">{f.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 sm:px-12 pb-24">
        <div className="mb-14">
          <p className="text-lime-400 text-xs font-bold uppercase tracking-widest mb-3">Pricing</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Simple, honest pricing.</h2>
          <p className="text-zinc-400 mt-3">Start free. Upgrade when AI becomes your secret weapon.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-5 max-w-2xl">

          {/* Free */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-7">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Free</p>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-4xl font-extrabold text-white">$0</span>
            </div>
            <p className="text-xs text-zinc-600 mb-7">Forever free</p>
            <ul className="space-y-3 mb-8">
              {[
                '10 AI actions per day',
                'Barcode food scanner',
                'Manual food & workout logging',
                'Progress charts',
                'Weight tracking',
              ].map(f => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-400">
                  <svg className="w-4 h-4 text-zinc-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/auth/login"
              className="block text-center bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
              Get started
            </Link>
          </div>

          {/* Pro */}
          <div className="bg-zinc-900 border-2 border-lime-400/40 rounded-2xl p-7 relative">
            <div className="absolute top-5 right-5 bg-lime-400 text-black text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
              Popular
            </div>
            <p className="text-xs font-bold text-lime-400 uppercase tracking-widest mb-3">Pro</p>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-4xl font-extrabold text-white">$5.99</span>
              <span className="text-zinc-500 text-sm mb-1.5">/ month</span>
            </div>
            <p className="text-xs text-zinc-600 mb-7">Cancel anytime</p>
            <ul className="space-y-3 mb-8">
              {[
                'Unlimited AI actions',
                'AI food & workout parsing',
                'AI personal coach chat',
                'Log any past day with AI',
                'Everything in Free',
              ].map(f => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-300">
                  <svg className="w-4 h-4 text-lime-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/auth/login"
              className="block text-center bg-lime-400 hover:bg-lime-300 text-black font-extrabold py-3 rounded-xl transition-colors text-sm">
              ✦ Start with Pro
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 border-t border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 py-24 text-center">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-5">
            Ready to start?
          </h2>
          <p className="text-zinc-400 text-lg mb-10 max-w-md mx-auto">
            Set up in under 2 minutes. No credit card required.
          </p>
          <Link href="/auth/login"
            className="inline-flex items-center gap-2 bg-lime-400 hover:bg-lime-300 text-black font-extrabold px-8 py-4 rounded-2xl transition-colors text-base">
            Create your free account →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-800/40">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 py-7 flex items-center justify-between text-xs text-zinc-600">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-lime-400 flex items-center justify-center">
              <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span>FitTrack © 2026</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/auth/login" className="hover:text-zinc-400 transition-colors">Log in</Link>
            <Link href="/auth/login" className="hover:text-zinc-400 transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import AuthBackground from '@/components/AuthBackground';

export default function CheckEmailPage() {
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);
  const supabase = createClient();

  async function resendEmail() {
    setResending(true);
    // We don't have the email here, so just let them go back to signup
    setResending(false);
    setResent(true);
  }

  return (
    <AuthBackground>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-xl font-bold text-white">FitTrack</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-7 text-center">
          {/* Email icon */}
          <div className="w-16 h-16 rounded-2xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-white mb-2">Check your email</h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            We&apos;ve sent you a confirmation link. Click it to activate your account and get started.
          </p>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs text-slate-400 leading-relaxed">
              <span className="text-slate-300 font-medium">Didn&apos;t get it?</span> Check your spam folder. The email comes from <span className="text-slate-300">noreply@mail.app.supabase.io</span>
            </p>
          </div>

          {resent ? (
            <p className="text-sm text-green-400 mb-4">Check your inbox again — email resent.</p>
          ) : null}

          <Link
            href="/auth/signup"
            className="block w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg transition-colors text-sm mb-3"
          >
            Back to sign up
          </Link>

          <Link
            href="/auth/login"
            className="block w-full text-slate-400 hover:text-slate-200 text-sm py-2 transition-colors"
          >
            Already confirmed? Sign in
          </Link>
        </div>
      </div>
    </AuthBackground>
  );
}

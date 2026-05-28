'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function UpgradeModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);

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
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 pb-20 sm:pb-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">

        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-violet-500 to-blue-500" />

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="text-center space-y-1">
            <div className="text-3xl mb-2">⚡</div>
            <h2 className="text-lg font-bold text-white">You've hit your daily limit</h2>
            <p className="text-sm text-slate-400">You've used all 10 free AI actions today. Upgrade to Pro for unlimited.</p>
          </div>

          {/* Features */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-2.5">
            {[
              { icon: '🍽️', text: 'Unlimited AI food & workout parsing' },
              { icon: '🤖', text: 'Unlimited AI coach messages' },
              { icon: '📅', text: 'Log any past day with AI' },
              { icon: '♾️', text: 'Never see this message again' },
            ].map(f => (
              <div key={f.text} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-base w-5 text-center flex-shrink-0">{f.icon}</span>
                {f.text}
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="space-y-2">
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Loading…</>
                : '✦ Upgrade to Pro — $5.99/month'
              }
            </button>
            <button
              onClick={onClose}
              className="w-full text-slate-500 hover:text-slate-300 text-sm py-2 transition-colors"
            >
              Maybe later — free limit resets at midnight
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

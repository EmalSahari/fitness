'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type UsageData = { used: number; limit: number; isPro: boolean };

export default function AiLimitBanner({ onUpgrade }: { onUpgrade?: () => void }) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const fetchUsage = useCallback(() => {
    fetch('/api/ai-usage')
      .then(r => r.json())
      .then(d => { if (!d.error) setUsage(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchUsage();
    window.addEventListener('ai-usage-changed', fetchUsage);
    return () => window.removeEventListener('ai-usage-changed', fetchUsage);
  }, [fetchUsage]);

  if (!usage || usage.isPro || dismissed) return null;

  const remaining = usage.limit - usage.used;
  // Only show at 2 or fewer remaining (8/10 used)
  if (remaining > 2) return null;

  const isEmpty = remaining <= 0;

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl mb-4
      ${isEmpty
        ? 'bg-red-500/10 border border-red-500/20'
        : 'bg-amber-500/10 border border-amber-500/20'
      }`}>
      {/* Progress pips */}
      <div className="flex gap-1 flex-shrink-0">
        {Array.from({ length: usage.limit }).map((_, i) => (
          <span
            key={i}
            className={`w-1.5 h-4 rounded-sm ${
              i < usage.used
                ? isEmpty ? 'bg-red-500' : 'bg-amber-500'
                : 'bg-slate-700'
            }`}
          />
        ))}
      </div>

      <p className={`flex-1 font-medium ${isEmpty ? 'text-red-400' : 'text-amber-400'}`}>
        {isEmpty
          ? 'Daily AI limit reached — resets at midnight'
          : `Only ${remaining} AI ${remaining === 1 ? 'action' : 'actions'} left today`}
      </p>

      {onUpgrade ? (
        <button
          onClick={onUpgrade}
          className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
        >
          Upgrade →
        </button>
      ) : (
        <Link
          href="/account"
          className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
        >
          Upgrade →
        </Link>
      )}

      <button
        onClick={() => setDismissed(true)}
        className={`flex-shrink-0 transition-colors ${isEmpty ? 'text-red-600 hover:text-red-400' : 'text-amber-600 hover:text-amber-400'}`}
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

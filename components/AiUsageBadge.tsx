'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type UsageData = { used: number; limit: number; isPro: boolean };

/** Dispatch this event after any successful AI call to refresh all badges on the page. */
export function notifyAiUsed() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ai-usage-changed'));
  }
}

export default function AiUsageBadge({ onUpgrade }: { onUpgrade?: () => void }) {
  const [usage, setUsage] = useState<UsageData | null>(null);

  const fetchUsage = useCallback(() => {
    fetch('/api/ai-usage')
      .then(r => r.json())
      .then(d => { if (!d.error) setUsage(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchUsage();
    // Re-fetch whenever an AI call completes anywhere on the page
    window.addEventListener('ai-usage-changed', fetchUsage);
    return () => window.removeEventListener('ai-usage-changed', fetchUsage);
  }, [fetchUsage]);

  if (!usage) return null;

  if (usage.isPro) {
    return (
      <span className="inline-flex items-center gap-1 bg-blue-500/15 border border-blue-500/25 text-blue-400 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide">
        ✦ Pro — Unlimited
      </span>
    );
  }

  const remaining = usage.limit - usage.used;
  const pct = usage.used / usage.limit;
  const isLow = remaining <= 2;
  const isEmpty = remaining <= 0;

  if (isEmpty) {
    return (
      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
        <span className="text-xs text-red-400 flex-1">
          Daily AI limit reached ({usage.limit}/{usage.limit} used) — resets at midnight
        </span>
        {onUpgrade ? (
          <button onClick={onUpgrade} className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap">
            Upgrade
          </button>
        ) : (
          <Link href="/account" className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap">
            Upgrade
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 flex-1">
        <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden" style={{ maxWidth: 80 }}>
          <div
            className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-amber-500' : 'bg-blue-500'}`}
            style={{ width: `${pct * 100}%` }}
          />
        </div>
        <span className={`text-[10px] font-medium ${isLow ? 'text-amber-400' : 'text-slate-500'}`}>
          {remaining} AI {remaining === 1 ? 'use' : 'uses'} left today
        </span>
      </div>
      {isLow && (
        onUpgrade ? (
          <button onClick={onUpgrade} className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap">
            Upgrade →
          </button>
        ) : (
          <Link href="/account" className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap">
            Upgrade →
          </Link>
        )
      )}
    </div>
  );
}

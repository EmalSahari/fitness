'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

// Shows on mobile when the app is not running as a standalone PWA.
// iOS: shows share-icon instructions (no JS install API).
// Android/Chrome: listens for beforeinstallprompt.
export default function InstallPrompt() {
  const { t } = useAuth();
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> } | null>(null);

  useEffect(() => {
    // Already installed as PWA — don't show
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // Not a touch device — desktop browsers, skip
    if (!('ontouchstart' in window)) return;
    // Already dismissed
    if (localStorage.getItem('install-dismissed')) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    if (ios) {
      setShow(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> });
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function dismiss() {
    localStorage.setItem('install-dismissed', '1');
    setShow(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') dismiss();
    else setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-6">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-2xl max-w-md mx-auto">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 text-2xl">
            💪
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">{t('install_title')}</p>
            {isIOS ? (
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {t('install_ios_step')}{' '}
                <span className="inline-flex items-center bg-slate-700 rounded px-1 py-0.5 mx-0.5">
                  <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4m0 0L8 6m4-4v13" />
                  </svg>
                </span>
                {' '}→ &ldquo;Add to Home Screen&rdquo;
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-1">{t('install_body')}</p>
            )}
          </div>
          <button onClick={dismiss} className="text-slate-500 hover:text-slate-300 flex-shrink-0 -mt-1 -mr-1 p-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {!isIOS && deferredPrompt && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={install}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2 rounded-xl transition-colors"
            >
              Add to Home Screen
            </button>
            <button
              onClick={dismiss}
              className="px-4 text-slate-400 hover:text-slate-200 text-sm transition-colors"
            >
              {t('install_dismiss')}
            </button>
          </div>
        )}
        {isIOS && (
          <button onClick={dismiss} className="mt-3 w-full text-xs text-slate-500 hover:text-slate-400 transition-colors text-center">
            {t('install_dismiss')}
          </button>
        )}
      </div>
    </div>
  );
}

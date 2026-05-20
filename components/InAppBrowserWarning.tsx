'use client';

import { useEffect, useState } from 'react';

function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /FBAN|FBAV|Instagram|Snapchat|Messenger|Line|WeChat|Twitter|TikTok/.test(ua);
}

export default function InAppBrowserWarning() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (isInAppBrowser()) {
      setShow(true);
      setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur flex items-center justify-center p-6">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
        <div className="text-4xl">🌐</div>
        <div>
          <h2 className="text-lg font-bold text-white">Open in your browser</h2>
          <p className="text-slate-400 text-sm mt-2 leading-relaxed">
            FitTrack works best in Safari or Chrome.
            The app inside Snapchat/Messenger doesn't support all features.
          </p>
        </div>

        {isIOS ? (
          <div className="bg-slate-800 rounded-xl p-4 text-left space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">How to open in Safari</p>
            <div className="flex items-start gap-3">
              <span className="text-slate-400 text-sm font-bold flex-shrink-0">1.</span>
              <p className="text-sm text-slate-300">Tap the <span className="font-semibold text-white">⋯</span> menu or the share icon in the corner</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-slate-400 text-sm font-bold flex-shrink-0">2.</span>
              <p className="text-sm text-slate-300">Tap <span className="font-semibold text-white">"Open in Safari"</span></p>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-xl p-4 text-left space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">How to open in Chrome</p>
            <div className="flex items-start gap-3">
              <span className="text-slate-400 text-sm font-bold flex-shrink-0">1.</span>
              <p className="text-sm text-slate-300">Tap the <span className="font-semibold text-white">⋯</span> menu in the corner</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-slate-400 text-sm font-bold flex-shrink-0">2.</span>
              <p className="text-sm text-slate-300">Tap <span className="font-semibold text-white">"Open in Chrome"</span> or <span className="font-semibold text-white">"Open in browser"</span></p>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-500">
          Copy the link: <span className="text-slate-400 font-mono">fitness-mocha-five.vercel.app</span>
        </p>
      </div>
    </div>
  );
}

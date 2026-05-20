'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';

export default function FeedbackButton() {
  const { user, t } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);
  const supabase = createClient();

  if (!user || pathname.startsWith('/auth') || pathname === '/onboarding') return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError(false);

    const { error: err } = await supabase.from('feedback').insert({
      user_id: user!.id,
      rating: rating || null,
      message: message.trim(),
      page: pathname,
    });

    if (err) { setError(true); setSending(false); return; }

    setSent(true);
    setSending(false);
    setTimeout(() => {
      setOpen(false);
      setSent(false);
      setMessage('');
      setRating(0);
    }, 2500);
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium px-3 py-2 rounded-full shadow-lg transition-all hover:scale-105"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
        {t('feedback_btn')}
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-semibold text-white">{t('feedback_title')}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{t('feedback_subtitle')}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors ml-3 flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {sent ? (
              <div className="text-center py-4">
                <div className="text-3xl mb-2">🎉</div>
                <p className="text-green-400 font-medium">{t('feedback_thanks')}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Star rating */}
                <div>
                  <p className="text-xs font-medium text-slate-400 mb-2">{t('feedback_rating_label')}</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHovered(star)}
                        onMouseLeave={() => setHovered(0)}
                        className="text-2xl transition-transform hover:scale-110"
                      >
                        <span className={(hovered || rating) >= star ? 'text-amber-400' : 'text-slate-700'}>★</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={t('feedback_placeholder')}
                  rows={3}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />

                {error && <p className="text-red-400 text-xs">{t('feedback_error')}</p>}

                <button
                  type="submit"
                  disabled={sending || !message.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
                >
                  {sending ? t('feedback_sending') : t('feedback_submit')}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

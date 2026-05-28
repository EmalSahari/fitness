'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { getTodayDate, generateId } from '@/lib/utils';
import type { FoodEntry, WorkoutEntry, ChatMessage } from '@/lib/types';
import AiUsageBadge, { notifyAiUsed } from '@/components/AiUsageBadge';
import UpgradeModal from '@/components/UpgradeModal';

export default function CoachPage() {
  const { user, profile, t } = useAuth();
  const supabase = createClient();
  const today = getTodayDate();

  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutEntry[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('food_entries').select('*').eq('user_id', user.id).eq('date', today),
      supabase.from('workout_entries').select('*').eq('user_id', user.id).eq('date', today),
    ]).then(([f, w]) => {
      setFoodEntries((f.data ?? []) as FoodEntry[]);
      setWorkoutEntries((w.data ?? []) as WorkoutEntry[]);
    });
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput('');
    setApiError('');

    const userMsg: ChatMessage = { id: generateId(), role: 'user', content: trimmed, createdAt: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          foodEntries: foodEntries.map(e => ({ ...e, mealType: e.meal_type })),
          workoutEntries: workoutEntries.map(e => ({ ...e, caloriesBurned: e.calories_burned })),
          settings: { calorieGoal: profile?.calorie_goal ?? 2000, name: profile?.name ?? '' },
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        if (d.limitReached) {
          setShowUpgradeModal(true);
          setLoading(false);
          inputRef.current?.focus();
          return;
        }
        throw new Error(d.error ?? `Error ${res.status}`);
      }
      const { reply } = await res.json();
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: reply, createdAt: Date.now() }]);
      notifyAiUsed();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  const totalCalIn = foodEntries.reduce((s, e) => s + e.calories, 0);
  const totalCalBurned = workoutEntries.reduce((s, e) => s + e.calories_burned, 0);

  const SUGGESTIONS = [t('coach_suggest_1'), t('coach_suggest_2'), t('coach_suggest_3'), t('coach_suggest_4')];

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 6rem)' }}>
      {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} />}
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('coach_title')}</h1>
          <p className="text-slate-400 text-sm mt-0.5">{t('coach_subtitle')}</p>
        </div>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])}
            className="text-xs text-slate-500 hover:text-slate-300 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors">
            {t('coach_clear')}
          </button>
        )}
      </div>

      {/* Context pills */}
      <div className="flex-shrink-0 py-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500">{t('coach_context')}</span>
        <span className="inline-flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full">🍽️ {totalCalIn} {t('coach_eaten')}</span>
        <span className="inline-flex items-center gap-1 bg-green-500/10 border border-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">🔥 {totalCalBurned} {t('coach_burned_label')}</span>
        <span className="inline-flex items-center gap-1 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs px-2 py-0.5 rounded-full">🎯 {profile?.calorie_goal ?? 2000} {t('coach_goal_label')}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <p className="text-slate-300 font-medium">{t('coach_ready')}</p>
            <p className="text-slate-500 text-sm mt-1 max-w-xs">{t('coach_ready_desc')}</p>
            <div className="mt-6 flex flex-col gap-2 w-full max-w-sm">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => sendMessage(s)}
                  className="text-left text-sm text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 px-4 py-2.5 rounded-xl transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {[0, 150, 300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                  </div>
                </div>
              </div>
            )}
            {apiError && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">⚠️ {apiError}</div>}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 pt-4 border-t border-slate-800">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <textarea ref={inputRef} rows={1} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }}
              placeholder={t('coach_placeholder')}
              className="w-full bg-slate-800 border border-slate-700 hover:border-slate-600 focus:border-blue-500 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none resize-none leading-relaxed transition-colors"
              style={{ minHeight: '48px', maxHeight: '160px' }}
              disabled={loading} />
          </div>
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
            className="w-11 h-11 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-slate-600">{t('coach_enter_hint')}</p>
          <AiUsageBadge />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-3 chat-bubble ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isUser ? 'bg-slate-700' : 'bg-blue-600/20 border border-blue-500/30'}`}>
        {isUser ? (
          <svg className="w-4 h-4 text-slate-300" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
        ) : (
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
        )}
      </div>
      <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${isUser ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm'}`}>
        {message.content.split('\n').map((line, i, arr) => <span key={i}>{line}{i < arr.length - 1 && <br />}</span>)}
      </div>
    </div>
  );
}

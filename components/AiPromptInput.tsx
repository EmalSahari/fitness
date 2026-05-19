'use client';

import { useRef, useEffect, KeyboardEvent } from 'react';

interface AiPromptInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  placeholder?: string;
  label?: string;
  sublabel?: string;
  hint?: string;
}

export default function AiPromptInput({
  value, onChange, onSubmit, isLoading,
  placeholder = 'Describe what you ate or did…',
  label = 'Quick log with AI',
  sublabel = 'describe in any language',
  hint = 'Press Enter to estimate · Shift+Enter for new line',
}: AiPromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && value.trim()) onSubmit();
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-base">✨</span>
        <span className="text-sm font-semibold text-white">{label}</span>
        <span className="text-xs text-slate-500">— {sublabel}</span>
      </div>

      {/* Prompt container — styled after motion-primitives PromptInput */}
      <div className="relative rounded-2xl border border-slate-700 bg-slate-800/80 focus-within:border-blue-500/60 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all duration-200">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          rows={1}
          className="w-full resize-none bg-transparent text-sm text-white placeholder-slate-500 px-4 pt-3.5 pb-12 focus:outline-none leading-relaxed"
          style={{ minHeight: '52px' }}
        />

        {/* Bottom bar */}
        <div className="absolute bottom-2 left-3 right-2 flex items-center justify-between pointer-events-none">
          <span className="text-xs text-slate-600">{hint}</span>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isLoading || !value.trim()}
            className="pointer-events-auto flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-colors flex-shrink-0"
          >
            {isLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

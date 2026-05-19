'use client';

import { CSSProperties } from 'react';

export default function BorderBeam({
  color = 'rgba(59,130,246,0.9)',
  colorEnd = 'transparent',
  duration = 6,
  size = 120,
  delay = 0,
}: {
  color?: string;
  colorEnd?: string;
  duration?: number;
  size?: number;
  delay?: number;
}) {
  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-[inherit]"
      style={
        {
          '--border-beam-color': color,
          '--border-beam-color-end': colorEnd,
          '--border-beam-size': `${size}px`,
          '--border-beam-duration': `${duration}s`,
          '--border-beam-delay': `${-delay}s`,
        } as CSSProperties
      }
    >
      {/* Static border underneath */}
      <div className="absolute inset-0 rounded-[inherit] border border-slate-800/80" />
      {/* Traveling beam span */}
      <span
        className="absolute block rounded-full animate-border-beam"
        style={{
          width: 'var(--border-beam-size)',
          height: '2px',
          background: `linear-gradient(to right, transparent, var(--border-beam-color), transparent)`,
          offsetPath: 'rect(0 auto auto 0 round 12px)',
          offsetDistance: '0%',
          animationDuration: 'var(--border-beam-duration)',
          animationDelay: 'var(--border-beam-delay)',
          boxShadow: `0 0 8px 2px var(--border-beam-color)`,
        }}
      />
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';

export default function AuthBackground({ children }: { children: React.ReactNode }) {
  const [mouse, setMouse] = useState({ x: -999, y: -999 });

  useEffect(() => {
    function onMove(e: MouseEvent) {
      setMouse({ x: e.clientX, y: e.clientY });
    }
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#04060f] flex items-center justify-center p-4 overflow-hidden">

      {/* ── Shape Landing Hero geometric shapes ───────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        {/* Large rotated square — top left */}
        <div
          className="absolute animate-shape-float-1"
          style={{
            top: '-120px', left: '-100px',
            width: '420px', height: '420px',
            borderRadius: '60px',
            transform: 'rotate(30deg)',
            background: 'linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(99,102,241,0.08) 100%)',
            border: '1px solid rgba(59,130,246,0.12)',
            backdropFilter: 'blur(0px)',
          }}
        />

        {/* Circle — bottom right */}
        <div
          className="absolute animate-shape-float-2"
          style={{
            bottom: '-140px', right: '-100px',
            width: '480px', height: '480px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.06) 100%)',
            border: '1px solid rgba(139,92,246,0.10)',
          }}
        />

        {/* Small rotated square — top right */}
        <div
          className="absolute animate-shape-float-3"
          style={{
            top: '80px', right: '60px',
            width: '160px', height: '160px',
            borderRadius: '24px',
            transform: 'rotate(-18deg)',
            background: 'linear-gradient(135deg, rgba(14,165,233,0.14) 0%, transparent 100%)',
            border: '1px solid rgba(14,165,233,0.14)',
          }}
        />

        {/* Tiny diamond — bottom left */}
        <div
          className="absolute animate-shape-float-4"
          style={{
            bottom: '120px', left: '80px',
            width: '90px', height: '90px',
            borderRadius: '16px',
            transform: 'rotate(45deg)',
            background: 'linear-gradient(135deg, rgba(168,85,247,0.16) 0%, transparent 100%)',
            border: '1px solid rgba(168,85,247,0.14)',
          }}
        />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* ── Mouse spotlight ────────────────────────────────────────────── */}
      <div
        className="pointer-events-none fixed inset-0 z-10"
        style={{
          background: `radial-gradient(550px circle at ${mouse.x}px ${mouse.y}px, rgba(59,130,246,0.09) 0%, rgba(59,130,246,0.03) 40%, transparent 70%)`,
        }}
      />

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="relative z-20 w-full flex items-center justify-center -mt-10">
        {children}
      </div>
    </div>
  );
}

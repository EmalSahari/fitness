'use client';

import { useEffect, useRef, useState } from 'react';

export default function AuthBackground({ children }: { children: React.ReactNode }) {
  const [mouse, setMouse] = useState({ x: -999, y: -999 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      setMouse({ x: e.clientX, y: e.clientY });
    }
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen bg-slate-950 flex items-center justify-center p-4 overflow-hidden"
    >
      {/* Mouse spotlight */}
      <div
        className="pointer-events-none fixed inset-0 z-10 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at ${mouse.x}px ${mouse.y}px, rgba(59,130,246,0.10) 0%, rgba(59,130,246,0.04) 40%, transparent 70%)`,
        }}
      />

      {/* Static aurora blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl animate-aurora-1"
          style={{ background: 'radial-gradient(circle, #3b82f6 0%, #1d4ed8 50%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-15 blur-3xl animate-aurora-2"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, #4f46e5 50%, transparent 70%)' }}
        />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* Content — pulled slightly above true center */}
      <div className="relative z-20 w-full flex items-center justify-center -mt-12">
        {children}
      </div>
    </div>
  );
}

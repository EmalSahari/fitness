'use client';

import { useEffect, useState } from 'react';

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
}

let _id = 0;
function makeSparkle(): Sparkle {
  return {
    id: _id++,
    x: Math.random() * 110 - 5,
    y: Math.random() * 110 - 5,
    size: Math.random() * 8 + 7,
  };
}

export default function Sparkles({ children }: { children: React.ReactNode }) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSparkles(prev => [...prev.slice(-4), makeSparkle()]);
    }, 350);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="relative inline-block">
      {sparkles.map(s => (
        <span
          key={s.id}
          className="pointer-events-none absolute animate-sparkle"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, transform: 'translate(-50%, -50%)' }}
        >
          <svg viewBox="0 0 160 160" fill="none" width={s.size} height={s.size}>
            <path
              d="M80 7C80 7 84 27 87 41C90 55 100 70 114 73C128 76 148 80 148 80C148 80 128 84 114 87C100 91 90 105 87 119C84 133 80 153 80 153C80 153 76 133 73 119C70 105 60 91 46 87C32 84 12 80 12 80C12 80 32 76 46 73C60 69 70 55 73 41C76 27 80 7 80 7Z"
              fill="#facc15"
            />
          </svg>
        </span>
      ))}
      {children}
    </span>
  );
}

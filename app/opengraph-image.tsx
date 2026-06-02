import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'FitTrack — AI Calorie & Workout Tracker';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#080808',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Glow blob */}
        <div style={{
          position: 'absolute', top: -200, right: -100,
          width: 700, height: 700, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%)',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="28" height="28" viewBox="0 0 20 20" fill="white">
              <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <span style={{ color: 'white', fontSize: 28, fontWeight: 700 }}>FitTrack</span>
        </div>

        {/* Headline */}
        <div style={{ color: 'white', fontSize: 64, fontWeight: 800, lineHeight: 1.1, marginBottom: 24 }}>
          Hit your goals.<br />
          <span style={{ color: '#2563eb' }}>Eat smarter.</span>
        </div>

        {/* Sub */}
        <div style={{ color: '#71717a', fontSize: 28, maxWidth: 680 }}>
          AI-powered calorie & workout tracker. Describe your meal — AI logs it instantly.
        </div>

        {/* CTA pill */}
        <div style={{
          marginTop: 48, display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            background: '#2563eb', color: 'black', fontWeight: 800,
            fontSize: 22, padding: '14px 32px', borderRadius: 16,
          }}>
            Free to start
          </div>
          <div style={{ color: '#52525b', fontSize: 20 }}>
            10 AI actions/day included
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

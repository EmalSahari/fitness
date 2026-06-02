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
          background: '#0a0f1e',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Left accent bar */}
        <div style={{ width: 8, background: '#2563eb', display: 'flex', flexShrink: 0 }} />

        {/* Main content */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '72px 80px',
          flex: 1,
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 48 }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 30,
              fontWeight: 900,
            }}>
              F
            </div>
            <span style={{ color: '#94a3b8', fontSize: 28, fontWeight: 600, display: 'flex' }}>
              FitTrack
            </span>
          </div>

          {/* Headline */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#f1f5f9', fontSize: 74, fontWeight: 800, lineHeight: 1.08, display: 'flex' }}>
              Track food.
            </span>
            <span style={{ color: '#2563eb', fontSize: 74, fontWeight: 800, lineHeight: 1.08, display: 'flex', marginBottom: 28 }}>
              Train smarter.
            </span>
          </div>

          {/* Subtext */}
          <div style={{ color: '#475569', fontSize: 26, display: 'flex', marginBottom: 44 }}>
            AI logs your meals and workouts from plain text.
          </div>

          {/* Pills */}
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{
              background: '#2563eb',
              color: 'white',
              fontWeight: 700,
              fontSize: 22,
              padding: '12px 28px',
              borderRadius: 12,
              display: 'flex',
            }}>
              Free to start
            </div>
            <div style={{
              background: '#0f172a',
              color: '#475569',
              fontSize: 22,
              padding: '12px 28px',
              borderRadius: 12,
              display: 'flex',
            }}>
              10 AI actions / day
            </div>
          </div>

          {/* URL */}
          <div style={{ display: 'flex', marginTop: 'auto', paddingTop: 40, color: '#1e3a5f', fontSize: 20 }}>
            fittrack.sahari.io
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

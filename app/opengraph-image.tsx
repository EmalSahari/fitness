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
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Blue accent bar on left */}
        <div style={{
          position: 'absolute',
          left: 0, top: 0, bottom: 0,
          width: 8,
          background: '#2563eb',
          display: 'flex',
        }} />

        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 52 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: '#2563eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="32" height="32" viewBox="0 0 20 20" fill="white">
              <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <span style={{ color: '#94a3b8', fontSize: 26, fontWeight: 600, letterSpacing: 1 }}>FitTrack</span>
        </div>

        {/* Headline line 1 */}
        <div style={{ color: '#f1f5f9', fontSize: 72, fontWeight: 800, lineHeight: 1.05, display: 'flex' }}>
          Track food.
        </div>
        {/* Headline line 2 */}
        <div style={{ color: '#2563eb', fontSize: 72, fontWeight: 800, lineHeight: 1.05, marginBottom: 32, display: 'flex' }}>
          Train smarter.
        </div>

        {/* Subtext */}
        <div style={{ color: '#64748b', fontSize: 26, maxWidth: 700, display: 'flex' }}>
          AI logs your meals and workouts from plain text. Personal AI coach included.
        </div>

        {/* Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 48 }}>
          <div style={{
            background: '#2563eb', color: 'white', fontWeight: 700,
            fontSize: 20, padding: '12px 28px', borderRadius: 12,
            display: 'flex',
          }}>
            Free to start
          </div>
          <div style={{
            border: '1.5px solid #1e3a5f', color: '#64748b',
            fontSize: 20, padding: '12px 28px', borderRadius: 12,
            display: 'flex',
          }}>
            10 AI actions/day included
          </div>
        </div>

        {/* URL */}
        <div style={{
          position: 'absolute', bottom: 48, right: 80,
          color: '#1e3a5f', fontSize: 18,
          display: 'flex',
        }}>
          fittrack.sahari.io
        </div>
      </div>
    ),
    { ...size }
  );
}

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

export default function handler(req) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title');
  const location = searchParams.get('location');

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 60%, #0d1a1a 100%)',
        padding: '60px 72px',
        fontFamily: 'system-ui, sans-serif',
        position: 'relative',
      }}
    >
      {/* Accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 6,
        background: 'linear-gradient(90deg, #10b981, #7c3aed, #a855f7)',
        display: 'flex',
      }} />

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
        <div style={{
          width: 44, height: 44,
          background: 'linear-gradient(135deg, #10b981, #7c3aed)',
          borderRadius: 11,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, color: '#fff',
        }}>⬡</div>
        <span style={{ color: '#a78bfa', fontSize: 26, fontWeight: 600 }}>HiveCollective</span>
      </div>

      {/* Content */}
      {title ? (
        <>
          <div style={{
            color: '#e2e0f0',
            fontSize: title.length > 70 ? 42 : 52,
            fontWeight: 700,
            lineHeight: 1.2,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
          }}>
            {title.length > 90 ? title.slice(0, 90) + '…' : title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 32 }}>
            {location && (
              <span style={{
                background: 'rgba(124,58,237,0.2)',
                border: '1px solid rgba(139,92,246,0.3)',
                borderRadius: 8, padding: '6px 14px',
                color: '#a78bfa', fontSize: 18,
              }}>
                📍 {location}
              </span>
            )}
            <span style={{ color: '#555', fontSize: 18 }}>Community Problem</span>
          </div>
        </>
      ) : (
        <>
          <div style={{
            color: '#e2e0f0', fontSize: 56, fontWeight: 700,
            lineHeight: 1.2, flex: 1, display: 'flex', alignItems: 'center',
          }}>
            Solutions for Community Problems
          </div>
          <div style={{ color: '#666', fontSize: 22 }}>
            Crowdsource ideas that matter
          </div>
        </>
      )}
    </div>,
    { width: 1200, height: 630 }
  );
}

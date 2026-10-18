import { ImageResponse } from 'next/og';

export const alt = 'Traderlogify trading journal';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: 'linear-gradient(135deg, #09090f 0%, #111827 55%, #172554 100%)',
          color: '#f8fafc',
          display: 'flex',
          height: '100%',
          padding: '72px',
          position: 'relative',
          width: '100%',
        }}
      >
        <div
          style={{
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '26px',
            padding: '54px 62px',
            width: '100%',
          }}
        >
          <div style={{ color: '#7dd3fc', fontSize: 24, fontWeight: 700, letterSpacing: '0.18em' }}>
            TRADERLOGIFY
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 66, fontWeight: 800, lineHeight: 1.08 }}>
            <span>Review every trade.</span>
            <span style={{ color: '#7dd3fc' }}>Build better habits.</span>
          </div>
          <div style={{ color: '#cbd5e1', fontSize: 28, lineHeight: 1.4 }}>
            A structured journal for trade review, broker history, and performance insights.
          </div>
          <div style={{ color: '#94a3b8', fontSize: 20, marginTop: 'auto' }}>
            Capture. Annotate. Review.
          </div>
        </div>
      </div>
    ),
    size,
  );
}

import GlassCard from './GlassCard';
import { VerdictChip, ConfidenceBar } from './ImageResultCard';

/* ─── Chip presets ───────────────────────────────────────────── */
const CHIP_FAKE = {
  label: 'FAKE', dotColor: '#E24B4A', textColor: '#F09595',
  bgColor: 'rgba(120,30,30,0.25)', borderColor: 'rgba(162,45,45,0.35)',
};
const CHIP_REAL = {
  label: 'REAL', dotColor: '#5DCAA5', textColor: '#5DCAA5',
  bgColor: 'rgba(15,80,65,0.25)', borderColor: 'rgba(29,158,117,0.35)',
};

/* ─── Single frame chip ──────────────────────────────────────── */
function FrameChip({ frameIndex, fakeProb }) {
  const fake         = fakeProb > 0.5;
  const verdictColor = fake ? '#F09595' : '#5DCAA5';

  return (
    <div style={{
      flex: 1,
      padding: '6px 2px',
      borderRadius: 4,
      background: fake ? 'rgba(120,30,30,0.18)' : 'rgba(15,80,65,0.13)',
      border: `0.5px solid ${fake ? 'rgba(162,45,45,0.2)' : 'rgba(29,158,117,0.18)'}`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 3,
      minWidth: 0,
    }}>
      <span style={{ fontSize: 8, color: '#4A5C6A', lineHeight: 1 }}>
        F{frameIndex + 1}
      </span>
      <span style={{ fontSize: 9, fontWeight: 500, color: verdictColor, lineHeight: 1 }}>
        {fake ? 'FAKE' : 'REAL'}
      </span>
    </div>
  );
}

/* ─── VideoResultCard ────────────────────────────────────────── */
export default function VideoResultCard({ videoResult }) {
  const isFake       = videoResult.prediction === 'Fake';
  const displayPct   = isFake
    ? (videoResult.confidence * 100).toFixed(2)
    : ((1 - videoResult.confidence) * 100).toFixed(2);
  const showVariance = videoResult.variance > 0.20 || videoResult.risk_flag === 'high_variance';

  const chip     = isFake ? CHIP_FAKE : CHIP_REAL;
  const barColor = isFake ? '#A32D2D' : '#0F6E56';

  return (
    <GlassCard>
      {/* Section label */}
      <div style={{
        fontSize: 11,
        fontWeight: 500,
        color: '#4A5C6A',
        letterSpacing: '0.12em',
        marginBottom: 12,
      }}>
        VIDEO RESULT · {videoResult.frames_analyzed} FRAMES ANALYSED
      </div>

      {/* Header: verdict chip + optional variance badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <VerdictChip {...chip} />

        {showVariance && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: 'rgba(180,120,20,0.15)',
            border: '0.5px solid rgba(220,160,40,0.3)',
            borderRadius: 4,
            padding: '3px 8px',
          }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#D4A030', flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: '#D4A030', letterSpacing: '0.07em' }}>
              HIGH VARIANCE
            </span>
          </div>
        )}
      </div>

      {/* Confidence bar */}
      <ConfidenceBar
        label="Aggregate confidence"
        value={`${displayPct}%`}
        fillColor={barColor}
        fillPct={`${displayPct}%`}
      />

      {/* Frame chips row */}
      <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
        {videoResult.per_frame_results.map(f => (
          <FrameChip
            key={f.frame_index}
            frameIndex={f.frame_index}
            fakeProb={f.fake_prob}
          />
        ))}
      </div>

      {/* Meta row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: 16,
        flexWrap: 'wrap',
        gap: 8,
      }}>
        {[
          ['Processing', `${videoResult.processingTime} s`],
          ['Variance',   videoResult.variance.toFixed(4)],
          ['Model',      'EfficientNet-B2'],
        ].map(([k, v]) => (
          <span key={k} style={{ fontSize: 11, color: '#4A5C6A' }}>
            {k}{' '}
            <span style={{ color: '#9BA8AB' }}>{v}</span>
          </span>
        ))}
      </div>
    </GlassCard>
  );
}

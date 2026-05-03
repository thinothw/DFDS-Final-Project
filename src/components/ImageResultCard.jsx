import GlassCard from './GlassCard';

/* ─── Reusable verdict chip ──────────────────────────────────── */
export function VerdictChip({ label, dotColor, textColor, bgColor, borderColor }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: bgColor, border: `0.5px solid ${borderColor}`,
      borderRadius: 5, padding: '4px 10px',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 500, color: textColor, letterSpacing: '0.08em' }}>
        {label}
      </span>
    </div>
  );
}

/* ─── Confidence bar row ─────────────────────────────────────── */
export function ConfidenceBar({ label, value, fillColor, fillPct }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: '#4A5C6A' }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#9BA8AB' }}>{value}</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'rgba(74,92,106,0.12)', overflow: 'hidden' }}>
        <div style={{ width: fillPct, height: '100%', background: fillColor, borderRadius: 2 }} />
      </div>
    </div>
  );
}

/* ─── Chip presets for FAKE / REAL ───────────────────────────── */
const CHIP_FAKE = {
  label: 'FAKE', dotColor: '#E24B4A', textColor: '#F09595',
  bgColor: 'rgba(120,30,30,0.25)', borderColor: 'rgba(162,45,45,0.35)',
};
const CHIP_REAL = {
  label: 'REAL', dotColor: '#5DCAA5', textColor: '#5DCAA5',
  bgColor: 'rgba(15,80,65,0.25)', borderColor: 'rgba(29,158,117,0.35)',
};

/* ─── ImageResultCard ────────────────────────────────────────── */
/* result = { prediction: 'Fake'|'Real', confidence: 0-1, processingTime: '2.3' } */
export default function ImageResultCard({ result }) {
  const isFake = result.prediction === 'Fake';
  const displayPct = (result.confidence * 100).toFixed(2);

  const chip     = isFake ? CHIP_FAKE : CHIP_REAL;
  const barColor = isFake ? '#A32D2D' : '#0F6E56';

  return (
    <GlassCard>
      {/* Section label */}
      <div style={{ fontSize: 11, fontWeight: 500, color: '#4A5C6A', letterSpacing: '0.12em', marginBottom: 12 }}>
        IMAGE RESULT
      </div>

      <VerdictChip {...chip} />

      <ConfidenceBar
        label="Confidence"
        value={`${displayPct}%`}
        fillColor={barColor}
        fillPct={`${displayPct}%`}
      />

      {/* Meta row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, flexWrap: 'wrap', gap: 8 }}>
        {[
          ['Model', 'EfficientNet-B2'],
          ['AUC',   '98.85%'],
          ['Time',  `${result.processingTime} s`],
        ].map(([k, v]) => (
          <span key={k} style={{ fontSize: 11, color: '#4A5C6A' }}>
            {k} <span style={{ color: '#9BA8AB' }}>{v}</span>
          </span>
        ))}
      </div>
    </GlassCard>
  );
}

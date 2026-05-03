import GlassCard from './GlassCard';

/* ─── Single heatmap tile ────────────────────────────────────── */
function HeatmapTile({ label, desc, barPct, barColor, badge, imageSrc, square, simple }) {
  return (
    <div>
      <div style={{
        ...(square ? { aspectRatio: '1/1' } : { height: 118 }),
        borderRadius: 8,
        background: 'rgba(15,25,35,0.8)',
        position: 'relative', overflow: 'hidden',
        marginBottom: 10,
      }}>
        {imageSrc && (
          <img
            src={imageSrc}
            alt={label}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}

        {/* Bottom-right badge */}
        <div style={{
          position: 'absolute', bottom: 6, right: 6,
          background: 'rgba(6,20,27,0.75)',
          border: '0.5px solid rgba(74,92,106,0.25)',
          borderRadius: 3, padding: '2px 6px',
          fontSize: 9, color: '#4A5C6A', whiteSpace: 'nowrap',
        }}>
          {badge}
        </div>
      </div>

      <div style={{ fontSize: simple ? 8.5 : 11, color: '#4A5C6A', marginBottom: simple ? 0 : 4, letterSpacing: '0.04em' }}>
        {label}
      </div>
      {!simple && (
        <>
          <div style={{ fontSize: 14, color: '#9BA8AB', marginBottom: 8 }}>
            {desc}
          </div>
          <div style={{ height: 2, borderRadius: 2, background: 'rgba(74,92,106,0.12)', overflow: 'hidden' }}>
            <div style={{ width: barPct, height: '100%', background: barColor, borderRadius: 2 }} />
          </div>
        </>
      )}
    </div>
  );
}


/* ─── GradCamPanel (Panel 3) ─────────────────────────────────── */
export default function GradCamPanel({ imageResult, videoResult, onReset }) {
  const isVideoResult = !!videoResult && !imageResult;
  const result        = imageResult || videoResult;

  const isFake       = result?.prediction === 'Fake';
  const imageConfPct = imageResult ? (imageResult.confidence * 100).toFixed(2) : 87;
  const videoConfPct = isVideoResult
    ? (videoResult.prediction === 'Fake'
        ? (videoResult.confidence * 100).toFixed(2)
        : ((1 - videoResult.confidence) * 100).toFixed(2))
    : 0;
  const confPct      = isVideoResult ? videoConfPct : imageConfPct;

  const tile = {
    label:    isVideoResult ? 'Most representative frame' : 'Full face activation',
    desc:     isVideoResult
      ? `${videoResult.prediction} - ${videoConfPct}% confidence`
      : result ? `${result.prediction} - ${imageConfPct}% confidence` : 'High manipulation signal',
    barPct:   `${confPct}%`,
    barColor: result ? (isFake ? '#A32D2D' : '#0F6E56') : '#A32D2D',
    badge:    isVideoResult
      ? `Video - ${videoConfPct}% ${videoResult.prediction.toLowerCase()}`
      : result
        ? `Image · ${imageConfPct}% ${result.prediction.toLowerCase()}`
        : 'Image · 87% fake',
    imageSrc: result?.gradcam_heatmap
      ? `data:image/png;base64,${result.gradcam_heatmap}`
      : null,
  };

  const sessionTime = result?.processingTime ?? '—';

  return (
    <GlassCard>
      {/* Panel header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: '#4A5C6A', letterSpacing: '0.12em' }}>
          GRAD-CAM · ACTIVATION HEATMAPS
        </span>
        <span style={{
          fontSize: 11, color: '#4A5C6A',
          border: '0.5px solid rgba(74,92,106,0.35)',
          borderRadius: 3, padding: '2px 7px', letterSpacing: '0.06em',
        }}>
          MOST REPRESENTATIVE FRAMES PER DETECTION
        </span>
      </div>

      {/* Heatmap display */}
      {isVideoResult && videoResult.gradcam_heatmaps?.length === 3 ? (
        <div style={{ display: 'flex', gap: 12 }}>
          {videoResult.gradcam_heatmaps.map((heatmap, i) => (
            <div key={i} style={{ flex: 1, minWidth: 0 }}>
              <HeatmapTile
                square
                simple
                imageSrc={`data:image/png;base64,${heatmap}`}
                badge={`Frame ${i + 1}`}
                label={`Representative frame ${i + 1}`}
              />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '50%' }}>
            <HeatmapTile {...tile} square />
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 20, paddingTop: 14,
        borderTop: '0.5px solid rgba(255,255,255,0.04)',
      }}>
        <span style={{ fontSize: 11, color: '#253745' }}>
          Total session · {sessionTime} s
        </span>

        <button
          onClick={onReset}
          style={{
            fontSize: 12, color: '#4A5C6A', background: 'transparent',
            border: '0.5px solid rgba(74,92,106,0.2)',
            borderRadius: 5, padding: '5px 14px',
            cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.05em',
          }}
        >
          Analyse another ↺
        </button>
      </div>
    </GlassCard>
  );
}

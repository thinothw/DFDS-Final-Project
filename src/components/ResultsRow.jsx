import ImageResultCard from './ImageResultCard';
import VideoResultCard from './VideoResultCard';
import { useWindowSize } from '../hooks/useWindowSize';

/* ─── ResultsRow (Panel 2) ───────────────────────────────────── */
export default function ResultsRow({ imageResult, videoResult }) {
  const { isMobile } = useWindowSize();
  const hasBoth = imageResult && videoResult;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: hasBoth && !isMobile ? '1fr 1fr' : '1fr',
      gap: 18,
    }}>
      {imageResult && <ImageResultCard result={imageResult} />}
      {videoResult && <VideoResultCard videoResult={videoResult} />}
    </div>
  );
}

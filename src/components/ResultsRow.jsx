import ImageResultCard from './ImageResultCard';
import VideoResultCard from './VideoResultCard';

/* ─── ResultsRow (Panel 2) ───────────────────────────────────── */
export default function ResultsRow({ imageResult, videoResult }) {
  return (
    <div>
      {imageResult && <ImageResultCard result={imageResult} />}
      {videoResult && <VideoResultCard videoResult={videoResult} />}
    </div>
  );
}

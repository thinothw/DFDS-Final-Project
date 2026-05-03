import { useState } from 'react';
import axios from 'axios';
import './index.css';
import UploadPanel  from './components/UploadPanel';
import ResultsRow   from './components/ResultsRow';
import GradCamPanel from './components/GradCamPanel';
import GlassCard    from './components/GlassCard';

const API_BASE = 'http://127.0.0.1:8000';

/* ─── Image file validation ──────────────────────────────────── */
const ACCEPTED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ACCEPTED_EXT  = /\.(jpe?g|png|webp)$/i;

function validateFile(file) {
  if (file.size > 50 * 1024 * 1024) {
    return 'File too large — maximum size is 50 MB.';
  }
  const okMime = ACCEPTED_MIME.includes(file.type);
  const okExt  = ACCEPTED_EXT.test(file.name);
  if (!okMime && !okExt) {
    return 'Unsupported file type — please upload a JPG, PNG, or WEBP image.';
  }
  return null;
}

/* ─── Video file validation ──────────────────────────────────── */
const ACCEPTED_VIDEO_EXT = /\.(mp4|mov|avi|mkv)$/i;

function validateVideoFile(file) {
  if (file.size > 500 * 1024 * 1024) {
    return 'File too large - maximum size is 500MB.';
  }
  if (!ACCEPTED_VIDEO_EXT.test(file.name)) {
    return 'Unsupported file type - please upload an MP4, MOV, AVI, or MKV video.';
  }
  return null;
}

/* ─── Empty state ────────────────────────────────────────────── */
const STAT_PILLS = [
  ['MODEL',    'EfficientNet-B2'],
  ['ACCURACY', '94.71%'],
  ['AUC',      '98.85%'],
];

const PIPELINE_STEPS = [
  'Upload - Submit a JPG, PNG, or MP4 file via drag-and-drop or file browser',
  'Face Detection - RetinaFace locates and crops the primary face with ≥90% confidence',
  'Inference - EfficientNet-B2 classifies the face as real or AI-generated',
  'Grad-CAM - Activation heatmap highlights the facial regions that drove the verdict',
];

const THREAT_STATS = [
  { number: '1 in 20', desc: 'identity verification attempts now linked to deepfake attacks in 2025, up 21% year-over-year' },
  { number: '$40B',    desc: 'projected US fraud losses by 2027 driven by generative AI, up from $12.3B in 2023' },
  { number: '244%',   desc: 'increase in digital document forgeries year-over-year, with a deepfake attempt every 5 minutes' },
];

const ADOPTION_DATA = [
  { year: '2020', value: 15,  projected: false },
  { year: '2021', value: 28,  projected: false },
  { year: '2022', value: 29,  projected: false },
  { year: '2023', value: 49,  projected: false },
  { year: '2024', value: 61,  projected: false },
  { year: '2025', value: 78,  projected: true  },
];

function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'stretch',
      paddingTop: 48, paddingBottom: 48, gap: 20,
      width: '100%',
    }}>
      <div style={{ fontSize: 12, color: '#253745', letterSpacing: '0.08em', textAlign: 'center', alignSelf: 'center' }}>
        Upload an image or video above to begin analysis
      </div>

      <div style={{ display: 'flex', gap: 12, alignSelf: 'center' }}>
        {STAT_PILLS.map(([label, value]) => (
          <GlassCard key={label} style={{ padding: '10px 18px', borderRadius: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 8, color: '#4A5C6A', letterSpacing: '0.1em' }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#9BA8AB' }}>{value}</span>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* 1 — Pipeline */}
      <GlassCard style={{ width: '100%', padding: '20px 28px' }}>
        <div style={{ fontSize: 9, color: '#4A5C6A', letterSpacing: '0.12em', marginBottom: 14 }}>
          PIPELINE
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {PIPELINE_STEPS.map((text, i) => (
            <div key={i}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: 'rgba(37,55,69,0.8)',
                  border: '0.5px solid rgba(74,92,106,0.3)',
                  fontSize: 9, color: '#4A5C6A',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: 12, color: '#9BA8AB', fontWeight: 400, marginLeft: 12 }}>
                  {text}
                </span>
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <div style={{
                  width: 1, height: 10,
                  background: 'rgba(74,92,106,0.2)',
                  marginLeft: 8,
                }} />
              )}
            </div>
          ))}
        </div>
      </GlassCard>

      {/* 2 — Market Context */}
      <GlassCard style={{ width: '100%', padding: '20px 28px' }}>
        <div style={{ fontSize: 9, color: '#4A5C6A', letterSpacing: '0.12em', marginBottom: 12 }}>
          MARKET CONTEXT
        </div>
        <p style={{ fontSize: 13, color: '#9BA8AB', lineHeight: 1.7, fontWeight: 300, margin: 0 }}>
          In 2024, 49% of organisations experienced deepfake attacks - up from 29% in 2022 - with a deepfake attempt recorded every five minutes globally. New account fraud losses reached $6.2 billion in the US in 2024. The KYC verification market is projected to grow 140% over five years from a $9.2 billion baseline, driven by the need to counter AI-generated fraud in digital onboarding.
        </p>
        <div style={{ fontSize: 9, color: '#4A5C6A', marginTop: 10 }}>
          Source: Regula - The Future of KYC: Top KYC Trends in 2025
        </div>
        <div style={{ fontSize: 9, color: '#4A5C6A', marginTop: 10 }}>
          Source: Mitek Systems - Digital Fraud Defender, 2024
        </div>
      </GlassCard>

      {/* 3 — Threat + Adoption */}
      <div style={{ display: 'flex', gap: 14, width: '100%' }}>
        {/* Left — 2025 Threat Data */}
        <GlassCard style={{ flex: 1, padding: '20px 28px' }}>
          <div style={{ fontSize: 9, color: '#4A5C6A', letterSpacing: '0.12em', marginBottom: 14 }}>
            2025 THREAT DATA
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {THREAT_STATS.map(({ number, desc }) => (
              <div key={number}>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#9BA8AB' }}>{number}</div>
                <div style={{ fontSize: 10, color: '#4A5C6A', lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 9, color: '#4A5C6A', marginTop: 10 }}>
            Sources: Veriff 2025 Identity Fraud Report · Deloitte Center for Financial Services · Entrust 2025 Identity Fraud Report
          </div>
        </GlassCard>

        {/* Right — Adoption Curve */}
        <GlassCard style={{ flex: 1, padding: '20px 28px' }}>
          <div style={{ fontSize: 9, color: '#4A5C6A', letterSpacing: '0.12em', marginBottom: 14 }}>
            ADOPTION CURVE
          </div>
          <svg width="100%" height="140" viewBox="0 0 270 140" preserveAspectRatio="xMidYMid meet">
            {ADOPTION_DATA.map(({ year, value, projected }, i) => {
              const barW = 30;
              const gap  = 15;
              const x    = i * (barW + gap) + 5;
              const maxH = 90;
              const barH = (value / 100) * maxH;
              const y    = 100 - barH;
              return (
                <g key={year}>
                  {projected ? (
                    <>
                      <rect
                        x={x} y={y} width={barW} height={barH}
                        fill="rgba(74,92,106,0.25)"
                        stroke="rgba(74,92,106,0.5)"
                        strokeWidth="0.5"
                        strokeDasharray="3 2"
                      />
                    </>
                  ) : (
                    <rect
                      x={x} y={y} width={barW} height={barH}
                      fill="rgba(74,92,106,0.5)"
                    />
                  )}
                  <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="8" fill="#9BA8AB">
                    {value}%
                  </text>
                  <text x={x + barW / 2} y={118} textAnchor="middle" fontSize="8" fill="#4A5C6A">
                    {year}
                  </text>
                </g>
              );
            })}
          </svg>
          <div style={{ fontSize: 9, color: '#253745', marginTop: 4 }}>
            % of organisations reporting deepfake fraud attempts
          </div>
          <div style={{ fontSize: 8, color: '#4A5C6A', marginTop: 6 }}>
            Source: Regula 2024 / Entrust 2025 / projected trend
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

/* ─── Navbar ─────────────────────────────────────────────────── */
function Navbar() {
  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '14px 0 13px',
      borderBottom: '0.5px solid rgba(255,255,255,0.05)',
      marginBottom: 13,
    }}>
      {/* Left — wordmark dot + DFDS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 7, height: 7,
          borderRadius: '50%',
          background: '#253745',
          flexShrink: 0,
          display: 'inline-block',
        }} />
        <span style={{ fontSize: 14, fontWeight: 500, color: '#9BA8AB', letterSpacing: '0.12em' }}>
          DFDS
        </span>
      </div>

      {/* Right — system badge */}
      <span style={{
        fontSize: 11,
        color: '#4A5C6A',
        background: 'rgba(37,55,69,0.5)',
        border: '0.5px solid rgba(74,92,106,0.2)',
        borderRadius: 4,
        padding: '3px 9px',
        letterSpacing: '0.1em',
      }}>
        KYC · DEEPFAKE DETECTION SYSTEM
      </span>
    </nav>
  );
}

/* ─── App ────────────────────────────────────────────────────── */
export default function App() {
  const [imageFile,    setImageFile]    = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageResult,  setImageResult]  = useState(null);
  const [imageError,   setImageError]   = useState(null);

  const [videoFile,    setVideoFile]    = useState(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoResult,  setVideoResult]  = useState(null);
  const [videoError,   setVideoError]   = useState(null);

  /* Image file selected */
  function handleFileSelect(file) {
    const err = validateFile(file);
    if (err) {
      setImageFile(null);
      setImageError(err);
      setImageResult(null);
      return;
    }
    setImageFile(file);
    setImageError(null);
    setImageResult(null);
  }

  /* Video file selected */
  function handleVideoFileSelect(file) {
    const err = validateVideoFile(file);
    if (err) {
      setVideoFile(null);
      setVideoError(err);
      setVideoResult(null);
      return;
    }
    setVideoFile(file);
    setVideoError(null);
    setVideoResult(null);
  }

  /* POST /predict/image */
  async function handleAnalyse() {
    if (!imageFile || imageLoading) return;

    setImageLoading(true);
    setImageResult(null);
    setImageError(null);

    const formData = new FormData();
    formData.append('file', imageFile);

    const startMs = Date.now();
    try {
      const res = await axios.post(`${API_BASE}/predict/image`, formData, { timeout: 120000 });
      const processingTime = ((Date.now() - startMs) / 1000).toFixed(1);
      setImageResult({ ...res.data, processingTime });
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setImageError('Request timed out — the analysis is taking too long. Please try again.');
      } else if (err.response) {
        const status = err.response.status;
        if (status === 400) {
          setImageError('No face detected — ensure the image shows a clear, unobstructed face.');
        } else if (status === 413) {
          setImageError('File too large — the server rejected the upload.');
        } else if (status === 422) {
          setImageError('Unsupported file type — please upload a JPG, PNG, or WEBP image.');
        } else if (status === 500) {
          setImageError('Analysis failed — an error occurred during inference. Please try again.');
        } else {
          setImageError(`Unexpected error (HTTP ${status}) — please try again.`);
        }
      } else if (err.code === 'ERR_NETWORK') {
        setImageError('Cannot reach the server — make sure the backend is running on port 8000.');
      } else {
        setImageError('Something went wrong — please refresh the page and try again.');
      }
    } finally {
      setImageLoading(false);
    }
  }

  /* POST /predict/video */
  async function handleVideoAnalyse() {
    if (!videoFile || videoLoading) return;

    setVideoLoading(true);
    setVideoResult(null);
    setVideoError(null);

    const formData = new FormData();
    formData.append('file', videoFile);

    const startMs = Date.now();
    try {
      const res = await axios.post(`${API_BASE}/predict/video`, formData, { timeout: 300000 });
      const processingTime = ((Date.now() - startMs) / 1000).toFixed(1);
      setVideoResult({ ...res.data, processingTime });
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setVideoError('Request timed out - video analysis can take up to 30 seconds. Please try again.');
      } else if (err.response) {
        const status = err.response.status;
        if (status === 400) {
          setVideoError('Insufficient valid frames - ensure the video contains clear frontal faces throughout.');
        } else if (status === 422) {
          setVideoError('Unsupported file type - please upload an MP4, MOV, AVI, or MKV video.');
        } else if (status === 500) {
          setVideoError('Analysis failed - an error occurred during inference. Please try again.');
        } else {
          setVideoError(`Unexpected error (HTTP ${status}) - please try again.`);
        }
      } else if (err.code === 'ERR_NETWORK') {
        setVideoError('Cannot reach the server - make sure the backend is running on port 8000.');
      } else {
        setVideoError('Something went wrong - please refresh the page and try again.');
      }
    } finally {
      setVideoLoading(false);
    }
  }

  /* Reset everything back to idle */
  function handleReset() {
    setImageFile(null);  setImageResult(null);  setImageError(null);  setImageLoading(false);
    setVideoFile(null);  setVideoResult(null);  setVideoError(null);  setVideoLoading(false);
  }

  const anyResult = imageResult || videoResult;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#06141B',
      fontFamily: "'Inter', sans-serif",
      padding: 24,
    }}>
      <Navbar />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <UploadPanel
          imageFile={imageFile}
          imageLoading={imageLoading}
          imageError={imageError}
          onFileSelect={handleFileSelect}
          onAnalyse={handleAnalyse}
          videoFile={videoFile}
          videoLoading={videoLoading}
          videoError={videoError}
          onVideoFileSelect={handleVideoFileSelect}
          onVideoAnalyse={handleVideoAnalyse}
        />

        {!anyResult && <EmptyState />}

        {anyResult && (
          <ResultsRow
            imageResult={imageResult}
            videoResult={videoResult}
          />
        )}

        {anyResult && (
          <GradCamPanel
            imageResult={imageResult}
            videoResult={videoResult}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
}

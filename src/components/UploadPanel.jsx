import { useEffect, useRef, useState } from 'react';
import GlassCard from './GlassCard';

/* ─── Helpers ────────────────────────────────────────────────── */
function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
const VIDEO_EXT = /\.(mp4|mov|avi|mkv)$/i;

/* ─── Upload arrow icon ──────────────────────────────────────── */
function UploadIcon({ dragging }) {
  const color = dragging ? '#9BA8AB' : '#4A5C6A';
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1v8M4 4l3-3 3 3" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 11h10" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

/* ─── Dashed drop zone (click + drag) ───────────────────────── */
function DropZone({ onBrowse, dragging, onDragOver, onDragLeave, onDrop }) {
  const borderColor = dragging ? 'rgba(156,186,171,0.5)' : 'rgba(74,92,106,0.38)';
  const bgColor     = dragging ? 'rgba(37,55,69,0.15)'   : 'transparent';

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onBrowse}
      style={{
        border: `0.5px dashed ${borderColor}`,
        borderRadius: 9,
        padding: '22px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        textAlign: 'center',
        background: bgColor,
        cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      {/* Icon circle */}
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: 'rgba(37,55,69,0.5)',
        border: '0.5px solid rgba(74,92,106,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <UploadIcon dragging={dragging} />
      </div>

      <span style={{ fontSize: 14, color: '#9BA8AB', fontWeight: 400, pointerEvents: 'none' }}>
        {dragging ? 'Release to upload' : 'Drop file here'}
      </span>
      <span style={{ fontSize: 12, color: '#4A5C6A', pointerEvents: 'none' }}>
        JPG · PNG · MP4 · MOV · max 500MB
      </span>

      {/* Browse button — stopPropagation so it doesn't double-fire the parent onClick */}
      <button
        onClick={e => { e.stopPropagation(); onBrowse(); }}
        style={{
          marginTop: 2, fontSize: 12, color: '#4A5C6A',
          background: 'rgba(37,55,69,0.4)',
          border: '0.5px solid rgba(74,92,106,0.25)',
          borderRadius: 5, padding: '4px 12px',
          cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em',
        }}
      >
        Browse
      </button>
    </div>
  );
}

/* ─── Right column — conditional status states ───────────────── */
function StatusColumn({ file, loading, error, onAnalyse, isVideo }) {
  /* Loading state */
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 9, height: '100%' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span className="spinner" />
            <span style={{ fontSize: 12, color: '#4A5C6A' }}>
              {isVideo
                ? 'Analysing video frames - this may take 15-30 seconds'
                : 'Analysing image… this may take 2–4 seconds'}
            </span>
          </div>
          {/* Progress bar — mounts fresh each load, animation restarts automatically */}
          <div style={{
            marginTop: 7, height: 2, borderRadius: 2,
            background: 'rgba(74,92,106,0.12)', overflow: 'hidden',
          }}>
            <div className="progress-loading" />
          </div>
        </div>
      </div>
    );
  }

  /* Error state (API or validation error) */
  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 9, height: '100%' }}>
        <div style={{
          background: 'rgba(120,30,30,0.18)',
          border: '0.5px solid rgba(162,45,45,0.22)',
          borderRadius: 7, padding: '8px 12px',
          fontSize: 12, color: '#F09595', lineHeight: 1.5,
        }}>
          {error}
        </div>
      </div>
    );
  }

  /* File selected and valid — show ready box + Analyse button */
  if (file) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 9, height: '100%' }}>
        <div style={{
          background: 'rgba(15,80,65,0.10)',
          border: '0.5px solid rgba(29,158,117,0.18)',
          borderRadius: 7, padding: '8px 12px',
          fontSize: 12, color: '#5DCAA5', lineHeight: 1.5,
        }}>
          {file.name} · {formatSize(file.size)} · ready to analyse
        </div>

        {/* Analyse CTA */}
        <button
          onClick={onAnalyse}
          style={{
            width: '100%',
            fontSize: 14, fontWeight: 500,
            color: '#9BA8AB',
            background: 'rgba(37,55,69,0.6)',
            border: '0.5px solid rgba(74,92,106,0.4)',
            borderRadius: 7, padding: '9px 0',
            cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.08em',
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background    = 'rgba(37,55,69,0.85)';
            e.currentTarget.style.borderColor   = 'rgba(74,92,106,0.65)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background    = 'rgba(37,55,69,0.6)';
            e.currentTarget.style.borderColor   = 'rgba(74,92,106,0.4)';
          }}
        >
          Analyse →
        </button>
      </div>
    );
  }

  /* Idle — no file selected yet */
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
      height: '100%', gap: 6,
    }}>
      <span style={{ fontSize: 12, color: '#253745', textAlign: 'center', lineHeight: 1.6 }}>
        Select or drop a file to begin analysis
      </span>
    </div>
  );
}

/* ─── UploadPanel (Panel 1) ──────────────────────────────────── */
export default function UploadPanel({
  imageFile, imageLoading, imageError, onFileSelect, onAnalyse,
  videoFile, videoLoading, videoError, onVideoFileSelect, onVideoAnalyse,
}) {
  const fileInputRef = useRef(null);
  const [dragging,   setDragging]   = useState(false);
  const [localError, setLocalError] = useState(null);

  /* Clear local error when App resets all external state */
  useEffect(() => {
    if (!imageFile && !imageError && !videoFile && !videoError) {
      setLocalError(null);
    }
  }, [imageFile, imageError, videoFile, videoError]);

  function handleFile(file) {
    if (!file) return;
    setLocalError(null);
    if (IMAGE_EXT.test(file.name)) {
      onFileSelect(file);
    } else if (VIDEO_EXT.test(file.name)) {
      onVideoFileSelect(file);
    } else {
      setLocalError('Unsupported file type - please upload a JPG, PNG, WEBP, MP4, MOV, AVI, or MKV file.');
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }
  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
  }
  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  const isVideoMode    = !!(videoFile || videoLoading || videoError);
  const currentFile    = isVideoMode ? videoFile    : imageFile;
  const currentLoading = isVideoMode ? videoLoading : imageLoading;
  const currentError   = localError || (isVideoMode ? videoError : imageError);
  const currentAnalyse = isVideoMode ? onVideoAnalyse : onAnalyse;

  return (
    <GlassCard>
      {/* Section label */}
      <div style={{ fontSize: 11, fontWeight: 500, color: '#4A5C6A', letterSpacing: '0.12em', marginBottom: 16 }}>
        UPLOAD
      </div>

      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,.jpg,.jpeg,.png,.webp,.mp4,.mov,.avi,.mkv"
        style={{ display: 'none' }}
        onChange={e => { handleFile(e.target.files[0]); e.target.value = ''; }}
      />

      {/* Three-column grid: content | divider | content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.5px 1.2fr', columnGap: 24 }}>
        {/* Left column — drop zone */}
        <div>
          <DropZone
            dragging={dragging}
            onBrowse={() => fileInputRef.current.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          />
        </div>

        {/* Middle divider */}
        <div style={{ background: 'rgba(255,255,255,0.04)' }} />

        {/* Right column — conditional status */}
        <StatusColumn
          file={currentFile}
          loading={currentLoading}
          error={currentError}
          onAnalyse={currentAnalyse}
          isVideo={isVideoMode}
        />
      </div>
    </GlassCard>
  );
}

import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.services.gradcam import generate_gradcam_b64
from app.services.model import MODEL_NAME, get_model, load_model, run_inference
from app.services.preprocess import detect_and_crop_face, preprocess_face
from app.services.video import extract_frames

TEMP_DIR = Path("temp_uploads")
TEMP_DIR.mkdir(exist_ok=True)

FAKE_THRESHOLD: float = 0.5
VIDEO_N_FRAMES: int = 10
VIDEO_MIN_FRAMES: int = 3
VIDEO_STD_FLAG: float = 0.20

_ALLOWED_IMAGES = {"image/jpeg", "image/png", "image/webp"}
_ALLOWED_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}
_ALLOWED_VIDEOS = {"video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska"}
_ALLOWED_VIDEO_EXT = {".mp4", ".mov", ".avi", ".mkv"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_model()
    yield


app = FastAPI(
    title="Deepfake Detection API",
    description="EfficientNet-B2 deepfake detection for FinTech KYC identity verification.",
    version="1.0.0",
    lifespan=lifespan,
)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _save_upload(upload: UploadFile, allowed_ext: set[str]) -> Path:
    suffix = Path(upload.filename or "").suffix.lower()
    if suffix not in allowed_ext:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file extension '{suffix}'. Allowed: {sorted(allowed_ext)}",
        )
    dest = TEMP_DIR / f"{uuid.uuid4().hex}{suffix}"
    content = upload.file.read()
    dest.write_bytes(content)
    return dest


def _remove(path: Path) -> None:
    try:
        path.unlink(missing_ok=True)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/", summary="Health check")
def health_check():
    model, device = get_model()
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "device": str(device),
        "threshold": FAKE_THRESHOLD,
    }


# ---------------------------------------------------------------------------
# Image endpoint
# ---------------------------------------------------------------------------

@app.post("/predict/image", summary="Deepfake detection on a single image")
async def predict_image(file: UploadFile = File(...)):
    tmp_path = _save_upload(file, _ALLOWED_IMAGE_EXT)
    try:
        image_bgr = cv2.imread(str(tmp_path))
        if image_bgr is None:
            raise HTTPException(status_code=422, detail="File could not be decoded as an image.")

        result = detect_and_crop_face(image_bgr)
        if result is None:
            raise HTTPException(
                status_code=400,
                detail="No face detected in the image. Ensure the image contains a clear, forward-facing face.",
            )
        pil_face, _face_conf = result

        face_tensor = preprocess_face(pil_face)
        fake_prob, real_prob, predicted_class = run_inference(face_tensor)

        model, device = get_model()
        gradcam_b64 = generate_gradcam_b64(model, device, face_tensor, class_idx=predicted_class)

        label = "Fake" if predicted_class == 0 else "Real"
        confidence = fake_prob if predicted_class == 0 else real_prob

        return JSONResponse({
            "prediction": label,
            "confidence": round(confidence, 6),
            "gradcam_heatmap": gradcam_b64,
        })

    finally:
        _remove(tmp_path)


# ---------------------------------------------------------------------------
# Video endpoint
# ---------------------------------------------------------------------------

@app.post("/predict/video", summary="Deepfake detection on a video")
async def predict_video(file: UploadFile = File(...)):
    tmp_path = _save_upload(file, _ALLOWED_VIDEO_EXT)
    try:
        try:
            frames = extract_frames(tmp_path, n_frames=VIDEO_N_FRAMES)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc))

        model, device = get_model()

        per_frame: list[dict] = []
        face_tensors: list[tuple[int, object]] = []   # (original_frame_idx, tensor)

        for frame_idx, frame_bgr in enumerate(frames):
            result = detect_and_crop_face(frame_bgr)
            if result is None:
                continue

            pil_face, face_conf = result
            tensor = preprocess_face(pil_face)
            fake_prob, _real_prob, _predicted = run_inference(tensor)

            per_frame.append({
                "frame_index": frame_idx,
                "fake_prob": round(float(fake_prob), 6),
                "face_detection_conf": round(float(face_conf), 6),
            })
            face_tensors.append((frame_idx, tensor))

        if len(per_frame) < VIDEO_MIN_FRAMES:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Only {len(per_frame)} frame(s) had a detectable face; "
                    f"minimum {VIDEO_MIN_FRAMES} required for a reliable verdict."
                ),
            )

        fake_probs = np.array([f["fake_prob"] for f in per_frame], dtype=np.float64)
        face_confs = np.array([f["face_detection_conf"] for f in per_frame], dtype=np.float64)

        # Weighted average fake probability (weight = face detection confidence)
        weight_sum = float(face_confs.sum())
        weighted_avg = (
            float(np.average(fake_probs, weights=face_confs))
            if weight_sum > 0
            else float(np.mean(fake_probs))
        )
        variance = float(np.std(fake_probs))

        # Top 3 frames closest to weighted mean (most representative)
        distances = np.abs(fake_probs - weighted_avg)
        top3_indices = np.argsort(distances)[:3]
        class_idx = 0 if weighted_avg >= FAKE_THRESHOLD else 1

        gradcam_heatmaps: list[str] = []
        for idx in top3_indices:
            _, tensor_for_cam = face_tensors[idx]
            gradcam_heatmaps.append(
                generate_gradcam_b64(model, device, tensor_for_cam, class_idx=class_idx)
            )

        gradcam_b64 = gradcam_heatmaps[0]  # best single frame for backwards compat

        label = "Fake" if weighted_avg >= FAKE_THRESHOLD else "Real"

        # confidence = weighted average fake probability (float 0–1, weight = face detection conf)
        response: dict = {
            "prediction": label,
            "confidence": round(weighted_avg, 6),
            "variance": round(variance, 6),
            "frames_analyzed": len(per_frame),
            "per_frame_results": per_frame,
            "gradcam_heatmap": gradcam_b64,
            "gradcam_heatmaps": gradcam_heatmaps,
        }
        if variance > VIDEO_STD_FLAG:
            response["risk_flag"] = "high_variance"

        return JSONResponse(response)

    finally:
        _remove(tmp_path)
import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.services.gradcam import generate_gradcam_b64
from app.services.model import MODEL_NAME, get_model, load_model, run_inference
from app.services.preprocess import detect_and_crop_face, preprocess_face
from app.services.video import extract_frames

TEMP_DIR = Path("temp_uploads")
TEMP_DIR.mkdir(exist_ok=True)

FAKE_THRESHOLD: float = 0.5
VIDEO_N_FRAMES: int = 10
VIDEO_MIN_FRAMES: int = 3
VIDEO_STD_FLAG: float = 0.20

_ALLOWED_IMAGES = {"image/jpeg", "image/png", "image/webp"}
_ALLOWED_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}
_ALLOWED_VIDEOS = {"video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska"}
_ALLOWED_VIDEO_EXT = {".mp4", ".mov", ".avi", ".mkv"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_model()
    yield


app = FastAPI(
    title="Deepfake Detection API",
    description="EfficientNet-B2 deepfake detection for FinTech KYC identity verification.",
    version="1.0.0",
    lifespan=lifespan,
)


def _save_upload(upload: UploadFile, allowed_ext: set[str]) -> Path:
    suffix = Path(upload.filename or "").suffix.lower()
    if suffix not in allowed_ext:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file extension '{suffix}'. Allowed: {sorted(allowed_ext)}",
        )
    dest = TEMP_DIR / f"{uuid.uuid4().hex}{suffix}"
    content = upload.file.read()
    dest.write_bytes(content)
    return dest


def _remove(path: Path) -> None:
    try:
        path.unlink(missing_ok=True)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/", summary="Health check")
def health_check():
    model, device = get_model()
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "device": str(device),
        "threshold": FAKE_THRESHOLD,
    }


# ---------------------------------------------------------------------------
# Image endpoint
# ---------------------------------------------------------------------------

@app.post("/predict/image", summary="Deepfake detection on a single image")
async def predict_image(file: UploadFile = File(...)):
    tmp_path = _save_upload(file, _ALLOWED_IMAGE_EXT)
    try:
        image_bgr = cv2.imread(str(tmp_path))
        if image_bgr is None:
            raise HTTPException(status_code=422, detail="File could not be decoded as an image.")

        result = detect_and_crop_face(image_bgr)
        if result is None:
            raise HTTPException(
                status_code=422,
                detail="No face detected in the image. Ensure the image contains a clear, forward-facing face.",
            )
        pil_face, _face_conf = result

        face_tensor = preprocess_face(pil_face)
        fake_prob, real_prob, predicted_class = run_inference(face_tensor)

        model, device = get_model()
        gradcam_b64 = generate_gradcam_b64(model, device, face_tensor, class_idx=predicted_class)

        label = "Fake" if predicted_class == 0 else "Real"
        confidence = fake_prob if predicted_class == 0 else real_prob

        return JSONResponse({
            "prediction": label,
            "confidence": round(confidence, 6),
            "gradcam_heatmap": gradcam_b64,
        })

    finally:
        _remove(tmp_path)


# ---------------------------------------------------------------------------
# Video endpoint
# ---------------------------------------------------------------------------

@app.post("/predict/video", summary="Deepfake detection on a video")
async def predict_video(file: UploadFile = File(...)):
    tmp_path = _save_upload(file, _ALLOWED_VIDEO_EXT)
    try:
        try:
            frames = extract_frames(tmp_path, n_frames=VIDEO_N_FRAMES)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc))

        model, device = get_model()

        per_frame: list[dict] = []
        face_tensors: list[tuple[int, object]] = []   # (original_frame_idx, tensor)

        for frame_idx, frame_bgr in enumerate(frames):
            result = detect_and_crop_face(frame_bgr)
            if result is None:
                continue

            pil_face, face_conf = result
            tensor = preprocess_face(pil_face)
            fake_prob, _real_prob, _predicted = run_inference(tensor)

            per_frame.append({
                "frame_index": frame_idx,
                "fake_prob": round(float(fake_prob), 6),
                "face_detection_conf": round(float(face_conf), 6),
            })
            face_tensors.append((frame_idx, tensor))

        if len(per_frame) < VIDEO_MIN_FRAMES:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Only {len(per_frame)} frame(s) had a detectable face; "
                    f"minimum {VIDEO_MIN_FRAMES} required for a reliable verdict."
                ),
            )

        fake_probs = np.array([f["fake_prob"] for f in per_frame], dtype=np.float64)
        face_confs = np.array([f["face_detection_conf"] for f in per_frame], dtype=np.float64)

        # Weighted average fake probability (weight = face detection confidence)
        weighted_avg = float(np.average(fake_probs, weights=face_confs))
        variance = float(np.std(fake_probs))

        # Grad-CAM on the frame whose fake_prob is closest to the weighted mean
        closest_idx = int(np.argmin(np.abs(fake_probs - weighted_avg)))
        _frame_idx_for_cam, best_tensor = face_tensors[closest_idx]
        gradcam_b64 = generate_gradcam_b64(
            model,
            device,
            best_tensor,
            class_idx=0 if weighted_avg >= FAKE_THRESHOLD else 1,
        )

        label = "Fake" if weighted_avg >= FAKE_THRESHOLD else "Real"

        response: dict = {
            "prediction": label,
            "confidence": round(weighted_avg, 6),
            "variance": round(variance, 6),
            "frames_analyzed": len(per_frame),
            "per_frame_results": per_frame,
            "gradcam_heatmap": gradcam_b64,
        }
        if variance > VIDEO_STD_FLAG:
            response["risk_flag"] = "high_variance"

        return JSONResponse(response)

    finally:
        _remove(tmp_path)

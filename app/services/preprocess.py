from typing import Optional

import cv2
import numpy as np
from PIL import Image
import torch
from torchvision import transforms
from retinaface import RetinaFace

_CONFIDENCE_THRESHOLD = 0.90
_MIN_FACE_PX = 50
_PADDING = 20
_INPUT_SIZE = 260

_IMAGENET_MEAN = [0.485, 0.456, 0.406]
_IMAGENET_STD = [0.229, 0.224, 0.225]

_transform = transforms.Compose([
    transforms.Resize((_INPUT_SIZE, _INPUT_SIZE), interpolation=transforms.InterpolationMode.BICUBIC),
    transforms.ToTensor(),
    transforms.Normalize(mean=_IMAGENET_MEAN, std=_IMAGENET_STD),
])


def detect_and_crop_face(image_bgr: np.ndarray) -> Optional[tuple[Image.Image, float]]:
    """
    Runs RetinaFace on a BGR numpy array.
    Returns (RGB PIL crop, detection confidence) for the highest-confidence face
    that meets the thresholds, or None if no qualifying face is found.
    """
    detections = RetinaFace.detect_faces(image_bgr)

    if not isinstance(detections, dict):
        return None

    best_conf = -1.0
    best_box: Optional[tuple[int, int, int, int]] = None

    for face_data in detections.values():
        conf: float = float(face_data.get("score", 0.0))
        if conf < _CONFIDENCE_THRESHOLD:
            continue

        x1, y1, x2, y2 = face_data["facial_area"]
        w, h = x2 - x1, y2 - y1
        if w < _MIN_FACE_PX or h < _MIN_FACE_PX:
            continue

        if conf > best_conf:
            best_conf = conf
            best_box = (x1, y1, x2, y2)

    if best_box is None:
        return None

    H, W = image_bgr.shape[:2]
    x1, y1, x2, y2 = best_box
    x1 = max(0, x1 - _PADDING)
    y1 = max(0, y1 - _PADDING)
    x2 = min(W, x2 + _PADDING)
    y2 = min(H, y2 + _PADDING)

    crop_bgr = image_bgr[y1:y2, x1:x2]
    crop_rgb = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2RGB)
    return Image.fromarray(crop_rgb), best_conf


def preprocess_face(pil_face: Image.Image) -> torch.Tensor:
    """Returns ImageNet-normalised tensor of shape [1, 3, 260, 260]."""
    return _transform(pil_face).unsqueeze(0)

from pathlib import Path
from typing import Union

import cv2
import numpy as np


def extract_frames(video_path: Union[str, Path], n_frames: int = 10) -> list[np.ndarray]:
    """
    Extracts n_frames evenly spaced frames from the video.
    Returns a list of BGR numpy arrays.
    Raises ValueError if the video cannot be opened or contains no readable frames.
    """
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise ValueError(f"Cannot open video file: {video_path}")

    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total < 1:
        cap.release()
        raise ValueError("Video reports zero frames.")

    indices = np.linspace(0, total - 1, n_frames, dtype=int)
    frames: list[np.ndarray] = []

    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
        ret, frame = cap.read()
        if ret:
            frames.append(frame)

    cap.release()

    if not frames:
        raise ValueError("No frames could be read from the video.")

    return frames

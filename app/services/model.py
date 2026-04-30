from typing import Optional

import torch
import torch.nn as nn
from torchvision import models
from pathlib import Path

CHECKPOINT_PATH = Path("models/run3_best_effnetb2.pth")
MODEL_NAME = "EfficientNet-B2"
_IN_FEATURES = 1408
_DROPOUT = 0.3
_NUM_CLASSES = 2

_model: Optional[nn.Module] = None
_device: Optional[torch.device] = None


def get_device() -> torch.device:
    if torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def load_model() -> tuple[nn.Module, torch.device]:
    global _model, _device

    _device = get_device()

    net = models.efficientnet_b2(weights=None)
    net.classifier = nn.Sequential(
        nn.Dropout(_DROPOUT),
        nn.Linear(_IN_FEATURES, _NUM_CLASSES),
    )

    checkpoint = torch.load(CHECKPOINT_PATH, map_location=_device, weights_only=False)
    net.load_state_dict(checkpoint["model_state_dict"])

    # requires_grad=True on all params so Grad-CAM backward reaches model.features
    for param in net.parameters():
        param.requires_grad_(True)

    net.to(_device)
    net.eval()

    _model = net
    return _model, _device


def get_model() -> tuple[nn.Module, torch.device]:
    if _model is None or _device is None:
        raise RuntimeError("Model not loaded. Call load_model() at startup.")
    return _model, _device


def run_inference(tensor: torch.Tensor) -> tuple[float, float, int]:
    """
    Returns (fake_prob, real_prob, predicted_class_idx).
    Uses torch.no_grad for efficiency; Grad-CAM runs its own separate pass.
    """
    model, device = get_model()
    tensor = tensor.to(device)
    with torch.no_grad():
        logits = model(tensor)
        probs = torch.softmax(logits, dim=1)[0]
    fake_prob = probs[0].item()
    real_prob = probs[1].item()
    predicted = int(torch.argmax(probs).item())
    return fake_prob, real_prob, predicted

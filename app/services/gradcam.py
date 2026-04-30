import base64
import io
from typing import Optional

import cv2
import numpy as np
import torch
import torch.nn as nn
from PIL import Image


class GradCAM:
    """
    Hooks into a target Conv2d layer to produce spatial heatmaps showing which
    regions drove the model's prediction for a given class.
    """

    def __init__(self, model: nn.Module, target_layer: nn.Conv2d):
        self.model = model
        self.target_layer = target_layer
        self._activations: Optional[torch.Tensor] = None
        self._gradients: Optional[torch.Tensor] = None
        self._register_hooks()

    def _register_hooks(self) -> None:
        def forward_hook(module, input, output):
            self._activations = output.detach()

        def backward_hook(module, grad_input, grad_output):
            self._gradients = grad_output[0].detach()

        self._fwd_handle = self.target_layer.register_forward_hook(forward_hook)
        self._bwd_handle = self.target_layer.register_full_backward_hook(backward_hook)

    def remove_hooks(self) -> None:
        self._fwd_handle.remove()
        self._bwd_handle.remove()

    def generate(self, input_tensor: torch.Tensor, class_idx: int) -> np.ndarray:
        """
        Returns a [H, W] float32 heatmap normalised to [0, 1].
        input_tensor must have batch size 1 and already be on the correct device.
        """
        if input_tensor.size(0) != 1:
            raise ValueError(f"GradCAM expects batch size 1, got {input_tensor.size(0)}.")

        self._activations = None
        self._gradients = None

        self.model.zero_grad()
        logits = self.model(input_tensor)
        score = logits[0, class_idx]
        score.backward(retain_graph=False)

        if self._gradients is None or self._activations is None:
            raise RuntimeError(
                "Grad-CAM hooks did not fire. Verify that target_layer participates "
                "in both the forward and backward pass."
            )

        # Global-average-pool the gradients over spatial dims → channel weights
        weights = self._gradients.mean(dim=(2, 3), keepdim=True)   # [1, C, 1, 1]
        cam = (weights * self._activations).sum(dim=1).squeeze()    # [H, W]
        cam = torch.relu(cam).cpu().numpy().astype(np.float32)

        lo, hi = cam.min(), cam.max()
        if hi - lo > 1e-8:
            cam = (cam - lo) / (hi - lo)
        else:
            cam = np.zeros_like(cam)

        return cam


def find_target_layer(model: nn.Module) -> nn.Conv2d:
    """Returns the last Conv2d inside model.features, matching the notebook setup."""
    if not hasattr(model, "features"):
        raise RuntimeError("model.features not found; cannot determine Grad-CAM target layer.")
    for m in reversed(list(model.features.modules())):
        if isinstance(m, nn.Conv2d):
            return m
    raise RuntimeError("No Conv2d found in model.features.")


def generate_gradcam_b64(
    model: nn.Module,
    device: torch.device,
    face_tensor: torch.Tensor,
    class_idx: int,
    alpha: float = 0.45,
) -> str:
    """
    Runs a Grad-CAM forward+backward pass, overlays the heatmap on the face image,
    and returns the result as a base64-encoded PNG string.
    """
    target_layer = find_target_layer(model)
    gradcam = GradCAM(model, target_layer)
    try:
        inp = face_tensor.to(device)
        cam = gradcam.generate(inp, class_idx=class_idx)
    finally:
        gradcam.remove_hooks()

    # Denormalise face tensor → [H, W, 3] float in [0, 1]
    mean = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
    std = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)
    img = (face_tensor.squeeze(0).cpu() * std + mean).clamp(0, 1)
    img_np = img.permute(1, 2, 0).numpy()   # [H, W, 3] RGB float

    H, W = img_np.shape[:2]

    # Resize cam to image resolution and apply COLORMAP_JET (BGR output)
    cam_u8 = (cam * 255).astype(np.uint8)
    cam_resized = cv2.resize(cam_u8, (W, H), interpolation=cv2.INTER_CUBIC)
    heatmap_bgr = cv2.applyColorMap(cam_resized, cv2.COLORMAP_JET)
    heatmap_rgb = cv2.cvtColor(heatmap_bgr, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0

    overlaid = ((1 - alpha) * img_np + alpha * heatmap_rgb).clip(0, 1)
    out_u8 = (overlaid * 255).astype(np.uint8)

    buf = io.BytesIO()
    Image.fromarray(out_u8).save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")

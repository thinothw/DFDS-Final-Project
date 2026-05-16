# DFDS-Final-Project
# DFDS — Deepfake Detection System

**Deepfake Detection for FinTech Identity Verification: A Transfer Learning Approach with Spatial Interpretability**

An open-source deepfake detection API built for FinTech KYC identity verification workflows. The system is built on an EfficientNet-B2 model trained via two-phase transfer learning on 142,000+ face images, deployed through a FastAPI backend with Grad-CAM spatial interpretability embedded in every inference request.

**96.00% in-domain accuracy · 99.30% AUC · 89.01% AUC on FinTech-relevant unseen methods**

---

## System Requirements

- Python 3.9.6
- Node.js 18 or above
- Git

GPU acceleration via NVIDIA CUDA or Apple Silicon MPS is recommended. CPU-only operation is supported.

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/thinothw/DFDS-Final-Project.git
```

### 2. Backend setup

```bash
cd ~/deepfake-api-backend
python3.9 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Place the Run 5 model checkpoint `best_effnetb2.pth` inside the `models/` directory.

### 3. Frontend setup

```bash
cd ~/deepfake-frontend
npm install
```

---

## Environment Variable

Set the following before launching the backend. Required for RetinaFace compatibility with TensorFlow 2.20 and above:

```bash
export TF_USE_LEGACY_KERAS=1
```

---

## Running the System

Both the backend and frontend must be running simultaneously.

### Start the backend

```bash
cd ~/deepfake-api-backend && source venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The server is ready when the terminal confirms the model has loaded and displays the active compute device.

### Start the frontend

```bash
cd ~/deepfake-frontend && npm run dev
```

The application will be accessible in your browser at `http://localhost:5173`.

---

## Usage

Navigate to `http://localhost:5173` in any modern browser.

**Image inference** — drag and drop or upload a JPG, JPEG, PNG, or WEBP file up to 50MB. The system detects the face, runs inference, and returns a verdict with a confidence score and a Grad-CAM heatmap. Results appear within approximately 2 to 4 seconds.

**Video inference** — upload an MP4, MOV, AVI, or MKV file up to 500MB. Ten evenly spaced frames are extracted and processed independently. The system returns a confidence-weighted verdict, variance score, per-frame breakdown, and three representative Grad-CAM heatmaps. A HIGH VARIANCE badge is shown when predictions are inconsistent across frames. Video inference takes approximately 15 to 30 seconds.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Health check — returns model name, device, and threshold |
| POST | `/predict/image` | Single image deepfake detection with Grad-CAM |
| POST | `/predict/video` | Video deepfake detection with weighted aggregation and Grad-CAM panel |

---

## Error Reference

| Code | Cause |
|---|---|
| 400 | No face detected, or fewer than 3 valid video frames |
| 422 | Unsupported file type |
| Network error | Backend not running or unreachable on port 8000 |

---

## Project Structure
deepfake-api-backend/
├── app/
│   └── main.py            # FastAPI application
├── models/
│   └── best_effnetb2.pth  # Run 5 model checkpoint (place here)
└── venv/                  # Python virtual environment
deepfake-frontend/
├── src/                   # React components
└── package.json

---

## Tech Stack

**Backend** — Python 3.9.6, FastAPI, PyTorch, RetinaFace, OpenCV, Uvicorn

**Frontend** — React, Vite, Tailwind CSS

**Training** — AWS SageMaker, EfficientNet-B2, AdamW, Weights and Biases

---

## Author

Thinoth Weerasinghe · University of Plymouth · PUSL3190 Computing Project · 2026

Supervisor: Dr. Rasika Ranaweera

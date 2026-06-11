# DFDS - Deepfake Detection System

**Deepfake Detection for FinTech Identity Verification: A Transfer Learning Approach with Spatial Interpretability**

An open-source deepfake detection API built for FinTech KYC (Know Your Customer) identity verification workflows. The system is powered by an EfficientNet-B2 model trained via two-phase transfer learning on 142,000+ face images. It is deployed through a FastAPI backend with Grad-CAM spatial interpretability embedded directly into every inference request.

---

## Dataset Availability

The full, preprocessed dataset used for training and evaluating this system is publicly hosted on Hugging Face. It contains over 162,000 face images curated and structured for deepfake detection benchmarks.

* **Repository:** [Deepfake-Identity-Isolated-Dataset-PreP](https://huggingface.co/datasets/ThinothW/Deepfake-Identity-Isolated-Dataset-PreP)
* **Profile:** [Hugging Face - ThinothW](https://huggingface.co/ThinothW)

---

## Performance Benchmarks.

The model (best_effnetb2.pth - Run 5) was evaluated on a strictly isolated test set to ensure zero identity leakage, followed by a rigorous cross-dataset evaluation on 8 entirely unseen manipulation methods from the DF40 benchmark.

### 1. In-Domain Test Results.
Evaluated on 21,324 isolated images from the primary training distribution.

| Metric | Value |
| :--- | :--- |
| **Accuracy** | 96.00% |
| **ROC-AUC** | 99.30% |
| **F1 Score** | 0.9597 |
| **Validation Loss** | 0.1344 |


**Class-Level Breakdown:**
* **Fake (0):** Precision: 0.9563 | Recall: 0.9644 | F1: 0.9603
* **Real (1):** Precision: 0.9638 | Recall: 0.9555 | F1: 0.9597


### 2. Cross-Dataset Evaluation (Generalization).
Evaluated on 6,216 images across 8 previously unseen manipulation methods to test real-world generalization. 

**Aggregate Metrics:**
* **Accuracy:** 67.95%
* **ROC-AUC:** 71.50%
* **F1 Score:** 0.7398


**Per-Method Breakdown:**
This table highlights the model's high effectiveness against diffusion-based generation (MidJourney, CollabDiff) and the drop-off against specific GAN-based or legacy manipulations (StyleClip, whichfaceisreal).


| Method | Samples (N) | Accuracy | F1 Score | ROC-AUC | Fake Det% | Real Det% |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **MidJourney** | 742 | 93.13% | 0.9266 | 0.9961 | 99.5% | 86.8% |
| **CollabDiff** | 800 | 83.13% | 0.8525 | 0.9709 | 68.8% | 97.5% |
| **HeyGen** | 800 | 80.00% | 0.7050 | 0.8172 | 51.2% | 89.8% |
| **StarGAN** | 794 | 74.81% | 0.7831 | 0.8545 | 58.7% | 90.9% |
| **DeepFaceLab** | 702 | 69.37% | 0.6805 | 0.7692 | 73.5% | 65.2% |
| **StarGAN-v2** | 800 | 52.75% | 0.6730 | 0.6200 | 8.2% | 97.2% |
| **StyleClip** | 778 | 51.54% | 0.6696 | 0.5650 | 4.9% | 98.2% |
| **whichfaceisreal**| 800 | 50.00% | 0.6667 | 0.4759 | 0.0% | 100.0% |


### Isolated Cross-Dataset Generalization (Run 5)
Evaluation of the model's performance on unseen methods, grouped by manipulation category.

| Subset | Accuracy | AUC | Support (N) |
| :--- | :--- | :--- | :--- |
| **All 8 methods** | 67.95% | 0.7568 | 6,216 |
| **EFS training-similar (CollabDiff + MidJourney)** | 87.93% | 0.9830 | 1,542 |
| **Face Swap (DeepFaceLab + HeyGen)** | 69.97% | 0.7948 | 1,502 |
| **FS + EFS combined (FinTech-relevant)** | 79.07% | 0.8901 | 3,044 |
| **GAN-based unseen (StarGAN family)** | 57.28% | 0.6289 | 3,172 |


---

## System Requirements.

* Python 3.9.6
* Node.js 18 or above
* Git
* Note: GPU acceleration via NVIDIA CUDA or Apple Silicon MPS is recommended for optimal inference speed. CPU-only operation is supported.

---

## Installation & Setup.

### 1. Clone the repository.
git clone https://github.com/thinothw/DFDS-Final-Project.git

### 2. Backend Setup.
cd ~/deepfake-api-backend
python3.9 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

Warning: Place the trained model checkpoint (best_effnetb2.pth) directly inside the models/ directory before starting the server.

### 3. Frontend Setup.
cd ~/deepfake-frontend
npm install

### 4. Environment Variables.
Set the following variable before launching the backend. This is required for RetinaFace compatibility with TensorFlow 2.20+:
export TF_USE_LEGACY_KERAS=1

---

## Running the System.

Both the frontend and backend must be running simultaneously.

**Start the Backend:**
cd ~/deepfake-api-backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

The server is ready when the terminal confirms the model has loaded and displays the active compute device.

**Start the Frontend:**
cd ~/deepfake-frontend
npm run dev

Access the application in your browser at http://localhost:5173.

---

## Usage Guide.

Navigate to the web interface to test the detection system:

* Image Inference: Drag and drop or upload a JPG, JPEG, PNG, or WEBP file (up to 50MB). The system executes face detection, runs the EfficientNet inference, and returns a verdict accompanied by a confidence score and a Grad-CAM heatmap. (Processing time: ~5-10 seconds).
* Video Inference: Upload an MP4, MOV, AVI, or MKV file (up to 500MB). The system extracts 10 evenly spaced frames and processes them independently. It returns a confidence-weighted verdict, a variance score, a per-frame breakdown, and three representative Grad-CAM heatmaps. A HIGH VARIANCE badge triggers if predictions are heavily inconsistent across frames. (Processing time: ~15-30 seconds).

---

## API Endpoints.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | / | Health check — returns model name, active device, and threshold logic. |
| POST | /predict/image | Single image deepfake detection returning confidence and a base64 Grad-CAM string. |
| POST | /predict/video | Video deepfake detection with weighted frame aggregation and Grad-CAM panel generation. |

### Error Reference.
| HTTP Code | Cause |
| :--- | :--- |
| 400 | No face detected in the image, or fewer than 3 valid faces detected in a video sequence. |
| 422 | Unsupported file type provided. |
| Network Error | Backend is not running or is unreachable on port 8000. |

---

## Project Structure.

deepfake-api-backend/
├── app/
│   └── main.py              # FastAPI application & inference logic
├── models/
│   └── best_effnetb2.pth    # Run 5 model checkpoint (User must place here)
└── venv/                    # Python virtual environment

deepfake-frontend/
├── src/                     # React components and UI
└── package.json             # Node dependencies

---

## Tech Stack.

* Backend: Python 3.9.6 | FastAPI | PyTorch | RetinaFace | OpenCV | Uvicorn
* Frontend: React | Vite | Tailwind CSS
* Training Infrastructure: AWS (SageMaker AI) | EfficientNet-B2 | AdamW | Weights & Biases (wandb)

---

## Author.

**Thinod Wickramasinghe** · University of Plymouth · 2026  
*Supervisor: Dr. Rasika Ranaweera*

HuggingFace: https://huggingface.co/ThinothW

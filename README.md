# Kutaksha

For a complete reconstruction and development procedure, see
[DEVELOPMENT_GUIDE.md](./docs/DEVELOPMENT_GUIDE.md).

Kutaksha is a preventive healthcare demo platform for monitoring eldercare wellness patterns through a browser-based dashboard. The application models patient movement and behavior trends to estimate health stability, risk, and severity using a lightweight digital-twin-inspired scoring flow.

## What this project does

- Provides role-based dashboards for:
  - Patient
  - Caretaker
  - Doctor
- Captures live webcam-based hand movement signals for a demo tracking experience
- Converts movement signals into health-related metrics
- Displays trend charts for:
  - HSI (Health Stability Index)
  - Risk score
  - Severity score
- Generates downloadable report text and CSV summaries
- Uses browser local storage for demo authentication and persisted sample metrics

## Project architecture

### Frontend
- React
- Vite
- Tailwind CSS
- Recharts
- react-webcam

### Tracking and scoring logic
- Camera input via `react-webcam`
- Real-time hand landmark extraction via MediaPipe Hands
- Feature extraction from landmark movement such as hand velocity, stability, rhythm, and variability
- Local scoring heuristics implemented in `frontend/src/utils/metrics.js`

## AI and API usage

### AI / vision stack currently used
1. MediaPipe Hands
   - Purpose: live hand landmark detection from webcam video
   - Used in: `frontend/src/components/CameraTracker.jsx`
   - Library source: `@mediapipe/hands` loaded from the jsDelivr CDN
   - What it provides: frame-by-frame hand landmarks, joint positions, and movement flow

2. Custom heuristic digital twin scoring model
   - Purpose: convert camera-derived movement patterns into clinical-style signals
   - Used in: `frontend/src/utils/metrics.js`
   - This is not a trained ML model in this repo. It is a rule-based scoring system using baseline comparison and deviation logic.

### API usage in this repo
The frontend is designed to optionally talk to a backend service through the environment variable:

- `VITE_API_BASE_URL`

If that variable is set, the app can call endpoints such as:

- `POST /api/detect`
- `POST /api/features`
- `POST /api/risk`
- `GET /api/digital-twin`
- `POST /api/explain`
- `POST /api/simulate`

These are referenced in `frontend/src/pages/DemoPage.jsx` and `frontend/src/pages/TechnologyPage.jsx`.

### Important note
- The repository includes a FastAPI backend for authentication, dashboards, demo analysis, and the optional RAG assistant.
- The frontend talks to the backend through `VITE_API_BASE_URL`, which defaults to `http://localhost:8000`.
- The RAG assistant uses Ollama by default, with LangGraph, FAISS, and local medical documents. Gemini remains an optional hosted provider.

## Main metric terms used in the graphs

### 1. HSI (Health Stability Index)
A composite score from 0 to 100 that estimates how stable the patient is relative to their baseline.

- Higher values = better stability
- Lower values = stronger decline signal
- It is computed from deviations in walking speed, activity, sitting duration, balance, posture, stride, tremor, fatigue, and movement variability.

### 2. Risk Score
A separate risk indicator from 0 to 100 that represents the likelihood of deterioration.

- Higher values = more concern
- Lower values = more stable condition
- The score increases when metrics drop or rise beyond expected baselines.

### 3. Severity Score
A normalized deviation score showing how far the current state is from the patient's baseline behavior.

- Higher values = stronger deviation from baseline
- It acts as a more detailed “distance from normal” signal.

### 4. Walking Speed
Movement velocity estimate during tracking.
- Works as one of the strongest mobility signals.
- Lower speed than baseline may indicate decline.

### 5. Activity Level
Estimated motion intensity or engagement level.
- Lower activity suggests lower physical participation or wellbeing.

### 6. Sitting Duration
How long the patient appears to spend sitting.
- Elevated sitting time may indicate reduced movement or possible decline.

### 7. Balance Score
An estimated stability measure based on body posture and wrist movement consistency.
- Lower balance score indicates weaker stability.

### 8. Tremor Index
A rough measure of movement instability or jitter.
- Higher values suggest more irregular or shaky motion.

### 9. Gait Rhythm
A score that reflects movement smoothness and rhythm continuity.
- Lower rhythm means more irregular walking or motion pattern.

### 10. Posture Stability
How stable the posture appears in the tracked movement.
- Lower scores indicate poor alignment or greater energy shift.

### 11. Step Stride
Estimated step distance or stride consistency.
- Lower stride than baseline can suggest reduced mobility.

### 12. Fatigue Index
A rough estimate of fatigue based on slower movement and higher irregularity.
- Higher values imply more tiredness or reduced resilience.

### 13. Movement Variability
A measure of how inconsistent motion is over time.
- More variability can signal instability or erratic movement patterns.

## How the workflow works

1. Webcam access is enabled in the browser.
2. MediaPipe Hands extracts landmarks from the user hand motion.
3. Movement signals are converted into metrics such as speed, posture, rhythm, and variability.
4. The app compares those live values against a baseline profile.
5. HSI, risk, and severity values are calculated.
6. Trend charts display the recent health trajectory.
7. Alerts are generated when deviations remain sustained over time.
8. Reports can be downloaded for caregiver or doctor review.

When the signed-in user opens the assistant, the frontend sends the latest behavior
metrics, baseline, recent tracking history, HSI, risk score, and severity score to
the backend. The RAG graph combines that behavior evidence with retrieved medical
report content before generating an answer. Behavior metrics are observational
signals and are not a diagnosis.

## Files of interest

- `frontend/src/components/CameraTracker.jsx` — webcam + MediaPipe tracking
- `frontend/src/utils/metrics.js` — metric normalization and scoring logic
- `frontend/src/components/LiveCharts.jsx` — charts used for HSI/risk/severity visualization
- `frontend/src/pages/PatientDashboard.jsx` — patient UI dashboard
- `frontend/src/pages/CaretakerDashboard.jsx` — caretaker monitoring dashboard
- `frontend/src/pages/DoctorDashboard.jsx` — doctor monitoring dashboard
- `frontend/src/utils/reports.js` — report and CSV generation

## RAG medical-records assistant

The LangGraph + Gemini assistant is wired into the app end to end:

```
/assistant page  ->  frontend/src/utils/api.js askRag()  ->  POST /chat/query (FastAPI)
                 ->  app/ai/rag_graph.py (LangGraph + FAISS + Gemini)
```

- **Frontend:** `frontend/src/pages/AssistantPage.jsx`, reachable at `/assistant` (sign-in required).
- **Backend:** `backend/app/api/chat_routes.py` + `backend/app/services/rag_service.py`.
- **Graph:** `backend/app/ai/rag_graph.py`, extracted from `data/Kutaksha Rag.ipynb`.
- **Floating launcher:** signed-in users can open the assistant from the bottom-right button without leaving the current page.

The assistant is optional. Without `GOOGLE_API_KEY`, the RAG dependencies, or
report PDFs, the rest of the app is unaffected and `/chat/query` returns a 503
explaining what is missing.

### Enable the RAG assistant

1. Install frontend dependencies:

```powershell
npm --prefix frontend install
```

2. Install backend dependencies:

```powershell
cd backend
..\.venv-1\Scripts\python.exe -m pip install -r requirements.txt
..\.venv-1\Scripts\python.exe -m pip install -r requirements-rag.txt
```

Use your configured Python environment if it has a different path.

3. Install Ollama and download the local answer model:

```powershell
ollama pull llama3.2:3b
```

4. Configure `backend/.env`:

```env
LLM_PROVIDER=ollama
OLLAMA_MODEL=llama3.2:3b
```

Ollama runs locally and does not use Gemini API quota. To use Gemini instead,
set the provider and key:

```env
LLM_PROVIDER=gemini
GOOGLE_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

5. Put at least one text-readable medical report PDF in:

```text
backend/docs/
```

CSV sensor exports are optional. Do not commit real patient documents or API
keys. The first RAG request builds and caches FAISS indexes in
`backend/rag_index/`; delete that folder after changing source documents.

6. Start the backend from the `backend` directory:

```powershell
..\.venv-1\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

7. In a second terminal, start the frontend:

```powershell
npm --prefix frontend run dev
```

Sign in, open **Assistant**, and ask a question about the uploaded report or the
patient's behavior trend. The chat endpoint requires a valid JWT.

## Tests

```bash
npm --prefix frontend test # frontend (vitest)
cd backend && python -m pytest -q    # backend (pytest)
```

## Environment setup

1. Install dependencies:

```bash
npm --prefix frontend install
```

2. Start the development server:

```bash
npm --prefix frontend run dev
```

3. Build for production:

```bash
npm --prefix frontend run build
```
ollama serve
Run the backend tests from the backend directory:

```powershell
cd backend
..\.venv-1\Scripts\python.exe -m pytest -q
```



- The current version is a demonstration of a preventive health tracking workflow.
- The model is intentionally explainable and lightweight rather than a deep clinical-grade medical AI.
- It is best positioned as a demo concept for preventive monitoring, clinician support, and digital-twin style visualization.

# SceneSolver — AI-Powered Crime Scene Investigation Assistant

Phase 1 · v1.0 · June 2026

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Tailwind CSS + Vite |
| Backend | FastAPI (Python 3.10+) + Motor (async MongoDB) |
| AI Pipeline | CLIP (crime classification) + YOLOv8 (evidence detection) + Groq LLM (reasoning) |
| PDF | ReportLab |
| Database | MongoDB 7 |
| Auth | JWT (access + refresh tokens) + bcrypt |
| Deployment | Docker Compose (4 containers) |

---

## Quick Start (Docker)

```bash
# 1. Clone and enter
cd scenesolver

# 2. Configure secrets
cp .env.example .env
# Edit .env — set JWT_SECRET_KEY and GROQ_API_KEY

# 3. Start all services
docker compose up --build

# Frontend:  http://localhost
# Backend:   http://localhost:8000
# API docs:  http://localhost:8000/docs
```

---

## Local Development

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp .env.example .env            # fill in values
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

### MongoDB
```bash
docker run -d -p 27017:27017 --name mongo mongo:7
```

---

## AI Pipeline (6 Steps)

```
Upload → CLIP Classifier → YOLOv8 Detector → Stats → Groq LLM → Risk Engine → PDF Report
```

1. **CLIP** — classifies crime type (10 classes) with confidence score
2. **YOLOv8** — detects 11 evidence classes, draws bounding boxes
3. **Stats** — aggregates evidence counts and confidence per class
4. **Groq LLM** — generates probabilistic narrative, event timeline, recommendations
5. **Risk Engine** — weighted score: `min(100, Σ weight × count)`
6. **ReportLab** — 10-section PDF forensic report

---

## Environment Variables (backend/.env)

| Variable | Description |
|---|---|
| `MONGODB_URL` | MongoDB connection string |
| `JWT_SECRET_KEY` | Secret for JWT signing (min 32 chars) |
| `GROQ_API_KEY` | Groq API key (get at console.groq.com) |
| `GROQ_MODEL` | Model name (default: llama3-8b-8192) |
| `YOLO_MODEL_PATH` | Path to custom YOLOv8 weights (falls back to yolov8n.pt) |
| `CLIP_MODEL_NAME` | CLIP model (default: openai/clip-vit-base-patch32) |
| `STORAGE_PATH` | Where to store images and reports |

---

## Custom YOLO Model

Place your fine-tuned YOLOv8 weights at `backend/models/yolo_crime.pt`.
If not present, the system falls back to `yolov8n.pt` (COCO pretrained) with COCO→evidence class mapping.

---

## API Reference

Full interactive docs: `http://localhost:8000/docs`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register org + first user |
| POST | `/auth/login` | Login, get tokens |
| POST | `/cases/upload` | Upload image, trigger pipeline |
| GET | `/cases` | List cases (paginated, filterable) |
| GET | `/cases/{id}` | Full case detail |
| GET | `/cases/{id}/report` | Download PDF |
| GET | `/dashboard/stats` | Org statistics |
| GET | `/admin/investigators` | List investigators (Admin) |

---

## Directory Structure

```
scenesolver/
├── backend/
│   ├── app/
│   │   ├── main.py              FastAPI app + lifespan
│   │   ├── config.py            Settings (pydantic-settings)
│   │   ├── routers/             auth, cases, dashboard, admin
│   │   ├── models/              Pydantic request/response models
│   │   ├── services/            auth_service, case_service, ai_pipeline
│   │   ├── ai/                  clip_classifier, yolo_detector, risk_engine,
│   │   │                        llm_reasoner, report_builder
│   │   ├── db/                  mongodb, collections
│   │   └── utils/               jwt_utils, file_handler, validators
│   ├── storage/images/          Uploaded images
│   ├── storage/reports/         Generated PDFs
│   └── models/                  YOLO model weights
├── frontend/
│   └── src/
│       ├── pages/               Landing, Login, Register, Dashboard,
│       │                        Upload, Cases, CaseDetail, Admin
│       ├── components/          Layout, RiskBadge, StatusBadge, EvidenceTable,
│       │                        ImageUploader, AnalysisProgress, DashboardCharts,
│       │                        NoteEditor, CaseSearch, ProtectedRoute
│       ├── hooks/               useAuth, useCases, useDashboard
│       ├── services/            api.js (Axios + interceptors)
│       └── utils/               formatters, constants
└── docker-compose.yml
```

---

## Notes

- All AI outputs use **probabilistic language** — "suggests", "possibly", "may indicate"
- The system includes a legal disclaimer on every PDF report
- Org isolation is enforced at every DB query via `org_id` filter
- YOLO falls back to COCO pretrained if custom weights are absent
- Groq LLM falls back to template-based response if API key is missing

# 🦸 Community Hero

> A hyperlocal civic issue reporting platform — **IDENTIFY → REPORT → VALIDATE → TRACK → RESOLVE**
> Built for the Vibe2Ship Hackathon (Coding Ninjas × Google for Developers).

Community Hero lets citizens report civic issues (potholes, water leaks, broken
streetlights, garbage, infrastructure failures) from their phone. A **5-agent
LangGraph pipeline** analyzes, validates, routes, monitors and predicts issues,
while a **3D city globe** visualizes the whole community in real time.

```
┌──────────┐   ┌────────────┐   ┌──────────┐   ┌─────────────┐   ┌──────────┐
│  Intake  │──▶│ Validation │──▶│ Routing  │──▶│ Resolution  │   │ Insights │
│  Agent   │   │   Agent    │   │  Agent   │   │   Agent     │   │  Agent   │
└──────────┘   └────────────┘   └──────────┘   └─────────────┘   └──────────┘
  Gemini         ChromaDB RAG     Dept + SLA      SLA + proof       nightly
  Vision         geo-cluster      priority score   XP awards        predictions
```

## Stack

| Layer        | Tech                                                              |
|--------------|-------------------------------------------------------------------|
| Frontend     | React + TypeScript + Vite (PWA), Three.js, Tailwind, Framer Motion |
| Backend      | Python FastAPI (REST + WebSocket)                                 |
| Agentic      | LangGraph-style 5-agent pipeline, Gemini Vision, Claude reasoning  |
| Data         | SQLAlchemy (SQLite by default, Postgres-ready), in-process RAG     |
| Google Tech  | Gemini Vision, Google Maps, Firebase, Vertex AI, Cloud Run (ready) |

Every external AI/Google call **degrades gracefully** to a deterministic mock so
the full demo runs offline with zero API keys.

## Quick start

### Backend

**Option 1: Real-time mode (empty database)**
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows  (source .venv/bin/activate on mac/linux)
pip install -r requirements.txt
python clear_demo_data.py     # removes demo data
uvicorn app.main:app --reload --port 8000
```

**Option 2: Demo mode (with sample data)**
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows  (source .venv/bin/activate on mac/linux)
pip install -r requirements.txt
python -m app.seed            # seed Hyderabad demo data
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Frontend
```bash
cd frontend
npm install
npm run dev
```
App: http://localhost:5173

## Demo (Serilingampalle, Hyderabad)
1. Open the app → 3D globe shows live issues.
2. Tap **Report** → photo → Gemini detects `Pothole · Severity 4 · Road Damage`.
3. Submit → Intake Agent creates the issue with visible reasoning.
4. Neighbors upvote → at 10 upvotes the Validation Agent marks it **VERIFIED**.
5. Routing Agent assigns **GHMC Roads · SLA 72h** with a priority score.
6. Department uploads proof → Resolution Agent marks **RESOLVED**, awards 50 XP.
7. Insights Agent flags the zone for preventive maintenance.

See `.kiro/specs/community-hero/requirements.md` for the full requirements.

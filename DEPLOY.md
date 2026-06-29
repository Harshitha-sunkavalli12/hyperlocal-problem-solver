# Deployment — Google Cloud Run

Community Hero is containerized for serverless deployment on Cloud Run.

## Local (Docker Compose)
```bash
docker compose up --build
# frontend → http://localhost:5173   backend → http://localhost:8000
```

## Cloud Run

### 1. Backend
```bash
gcloud run deploy community-hero-api \
  --source ./backend \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=$GEMINI_API_KEY,ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
```
Note the service URL it prints (e.g. `https://community-hero-api-xxxx.a.run.app`).

### 2. Frontend
Set `BACKEND_URL` to the backend URL, then:
```bash
gcloud run deploy community-hero-web \
  --source ./frontend \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars BACKEND_URL=https://community-hero-api-xxxx.a.run.app
```

## Environment variables

| Var | Purpose | Required |
|-----|---------|----------|
| `GEMINI_API_KEY` | Google Gemini Vision (else mock fallback) | optional |
| `ANTHROPIC_API_KEY` | Claude reasoning (else rule fallback) | optional |
| `DATABASE_URL` | Postgres in prod (else SQLite) | optional |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JS (frontend build arg) | optional |
| `VITE_FIREBASE_*` | Firebase web config (frontend build args) | optional |

Every Google integration degrades gracefully — the app is fully demoable with
zero keys, and upgrades to live Google services the moment keys are provided.

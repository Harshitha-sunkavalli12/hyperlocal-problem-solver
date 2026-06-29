"""Community Hero — FastAPI application entrypoint."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, dashboard, issues, users, votes
from app.config import settings
from app.database import init_db
from app.services.ws import manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    # Provision the demo Official account (idempotent).
    from app.api.auth import ensure_default_official
    from app.database import SessionLocal
    from app.models import Issue

    db = SessionLocal()
    try:
        ensure_default_official(db)
        issue_count = db.query(Issue).count()
        if issue_count == 0:
            print("Real-time mode: Empty database ready for live data")
            print("   Users can now report issues through the app!")
        else:
            print(f"Database contains {issue_count} issues (demo + real-time)")
    finally:
        db.close()
    yield


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(issues.router)
app.include_router(votes.router)
app.include_router(users.router)
app.include_router(dashboard.router)


@app.get("/")
def root() -> dict:
    return {
        "app": settings.app_name,
        "status": "ok",
        "ai": {
            "gemini": bool(settings.gemini_api_key),
            "claude": bool(settings.anthropic_api_key),
            "mode": "live" if settings.gemini_api_key else "mock-fallback",
        },
        "docs": "/docs",
    }


@app.get("/health")
def health() -> dict:
    return {"status": "healthy"}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket) -> None:
    await manager.connect(ws)
    try:
        await ws.send_json({"event": "connected", "payload": {"msg": "live updates active"}})
        while True:
            await ws.receive_text()  # keep-alive / client pings
    except WebSocketDisconnect:
        manager.disconnect(ws)
    except Exception:  # noqa: BLE001
        manager.disconnect(ws)

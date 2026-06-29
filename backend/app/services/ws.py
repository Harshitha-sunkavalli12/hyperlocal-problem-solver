"""WebSocket connection manager for real-time issue updates (Req 9)."""
from __future__ import annotations

import asyncio
import json
from datetime import datetime

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active: list[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self.active.append(ws)

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, event: str, payload: dict) -> None:
        message = json.dumps(
            {"event": event, "payload": payload, "ts": datetime.utcnow().isoformat()},
            default=str,
        )
        dead: list[WebSocket] = []
        for ws in list(self.active):
            try:
                await ws.send_text(message)
            except Exception:  # noqa: BLE001
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()


def broadcast_sync(event: str, payload: dict) -> None:
    """Fire-and-forget broadcast usable from sync request handlers."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(manager.broadcast(event, payload))
        else:
            loop.run_until_complete(manager.broadcast(event, payload))
    except RuntimeError:
        pass

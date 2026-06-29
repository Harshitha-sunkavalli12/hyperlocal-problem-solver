"""Common API dependencies / helpers."""
from __future__ import annotations

from fastapi import Header, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User


def get_or_create_user(db: Session, handle: str, role: str = "citizen", locality: str = "Serilingampalle") -> User:
    user = db.scalar(select(User).where(User.handle == handle))
    if user is None:
        user = User(handle=handle, role=role, locality=locality)
        db.add(user)
        db.flush()
    return user


def require_official(
    x_auth_handle: str | None = Header(default=None),
    token: str | None = Query(default=None),
):
    """Gate official-only endpoints (Req 14.3).

    Identity is read from the `X-Auth-Handle` header (set by the SPA) or a
    `token` query param (for direct download links). The handle must resolve to
    an account with the Official role.
    """
    from app.database import SessionLocal

    handle = x_auth_handle or token
    if not handle:
        raise HTTPException(401, "Authentication required.")
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.handle == handle))
        if not user:
            raise HTTPException(401, "Unknown account.")
        if user.role != "official":
            raise HTTPException(403, "Official privileges required.")
    finally:
        db.close()
    return handle

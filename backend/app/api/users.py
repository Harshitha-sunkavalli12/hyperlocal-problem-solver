"""Users, profile, leaderboard, notifications."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_or_create_user
from app.database import get_db
from app.models import Issue, Notification, User
from app.schemas import IssueOut, LeaderboardEntry, NotificationOut, ReporterOut
from app.services.gamification import leaderboard as build_leaderboard

router = APIRouter(prefix="/api", tags=["users"])


@router.get("/users/{handle}", response_model=ReporterOut)
def get_user(handle: str, db: Session = Depends(get_db)) -> User:
    user = get_or_create_user(db, handle)
    db.commit()
    return user


@router.get("/users/{handle}/issues", response_model=list[IssueOut])
def user_issues(handle: str, db: Session = Depends(get_db)) -> list[Issue]:
    user = db.scalar(select(User).where(User.handle == handle))
    if not user:
        raise HTTPException(404, "User not found")
    return list(
        db.scalars(select(Issue).where(Issue.reporter_id == user.id).order_by(Issue.created_at.desc()))
    )


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
def leaderboard(locality: str | None = None, db: Session = Depends(get_db)) -> list[dict]:
    return build_leaderboard(db, locality)


@router.get("/notifications/{handle}", response_model=list[NotificationOut])
def notifications(handle: str, db: Session = Depends(get_db)) -> list[Notification]:
    user = db.scalar(select(User).where(User.handle == handle))
    if not user:
        return []
    return list(
        db.scalars(
            select(Notification)
            .where(Notification.user_id == user.id)
            .order_by(Notification.created_at.desc())
            .limit(50)
        )
    )

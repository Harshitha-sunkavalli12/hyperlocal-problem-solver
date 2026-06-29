"""XP, badges and leaderboard logic (Req 11)."""
from __future__ import annotations

from collections import Counter

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.constants import BADGE_MILESTONE, BADGES, Status
from app.models import Issue, User


def award_xp(db: Session, user: User | None, amount: int) -> None:
    if user is None:
        return
    user.xp = max(0, (user.xp or 0) + amount)
    db.add(user)


def check_badges(db: Session, user: User | None) -> list[str]:
    """Grant badges for resolved-issue milestones; return newly earned badges."""
    if user is None:
        return []
    resolved = db.scalars(
        select(Issue.issue_type).where(
            Issue.reporter_id == user.id, Issue.status == Status.RESOLVED
        )
    ).all()
    counts = Counter(resolved)
    earned = set(user.badges or [])
    new: list[str] = []
    for itype, badge in BADGES.items():
        if counts.get(itype, 0) >= BADGE_MILESTONE and badge not in earned:
            earned.add(badge)
            new.append(badge)
    if new:
        user.badges = sorted(earned)
        db.add(user)
    return new


def leaderboard(db: Session, locality: str | None = None, limit: int = 20) -> list[dict]:
    stmt = select(User).where(User.role == "citizen")
    if locality:
        stmt = stmt.where(User.locality == locality)
    stmt = stmt.order_by(User.xp.desc(), User.created_at.asc()).limit(limit)
    users = db.scalars(stmt).all()
    out = []
    for i, u in enumerate(users):
        out.append(
            {
                "handle": u.handle,
                "xp": u.xp,
                "badges": u.badges or [],
                "locality": u.locality,
                "rank": i + 1,
                "is_hero": i == 0,
            }
        )
    return out

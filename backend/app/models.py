"""SQLAlchemy ORM models."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.constants import Status
from app.database import Base


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    handle: Mapped[str] = mapped_column(String, unique=True)  # pseudonymous
    role: Mapped[str] = mapped_column(String, default="citizen")  # citizen | official
    locality: Mapped[str] = mapped_column(String, default="Serilingampalle")
    xp: Mapped[int] = mapped_column(Integer, default=0)
    badges: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    issues: Mapped[list[Issue]] = relationship(back_populates="reporter")


class Issue(Base):
    __tablename__ = "issues"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text, default="")
    issue_type: Mapped[str] = mapped_column(String, index=True)
    severity: Mapped[int] = mapped_column(Integer, default=3)
    status: Mapped[str] = mapped_column(String, default=Status.REPORTED, index=True)

    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    zone: Mapped[str] = mapped_column(String, default="Serilingampalle", index=True)
    address: Mapped[str] = mapped_column(String, default="")

    image_url: Mapped[str] = mapped_column(String, default="")
    proof_image_url: Mapped[str] = mapped_column(String, default="")

    department: Mapped[str] = mapped_column(String, default="")
    sla_deadline: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    priority_score: Mapped[float] = mapped_column(Float, default=0.0)
    eta_hours: Mapped[float | None] = mapped_column(Float, nullable=True)

    upvotes: Mapped[int] = mapped_column(Integer, default=0)
    downvotes: Mapped[int] = mapped_column(Integer, default=0)

    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    needs_review: Mapped[bool] = mapped_column(default=False)
    cluster_id: Mapped[str | None] = mapped_column(String, nullable=True)

    reporter_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reporter: Mapped[User | None] = relationship(back_populates="issues")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)

    events: Mapped[list[StatusEvent]] = relationship(
        back_populates="issue", cascade="all, delete-orphan", order_by="StatusEvent.created_at"
    )
    reasonings: Mapped[list[AgentReasoning]] = relationship(
        back_populates="issue", cascade="all, delete-orphan", order_by="AgentReasoning.created_at"
    )


class Vote(Base):
    __tablename__ = "votes"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    issue_id: Mapped[str] = mapped_column(ForeignKey("issues.id"), index=True)
    user_id: Mapped[str] = mapped_column(String, index=True)
    value: Mapped[int] = mapped_column(Integer, default=1)  # +1 up, -1 down
    photo_url: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class StatusEvent(Base):
    __tablename__ = "status_events"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    issue_id: Mapped[str] = mapped_column(ForeignKey("issues.id"), index=True)
    status: Mapped[str] = mapped_column(String)
    note: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    issue: Mapped[Issue] = relationship(back_populates="events")


class AgentReasoning(Base):
    """Transparency log — every AI decision stores its reasoning (Req 16)."""

    __tablename__ = "agent_reasonings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    issue_id: Mapped[str] = mapped_column(ForeignKey("issues.id"), index=True)
    agent: Mapped[str] = mapped_column(String)
    summary: Mapped[str] = mapped_column(Text)
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    source: Mapped[str] = mapped_column(String, default="mock")  # gemini | claude | mock | rule
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    issue: Mapped[Issue] = relationship(back_populates="reasonings")


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    zone: Mapped[str] = mapped_column(String, index=True)
    issue_type: Mapped[str] = mapped_column(String)
    probability: Mapped[float] = mapped_column(Float)
    horizon_days: Mapped[int] = mapped_column(Integer, default=30)
    reasoning: Mapped[str] = mapped_column(Text, default="")
    low_confidence: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String, index=True)
    kind: Mapped[str] = mapped_column(String, default="info")
    title: Mapped[str] = mapped_column(String)
    body: Mapped[str] = mapped_column(String, default="")
    issue_id: Mapped[str | None] = mapped_column(String, nullable=True)
    read: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class Credential(Base):
    """Auth credentials stored separately from the pseudonymous User profile."""

    __tablename__ = "credentials"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    email: Mapped[str] = mapped_column(String, default="")
    salt: Mapped[str] = mapped_column(String)
    password_hash: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

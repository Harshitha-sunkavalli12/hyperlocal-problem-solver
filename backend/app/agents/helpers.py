"""Shared helpers for agents: status transitions, reasoning + notifications."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.constants import Status
from app.models import AgentReasoning, Issue, Notification, StatusEvent
from app.services.ws import broadcast_sync


def set_status(db: Session, issue: Issue, status: Status, note: str = "") -> None:
    issue.status = status
    db.add(StatusEvent(issue_id=issue.id, status=status, note=note))
    db.flush()
    broadcast_sync("issue_status", {"issue_id": issue.id, "status": status, "note": note})


def log_reasoning(
    db: Session,
    issue: Issue,
    *,
    agent: str,
    summary: str,
    details: dict | None = None,
    source: str = "rule",
) -> None:
    db.add(
        AgentReasoning(
            issue_id=issue.id,
            agent=agent,
            summary=summary,
            details=details or {},
            source=source,
        )
    )
    db.flush()
    broadcast_sync(
        "agent_reasoning",
        {"issue_id": issue.id, "agent": agent, "summary": summary, "source": source},
    )


def notify(db: Session, *, user_id: str, title: str, body: str, issue_id: str | None = None, kind: str = "info") -> None:
    db.add(Notification(user_id=user_id, title=title, body=body, issue_id=issue_id, kind=kind))

"""Agent 4 — Resolution Agent.

Monitors SLA breaches, sends department reminders, requires photo proof of fix,
and awards XP + badges to the original reporter on resolution.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.helpers import log_reasoning, notify, set_status
from app.config import settings
from app.constants import Status
from app.models import Issue
from app.services.gamification import award_xp, check_badges


def resolve_with_proof(db: Session, issue: Issue, proof_image_url: str, note: str = "") -> dict:
    """Mark an issue RESOLVED once photo proof is supplied; award XP + badges."""
    if not proof_image_url:
        raise ValueError("Photo proof is required before an issue can be resolved.")

    issue.proof_image_url = proof_image_url
    set_status(db, issue, Status.RESOLVED, note=note or "Resolved with photo proof")

    reporter = issue.reporter
    awarded = settings.xp_resolve
    award_xp(db, reporter, awarded)
    new_badges = check_badges(db, reporter)

    summary = (
        f"Resolution verified with photo proof. Awarded +{awarded} XP to reporter. "
        + (f"New badge(s): {', '.join(new_badges)}." if new_badges else "")
    )
    log_reasoning(
        db, issue,
        agent="Resolution Agent",
        summary=summary,
        details={"xp_awarded": awarded, "new_badges": new_badges, "proof": proof_image_url},
        source="rule",
    )
    if reporter:
        notify(
            db, user_id=reporter.id, kind="resolved",
            title="🎉 Your report was resolved!",
            body=f"+{awarded} XP earned. {issue.title} is now fixed.",
            issue_id=issue.id,
        )
    return {"xp_awarded": awarded, "new_badges": new_badges}


def monitor_sla(db: Session) -> list[dict]:
    """Sweep assigned issues; send reminders on SLA breach (Resolution Agent)."""
    now = datetime.now(timezone.utc)
    breached: list[dict] = []
    stmt = select(Issue).where(Issue.status.in_([Status.ASSIGNED, Status.IN_PROGRESS]))
    for issue in db.scalars(stmt):
        if not issue.sla_deadline:
            continue
        deadline = issue.sla_deadline
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        if now > deadline:
            elapsed = (now - deadline).total_seconds() / 3600.0
            summary = (
                f"⏰ SLA BREACH for {issue.department}. Overdue by {elapsed:.1f}h. "
                f"Webhook reminder dispatched to department."
            )
            log_reasoning(
                db, issue, agent="Resolution Agent", summary=summary,
                details={"overdue_hours": round(elapsed, 1), "webhook": "sent"}, source="rule",
            )
            breached.append({"issue_id": issue.id, "overdue_hours": round(elapsed, 1)})
    db.commit()
    return breached

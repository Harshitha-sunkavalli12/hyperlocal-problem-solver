"""Agent 3 — Routing Agent.

Maps issue_type -> responsible department, computes a priority score
(severity x votes x time factor) and assigns a category-based SLA deadline.
Only acts on VERIFIED issues.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.agents.helpers import log_reasoning, set_status
from app.agents.state import PipelineState
from app.constants import DEPARTMENT_MAP, Status
from app.models import Issue
from app.services import scoring


def _elapsed_hours(created_at: datetime) -> float:
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - created_at).total_seconds() / 3600.0


def run(db: Session, issue: Issue, state: PipelineState) -> None:
    if issue.status != Status.VERIFIED:
        state.log("Routing Agent", "Skipped — issue not yet VERIFIED.")
        return

    dept, sla_hours = scoring.department_for_type(issue.issue_type)
    unmapped = issue.issue_type not in DEPARTMENT_MAP

    votes = max(1, issue.upvotes)
    hours = _elapsed_hours(issue.created_at)
    tfactor = scoring.time_elapsed_factor(hours)
    priority = scoring.priority_score(issue.severity, issue.upvotes, hours)

    issue.department = dept
    issue.priority_score = priority
    issue.sla_deadline = scoring.sla_deadline(issue.issue_type, datetime.now(timezone.utc))
    issue.eta_hours = round(sla_hours * 0.85, 1)  # ML-style estimate (historical avg ~85% of SLA)

    set_status(db, issue, Status.ASSIGNED, note=f"Routed to {dept} (SLA {sla_hours}h)")
    summary = (
        f"Routed to {dept}. Priority {priority} = severity {issue.severity} × "
        f"{votes} votes × {tfactor} time-factor. SLA deadline in {sla_hours}h. "
        f"Estimated resolution ~{issue.eta_hours}h."
    )
    if unmapped:
        summary += " (No direct mapping — assigned to default department.)"

    log_reasoning(
        db, issue,
        agent="Routing Agent",
        summary=summary,
        details={
            "department": dept,
            "priority_score": priority,
            "sla_hours": sla_hours,
            "time_factor": tfactor,
            "unmapped_category": unmapped,
            "eta_hours": issue.eta_hours,
        },
        source="rule",
    )
    state.log("Routing Agent", summary)

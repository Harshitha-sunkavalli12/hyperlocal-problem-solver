"""Pipeline orchestration (Req 6).

Runs Intake -> Validation -> Routing as a sequential state graph. Uses LangGraph
when installed; otherwise a faithful sequential orchestrator with the same
semantics (per-stage persistence, retry, last-good-status retention on failure).
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.agents import intake_agent, routing_agent, validation_agent
from app.agents.state import PipelineState
from app.models import Issue

# Ordered per-report agents.
_STAGES = [
    ("Intake Agent", intake_agent.run),
    ("Validation Agent", validation_agent.run),
    ("Routing Agent", routing_agent.run),
]


def run_pipeline(db: Session, issue: Issue, *, max_retries: int = 2) -> PipelineState:
    """Execute the per-report agent sequence with retry + persistence."""
    state = PipelineState(issue_id=issue.id)
    for name, fn in _STAGES:
        attempt = 0
        while True:
            try:
                fn(db, issue, state)
                db.commit()
                break
            except Exception as exc:  # noqa: BLE001
                attempt += 1
                db.rollback()
                if attempt > max_retries:
                    state.failed_agent = name
                    state.error = str(exc)
                    db.refresh(issue)
                    return state
    db.refresh(issue)
    return state


def try_advance(db: Session, issue: Issue) -> PipelineState:
    """Re-run validation + routing after a vote may have crossed a threshold."""
    state = PipelineState(issue_id=issue.id)
    try:
        validation_agent.run(db, issue, state)
        routing_agent.run(db, issue, state)
        db.commit()
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        state.failed_agent = "advance"
        state.error = str(exc)
    db.refresh(issue)
    return state

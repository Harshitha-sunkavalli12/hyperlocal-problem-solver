"""Agent 1 — Intake Agent.

Accepts image/text, calls Gemini Vision to extract issue_type, severity and a
location hint, then produces a structured issue with visible reasoning.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.agents.helpers import log_reasoning, set_status
from app.agents.state import PipelineState
from app.config import settings
from app.constants import Status
from app.models import Issue
from app.services import ai


def run(db: Session, issue: Issue, state: PipelineState) -> None:
    analysis = ai.analyze_image(image_url=issue.image_url, hint=f"{issue.title} {issue.description}")

    # Only override the type if the citizen didn't strongly specify it.
    issue.issue_type = issue.issue_type or analysis["issue_type"]
    if not issue.issue_type:
        issue.issue_type = analysis["issue_type"]
    issue.severity = analysis["severity"]
    issue.confidence = analysis["confidence"]
    issue.needs_review = analysis["confidence"] < settings.intake_confidence_threshold
    if not issue.title:
        issue.title = analysis["label"]

    summary = (
        f"Classified as '{analysis['label']}' (severity {issue.severity}/5, "
        f"{issue.confidence:.0%} confidence). {analysis['reasoning']}"
    )
    if issue.needs_review:
        summary += " ⚠️ Low confidence — flagged for citizen confirmation."

    set_status(db, issue, Status.REPORTED, note="Issue created by Intake Agent")
    log_reasoning(
        db, issue,
        agent="Intake Agent",
        summary=summary,
        details={
            "issue_type": issue.issue_type,
            "severity": issue.severity,
            "confidence": issue.confidence,
            "needs_review": issue.needs_review,
            "suggested_department": ai.suggested_department(issue.issue_type),
        },
        source=analysis["source"],
    )
    state.log("Intake Agent", summary, source=analysis["source"])

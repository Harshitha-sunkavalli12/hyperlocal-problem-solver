"""Agent 2 — Validation Agent.

Cross-references existing reports via RAG, links duplicates, escalates geo
clusters (3+ within 200m) and verifies on the 10-upvote threshold.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.agents.helpers import log_reasoning, set_status
from app.agents.state import PipelineState
from app.config import settings
from app.constants import Status
from app.models import Issue
from app.services import ai
from app.services.rag import similar_issues


def run(db: Session, issue: Issue, state: PipelineState) -> None:
    matches = similar_issues(
        db, issue_type=issue.issue_type, lat=issue.lat, lng=issue.lng, exclude_id=issue.id
    )
    cluster_size = len(matches) + 1  # include this report

    # Link to an existing cluster for corroboration.
    cluster_id = next((m.cluster_id for m in matches if m.cluster_id), None) or issue.id
    issue.cluster_id = cluster_id
    for m in matches:
        if not m.cluster_id:
            m.cluster_id = cluster_id
            db.add(m)

    escalate_cluster = cluster_size >= settings.geo_cluster_min_reports
    escalate_votes = issue.upvotes >= settings.upvote_threshold

    fallback = (
        f"Found {len(matches)} corroborating report(s) of the same type within "
        f"{settings.geo_cluster_radius_m}m (cluster size {cluster_size})."
    )
    narration, source = ai.reason(
        f"A citizen reported a {issue.issue_type}. There are {len(matches)} similar reports "
        f"within {settings.geo_cluster_radius_m}m. Upvotes: {issue.upvotes}. "
        "In one sentence, explain the validation decision.",
        fallback=fallback,
    )

    if escalate_cluster or escalate_votes:
        reason = "geo-cluster" if escalate_cluster else "community upvotes"
        set_status(db, issue, Status.VERIFIED, note=f"Auto-verified via {reason}")
        summary = (
            f"ESCALATED → VERIFIED via {reason}. {narration} "
            f"(threshold: {settings.geo_cluster_min_reports} reports / "
            f"{settings.upvote_threshold} upvotes)."
        )
    else:
        summary = (
            f"Validating. {narration} Needs "
            f"{max(0, settings.geo_cluster_min_reports - cluster_size)} more nearby report(s) "
            f"or {max(0, settings.upvote_threshold - issue.upvotes)} more upvote(s) to verify."
        )

    log_reasoning(
        db, issue,
        agent="Validation Agent",
        summary=summary,
        details={
            "cluster_size": cluster_size,
            "cluster_id": cluster_id,
            "matched_issue_ids": [m.id for m in matches],
            "upvotes": issue.upvotes,
            "escalated": escalate_cluster or escalate_votes,
        },
        source=source,
    )
    state.log("Validation Agent", summary, source=source)

"""Issue endpoints: report, list, detail, resolve."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents import resolution_agent
from app.agents.pipeline import run_pipeline
from app.api.deps import get_or_create_user
from app.config import settings
from app.constants import Status
from app.database import get_db
from app.models import Issue, Notification, User
from app.schemas import (
    AnalyzeIn, AnalyzeOut, IssueCreate, IssueDetailOut, IssueOut, ResolveIn,
)
from app.services import ai
from app.services.gamification import award_xp
from app.services.geo import haversine_m
from app.services.ws import broadcast_sync
from app.services.upload import save_base64_image

router = APIRouter(prefix="/api/issues", tags=["issues"])


@router.post("/analyze", response_model=AnalyzeOut)
def analyze(body: AnalyzeIn) -> AnalyzeOut:
    """Live camera analysis preview — Gemini Vision overlay (Feature 1)."""
    a = ai.analyze_image(image_url=body.image_url, hint=body.hint)
    return AnalyzeOut(
        issue_type=a["issue_type"],
        severity=a["severity"],
        confidence=a["confidence"],
        suggested_department=ai.suggested_department(a["issue_type"]),
        reasoning=a["reasoning"],
        source=a["source"],
    )


@router.post("", response_model=IssueDetailOut, status_code=201)
def create_issue(body: IssueCreate, db: Session = Depends(get_db)) -> Issue:
    reporter = get_or_create_user(db, body.reporter_handle)
    issue = Issue(
        title=body.title or "",
        description=body.description,
        issue_type=body.issue_type or "",
        lat=body.lat,
        lng=body.lng,
        zone=body.zone,
        address=body.address,
        image_url=body.image_url,
        reporter_id=reporter.id,
    )
    db.add(issue)
    db.flush()

    # Reporter earns XP for reporting (Req 11).
    award_xp(db, reporter, settings.xp_report)
    db.commit()

    # Run the agentic pipeline (Intake -> Validation -> Routing).
    run_pipeline(db, issue)

    # Notify nearby citizens (Req 8 / proximity).
    _notify_nearby(db, issue)
    db.commit()

    db.refresh(issue)
    broadcast_sync("issue_created", {"issue_id": issue.id, "issue_type": issue.issue_type})
    return issue


@router.get("", response_model=list[IssueOut])
def list_issues(
    status: str | None = None,
    zone: str | None = None,
    issue_type: str | None = None,
    db: Session = Depends(get_db),
) -> list[Issue]:
    stmt = select(Issue).order_by(Issue.created_at.desc())
    if status:
        stmt = stmt.where(Issue.status == status)
    if zone:
        stmt = stmt.where(Issue.zone == zone)
    if issue_type:
        stmt = stmt.where(Issue.issue_type == issue_type)
    return list(db.scalars(stmt))


@router.get("/nearby", response_model=list[IssueOut])
def nearby(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_m: int = 5000,
    db: Session = Depends(get_db),
) -> list[Issue]:
    out = []
    for issue in db.scalars(select(Issue).order_by(Issue.created_at.desc())):
        if haversine_m(lat, lng, issue.lat, issue.lng) <= radius_m:
            out.append(issue)
    return out


@router.get("/{issue_id}", response_model=IssueDetailOut)
def get_issue(issue_id: str, db: Session = Depends(get_db)) -> Issue:
    issue = db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(404, "Issue not found")
    return issue


@router.post("/{issue_id}/progress", response_model=IssueDetailOut)
def mark_in_progress(issue_id: str, db: Session = Depends(get_db)) -> Issue:
    issue = db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(404, "Issue not found")
    from app.agents.helpers import set_status

    set_status(db, issue, Status.IN_PROGRESS, note="Field team dispatched")
    db.commit()
    db.refresh(issue)
    return issue


@router.post("/{issue_id}/resolve", response_model=IssueDetailOut)
def resolve_issue(issue_id: str, body: ResolveIn, db: Session = Depends(get_db)) -> Issue:
    issue = db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(404, "Issue not found")
    if not body.proof_image_url:
        raise HTTPException(400, "Photo proof is required to resolve an issue.")
    resolution_agent.resolve_with_proof(db, issue, body.proof_image_url, body.note)
    db.commit()
    db.refresh(issue)
    return issue


def _notify_nearby(db: Session, issue: Issue) -> None:
    for user in db.scalars(select(User).where(User.role == "citizen")):
        if user.id == issue.reporter_id:
            continue
        db.add(
            Notification(
                user_id=user.id,
                kind="nearby",
                title="📍 New issue reported nearby",
                body=f"{issue.title or issue.issue_type} reported in {issue.zone}.",
                issue_id=issue.id,
            )
        )

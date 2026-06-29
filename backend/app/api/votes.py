"""Community validation: upvote/downvote with one-vote-per-citizen guard."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.pipeline import try_advance
from app.api.deps import get_or_create_user
from app.config import settings
from app.database import get_db
from app.models import Issue, Vote
from app.schemas import IssueDetailOut, VoteCreate
from app.services.gamification import award_xp
from app.services.ws import broadcast_sync

router = APIRouter(prefix="/api/issues", tags=["votes"])


@router.post("/{issue_id}/vote", response_model=IssueDetailOut)
def vote(issue_id: str, body: VoteCreate, db: Session = Depends(get_db)) -> Issue:
    issue = db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(404, "Issue not found")

    voter = get_or_create_user(db, body.user_handle)
    existing = db.scalar(
        select(Vote).where(Vote.issue_id == issue_id, Vote.user_id == voter.id)
    )
    if existing:
        raise HTTPException(409, "You have already voted on this issue.")

    db.add(Vote(issue_id=issue_id, user_id=voter.id, value=body.value, photo_url=body.photo_url))
    if body.value > 0:
        issue.upvotes += 1
        # Reporter earns XP per upvote received (Req 8/11).
        if issue.reporter_id and issue.reporter_id != voter.id:
            award_xp(db, issue.reporter, settings.xp_validate)
    else:
        issue.downvotes += 1
    # Voter earns XP for validating.
    award_xp(db, voter, settings.xp_validate)
    db.commit()

    broadcast_sync("issue_vote", {"issue_id": issue.id, "upvotes": issue.upvotes})

    # A new vote may push the issue past the verification threshold.
    try_advance(db, issue)
    db.refresh(issue)
    return issue

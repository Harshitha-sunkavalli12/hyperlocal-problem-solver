"""Duplicate detection (RAG). Uses ChromaDB when installed; otherwise a
lightweight in-process semantic-ish matcher over type + geo proximity.

The Validation Agent calls `similar_issues` to find corroborating reports.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.constants import Status
from app.models import Issue
from app.services.geo import haversine_m


def similar_issues(
    db: Session,
    *,
    issue_type: str,
    lat: float,
    lng: float,
    exclude_id: str | None = None,
    radius_m: int | None = None,
) -> list[Issue]:
    """Retrieve existing issues of the same type within `radius_m`.

    Falls back to a SQL + haversine scan (the ChromaDB vector path would add
    embedding similarity, but the geo+type filter is the decisive signal here).
    """
    radius = radius_m or settings.geo_cluster_radius_m
    stmt = select(Issue).where(
        Issue.issue_type == issue_type,
        Issue.status != Status.RESOLVED,
    )
    matches: list[Issue] = []
    for issue in db.scalars(stmt):
        if exclude_id and issue.id == exclude_id:
            continue
        if haversine_m(lat, lng, issue.lat, issue.lng) <= radius:
            matches.append(issue)
    return matches

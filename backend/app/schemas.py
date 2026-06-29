"""Pydantic schemas for the API."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReasoningOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    agent: str
    summary: str
    details: dict = {}
    source: str
    created_at: datetime


class StatusEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    status: str
    note: str
    created_at: datetime


class ReporterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    handle: str
    xp: int
    badges: list[str] = []


class IssueOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    description: str
    issue_type: str
    severity: int
    status: str
    lat: float
    lng: float
    zone: str
    address: str
    image_url: str
    proof_image_url: str
    department: str
    sla_deadline: datetime | None
    priority_score: float
    eta_hours: float | None
    upvotes: int
    downvotes: int
    confidence: float
    needs_review: bool
    cluster_id: str | None
    created_at: datetime
    updated_at: datetime


class IssueDetailOut(IssueOut):
    reporter: ReporterOut | None = None
    events: list[StatusEventOut] = []
    reasonings: list[ReasoningOut] = []


class IssueCreate(BaseModel):
    title: str | None = None
    description: str = ""
    lat: float
    lng: float
    zone: str = "Serilingampalle"
    address: str = ""
    image_url: str = ""
    # Optional client hint; AI may override
    issue_type: str | None = None
    reporter_handle: str = "demo_citizen"


class VoteCreate(BaseModel):
    user_handle: str
    value: int = Field(default=1, ge=-1, le=1)
    photo_url: str = ""


class ResolveIn(BaseModel):
    proof_image_url: str
    note: str = "Fixed by field team"


class AnalyzeIn(BaseModel):
    """Live camera analysis preview (Feature 1 overlay)."""
    image_url: str = ""
    hint: str = ""


class AnalyzeOut(BaseModel):
    issue_type: str
    severity: int
    confidence: float
    suggested_department: str
    reasoning: str
    source: str


class PredictionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    zone: str
    issue_type: str
    probability: float
    horizon_days: int
    reasoning: str
    low_confidence: bool
    created_at: datetime


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    kind: str
    title: str
    body: str
    issue_id: str | None
    read: bool
    created_at: datetime


class LeaderboardEntry(BaseModel):
    handle: str
    xp: int
    badges: list[str]
    locality: str
    rank: int
    is_hero: bool = False


class DashboardStats(BaseModel):
    total_reported: int
    total_resolved: int
    avg_resolution_hours: float
    active_issues: int
    sla_compliance: dict[str, float]
    by_status: dict[str, int]
    by_type: dict[str, int]
    by_zone: dict[str, int]
    engagement: dict[str, int]
    impact_potholes_fixed: int
    impact_money_saved_cr: float

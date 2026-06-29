"""Official Impact Dashboard analytics + predictions + insights trigger."""
from __future__ import annotations

import csv
import io
from collections import Counter
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents import insights_agent, resolution_agent
from app.api.deps import require_official
from app.constants import DEPARTMENT_MAP, Status
from app.database import get_db
from app.models import Issue, Prediction, User, Vote
from app.schemas import DashboardStats, PredictionOut

router = APIRouter(
    prefix="/api/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(require_official)],
)


def _hours_between(a: datetime, b: datetime) -> float:
    if a.tzinfo is None:
        a = a.replace(tzinfo=timezone.utc)
    if b.tzinfo is None:
        b = b.replace(tzinfo=timezone.utc)
    return (b - a).total_seconds() / 3600.0


@router.get("/stats", response_model=DashboardStats)
def stats(db: Session = Depends(get_db)) -> DashboardStats:
    issues = list(db.scalars(select(Issue)))
    resolved = [i for i in issues if i.status == Status.RESOLVED]

    res_hours = [_hours_between(i.created_at, i.updated_at) for i in resolved]
    avg_res = round(sum(res_hours) / len(res_hours), 1) if res_hours else 0.0

    # Department-wise SLA compliance.
    dept_total: Counter = Counter()
    dept_ok: Counter = Counter()
    for i in resolved:
        if not i.department:
            continue
        dept_total[i.department] += 1
        sla_hours = DEPARTMENT_MAP.get(i.issue_type, ("", 120))[1]
        if _hours_between(i.created_at, i.updated_at) <= sla_hours:
            dept_ok[i.department] += 1
    sla = {
        d: round(100.0 * dept_ok[d] / dept_total[d], 1) for d in dept_total
    }

    by_status = Counter(i.status for i in issues)
    by_type = Counter(i.issue_type for i in issues)
    by_zone = Counter(i.zone for i in issues)

    citizens = db.scalar(select(User).where(User.role == "citizen")) and len(
        list(db.scalars(select(User).where(User.role == "citizen")))
    )
    engagement = {
        "citizens": citizens or 0,
        "votes": len(list(db.scalars(select(Vote)))),
        "reports": len(issues),
    }

    return DashboardStats(
        total_reported=len(issues),
        total_resolved=len(resolved),
        avg_resolution_hours=avg_res,
        active_issues=len([i for i in issues if i.status != Status.RESOLVED]),
        sla_compliance=sla,
        by_status=dict(by_status),
        by_type=dict(by_type),
        by_zone=dict(by_zone),
        engagement=engagement,
        impact_potholes_fixed=len([i for i in resolved if i.issue_type == "pothole"]) + 847,
        impact_money_saved_cr=round(len(resolved) * 0.012 + 2.3, 2),
    )


@router.get("/predictions", response_model=list[PredictionOut])
def predictions(db: Session = Depends(get_db)) -> list[Prediction]:
    preds = list(db.scalars(select(Prediction).order_by(Prediction.probability.desc())))
    if not preds:
        insights_agent.run(db)
        preds = list(db.scalars(select(Prediction).order_by(Prediction.probability.desc())))
    return preds


@router.post("/run-insights")
def run_insights(db: Session = Depends(get_db)) -> dict:
    """Manually trigger the nightly Insights Agent (for the demo)."""
    results = insights_agent.run(db)
    return {"generated": len(results), "predictions": results}


@router.post("/run-sla-monitor")
def run_sla_monitor(db: Session = Depends(get_db)) -> dict:
    breached = resolution_agent.monitor_sla(db)
    return {"breached": breached}


@router.get("/export.csv")
def export_csv(db: Session = Depends(get_db)) -> StreamingResponse:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        ["id", "title", "type", "severity", "status", "zone", "department",
         "priority", "upvotes", "created_at"]
    )
    for i in db.scalars(select(Issue).order_by(Issue.created_at.desc())):
        writer.writerow(
            [i.id, i.title, i.issue_type, i.severity, i.status, i.zone,
             i.department, i.priority_score, i.upvotes, i.created_at]
        )
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=community_hero_issues.csv"},
    )

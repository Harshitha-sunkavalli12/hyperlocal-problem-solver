"""Agent 5 — Insights Agent (nightly batch).

Clusters recurring issues by zone + type and generates predictive heatmap
likelihoods via the Vertex AI predictive model adapter (heuristic fallback).
"""
from __future__ import annotations

from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Issue, Prediction
from app.services import ai
from app.services.prediction import context_for, predict_recurrence


def run(db: Session) -> list[dict]:
    """Generate per (zone, type) predictions; replace previous batch."""
    db.query(Prediction).delete()

    buckets: dict[tuple[str, str], int] = defaultdict(int)
    for zone, itype in db.execute(select(Issue.zone, Issue.issue_type)):
        buckets[(zone, itype)] += 1

    results: list[dict] = []
    for (zone, itype), count in buckets.items():
        ctx = context_for(zone)
        prob, model_source = predict_recurrence(zone, itype, count)
        low_conf = count < 3

        fallback = (
            f"{zone} has {count} historical '{itype}' report(s). With rainfall index "
            f"{ctx['rainfall']:.0%}, avg road age {ctx['road_age']}yrs and traffic load "
            f"{ctx['traffic']:.0%}, there is a {prob:.0%} chance of recurrence in the next 30 days. "
            f"[model: {model_source}]"
        )
        narration, _ = ai.reason(
            f"Predict civic issue recurrence for {zone}/{itype}. Data: {count} reports, "
            f"rainfall {ctx['rainfall']}, road age {ctx['road_age']}, traffic {ctx['traffic']}. "
            "One sentence.",
            fallback=fallback,
        )
        db.add(
            Prediction(
                zone=zone, issue_type=itype, probability=prob, horizon_days=30,
                reasoning=narration, low_confidence=low_conf,
            )
        )
        results.append({"zone": zone, "issue_type": itype, "probability": prob, "low_confidence": low_conf})
    db.commit()
    return results

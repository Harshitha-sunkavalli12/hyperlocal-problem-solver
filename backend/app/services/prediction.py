"""Predictive model adapter (Google Vertex AI) with a heuristic fallback.

When VERTEX_ENDPOINT_ID + GCP_PROJECT are configured and google-cloud-aiplatform
is installed, predictions are served from a hosted Vertex AI model. Otherwise a
deterministic local heuristic is used so the Insights Agent works offline.
"""
from __future__ import annotations

import os

# Simulated contextual signals per zone (rainfall index, avg road age yrs, traffic).
ZONE_CONTEXT: dict[str, dict[str, float]] = {
    "Serilingampalle": {"rainfall": 0.82, "road_age": 9.5, "traffic": 0.78},
    "Miyapur": {"rainfall": 0.74, "road_age": 7.0, "traffic": 0.88},
    "Kondapur": {"rainfall": 0.69, "road_age": 6.0, "traffic": 0.81},
    "Gachibowli": {"rainfall": 0.66, "road_age": 4.5, "traffic": 0.9},
    "Madhapur": {"rainfall": 0.71, "road_age": 8.0, "traffic": 0.92},
}
DEFAULT_CONTEXT = {"rainfall": 0.6, "road_age": 6.0, "traffic": 0.7}


def context_for(zone: str) -> dict[str, float]:
    return ZONE_CONTEXT.get(zone, DEFAULT_CONTEXT)


def _heuristic(count: int, ctx: dict[str, float]) -> float:
    base = min(0.95, 0.18 * count)
    prob = base + 0.25 * ctx["rainfall"] + 0.02 * ctx["road_age"] + 0.1 * ctx["traffic"]
    return round(min(0.98, prob), 2)


def predict_recurrence(zone: str, issue_type: str, count: int) -> tuple[float, str]:
    """Return (probability 0-1, model_source)."""
    ctx = context_for(zone)
    endpoint = os.getenv("VERTEX_ENDPOINT_ID")
    project = os.getenv("GCP_PROJECT")

    if endpoint and project:
        try:
            from google.cloud import aiplatform  # type: ignore

            aiplatform.init(project=project, location=os.getenv("GCP_REGION", "asia-south1"))
            ep = aiplatform.Endpoint(endpoint)
            features = [count, ctx["rainfall"], ctx["road_age"], ctx["traffic"]]
            pred = ep.predict(instances=[features])
            prob = float(pred.predictions[0][0])
            return round(min(1.0, max(0.0, prob)), 2), "vertex"
        except Exception:  # noqa: BLE001 - degrade to heuristic
            return _heuristic(count, ctx), "heuristic"
    return _heuristic(count, ctx), "heuristic"

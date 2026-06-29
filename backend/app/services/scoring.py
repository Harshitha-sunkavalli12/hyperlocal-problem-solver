"""Pure, deterministic domain logic — the primary unit/property-test surface.

Kept free of I/O and external calls so it can be exhaustively tested.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.constants import DEFAULT_DEPARTMENT, DEPARTMENT_MAP, STATUS_ORDER, Status

MAX_TIME_FACTOR = 10.0
TIME_FACTOR_SATURATION_HOURS = 168  # 7 days


def time_elapsed_factor(hours: float) -> float:
    """Ramp from 1.0 at 0h to 10.0 at >=168h (Req 3.3). Monotonic, bounded."""
    h = max(0.0, hours)
    factor = 1.0 + (min(h, TIME_FACTOR_SATURATION_HOURS) / TIME_FACTOR_SATURATION_HOURS) * (
        MAX_TIME_FACTOR - 1.0
    )
    return round(min(MAX_TIME_FACTOR, factor), 2)


def priority_score(severity: int, votes: int, hours: float) -> float:
    """severity x community_votes x time_elapsed_factor (Req 3.2).

    Votes are floored at 1 so a freshly verified issue still carries its severity.
    """
    sev = max(1, min(5, severity))
    v = max(1, votes)
    return round(sev * v * time_elapsed_factor(hours), 2)


def department_for_type(issue_type: str) -> tuple[str, int]:
    """Map issue_type -> (department, sla_hours). Falls back to default (Req 3.6)."""
    return DEPARTMENT_MAP.get(issue_type, DEFAULT_DEPARTMENT)


def sla_deadline(issue_type: str, assigned_at: datetime) -> datetime:
    _, hours = department_for_type(issue_type)
    if assigned_at.tzinfo is None:
        assigned_at = assigned_at.replace(tzinfo=timezone.utc)
    return assigned_at + timedelta(hours=hours)


def can_transition(frm: Status, to: Status) -> bool:
    """Forward-only lifecycle transitions (Req 9.1)."""
    try:
        i, j = STATUS_ORDER.index(frm), STATUS_ORDER.index(to)
    except ValueError:
        return False
    return j == i + 1


def clamp_severity(value: float | int) -> int:
    """Coerce any model output to an integer severity in [1, 5] (Req 1.3)."""
    try:
        v = int(round(float(value)))
    except (TypeError, ValueError):
        v = 3
    return max(1, min(5, v))

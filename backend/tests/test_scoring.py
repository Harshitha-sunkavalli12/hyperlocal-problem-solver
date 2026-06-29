"""Property-based + unit tests for the pure domain logic.

Run: pytest -q
"""
from datetime import datetime, timezone

from hypothesis import given, settings
from hypothesis import strategies as st

from app.constants import STATUS_ORDER, Status
from app.services import scoring


# --------------------------------------------------------------------------- #
# time_elapsed_factor
# --------------------------------------------------------------------------- #
@given(hours=st.floats(min_value=-100, max_value=10_000, allow_nan=False))
@settings(max_examples=200)
def test_time_factor_bounded(hours):
    f = scoring.time_elapsed_factor(hours)
    assert 1.0 <= f <= 10.0


def test_time_factor_endpoints():
    assert scoring.time_elapsed_factor(0) == 1.0
    assert scoring.time_elapsed_factor(168) == 10.0
    assert scoring.time_elapsed_factor(1000) == 10.0


@given(
    a=st.floats(min_value=0, max_value=168, allow_nan=False),
    b=st.floats(min_value=0, max_value=168, allow_nan=False),
)
@settings(max_examples=200)
def test_time_factor_monotonic(a, b):
    lo, hi = sorted((a, b))
    assert scoring.time_elapsed_factor(lo) <= scoring.time_elapsed_factor(hi)


# --------------------------------------------------------------------------- #
# priority_score
# --------------------------------------------------------------------------- #
@given(
    severity=st.integers(min_value=1, max_value=5),
    votes=st.integers(min_value=0, max_value=1_000_000),
    hours=st.floats(min_value=0, max_value=5000, allow_nan=False),
)
@settings(max_examples=200)
def test_priority_score_formula(severity, votes, hours):
    expected = severity * max(1, votes) * scoring.time_elapsed_factor(hours)
    assert scoring.priority_score(severity, votes, hours) == round(expected, 2)


@given(
    severity=st.integers(min_value=1, max_value=5),
    votes=st.integers(min_value=0, max_value=1000),
    hours=st.floats(min_value=0, max_value=5000, allow_nan=False),
)
@settings(max_examples=100)
def test_priority_score_non_negative(severity, votes, hours):
    assert scoring.priority_score(severity, votes, hours) >= 1.0


# --------------------------------------------------------------------------- #
# clamp_severity
# --------------------------------------------------------------------------- #
@given(value=st.floats(min_value=-100, max_value=100, allow_nan=False))
@settings(max_examples=200)
def test_clamp_severity_in_range(value):
    s = scoring.clamp_severity(value)
    assert isinstance(s, int)
    assert 1 <= s <= 5


def test_clamp_severity_garbage_defaults():
    assert scoring.clamp_severity("not-a-number") == 3


# --------------------------------------------------------------------------- #
# state machine
# --------------------------------------------------------------------------- #
@given(
    i=st.integers(min_value=0, max_value=len(STATUS_ORDER) - 1),
    j=st.integers(min_value=0, max_value=len(STATUS_ORDER) - 1),
)
@settings(max_examples=100)
def test_transitions_forward_only(i, j):
    frm, to = STATUS_ORDER[i], STATUS_ORDER[j]
    assert scoring.can_transition(frm, to) == (j == i + 1)


def test_valid_transition_examples():
    assert scoring.can_transition(Status.REPORTED, Status.VERIFIED)
    assert scoring.can_transition(Status.ASSIGNED, Status.IN_PROGRESS)
    assert not scoring.can_transition(Status.RESOLVED, Status.REPORTED)
    assert not scoring.can_transition(Status.REPORTED, Status.RESOLVED)


# --------------------------------------------------------------------------- #
# department / SLA
# --------------------------------------------------------------------------- #
def test_sla_deadline_after_assignment():
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    dl = scoring.sla_deadline("pothole", now)
    assert dl > now


def test_unmapped_type_uses_default_department():
    dept, hours = scoring.department_for_type("totally_unknown_type")
    assert dept
    assert 1 <= hours <= 720

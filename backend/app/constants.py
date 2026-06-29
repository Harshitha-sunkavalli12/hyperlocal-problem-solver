"""Shared enums and domain constants."""
from enum import StrEnum


class Status(StrEnum):
    REPORTED = "REPORTED"
    VERIFIED = "VERIFIED"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"


STATUS_ORDER = [
    Status.REPORTED,
    Status.VERIFIED,
    Status.ASSIGNED,
    Status.IN_PROGRESS,
    Status.RESOLVED,
]


class IssueType(StrEnum):
    POTHOLE = "pothole"
    WATER_LEAK = "water_leak"
    STREETLIGHT = "streetlight"
    GARBAGE = "garbage"
    INFRASTRUCTURE = "infrastructure"
    OTHER = "other"


# issue_type -> (department, sla_hours)
DEPARTMENT_MAP: dict[str, tuple[str, int]] = {
    IssueType.POTHOLE: ("GHMC Roads Department", 72),
    IssueType.WATER_LEAK: ("HMWSSB Water Board", 48),
    IssueType.STREETLIGHT: ("GHMC Electrical Wing", 96),
    IssueType.GARBAGE: ("GHMC Sanitation", 24),
    IssueType.INFRASTRUCTURE: ("GHMC Town Planning", 168),
    IssueType.OTHER: ("GHMC Grievance Cell", 120),
}
DEFAULT_DEPARTMENT = ("GHMC Grievance Cell", 120)

# Badge milestones: resolved issues of a type -> badge
BADGES = {
    IssueType.POTHOLE: "Pothole Hunter",
    IssueType.WATER_LEAK: "Water Guardian",
    IssueType.STREETLIGHT: "Street Light Hero",
    IssueType.GARBAGE: "Clean Streets Champion",
    IssueType.INFRASTRUCTURE: "Infrastructure Defender",
}
BADGE_MILESTONE = 3

"""Shared state object that flows through the agent pipeline."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class PipelineState:
    issue_id: str
    # trace of each agent step for UI transparency
    trace: list[dict[str, Any]] = field(default_factory=list)
    failed_agent: str | None = None
    error: str | None = None

    def log(self, agent: str, summary: str, details: dict | None = None, source: str = "rule") -> None:
        self.trace.append(
            {"agent": agent, "summary": summary, "details": details or {}, "source": source}
        )

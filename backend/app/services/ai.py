"""AI services: Google Gemini Vision (image analysis) + Claude (reasoning).

Both gracefully fall back to deterministic mocks when API keys are absent, so the
entire agentic pipeline runs offline for the demo. Every result carries a
`source` field ("gemini" | "claude" | "mock") for full transparency.
"""
from __future__ import annotations

import hashlib

from app.config import settings
from app.constants import DEPARTMENT_MAP, IssueType

# Keyword heuristics used by the mock vision model and as a Gemini prompt guide.
_KEYWORDS: dict[str, IssueType] = {
    "pothole": IssueType.POTHOLE, "road": IssueType.POTHOLE, "crack": IssueType.POTHOLE,
    "asphalt": IssueType.POTHOLE, "speed breaker": IssueType.POTHOLE,
    "water": IssueType.WATER_LEAK, "leak": IssueType.WATER_LEAK, "pipe": IssueType.WATER_LEAK,
    "sewage": IssueType.WATER_LEAK, "drain": IssueType.WATER_LEAK,
    "light": IssueType.STREETLIGHT, "lamp": IssueType.STREETLIGHT, "dark": IssueType.STREETLIGHT,
    "garbage": IssueType.GARBAGE, "trash": IssueType.GARBAGE, "waste": IssueType.GARBAGE,
    "dump": IssueType.GARBAGE, "litter": IssueType.GARBAGE,
    "bridge": IssueType.INFRASTRUCTURE, "wall": IssueType.INFRASTRUCTURE,
    "building": IssueType.INFRASTRUCTURE, "footpath": IssueType.INFRASTRUCTURE,
}

_LABELS = {
    IssueType.POTHOLE: "Road Damage / Pothole",
    IssueType.WATER_LEAK: "Water Leakage",
    IssueType.STREETLIGHT: "Damaged Streetlight",
    IssueType.GARBAGE: "Waste Management",
    IssueType.INFRASTRUCTURE: "Infrastructure Failure",
    IssueType.OTHER: "General Civic Issue",
}


def _stable_int(text: str, mod: int) -> int:
    h = int(hashlib.sha256(text.encode()).hexdigest(), 16)
    return h % mod


def _classify(text: str) -> tuple[IssueType, float]:
    low = (text or "").lower()
    for kw, itype in _KEYWORDS.items():
        if kw in low:
            return itype, 0.78 + (_stable_int(low, 20) / 100.0)  # 0.78-0.97
    return IssueType.OTHER, 0.45 + (_stable_int(low or "x", 25) / 100.0)


# --------------------------------------------------------------------------- #
# Gemini Vision
# --------------------------------------------------------------------------- #
def analyze_image(*, image_url: str = "", hint: str = "") -> dict:
    """Return {issue_type, severity, confidence, label, reasoning, source}."""
    basis = f"{hint} {image_url}".strip()

    if settings.gemini_api_key:
        try:
            return _gemini_vision(image_url=image_url, hint=hint)
        except Exception as exc:  # noqa: BLE001 - degrade gracefully
            return _mock_vision(basis, note=f"Gemini unavailable ({exc}); used heuristic model.")
    return _mock_vision(basis)


def _gemini_vision(*, image_url: str, hint: str) -> dict:
    import google.generativeai as genai  # type: ignore

    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")
    prompt = (
        "You are a civic issue classifier. Classify this report into exactly one of: "
        f"{', '.join(t.value for t in IssueType)}. Rate severity 1-5 and explain briefly. "
        f"Context: {hint}. Respond as: type|severity|confidence|reason"
    )
    resp = model.generate_content([prompt, hint or image_url])
    raw = (resp.text or "").strip()
    parts = raw.split("|")
    itype = IssueType(parts[0].strip()) if parts and parts[0].strip() in IssueType._value2member_map_ else IssueType.OTHER
    severity = int(parts[1]) if len(parts) > 1 and parts[1].strip().isdigit() else 3
    confidence = float(parts[2]) if len(parts) > 2 else 0.85
    reason = parts[3].strip() if len(parts) > 3 else raw
    return {
        "issue_type": itype.value,
        "severity": max(1, min(5, severity)),
        "confidence": round(confidence, 2),
        "label": _LABELS[itype],
        "reasoning": f"Gemini Vision: {reason}",
        "source": "gemini",
    }


def _mock_vision(basis: str, note: str = "") -> dict:
    itype, conf = _classify(basis)
    severity = 1 + _stable_int(basis or "seed", 5)  # 1-5
    if itype in (IssueType.POTHOLE, IssueType.WATER_LEAK):
        severity = max(severity, 3)  # safety issues skew higher
    label = _LABELS[itype]
    reason = (
        f"Detected visual & textual cues matching '{label}'. "
        f"Severity {severity}/5 inferred from apparent scale and public-safety impact. "
        f"Confidence {conf:.0%}."
    )
    if note:
        reason = f"{note} {reason}"
    return {
        "issue_type": itype.value,
        "severity": severity,
        "confidence": round(conf, 2),
        "label": label,
        "reasoning": reason,
        "source": "mock",
    }


# --------------------------------------------------------------------------- #
# Claude reasoning (validation / routing narration)
# --------------------------------------------------------------------------- #
def reason(prompt: str, *, fallback: str) -> tuple[str, str]:
    """Return (text, source). Uses Claude when configured, else the fallback."""
    if settings.anthropic_api_key:
        try:
            import anthropic  # type: ignore

            client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
            msg = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=300,
                messages=[{"role": "user", "content": prompt}],
            )
            return msg.content[0].text.strip(), "claude"
        except Exception:  # noqa: BLE001
            return fallback, "mock"
    return fallback, "mock"


def suggested_department(issue_type: str) -> str:
    dept, _ = DEPARTMENT_MAP.get(issue_type, ("GHMC Grievance Cell", 120))
    return dept

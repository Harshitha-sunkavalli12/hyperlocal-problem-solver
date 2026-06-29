"""Application configuration.

All AI / Google keys are optional. When absent, the platform falls back to
deterministic mock implementations so the full demo runs offline.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Community Hero"
    database_url: str = "sqlite:///./community_hero.db"

    # Optional Google / AI credentials
    gemini_api_key: str = ""
    anthropic_api_key: str = ""
    google_maps_api_key: str = ""

    # Agentic thresholds (mirrors requirements.md)
    upvote_threshold: int = 10
    geo_cluster_radius_m: int = 200
    geo_cluster_min_reports: int = 3
    proximity_notify_m: int = 300
    intake_confidence_threshold: float = 0.70
    proactive_alert_threshold: float = 0.70

    # Gamification (XP)
    xp_report: int = 10
    xp_validate: int = 5
    xp_resolve: int = 50

    cache_ttl_seconds: int = 3600
    rate_limit_per_min: int = 100


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

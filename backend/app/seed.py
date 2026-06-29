"""Seed Hyderabad demo data (run: python -m app.seed).

Creates citizens, officials and a spread of issues across Serilingampalle and
nearby zones, runs them through the agent pipeline, casts votes to verify a few,
resolves some with proof, and generates predictive insights.
"""
from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

from app.agents import insights_agent, resolution_agent
from app.agents.pipeline import run_pipeline, try_advance
from app.config import settings
from app.constants import IssueType, Status
from app.database import SessionLocal, init_db
from app.models import Issue, User, Vote
from app.services.gamification import award_xp

random.seed(42)

# (zone, center lat, center lng)
ZONES = [
    ("Serilingampalle", 17.4948, 78.3030),
    ("Miyapur", 17.4969, 78.3573),
    ("Kondapur", 17.4615, 78.3640),
    ("Gachibowli", 17.4401, 78.3489),
    ("Madhapur", 17.4483, 78.3915),
]

TITLES = {
    IssueType.POTHOLE: ["Deep pothole on main road", "Cracked road surface", "Pothole near junction"],
    IssueType.WATER_LEAK: ["Water pipe leakage", "Overflowing sewage", "Burst water main"],
    IssueType.STREETLIGHT: ["Streetlight not working", "Dark stretch at night", "Flickering lamp post"],
    IssueType.GARBAGE: ["Garbage pile uncollected", "Overflowing bin", "Illegal dumping"],
    IssueType.INFRASTRUCTURE: ["Broken footpath", "Damaged compound wall", "Cracked bridge railing"],
}

CITIZENS = [
    "arjun_h", "priya_k", "rahul_m", "sneha_r", "vikram_s", "anita_d",
    "kiran_p", "deepa_n", "manish_t", "lakshmi_v", "rohit_g", "fatima_s",
    "naveen_c", "swathi_b", "imran_q", "harsha_y",
]


def _jitter(base: float) -> float:
    return base + random.uniform(-0.012, 0.012)


def seed() -> None:
    init_db()
    db = SessionLocal()
    try:
        if db.query(Issue).count() > 0:
            print("Data already seeded. Delete community_hero.db to reseed.")
            return

        # Users
        for h in CITIZENS:
            db.add(User(handle=h, role="citizen", locality=random.choice(ZONES)[0]))
        db.add(User(handle="ghmc_official", role="official", locality="Serilingampalle"))
        db.add(User(handle="demo_citizen", role="citizen", locality="Serilingampalle"))
        db.commit()

        citizens = [u for u in db.query(User).filter(User.role == "citizen").all()]

        created: list[Issue] = []
        types = list(TITLES.keys())
        for i in range(22):
            zone, clat, clng = random.choice(ZONES)
            itype = random.choice(types)
            reporter = random.choice(citizens)
            issue = Issue(
                title=random.choice(TITLES[itype]),
                description="Reported by a concerned citizen in the field.",
                issue_type=itype,
                lat=_jitter(clat),
                lng=_jitter(clng),
                zone=zone,
                address=f"{zone}, Hyderabad, Telangana",
                image_url=f"https://picsum.photos/seed/{itype}{i}/600/400",
                reporter_id=reporter.id,
            )
            db.add(issue)
            db.flush()
            award_xp(db, reporter, settings.xp_report)
            db.commit()
            run_pipeline(db, issue)
            created.append(issue)

        # Cast votes — verify a good portion of issues.
        for idx, issue in enumerate(created):
            # Roughly two-thirds of issues attract enough votes to verify.
            n_votes = random.randint(11, 15) if idx % 3 != 0 else random.randint(0, 7)
            voters = random.sample(citizens, min(n_votes, len(citizens)))
            for v in voters:
                if v.id == issue.reporter_id:
                    continue
                if db.query(Vote).filter_by(issue_id=issue.id, user_id=v.id).first():
                    continue
                db.add(Vote(issue_id=issue.id, user_id=v.id, value=1))
                issue.upvotes += 1
                award_xp(db, v, settings.xp_validate)
                if issue.reporter_id:
                    award_xp(db, issue.reporter, settings.xp_validate)
            db.commit()
            try_advance(db, issue)

        # Resolve a few assigned issues with proof; backdate for realistic metrics.
        from app.agents.helpers import set_status

        assigned = [i for i in created if i.status in (Status.ASSIGNED, Status.IN_PROGRESS)]
        # Move a third to IN_PROGRESS for lifecycle variety.
        for issue in assigned[: max(1, len(assigned) // 3)]:
            set_status(db, issue, Status.IN_PROGRESS, note="Field team dispatched")
        db.commit()

        for issue in assigned[: max(1, len(assigned) // 2)]:
            issue.created_at = datetime.now(timezone.utc) - timedelta(hours=random.randint(30, 90))
            db.commit()
            resolution_agent.resolve_with_proof(
                db, issue, f"https://picsum.photos/seed/fixed{issue.id[:6]}/600/400",
                note="Fixed by GHMC field team",
            )
            db.commit()

        # Nightly insights.
        insights_agent.run(db)

        print(
            f"Seeded {db.query(Issue).count()} issues, "
            f"{db.query(User).count()} users, "
            f"{db.query(Vote).count()} votes."
        )
    finally:
        db.close()


if __name__ == "__main__":
    seed()

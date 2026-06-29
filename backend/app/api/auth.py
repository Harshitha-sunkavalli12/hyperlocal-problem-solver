"""Citizen authentication: signup + login.

Demo-grade auth using PBKDF2 password hashing. Reports stay pseudonymous — the
handle is the public identity; email is stored privately in the Credential row.
"""
from __future__ import annotations

import hashlib
import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Credential, User
from app.schemas import ReporterOut

router = APIRouter(prefix="/api/auth", tags=["auth"])

_ITERATIONS = 120_000


def _hash(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode(), bytes.fromhex(salt), _ITERATIONS
    ).hex()


class SignupIn(BaseModel):
    handle: str = Field(min_length=3, max_length=24)
    password: str = Field(min_length=4, max_length=128)
    email: str = ""
    locality: str = "Serilingampalle"


class LoginIn(BaseModel):
    handle: str
    password: str


class SocialIn(BaseModel):
    """Federated sign-in (e.g. Firebase Google) — identity verified client-side."""
    handle: str
    email: str = ""
    locality: str = "Serilingampalle"


class AuthOut(BaseModel):
    token: str
    role: str = "citizen"
    user: ReporterOut


def _normalize(handle: str) -> str:
    return handle.strip().lower().replace(" ", "_")


@router.post("/signup", response_model=AuthOut, status_code=201)
def signup(body: SignupIn, db: Session = Depends(get_db)) -> AuthOut:
    handle = _normalize(body.handle)
    if db.scalar(select(User).where(User.handle == handle)):
        raise HTTPException(409, "That handle is already taken. Try another.")

    user = User(handle=handle, role="citizen", locality=body.locality)
    db.add(user)
    db.flush()

    salt = os.urandom(16).hex()
    db.add(
        Credential(
            user_id=user.id,
            email=body.email.strip(),
            salt=salt,
            password_hash=_hash(body.password, salt),
        )
    )
    db.commit()
    db.refresh(user)
    return AuthOut(token=user.handle, role=user.role, user=ReporterOut.model_validate(user))


@router.post("/login", response_model=AuthOut)
def login(body: LoginIn, db: Session = Depends(get_db)) -> AuthOut:
    handle = _normalize(body.handle)
    user = db.scalar(select(User).where(User.handle == handle))
    if not user:
        raise HTTPException(401, "No account with that handle.")

    cred = db.scalar(select(Credential).where(Credential.user_id == user.id))
    if not cred:
        raise HTTPException(401, "This account has no password set. Use guest access.")
    if _hash(body.password, cred.salt) != cred.password_hash:
        raise HTTPException(401, "Incorrect password.")

    return AuthOut(token=user.handle, role=user.role, user=ReporterOut.model_validate(user))


@router.post("/official/login", response_model=AuthOut)
def official_login(body: LoginIn, db: Session = Depends(get_db)) -> AuthOut:
    """Login restricted to government Official accounts (PC dashboard access)."""
    ensure_default_official(db)
    handle = _normalize(body.handle)
    user = db.scalar(select(User).where(User.handle == handle))
    if not user or user.role != "official":
        raise HTTPException(401, "No official account with that handle.")

    cred = db.scalar(select(Credential).where(Credential.user_id == user.id))
    if not cred or _hash(body.password, cred.salt) != cred.password_hash:
        raise HTTPException(401, "Invalid official credentials.")

    return AuthOut(token=user.handle, role=user.role, user=ReporterOut.model_validate(user))


@router.post("/social", response_model=AuthOut)
def social(body: SocialIn, db: Session = Depends(get_db)) -> AuthOut:
    """Create/return a citizen account from a federated (Firebase) identity."""
    handle = _normalize(body.handle)
    user = db.scalar(select(User).where(User.handle == handle))
    if not user:
        user = User(handle=handle, role="citizen", locality=body.locality)
        db.add(user)
        db.flush()
        cred = Credential(user_id=user.id, email=body.email, salt="", password_hash="")
        db.add(cred)
    db.commit()
    db.refresh(user)
    return AuthOut(token=user.handle, role=user.role, user=ReporterOut.model_validate(user))


@router.post("/guest", response_model=AuthOut)
def guest(db: Session = Depends(get_db)) -> AuthOut:
    """Quick demo access as the seeded demo_citizen account."""
    user = db.scalar(select(User).where(User.handle == "demo_citizen"))
    if not user:
        user = User(handle="demo_citizen", role="citizen", locality="Serilingampalle")
        db.add(user)
        db.commit()
        db.refresh(user)
    return AuthOut(token=user.handle, role=user.role, user=ReporterOut.model_validate(user))


def _set_password(db: Session, user: User, password: str, email: str = "") -> None:
    cred = db.scalar(select(Credential).where(Credential.user_id == user.id))
    salt = os.urandom(16).hex()
    if cred:
        cred.salt = salt
        cred.password_hash = _hash(password, salt)
    else:
        db.add(
            Credential(user_id=user.id, email=email, salt=salt, password_hash=_hash(password, salt))
        )


def ensure_default_official(db: Session) -> None:
    """Idempotently provision a demo Official account with credentials.

    Default credentials: handle 'ghmc_official', password 'official123'.
    """
    user = db.scalar(select(User).where(User.handle == "ghmc_official"))
    if not user:
        user = User(handle="ghmc_official", role="official", locality="Serilingampalle")
        db.add(user)
        db.flush()
    elif user.role != "official":
        user.role = "official"
    if not db.scalar(select(Credential).where(Credential.user_id == user.id)):
        _set_password(db, user, "official123", email="official@ghmc.gov.in")
    db.commit()

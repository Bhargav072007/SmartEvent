from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal

import requests
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr


APP = FastAPI(title="SmartVenue PSU MVP Backend", version="1.0.0")

APP.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


ML_BASE_URL = "http://127.0.0.1:5050"

SCENARIO_RESULT: dict[str, str] = {
    "valid": "VERIFIED",
    "used": "ALREADY_USED",
    "expired": "EXPIRED",
    "retry": "RETRY",
}

SCENARIO_TOKEN: dict[str, str] = {
    "valid": "PSU-VALID-001",
    "used": "PSU-USED-001",
    "expired": "PSU-EXPIRED-001",
    "retry": "PSU-RETRY-001",
}

SCENARIO_STATUS: dict[str, str] = {
    "valid": "active",
    "used": "used",
    "expired": "expired",
    "retry": "retry",
}

GATE_BY_SECTION = {
    "student": "A",
    "lower": "B",
    "club": "C",
    "upper": "D",
}

USERS: dict[str, dict] = {}
USER_TICKETS: dict[str, list[str]] = {}
TICKETS: dict[str, dict] = {}


class MockLoginRequest(BaseModel):
    name: str
    email: EmailStr


class IssueDemoRequest(BaseModel):
    user_id: str
    scenario: Literal["valid", "used", "expired", "retry"]


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def now_iso() -> str:
    return now_utc().isoformat()


def upcoming_game_payload() -> dict:
    kickoff = now_utc().replace(hour=19, minute=30, second=0, microsecond=0)
    if kickoff < now_utc():
        kickoff = kickoff + timedelta(days=7)

    return {
        "game_id": "game-whiteout-001",
        "title": "Penn State vs Michigan",
        "kickoff": kickoff.isoformat(),
        "venue": "Beaver Stadium",
    }


def seat_for_user(user_id: str) -> str:
    suffix = sum(ord(ch) for ch in user_id) % 4
    return ["Section 14, Row 8, Seat 12", "Section 7, Row 20, Seat 4", "Section 34, Row 3, Seat 18", "Section 102, Row 14, Seat 6"][suffix]


def gate_for_seat(seat: str) -> str:
    if "102" in seat:
        return GATE_BY_SECTION["upper"]
    if "34" in seat:
        return GATE_BY_SECTION["club"]
    if "14" in seat:
        return GATE_BY_SECTION["student"]
    return GATE_BY_SECTION["lower"]


def create_ticket(user_id: str, scenario: str) -> dict:
    ticket_id = f"ticket-{uuid.uuid4().hex[:8]}"
    seat = seat_for_user(user_id)
    gate = gate_for_seat(seat)
    issued_at = now_utc()
    ticket = {
        "ticket_id": ticket_id,
        "user_id": user_id,
        "seat": seat,
        "gate": gate,
        "token": SCENARIO_TOKEN[scenario],
        "scenario": scenario,
        "status": SCENARIO_STATUS[scenario],
        "issued_at": issued_at.isoformat(),
        "tap_started_at": None,
        "last_result": None,
        "last_gate": gate,
    }
    TICKETS[ticket_id] = ticket
    USER_TICKETS.setdefault(user_id, [])
    USER_TICKETS[user_id] = [ticket_id]
    return ticket


def ensure_user_ticket(user_id: str) -> dict:
    ticket_ids = USER_TICKETS.get(user_id)
    if ticket_ids:
        return TICKETS[ticket_ids[0]]
    return create_ticket(user_id, "valid")


def maybe_progress_ticket(ticket: dict) -> None:
    if ticket["last_result"] is not None:
        return

    if ticket["tap_started_at"] is None:
        ticket["tap_started_at"] = now_utc().isoformat()
        return

    started = datetime.fromisoformat(ticket["tap_started_at"])
    if now_utc() - started < timedelta(seconds=3):
        return

    result = SCENARIO_RESULT[ticket["scenario"]]
    ticket["last_result"] = result
    ticket["status"] = result.lower()


def recognition_hint() -> dict:
    try:
        response = requests.get(f"{ML_BASE_URL}/recognition", timeout=0.5)
        if response.ok:
            return response.json()
    except Exception:
        pass
    return {}


@APP.get("/")
def root() -> dict:
    return {
        "service": "SmartVenue PSU MVP Backend",
        "status": "online",
        "timestamp": now_iso(),
    }


@APP.post("/auth/mock-login")
def auth_mock_login(payload: MockLoginRequest) -> dict:
    user_id = f"user-{uuid.uuid5(uuid.NAMESPACE_DNS, payload.email).hex[:8]}"
    user = {
        "user_id": user_id,
        "name": payload.name,
        "email": payload.email,
    }
    USERS[user_id] = user
    ensure_user_ticket(user_id)
    return user


@APP.get("/games/upcoming")
def games_upcoming() -> dict:
    return upcoming_game_payload()


@APP.get("/tickets/me")
def tickets_me(user_id: str = Query(...)) -> dict:
    if user_id not in USERS:
        raise HTTPException(status_code=404, detail="User not found")
    ticket = ensure_user_ticket(user_id)
    return {"tickets": [ticket]}


@APP.post("/tickets/issue-demo")
def tickets_issue_demo(payload: IssueDemoRequest) -> dict:
    if payload.user_id not in USERS:
        raise HTTPException(status_code=404, detail="User not found")
    return create_ticket(payload.user_id, payload.scenario)


@APP.get("/tickets/status/{ticket_id}")
def tickets_status(ticket_id: str) -> dict:
    ticket = TICKETS.get(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    maybe_progress_ticket(ticket)
    hint = recognition_hint()

    return {
        "ticket_id": ticket_id,
        "status": ticket["status"],
        "last_result": ticket["last_result"],
        "last_gate": ticket["last_gate"],
        "recognition_hint": {
            "ui_phase": hint.get("ui_phase"),
            "instruction": hint.get("instruction"),
            "confidence": hint.get("confidence"),
        },
        "timestamp": now_iso(),
    }


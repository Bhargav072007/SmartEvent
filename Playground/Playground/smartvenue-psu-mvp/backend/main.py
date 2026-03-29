from __future__ import annotations

import os
import sqlite3
from contextlib import closing
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = Path(os.getenv("DATABASE_PATH", BASE_DIR / "smartvenue_psu.db"))
DEFAULT_GATE = os.getenv("DEFAULT_GATE", "Gate A")

app = FastAPI(title="SmartVenue PSU Backend", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("ALLOWED_ORIGIN", "*")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class MockLoginRequest(BaseModel):
    email: str
    name: str


class IssueDemoRequest(BaseModel):
    user_id: str
    scenario: str


class ValidateScanRequest(BaseModel):
    token: str
    gate_id: str
    device_id: str


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def now_iso() -> str:
    return datetime.now().replace(microsecond=0).isoformat()


def setup_db() -> None:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with closing(get_connection()) as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE
            );

            CREATE TABLE IF NOT EXISTS games (
                game_id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                venue TEXT NOT NULL,
                kickoff TEXT NOT NULL,
                home_team TEXT NOT NULL,
                away_team TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS tickets (
                ticket_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                game_id TEXT NOT NULL,
                seat TEXT NOT NULL,
                gate TEXT NOT NULL,
                status TEXT NOT NULL,
                token TEXT NOT NULL UNIQUE,
                valid_from TEXT NOT NULL,
                valid_until TEXT NOT NULL,
                used_at TEXT,
                last_result TEXT,
                last_gate TEXT,
                last_scanned_at TEXT,
                FOREIGN KEY(user_id) REFERENCES users(user_id),
                FOREIGN KEY(game_id) REFERENCES games(game_id)
            );

            CREATE TABLE IF NOT EXISTS scan_logs (
                scan_id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id TEXT,
                gate_id TEXT NOT NULL,
                device_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                result TEXT NOT NULL,
                token TEXT NOT NULL
            );
            """
        )
        conn.commit()


def seed_data() -> None:
    kickoff = datetime.now().replace(microsecond=0) + timedelta(hours=2)
    valid_from = kickoff - timedelta(hours=4)
    valid_until = kickoff + timedelta(hours=2)
    expired_until = kickoff - timedelta(minutes=30)

    with closing(get_connection()) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO users (user_id, name, email) VALUES (?, ?, ?)",
            ("user-001", "Alex Student", "fan@psu.edu"),
        )
        conn.execute(
            "INSERT OR REPLACE INTO games (game_id, title, venue, kickoff, home_team, away_team) VALUES (?, ?, ?, ?, ?, ?)",
            (
                "game-psu-michigan-2026",
                "Penn State vs Michigan",
                "Beaver Stadium",
                kickoff.replace(microsecond=0).isoformat(),
                "Penn State",
                "Michigan",
            ),
        )

        tickets = [
            (
                "ticket-valid-001",
                "user-001",
                "game-psu-michigan-2026",
                "Section WE, Row 7, Seat 18",
                "Gate A",
                "active",
                "PSU-VALID-001",
                valid_from.isoformat(),
                valid_until.isoformat(),
                None,
                None,
                None,
                None,
            ),
            (
                "ticket-used-001",
                "user-001",
                "game-psu-michigan-2026",
                "Section WA, Row 9, Seat 4",
                "Gate C",
                "used",
                "PSU-USED-001",
                valid_from.isoformat(),
                valid_until.isoformat(),
                (kickoff - timedelta(minutes=18)).isoformat(),
                "ALREADY_USED",
                "Gate C",
                (kickoff - timedelta(minutes=18)).isoformat(),
            ),
            (
                "ticket-expired-001",
                "user-001",
                "game-psu-michigan-2026",
                "Section EB, Row 12, Seat 30",
                "Gate E",
                "expired",
                "PSU-EXPIRED-001",
                (kickoff - timedelta(days=1)).isoformat(),
                expired_until.isoformat(),
                None,
                "EXPIRED",
                "Gate E",
                (kickoff - timedelta(hours=1)).isoformat(),
            ),
            (
                "ticket-retry-001",
                "user-001",
                "game-psu-michigan-2026",
                "Section FC, Row 2, Seat 11",
                "Gate B",
                "active",
                "PSU-RETRY-001",
                valid_from.isoformat(),
                valid_until.isoformat(),
                None,
                "RETRY",
                "Gate B",
                None,
            ),
        ]
        conn.executemany(
            """
            INSERT OR REPLACE INTO tickets (
              ticket_id, user_id, game_id, seat, gate, status, token,
              valid_from, valid_until, used_at, last_result, last_gate, last_scanned_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            tickets,
        )
        conn.commit()


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    return dict(row) if row is not None else None


def fetch_ticket_by_token(token: str) -> dict[str, Any] | None:
    with closing(get_connection()) as conn:
        row = conn.execute("SELECT * FROM tickets WHERE token = ?", (token,)).fetchone()
        return row_to_dict(row)


def fetch_ticket(ticket_id: str) -> dict[str, Any] | None:
    with closing(get_connection()) as conn:
        row = conn.execute("SELECT * FROM tickets WHERE ticket_id = ?", (ticket_id,)).fetchone()
        return row_to_dict(row)


def save_scan(ticket_id: str | None, gate_id: str, device_id: str, result: str, token: str) -> None:
    with closing(get_connection()) as conn:
        conn.execute(
            "INSERT INTO scan_logs (ticket_id, gate_id, device_id, timestamp, result, token) VALUES (?, ?, ?, ?, ?, ?)",
            (ticket_id, gate_id, device_id, now_iso(), result, token),
        )
        conn.commit()


def update_ticket_scan(ticket_id: str, status: str, result: str, gate_id: str, scanned_at: str, used_at: str | None = None) -> None:
    with closing(get_connection()) as conn:
        conn.execute(
            """
            UPDATE tickets
            SET status = ?, last_result = ?, last_gate = ?, last_scanned_at = ?, used_at = COALESCE(?, used_at)
            WHERE ticket_id = ?
            """,
            (status, result, gate_id, scanned_at, used_at, ticket_id),
        )
        conn.commit()


def validate_ticket(request: ValidateScanRequest) -> dict[str, Any]:
    scanned_at = now_iso()
    token = request.token.strip()

    if not token or token == "PSU-RETRY-001":
        save_scan(None, request.gate_id, request.device_id, "RETRY", token or "<empty>")
        return {
            "result": "RETRY",
            "message": "Reader could not decode the tap. Please retry.",
            "ticket_id": None,
            "gate_id": request.gate_id,
            "scanned_at": scanned_at,
            "allowed": False,
            "display_text": "Please Retry",
        }

    ticket = fetch_ticket_by_token(token)
    if ticket is None:
        save_scan(None, request.gate_id, request.device_id, "INVALID", token)
        return {
            "result": "INVALID",
            "message": "Ticket token was not recognized.",
            "ticket_id": None,
            "gate_id": request.gate_id,
            "scanned_at": scanned_at,
            "allowed": False,
            "display_text": "Invalid Ticket",
        }

    valid_from = datetime.fromisoformat(ticket["valid_from"])
    valid_until = datetime.fromisoformat(ticket["valid_until"])
    current_time = datetime.now()

    if ticket["status"] == "used" or ticket["used_at"]:
        update_ticket_scan(ticket["ticket_id"], "used", "ALREADY_USED", request.gate_id, scanned_at)
        save_scan(ticket["ticket_id"], request.gate_id, request.device_id, "ALREADY_USED", token)
        return {
            "result": "ALREADY_USED",
            "message": "This ticket has already been used for entry.",
            "ticket_id": ticket["ticket_id"],
            "gate_id": request.gate_id,
            "scanned_at": scanned_at,
            "allowed": False,
            "display_text": "Ticket Already Used",
        }

    if current_time < valid_from or current_time > valid_until or ticket["status"] == "expired":
        update_ticket_scan(ticket["ticket_id"], "expired", "EXPIRED", request.gate_id, scanned_at)
        save_scan(ticket["ticket_id"], request.gate_id, request.device_id, "EXPIRED", token)
        return {
            "result": "EXPIRED",
            "message": "This ticket is outside the valid entry window.",
            "ticket_id": ticket["ticket_id"],
            "gate_id": request.gate_id,
            "scanned_at": scanned_at,
            "allowed": False,
            "display_text": "Expired Ticket",
        }

    update_ticket_scan(ticket["ticket_id"], "used", "VERIFIED", request.gate_id, scanned_at, used_at=scanned_at)
    save_scan(ticket["ticket_id"], request.gate_id, request.device_id, "VERIFIED", token)
    return {
        "result": "VERIFIED",
        "message": "Entry approved. Proceed to Beaver Stadium gate.",
        "ticket_id": ticket["ticket_id"],
        "gate_id": request.gate_id,
        "scanned_at": scanned_at,
        "allowed": True,
        "display_text": "Entry Verified",
    }


@app.on_event("startup")
def on_startup() -> None:
    setup_db()
    seed_data()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/mock-login")
def mock_login(payload: MockLoginRequest) -> dict[str, str]:
    with closing(get_connection()) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO users (user_id, name, email) VALUES (?, ?, ?)",
            ("user-001", payload.name, payload.email),
        )
        conn.commit()
    return {"user_id": "user-001", "name": payload.name, "email": payload.email}


@app.get("/games/upcoming")
def get_upcoming_game() -> dict[str, str]:
    with closing(get_connection()) as conn:
        row = conn.execute("SELECT * FROM games ORDER BY kickoff ASC LIMIT 1").fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="No game found")
        return dict(row)


@app.get("/tickets/me")
def get_tickets_me(user_id: str = Query(default="user-001")) -> dict[str, list[dict[str, Any]]]:
    with closing(get_connection()) as conn:
        rows = conn.execute("SELECT * FROM tickets WHERE user_id = ? ORDER BY ticket_id ASC", (user_id,)).fetchall()
        return {"tickets": [dict(row) for row in rows]}


@app.post("/tickets/issue-demo")
def issue_demo_ticket(payload: IssueDemoRequest) -> dict[str, Any]:
    token_map = {
        "valid": "PSU-VALID-001",
        "used": "PSU-USED-001",
        "expired": "PSU-EXPIRED-001",
        "retry": "PSU-RETRY-001",
    }
    token = token_map.get(payload.scenario.lower())
    if token is None:
        raise HTTPException(status_code=400, detail="Unknown demo scenario")
    scenario_status = {
        "valid": ("active", None),
        "used": ("used", now_iso()),
        "expired": ("expired", None),
        "retry": ("active", None),
    }[payload.scenario.lower()]
    with closing(get_connection()) as conn:
        conn.execute(
            """
            UPDATE tickets
            SET status = ?, used_at = ?, last_result = NULL, last_gate = NULL, last_scanned_at = NULL
            WHERE token = ?
            """,
            (scenario_status[0], scenario_status[1], token),
        )
        conn.commit()
    ticket = fetch_ticket_by_token(token)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Demo ticket not found")
    return ticket


@app.post("/tickets/validate-scan")
def validate_scan(payload: ValidateScanRequest) -> dict[str, Any]:
    return validate_ticket(payload)


@app.get("/tickets/status/{ticket_id}")
def get_ticket_status(ticket_id: str) -> dict[str, Any]:
    ticket = fetch_ticket(ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {
        "ticket_id": ticket["ticket_id"],
        "status": ticket["status"],
        "last_result": ticket["last_result"],
        "last_gate": ticket["last_gate"] or ticket["gate"],
        "last_scanned_at": ticket["last_scanned_at"],
        "seat": ticket["seat"],
        "gate": ticket["gate"],
    }

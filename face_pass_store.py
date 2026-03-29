from __future__ import annotations

import json
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any
from uuid import uuid4


@dataclass
class FacePassProfile:
    id: str
    name: str
    email: str
    selfie_url: str | None = None
    ticket_section: str | None = None
    parking_lot: str | None = None
    assigned_gate: str | None = None
    verification_status: str = "pending"
    row: str | None = None
    seat: str | None = None
    ticket_code: str | None = None
    event_name: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


class FacePassStore:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self._write([])

    def _read(self) -> list[dict[str, Any]]:
        try:
            return json.loads(self.path.read_text())
        except Exception:
            return []

    def _write(self, rows: list[dict[str, Any]]) -> None:
        self.path.write_text(json.dumps(rows, indent=2))

    def list(self, email: str | None = None) -> list[dict[str, Any]]:
        rows = self._read()
        if email:
            return [row for row in rows if str(row.get("email", "")).lower() == email.lower()]
        return rows

    def create(self, payload: dict[str, Any], timestamp: str) -> dict[str, Any]:
        rows = self._read()
        row = asdict(
            FacePassProfile(
                id=payload.get("id") or f"face-pass-{uuid4().hex[:10]}",
                name=payload.get("name", ""),
                email=payload.get("email", ""),
                selfie_url=payload.get("selfie_url"),
                ticket_section=payload.get("ticket_section"),
                parking_lot=payload.get("parking_lot"),
                assigned_gate=payload.get("assigned_gate"),
                verification_status=payload.get("verification_status", "pending"),
                row=payload.get("row"),
                seat=payload.get("seat"),
                ticket_code=payload.get("ticket_code"),
                event_name=payload.get("event_name"),
                created_at=timestamp,
                updated_at=timestamp,
            )
        )
        rows.append(row)
        self._write(rows)
        return row

    def update(self, profile_id: str, payload: dict[str, Any], timestamp: str) -> dict[str, Any]:
        rows = self._read()
        updated_row = None
        for idx, row in enumerate(rows):
            if row.get("id") != profile_id:
                continue
            updated_row = {**row, **payload, "id": profile_id, "updated_at": timestamp}
            rows[idx] = updated_row
            break
        if updated_row is None:
            raise KeyError(profile_id)
        self._write(rows)
        return updated_row

    def verify(self, email: str | None = None, name: str | None = None) -> dict[str, Any]:
        rows = self._read()
        profile = None
        if email:
            profile = next((row for row in rows if str(row.get("email", "")).lower() == email.lower()), None)
        if profile is None and name:
            profile = next((row for row in rows if str(row.get("name", "")).lower() == name.lower()), None)

        if not profile:
            return {
                "verified": False,
                "message": "No valid Face Pass ticket was found for this person.",
                "access_granted": False,
                "profile": None,
            }

        is_verified = profile.get("verification_status") == "verified"
        return {
            "verified": is_verified,
            "access_granted": is_verified,
            "message": "Valid ticket found. Face Pass verified for entry." if is_verified else "Ticket found, but Face Pass is not fully verified yet.",
            "profile": profile,
        }

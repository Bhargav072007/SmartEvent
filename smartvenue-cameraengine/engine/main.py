from __future__ import annotations

import sys
import json
from pathlib import Path
from typing import Any, Optional
from urllib import error as urlerror
from urllib import request as urlrequest

BASE_DIR = Path(__file__).resolve().parents[2]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from smartvenue_camera_router import (
    CameraUpdatePayload,
    GateTapPayload,
    RecommendationPayload,
    create_service,
    now_iso,
)
from face_pass_store import FacePassStore

try:
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel, Field
except ModuleNotFoundError as exc:  # pragma: no cover
    raise RuntimeError(
        "FastAPI is required to run the web server. Install 'fastapi' and 'uvicorn' first."
    ) from exc


app = FastAPI(title="SmartVenue Camera + Routing Engine", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

service = create_service()
face_pass_store = FacePassStore(BASE_DIR / "smartevent2" / "data" / "face_pass_profiles.json")
KIOSK_REGISTER_URL = "http://127.0.0.1:5001/register"
KIOSK_RELOAD_URL = "http://127.0.0.1:5050/reload-db"


class CameraUpdateModel(BaseModel):
    gate: str = Field(default="A")
    person_count: int = Field(default=0, ge=0)
    density_score: float = Field(default=0.0, ge=0.0, le=1.0)
    pressure_score: float = Field(default=0.0, ge=0.0)
    flow_speed: float = Field(default=0.0, ge=0.0)
    flow_direction: str = Field(default="steady")
    detection_confidence: float = Field(default=0.9, ge=0.0, le=1.0)
    occlusion_level: str = Field(default="low")
    image_quality: str = Field(default="good")
    lighting_condition: str = Field(default="daylight")
    super_resolution_needed: bool = Field(default=False)
    timestamp: Optional[str] = None
    camera_id: Optional[str] = None


class GateTapModel(BaseModel):
    gate: str = Field(default="A")
    user_id: str = Field(default="")
    seat_section: str = Field(default="")
    fan_type: str = Field(default="general")
    timestamp: Optional[str] = None


class RecommendationModel(BaseModel):
    fan_type: str = Field(default="general")
    current_gate: Optional[str] = None
    seat_section: Optional[str] = None
    match_id: Optional[str] = None
    minutes_from_kickoff: int = Field(default=-45)
    kickoff_bucket: str = Field(default="afternoon")
    weather_bucket: str = Field(default="clear")
    security_strictness: str = Field(default="standard")
    premium_game_flag: bool = Field(default=False)
    rivalry_flag: bool = Field(default=False)
    min_improvement_minutes: float = Field(default=2.0, ge=0.0)


class FacePassProfileModel(BaseModel):
    name: str = Field(default="")
    email: str = Field(default="")
    selfie_url: Optional[str] = None
    ticket_section: Optional[str] = None
    parking_lot: Optional[str] = None
    assigned_gate: Optional[str] = None
    verification_status: str = Field(default="pending")
    row: Optional[str] = None
    seat: Optional[str] = None
    ticket_code: Optional[str] = None
    event_name: Optional[str] = None


class FacePassVerifyModel(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    gate: Optional[str] = None


def bad_request(exc: Exception) -> HTTPException:
    return HTTPException(status_code=400, detail=str(exc))


def extract_base64_payload(data_url: Optional[str]) -> Optional[str]:
    if not data_url:
        return None
    raw = str(data_url)
    if "," in raw and raw.startswith("data:"):
        return raw.split(",", 1)[1]
    return raw


def sync_profile_to_kiosk(profile: dict[str, Any]) -> dict[str, Any]:
    photo = extract_base64_payload(profile.get("selfie_url"))
    if not photo:
        return {"status": "skipped", "reason": "no_selfie"}

    payload = {
        "fan_id": profile.get("email") or profile["id"],
        "name": profile.get("name", ""),
        "seat_section": profile.get("ticket_section", "") or "",
        "gate_assignment": profile.get("assigned_gate", "") or "C",
        "ticket_valid": profile.get("verification_status") == "verified",
        "photos": [photo],
    }
    req = urlrequest.Request(
        KIOSK_REGISTER_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlrequest.urlopen(req, timeout=3.0) as response:
            body = response.read().decode("utf-8")
        registration = json.loads(body)

        reload_status: dict[str, Any]
        try:
            reload_req = urlrequest.Request(KIOSK_RELOAD_URL, data=b"", method="POST")
            with urlrequest.urlopen(reload_req, timeout=2.0) as reload_response:
                reload_body = reload_response.read().decode("utf-8")
            reload_status = {"status": "ok", "response": json.loads(reload_body)}
        except urlerror.URLError as exc:
            reload_status = {"status": "unavailable", "reason": str(exc)}
        except Exception as exc:
            reload_status = {"status": "error", "reason": str(exc)}

        return {"status": "ok", "response": registration, "reload": reload_status}
    except urlerror.URLError as exc:
        return {"status": "unavailable", "reason": str(exc)}
    except Exception as exc:
        return {"status": "error", "reason": str(exc)}


@app.get("/")
def root() -> dict[str, Any]:
    return {
        "service": "SmartVenue Camera + Routing Engine",
        "status": "online",
        "timestamp": now_iso(),
    }


@app.post("/api/camera/update")
def camera_update(payload: CameraUpdateModel) -> dict[str, Any]:
    try:
        updated = service.update_camera(CameraUpdatePayload(**payload.model_dump()))
    except ValueError as exc:
        raise bad_request(exc)
    return {"status": "ok", "updated": updated, "timestamp": now_iso()}


@app.post("/api/gate/tap")
def gate_tap(payload: GateTapModel) -> dict[str, Any]:
    try:
        return service.register_tap(GateTapPayload(**payload.model_dump()))
    except ValueError as exc:
        raise bad_request(exc)


@app.get("/api/gates/live")
def gates_live() -> dict[str, Any]:
    return {"gates": service.live_gates(), "timestamp": now_iso()}


@app.get("/api/stats/live")
def stats_live() -> dict[str, Any]:
    return service.stats()


@app.get("/api/gate/recommend")
def gate_recommend(
    seat: str = "",
    fan_type: str = "general",
    current_gate: Optional[str] = None,
    match_id: Optional[str] = None,
    minute: int = -45,
    kickoff_bucket: str = "afternoon",
    weather_bucket: str = "clear",
    security_strictness: str = "standard",
    premium_game_flag: bool = False,
    rivalry_flag: bool = False,
    min_improvement: float = 2.0,
) -> dict[str, Any]:
    payload = RecommendationPayload(
        fan_type=fan_type,
        current_gate=current_gate,
        seat_section=seat,
        match_id=match_id,
        minutes_from_kickoff=minute,
        kickoff_bucket=kickoff_bucket,
        weather_bucket=weather_bucket,
        security_strictness=security_strictness,
        premium_game_flag=premium_game_flag,
        rivalry_flag=rivalry_flag,
        min_improvement_minutes=min_improvement,
    )
    try:
        return service.recommend(payload)
    except ValueError as exc:
        raise bad_request(exc)


@app.post("/api/gate/recommend")
def gate_recommend_post(payload: RecommendationModel) -> dict[str, Any]:
    try:
        return service.recommend(RecommendationPayload(**payload.model_dump()))
    except ValueError as exc:
        raise bad_request(exc)


@app.get("/api/face-pass/profiles")
def face_pass_profiles(email: str = "") -> dict[str, Any]:
    return {
        "profiles": face_pass_store.list(email=email or None),
        "timestamp": now_iso(),
    }


@app.post("/api/face-pass/profiles")
def face_pass_create(payload: FacePassProfileModel) -> dict[str, Any]:
    created = face_pass_store.create(payload.model_dump(), now_iso())
    return {"profile": created, "kiosk_sync": sync_profile_to_kiosk(created), "timestamp": now_iso()}


@app.put("/api/face-pass/profiles/{profile_id}")
def face_pass_update(profile_id: str, payload: FacePassProfileModel) -> dict[str, Any]:
    try:
        profile = face_pass_store.update(profile_id, payload.model_dump(), now_iso())
    except KeyError:
        raise HTTPException(status_code=404, detail="Face Pass profile not found")
    return {"profile": profile, "kiosk_sync": sync_profile_to_kiosk(profile), "timestamp": now_iso()}


@app.post("/api/face-pass/verify")
def face_pass_verify(payload: FacePassVerifyModel) -> dict[str, Any]:
    result = face_pass_store.verify(email=payload.email, name=payload.name)
    if result["profile"] and payload.gate:
        result["gate"] = payload.gate
    result["timestamp"] = now_iso()
    return result

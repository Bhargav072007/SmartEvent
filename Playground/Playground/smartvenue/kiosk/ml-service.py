"""
SmartVenue Kiosk ML Service

Runs on the laptop and exposes the live face-recognition engine over HTTP so a
Raspberry Pi can act purely as the kiosk UI terminal.
"""

from __future__ import annotations

import threading
import time
from datetime import datetime, timezone
from typing import Any, Optional

import cv2
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from face_engine import engine


APP = FastAPI(title="SmartVenue Kiosk ML Service", version="1.0.0")
APP.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_JPEG_LOCK = threading.Lock()
_LATEST_JPEG: Optional[bytes] = None
_JPEG_QUALITY = 82


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _snapshot_loop() -> None:
    global _LATEST_JPEG

    while True:
        try:
            frame = engine.get_live_frame()
            ok, encoded = cv2.imencode(
                ".jpg",
                frame,
                [int(cv2.IMWRITE_JPEG_QUALITY), _JPEG_QUALITY],
            )
            if ok:
                with _JPEG_LOCK:
                    _LATEST_JPEG = encoded.tobytes()
        except Exception:
            pass
        time.sleep(0.05)


threading.Thread(target=_snapshot_loop, daemon=True).start()


def _serializable_result() -> dict[str, Any]:
    result = engine.get_recognition_result()
    result.pop("frame", None)

    face_box = result.get("face_box")
    if face_box is not None:
        result["face_box"] = [int(v) for v in face_box]

    result["timestamp"] = _now_iso()
    return result


@APP.get("/")
def root() -> dict[str, Any]:
    return {
        "service": "SmartVenue Kiosk ML Service",
        "status": "online",
        "camera_active": True,
        "timestamp": _now_iso(),
    }


@APP.get("/health")
def health() -> dict[str, Any]:
    result = engine.get_recognition_result()
    return {
        "status": "ok",
        "recognition_status": result.get("status", "unknown"),
        "ui_phase": result.get("ui_phase", "unknown"),
        "timestamp": _now_iso(),
    }


@APP.get("/recognition")
def recognition() -> JSONResponse:
    return JSONResponse(_serializable_result())


@APP.get("/frame.jpg")
def frame_jpg() -> Response:
    with _JPEG_LOCK:
        payload = _LATEST_JPEG

    if payload is None:
        return Response(status_code=503)

    return Response(content=payload, media_type="image/jpeg")


@APP.post("/reload-db")
def reload_db() -> dict[str, Any]:
    engine.reload_database()
    return {
        "status": "ok",
        "message": "database reloaded",
        "timestamp": _now_iso(),
    }

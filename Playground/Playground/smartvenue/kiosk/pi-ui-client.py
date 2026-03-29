"""
SmartVenue Pi UI Client

Runs on the Raspberry Pi and renders the kiosk experience by polling the laptop
ML service. The Pi is only responsible for the visual layer.
"""

from __future__ import annotations

import os
import time
from typing import Any

import cv2
import numpy as np
import requests


ML_BASE_URL = os.getenv("SMARTVENUE_ML_URL", "http://127.0.0.1:5050")
WINDOW_NAME = "SmartVenue Kiosk"

SCREEN_W = 960
SCREEN_H = 540

ACCENT = (255, 212, 0)   # BGR cyan-ish
GREEN = (83, 200, 0)
RED = (0, 0, 213)
AMBER = (0, 109, 255)
WHITE = (245, 245, 245)
DARK = (16, 18, 24)


def fetch_state(timeout: float = 0.6) -> dict[str, Any]:
    try:
        response = requests.get(f"{ML_BASE_URL}/recognition", timeout=timeout)
        response.raise_for_status()
        return response.json()
    except Exception:
        return {
            "status": "offline",
            "ui_phase": "offline",
            "instruction": "Connecting to recognition engine...",
            "confidence": 0.0,
            "fan_name": "",
            "gate": "",
            "seat_section": "",
            "fan_id": "",
            "face_box": None,
            "progress": 0.0,
        }


def fetch_frame(timeout: float = 0.8) -> np.ndarray:
    try:
        response = requests.get(f"{ML_BASE_URL}/frame.jpg", timeout=timeout)
        response.raise_for_status()
        arr = np.frombuffer(response.content, dtype=np.uint8)
        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if frame is not None:
            return frame
    except Exception:
        pass
    return np.zeros((SCREEN_H, SCREEN_W, 3), dtype=np.uint8)


def fit_frame(frame: np.ndarray) -> np.ndarray:
    return cv2.resize(frame, (SCREEN_W, SCREEN_H), interpolation=cv2.INTER_LINEAR)


def alpha_rect(img: np.ndarray, x1: int, y1: int, x2: int, y2: int, color: tuple[int, int, int], alpha: float) -> None:
    overlay = img.copy()
    cv2.rectangle(overlay, (x1, y1), (x2, y2), color, -1)
    cv2.addWeighted(overlay, alpha, img, 1 - alpha, 0, img)


def put_text(img: np.ndarray, text: str, x: int, y: int, scale: float, color: tuple[int, int, int], thick: int = 1) -> None:
    cv2.putText(img, text, (x, y), cv2.FONT_HERSHEY_SIMPLEX, scale, color, thick, cv2.LINE_AA)


def draw_face_box(img: np.ndarray, face_box: list[int] | None, phase: str, progress: float) -> None:
    if not face_box or len(face_box) != 4:
        return

    x, y, w, h = [int(v) for v in face_box]
    sx = SCREEN_W / 640.0
    sy = SCREEN_H / 480.0
    x = int(x * sx)
    y = int(y * sy)
    w = int(w * sx)
    h = int(h * sy)

    color = GREEN if phase in {"scanning", "verified"} else AMBER if phase == "hold_still" else ACCENT
    thickness = 3
    cv2.rectangle(img, (x, y), (x + w, y + h), color, thickness)

    if phase in {"scanning", "hold_still"}:
        bar_h = 8
        cv2.rectangle(img, (x, y + h + 12), (x + w, y + h + 12 + bar_h), (50, 50, 50), -1)
        cv2.rectangle(img, (x, y + h + 12), (x + int(w * max(0.0, min(progress, 1.0))), y + h + 12 + bar_h), color, -1)


def render(frame: np.ndarray, state: dict[str, Any]) -> np.ndarray:
    ui = frame.copy()
    phase = state.get("ui_phase", "welcome")
    instruction = state.get("instruction", "Welcome to Beaver Stadium")
    name = state.get("fan_name", "")
    gate = state.get("gate", "")
    confidence = float(state.get("confidence", 0.0) or 0.0)

    alpha_rect(ui, 0, 0, SCREEN_W, 70, DARK, 0.75)
    put_text(ui, "SMARTVENUE", 22, 42, 1.0, ACCENT, 2)
    put_text(ui, time.strftime("%I:%M:%S %p"), SCREEN_W - 180, 42, 0.65, WHITE, 1)

    if phase == "welcome":
        alpha_rect(ui, 0, 90, SCREEN_W, SCREEN_H - 70, DARK, 0.28)
        put_text(ui, "WELCOME TO BEAVER STADIUM", 155, 220, 1.05, WHITE, 2)
        put_text(ui, "Step up to begin SmartVenue identity scan", 210, 275, 0.65, (210, 210, 210), 1)
    elif phase == "approach":
        alpha_rect(ui, 0, 90, SCREEN_W, SCREEN_H - 70, DARK, 0.18)
        put_text(ui, "WELCOME TO THE STADIUM", 225, 210, 0.95, WHITE, 2)
        put_text(ui, instruction, 310, 260, 0.7, ACCENT, 2)
    elif phase == "scanning":
        alpha_rect(ui, 0, 90, SCREEN_W, SCREEN_H - 70, DARK, 0.12)
        put_text(ui, "SCANNING", 390, 95, 0.8, GREEN, 2)
        put_text(ui, instruction, 305, 130, 0.6, WHITE, 1)
    elif phase == "hold_still":
        alpha_rect(ui, 0, 90, SCREEN_W, SCREEN_H - 70, DARK, 0.16)
        put_text(ui, "HOLD STILL", 375, 95, 0.8, AMBER, 2)
        put_text(ui, instruction, 275, 130, 0.6, WHITE, 1)
    elif phase == "verified":
        alpha_rect(ui, 0, 0, SCREEN_W, SCREEN_H, GREEN, 0.22)
        put_text(ui, "VERIFIED", 355, 180, 1.15, WHITE, 3)
        put_text(ui, name or "Fan recognised", 250, 245, 0.95, WHITE, 2)
        put_text(ui, f"GATE {gate or '--'}", 375, 300, 0.9, WHITE, 2)
    elif phase in {"denied", "spoof"}:
        alpha_rect(ui, 0, 0, SCREEN_W, SCREEN_H, RED, 0.22)
        put_text(ui, "ACCESS DENIED" if phase == "denied" else "SPOOF DETECTED", 300, 195, 1.0, WHITE, 3)
        put_text(ui, instruction, 230, 255, 0.65, WHITE, 1)
    elif phase == "offline":
        alpha_rect(ui, 0, 0, SCREEN_W, SCREEN_H, DARK, 0.60)
        put_text(ui, "ML ENGINE OFFLINE", 300, 220, 1.0, RED, 2)
        put_text(ui, instruction, 245, 270, 0.62, WHITE, 1)

    draw_face_box(ui, state.get("face_box"), phase, float(state.get("progress", 0.0) or 0.0))

    alpha_rect(ui, 0, SCREEN_H - 42, SCREEN_W, SCREEN_H, DARK, 0.78)
    put_text(
        ui,
        f"SmartVenue  |  phase: {phase}  |  conf: {confidence:.2f}",
        20,
        SCREEN_H - 14,
        0.52,
        WHITE,
        1,
    )
    return ui


def main() -> None:
    cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(WINDOW_NAME, SCREEN_W, SCREEN_H)

    while True:
        state = fetch_state()
        frame = fit_frame(fetch_frame())
        ui = render(frame, state)
        cv2.imshow(WINDOW_NAME, ui)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()

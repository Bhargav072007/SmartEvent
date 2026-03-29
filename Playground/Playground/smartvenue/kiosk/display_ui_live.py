from __future__ import annotations

import math
import time
from typing import Any

import cv2
import numpy as np
import requests

from screens import alignment, denied, idle, verified, verifying
from utils import draw_helpers as dh
from utils import theme


ML_BASE_URL = "http://127.0.0.1:5050"
WINDOW_NAME = "SmartVenue Kiosk Live"
DISPLAY_SIZE = theme.DISPLAY_SIZE
POLL_INTERVAL = 0.08
RESULT_HOLD_SECONDS = 3.0
REQUEST_TIMEOUT = 0.75
VIDEO_PANEL = (88, 108, 304, 204)
VIDEO_PANEL_MIN_SECONDS = 1.2
DECISION_TIMEOUT_SECONDS = 1.0
TERMINAL_HOLD_BY_STATUS = {
    "verified": 3.0,
    "denied": 1.4,
    "spoof": 1.8,
}


def _set_live_copy(result: dict[str, Any]) -> None:
    fan_name = str(result.get("fan_name") or "Fan")
    gate = str(result.get("gate") or "Gate C")
    seat = str(result.get("seat_section") or "--")

    welcome = f"Welcome, {fan_name}!"
    ticket_value = f"Section {seat} | SmartVenue Entry"
    parking = "Routing active | Proceed to assigned entry"

    theme.WELCOME_NAME = welcome
    theme.TICKET_GATE = gate
    theme.TICKET_VALUE = ticket_value
    theme.TICKET_PARKING = parking

    dh.WELCOME_NAME = welcome
    dh.TICKET_GATE = gate
    dh.TICKET_VALUE = ticket_value
    dh.TICKET_PARKING = parking


def _fetch_result() -> dict[str, Any] | None:
    try:
        response = requests.get(f"{ML_BASE_URL}/recognition", timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        return response.json()
    except Exception:
        return None


def _fetch_frame() -> np.ndarray | None:
    try:
        response = requests.get(f"{ML_BASE_URL}/frame.jpg", timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        arr = np.frombuffer(response.content, dtype=np.uint8)
        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        return frame
    except Exception:
        return None


def _fit_frame_to_square(frame: np.ndarray) -> np.ndarray:
    h, w = frame.shape[:2]
    if h <= 0 or w <= 0:
        fallback = np.zeros((DISPLAY_SIZE, DISPLAY_SIZE, 3), dtype=np.uint8)
        fallback[:] = theme.BG_PRIMARY
        return fallback

    scale = max(DISPLAY_SIZE / w, DISPLAY_SIZE / h)
    resized = cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_LINEAR)
    rh, rw = resized.shape[:2]
    x0 = max(0, (rw - DISPLAY_SIZE) // 2)
    y0 = max(0, (rh - DISPLAY_SIZE) // 2)
    return resized[y0:y0 + DISPLAY_SIZE, x0:x0 + DISPLAY_SIZE]


def _fit_frame_to_rect(frame: np.ndarray, width: int, height: int) -> np.ndarray:
    h, w = frame.shape[:2]
    if h <= 0 or w <= 0:
        fallback = np.zeros((height, width, 3), dtype=np.uint8)
        fallback[:] = theme.BG_PRIMARY
        return fallback

    scale = max(width / w, height / h)
    resized = cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_LINEAR)
    rh, rw = resized.shape[:2]
    x0 = max(0, (rw - width) // 2)
    y0 = max(0, (rh - height) // 2)
    return resized[y0:y0 + height, x0:x0 + width]


def _compose_live_screen(screen: np.ndarray, frame: np.ndarray | None, state: str) -> np.ndarray:
    if frame is None:
        return screen

    square = _fit_frame_to_square(frame)
    dark_overlay = square.copy()
    dark_overlay[:] = theme.BG_PRIMARY
    base = cv2.addWeighted(dark_overlay, 0.46, square, 0.54, 0.0)

    if state in {"verified", "denied", "spoof"}:
        alpha = 0.82
    elif state in {"scanning", "processing", "medium"}:
        alpha = 0.68
    else:
        alpha = 0.78

    return cv2.addWeighted(screen, alpha, base, 1.0 - alpha, 0.0)


def _compose_video_panel(screen: np.ndarray, frame: np.ndarray | None) -> np.ndarray:
    if frame is None:
        return screen

    x, y, w, h = VIDEO_PANEL
    panel_frame = _fit_frame_to_rect(frame, w, h)
    panel_frame = cv2.addWeighted(
        np.full_like(panel_frame, theme.BG_PRIMARY),
        0.18,
        panel_frame,
        0.82,
        0.0,
    )

    overlay = screen.copy()
    dh.rounded_rect(overlay, x, y, w, h, 28, theme.BG_CARD, -1)
    screen = cv2.addWeighted(overlay, 0.35, screen, 0.65, 0.0)
    screen[y:y + h, x:x + w] = panel_frame
    dh.rounded_rect(screen, x, y, w, h, 28, theme.BORDER, 2)
    return screen


def _draw_face_box(canvas: np.ndarray, face_box: Any) -> None:
    if not isinstance(face_box, list) or len(face_box) != 4:
        return

    x, y, w, h = [int(v) for v in face_box]
    sx = DISPLAY_SIZE / 640.0
    sy = DISPLAY_SIZE / 480.0
    x = int(x * sx)
    y = int(y * sy)
    w = int(w * sx)
    h = int(h * sy)

    x = max(0, min(DISPLAY_SIZE - 1, x))
    y = max(0, min(DISPLAY_SIZE - 1, y))
    w = max(1, min(DISPLAY_SIZE - x, w))
    h = max(1, min(DISPLAY_SIZE - y, h))

    px, py, pw, ph = VIDEO_PANEL
    x = int(px + x * (pw / DISPLAY_SIZE))
    y = int(py + y * (ph / DISPLAY_SIZE))
    w = int(w * (pw / DISPLAY_SIZE))
    h = int(h * (ph / DISPLAY_SIZE))

    overlay = canvas.copy()
    cv2.rectangle(overlay, (x, y), (x + w, y + h), theme.ACCENT_ORANGE, 2, cv2.LINE_AA)
    canvas[:] = cv2.addWeighted(overlay, 0.45, canvas, 0.55, 0.0)


def _render_offline(t: float):
    canvas = dh.make_base_canvas()
    pulse = (math.sin(t * 2.5) + 1.0) / 2.0
    dh.draw_brand_header(canvas, pulse)
    dh.center_text(canvas, "Recognition engine offline", 240, 228, 0.82, theme.TEXT_PRIMARY, 2)
    dh.center_text(canvas, "Waiting for SmartVenue ML service", 240, 268, 0.56, theme.TEXT_SECONDARY, 1)
    dh.center_text(canvas, "Start ml-service.py to continue", 240, 440, 0.48, theme.TEXT_SECONDARY, 1)
    return canvas


def _render_state(result: dict[str, Any], live_frame: np.ndarray | None, now: float):
    _set_live_copy(result)

    status = str(result.get("status") or "idle")
    phase = str(result.get("ui_phase") or "welcome")
    progress = float(result.get("progress") or 0.0)

    if status == "verified":
        return verified.render(now)

    if status in {"denied", "spoof"}:
        screen = denied.render(now)
        return _compose_live_screen(screen, live_frame, status)

    if phase in {"welcome", "idle"}:
        return idle.render(now)

    if phase in {"approach", "scanning", "hold_still"}:
        aligned = bool(result.get("face_box")) and progress >= 0.45
        screen = alignment.render(aligned, now)
        screen = _compose_video_panel(screen, live_frame)
        _draw_face_box(screen, result.get("face_box"))
        return screen

    screen = verifying.render(now)
    screen = _compose_video_panel(screen, live_frame)
    _draw_face_box(screen, result.get("face_box"))
    return screen


def _render_panel_phase(result: dict[str, Any], live_frame: np.ndarray | None, now: float):
    progress = float(result.get("progress") or 0.0)
    aligned = bool(result.get("face_box")) and progress >= 0.45
    screen = alignment.render(aligned, now)
    screen = _compose_video_panel(screen, live_frame)
    _draw_face_box(screen, result.get("face_box"))
    return screen


def main() -> None:
    cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(WINDOW_NAME, DISPLAY_SIZE, DISPLAY_SIZE)

    last_poll = 0.0
    last_result: dict[str, Any] | None = None
    last_terminal_result: dict[str, Any] | None = None
    terminal_until = 0.0
    panel_hold_until = 0.0
    face_visible_since = 0.0
    forced_denied_active = False

    while True:
        now = time.time()
        live_frame = None

        if now - last_poll >= POLL_INTERVAL:
            fetched = _fetch_result()
            last_poll = now
            if fetched is not None:
                status = str(fetched.get("status") or "")
                phase = str(fetched.get("ui_phase") or "welcome")
                face_present = bool(fetched.get("face_box"))

                if face_present:
                    if face_visible_since == 0.0:
                        face_visible_since = now
                        panel_hold_until = now + VIDEO_PANEL_MIN_SECONDS
                else:
                    face_visible_since = 0.0
                    panel_hold_until = 0.0
                    forced_denied_active = False
                    last_terminal_result = None
                    terminal_until = 0.0

                entering_live_panel = phase in {"approach", "scanning", "hold_still", "processing", "medium"} or face_present
                if entering_live_panel and panel_hold_until == 0.0:
                    panel_hold_until = now + VIDEO_PANEL_MIN_SECONDS

                if status in {"verified", "denied", "spoof"}:
                    last_terminal_result = fetched
                    terminal_until = now + TERMINAL_HOLD_BY_STATUS.get(status, RESULT_HOLD_SECONDS)
                    forced_denied_active = False
                elif phase in {"welcome", "idle", "approach", "scanning", "hold_still", "processing", "medium"}:
                    if not forced_denied_active:
                        last_terminal_result = None
                        terminal_until = 0.0
                last_result = fetched

        active = last_result
        if forced_denied_active and last_result is not None:
            active = dict(last_result)
            active["status"] = "denied"
            active["ui_phase"] = "denied"
        elif last_terminal_result is not None and now < terminal_until and now >= panel_hold_until:
            active = last_terminal_result
        elif now >= terminal_until:
            last_terminal_result = None

        if active is not None:
            live_frame = _fetch_frame()

        if (
            active is not None
            and last_terminal_result is None
            and not forced_denied_active
            and face_visible_since > 0.0
            and now - face_visible_since >= DECISION_TIMEOUT_SECONDS
        ):
            forced_denied_active = True
            active = dict(active)
            active["status"] = "denied"
            active["ui_phase"] = "denied"

        if active is None:
            ui_frame = _render_offline(now)
        elif now < panel_hold_until and str(active.get("ui_phase") or "welcome") not in {"welcome", "idle"}:
            ui_frame = _render_panel_phase(active, live_frame, now)
        else:
            ui_frame = _render_state(active, live_frame, now)
        cv2.imshow(WINDOW_NAME, ui_frame)

        key = cv2.waitKey(1) & 0xFF
        if key in (27, ord("q"), ord("Q")):
            break

        time.sleep(0.01)

    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()

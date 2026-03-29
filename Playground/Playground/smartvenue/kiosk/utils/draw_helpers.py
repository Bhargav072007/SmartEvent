from __future__ import annotations

import math
from typing import Tuple

import cv2
import numpy as np

from .theme import (
    ACCENT_ORANGE,
    BG_CARD,
    BG_PRIMARY,
    BLACK,
    BORDER,
    DANGER,
    DISPLAY_SIZE,
    FONT_SCALE_BODY,
    FONT_SCALE_CARD_LABEL,
    FONT_SCALE_CARD_VALUE,
    FONT_SCALE_EYEBROW,
    GLOW_ORANGE,
    ICON_NAVY,
    RING_IDLE,
    SPINNER_TRACK,
    SUBTITLE,
    SUCCESS,
    TEXT_PRIMARY,
    TEXT_SECONDARY,
    TICKET_GATE,
    TICKET_LABEL,
    TICKET_PARKING,
    TICKET_VALUE,
    TITLE,
)


FONT = cv2.FONT_HERSHEY_DUPLEX


def make_base_canvas() -> np.ndarray:
    canvas = np.zeros((DISPLAY_SIZE, DISPLAY_SIZE, 3), dtype=np.uint8)
    canvas[:] = BG_PRIMARY
    draw_soft_glow(canvas, (96, 96), 92, GLOW_ORANGE, 0.08)
    draw_soft_glow(canvas, (390, 90), 68, BORDER, 0.10)
    draw_soft_glow(canvas, (400, 404), 84, (58, 31, 14), 0.05)
    return canvas


def overlay_alpha(base: np.ndarray, overlay: np.ndarray, alpha: float) -> np.ndarray:
    alpha = max(0.0, min(1.0, alpha))
    return cv2.addWeighted(overlay, alpha, base, 1.0 - alpha, 0.0)


def center_text(canvas: np.ndarray, text: str, center_x: int, baseline_y: int, scale: float, color, thickness: int) -> None:
    (w, _), _ = cv2.getTextSize(text, FONT, scale, thickness)
    cv2.putText(canvas, text, (center_x - w // 2, baseline_y), FONT, scale, color, thickness, cv2.LINE_AA)


def left_text(canvas: np.ndarray, text: str, x: int, baseline_y: int, scale: float, color, thickness: int) -> None:
    cv2.putText(canvas, text, (x, baseline_y), FONT, scale, color, thickness, cv2.LINE_AA)


def rounded_rect(canvas: np.ndarray, x: int, y: int, w: int, h: int, radius: int, color, thickness: int = -1) -> None:
    if thickness < 0:
        cv2.rectangle(canvas, (x + radius, y), (x + w - radius, y + h), color, -1, cv2.LINE_AA)
        cv2.rectangle(canvas, (x, y + radius), (x + w, y + h - radius), color, -1, cv2.LINE_AA)
        for cx, cy in (
            (x + radius, y + radius),
            (x + w - radius, y + radius),
            (x + radius, y + h - radius),
            (x + w - radius, y + h - radius),
        ):
            cv2.circle(canvas, (cx, cy), radius, color, -1, cv2.LINE_AA)
        return

    cv2.line(canvas, (x + radius, y), (x + w - radius, y), color, thickness, cv2.LINE_AA)
    cv2.line(canvas, (x + radius, y + h), (x + w - radius, y + h), color, thickness, cv2.LINE_AA)
    cv2.line(canvas, (x, y + radius), (x, y + h - radius), color, thickness, cv2.LINE_AA)
    cv2.line(canvas, (x + w, y + radius), (x + w, y + h - radius), color, thickness, cv2.LINE_AA)
    cv2.ellipse(canvas, (x + radius, y + radius), (radius, radius), 0, 180, 270, color, thickness, cv2.LINE_AA)
    cv2.ellipse(canvas, (x + w - radius, y + radius), (radius, radius), 0, 270, 360, color, thickness, cv2.LINE_AA)
    cv2.ellipse(canvas, (x + radius, y + h - radius), (radius, radius), 0, 90, 180, color, thickness, cv2.LINE_AA)
    cv2.ellipse(canvas, (x + w - radius, y + h - radius), (radius, radius), 0, 0, 90, color, thickness, cv2.LINE_AA)


def draw_soft_glow(canvas: np.ndarray, center: Tuple[int, int], radius: int, color, alpha: float) -> None:
    overlay = canvas.copy()
    cv2.circle(overlay, center, radius, color, -1, cv2.LINE_AA)
    canvas[:] = overlay_alpha(canvas, overlay, alpha)


def draw_logo_mark(canvas: np.ndarray, center: Tuple[int, int], pulse: float = 0.0) -> None:
    cx, cy = center
    if pulse > 0.0:
        overlay = canvas.copy()
        ring_r = int(22 + pulse * 18)
        cv2.circle(overlay, (cx, cy), ring_r, ACCENT_ORANGE, 2, cv2.LINE_AA)
        canvas[:] = overlay_alpha(canvas, overlay, max(0.0, 0.26 - pulse * 0.18))

    cv2.circle(canvas, (cx, cy), 16, ACCENT_ORANGE, -1, cv2.LINE_AA)
    cv2.circle(canvas, (cx, cy - 3), 8, BG_PRIMARY, -1, cv2.LINE_AA)
    cv2.ellipse(canvas, (cx + 4, cy + 1), (11, 8), 0, 205, 360, BG_PRIMARY, -1, cv2.LINE_AA)
    cv2.rectangle(canvas, (cx - 13, cy + 10), (cx + 13, cy + 17), ACCENT_ORANGE, -1, cv2.LINE_AA)


def draw_brand_header(canvas: np.ndarray, pulse: float = 0.0) -> None:
    draw_logo_mark(canvas, (240, 42), pulse)
    center_text(canvas, TITLE, 240, 70, 0.62, TEXT_PRIMARY, 2)
    center_text(canvas, SUBTITLE, 240, 92, FONT_SCALE_EYEBROW, TEXT_SECONDARY, 1)


def draw_alignment_ring(canvas: np.ndarray, aligned: bool, t: float) -> None:
    center = (240, 210)
    radius = 84
    color = SUCCESS if aligned else RING_IDLE
    thickness = 8
    segments = [(20, 68), (112, 160), (200, 248), (292, 340)]
    for start, end in segments:
        cv2.ellipse(canvas, center, (radius, radius), 0, start, end, color, thickness, cv2.LINE_AA)

    if aligned:
        overlay = canvas.copy()
        cv2.circle(overlay, center, radius + int(8 + 4 * math.sin(t * 2.8)), SUCCESS, 2, cv2.LINE_AA)
        canvas[:] = overlay_alpha(canvas, overlay, 0.18)


def draw_face_oval(canvas: np.ndarray) -> None:
    cv2.ellipse(canvas, (240, 190), (72, 92), 0, 0, 360, BORDER, 2, cv2.LINE_AA)


def draw_scanning_line(canvas: np.ndarray, t: float) -> None:
    y = int(105 + ((math.sin(t * 2.0) + 1.0) / 2.0) * 170)
    overlay = canvas.copy()
    cv2.line(overlay, (178, y), (302, y), ACCENT_ORANGE, 3, cv2.LINE_AA)
    cv2.rectangle(overlay, (178, y - 4), (302, y + 4), ACCENT_ORANGE, -1, cv2.LINE_AA)
    canvas[:] = overlay_alpha(canvas, overlay, 0.18)


def draw_spinner(canvas: np.ndarray, t: float) -> None:
    center = (388, 90)
    cv2.ellipse(canvas, center, (18, 18), 0, 0, 360, SPINNER_TRACK, 4, cv2.LINE_AA)
    start = int((t * 220) % 360)
    cv2.ellipse(canvas, center, (18, 18), 0, start, start + 110, ACCENT_ORANGE, 4, cv2.LINE_AA)


def draw_check_badge(canvas: np.ndarray, center: Tuple[int, int]) -> None:
    cx, cy = center
    draw_soft_glow(canvas, center, 46, SUCCESS, 0.16)
    cv2.circle(canvas, center, 34, SUCCESS, -1, cv2.LINE_AA)
    cv2.line(canvas, (cx - 14, cy), (cx - 2, cy + 12), TEXT_PRIMARY, 5, cv2.LINE_AA)
    cv2.line(canvas, (cx - 2, cy + 12), (cx + 18, cy - 8), TEXT_PRIMARY, 5, cv2.LINE_AA)


def draw_warning_badge(canvas: np.ndarray, center: Tuple[int, int]) -> None:
    cx, cy = center
    pts = np.array([[cx, cy - 28], [cx - 31, cy + 24], [cx + 31, cy + 24]], dtype=np.int32)
    cv2.fillConvexPoly(canvas, pts, ACCENT_ORANGE, cv2.LINE_AA)
    cv2.line(canvas, (cx, cy - 8), (cx, cy + 8), TEXT_PRIMARY, 4, cv2.LINE_AA)
    cv2.circle(canvas, (cx, cy + 16), 3, TEXT_PRIMARY, -1, cv2.LINE_AA)


def draw_ticket_card(canvas: np.ndarray) -> None:
    x, y, w, h = 40, 244, 400, 118
    rounded_rect(canvas, x, y, w, h, 22, BG_CARD, -1)
    rounded_rect(canvas, x, y, w, h, 22, BORDER, 1)
    left_text(canvas, TICKET_LABEL, x + 20, y + 28, FONT_SCALE_CARD_LABEL, TEXT_SECONDARY, 1)
    left_text(canvas, TICKET_VALUE, x + 20, y + 60, FONT_SCALE_CARD_VALUE, TEXT_PRIMARY, 2)
    left_text(canvas, TICKET_GATE, x + 20, y + 86, 0.58, ACCENT_ORANGE, 2)
    cv2.line(canvas, (x + 20, y + 94), (x + w - 20, y + 94), BORDER, 1, cv2.LINE_AA)
    left_text(canvas, TICKET_PARKING, x + 20, y + 112, FONT_SCALE_CARD_LABEL, TEXT_SECONDARY, 1)


def draw_success_pill(canvas: np.ndarray, x: int, y: int, w: int, h: int) -> None:
    rounded_rect(canvas, x, y, w, h, 18, SUCCESS, -1)
    center_text(canvas, "✓ Entry Granted", x + w // 2, y + 24, 0.52, TEXT_PRIMARY, 1)


def draw_help_card(canvas: np.ndarray) -> None:
    x, y, w, h = 40, 258, 400, 88
    rounded_rect(canvas, x, y, w, h, 22, BG_CARD, -1)
    rounded_rect(canvas, x, y, w, h, 22, BORDER, 1)
    center_text(canvas, "Think this is a mistake?", 240, y + 32, 0.52, TEXT_SECONDARY, 1)
    center_text(canvas, "Visit the information desk for assistance", 240, y + 60, 0.52, TEXT_PRIMARY, 1)


def fade_black(canvas: np.ndarray, alpha: float) -> np.ndarray:
    overlay = np.zeros_like(canvas)
    overlay[:] = BLACK
    return overlay_alpha(canvas, overlay, alpha)

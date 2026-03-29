from __future__ import annotations

from utils import draw_helpers as dh
from utils.theme import ACCENT_ORANGE, SUCCESS, TEXT_PRIMARY, WELCOME_NAME


def render(t: float):
    canvas = dh.make_base_canvas()
    dh.draw_check_badge(canvas, (240, 94))
    dh.center_text(canvas, "Identity Verified", 240, 188, 0.95, TEXT_PRIMARY, 2)
    dh.center_text(canvas, WELCOME_NAME, 240, 226, 0.62, ACCENT_ORANGE, 2)
    dh.draw_ticket_card(canvas)
    dh.draw_success_pill(canvas, 145, 392, 190, 38)
    return canvas

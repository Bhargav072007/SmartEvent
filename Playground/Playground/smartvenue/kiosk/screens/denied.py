from __future__ import annotations

from utils import draw_helpers as dh
from utils.theme import TEXT_PRIMARY, TEXT_SECONDARY


def render(t: float):
    canvas = dh.make_base_canvas()
    dh.draw_warning_badge(canvas, (240, 104))
    dh.center_text(canvas, "Face Not Recognized", 240, 188, 0.88, TEXT_PRIMARY, 2)
    dh.center_text(canvas, "You are not registered in our system", 240, 226, 0.52, TEXT_SECONDARY, 1)
    dh.draw_help_card(canvas)
    dh.center_text(canvas, "Gate staff can help resolve your entry", 240, 448, 0.50, TEXT_SECONDARY, 1)
    return canvas

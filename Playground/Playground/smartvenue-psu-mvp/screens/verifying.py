from __future__ import annotations

from utils import draw_helpers as dh
from utils.theme import TEXT_PRIMARY, TEXT_SECONDARY


def render(t: float):
    canvas = dh.make_base_canvas()
    dh.draw_face_oval(canvas)
    dh.draw_scanning_line(canvas, t)
    dh.draw_spinner(canvas, t)
    dh.center_text(canvas, "Verifying identity...", 240, 386, 0.72, TEXT_PRIMARY, 2)
    dh.center_text(canvas, "This only takes a second", 240, 444, 0.50, TEXT_SECONDARY, 1)
    return canvas

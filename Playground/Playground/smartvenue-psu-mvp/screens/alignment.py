from __future__ import annotations

from utils import draw_helpers as dh
from utils.theme import SUCCESS, TEXT_PRIMARY, TEXT_SECONDARY


def render(aligned: bool, t: float):
    canvas = dh.make_base_canvas()
    dh.center_text(canvas, "Position Your Face", 240, 84, 0.68, TEXT_PRIMARY, 2)
    dh.draw_alignment_ring(canvas, aligned, t)

    if aligned:
        dh.center_text(canvas, "Hold still...", 240, 388, 0.72, SUCCESS, 2)
    else:
        dh.center_text(canvas, "Align your face within the ring", 240, 388, 0.54, TEXT_SECONDARY, 1)

    dh.center_text(canvas, "Keep your face centered and look straight ahead", 240, 446, 0.50, TEXT_SECONDARY, 1)
    return canvas

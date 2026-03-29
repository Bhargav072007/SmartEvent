from __future__ import annotations

import math

from utils import draw_helpers as dh
from utils.theme import TEXT_PRIMARY, TEXT_SECONDARY


def render(t: float):
    canvas = dh.make_base_canvas()
    pulse = (math.sin(t * 2.1) + 1.0) / 2.0

    dh.draw_brand_header(canvas, pulse)
    dh.center_text(canvas, "Welcome", 240, 248, 0.98, TEXT_PRIMARY, 2)
    dh.center_text(canvas, "Step up to scan your face", 240, 286, 0.60, TEXT_SECONDARY, 1)
    dh.center_text(canvas, "Powered by Face Recognition", 240, 450, 0.50, TEXT_SECONDARY, 1)
    return canvas

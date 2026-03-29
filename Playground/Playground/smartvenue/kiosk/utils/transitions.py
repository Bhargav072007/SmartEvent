from __future__ import annotations

from typing import Callable, Dict, List, Tuple

import numpy as np

from .draw_helpers import fade_black
from .theme import TRANSITION_FRAMES


Renderer = Callable[[float], np.ndarray]


class FadeTransitionController:
    def __init__(self, renderers: Dict[str, Renderer], sequence: List[Tuple[str, float]]) -> None:
        self.renderers = renderers
        self.sequence = sequence
        self.index = 0
        self.current_screen = sequence[0][0]
        self.next_screen = self.current_screen
        self.started_at = 0.0
        self.transition_frame = TRANSITION_FRAMES
        self.in_transition = False

    def force(self, screen: str, now: float) -> None:
        self.current_screen = screen
        self.next_screen = screen
        self.started_at = now
        self.in_transition = False
        self.transition_frame = TRANSITION_FRAMES

    def update(self, now: float) -> None:
        if self.started_at == 0.0:
            self.started_at = now

        if self.in_transition:
            self.transition_frame += 1
            if self.transition_frame >= TRANSITION_FRAMES:
                self.in_transition = False
                self.current_screen = self.next_screen
                self.started_at = now
            return

        duration = self.sequence[self.index][1]
        if now - self.started_at >= duration:
            self.index = (self.index + 1) % len(self.sequence)
            self.next_screen = self.sequence[self.index][0]
            self.transition_frame = 0
            self.in_transition = True

    def current_frame(self, now: float) -> np.ndarray:
        base = self.renderers[self.current_screen](now)
        if not self.in_transition:
            return base

        half = max(1, TRANSITION_FRAMES // 2)
        if self.transition_frame < half:
            alpha = self.transition_frame / half
            return fade_black(base, alpha)

        next_frame = self.renderers[self.next_screen](now)
        alpha = 1.0 - ((self.transition_frame - half) / half)
        return fade_black(next_frame, max(0.0, min(1.0, alpha)))

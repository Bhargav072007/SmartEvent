from __future__ import annotations

import time

import cv2

from screens import alignment, denied, idle, verified, verifying
from utils.theme import DISPLAY_SIZE, FRAME_TIME, KEY_TO_SCREEN, WINDOW_NAME
from utils.transitions import FadeTransitionController


SCREENS = {
    "idle": idle.render,
    "align": lambda t: alignment.render(False, t),
    "align_ok": lambda t: alignment.render(True, t),
    "verify": verifying.render,
    "verified": verified.render,
    "denied": denied.render,
}

DEMO_SEQUENCE = [
    ("idle", 3.0),
    ("align", 2.0),
    ("align_ok", 1.5),
    ("verify", 2.0),
    ("verified", 4.0),
    ("denied", 4.0),
]


def main() -> None:
    cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(WINDOW_NAME, DISPLAY_SIZE, DISPLAY_SIZE)

    controller = FadeTransitionController(SCREENS, DEMO_SEQUENCE)

    while True:
        started = time.time()
        controller.update(started)
        cv2.imshow(WINDOW_NAME, controller.current_frame(started))

        key = cv2.waitKey(1) & 0xFF
        if key in (27, ord("q"), ord("Q")):
            break
        if key in KEY_TO_SCREEN:
            controller.force(KEY_TO_SCREEN[key], started)

        remaining = FRAME_TIME - (time.time() - started)
        if remaining > 0:
            time.sleep(remaining)

    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()

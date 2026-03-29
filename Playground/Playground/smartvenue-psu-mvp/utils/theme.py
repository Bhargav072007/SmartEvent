from __future__ import annotations


DISPLAY_SIZE = 480
WINDOW_NAME = "SmartVenue Kiosk"
FPS = 30
FRAME_TIME = 1.0 / FPS
TRANSITION_FRAMES = 12

BG_PRIMARY = (40, 22, 10)        # #0A1628
BG_CARD = (60, 31, 13)           # #0D1F3C
ACCENT_ORANGE = (34, 119, 232)   # #E87722
TEXT_PRIMARY = (255, 255, 255)
TEXT_SECONDARY = (181, 155, 138) # #8A9BB5
SUCCESS = (78, 197, 34)          # #22C55E
DANGER = (68, 68, 239)           # #EF4444
BORDER = (78, 47, 26)            # #1A2F4E

BLACK = (0, 0, 0)
RING_IDLE = TEXT_SECONDARY
SPINNER_TRACK = (58, 41, 20)
ICON_NAVY = (54, 32, 14)
GLOW_ORANGE = (26, 76, 160)

TITLE = "SMARTVENUE"
SUBTITLE = "PSU · Beaver Stadium"

TICKET_LABEL = "YOUR TICKET"
TICKET_VALUE = "SW-110 · Row 3 · Seat 22"
TICKET_GATE = "Gate C"
TICKET_PARKING = "Parking: Lot C"
WELCOME_NAME = "Welcome, Casey!"

FONT_SCALE_EYEBROW = 0.5
FONT_SCALE_HEADING = 0.98
FONT_SCALE_SUBHEADING = 0.60
FONT_SCALE_BODY = 0.50
FONT_SCALE_CARD_LABEL = 0.45
FONT_SCALE_CARD_VALUE = 0.70

KEY_TO_SCREEN = {
    ord("1"): "idle",
    ord("2"): "align",
    ord("3"): "align_ok",
    ord("4"): "verify",
    ord("5"): "verified",
    ord("6"): "denied",
}

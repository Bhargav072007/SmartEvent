"""Launch the SmartVenue camera detector pinned to Gate B."""

from __future__ import annotations

import os


os.environ.setdefault("SMARTVENUE_GATE", "B")
os.environ.setdefault("SMARTVENUE_CAMERA_ID", "cam_b_01")
os.environ.setdefault("SMARTVENUE_ROUTING_ENGINE_URL", "http://localhost:8000/api/camera/update")

# Importing the shim starts the existing camera runtime.
import camera_engine  # noqa: F401,E402

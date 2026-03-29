"""Import shim for Camera-engine.py."""

from __future__ import annotations

import importlib.util
from pathlib import Path


_SOURCE = Path(__file__).with_name("Camera-engine.py")
_SPEC = importlib.util.spec_from_file_location("smartvenue_camera_engine_runtime", _SOURCE)
if _SPEC is None or _SPEC.loader is None:  # pragma: no cover
    raise RuntimeError(f"Could not load camera engine from {_SOURCE}")

_MODULE = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(_MODULE)


"""
Import shim for register-face.py
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path


_TARGET = Path(__file__).with_name("register-face.py")
_SPEC = importlib.util.spec_from_file_location("smartvenue_kiosk_register_face", _TARGET)
if _SPEC is None or _SPEC.loader is None:
    raise ImportError(f"Could not load register-face.py from {_TARGET}")

_MODULE = importlib.util.module_from_spec(_SPEC)
sys.modules[_SPEC.name] = _MODULE
_SPEC.loader.exec_module(_MODULE)

for _name in dir(_MODULE):
    if _name.startswith("__"):
        continue
    globals()[_name] = getattr(_MODULE, _name)

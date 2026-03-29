from __future__ import annotations

import os
from pathlib import Path


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

API_URL = os.getenv("API_URL", "http://127.0.0.1:8000")
GATE_ID = os.getenv("GATE_ID", "Gate A")
DEVICE_ID = os.getenv("DEVICE_ID", "pi-gate-a-01")
READER_MODE = os.getenv("READER_MODE", "mock")
DISPLAY_MODE = os.getenv("DISPLAY_MODE", "console")
POLL_INTERVAL_SEC = float(os.getenv("POLL_INTERVAL_SEC", "0.3"))
DASHBOARD_PORT = int(os.getenv("DASHBOARD_PORT", "8090"))

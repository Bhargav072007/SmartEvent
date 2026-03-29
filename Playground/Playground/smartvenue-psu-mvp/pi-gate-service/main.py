from __future__ import annotations

import json
import threading
import time
from datetime import datetime
from pathlib import Path

import requests

from config import API_URL, DASHBOARD_PORT, DEVICE_ID, DISPLAY_MODE, GATE_ID, POLL_INTERVAL_SEC, READER_MODE
from dashboard_server import run_dashboard_server
from display import build_display
from reader import build_reader


BASE_DIR = Path(__file__).resolve().parent
LOG_FILE = BASE_DIR / "scan_history.log"
STATE_FILE = BASE_DIR / "runtime" / "gate_state.json"


def log_scan(payload: dict) -> None:
    with LOG_FILE.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload) + "\n")


def write_state(payload: dict) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def idle_state() -> dict:
    return {
        "gate_id": GATE_ID,
        "device_id": DEVICE_ID,
        "status": "READY",
        "display_text": "Ready to Tap",
        "message": "Hold phone or NFC token near the reader.",
        "last_token": None,
        "last_result": None,
        "last_scanned_at": None,
        "scan_count": scan_count(),
    }


def scan_count() -> int:
    if not LOG_FILE.exists():
        return 0
    return sum(1 for _ in LOG_FILE.open("r", encoding="utf-8"))


def validate_scan(token: str) -> dict:
    try:
        response = requests.post(
            f"{API_URL}/tickets/validate-scan",
            json={"token": token, "gate_id": GATE_ID, "device_id": DEVICE_ID},
            timeout=5,
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException:
        return {
            "result": "OFFLINE_MODE_ERROR",
            "message": "Backend unavailable. Check local network or API.",
            "ticket_id": None,
            "gate_id": GATE_ID,
            "scanned_at": datetime.now().replace(microsecond=0).isoformat(),
            "allowed": False,
            "display_text": "Offline Mode Error",
        }


def main() -> None:
    write_state(idle_state())
    threading.Thread(target=run_dashboard_server, args=(STATE_FILE, DASHBOARD_PORT), daemon=True).start()
    reader = build_reader(READER_MODE)
    display = build_display(DISPLAY_MODE)
    print(f"SmartVenue PSU gate service running for {GATE_ID} ({DEVICE_ID})")
    print(f"Backend: {API_URL}")
    print(f"Reader mode: {READER_MODE} | Display mode: {DISPLAY_MODE}")
    print(f"Dashboard: http://127.0.0.1:{DASHBOARD_PORT}")

    while True:
        display.show_idle(GATE_ID)
        write_state(idle_state())
        token = reader.read_token()
        if not token:
            time.sleep(POLL_INTERVAL_SEC)
            continue
        result = validate_scan(token)
        display.show_result(GATE_ID, result["result"], result["display_text"])
        log_scan({"token": token, **result})
        write_state(
            {
                "gate_id": GATE_ID,
                "device_id": DEVICE_ID,
                "status": result["result"],
                "display_text": result["display_text"],
                "message": result["message"],
                "last_token": token,
                "last_result": result["result"],
                "last_scanned_at": result["scanned_at"],
                "scan_count": scan_count(),
            }
        )
        time.sleep(POLL_INTERVAL_SEC)


if __name__ == "__main__":
    main()

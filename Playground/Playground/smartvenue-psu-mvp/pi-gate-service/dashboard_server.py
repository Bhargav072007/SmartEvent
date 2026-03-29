from __future__ import annotations

import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


def run_dashboard_server(state_file: Path, port: int) -> None:
    ui_dir = Path(__file__).resolve().parent / "ui"

    class DashboardHandler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(ui_dir), **kwargs)

        def do_GET(self):
            if self.path == "/api/state":
                payload = {"status": "READY", "display_text": "Ready to Tap"}
                if state_file.exists():
                    payload = json.loads(state_file.read_text(encoding="utf-8"))
                encoded = json.dumps(payload).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(encoded)))
                self.end_headers()
                self.wfile.write(encoded)
                return
            if self.path == "/":
                self.path = "/index.html"
            return super().do_GET()

    server = ThreadingHTTPServer(("127.0.0.1", port), DashboardHandler)
    server.serve_forever()

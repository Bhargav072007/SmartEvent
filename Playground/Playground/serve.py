#!/usr/bin/env python3

from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os


HOST = "127.0.0.1"
PORT = 8000


def main() -> None:
    os.chdir(Path(__file__).resolve().parent)
    server = ThreadingHTTPServer((HOST, PORT), SimpleHTTPRequestHandler)
    print(f"SmartVenue PSU running at http://{HOST}:{PORT}")
    print("Press Ctrl+C to stop.")
    try:
      server.serve_forever()
    except KeyboardInterrupt:
      print("\nServer stopped.")
    finally:
      server.server_close()


if __name__ == "__main__":
    main()

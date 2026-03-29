# Architecture Overview

## System shape

SmartVenue PSU uses three runtime parts:

1. `mobile-app`
   The fan-facing Expo app that shows the game pass and polls for validation results.

2. `backend`
   The FastAPI service that owns ticket records, validates scans, tracks scan history, and exposes simple REST APIs.

3. `pi-gate-service`
   The Raspberry Pi service that reads NFC token input, calls the backend, and updates the SenseCAP Indicator D1 display state.

## Request flow

```text
Mobile App -> shows ticket token and polls ticket status
Phone tap -> NFC reader -> Pi gate service
Pi gate service -> POST /tickets/validate-scan
Backend -> validates token + ticket state -> stores scan log
Backend -> returns VERIFIED / INVALID / RETRY / ALREADY_USED / EXPIRED
Pi gate service -> updates display
Mobile App -> polls GET /tickets/status/:ticketId -> updates fan UI
```

## Why this is hackathon-friendly

- FastAPI keeps backend setup simple.
- SQLite avoids extra infra.
- The Pi service uses an adapter pattern so you can start in mock mode and later attach the real NFC implementation.
- The mobile app uses a lightweight screen-state flow instead of heavy navigation setup.
- Polling keeps app/device sync believable without needing WebSocket infra.

## Components

### Backend

- SQLite DB tables:
  - `users`
  - `games`
  - `tickets`
  - `scan_logs`
- Seeds demo users and ticket scenarios on startup.
- Handles all scan validation rules centrally.

### Pi Gate Service

- `reader.py`
  - `BaseNFCReader`
  - `MockManualReader`
  - `PlaceholderHardwareReader`
- `display.py`
  - `BaseDisplay`
  - `ConsoleDisplay`
  - `SenseCapIndicatorDisplay`
- `main.py`
  - polls reader
  - calls backend
  - updates display
  - logs scan history locally

### Mobile App

- Splash
- Mock sign-in
- Home
- Wallet pass
- Tap status
- Entry result
- Ticket history

## Upgrade path after the hackathon

- Replace `MockManualReader` with your actual NFC reader implementation.
- Replace `SenseCapIndicatorDisplay` stub methods with the D1 device rendering calls you want.
- Add QR fallback for devices that do not support the NFC tap flow.
- Move from polling to WebSocket/SSE if you want faster UI updates later.

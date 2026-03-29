# SmartVenue PSU MVP

SmartVenue PSU is a hackathon-ready Penn State Beaver Stadium entry MVP. A fan opens a mobile app, views a wallet-style game ticket, taps at an NFC reader connected to a Raspberry Pi 4 Model B, and sees the validation result on the gate device and in the app.

## Monorepo layout

```text
smartvenue-psu-mvp/
├── mobile-app/
├── backend/
├── pi-gate-service/
├── shared/
└── docs/
```

## What each service does

- `mobile-app`: Expo-based fan app with splash, sign-in, home, wallet pass, tap status, result, and history screens.
- `backend`: FastAPI + SQLite service for mock auth, upcoming game, ticket issue, ticket validation, and ticket status polling.
- `pi-gate-service`: Python gate client for Raspberry Pi with pluggable NFC reader and display adapters.
- `pi-gate-service/ui`: Penn State-themed gate-screen UI intended for the SenseCAP / Raspberry Pi display path.
- `shared`: Seeded demo ticket scenarios and shared reference data.
- `docs`: Architecture, API contract, and judge demo script.

## Quick start

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Raspberry Pi gate service

```bash
cd pi-gate-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python3 main.py
```

The default reader mode is `mock`, so you can type tokens manually from a keyboard for demos on a laptop or Pi.

### 2b. SenseCAP / gate-screen UI

When the Pi gate service is running, it also serves a local gate dashboard:

```text
http://127.0.0.1:8090
```

Open that URL on the SenseCAP-connected browser or any local browser to show the gate device UI.

### 3. Mobile app

```bash
cd mobile-app
npm install
npx expo start
```

This environment does not currently have Node installed, so the mobile app was scaffolded but not run here.

## Demo tokens

- `PSU-VALID-001`: valid ticket
- `PSU-USED-001`: already used
- `PSU-EXPIRED-001`: expired
- `PSU-INVALID-001`: invalid / unknown behavior demo
- `PSU-RETRY-001`: malformed / retry scenario

## Local demo flow

1. Start the backend.
2. Start the Pi gate service in `mock` reader mode.
3. Open the gate-screen UI at `http://127.0.0.1:8090`.
4. In the gate service terminal, enter one of the demo tokens.
5. Watch the backend validate the scan.
6. The gate display state updates immediately.
7. Optionally also show the mobile app path later if needed.

## What to show judges

1. Home screen with the upcoming Penn State vs Michigan game card.
2. Wallet-style pass with gate, seat, token, and Ready to Tap pulse.
3. Raspberry Pi gate service waiting at Gate A.
4. Manual token entry for a valid tap.
5. Immediate VERIFIED state on the gate device.
6. Mobile app syncing to Entry Verified.
7. Repeat with `ALREADY USED`, `EXPIRED`, and `RETRY`.

See [docs/architecture.md](/Users/abhiram/Documents/Playground/smartvenue-psu-mvp/docs/architecture.md), [docs/api-contract.md](/Users/abhiram/Documents/Playground/smartvenue-psu-mvp/docs/api-contract.md), and [docs/demo-script.md](/Users/abhiram/Documents/Playground/smartvenue-psu-mvp/docs/demo-script.md) for the deeper walkthrough.

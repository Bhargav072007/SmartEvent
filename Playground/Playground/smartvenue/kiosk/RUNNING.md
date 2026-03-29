# SmartVenue Kiosk Run Notes

## Final Split

- Laptop runs the heavy parts:
  - `face-engine.py`
  - `register-face.py`
  - `ml-service.py`
  - SQLite database
- Raspberry Pi runs only the kiosk screen:
  - `pi-ui-client.py`

This is the reliable demo architecture for now.

## Laptop Setup

### 1. Move into the kiosk folder
```bash
cd ~/smartvenue/kiosk
```

### 2. Install the ML environment once
```bash
chmod +x setup-ml.sh
./setup-ml.sh
source .venv/bin/activate
```

### 3. Start the app enrollment API
The iPhone app should send face photos or a short guided face video here.

```bash
uvicorn register-face:APP --host 0.0.0.0 --port 5000
```

### 4. Start the live kiosk ML service
This exposes recognition state and camera frames to the Raspberry Pi UI.

```bash
uvicorn ml-service:APP --host 0.0.0.0 --port 5050
```

### 5. Optional low-level test
```bash
python test-ml.py
```

## Raspberry Pi Setup

### 1. Copy the `kiosk` folder to the Pi
```bash
cd ~/smartvenue/kiosk
```

### 2. Install the UI environment
```bash
chmod +x setup-ui.sh
./setup-ui.sh
source .venv-ui/bin/activate
```

### 3. Point the Pi UI to the laptop ML service
Replace `<laptop-ip>` with the laptop IP on the same network or direct link.

```bash
export SMARTVENUE_ML_URL=http://<laptop-ip>:5050
python pi-ui-client.py
```

## API Endpoints

### App -> Laptop enrollment
```text
POST http://<laptop-ip>:5000/register
```

Payload fields:
- `fan_id`
- `name`
- `seat_section`
- `gate_assignment`
- `ticket_valid`
- `photos` or `video_base64`

### Pi -> Laptop live recognition
```text
GET http://<laptop-ip>:5050/recognition
GET http://<laptop-ip>:5050/frame.jpg
POST http://<laptop-ip>:5050/reload-db
```

## Files

- `face-engine.py` -> live face-recognition engine
- `register-face.py` -> enrollment API for the app
- `ml-service.py` -> laptop HTTP bridge for the Pi UI
- `pi-ui-client.py` -> Raspberry Pi kiosk display client
- `test-ml.py` -> local verification harness
- `setup-ml.sh` -> laptop / full ML environment installer
- `setup-ui.sh` -> Pi UI-only installer

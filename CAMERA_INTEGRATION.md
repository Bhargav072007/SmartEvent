# SmartVenue Camera Integration

This setup now connects the camera layer to the Beaver Stadium routing engine.

## What was integrated

- `smartvenue_camera_router.py`
  Core integration layer with no web dependency. It merges live camera detections with the trained Beaver Stadium routing model.

- `smartvenue-cameraengine/engine/main.py`
  FastAPI wrapper around the integration core. This exposes the live update and recommendation endpoints.

- `smartvenue-cameraengine/camera/Camera-engine.py`
  Camera client updated so each running camera instance reports to one specific gate instead of incorrectly broadcasting the same count to every gate.

## Important fix

Before this change, one camera feed posted the same `person_count` to gates `A-F`, which would make rerouting decisions wrong.

Now each camera instance is gate-specific:

```bash
SMARTVENUE_GATE=A SMARTVENUE_CAMERA_ID=cam_a_01 python3 Camera-engine.py
SMARTVENUE_GATE=B SMARTVENUE_CAMERA_ID=cam_b_01 python3 Camera-engine.py
```

Run one camera process per gate.

If you want a dedicated Gate B launcher for the app demo, use:

```bash
cd /Users/krishang/Documents/New\ project/smartvenue-cameraengine/camera
python3 gate_b_camera_launcher.py
```

You can also point it at a non-local backend by setting:

```bash
SMARTVENUE_ROUTING_ENGINE_URL=http://YOUR_HOST:8000/api/camera/update python3 gate_b_camera_launcher.py
```

## API endpoints

- `POST /api/camera/update`
  Accepts live gate-level camera telemetry.

- `GET /api/gates/live`
  Returns current gate states with predicted wait, status, and recommended action.

- `GET /api/gate/recommend`
  Returns the best gate for a fan based on live gate telemetry plus the trained Beaver Stadium model.

- `GET /api/stats/live`
  Returns global live crowd stats.

## Example recommendation call

```bash
curl "http://localhost:8000/api/gate/recommend?seat=12&fan_type=student&current_gate=A&match_id=bsu_2025_001&minute=-20&kickoff_bucket=noon&weather_bucket=clear&security_strictness=elevated&premium_game_flag=true"
```

## Server startup

After installing web dependencies:

```bash
uvicorn smartvenue-cameraengine.engine.main:app --reload
```

If you want, the next step can be:

1. map each physical camera to a real gate config file,
2. add seat-section-to-gate routing for the mobile app, or
3. build a small dashboard showing live gate colors and reroute recommendations.

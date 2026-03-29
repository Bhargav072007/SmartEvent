# Beaver Stadium Crowd Engine Data

This folder contains Beaver-Stadium-specific datasets for a SmartVenue PSU crowd intelligence engine. The package combines public venue facts with clearly labeled modeled assumptions so the data can support prototyping without pretending to be official operations telemetry.

## Public Beaver Stadium facts used as anchors

- Venue name: Beaver Stadium
- University: Penn State
- City: University Park
- State: Pennsylvania
- Official capacity anchor used here: 106572
- Publicly identified named gates: A, B, C, D, E, F
- Gate A is treated as the student entrance
- Gate B is associated with ADA shuttle drop access
- Gate E is associated with ticket and will-call activity
- Beaver Stadium is a very large college football venue with strong pre-kickoff surges
- SmartVenue PSU is the project concept represented by these datasets

## Modeled assumptions

- Gate A has the sharpest late student-arrival curve and the most common surge risk
- Gate B has steadier accessibility-related flow and lower-mobility pacing
- Gate E sometimes processes slower because of ticket or will-call friction
- Gates C, D, and F act as balancing gates when nearby demand overloads
- Premium and rivalry games create stronger late surges and higher pressure
- Night games produce sharper late-arrival curves than noon games
- Weather increases burstiness and screening friction
- Security slowdowns create nonlinear queue growth
- Camera quality, occlusion, and model reliability are simulated from gate-state conditions

## Files

- `venue_metadata.json`: Beaver Stadium venue facts, modeled assumptions, and notes
- `gate_metadata.csv`: Gate-specific operational roles and modeled gate behavior for A through F
- `match_metadata.csv`: Forty-eight realistic synthetic football games with attendance, kickoff, weather, and premium/rivalry context
- `gate_arrivals.csv`: Minute-by-minute crowd-flow data from -180 to +30 minutes relative to kickoff
- `camera_frames.csv`: Frame-level computer vision signals derived from gate conditions
- `paper_capabilities.csv`: Research-stack capability mapping for the Beaver Stadium engine
- `model_registry.json`: Structured method registry including strengths, failure modes, and deployment constraints
- `system_mapping.csv`: How the research stack maps into the crowd engine subsystems
- `training_targets.csv`: Derived ML supervision targets for forecasting and rerouting tasks
- `validate_datasets.py`: Validation checks for file presence, enums, monotonicity, timestamps, duplicates, and core constraints
- `build_beaver_datasets.py`: Source generator used to create the packaged files

## How gate behavior was shaped around Gates A, B, and E

- Gate A is intentionally modeled as the strongest student-surge gate, especially in the final 30 minutes before kickoff and especially for premium or rivalry games.
- Gate B is modeled as steadier and accessibility-oriented, with fewer spikes and a larger share of accessibility and staff traffic.
- Gate E is modeled with occasional throughput degradation so it can become delay-prone even when it is not the busiest gate by total arrivals.
- Gates C, D, and F provide balancing capacity and absorb rerouted demand from overloaded gates.

## How the research stack maps into the crowd engine

- CrowdVLM-R1 provides human-readable gate-state interpretation.
- HMSTUNet supports dense-scene heatmaps and count estimation.
- PET handles point localization when packed queues make boxes unreliable.
- FFNet provides low-latency deployment-ready gate monitoring.
- Proactive Crowd Flow supports short-horizon overload forecasting.
- YOLOv8 provides live person detection in sparse and moderate scenes.
- Real-ESRGAN improves poor camera imagery when needed.
- B2BDet validates whether enhancement improves detection quality.
- Farneback Optical Flow estimates directional movement and stalls.
- Fruin LOS converts queue and density into interpretable pressure scores.
- GABPPO supports alternate-gate and staffing recommendations.

## Limitations of public data

- Public Beaver Stadium information does not expose real gate-tap, ticket-scan, or queue-time telemetry.
- Public gate roles provide useful anchors, but actual gate throughput, staffing, and lane operations are modeled assumptions here.
- Camera-derived fields are synthetic approximations shaped to realistic game-day behavior, not extracted from real stadium footage.

## Replacing modeled values later with real feeds

- Replace `expected_attendance` with official attendance or scanned entry counts.
- Replace synthetic `gate_arrivals.csv` rows with real minute-level gate or ticket scan telemetry.
- Replace queue, throughput, and pressure fields with calibrated measurements tied to actual lane counts and geometry.
- Replace `camera_frames.csv` with model outputs from real stadium camera pipelines.
- Keep IDs and schemas stable so historical synthetic data can coexist with real telemetry during transition.

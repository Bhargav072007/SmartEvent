# Beaver Stadium Routing Engine

This engine trains on the attached Beaver Stadium datasets and recommends the best gate for the fastest entry based on:

- current gate wait and pressure
- near-term historical context learned from the data
- fan type fit for each gate
- gate friction and accessibility constraints

## Files

- `beaver_stadium_engine.py`: train, recommend, and evaluate the routing engine
- `beaver_stadium_model.json`: trained model artifact generated from your attached data

## Train

```bash
python3 /Users/krishang/Documents/New\ project/beaver_stadium_engine.py train \
  --data-dir /Users/krishang/Documents/hackathon/beaver_stadium_crowd_engine_data \
  --model-out /Users/krishang/Documents/New\ project/beaver_stadium_model.json
```

## Recommend

Example: a student currently heading to Gate A, 20 minutes before kickoff.

```bash
python3 /Users/krishang/Documents/New\ project/beaver_stadium_engine.py recommend \
  --model /Users/krishang/Documents/New\ project/beaver_stadium_model.json \
  --match-id bsu_2025_001 \
  --minute -20 \
  --fan-type student \
  --current-gate A
```

## Evaluate

```bash
python3 /Users/krishang/Documents/New\ project/beaver_stadium_engine.py evaluate \
  --model /Users/krishang/Documents/New\ project/beaver_stadium_model.json \
  --limit 5000
```

In the current synthetic dataset run, the engine achieved:

- `best_gate_match_rate`: `0.977`
- `avg_wait_saved_minutes`: `6.72`

## Notes

- The attached `training_targets.csv` is weak for congestion-class training because it only contains `low` risk labels, so this engine learns primarily from `gate_arrivals.csv`, `camera_frames.csv`, and the gate/match metadata.
- When a live dataset snapshot exists for a given match and minute, the engine uses that real snapshot first and blends it with historical context.
- If you later replace the synthetic files with real gate telemetry, the same training flow can be reused.

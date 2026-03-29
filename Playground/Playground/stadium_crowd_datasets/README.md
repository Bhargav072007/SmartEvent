# Stadium Crowd Datasets

This folder contains structured research-to-system datasets for a stadium crowd intelligence project. The package is designed for prototyping retrieval systems, benchmarking model choices, simulating gate arrivals, and defining computer vision annotation outputs.

## Files

- `paper_capabilities.csv`: Research-paper-to-capability mapping covering the methods in the requested stack and the role each one plays in the system.
- `model_registry.json`: Structured registry of each paper or method with inputs, outputs, dependencies, evaluation metrics, assumptions, failure modes, and deployment constraints.
- `synthetic_gate_arrivals.csv`: Minute-level synthetic gate arrival data for 36 matches across 8 gates and three fan types.
- `cv_annotation_schema.json`: JSON schema-style field definitions for six computer vision output artifact types.
- `system_mapping.csv`: Operational mapping from subsystem to primary method, backup method, inputs, outputs, timing mode, and selection rationale.
- `validate_datasets.py`: Validation script for schema consistency, missing data, allowed labels, and cumulative monotonicity.
- `generate_more_synthetic_data.py`: Utility to generate 100 or more additional synthetic matches with the same schema.
- `build_datasets.py`: Source script used to create the initial CSV and JSON deliverables.

## How synthetic data was generated

The synthetic arrivals dataset is inspired by research-style gate arrival curves rather than any public real stadium tap stream. The generation process uses:

- A minute range from -120 minutes to +30 minutes relative to kickoff.
- Eight gates with intentionally different behavioral profiles: early-arrival, steady, late-surge, VIP-heavy, and member-heavy.
- Three fan types: `member`, `regular`, and `vip`.
- Match-level context including venue, kickoff time, weather bucket, and match importance.
- Gate-specific capacities, weights, and fan-type mixes.
- Different Gaussian-style arrival curves by gate behavior and fan type.
- Stochastic noise so gates do not look perfectly smooth or identical from match to match.
- Derived `pressure_score`, `predicted_density_level`, and `route_recommendation` fields based on local intensity and delay factors.

The result is a controlled but varied benchmark-style dataset for forecasting, routing, and simulation experiments.

## Assumptions and limitations

- This is synthetic data, not real ticket tap or turnstile data.
- Arrival volumes are designed to be plausible for benchmarking, not exact for any specific stadium.
- Pressure scoring uses simplified heuristics inspired by density and service pressure, not a calibrated physical safety model.
- Route recommendations are generated from transparent rules so the dataset can seed optimization experiments; they are not learned policies.
- Venue IDs include both a Camp Nou benchmark-inspired setting and a Beaver Stadium simulation setting to reflect the research motivation and target deployment scenario.
- Computer vision schemas describe expected outputs, not finalized annotation tooling formats such as COCO or CVAT exports.

## Extending later with real stadium data

When real stadium data becomes available, this package can be extended by:

- Replacing synthetic arrivals with actual gate tap or scan streams aggregated to minute or sub-minute intervals.
- Adding real gate metadata such as staffed lanes, physical width, ADA flags, and nearby parking or transit context.
- Linking synthetic or real gate records to camera-derived counts, density maps, and route decisions.
- Calibrating `pressure_score` with measured occupancy, width, and throughput observations.
- Adding actual intervention outcomes so optimization methods can be benchmarked on observed wait reduction or clearance improvements.

## Mapping into retrieval or ML pipelines

Typical usage patterns:

- Retrieval / RAG:
  Use `paper_capabilities.csv`, `model_registry.json`, and `system_mapping.csv` as a retrieval corpus for capability lookup, subsystem design, or method selection.

- Forecasting:
  Train or benchmark time-series models using `synthetic_gate_arrivals.csv`, grouped by `match_id`, `gate_id`, and `fan_type`.

- Optimization:
  Use `pressure_score`, `predicted_density_level`, and `route_recommendation` as a starting state/action table for rule-based or reinforcement-learning experiments.

- Computer vision:
  Use `cv_annotation_schema.json` to standardize output contracts between perception models and downstream analytics services.

- Validation:
  Run `validate_datasets.py` after regeneration or after integrating real venue data to catch schema drift and data integrity issues.

## Generation and validation

Rebuild the packaged datasets:

```bash
python3 build_datasets.py
```

Validate the packaged datasets:

```bash
python3 validate_datasets.py
```

Generate 100 more synthetic matches:

```bash
python3 generate_more_synthetic_data.py --matches 100 --output synthetic_gate_arrivals_extra.csv
```

## Files created by the initial build

- `paper_capabilities.csv`
- `model_registry.json`
- `synthetic_gate_arrivals.csv`
- `cv_annotation_schema.json`
- `system_mapping.csv`
- `validate_datasets.py`
- `generate_more_synthetic_data.py`
- `build_datasets.py`
- `README.md`

from __future__ import annotations

import json
from pathlib import Path
import sys

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent
REQUIRED_FILES = [
    "venue_metadata.json",
    "gate_metadata.csv",
    "match_metadata.csv",
    "gate_arrivals.csv",
    "camera_frames.csv",
    "paper_capabilities.csv",
    "model_registry.json",
    "system_mapping.csv",
    "training_targets.csv",
    "README.md",
]

VALID_GATES = {"A", "B", "C", "D", "E", "F"}
VALID_FAN_TYPES = {"student", "general", "season_ticket_holder", "vip", "staff", "accessibility"}
VALID_DENSITY = {"low", "medium", "high", "critical"}
VALID_FLOW = {"smooth_inbound", "heavy_inbound", "mixed", "stalled"}
VALID_ACTIONS = {
    "stay",
    "reroute_to_B",
    "reroute_to_C",
    "reroute_to_D",
    "reroute_to_E",
    "reroute_to_F",
    "open_extra_lane",
    "deploy_staff",
    "manual_monitoring",
}


def ensure_files_exist() -> None:
    missing = [name for name in REQUIRED_FILES if not (BASE_DIR / name).exists()]
    if missing:
        raise ValueError(f"Missing required files: {missing}")


def assert_no_nulls(df: pd.DataFrame, name: str) -> None:
    if df.isnull().any().any():
        cols = df.columns[df.isnull().any()].tolist()
        raise ValueError(f"{name} contains unexpected nulls in {cols}")


def validate_venue_metadata() -> None:
    data = json.loads((BASE_DIR / "venue_metadata.json").read_text(encoding="utf-8"))
    required = {
        "venue_id",
        "venue_name",
        "university",
        "city",
        "state",
        "official_capacity",
        "named_gates",
        "official_public_facts",
        "modeled_assumptions",
        "notes",
    }
    if set(data.keys()) != required:
        raise ValueError("venue_metadata.json has an unexpected schema")
    if data["official_capacity"] != 106572:
        raise ValueError("venue_metadata.json official capacity must be 106572")
    if set(data["named_gates"]) != VALID_GATES:
        raise ValueError("venue_metadata.json must use only gates A-F")


def validate_gate_metadata() -> int:
    df = pd.read_csv(BASE_DIR / "gate_metadata.csv")
    assert_no_nulls(df, "gate_metadata.csv")
    if set(df["gate_id"]) != VALID_GATES:
        raise ValueError("gate_metadata.csv must contain only gates A-F")
    return len(df)


def validate_match_metadata() -> int:
    df = pd.read_csv(BASE_DIR / "match_metadata.csv")
    assert_no_nulls(df, "match_metadata.csv")
    if (df["expected_attendance"] > 106572).any():
        raise ValueError("match_metadata.csv has expected_attendance above official capacity")
    if df.duplicated(subset=["match_id"]).any():
        raise ValueError("match_metadata.csv has duplicate match_id values")
    return df["match_id"].nunique()


def validate_gate_arrivals() -> int:
    arrivals = pd.read_csv(BASE_DIR / "gate_arrivals.csv")
    matches = pd.read_csv(BASE_DIR / "match_metadata.csv")[["match_id", "kickoff_datetime"]].rename(
        columns={"kickoff_datetime": "match_kickoff_datetime"}
    )
    assert_no_nulls(arrivals, "gate_arrivals.csv")

    if arrivals.duplicated(subset=["row_id"]).any():
        raise ValueError("gate_arrivals.csv has duplicate row_id values")
    if not set(arrivals["gate_id"]).issubset(VALID_GATES):
        raise ValueError("gate_arrivals.csv has illegal gate IDs")
    if not set(arrivals["fan_type"]).issubset(VALID_FAN_TYPES):
        raise ValueError("gate_arrivals.csv has illegal fan_type values")
    if not set(arrivals["predicted_density_level"]).issubset(VALID_DENSITY):
        raise ValueError("gate_arrivals.csv has illegal predicted_density_level values")
    if not set(arrivals["dominant_flow_state"]).issubset(VALID_FLOW):
        raise ValueError("gate_arrivals.csv has illegal dominant_flow_state values")
    if not set(arrivals["recommended_action"]).issubset(VALID_ACTIONS):
        raise ValueError("gate_arrivals.csv has illegal recommended_action values")
    if (arrivals["arrivals_in_minute"] < 0).any():
        raise ValueError("gate_arrivals.csv has negative arrivals")
    if ((arrivals["pressure_score"] < 0) | (arrivals["pressure_score"] > 100)).any():
        raise ValueError("gate_arrivals.csv pressure_score must be in [0, 100]")

    merged = arrivals.merge(matches, on="match_id")
    kickoff_ts = pd.to_datetime(merged["match_kickoff_datetime"])
    row_ts = pd.to_datetime(merged["timestamp"])
    minute_diff = ((row_ts - kickoff_ts).dt.total_seconds() / 60).astype(int)
    if not (minute_diff == merged["minutes_from_kickoff"]).all():
        raise ValueError("gate_arrivals.csv timestamps are inconsistent with minutes_from_kickoff")

    grouped = arrivals.sort_values(["match_id", "gate_id", "fan_type", "minutes_from_kickoff"]).groupby(
        ["match_id", "gate_id", "fan_type"], sort=False
    )
    for key, group in grouped:
        diffs = group["cumulative_entries"].diff().fillna(group["cumulative_entries"])
        if (diffs < 0).any():
            raise ValueError(f"cumulative_entries is not monotonic for {key}")
        if not (diffs.astype(int) == group["arrivals_in_minute"].astype(int)).all():
            raise ValueError(f"cumulative_entries mismatch for {key}")
    return len(arrivals)


def validate_camera_frames() -> int:
    df = pd.read_csv(BASE_DIR / "camera_frames.csv")
    assert_no_nulls(df, "camera_frames.csv")
    if df.duplicated(subset=["frame_id"]).any():
        raise ValueError("camera_frames.csv has duplicate frame_id values")
    if not set(df["gate_id"]).issubset(VALID_GATES):
        raise ValueError("camera_frames.csv has illegal gate IDs")
    return len(df)


def validate_papers() -> int:
    df = pd.read_csv(BASE_DIR / "paper_capabilities.csv")
    assert_no_nulls(df, "paper_capabilities.csv")
    if df.duplicated(subset=["paper_id"]).any():
        raise ValueError("paper_capabilities.csv has duplicate paper IDs")
    registry = json.loads((BASE_DIR / "model_registry.json").read_text(encoding="utf-8"))
    registry_ids = {item["paper_id"] for item in registry}
    if set(df["paper_id"]) != registry_ids:
        raise ValueError("paper_capabilities.csv and model_registry.json paper IDs do not match")
    return len(df)


def validate_system_mapping() -> int:
    df = pd.read_csv(BASE_DIR / "system_mapping.csv")
    assert_no_nulls(df, "system_mapping.csv")
    if df.duplicated(subset=["subsystem"]).any():
        raise ValueError("system_mapping.csv has duplicate subsystem rows")
    return len(df)


def validate_training_targets() -> int:
    df = pd.read_csv(BASE_DIR / "training_targets.csv")
    assert_no_nulls(df, "training_targets.csv")
    if df.duplicated(subset=["row_id"]).any():
        raise ValueError("training_targets.csv has duplicate row_id values")
    if not set(df["best_alternate_gate"]).issubset(VALID_GATES):
        raise ValueError("training_targets.csv best_alternate_gate must only use A-F")
    if not set(df["congestion_risk_multiclass"]).issubset(VALID_DENSITY):
        raise ValueError("training_targets.csv has illegal congestion_risk_multiclass values")
    return len(df)


def main() -> None:
    ensure_files_exist()
    validate_venue_metadata()
    gate_count = validate_gate_metadata()
    match_count = validate_match_metadata()
    gate_rows = validate_gate_arrivals()
    camera_rows = validate_camera_frames()
    paper_count = validate_papers()
    subsystem_count = validate_system_mapping()
    target_rows = validate_training_targets()

    print("Validation passed")
    print(f"Gates: {gate_count}")
    print(f"Matches: {match_count}")
    print(f"Gate-arrival rows: {gate_rows}")
    print(f"Camera-frame rows: {camera_rows}")
    print(f"Papers: {paper_count}")
    print(f"Subsystem mappings: {subsystem_count}")
    print(f"Training target rows: {target_rows}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Validation failed: {exc}", file=sys.stderr)
        sys.exit(1)

from __future__ import annotations

import json
from pathlib import Path
import sys

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent

PAPER_COLUMNS = [
    "paper_id",
    "paper_name",
    "year",
    "task_category",
    "what_we_use_it_for",
    "input_type",
    "output_type",
    "latency_priority",
    "deployment_stage",
    "notes",
]

ARRIVAL_COLUMNS = [
    "match_id",
    "venue_id",
    "gate_id",
    "fan_type",
    "kickoff_datetime",
    "minutes_from_kickoff",
    "timestamp",
    "cumulative_entries",
    "arrivals_in_minute",
    "predicted_density_level",
    "pressure_score",
    "route_recommendation",
    "weather_bucket",
    "match_importance",
    "security_delay_factor",
]

SYSTEM_COLUMNS = [
    "subsystem",
    "primary_method",
    "backup_method",
    "input_source",
    "output_artifact",
    "real_time_or_batch",
    "why_selected",
]

ALLOWED_DENSITY = {"low", "medium", "high", "critical"}
ALLOWED_ROUTE = {"stay", "reroute_left", "reroute_right", "open_aux_gate"}
ALLOWED_FAN_TYPE = {"member", "regular", "vip"}


def assert_no_missing(df: pd.DataFrame, name: str) -> None:
    if df.isnull().any().any():
        missing_cols = df.columns[df.isnull().any()].tolist()
        raise ValueError(f"{name} contains missing values in columns: {missing_cols}")


def assert_columns(df: pd.DataFrame, expected: list[str], name: str) -> None:
    if list(df.columns) != expected:
        raise ValueError(f"{name} columns do not match expected schema.\nExpected: {expected}\nActual: {list(df.columns)}")


def validate_paper_capabilities() -> int:
    df = pd.read_csv(BASE_DIR / "paper_capabilities.csv")
    assert_columns(df, PAPER_COLUMNS, "paper_capabilities.csv")
    assert_no_missing(df, "paper_capabilities.csv")
    if df["paper_id"].nunique() != len(df):
        raise ValueError("paper_capabilities.csv contains duplicate paper_id values")
    return len(df)


def validate_model_registry(expected_paper_ids: set[str]) -> int:
    data = json.loads((BASE_DIR / "model_registry.json").read_text(encoding="utf-8"))
    if not isinstance(data, list) or not data:
        raise ValueError("model_registry.json must contain a non-empty list")
    registry_ids = set()
    required_fields = {
        "paper_id",
        "name",
        "year",
        "category",
        "role_in_system",
        "upstream_dependencies",
        "downstream_dependencies",
        "expected_inputs",
        "expected_outputs",
        "evaluation_metrics",
        "assumptions",
        "failure_modes",
        "deployment_constraints",
    }
    for item in data:
        if set(item.keys()) != required_fields:
            raise ValueError(f"model_registry.json item has incorrect fields: {item.get('paper_id', '<unknown>')}")
        for field, value in item.items():
            if value in (None, "", []):
                raise ValueError(f"model_registry.json contains empty value for {field} in {item['paper_id']}")
        registry_ids.add(item["paper_id"])
    if registry_ids != expected_paper_ids:
        raise ValueError("model_registry.json paper IDs do not match paper_capabilities.csv")
    return len(data)


def validate_synthetic_arrivals() -> tuple[int, int]:
    df = pd.read_csv(BASE_DIR / "synthetic_gate_arrivals.csv")
    assert_columns(df, ARRIVAL_COLUMNS, "synthetic_gate_arrivals.csv")
    assert_no_missing(df, "synthetic_gate_arrivals.csv")

    if set(df["fan_type"].unique()) != ALLOWED_FAN_TYPE:
        raise ValueError("synthetic_gate_arrivals.csv has unexpected fan_type values")
    if not set(df["predicted_density_level"].unique()).issubset(ALLOWED_DENSITY):
        raise ValueError("synthetic_gate_arrivals.csv has unexpected predicted_density_level values")
    if not set(df["route_recommendation"].unique()).issubset(ALLOWED_ROUTE):
        raise ValueError("synthetic_gate_arrivals.csv has unexpected route_recommendation values")

    if df["minutes_from_kickoff"].min() != -120 or df["minutes_from_kickoff"].max() != 30:
        raise ValueError("synthetic_gate_arrivals.csv must span -120 to +30 minutes from kickoff")

    if (df["pressure_score"] < 0).any() or (df["pressure_score"] > 1).any():
        raise ValueError("pressure_score must be within [0, 1]")

    grouped = df.sort_values(
        ["match_id", "gate_id", "fan_type", "minutes_from_kickoff"]
    ).groupby(["match_id", "gate_id", "fan_type"], sort=False)
    for key, group in grouped:
        diffs = group["cumulative_entries"].diff().fillna(group["cumulative_entries"])
        if (diffs < 0).any():
            raise ValueError(f"cumulative_entries is not monotonic for {key}")
        if not (diffs.astype(int) == group["arrivals_in_minute"].astype(int)).all():
            raise ValueError(f"cumulative_entries does not align with arrivals_in_minute for {key}")

    return df["match_id"].nunique(), df["gate_id"].nunique()


def validate_cv_schema() -> int:
    data = json.loads((BASE_DIR / "cv_annotation_schema.json").read_text(encoding="utf-8"))
    required_schema_names = {
        "crowd_count",
        "density_heatmap",
        "point_localization",
        "bounding_boxes",
        "optical_flow",
        "super_resolution_validation",
    }
    if set(data.keys()) != required_schema_names:
        raise ValueError("cv_annotation_schema.json schema names are incomplete or inconsistent")

    required_fields = {"field_name", "type", "description", "example_value"}
    count = 0
    for schema_name, fields in data.items():
        if not isinstance(fields, list) or not fields:
            raise ValueError(f"{schema_name} schema must be a non-empty list")
        for field in fields:
            if set(field.keys()) != required_fields:
                raise ValueError(f"{schema_name} field entry has wrong structure")
            if any(field[key] in (None, "") for key in required_fields):
                raise ValueError(f"{schema_name} field entry contains missing values")
            count += 1
    return count


def validate_system_mapping() -> int:
    df = pd.read_csv(BASE_DIR / "system_mapping.csv")
    assert_columns(df, SYSTEM_COLUMNS, "system_mapping.csv")
    assert_no_missing(df, "system_mapping.csv")
    return len(df)


def main() -> None:
    paper_count = validate_paper_capabilities()
    paper_ids = set(pd.read_csv(BASE_DIR / "paper_capabilities.csv")["paper_id"])
    registry_count = validate_model_registry(paper_ids)
    match_count, gate_count = validate_synthetic_arrivals()
    cv_field_count = validate_cv_schema()
    subsystem_count = validate_system_mapping()

    print("Validation passed")
    print(f"Papers: {paper_count}")
    print(f"Registry entries: {registry_count}")
    print(f"Matches: {match_count}")
    print(f"Gates: {gate_count}")
    print(f"CV schema fields: {cv_field_count}")
    print(f"Subsystem mappings: {subsystem_count}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Validation failed: {exc}", file=sys.stderr)
        sys.exit(1)

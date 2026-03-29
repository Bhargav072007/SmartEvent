from __future__ import annotations

import argparse
import csv
import json
import math
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


GATES = ("A", "B", "C", "D", "E", "F")
FAN_TYPES = (
    "student",
    "general",
    "season_ticket_holder",
    "vip",
    "staff",
    "accessibility",
)
DENSITY_ORDER = {"low": 0, "medium": 1, "high": 2, "critical": 3}
FLOW_ORDER = {"smooth_inbound": 0, "mixed": 1, "heavy_inbound": 2, "stalled": 3}
ACTION_ORDER = {
    "stay": 0,
    "manual_monitoring": 1,
    "deploy_staff": 2,
    "reroute_to_B": 3,
    "reroute_to_C": 3,
    "reroute_to_D": 3,
    "reroute_to_E": 3,
    "reroute_to_F": 3,
    "open_extra_lane": 4,
}
WEATHER_FACTORS = {
    "clear": 0.0,
    "cool_clear": 0.05,
    "windy": 0.12,
    "light_rain": 0.2,
    "heavy_rain": 0.35,
}
SECURITY_FACTORS = {"standard": 0.0, "elevated": 0.12, "tight": 0.25}
FIT_WEIGHTS = {
    "student": "student_bias_score",
    "general": "general_bias_score",
    "season_ticket_holder": "general_bias_score",
    "vip": "general_bias_score",
    "staff": "general_bias_score",
    "accessibility": "ada_bias_score",
}


def safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def mode_or_default(values: list[str], default: str) -> str:
    if not values:
        return default
    return Counter(values).most_common(1)[0][0]


def max_by_order(values: list[str], ordering: dict[str, int], default: str) -> str:
    if not values:
        return default
    return max(values, key=lambda value: ordering.get(value, -1))


def bucket_minutes(minutes_from_kickoff: int) -> int:
    return math.floor(minutes_from_kickoff / 15) * 15


@dataclass
class GateState:
    gate_id: str
    minutes_from_kickoff: int
    expected_wait_minutes: float
    pressure_score: float
    gate_utilization_ratio: float
    local_queue_estimate: float
    effective_throughput: float
    predicted_density_level: str
    dominant_flow_state: str
    recommended_action: str
    alternate_gate: str
    estimated_people_visible: float
    density_map_sum: float
    optical_flow_magnitude: float
    detection_confidence_mean: float
    super_resolution_needed: bool
    image_quality: str
    lighting_condition: str
    occlusion_level: str
    arrivals_by_fan_type: dict[str, float]

    def to_dict(self) -> dict[str, Any]:
        return {
            "gate_id": self.gate_id,
            "minutes_from_kickoff": self.minutes_from_kickoff,
            "expected_wait_minutes": round(self.expected_wait_minutes, 2),
            "pressure_score": round(self.pressure_score, 2),
            "gate_utilization_ratio": round(self.gate_utilization_ratio, 3),
            "local_queue_estimate": round(self.local_queue_estimate, 2),
            "effective_throughput": round(self.effective_throughput, 2),
            "predicted_density_level": self.predicted_density_level,
            "dominant_flow_state": self.dominant_flow_state,
            "recommended_action": self.recommended_action,
            "alternate_gate": self.alternate_gate,
            "estimated_people_visible": round(self.estimated_people_visible, 2),
            "density_map_sum": round(self.density_map_sum, 2),
            "optical_flow_magnitude": round(self.optical_flow_magnitude, 3),
            "detection_confidence_mean": round(self.detection_confidence_mean, 3),
            "super_resolution_needed": self.super_resolution_needed,
            "image_quality": self.image_quality,
            "lighting_condition": self.lighting_condition,
            "occlusion_level": self.occlusion_level,
            "arrivals_by_fan_type": {
                key: round(value, 2) for key, value in self.arrivals_by_fan_type.items()
            },
        }


class BeaverRoutingEngine:
    def __init__(self, model: dict[str, Any]) -> None:
        self.model = model
        self.gate_metadata = model["gate_metadata"]
        self.context_summaries = model["context_summaries"]
        self.default_gate_profiles = model["default_gate_profiles"]
        self.match_metadata = model.get("match_metadata", {})
        self.dataset_snapshots = model.get("dataset_snapshots", {})

    @classmethod
    def train_from_data(cls, data_dir: str | Path) -> "BeaverRoutingEngine":
        builder = TrainingDataBuilder(Path(data_dir))
        model = builder.build_model()
        return cls(model)

    @classmethod
    def load(cls, model_path: str | Path) -> "BeaverRoutingEngine":
        with open(model_path, encoding="utf-8") as handle:
            model = json.load(handle)
        return cls(model)

    def save(self, model_path: str | Path) -> None:
        with open(model_path, "w", encoding="utf-8") as handle:
            json.dump(self.model, handle, indent=2)

    def recommend(
        self,
        fan_type: str,
        current_gate: str | None = None,
        match_id: str | None = None,
        minutes_from_kickoff: int | None = None,
        snapshot: dict[str, dict[str, Any]] | None = None,
        match_context: dict[str, Any] | None = None,
        min_improvement_minutes: float = 2.0,
    ) -> dict[str, Any]:
        if fan_type not in FAN_TYPES:
            raise ValueError(f"Unsupported fan type: {fan_type}")

        live_snapshot = snapshot or self._get_snapshot(match_id, minutes_from_kickoff, match_context)
        if not live_snapshot:
            raise ValueError("No gate snapshot available. Provide match_id/minutes_from_kickoff or a manual snapshot.")

        context = dict(match_context or {})
        if match_id and match_id in self.match_metadata:
            context = {**self.match_metadata[match_id], **context}
        if minutes_from_kickoff is not None:
            context["minutes_from_kickoff"] = minutes_from_kickoff

        ranked = []
        for gate_id in GATES:
            gate_state = live_snapshot[gate_id]
            scorecard = self._score_gate(
                gate_id=gate_id,
                gate_state=gate_state,
                fan_type=fan_type,
                context=context,
            )
            ranked.append(scorecard)

        ranked.sort(key=lambda item: item["total_score"])
        best = ranked[0]
        current_entry = next((item for item in ranked if item["gate_id"] == current_gate), None)
        should_reroute = current_gate is not None and best["gate_id"] != current_gate
        expected_improvement = 0.0
        if current_entry is not None:
            expected_improvement = max(0.0, current_entry["projected_wait_minutes"] - best["projected_wait_minutes"])
            should_reroute = should_reroute and expected_improvement >= min_improvement_minutes

        recommended_gate = best["gate_id"] if should_reroute or current_gate is None else current_gate
        chosen_entry = best if recommended_gate == best["gate_id"] else current_entry
        explanation = self._build_explanation(
            fan_type=fan_type,
            current_gate=current_gate,
            chosen_entry=chosen_entry,
            best_entry=best,
            expected_improvement=expected_improvement,
            should_reroute=should_reroute,
        )

        return {
            "fan_type": fan_type,
            "current_gate": current_gate,
            "recommended_gate": recommended_gate,
            "should_reroute": should_reroute,
            "expected_wait_reduction_minutes": round(expected_improvement if should_reroute else 0.0, 2),
            "explanation": explanation,
            "ranked_gates": ranked,
            "snapshot": {gate: state for gate, state in live_snapshot.items()},
        }

    def evaluate(self, limit: int | None = None) -> dict[str, Any]:
        rows = 0
        improved = 0
        total_wait_gain = 0.0
        total_best_match = 0

        for snapshot_key, gate_snapshot in self.dataset_snapshots.items():
            match_id, minute_str = snapshot_key.rsplit("|", 1)
            minute = int(minute_str)
            for fan_type in FAN_TYPES:
                current_gate = self._most_loaded_gate_for_fan(gate_snapshot, fan_type)
                result = self.recommend(
                    fan_type=fan_type,
                    current_gate=current_gate,
                    match_id=match_id,
                    minutes_from_kickoff=minute,
                    snapshot=gate_snapshot,
                )
                actual_best_gate, actual_best_wait = self._actual_best_gate(gate_snapshot, fan_type)
                chosen_gate = result["recommended_gate"]
                chosen_wait = next(item["projected_wait_minutes"] for item in result["ranked_gates"] if item["gate_id"] == chosen_gate)
                current_wait = next(item["projected_wait_minutes"] for item in result["ranked_gates"] if item["gate_id"] == current_gate)
                rows += 1
                total_wait_gain += max(0.0, current_wait - chosen_wait)
                improved += int(chosen_wait + 1e-9 < current_wait)
                total_best_match += int(chosen_gate == actual_best_gate or abs(chosen_wait - actual_best_wait) < 0.5)
                if limit is not None and rows >= limit:
                    return {
                        "evaluated_scenarios": rows,
                        "reroute_rate": round(improved / rows, 3),
                        "avg_wait_saved_minutes": round(total_wait_gain / rows, 2),
                        "best_gate_match_rate": round(total_best_match / rows, 3),
                    }

        return {
            "evaluated_scenarios": rows,
            "reroute_rate": round(improved / rows, 3) if rows else 0.0,
            "avg_wait_saved_minutes": round(total_wait_gain / rows, 2) if rows else 0.0,
            "best_gate_match_rate": round(total_best_match / rows, 3) if rows else 0.0,
        }

    def _score_gate(
        self,
        gate_id: str,
        gate_state: dict[str, Any],
        fan_type: str,
        context: dict[str, Any],
    ) -> dict[str, Any]:
        gate_meta = self.gate_metadata[gate_id]
        historical = self._historical_profile(gate_id, context)
        live_wait = safe_float(gate_state.get("expected_wait_minutes"))
        live_pressure = safe_float(gate_state.get("pressure_score"))
        live_utilization = safe_float(gate_state.get("gate_utilization_ratio"))
        queue = safe_float(gate_state.get("local_queue_estimate"))
        throughput = max(1.0, safe_float(gate_state.get("effective_throughput"), historical["effective_throughput"]))

        projected_wait = 0.65 * live_wait + 0.25 * historical["expected_wait_minutes"] + 0.10 * (queue / throughput) * 60
        projected_pressure = 0.7 * live_pressure + 0.3 * historical["pressure_score"]
        fit_penalty = self._fan_fit_penalty(gate_id, fan_type, gate_meta)
        friction_penalty = safe_float(gate_meta["ticketing_friction_factor"]) * 8
        accessibility_penalty = 0.0
        if fan_type == "accessibility":
            accessibility_penalty = max(0.0, 0.8 - safe_float(gate_meta["accessibility_factor"])) * 12

        weather_penalty = WEATHER_FACTORS.get(context.get("weather_bucket", ""), 0.0) * 5
        security_penalty = SECURITY_FACTORS.get(context.get("security_strictness", ""), 0.0) * 5

        total_score = (
            projected_wait
            + projected_pressure * 0.08
            + max(0.0, live_utilization - 1.0) * 10
            + fit_penalty
            + friction_penalty
            + accessibility_penalty
            + weather_penalty
            + security_penalty
        )
        return {
            "gate_id": gate_id,
            "projected_wait_minutes": round(projected_wait, 2),
            "projected_pressure_score": round(projected_pressure, 2),
            "fan_fit_penalty": round(fit_penalty, 2),
            "friction_penalty": round(friction_penalty, 2),
            "accessibility_penalty": round(accessibility_penalty, 2),
            "total_score": round(total_score, 2),
            "live_state": gate_state,
            "historical_profile": historical,
        }

    def _historical_profile(self, gate_id: str, context: dict[str, Any]) -> dict[str, float]:
        minute = safe_int(context.get("minutes_from_kickoff"))
        key = self._context_key(
            gate_id=gate_id,
            minute_bucket=bucket_minutes(minute),
            kickoff_bucket=context.get("kickoff_bucket", ""),
            weather_bucket=context.get("weather_bucket", ""),
            security_strictness=context.get("security_strictness", ""),
            premium_game_flag=str(context.get("premium_game_flag", "False")),
            rivalry_flag=str(context.get("rivalry_flag", "False")),
        )
        return self.context_summaries.get(key) or self.default_gate_profiles[gate_id]

    def _get_snapshot(
        self,
        match_id: str | None,
        minutes_from_kickoff: int | None,
        match_context: dict[str, Any] | None,
    ) -> dict[str, dict[str, Any]]:
        if match_id is None or minutes_from_kickoff is None:
            return {}
        snapshot_key = f"{match_id}|{minutes_from_kickoff}"
        if snapshot_key in self.dataset_snapshots:
            return self.dataset_snapshots[snapshot_key]

        context = dict(match_context or {})
        if match_id in self.match_metadata:
            context = {**self.match_metadata[match_id], **context}
        context["minutes_from_kickoff"] = minutes_from_kickoff

        synthesized = {}
        for gate_id in GATES:
            profile = self._historical_profile(gate_id, context)
            synthesized[gate_id] = {
                "gate_id": gate_id,
                "minutes_from_kickoff": minutes_from_kickoff,
                "expected_wait_minutes": profile["expected_wait_minutes"],
                "pressure_score": profile["pressure_score"],
                "gate_utilization_ratio": profile["gate_utilization_ratio"],
                "local_queue_estimate": profile["local_queue_estimate"],
                "effective_throughput": profile["effective_throughput"],
                "predicted_density_level": profile["predicted_density_level"],
                "dominant_flow_state": profile["dominant_flow_state"],
                "recommended_action": profile["recommended_action"],
                "alternate_gate": profile["alternate_gate"],
                "estimated_people_visible": profile["estimated_people_visible"],
                "density_map_sum": profile["density_map_sum"],
                "optical_flow_magnitude": profile["optical_flow_magnitude"],
                "detection_confidence_mean": profile["detection_confidence_mean"],
                "super_resolution_needed": profile["super_resolution_needed"],
                "image_quality": profile["image_quality"],
                "lighting_condition": profile["lighting_condition"],
                "occlusion_level": profile["occlusion_level"],
                "arrivals_by_fan_type": profile["arrivals_by_fan_type"],
            }
        return synthesized

    def _actual_best_gate(self, gate_snapshot: dict[str, dict[str, Any]], fan_type: str) -> tuple[str, float]:
        best_gate = None
        best_score = float("inf")
        best_wait = float("inf")
        for gate_id, gate_state in gate_snapshot.items():
            gate_meta = self.gate_metadata[gate_id]
            score = safe_float(gate_state["expected_wait_minutes"]) + self._fan_fit_penalty(gate_id, fan_type, gate_meta)
            if score < best_score:
                best_score = score
                best_wait = safe_float(gate_state["expected_wait_minutes"])
                best_gate = gate_id
        return best_gate or "A", best_wait

    def _most_loaded_gate_for_fan(self, gate_snapshot: dict[str, dict[str, Any]], fan_type: str) -> str:
        candidate = None
        highest_flow = -1.0
        for gate_id, gate_state in gate_snapshot.items():
            flow = safe_float(gate_state.get("arrivals_by_fan_type", {}).get(fan_type))
            if flow > highest_flow:
                highest_flow = flow
                candidate = gate_id
        return candidate or "A"

    def _fan_fit_penalty(self, gate_id: str, fan_type: str, gate_meta: dict[str, Any]) -> float:
        fit_key = FIT_WEIGHTS[fan_type]
        fit_score = safe_float(gate_meta[fit_key])
        penalty = (1.0 - fit_score) * 8
        if fan_type == "student" and gate_id == "A":
            penalty *= 0.4
        if fan_type == "accessibility" and gate_id == "B":
            penalty *= 0.2
        return penalty

    def _build_explanation(
        self,
        fan_type: str,
        current_gate: str | None,
        chosen_entry: dict[str, Any] | None,
        best_entry: dict[str, Any],
        expected_improvement: float,
        should_reroute: bool,
    ) -> str:
        if current_gate is None:
            return (
                f"{best_entry['gate_id']} is the best entry point for a {fan_type} fan right now because it has "
                f"the lowest combined wait and congestion score."
            )
        if should_reroute and chosen_entry is not None:
            return (
                f"Reroute from {current_gate} to {chosen_entry['gate_id']}. The engine projects about "
                f"{expected_improvement:.1f} minutes less waiting with lower pressure at the alternate gate."
            )
        return (
            f"Stay at {current_gate}. The best alternate gate does not clear the reroute threshold, so switching "
            f"would not save enough time to justify moving."
        )

    @staticmethod
    def _context_key(
        gate_id: str,
        minute_bucket: int,
        kickoff_bucket: str,
        weather_bucket: str,
        security_strictness: str,
        premium_game_flag: str,
        rivalry_flag: str,
    ) -> str:
        return "|".join(
            [
                gate_id,
                str(minute_bucket),
                kickoff_bucket or "",
                weather_bucket or "",
                security_strictness or "",
                premium_game_flag or "",
                rivalry_flag or "",
            ]
        )


class TrainingDataBuilder:
    def __init__(self, data_dir: Path) -> None:
        self.data_dir = data_dir
        self.gate_metadata = self._load_csv_by_key("gate_metadata.csv", "gate_id")
        self.match_metadata = self._load_csv_by_key("match_metadata.csv", "match_id")
        self.training_targets = self._load_csv_by_key("training_targets.csv", "row_id")
        self.arrivals = self._load_csv("gate_arrivals.csv")
        self.camera_frames = self._load_csv("camera_frames.csv")

    def build_model(self) -> dict[str, Any]:
        snapshots, gate_context_summaries = self._build_snapshots_and_summaries()
        default_profiles = self._build_default_profiles(gate_context_summaries)
        return {
            "engine_name": "beaver_stadium_routing_engine",
            "trained_at_utc": datetime.now(timezone.utc).isoformat(),
            "source_data_dir": str(self.data_dir),
            "gate_metadata": self.gate_metadata,
            "match_metadata": self.match_metadata,
            "context_summaries": gate_context_summaries,
            "default_gate_profiles": default_profiles,
            "dataset_snapshots": snapshots,
        }

    def _build_snapshots_and_summaries(self) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
        fan_rows: dict[tuple[str, str, int], list[dict[str, Any]]] = defaultdict(list)
        for row in self.arrivals:
            fan_rows[(row["match_id"], row["gate_id"], safe_int(row["minutes_from_kickoff"]))].append(row)

        camera_rows: dict[tuple[str, str, int], list[dict[str, Any]]] = defaultdict(list)
        for row in self.camera_frames:
            camera_rows[(row["match_id"], row["gate_id"], safe_int(row["minutes_from_kickoff"]))].append(row)

        snapshots: dict[str, dict[str, Any]] = {}
        summary_accumulator: dict[str, list[dict[str, Any]]] = defaultdict(list)

        for (match_id, gate_id, minute), rows in fan_rows.items():
            gate_state = self._aggregate_gate_state(
                match_id=match_id,
                gate_id=gate_id,
                minute=minute,
                rows=rows,
                camera_rows=camera_rows.get((match_id, gate_id, minute), []),
            )
            snapshot_key = f"{match_id}|{minute}"
            snapshots.setdefault(snapshot_key, {})[gate_id] = gate_state.to_dict()

            match_row = self.match_metadata[match_id]
            context_key = BeaverRoutingEngine._context_key(
                gate_id=gate_id,
                minute_bucket=bucket_minutes(minute),
                kickoff_bucket=match_row["kickoff_bucket"],
                weather_bucket=match_row["weather_bucket"],
                security_strictness=match_row["security_strictness"],
                premium_game_flag=match_row["premium_game_flag"],
                rivalry_flag=match_row["rivalry_flag"],
            )
            summary_accumulator[context_key].append(gate_state.to_dict())

        for snapshot_key in snapshots:
            missing = [gate for gate in GATES if gate not in snapshots[snapshot_key]]
            for gate_id in missing:
                snapshots[snapshot_key][gate_id] = self._fallback_state(gate_id, snapshot_key)

        context_summaries = {
            key: self._average_state(states) for key, states in summary_accumulator.items()
        }
        return snapshots, context_summaries

    def _aggregate_gate_state(
        self,
        match_id: str,
        gate_id: str,
        minute: int,
        rows: list[dict[str, Any]],
        camera_rows: list[dict[str, Any]],
    ) -> GateState:
        target_id = f"{match_id}_{gate_id}_{minute}"
        target = self.training_targets.get(target_id, {})
        arrivals_by_fan_type = {
            fan_type: 0.0 for fan_type in FAN_TYPES
        }
        density_levels = []
        flow_states = []
        actions = []
        alternate_gates = []
        for row in rows:
            fan_type = row["fan_type"]
            arrivals_by_fan_type[fan_type] += safe_float(row["arrivals_in_minute"])
            density_levels.append(row["predicted_density_level"])
            flow_states.append(row["dominant_flow_state"])
            actions.append(row["recommended_action"])
            alternate_gates.append(row["alternate_gate"])

        if camera_rows:
            estimated_people_visible = sum(safe_float(row["estimated_people_visible"]) for row in camera_rows) / len(camera_rows)
            density_map_sum = sum(safe_float(row["density_map_sum"]) for row in camera_rows) / len(camera_rows)
            optical_flow_magnitude = sum(safe_float(row["optical_flow_magnitude"]) for row in camera_rows) / len(camera_rows)
            detection_confidence_mean = sum(safe_float(row["detection_confidence_mean"]) for row in camera_rows) / len(camera_rows)
            super_resolution_needed = Counter(row["super_resolution_needed"] for row in camera_rows).most_common(1)[0][0] == "True"
            image_quality = mode_or_default([row["image_quality"] for row in camera_rows], "good")
            lighting_condition = mode_or_default([row["lighting_condition"] for row in camera_rows], "daylight")
            occlusion_level = mode_or_default([row["occlusion_level"] for row in camera_rows], "low")
        else:
            estimated_people_visible = 0.0
            density_map_sum = 0.0
            optical_flow_magnitude = 0.0
            detection_confidence_mean = 0.0
            super_resolution_needed = False
            image_quality = "good"
            lighting_condition = "daylight"
            occlusion_level = "low"

        return GateState(
            gate_id=gate_id,
            minutes_from_kickoff=minute,
            expected_wait_minutes=max(safe_float(row["expected_wait_minutes"]) for row in rows),
            pressure_score=max(
                safe_float(target.get("next_15min_pressure_score")),
                max(safe_float(row["pressure_score"]) for row in rows),
            ),
            gate_utilization_ratio=max(safe_float(row["gate_utilization_ratio"]) for row in rows),
            local_queue_estimate=max(safe_float(row["local_queue_estimate"]) for row in rows),
            effective_throughput=sum(safe_float(row["effective_throughput"]) for row in rows) / len(rows),
            predicted_density_level=max_by_order(density_levels, DENSITY_ORDER, "low"),
            dominant_flow_state=max_by_order(flow_states, FLOW_ORDER, "smooth_inbound"),
            recommended_action=max_by_order(actions, ACTION_ORDER, "stay"),
            alternate_gate=target.get("best_alternate_gate") or mode_or_default(alternate_gates, "F"),
            estimated_people_visible=estimated_people_visible,
            density_map_sum=density_map_sum,
            optical_flow_magnitude=optical_flow_magnitude,
            detection_confidence_mean=detection_confidence_mean,
            super_resolution_needed=super_resolution_needed,
            image_quality=image_quality,
            lighting_condition=lighting_condition,
            occlusion_level=occlusion_level,
            arrivals_by_fan_type=arrivals_by_fan_type,
        )

    def _build_default_profiles(self, context_summaries: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for key, summary in context_summaries.items():
            gate_id = key.split("|", 1)[0]
            grouped[gate_id].append(summary)
        return {gate_id: self._average_state(states) for gate_id, states in grouped.items()}

    def _average_state(self, states: list[dict[str, Any]]) -> dict[str, Any]:
        if not states:
            return {}
        numeric_fields = [
            "expected_wait_minutes",
            "pressure_score",
            "gate_utilization_ratio",
            "local_queue_estimate",
            "effective_throughput",
            "estimated_people_visible",
            "density_map_sum",
            "optical_flow_magnitude",
            "detection_confidence_mean",
        ]
        categorical_fields = [
            "predicted_density_level",
            "dominant_flow_state",
            "recommended_action",
            "alternate_gate",
            "image_quality",
            "lighting_condition",
            "occlusion_level",
        ]
        averaged = {}
        for field in numeric_fields:
            averaged[field] = round(sum(safe_float(state[field]) for state in states) / len(states), 3)
        for field in categorical_fields:
            averaged[field] = mode_or_default([state[field] for state in states], "")
        averaged["super_resolution_needed"] = Counter(state["super_resolution_needed"] for state in states).most_common(1)[0][0]

        fan_arrivals = {}
        for fan_type in FAN_TYPES:
            fan_arrivals[fan_type] = round(
                sum(safe_float(state["arrivals_by_fan_type"].get(fan_type)) for state in states) / len(states), 3
            )
        averaged["arrivals_by_fan_type"] = fan_arrivals
        return averaged

    def _fallback_state(self, gate_id: str, snapshot_key: str) -> dict[str, Any]:
        match_id, minute_str = snapshot_key.rsplit("|", 1)
        minute = safe_int(minute_str)
        match_row = self.match_metadata[match_id]
        default_wait = 1.0 + (0.8 if gate_id == "E" else 0.0) + (0.5 if gate_id == "A" and minute > -45 else 0.0)
        return {
            "gate_id": gate_id,
            "minutes_from_kickoff": minute,
            "expected_wait_minutes": default_wait,
            "pressure_score": 12.0,
            "gate_utilization_ratio": 0.3,
            "local_queue_estimate": 10.0,
            "effective_throughput": safe_float(self.gate_metadata[gate_id]["nominal_capacity_per_minute"]),
            "predicted_density_level": "low",
            "dominant_flow_state": "smooth_inbound",
            "recommended_action": "stay",
            "alternate_gate": "F",
            "estimated_people_visible": 10.0,
            "density_map_sum": 12.0,
            "optical_flow_magnitude": 0.2,
            "detection_confidence_mean": 0.92,
            "super_resolution_needed": match_row["kickoff_bucket"] == "night",
            "image_quality": "good",
            "lighting_condition": "night" if match_row["kickoff_bucket"] == "night" else "daylight",
            "occlusion_level": "low",
            "arrivals_by_fan_type": {fan_type: 0.0 for fan_type in FAN_TYPES},
        }

    def _load_csv(self, name: str) -> list[dict[str, str]]:
        with open(self.data_dir / name, newline="", encoding="utf-8") as handle:
            return list(csv.DictReader(handle))

    def _load_csv_by_key(self, name: str, key: str) -> dict[str, dict[str, str]]:
        return {row[key]: row for row in self._load_csv(name)}


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Train and run a Beaver Stadium gate-routing engine.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    train_parser = subparsers.add_parser("train", help="Train the routing engine from the Beaver Stadium datasets.")
    train_parser.add_argument("--data-dir", required=True, help="Directory containing the attached Beaver Stadium CSV/JSON files.")
    train_parser.add_argument("--model-out", required=True, help="Path to write the trained model JSON.")

    recommend_parser = subparsers.add_parser("recommend", help="Generate a gate recommendation.")
    recommend_parser.add_argument("--model", required=True, help="Path to a trained model JSON.")
    recommend_parser.add_argument("--fan-type", required=True, choices=FAN_TYPES)
    recommend_parser.add_argument("--current-gate", choices=GATES)
    recommend_parser.add_argument("--match-id", help="Use a dataset match snapshot.")
    recommend_parser.add_argument("--minute", type=int, help="Minute offset from kickoff.")
    recommend_parser.add_argument("--min-improvement", type=float, default=2.0, help="Minimum saved minutes before rerouting.")

    evaluate_parser = subparsers.add_parser("evaluate", help="Run a lightweight evaluation across dataset scenarios.")
    evaluate_parser.add_argument("--model", required=True, help="Path to a trained model JSON.")
    evaluate_parser.add_argument("--limit", type=int, help="Optional cap on evaluated scenarios.")

    return parser


def main() -> None:
    parser = build_arg_parser()
    args = parser.parse_args()

    if args.command == "train":
        engine = BeaverRoutingEngine.train_from_data(args.data_dir)
        engine.save(args.model_out)
        print(json.dumps({"status": "trained", "model_out": args.model_out}, indent=2))
        return

    if args.command == "recommend":
        engine = BeaverRoutingEngine.load(args.model)
        result = engine.recommend(
            fan_type=args.fan_type,
            current_gate=args.current_gate,
            match_id=args.match_id,
            minutes_from_kickoff=args.minute,
            min_improvement_minutes=args.min_improvement,
        )
        print(json.dumps(result, indent=2))
        return

    if args.command == "evaluate":
        engine = BeaverRoutingEngine.load(args.model)
        print(json.dumps(engine.evaluate(limit=args.limit), indent=2))
        return


if __name__ == "__main__":
    main()

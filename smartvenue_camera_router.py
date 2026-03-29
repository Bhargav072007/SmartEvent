from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from beaver_stadium_engine import BeaverRoutingEngine, FAN_TYPES, GATES, safe_float


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DATA_DIR = Path(
    os.environ.get(
        "SMARTVENUE_DATA_DIR",
        "/Users/krishang/Documents/hackathon/beaver_stadium_crowd_engine_data",
    )
)
MODEL_PATH = Path(
    os.environ.get("SMARTVENUE_MODEL_PATH", str(BASE_DIR / "beaver_stadium_model.json"))
)


@dataclass
class CameraUpdatePayload:
    gate: str = "A"
    person_count: int = 0
    density_score: float = 0.0
    pressure_score: float = 0.0
    flow_speed: float = 0.0
    flow_direction: str = "steady"
    detection_confidence: float = 0.9
    occlusion_level: str = "low"
    image_quality: str = "good"
    lighting_condition: str = "daylight"
    super_resolution_needed: bool = False
    timestamp: str | None = None
    camera_id: str | None = None


@dataclass
class GateTapPayload:
    gate: str = "A"
    user_id: str = ""
    seat_section: str = ""
    fan_type: str = "general"
    timestamp: str | None = None


@dataclass
class RecommendationPayload:
    fan_type: str = "general"
    current_gate: str | None = None
    seat_section: str | None = None
    match_id: str | None = None
    minutes_from_kickoff: int = -45
    kickoff_bucket: str = "afternoon"
    weather_bucket: str = "clear"
    security_strictness: str = "standard"
    premium_game_flag: bool = False
    rivalry_flag: bool = False
    min_improvement_minutes: float = 2.0


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def status_label(wait_minutes: float, pressure_score: float) -> str:
    if wait_minutes >= 15 or pressure_score >= 85:
        return "red"
    if wait_minutes >= 6 or pressure_score >= 55:
        return "amber"
    return "green"


def section_to_gate(seat_section: str | None) -> str:
    if not seat_section:
        return "C"
    digits = "".join(char for char in str(seat_section) if char.isdigit())
    if not digits:
        return "C"
    section_num = int(digits)
    if section_num < 20:
        return "A"
    if section_num < 40:
        return "B"
    if section_num < 60:
        return "C"
    if section_num < 80:
        return "D"
    if section_num < 100:
        return "E"
    return "F"


def section_distance(anchor_gate: str, gate: str) -> int:
    positions = {gate_id: index for index, gate_id in enumerate(GATES)}
    return abs(positions[anchor_gate] - positions[gate]) * 160


class SmartVenueService:
    def __init__(self, engine: BeaverRoutingEngine) -> None:
        self.engine = engine
        self.camera_state: dict[str, dict[str, Any]] = {
            gate: self._empty_gate_state(gate) for gate in GATES
        }
        self.tap_state: dict[str, float] = {gate: 0.0 for gate in GATES}

    def update_camera(self, payload: CameraUpdatePayload) -> dict[str, Any]:
        gate = payload.gate.upper()
        if gate not in GATES:
            raise ValueError(f"Unknown gate '{payload.gate}'")

        gate_meta = self.engine.gate_metadata[gate]
        nominal_capacity = safe_float(gate_meta["nominal_capacity_per_minute"], 100.0)
        utilization = min(2.5, payload.person_count / max(nominal_capacity, 1.0))
        normalized_pressure = payload.pressure_score if payload.pressure_score > 1.0 else payload.pressure_score * 100.0
        pressure_score = min(100.0, max(normalized_pressure, payload.density_score * 100.0 * 0.75))
        visible_load_minutes = payload.person_count / max(nominal_capacity, 1.0)
        density_penalty = payload.density_score * 4.0
        pressure_penalty = (pressure_score / 100.0) * 6.0
        flow_penalty = max(0.0, 0.55 - payload.flow_speed) * 6.5
        utilization_penalty = max(0.0, utilization - 0.75) * 5.0
        expected_wait = round(
            max(
                0.0,
                visible_load_minutes * 1.8 + density_penalty + pressure_penalty + flow_penalty + utilization_penalty,
            ),
            2,
        )
        queue_estimate = round(max(0.0, expected_wait * nominal_capacity / 4.5), 2)

        self.camera_state[gate] = {
            "gate_id": gate,
            "camera_id": payload.camera_id or f"cam_{gate.lower()}_01",
            "count": payload.person_count,
            "density_score": round(payload.density_score, 3),
            "pressure_score": round(pressure_score, 2),
            "flow_speed": round(payload.flow_speed, 3),
            "flow_direction": payload.flow_direction,
            "gate_utilization_ratio": round(utilization, 3),
            "local_queue_estimate": round(queue_estimate, 2),
            "expected_wait_minutes": round(expected_wait, 2),
            "effective_throughput": nominal_capacity,
            "detection_confidence_mean": round(payload.detection_confidence, 3),
            "estimated_people_visible": float(payload.person_count),
            "density_map_sum": round(payload.person_count * max(payload.density_score, 0.05), 2),
            "optical_flow_magnitude": round(payload.flow_speed, 3),
            "super_resolution_needed": payload.super_resolution_needed,
            "image_quality": payload.image_quality,
            "lighting_condition": payload.lighting_condition,
            "occlusion_level": payload.occlusion_level,
            "last_updated": payload.timestamp or now_iso(),
        }
        return self.live_gate(gate)

    def register_tap(self, payload: GateTapPayload) -> dict[str, Any]:
        gate = payload.gate.upper()
        if gate not in GATES:
            raise ValueError(f"Unknown gate '{payload.gate}'")
        if payload.fan_type not in FAN_TYPES:
            raise ValueError(f"Unsupported fan type '{payload.fan_type}'")
        self.tap_state[gate] = min(self.tap_state[gate] + 1.0, 9999.0)
        return {
            "status": "success",
            "entry_logged": True,
            "gate": gate,
            "seat_section": payload.seat_section,
            "fan_type": payload.fan_type,
            "timestamp": payload.timestamp or now_iso(),
        }

    def recommend(self, request: RecommendationPayload) -> dict[str, Any]:
        if request.fan_type not in FAN_TYPES:
            raise ValueError(f"Unsupported fan type '{request.fan_type}'")

        current_gate = request.current_gate.upper() if request.current_gate else section_to_gate(request.seat_section)
        if current_gate not in GATES:
            raise ValueError(f"Unknown gate '{request.current_gate}'")

        match_context = {
            "kickoff_bucket": request.kickoff_bucket,
            "weather_bucket": request.weather_bucket,
            "security_strictness": request.security_strictness,
            "premium_game_flag": str(request.premium_game_flag),
            "rivalry_flag": str(request.rivalry_flag),
            "minutes_from_kickoff": request.minutes_from_kickoff,
        }
        live_snapshot = self._build_live_snapshot(request.match_id, request.minutes_from_kickoff, match_context)
        result = self.engine.recommend(
            fan_type=request.fan_type,
            current_gate=current_gate,
            match_id=request.match_id,
            minutes_from_kickoff=request.minutes_from_kickoff,
            snapshot=live_snapshot,
            match_context=match_context,
            min_improvement_minutes=request.min_improvement_minutes,
        )
        anchor_gate = section_to_gate(request.seat_section)
        best_gate = result["recommended_gate"]
        return {
            "recommended_gate": best_gate,
            "default_gate": anchor_gate,
            "current_gate": current_gate,
            "rerouted": result["should_reroute"],
            "estimated_wait_minutes": next(
                row["projected_wait_minutes"] for row in result["ranked_gates"] if row["gate_id"] == best_gate
            ),
            "walk_distance_meters": section_distance(anchor_gate, best_gate),
            "reason": result["explanation"],
            "expected_wait_reduction_minutes": result["expected_wait_reduction_minutes"],
            "ranked_gates": [
                {
                    "gate": row["gate_id"],
                    "projected_wait_minutes": row["projected_wait_minutes"],
                    "projected_pressure_score": row["projected_pressure_score"],
                    "status": status_label(row["projected_wait_minutes"], row["projected_pressure_score"]),
                }
                for row in result["ranked_gates"]
            ],
            "timestamp": now_iso(),
        }

    def live_gate(self, gate: str) -> dict[str, Any]:
        snapshot = self._build_live_snapshot(None, -45, {})
        gate_state = snapshot[gate]
        return {
            "gate": gate,
            "count": self.camera_state[gate]["count"],
            "density_score": self.camera_state[gate]["density_score"],
            "pressure_score": gate_state["pressure_score"],
            "flow_speed": self.camera_state[gate]["flow_speed"],
            "flow_direction": self.camera_state[gate]["flow_direction"],
            "wait_min": round(gate_state["expected_wait_minutes"], 2),
            "status": status_label(gate_state["expected_wait_minutes"], gate_state["pressure_score"]),
            "predicted_density_level": gate_state["predicted_density_level"],
            "recommended_action": gate_state["recommended_action"],
            "updated_at": self.camera_state[gate]["last_updated"],
        }

    def live_gates(self) -> dict[str, Any]:
        return {gate: self.live_gate(gate) for gate in GATES}

    def stats(self) -> dict[str, Any]:
        live = self.live_gates()
        busiest_gate = max(live, key=lambda gate: live[gate]["pressure_score"])
        return {
            "total_people_detected": sum(int(self.camera_state[gate]["count"]) for gate in GATES),
            "busiest_gate": busiest_gate,
            "average_wait_minutes": round(sum(float(live[gate]["wait_min"]) for gate in GATES) / len(GATES), 2),
            "max_pressure_score": max(float(live[gate]["pressure_score"]) for gate in GATES),
            "system_status": live[busiest_gate]["status"],
            "timestamp": now_iso(),
        }

    def _build_live_snapshot(
        self,
        match_id: str | None,
        minutes_from_kickoff: int,
        match_context: dict[str, Any],
    ) -> dict[str, dict[str, Any]]:
        baseline = self.engine._get_snapshot(match_id, minutes_from_kickoff, match_context)
        snapshot: dict[str, dict[str, Any]] = {}
        for gate in GATES:
            historical = baseline.get(gate) or self.engine.default_gate_profiles[gate]
            camera = self.camera_state[gate]
            snapshot[gate] = {
                "gate_id": gate,
                "minutes_from_kickoff": minutes_from_kickoff,
                "expected_wait_minutes": round(
                    max(
                        camera["expected_wait_minutes"] * 0.92,
                        historical["expected_wait_minutes"] * 0.08 + camera["expected_wait_minutes"] * 0.92,
                    ),
                    2,
                ),
                "pressure_score": round(
                    historical["pressure_score"] * 0.15 + camera["pressure_score"] * 0.85, 2
                ),
                "gate_utilization_ratio": round(
                    historical["gate_utilization_ratio"] * 0.3 + camera["gate_utilization_ratio"] * 0.7, 3
                ),
                "local_queue_estimate": round(
                    historical["local_queue_estimate"] * 0.2 + camera["local_queue_estimate"] * 0.8, 2
                ),
                "effective_throughput": camera["effective_throughput"],
                "predicted_density_level": self._density_level(
                    historical["predicted_density_level"],
                    camera["density_score"],
                    camera["pressure_score"],
                ),
                "dominant_flow_state": self._flow_state(camera["flow_speed"], camera["pressure_score"]),
                "recommended_action": self._recommended_action(
                    gate,
                    camera["pressure_score"],
                    camera["expected_wait_minutes"],
                ),
                "alternate_gate": historical["alternate_gate"],
                "estimated_people_visible": camera["estimated_people_visible"],
                "density_map_sum": camera["density_map_sum"],
                "optical_flow_magnitude": camera["optical_flow_magnitude"],
                "detection_confidence_mean": camera["detection_confidence_mean"],
                "super_resolution_needed": camera["super_resolution_needed"],
                "image_quality": camera["image_quality"],
                "lighting_condition": camera["lighting_condition"],
                "occlusion_level": camera["occlusion_level"],
                "arrivals_by_fan_type": self._fan_mix(gate, camera["count"]),
            }
        return snapshot

    def _fan_mix(self, gate: str, person_count: int) -> dict[str, float]:
        gate_meta = self.engine.gate_metadata[gate]
        student_weight = safe_float(gate_meta["student_bias_score"])
        general_weight = safe_float(gate_meta["general_bias_score"])
        ada_weight = safe_float(gate_meta["ada_bias_score"])
        return {
            "student": round(person_count * student_weight * 0.45, 2),
            "general": round(person_count * general_weight * 0.35, 2),
            "season_ticket_holder": round(person_count * general_weight * 0.08, 2),
            "vip": round(person_count * 0.02, 2),
            "staff": round(person_count * 0.04, 2),
            "accessibility": round(person_count * ada_weight * 0.06, 2),
        }

    def _density_level(self, historical_level: str, density_score: float, pressure_score: float) -> str:
        if pressure_score >= 80 or density_score >= 0.85:
            return "critical"
        if pressure_score >= 55 or density_score >= 0.6:
            return "high"
        if pressure_score >= 30 or density_score >= 0.35:
            return "medium"
        return historical_level if historical_level == "medium" else "low"

    def _flow_state(self, flow_speed: float, pressure_score: float) -> str:
        if pressure_score >= 80 and flow_speed < 0.2:
            return "stalled"
        if pressure_score >= 55:
            return "heavy_inbound"
        if flow_speed < 0.35:
            return "mixed"
        return "smooth_inbound"

    def _recommended_action(self, gate: str, pressure_score: float, wait_minutes: float) -> str:
        if pressure_score >= 85 or wait_minutes >= 15:
            return "open_extra_lane"
        if pressure_score >= 65 or wait_minutes >= 8:
            return f"reroute_to_{self.engine.default_gate_profiles[gate]['alternate_gate']}"
        if pressure_score >= 45:
            return "deploy_staff"
        return "stay"

    def _empty_gate_state(self, gate: str) -> dict[str, Any]:
        gate_meta = self.engine.gate_metadata[gate]
        return {
            "gate_id": gate,
            "camera_id": f"cam_{gate.lower()}_01",
            "count": 0,
            "density_score": 0.0,
            "pressure_score": 0.0,
            "flow_speed": 0.0,
            "flow_direction": "steady",
            "gate_utilization_ratio": 0.0,
            "local_queue_estimate": 0.0,
            "expected_wait_minutes": 0.0,
            "effective_throughput": safe_float(gate_meta["nominal_capacity_per_minute"]),
            "detection_confidence_mean": 0.92,
            "estimated_people_visible": 0.0,
            "density_map_sum": 0.0,
            "optical_flow_magnitude": 0.0,
            "super_resolution_needed": False,
            "image_quality": "good",
            "lighting_condition": "daylight",
            "occlusion_level": "low",
            "last_updated": now_iso(),
        }


def load_or_train_engine() -> BeaverRoutingEngine:
    if MODEL_PATH.exists():
        return BeaverRoutingEngine.load(MODEL_PATH)
    engine = BeaverRoutingEngine.train_from_data(DEFAULT_DATA_DIR)
    engine.save(MODEL_PATH)
    return engine


def create_service() -> SmartVenueService:
    return SmartVenueService(load_or_train_engine())

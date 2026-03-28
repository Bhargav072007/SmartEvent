import os
import threading
import webbrowser
from datetime import datetime, timezone
from typing import Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


app = FastAPI(title="SmartVenue Routing Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


GATES = ["A", "B", "C", "D", "E", "F"]
GAME_TYPE = "whiteout"

GATE_CAPACITY = {
    "A": 60.0,
    "B": 52.0,
    "C": 50.0,
    "D": 48.0,
    "E": 42.0,
    "F": 36.0,
}

ZONE_CAPACITY = {
    "A": 120,
    "B": 110,
    "C": 100,
    "D": 95,
    "E": 85,
    "F": 70,
}

SEAT_TO_DEFAULT_GATE = {
    **{str(i): "A" for i in range(1, 20)},
    **{str(i): "B" for i in range(20, 40)},
    **{str(i): "C" for i in range(40, 60)},
    **{str(i): "D" for i in range(60, 80)},
    **{str(i): "E" for i in range(80, 100)},
    **{str(i): "F" for i in range(100, 121)},
}

SECTION_GATE_DISTANCE = {
    gate: {other: abs(index - j) * 160 for j, other in enumerate(GATES)}
    for index, gate in enumerate(GATES)
}

ARRIVAL_CURVES = {
    "whiteout": {
        "A": [0.05, 0.10, 0.20, 0.35, 0.60, 0.85, 1.00],
        "B": [0.08, 0.16, 0.28, 0.45, 0.62, 0.82, 1.00],
        "C": [0.10, 0.18, 0.30, 0.46, 0.64, 0.83, 1.00],
        "D": [0.09, 0.17, 0.29, 0.44, 0.61, 0.80, 1.00],
        "E": [0.12, 0.22, 0.36, 0.52, 0.70, 0.86, 1.00],
        "F": [0.07, 0.14, 0.25, 0.40, 0.57, 0.79, 1.00],
    }
}


class CameraUpdate(BaseModel):
    gate: str = Field(default="A")
    person_count: int = Field(default=0, ge=0)
    density_score: float = Field(default=0.0, ge=0.0, le=1.0)
    pressure_score: float = Field(default=0.0, ge=0.0, le=1.0)
    flow_speed: float = Field(default=0.0, ge=0.0)
    flow_direction: str = Field(default="steady")


class GateTap(BaseModel):
    gate: str = Field(default="A")
    user_id: str = Field(default="")
    seat_section: str = Field(default="")
    timestamp: str | None = None


gate_state: Dict[str, Dict[str, float | int | str]] = {
    gate: {
        "count": 0,
        "density_score": 0.0,
        "pressure_score": 0.0,
        "flow_speed": 0.0,
        "flow_direction": "steady",
        "status": "green",
        "wait_min": 1.0,
        "taps_per_min": 0.0,
        "predicted_congestion_10min": 0.0,
    }
    for gate in GATES
}

AUTO_OPEN_URLS = [
    "http://localhost:8000/",
    "http://localhost:8000/api/gates/live",
    "http://localhost:8000/api/gate/recommend?seat=14",
    "http://localhost:8000/api/stats/live",
    "http://localhost:8000/docs",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def open_browser_pages_once() -> None:
    # Uvicorn reload spawns multiple processes, so use an env flag to avoid opening duplicates.
    if os.environ.get("SMARTVENUE_BROWSER_OPENED") == "1":
        return

    os.environ["SMARTVENUE_BROWSER_OPENED"] = "1"
    for url in AUTO_OPEN_URLS:
        webbrowser.open_new_tab(url)


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def status_label(score: float) -> str:
    if score >= 0.75:
        return "red"
    if score >= 0.45:
        return "amber"
    return "green"


def gate_anchor_for_section(seat_section: str) -> str:
    return SEAT_TO_DEFAULT_GATE.get(str(seat_section), "C")


def predict_congestion_10min(gate: str, game_type: str = GAME_TYPE, minutes_to_kickoff: int = 45) -> float:
    curve = ARRIVAL_CURVES.get(game_type, ARRIVAL_CURVES["whiteout"])[gate]
    buckets = [90, 75, 60, 45, 30, 15, 0]
    current_idx = min(range(len(buckets)), key=lambda i: abs(buckets[i] - minutes_to_kickoff))
    future_idx = min(range(len(buckets)), key=lambda i: abs(buckets[i] - (minutes_to_kickoff - 10)))
    delta = max(0.0, curve[future_idx] - curve[current_idx])
    projected = gate_state[gate]["density_score"] + delta * 0.9
    return round(clamp(projected), 2)


def recompute_gate(gate: str) -> None:
    state = gate_state[gate]
    tap_component = clamp(float(state["taps_per_min"]) / GATE_CAPACITY[gate])
    camera_component = clamp(float(state["density_score"]))
    pressure_component = clamp(float(state["pressure_score"]))

    congestion = clamp((tap_component * 0.35) + (camera_component * 0.45) + (pressure_component * 0.20))
    predicted = predict_congestion_10min(gate)
    wait_min = round(1.0 + congestion * 10.0 + predicted * 2.0, 1)

    state["predicted_congestion_10min"] = predicted
    state["status"] = status_label(congestion)
    state["wait_min"] = wait_min
    state["congestion_score"] = round(congestion, 2)


def all_gate_cards() -> Dict[str, Dict[str, float | int | str | bool]]:
    cards: Dict[str, Dict[str, float | int | str | bool]] = {}
    for gate in GATES:
        recompute_gate(gate)
        state = gate_state[gate]
        cards[gate] = {
            "count": state["count"],
            "density_score": state["density_score"],
            "pressure_score": state["pressure_score"],
            "flow_speed": state["flow_speed"],
            "flow_direction": state["flow_direction"],
            "taps_per_min": state["taps_per_min"],
            "congestion_score": state["congestion_score"],
            "predicted_congestion_10min": state["predicted_congestion_10min"],
            "wait_min": state["wait_min"],
            "status": state["status"],
            "surge_alert": state["predicted_congestion_10min"] >= 0.75 and state["congestion_score"] < 0.75,
        }
    return cards


def choose_gate_for_seat(seat: str) -> dict:
    default_gate = gate_anchor_for_section(seat)
    default_anchor = gate_anchor_for_section(seat)
    options = []

    for gate in GATES:
        recompute_gate(gate)
        state = gate_state[gate]
        walk_distance = SECTION_GATE_DISTANCE[default_anchor][gate]
        cost = (
            state["congestion_score"] * 0.55
            + state["predicted_congestion_10min"] * 0.25
            + min(walk_distance / 600.0, 1.0) * 0.20
        )
        options.append(
            {
                "gate": gate,
                "cost": round(cost, 3),
                "walk_distance_meters": walk_distance,
                "wait_min": state["wait_min"],
                "status": state["status"],
                "predicted_congestion_10min": state["predicted_congestion_10min"],
            }
        )

    options.sort(key=lambda item: item["cost"])
    best = options[0]
    alternative = options[1]
    rerouted = best["gate"] != default_gate

    return {
        "recommended_gate": best["gate"],
        "default_gate": default_gate,
        "rerouted": rerouted,
        "estimated_wait_minutes": best["wait_min"],
        "walk_distance_meters": best["walk_distance_meters"],
        "congestion_level": best["status"],
        "predicted_in_10min": best["predicted_congestion_10min"],
        "alternative_gate": alternative["gate"],
        "reason": (
            f"Predicted congestion at Gate {default_gate} is higher than Gate {best['gate']}"
            if rerouted
            else f"Gate {default_gate} is currently the best route"
        ),
    }


@app.get("/")
def root():
    return {
        "service": "SmartVenue Routing Engine",
        "status": "online",
        "timestamp": now_iso(),
    }


@app.on_event("startup")
async def startup_event():
    threading.Timer(1.0, open_browser_pages_once).start()


@app.post("/api/camera/update")
def camera_update(payload: CameraUpdate):
    gate = payload.gate.upper()
    if gate not in gate_state:
        return {"status": "error", "message": f"Unknown gate '{payload.gate}'"}

    gate_state[gate]["count"] = payload.person_count
    gate_state[gate]["density_score"] = round(payload.density_score, 2)
    gate_state[gate]["pressure_score"] = round(payload.pressure_score, 2)
    gate_state[gate]["flow_speed"] = round(payload.flow_speed, 2)
    gate_state[gate]["flow_direction"] = payload.flow_direction
    recompute_gate(gate)

    return {
        "status": "ok",
        "gate": gate,
        "updated_at": now_iso(),
        "gate_state": all_gate_cards()[gate],
    }


@app.post("/api/gate/tap")
def gate_tap(payload: GateTap):
    gate = payload.gate.upper()
    if gate not in gate_state:
        return {"status": "error", "message": f"Unknown gate '{payload.gate}'"}

    next_rate = min(float(gate_state[gate]["taps_per_min"]) + 1.0, GATE_CAPACITY[gate] * 1.5)
    gate_state[gate]["taps_per_min"] = round(next_rate, 2)
    recompute_gate(gate)

    return {
        "status": "success",
        "entry_logged": True,
        "gate": gate,
        "seat_section": payload.seat_section,
        "timestamp": payload.timestamp or now_iso(),
    }


@app.get("/api/gates/live")
def gates_live():
    return {
        "gates": all_gate_cards(),
        "timestamp": now_iso(),
    }


@app.get("/api/gate/recommend")
def gate_recommend(seat: str = "1", user_id: str = ""):
    recommendation = choose_gate_for_seat(seat)
    return {
        **recommendation,
        "user_id": user_id,
        "seat_section": seat,
        "timestamp": now_iso(),
    }


@app.get("/api/stats/live")
def stats_live():
    cards = all_gate_cards()
    busiest_gate = max(cards, key=lambda gate: cards[gate]["congestion_score"])
    total_people = sum(int(cards[gate]["count"]) for gate in GATES)
    average_wait = round(sum(float(cards[gate]["wait_min"]) for gate in GATES) / len(GATES), 1)
    max_pressure = round(max(float(cards[gate]["pressure_score"]) for gate in GATES), 2)

    return {
        "total_people_detected": total_people,
        "busiest_gate": busiest_gate,
        "average_wait_minutes": average_wait,
        "max_pressure_score": max_pressure,
        "system_status": "critical" if max_pressure >= 0.8 else "warning" if max_pressure >= 0.5 else "normal",
        "timestamp": now_iso(),
    }

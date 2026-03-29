from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd


OUTPUT_DIR = Path(__file__).resolve().parent
RNG = np.random.default_rng(20260328)

OFFICIAL_CAPACITY = 106572
NAMED_GATES = ["A", "B", "C", "D", "E", "F"]
FAN_TYPES = ["student", "general", "season_ticket_holder", "vip", "staff", "accessibility"]
PRESSURE_LEVELS = ["low", "medium", "high", "critical"]
FLOW_STATES = ["smooth_inbound", "heavy_inbound", "mixed", "stalled"]
RECOMMENDED_ACTIONS = [
    "stay",
    "reroute_to_B",
    "reroute_to_C",
    "reroute_to_D",
    "reroute_to_E",
    "reroute_to_F",
    "open_extra_lane",
    "deploy_staff",
    "manual_monitoring",
]
KICKOFF_BUCKETS = ["noon", "afternoon", "night"]
WEATHER_BUCKETS = ["clear", "cool_clear", "light_rain", "heavy_rain", "windy"]
SECURITY_STRICTNESS = ["standard", "elevated", "tight"]


def build_venue_metadata() -> dict:
    return {
        "venue_id": "beaver_stadium_psu",
        "venue_name": "Beaver Stadium",
        "university": "Penn State",
        "city": "University Park",
        "state": "Pennsylvania",
        "official_capacity": OFFICIAL_CAPACITY,
        "named_gates": NAMED_GATES,
        "official_public_facts": [
            "Beaver Stadium is Penn State's football stadium in University Park, Pennsylvania.",
            "Public capacity anchor used here is 106,572.",
            "Publicly identified named gates include A, B, C, D, E, and F.",
            "Gate A is treated as the student entrance.",
            "Gate B is associated with ADA shuttle drop access.",
            "Gate E is associated with ticket and will-call activity.",
            "Beaver Stadium is a very large college football venue with pronounced pre-kickoff crowd surges.",
            "The project concept is SmartVenue PSU, designed for Beaver Stadium and adaptable beyond it.",
        ],
        "modeled_assumptions": [
            "Gate A has the strongest late student-arrival pressure near kickoff.",
            "Gate B has steadier arrivals with accessibility-related traffic and lower-mobility pacing.",
            "Gate E has intermittent ticketing friction and slightly slower effective throughput.",
            "Gates C, D, and F absorb general-public balancing and rerouted demand.",
            "Premium and rivalry games create stronger late surges and higher crowd pressure.",
            "Night games sharpen late-arrival behavior relative to noon games.",
            "Bad weather makes arrivals more bursty and increases screening friction.",
            "Security slowdowns can create nonlinear queue growth even without total demand spikes.",
        ],
        "notes": "Public facts are used as anchors; operational rates, arrival curves, and camera behavior are modeled for realistic prototyping.",
    }


def build_gate_metadata() -> pd.DataFrame:
    rows = [
        {
            "gate_id": "A",
            "gate_role": "student entrance",
            "primary_fan_mix": "student-heavy with some staff and season ticket spillover",
            "nominal_capacity_per_minute": 250,
            "throughput_risk": "high late-surge compression risk",
            "accessibility_factor": 0.20,
            "ticketing_friction_factor": 0.08,
            "student_bias_score": 0.98,
            "general_bias_score": 0.34,
            "ada_bias_score": 0.10,
            "notes": "Strongest pre-kickoff student clustering and the most frequent surge behavior.",
        },
        {
            "gate_id": "B",
            "gate_role": "ADA shuttle and accessibility access",
            "primary_fan_mix": "accessibility-heavy with steadier companion and staff flow",
            "nominal_capacity_per_minute": 115,
            "throughput_risk": "moderate screening sensitivity but steadier arrivals",
            "accessibility_factor": 1.00,
            "ticketing_friction_factor": 0.05,
            "student_bias_score": 0.05,
            "general_bias_score": 0.28,
            "ada_bias_score": 0.98,
            "notes": "Steadier inbound curve shaped by ADA shuttle access and lower-mobility movement.",
        },
        {
            "gate_id": "C",
            "gate_role": "general balancing gate",
            "primary_fan_mix": "general fans and season ticket holders",
            "nominal_capacity_per_minute": 215,
            "throughput_risk": "moderate",
            "accessibility_factor": 0.30,
            "ticketing_friction_factor": 0.06,
            "student_bias_score": 0.18,
            "general_bias_score": 0.82,
            "ada_bias_score": 0.18,
            "notes": "Acts as a relief valve when nearby demand shifts away from Gate A or E.",
        },
        {
            "gate_id": "D",
            "gate_role": "general balancing gate",
            "primary_fan_mix": "general fans and season ticket holders",
            "nominal_capacity_per_minute": 205,
            "throughput_risk": "moderate",
            "accessibility_factor": 0.32,
            "ticketing_friction_factor": 0.05,
            "student_bias_score": 0.14,
            "general_bias_score": 0.78,
            "ada_bias_score": 0.20,
            "notes": "General-public gate with moderate reroute absorption during peak surges.",
        },
        {
            "gate_id": "E",
            "gate_role": "ticketing and will-call gate",
            "primary_fan_mix": "general fans with some walk-up ticket handling",
            "nominal_capacity_per_minute": 170,
            "throughput_risk": "high friction risk due to ticket handling",
            "accessibility_factor": 0.25,
            "ticketing_friction_factor": 0.30,
            "student_bias_score": 0.10,
            "general_bias_score": 0.74,
            "ada_bias_score": 0.16,
            "notes": "Not always the busiest gate, but often more delay-prone because of ticketing friction.",
        },
        {
            "gate_id": "F",
            "gate_role": "general overflow balancing gate",
            "primary_fan_mix": "general overflow and redistributed public demand",
            "nominal_capacity_per_minute": 225,
            "throughput_risk": "moderate with relief-gate behavior",
            "accessibility_factor": 0.26,
            "ticketing_friction_factor": 0.04,
            "student_bias_score": 0.12,
            "general_bias_score": 0.86,
            "ada_bias_score": 0.14,
            "notes": "Useful overflow gate during overload or reroute scenarios from A and E.",
        },
    ]
    return pd.DataFrame(rows)


def build_paper_capabilities() -> pd.DataFrame:
    rows = [
        {
            "paper_id": "crowdvlm_r1_2025",
            "paper_name": "CrowdVLM-R1",
            "year": 2025,
            "category": "foundation crowd reasoning model",
            "what_it_does": "Provides high-level scene understanding and contextual crowd interpretation from lower-level vision signals.",
            "what_we_use_it_for": "Turn Beaver Stadium gate signals into human-readable operator explanations and dashboard summaries.",
            "strengths": "Strong context fusion and scene-level explanation.",
            "weaknesses": "Depends on reliable upstream perception signals and is not the first-line low-latency edge model.",
            "expected_inputs": "image features; density estimates; detection counts; movement signals",
            "expected_outputs": "scene interpretation; crowd-state labels; textual summaries",
            "beaver_stadium_role": "Explain late student surge at Gate A, ticket friction at Gate E, and balancing load at C/D/F.",
        },
        {
            "paper_id": "hmstunet_2026",
            "paper_name": "HMSTUNet",
            "year": 2026,
            "category": "density heatmap generation / crowd counting",
            "what_it_does": "Produces density maps that remain useful when dense crowds make boxes unreliable.",
            "what_we_use_it_for": "Estimate queue density around packed Beaver Stadium gates and concourse hotspots.",
            "strengths": "Performs well in dense scenes and supports hotspot reasoning.",
            "weaknesses": "Needs calibration and more compute than lightweight edge models.",
            "expected_inputs": "camera frame; optionally enhanced frame",
            "expected_outputs": "density heatmap; total estimated people count; hotspot intensity",
            "beaver_stadium_role": "Primary density layer for Gate A surges and packed pre-kickoff scenes.",
        },
        {
            "paper_id": "pet_iccv_2023",
            "paper_name": "PET",
            "year": 2023,
            "category": "point-level localization",
            "what_it_does": "Localizes people through points rather than full boxes, especially in dense scenes.",
            "what_we_use_it_for": "Measure dense queue concentration near gates when person boxes overlap heavily.",
            "strengths": "More robust than boxes in highly occluded packed lines.",
            "weaknesses": "Requires point-supervised workflows and may be less intuitive than boxes for some operators.",
            "expected_inputs": "camera frame",
            "expected_outputs": "point locations; point counts; local cluster intensity",
            "beaver_stadium_role": "Dense-scene localization support for Gate A and heavy premium-game entry windows.",
        },
        {
            "paper_id": "ffnet_2024",
            "paper_name": "FFNet",
            "year": 2024,
            "category": "real-time deployment model",
            "what_it_does": "Provides low-latency practical inference suitable for edge deployment.",
            "what_we_use_it_for": "Drive MVP-friendly live updates at Beaver Stadium gates and app dashboards.",
            "strengths": "Fast and deployment-oriented.",
            "weaknesses": "Less expressive than larger specialist models.",
            "expected_inputs": "camera frame; gate metadata",
            "expected_outputs": "fast crowd-state estimates and lightweight count signals",
            "beaver_stadium_role": "Low-latency inference backbone for real-time gate monitoring.",
        },
        {
            "paper_id": "proactive_crowd_flow_2025",
            "paper_name": "Proactive Crowd Flow",
            "year": 2025,
            "category": "crowd-flow forecasting / intervention planning",
            "what_it_does": "Forecasts congestion and identifies where proactive intervention is needed.",
            "what_we_use_it_for": "Predict emerging gate overloads and support preemptive Beaver Stadium reroutes.",
            "strengths": "Supports proactive staffing and routing before queues become critical.",
            "weaknesses": "Forecast quality depends on historical realism and live signal quality.",
            "expected_inputs": "historical arrivals; live counts; event context",
            "expected_outputs": "short-horizon congestion forecasts; overload warnings; action suggestions",
            "beaver_stadium_role": "Forecast late surges at Gate A and friction risk at Gate E before they peak.",
        },
        {
            "paper_id": "yolov8_2023",
            "paper_name": "YOLOv8",
            "year": 2023,
            "category": "live bounding box detection",
            "what_it_does": "Performs real-time person detection using bounding boxes.",
            "what_we_use_it_for": "First-pass queue size estimates and lower-density gate visibility.",
            "strengths": "Fast and mature for operational deployment.",
            "weaknesses": "Undercounts more often in dense and occluded scenes.",
            "expected_inputs": "camera frame",
            "expected_outputs": "bounding boxes; person count; confidence scores",
            "beaver_stadium_role": "Primary moderate-density detector at C, D, and F, with degraded trust in packed scenes.",
        },
        {
            "paper_id": "real_esrgan_2021",
            "paper_name": "Real-ESRGAN",
            "year": 2021,
            "category": "super-resolution / pixelation correction",
            "what_it_does": "Enhances blurry or low-resolution imagery before downstream vision tasks.",
            "what_we_use_it_for": "Improve poor Beaver Stadium gate-camera footage during low light or compression.",
            "strengths": "Can recover detail that helps downstream methods.",
            "weaknesses": "Adds latency and may introduce artifacts.",
            "expected_inputs": "low-quality frame",
            "expected_outputs": "enhanced frame; image-quality improvement indicator",
            "beaver_stadium_role": "Selective enhancement for night games, rain, and zoomed camera views.",
        },
        {
            "paper_id": "b2bdet_2024",
            "paper_name": "B2BDet",
            "year": 2024,
            "category": "super-resolution plus detection validation",
            "what_it_does": "Measures whether enhancement actually improves downstream detection.",
            "what_we_use_it_for": "Validate when enhancement helps Gate E or night-game detection rather than assuming it always helps.",
            "strengths": "Prevents false trust in visually nicer but operationally worse frames.",
            "weaknesses": "Adds evaluation complexity and is not itself the main detector.",
            "expected_inputs": "raw and enhanced frames; detection outputs",
            "expected_outputs": "validation metrics; enhanced-vs-original comparison features",
            "beaver_stadium_role": "Quality-control layer for super-resolution-assisted gate monitoring.",
        },
        {
            "paper_id": "farneback_2003",
            "paper_name": "Farneback Optical Flow",
            "year": 2003,
            "category": "motion estimation / movement direction",
            "what_it_does": "Estimates motion fields between consecutive frames and dominant direction.",
            "what_we_use_it_for": "Detect surges, stalls, and mixed flows at Beaver Stadium entry lines.",
            "strengths": "Simple, interpretable, and useful without deep labels.",
            "weaknesses": "Sensitive to camera shake, rain, and visual noise.",
            "expected_inputs": "consecutive frames",
            "expected_outputs": "motion magnitude; dominant flow direction; flow stability",
            "beaver_stadium_role": "Highlight inbound surge windows and detect when queues begin to stall.",
        },
        {
            "paper_id": "fruin_los_1971",
            "paper_name": "Fruin Level of Service",
            "year": 1971,
            "category": "crowd pressure / pedestrian safety scoring",
            "what_it_does": "Converts density and movement conditions into interpretable service and safety levels.",
            "what_we_use_it_for": "Translate gate queue state into low/medium/high/critical crowd pressure at Beaver Stadium.",
            "strengths": "Interpretable and operationally intuitive.",
            "weaknesses": "Requires calibrated assumptions and simplifies complex human behavior.",
            "expected_inputs": "density; queue; movement state",
            "expected_outputs": "pressure_score; density_level; safety class",
            "beaver_stadium_role": "Primary operator-facing safety layer for entry risk and intervention thresholds.",
        },
        {
            "paper_id": "gabppo_2024",
            "paper_name": "GABPPO",
            "year": 2024,
            "category": "gate routing optimization / reinforcement learning",
            "what_it_does": "Learns routing and resource-allocation actions under changing crowd conditions.",
            "what_we_use_it_for": "Recommend alternate Beaver Stadium gates or operational interventions.",
            "strengths": "Optimizes wait reduction and balancing under uneven demand.",
            "weaknesses": "Depends on realistic state features and trustworthy constraints.",
            "expected_inputs": "gate state features; forecasts; safety scores",
            "expected_outputs": "recommended action; alternate gate; expected wait reduction",
            "beaver_stadium_role": "Decision layer for rerouting away from overloaded A or friction-heavy E toward C, D, or F.",
        },
    ]
    return pd.DataFrame(rows)


def build_model_registry() -> list[dict]:
    return [
        {
            "paper_id": "crowdvlm_r1_2025",
            "name": "CrowdVLM-R1",
            "year": 2025,
            "category": "scene interpretation",
            "role_in_system": "Top-level crowd interpretation layer that converts visual and temporal signals into human-readable Beaver Stadium summaries.",
            "upstream_dependencies": ["YOLOv8", "HMSTUNet", "PET", "Farneback Optical Flow"],
            "downstream_dependencies": ["operator dashboard", "alerting layer"],
            "expected_inputs": ["image features", "density estimates", "detection counts", "movement signals"],
            "expected_outputs": ["scene-level interpretation", "qualitative crowd labels", "operator-facing textual summary"],
            "evaluation_metrics": ["label accuracy", "operator usefulness score", "explanation consistency"],
            "strengths": ["context fusion", "operator-readable reasoning"],
            "failure_modes": ["misleading summaries if upstream counts are wrong", "generic phrasing under unseen conditions"],
            "deployment_constraints": ["not the lowest-latency model", "best used on top of reliable perception"],
            "notes": "Useful for explanations such as Gate A overload from late student arrival or Gate E friction from ticket handling.",
        },
        {
            "paper_id": "hmstunet_2026",
            "name": "HMSTUNet",
            "year": 2026,
            "category": "density estimation",
            "role_in_system": "Primary dense-scene density layer for gate and concourse crowd estimation.",
            "upstream_dependencies": ["camera frames", "optional enhanced frames"],
            "downstream_dependencies": ["Fruin LOS", "CrowdVLM-R1", "forecasting features"],
            "expected_inputs": ["camera frame", "enhanced frame when needed"],
            "expected_outputs": ["density heatmap", "estimated people count", "hotspot intensity"],
            "evaluation_metrics": ["MAE", "RMSE", "heatmap alignment"],
            "strengths": ["good in dense scenes", "spatial hotspot visibility"],
            "failure_modes": ["reduced fidelity under severe weather glare", "needs calibration for geometry"],
            "deployment_constraints": ["moderate compute", "best with consistent camera placement"],
            "notes": "Most valuable in high-pressure Gate A and premium-game scenes.",
        },
        {
            "paper_id": "pet_iccv_2023",
            "name": "PET",
            "year": 2023,
            "category": "point localization",
            "role_in_system": "Point-level localization layer for dense and occluded gate scenes.",
            "upstream_dependencies": ["camera frames"],
            "downstream_dependencies": ["queue measurement", "dense-scene validation"],
            "expected_inputs": ["camera frame"],
            "expected_outputs": ["point locations", "point counts", "local cluster intensity"],
            "evaluation_metrics": ["point precision", "point recall", "localization error"],
            "strengths": ["better than boxes in dense scenes", "annotation-efficient"],
            "failure_modes": ["head merges in tightly packed crowds", "camera angle sensitivity"],
            "deployment_constraints": ["requires point-based supervision"],
            "notes": "Supports packed entry-line measurement where boxes overlap.",
        },
        {
            "paper_id": "ffnet_2024",
            "name": "FFNet",
            "year": 2024,
            "category": "real-time deployment",
            "role_in_system": "Low-latency edge inference backbone for live gate updates.",
            "upstream_dependencies": ["camera frames", "gate metadata"],
            "downstream_dependencies": ["dashboard", "forecast refresh"],
            "expected_inputs": ["camera frame", "camera metadata"],
            "expected_outputs": ["fast crowd estimates", "state signals"],
            "evaluation_metrics": ["fps", "latency_ms", "MAE"],
            "strengths": ["fast", "deployment-friendly"],
            "failure_modes": ["reduced detail in very dense scenes", "weather sensitivity"],
            "deployment_constraints": ["edge-friendly hardware still preferred"],
            "notes": "Core real-time model for MVP deployment.",
        },
        {
            "paper_id": "proactive_crowd_flow_2025",
            "name": "Proactive Crowd Flow",
            "year": 2025,
            "category": "forecasting",
            "role_in_system": "Forecast near-future gate congestion and intervention windows.",
            "upstream_dependencies": ["gate arrivals", "live counts", "match metadata"],
            "downstream_dependencies": ["GABPPO", "staffing recommendations"],
            "expected_inputs": ["time-series arrivals", "weather context", "kickoff context"],
            "expected_outputs": ["short-horizon congestion forecasts", "overload warnings", "action suggestions"],
            "evaluation_metrics": ["RMSE", "MAPE", "lead-time gain"],
            "strengths": ["proactive operations support", "context-aware forecasting"],
            "failure_modes": ["sudden disruptions break forecasts", "overreliance on historical priors"],
            "deployment_constraints": ["needs ongoing time-series storage"],
            "notes": "Critical for detecting when Gate A or E will fail before queues fully form.",
        },
        {
            "paper_id": "yolov8_2023",
            "name": "YOLOv8",
            "year": 2023,
            "category": "detection",
            "role_in_system": "Live bounding-box detector for lower-density and moderate-density gate scenes.",
            "upstream_dependencies": ["camera frames"],
            "downstream_dependencies": ["CrowdVLM-R1", "validation layer"],
            "expected_inputs": ["camera frame"],
            "expected_outputs": ["bounding boxes", "person count", "confidence scores"],
            "evaluation_metrics": ["mAP", "precision", "recall", "fps"],
            "strengths": ["real-time", "mature operational tooling"],
            "failure_modes": ["undercounting in dense occlusion", "false positives from signage or flags"],
            "deployment_constraints": ["resolution must support person scale"],
            "notes": "Best for general balancing gates before scenes become too packed.",
        },
        {
            "paper_id": "real_esrgan_2021",
            "name": "Real-ESRGAN",
            "year": 2021,
            "category": "image enhancement",
            "role_in_system": "Selective enhancement of low-quality gate footage before downstream inference.",
            "upstream_dependencies": ["raw frames"],
            "downstream_dependencies": ["YOLOv8", "PET", "HMSTUNet"],
            "expected_inputs": ["low-quality frame"],
            "expected_outputs": ["enhanced frame", "quality improvement indicator"],
            "evaluation_metrics": ["SSIM", "PSNR", "downstream detection delta"],
            "strengths": ["improves low-quality imagery", "helps night or compressed feeds"],
            "failure_modes": ["artifact hallucination", "latency overhead"],
            "deployment_constraints": ["best used selectively, not always-on"],
            "notes": "Especially relevant for rainy or night-game footage.",
        },
        {
            "paper_id": "b2bdet_2024",
            "name": "B2BDet",
            "year": 2024,
            "category": "detection validation",
            "role_in_system": "Validate whether enhancement materially improves detection quality.",
            "upstream_dependencies": ["raw frames", "enhanced frames", "detector outputs"],
            "downstream_dependencies": ["enhancement policy"],
            "expected_inputs": ["baseline detection outputs", "enhanced detection outputs"],
            "expected_outputs": ["validation metrics", "comparison features"],
            "evaluation_metrics": ["mAP delta", "precision delta", "recall delta"],
            "strengths": ["prevents blind trust in enhancement", "gives measurable value check"],
            "failure_modes": ["validation set mismatch", "unstable gains across scenes"],
            "deployment_constraints": ["evaluation workflow, not direct gate deployment"],
            "notes": "Useful for deciding whether Gate E night footage should be enhanced before detection.",
        },
        {
            "paper_id": "farneback_2003",
            "name": "Farneback Optical Flow",
            "year": 2003,
            "category": "motion estimation",
            "role_in_system": "Estimate dominant crowd movement toward gates and detect stalls or turbulence.",
            "upstream_dependencies": ["consecutive frames"],
            "downstream_dependencies": ["Fruin LOS", "CrowdVLM-R1"],
            "expected_inputs": ["frame_t", "frame_t_plus_1"],
            "expected_outputs": ["motion magnitude", "dominant flow direction", "flow stability"],
            "evaluation_metrics": ["direction consistency", "runtime_ms", "motion anomaly recall"],
            "strengths": ["interpretable", "works without deep labels"],
            "failure_modes": ["camera shake", "weather reflections"],
            "deployment_constraints": ["camera stabilization helps"],
            "notes": "Flow spikes align with pre-kickoff surges and queue compression.",
        },
        {
            "paper_id": "fruin_los_1971",
            "name": "Fruin Level of Service",
            "year": 1971,
            "category": "safety scoring",
            "role_in_system": "Convert density, queue, and movement into interpretable pressure and service levels.",
            "upstream_dependencies": ["density layer", "queue features", "motion layer"],
            "downstream_dependencies": ["GABPPO", "dashboard alerts"],
            "expected_inputs": ["density", "queue", "movement"],
            "expected_outputs": ["pressure_score", "density_level", "service class"],
            "evaluation_metrics": ["alert precision", "operator trust"],
            "strengths": ["interpretable", "simple operational semantics"],
            "failure_modes": ["sensitive to calibration assumptions", "cannot capture all human behavior"],
            "deployment_constraints": ["requires venue-specific threshold tuning"],
            "notes": "Safety layer behind low/medium/high/critical state labels.",
        },
        {
            "paper_id": "gabppo_2024",
            "name": "GABPPO",
            "year": 2024,
            "category": "gate routing",
            "role_in_system": "Optimize routing and staffing actions under uneven Beaver Stadium arrivals.",
            "upstream_dependencies": ["forecasting", "pressure scores", "gate metadata"],
            "downstream_dependencies": ["fan app recommendations", "operator actions"],
            "expected_inputs": ["gate states", "predicted demand", "pressure features"],
            "expected_outputs": ["recommended action", "alternate gate", "expected wait reduction"],
            "evaluation_metrics": ["wait reduction", "queue reduction", "constraint violations"],
            "strengths": ["action-oriented optimization", "good for balancing uneven gates"],
            "failure_modes": ["bad upstream inputs degrade policy quality", "sim-to-real mismatch"],
            "deployment_constraints": ["should be guarded by safety and operational rules"],
            "notes": "Used to shift demand away from Gate A and friction-heavy Gate E toward C, D, or F.",
        },
    ]


def build_system_mapping() -> pd.DataFrame:
    rows = [
        {
            "subsystem": "scene_interpretation",
            "primary_method": "CrowdVLM-R1",
            "backup_method": "rule-based summary layer",
            "input_source": "fused vision outputs and gate state features",
            "output_artifact": "operator-facing crowd summary",
            "real_time_or_batch": "real-time",
            "why_selected": "Needed to turn dense technical signals into Beaver Stadium-specific explanations.",
        },
        {
            "subsystem": "detection",
            "primary_method": "YOLOv8",
            "backup_method": "FFNet lightweight count head",
            "input_source": "live gate camera frames",
            "output_artifact": "person bounding boxes and first-pass count",
            "real_time_or_batch": "real-time",
            "why_selected": "Strong baseline for moderate-density gate scenes and live observability.",
        },
        {
            "subsystem": "density_estimation",
            "primary_method": "HMSTUNet",
            "backup_method": "CrowdVLM-R1 crowd-state prior",
            "input_source": "camera frame and optional enhanced frame",
            "output_artifact": "density heatmap and estimated total count",
            "real_time_or_batch": "real-time",
            "why_selected": "Dense pre-kickoff scenes require heatmaps beyond simple boxes.",
        },
        {
            "subsystem": "point_localization",
            "primary_method": "PET",
            "backup_method": "YOLOv8 box centers",
            "input_source": "dense gate camera frames",
            "output_artifact": "point locations and dense queue clusters",
            "real_time_or_batch": "batch",
            "why_selected": "Dense occlusion makes point-based localization more stable than box-only logic.",
        },
        {
            "subsystem": "image_enhancement",
            "primary_method": "Real-ESRGAN",
            "backup_method": "raw feed passthrough",
            "input_source": "low-quality or compressed frames",
            "output_artifact": "enhanced frame",
            "real_time_or_batch": "batch",
            "why_selected": "Selective enhancement is useful for night, rain, and compressed camera conditions.",
        },
        {
            "subsystem": "detection_validation",
            "primary_method": "B2BDet",
            "backup_method": "manual detector A/B evaluation",
            "input_source": "baseline and enhanced detector outputs",
            "output_artifact": "enhancement quality validation metrics",
            "real_time_or_batch": "batch",
            "why_selected": "Needed to prove enhancement helps rather than hurts operational detection quality.",
        },
        {
            "subsystem": "motion_estimation",
            "primary_method": "Farneback Optical Flow",
            "backup_method": "frame differencing",
            "input_source": "consecutive gate or concourse frames",
            "output_artifact": "motion magnitude and dominant flow state",
            "real_time_or_batch": "real-time",
            "why_selected": "Captures inbound surges, stalls, and mixed movement efficiently.",
        },
        {
            "subsystem": "safety_scoring",
            "primary_method": "Fruin Level of Service",
            "backup_method": "queue-plus-density threshold rules",
            "input_source": "density, queue, and motion features",
            "output_artifact": "pressure score and density level",
            "real_time_or_batch": "real-time",
            "why_selected": "Provides interpretable operational risk labels for Beaver Stadium entry conditions.",
        },
        {
            "subsystem": "congestion_forecasting",
            "primary_method": "Proactive Crowd Flow",
            "backup_method": "historical gate curve extrapolation",
            "input_source": "arrivals history, live gate state, match context",
            "output_artifact": "short-horizon congestion forecast",
            "real_time_or_batch": "batch",
            "why_selected": "The engine needs proactive rerouting, not just reactive monitoring.",
        },
        {
            "subsystem": "gate_routing",
            "primary_method": "GABPPO",
            "backup_method": "rule-based rerouting policy",
            "input_source": "forecast demand, pressure scores, gate capacities",
            "output_artifact": "recommended action and alternate gate",
            "real_time_or_batch": "real-time",
            "why_selected": "Optimizes gate balancing under the very uneven arrival behavior seen at Beaver Stadium.",
        },
    ]
    return pd.DataFrame(rows)


def kickoff_datetime_for(index: int, bucket: str) -> pd.Timestamp:
    base_date = pd.Timestamp("2025-08-30")
    date = base_date + pd.Timedelta(days=7 * index)
    hour = {"noon": 12, "afternoon": 15, "night": 19}[bucket]
    return date + pd.Timedelta(hours=hour)


def build_match_metadata(n_matches: int = 48) -> pd.DataFrame:
    opponents = [
        ("Akron", "lower"),
        ("Ball State", "lower"),
        ("Temple", "regional"),
        ("Indiana", "conference"),
        ("Illinois", "conference"),
        ("Rutgers", "conference"),
        ("Maryland", "conference"),
        ("Minnesota", "conference"),
        ("Michigan State", "conference"),
        ("Iowa", "upper"),
        ("Michigan", "elite"),
        ("Ohio State", "elite"),
    ]
    rows = []
    for idx in range(n_matches):
        season_year = 2025 + idx // 12
        opponent_name, opponent_tier = opponents[idx % len(opponents)]
        kickoff_bucket = KICKOFF_BUCKETS[idx % len(KICKOFF_BUCKETS)]
        kickoff_dt = kickoff_datetime_for(idx, kickoff_bucket).replace(year=season_year)
        weekend_flag = True if idx % 6 != 4 else False
        rivalry_flag = opponent_name in {"Ohio State", "Michigan"}
        premium_game_flag = rivalry_flag or opponent_tier == "elite" or idx % 9 == 0
        weather_bucket = WEATHER_BUCKETS[idx % len(WEATHER_BUCKETS)]
        security = "tight" if rivalry_flag else "elevated" if premium_game_flag else "standard"

        attendance_base = {
            "lower": 76000,
            "regional": 84500,
            "conference": 92000,
            "upper": 100000,
            "elite": 104000,
        }[opponent_tier]
        weekend_bonus = 3500 if weekend_flag else -4500
        premium_bonus = 3500 if premium_game_flag else 0
        rivalry_bonus = 2000 if rivalry_flag else 0
        weather_penalty = {
            "clear": 0,
            "cool_clear": 0,
            "light_rain": -1800,
            "heavy_rain": -4200,
            "windy": -2200,
        }[weather_bucket]
        kickoff_adjust = {"noon": -1800, "afternoon": 0, "night": 2100}[kickoff_bucket]
        noise = int(RNG.integers(-1800, 1801))
        expected_attendance = min(
            OFFICIAL_CAPACITY,
            max(72000, attendance_base + weekend_bonus + premium_bonus + rivalry_bonus + weather_penalty + kickoff_adjust + noise),
        )
        attendance_pct = round(expected_attendance / OFFICIAL_CAPACITY, 4)

        notes = []
        if premium_game_flag:
            notes.append("premium demand profile")
        if rivalry_flag:
            notes.append("rivalry-style late arrival pressure")
        if kickoff_bucket == "night":
            notes.append("night game with sharper late arrivals")
        if weather_bucket in {"light_rain", "heavy_rain", "windy"}:
            notes.append("weather likely to increase burstiness or friction")
        if not notes:
            notes.append("standard game-day profile")

        rows.append(
            {
                "match_id": f"bsu_{season_year}_{idx + 1:03d}",
                "season_year": season_year,
                "opponent_name": opponent_name,
                "opponent_tier": opponent_tier,
                "kickoff_datetime": kickoff_dt.strftime("%Y-%m-%dT%H:%M:%S"),
                "kickoff_bucket": kickoff_bucket,
                "weekend_flag": weekend_flag,
                "premium_game_flag": premium_game_flag,
                "rivalry_flag": rivalry_flag,
                "weather_bucket": weather_bucket,
                "expected_attendance": int(expected_attendance),
                "expected_attendance_pct_of_capacity": attendance_pct,
                "security_strictness": security,
                "notes": "; ".join(notes),
            }
        )
    return pd.DataFrame(rows)


def gate_profiles() -> dict[str, dict]:
    return {
        "A": {"capacity": 250, "neighbors": ["C", "D"], "late_bias": 1.55, "queue_sensitivity": 1.16},
        "B": {"capacity": 115, "neighbors": ["C"], "late_bias": 0.72, "queue_sensitivity": 0.95},
        "C": {"capacity": 215, "neighbors": ["A", "D", "F"], "late_bias": 0.94, "queue_sensitivity": 1.0},
        "D": {"capacity": 205, "neighbors": ["A", "C", "F"], "late_bias": 0.96, "queue_sensitivity": 1.02},
        "E": {"capacity": 170, "neighbors": ["F", "D"], "late_bias": 1.08, "queue_sensitivity": 1.18},
        "F": {"capacity": 225, "neighbors": ["E", "D", "C"], "late_bias": 0.98, "queue_sensitivity": 1.01},
    }


def gate_mix(gate_id: str) -> dict[str, float]:
    mixes = {
        "A": {"student": 0.68, "general": 0.12, "season_ticket_holder": 0.10, "vip": 0.01, "staff": 0.07, "accessibility": 0.02},
        "B": {"student": 0.01, "general": 0.15, "season_ticket_holder": 0.12, "vip": 0.01, "staff": 0.18, "accessibility": 0.53},
        "C": {"student": 0.06, "general": 0.52, "season_ticket_holder": 0.22, "vip": 0.03, "staff": 0.12, "accessibility": 0.05},
        "D": {"student": 0.05, "general": 0.49, "season_ticket_holder": 0.24, "vip": 0.03, "staff": 0.13, "accessibility": 0.06},
        "E": {"student": 0.03, "general": 0.55, "season_ticket_holder": 0.16, "vip": 0.02, "staff": 0.12, "accessibility": 0.12},
        "F": {"student": 0.04, "general": 0.54, "season_ticket_holder": 0.24, "vip": 0.03, "staff": 0.11, "accessibility": 0.04},
    }
    return mixes[gate_id]


def fan_curve(minutes: np.ndarray, fan_type: str, gate_id: str, kickoff_bucket: str, premium: bool, weather: str) -> np.ndarray:
    night_shift = 7 if kickoff_bucket == "night" else -4 if kickoff_bucket == "noon" else 0
    premium_scale = 1.15 if premium else 1.0
    weather_burst = 1.10 if weather in {"light_rain", "heavy_rain", "windy"} else 1.0

    if fan_type == "staff":
        center = -145
        width = 18
        amp = 0.55
    elif fan_type == "vip":
        center = -105 + night_shift * 0.3
        width = 20
        amp = 0.75
    elif fan_type == "season_ticket_holder":
        center = -88 + night_shift * 0.4
        width = 28
        amp = 1.0
    elif fan_type == "general":
        center = -68 + night_shift * 0.6
        width = 31 if kickoff_bucket == "noon" else 24
        amp = 1.15
    elif fan_type == "accessibility":
        center = -92 + night_shift * 0.2
        width = 24
        amp = 0.64
    else:
        center = -24 + night_shift
        width = 13 if premium else 16
        amp = 1.55 if gate_id == "A" else 0.55

    if gate_id == "A" and fan_type == "student":
        second_peak = 0.55 * np.exp(-0.5 * ((minutes + 9) / 8) ** 2)
    else:
        second_peak = 0.0

    if gate_id == "E":
        friction_peak = 0.20 * np.exp(-0.5 * ((minutes + 28) / 12) ** 2)
    else:
        friction_peak = 0.0

    if gate_id == "B" and fan_type == "accessibility":
        smooth_support = 0.12 * np.exp(-0.5 * ((minutes + 42) / 30) ** 2)
    else:
        smooth_support = 0.0

    primary = amp * np.exp(-0.5 * ((minutes - center) / width) ** 2)
    return (primary + second_peak + friction_peak + smooth_support) * premium_scale * weather_burst


def attendance_gate_shares(match_row: pd.Series) -> dict[str, float]:
    base = {"A": 0.24, "B": 0.06, "C": 0.18, "D": 0.17, "E": 0.15, "F": 0.20}
    if match_row["premium_game_flag"]:
        base["A"] += 0.015
        base["E"] += 0.005
        base["F"] -= 0.01
        base["D"] -= 0.01
    if match_row["weather_bucket"] in {"light_rain", "heavy_rain"}:
        base["A"] -= 0.01
        base["C"] += 0.005
        base["F"] += 0.005
    total = sum(base.values())
    return {gate: value / total for gate, value in base.items()}


def throughput_adjustment(match_row: pd.Series, gate_id: str, minute: int, arrivals: int, queue_estimate: int) -> float:
    base = gate_profiles()[gate_id]["capacity"]
    security_factor = {"standard": 1.0, "elevated": 0.94, "tight": 0.88}[match_row["security_strictness"]]
    weather_factor = {
        "clear": 1.0,
        "cool_clear": 0.99,
        "light_rain": 0.95,
        "heavy_rain": 0.88,
        "windy": 0.94,
    }[match_row["weather_bucket"]]
    kickoff_factor = 1.0
    if gate_id == "E" and -40 <= minute <= 5:
        kickoff_factor -= 0.18
    if gate_id == "A" and -18 <= minute <= 5:
        kickoff_factor -= 0.10
    if queue_estimate > base * 2.2:
        kickoff_factor -= 0.06
    if arrivals > base * 1.15:
        kickoff_factor -= 0.04
    return round(max(base * security_factor * weather_factor * kickoff_factor, base * 0.55), 2)


def density_from_pressure(score: float) -> str:
    if score < 28:
        return "low"
    if score < 52:
        return "medium"
    if score < 76:
        return "high"
    return "critical"


def flow_state(arrivals: int, throughput: float, queue_estimate: int, gate_id: str) -> str:
    utilization = arrivals / max(throughput, 1)
    if queue_estimate > throughput * 2.0 or utilization > 1.18:
        return "stalled"
    if utilization > 0.88 or (gate_id == "A" and arrivals > throughput * 0.82):
        return "heavy_inbound"
    if queue_estimate > throughput * 0.75:
        return "mixed"
    return "smooth_inbound"


def choose_action(gate_id: str, density: str, queue_estimate: int, flow: str) -> tuple[str, str]:
    alternates = {
        "A": "C",
        "B": "C",
        "C": "F",
        "D": "F",
        "E": "F",
        "F": "D",
    }
    alternate_gate = alternates[gate_id]
    if density == "critical":
        if gate_id in {"A", "E"}:
            return "open_extra_lane", alternate_gate
        return "deploy_staff", alternate_gate
    if density == "high":
        if gate_id == "A":
            return "reroute_to_C", "C"
        if gate_id == "E":
            return "reroute_to_F", "F"
        if gate_id == "B":
            return "manual_monitoring", "B"
        return f"reroute_to_{alternate_gate}", alternate_gate
    if flow == "mixed" and gate_id == "E":
        return "deploy_staff", "F"
    if flow == "heavy_inbound" and gate_id == "A":
        return "reroute_to_D", "D"
    return "stay", alternate_gate


def wait_minutes(queue_estimate: int, throughput: float, density: str) -> float:
    baseline = queue_estimate / max(throughput, 1)
    multiplier = {"low": 0.55, "medium": 0.85, "high": 1.25, "critical": 1.7}[density]
    return round(baseline * multiplier, 2)


def pressure_score(utilization: float, queue_estimate: int, throughput: float, flow_state_value: str, gate_id: str) -> float:
    queue_term = min(queue_estimate / max(throughput * 3.0, 1), 1.5)
    flow_penalty = {"smooth_inbound": 0.0, "heavy_inbound": 6.5, "mixed": 10.0, "stalled": 17.0}[flow_state_value]
    gate_bias = 4.0 if gate_id == "A" else 3.0 if gate_id == "E" else 0.0
    score = 100 * (1 - np.exp(-1.5 * max(utilization, 0))) + (queue_term ** 2) * 18 + flow_penalty + gate_bias
    return round(float(np.clip(score, 3, 100)), 2)


def build_gate_arrivals(match_df: pd.DataFrame) -> pd.DataFrame:
    minutes = np.arange(-180, 31)
    gate_meta = build_gate_metadata().set_index("gate_id")
    rows = []
    row_counter = 1

    for _, match_row in match_df.iterrows():
        gate_share = attendance_gate_shares(match_row)
        premium_multiplier = 1.15 if match_row["premium_game_flag"] else 1.0
        arrival_style_multiplier = 1.10 if match_row["kickoff_bucket"] == "night" else 0.92 if match_row["kickoff_bucket"] == "noon" else 1.0
        weather_multiplier = 1.08 if match_row["weather_bucket"] in {"light_rain", "heavy_rain", "windy"} else 1.0

        for gate_id in NAMED_GATES:
            gate_total = int(match_row["expected_attendance"] * gate_share[gate_id] * float(RNG.uniform(0.97, 1.03)))
            fan_mix = gate_mix(gate_id)
            gate_queue = 0.0
            profile = gate_profiles()[gate_id]

            for fan_type in FAN_TYPES:
                fan_total = int(round(gate_total * fan_mix[fan_type]))
                curve = fan_curve(minutes, fan_type, gate_id, match_row["kickoff_bucket"], bool(match_row["premium_game_flag"]), match_row["weather_bucket"])
                curve *= arrival_style_multiplier * weather_multiplier
                if fan_type == "student" and gate_id == "A" and match_row["rivalry_flag"]:
                    curve *= 1.12
                if fan_type == "general" and gate_id in {"C", "D", "F"} and match_row["premium_game_flag"]:
                    curve *= 1.05
                if fan_type == "accessibility" and gate_id == "B":
                    curve *= 1.10

                noise = np.clip(RNG.normal(1.0, 0.09, len(minutes)), 0.72, 1.32)
                curve = np.clip(curve * noise, 0.0001, None)
                proportions = curve / curve.sum()
                arrivals = np.floor(proportions * fan_total).astype(int)
                remainder = fan_total - int(arrivals.sum())
                if remainder > 0:
                    top_indices = np.argsort(proportions)[-remainder:]
                    arrivals[top_indices] += 1

                cumulative = 0
                for minute, minute_arrivals in zip(minutes, arrivals):
                    timestamp = pd.Timestamp(match_row["kickoff_datetime"]) + pd.Timedelta(minutes=int(minute))
                    throughput = throughput_adjustment(match_row, gate_id, int(minute), int(minute_arrivals), int(gate_queue))
                    gate_queue = max(0.0, gate_queue + int(minute_arrivals) - throughput)
                    utilization = (minute_arrivals + gate_queue * 0.25) / max(profile["capacity"], 1)
                    preliminary_flow = flow_state(int(minute_arrivals), throughput, int(gate_queue), gate_id)
                    score = pressure_score(utilization, int(gate_queue), throughput, preliminary_flow, gate_id)
                    density = density_from_pressure(score)
                    action, alternate_gate = choose_action(gate_id, density, int(gate_queue), preliminary_flow)
                    expected_wait = wait_minutes(int(gate_queue), throughput, density)
                    cumulative += int(minute_arrivals)

                    rows.append(
                        {
                            "row_id": f"arr_{row_counter:07d}",
                            "match_id": match_row["match_id"],
                            "gate_id": gate_id,
                            "timestamp": timestamp.strftime("%Y-%m-%dT%H:%M:%S"),
                            "minutes_from_kickoff": int(minute),
                            "fan_type": fan_type,
                            "arrivals_in_minute": int(minute_arrivals),
                            "cumulative_entries": cumulative,
                            "local_queue_estimate": int(round(gate_queue)),
                            "effective_throughput": round(float(throughput), 2),
                            "gate_utilization_ratio": round(float(utilization), 3),
                            "predicted_density_level": density,
                            "pressure_score": score,
                            "dominant_flow_state": preliminary_flow,
                            "recommended_action": action,
                            "alternate_gate": alternate_gate,
                            "expected_wait_minutes": expected_wait,
                        }
                    )
                    row_counter += 1

    df = pd.DataFrame(rows)
    df.sort_values(["match_id", "gate_id", "fan_type", "minutes_from_kickoff"], inplace=True, ignore_index=True)
    return df


def build_camera_frames(gate_arrivals: pd.DataFrame, match_df: pd.DataFrame) -> pd.DataFrame:
    records = []
    frame_counter = 1
    match_lookup = match_df.set_index("match_id")

    aggregated = (
        gate_arrivals.groupby(["match_id", "gate_id", "timestamp", "minutes_from_kickoff"], as_index=False)
        .agg(
            arrivals_in_minute=("arrivals_in_minute", "sum"),
            local_queue_estimate=("local_queue_estimate", "sum"),
            pressure_score=("pressure_score", "mean"),
            gate_utilization_ratio=("gate_utilization_ratio", "mean"),
            expected_wait_minutes=("expected_wait_minutes", "mean"),
            predicted_density_level=("predicted_density_level", lambda x: x.mode().iloc[0]),
            dominant_flow_state=("dominant_flow_state", lambda x: x.mode().iloc[0]),
        )
    )

    for _, row in aggregated.iterrows():
        match_row = match_lookup.loc[row["match_id"]]
        gate_id = row["gate_id"]
        minute = int(row["minutes_from_kickoff"])
        density = row["predicted_density_level"]
        flow = row["dominant_flow_state"]
        weather = match_row["weather_bucket"]
        night = match_row["kickoff_bucket"] == "night"

        image_quality = "poor" if weather == "heavy_rain" or (night and minute > -60 and RNG.random() < 0.28) else "fair" if weather in {"light_rain", "windy"} or night else "good"
        lighting = "night_lights" if night else "daylight"
        occlusion = "high" if density in {"high", "critical"} else "medium" if density == "medium" else "low"
        estimated_visible = int(max(8, row["arrivals_in_minute"] * 0.9 + row["local_queue_estimate"] * 0.38 + RNG.integers(-6, 7)))

        if occlusion == "high":
            box_factor = 0.68 if image_quality == "good" else 0.57
            point_factor = 0.93
            density_factor = 1.01
        elif occlusion == "medium":
            box_factor = 0.84 if image_quality == "good" else 0.76
            point_factor = 0.91
            density_factor = 0.98
        else:
            box_factor = 0.95 if image_quality == "good" else 0.87
            point_factor = 0.90
            density_factor = 0.95

        bounding_box_count = int(max(0, round(estimated_visible * box_factor + RNG.normal(0, 3))))
        point_annotation_count = int(max(0, round(estimated_visible * point_factor + RNG.normal(0, 2))))
        density_map_sum = round(max(0.0, estimated_visible * density_factor + RNG.normal(0, 4.5)), 2)

        optical_flow = row["gate_utilization_ratio"] * 2.2
        if flow == "heavy_inbound":
            optical_flow += 0.9
        elif flow == "stalled":
            optical_flow += 0.25
        if gate_id == "A" and -25 <= minute <= 0:
            optical_flow += 0.4
        optical_flow = round(float(max(0.1, optical_flow + RNG.normal(0, 0.12))), 3)

        dominant_direction = "toward_gate" if flow in {"smooth_inbound", "heavy_inbound"} else "mixed_vectors" if flow == "mixed" else "compression_near_gate"
        sr_needed = image_quality == "poor" or (image_quality == "fair" and occlusion == "high")
        confidence_base = 0.93 if image_quality == "good" else 0.82 if image_quality == "fair" else 0.71
        if occlusion == "high":
            confidence_base -= 0.13
        elif occlusion == "medium":
            confidence_base -= 0.06
        detection_confidence = round(float(np.clip(confidence_base + RNG.normal(0, 0.02), 0.42, 0.98)), 3)

        if gate_id == "A" and (density in {"high", "critical"} or row["pressure_score"] >= 74):
            interpretation = "Gate A overloaded from late student surge"
        elif gate_id == "E" and row["expected_wait_minutes"] > 9:
            interpretation = "Gate E slowdown likely driven by ticket handling friction"
        elif gate_id == "B" and density in {"low", "medium"}:
            interpretation = "Gate B accessible flow remains steady and manageable"
        elif density == "critical":
            interpretation = f"Gate {gate_id} requires immediate balancing intervention"
        elif density == "high":
            interpretation = f"Gate {gate_id} is under heavy inbound pressure"
        else:
            interpretation = f"Gate {gate_id} remains stable with manageable inbound flow"

        records.append(
            {
                "frame_id": f"frame_{frame_counter:07d}",
                "match_id": row["match_id"],
                "gate_id": gate_id,
                "camera_id": f"cam_{gate_id.lower()}_01",
                "timestamp": row["timestamp"],
                "minutes_from_kickoff": minute,
                "image_quality": image_quality,
                "lighting_condition": lighting,
                "occlusion_level": occlusion,
                "estimated_people_visible": estimated_visible,
                "bounding_box_count": bounding_box_count,
                "point_annotation_count": point_annotation_count,
                "density_map_sum": density_map_sum,
                "optical_flow_magnitude": optical_flow,
                "dominant_direction": dominant_direction,
                "super_resolution_needed": sr_needed,
                "detection_confidence_mean": detection_confidence,
                "crowd_interpretation_label": interpretation,
            }
        )
        frame_counter += 1

    return pd.DataFrame(records)


def build_training_targets(gate_arrivals: pd.DataFrame) -> pd.DataFrame:
    gate_totals = gate_arrivals.groupby(
        ["match_id", "gate_id", "timestamp", "minutes_from_kickoff"], as_index=False
    ).agg(
        arrivals_in_minute=("arrivals_in_minute", "sum"),
        pressure_score=("pressure_score", "mean"),
        expected_wait_minutes=("expected_wait_minutes", "mean"),
    )
    gate_totals.sort_values(["match_id", "gate_id", "minutes_from_kickoff"], inplace=True)

    targets = []
    for (match_id, gate_id), group in gate_totals.groupby(["match_id", "gate_id"], sort=False):
        group = group.reset_index(drop=True)
        arrivals = group["arrivals_in_minute"].to_numpy()
        pressure = group["pressure_score"].to_numpy()
        waits = group["expected_wait_minutes"].to_numpy()
        minutes = group["minutes_from_kickoff"].to_numpy()

        for idx, minute in enumerate(minutes):
            next_5 = int(arrivals[idx + 1 : idx + 6].sum())
            next_10 = int(arrivals[idx + 1 : idx + 11].sum())
            next_15_pressure = round(float(pressure[idx + 1 : idx + 16].max() if idx + 1 < len(pressure) else pressure[idx]), 2)

            if next_15_pressure >= 78:
                risk_multi = "critical"
            elif next_15_pressure >= 58:
                risk_multi = "high"
            elif next_15_pressure >= 34:
                risk_multi = "medium"
            else:
                risk_multi = "low"

            if gate_id == "A":
                best_alt = "C" if minute < 5 else "D"
            elif gate_id == "E":
                best_alt = "F"
            elif gate_id == "B":
                best_alt = "B"
            elif gate_id == "C":
                best_alt = "F"
            elif gate_id == "D":
                best_alt = "F"
            else:
                best_alt = "D"

            reduction = round(float(np.clip(waits[idx] * (0.18 if risk_multi == "medium" else 0.32 if risk_multi == "high" else 0.44 if risk_multi == "critical" else 0.08), 0.0, 14.0)), 2)
            reroute_conf = round(float(np.clip(0.42 + next_15_pressure / 140 + (0.08 if gate_id in {"A", "E"} else 0.0), 0.35, 0.96)), 3)

            targets.append(
                {
                    "row_id": f"{match_id}_{gate_id}_{int(minute):+04d}",
                    "next_5min_arrivals": next_5,
                    "next_10min_arrivals": next_10,
                    "next_15min_pressure_score": next_15_pressure,
                    "congestion_risk_binary": int(next_15_pressure >= 58),
                    "congestion_risk_multiclass": risk_multi,
                    "best_alternate_gate": best_alt,
                    "expected_wait_reduction_minutes": reduction,
                    "reroute_confidence": reroute_conf,
                }
            )

    return pd.DataFrame(targets)


def build_readme() -> str:
    return f"""# Beaver Stadium Crowd Engine Data

This folder contains Beaver-Stadium-specific datasets for a SmartVenue PSU crowd intelligence engine. The package combines public venue facts with clearly labeled modeled assumptions so the data can support prototyping without pretending to be official operations telemetry.

## Public Beaver Stadium facts used as anchors

- Venue name: Beaver Stadium
- University: Penn State
- City: University Park
- State: Pennsylvania
- Official capacity anchor used here: {OFFICIAL_CAPACITY}
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
"""


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    venue_metadata = build_venue_metadata()
    gate_metadata = build_gate_metadata()
    match_metadata = build_match_metadata()
    gate_arrivals = build_gate_arrivals(match_metadata)
    camera_frames = build_camera_frames(gate_arrivals, match_metadata)
    paper_capabilities = build_paper_capabilities()
    model_registry = build_model_registry()
    system_mapping = build_system_mapping()
    training_targets = build_training_targets(gate_arrivals)

    (OUTPUT_DIR / "venue_metadata.json").write_text(json.dumps(venue_metadata, indent=2), encoding="utf-8")
    gate_metadata.to_csv(OUTPUT_DIR / "gate_metadata.csv", index=False)
    match_metadata.to_csv(OUTPUT_DIR / "match_metadata.csv", index=False)
    gate_arrivals.to_csv(OUTPUT_DIR / "gate_arrivals.csv", index=False)
    camera_frames.to_csv(OUTPUT_DIR / "camera_frames.csv", index=False)
    paper_capabilities.to_csv(OUTPUT_DIR / "paper_capabilities.csv", index=False)
    (OUTPUT_DIR / "model_registry.json").write_text(json.dumps(model_registry, indent=2), encoding="utf-8")
    system_mapping.to_csv(OUTPUT_DIR / "system_mapping.csv", index=False)
    training_targets.to_csv(OUTPUT_DIR / "training_targets.csv", index=False)
    (OUTPUT_DIR / "README.md").write_text(build_readme(), encoding="utf-8")

    print(f"official venue capacity used: {OFFICIAL_CAPACITY}")
    print(f"named gates used: {', '.join(NAMED_GATES)}")
    print(f"total matches created: {match_metadata['match_id'].nunique()}")
    print(f"total gate-arrival rows: {len(gate_arrivals)}")
    print(f"total camera-frame rows: {len(camera_frames)}")
    print("files created:")
    for name in [
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
    ]:
        print(f"- {name}")

    print("\nPUBLIC FACTS VS MODELED ASSUMPTIONS")
    print("Public Beaver Stadium facts:")
    for item in venue_metadata["official_public_facts"]:
        print(f"- {item}")
    print("Modeled assumptions:")
    for item in venue_metadata["modeled_assumptions"]:
        print(f"- {item}")


if __name__ == "__main__":
    main()

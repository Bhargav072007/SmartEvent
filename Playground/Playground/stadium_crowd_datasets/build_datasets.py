from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd


OUTPUT_DIR = Path(__file__).resolve().parent
RNG = np.random.default_rng(42)

ALLOWED_DENSITY = ["low", "medium", "high", "critical"]
ALLOWED_ROUTE = ["stay", "reroute_left", "reroute_right", "open_aux_gate"]
FAN_TYPES = ["member", "regular", "vip"]
WEATHER_BUCKETS = ["clear", "light_rain", "heavy_rain", "cold", "windy"]
MATCH_IMPORTANCE = ["low", "medium", "high", "derby"]


def build_paper_capabilities() -> pd.DataFrame:
    rows = [
        {
            "paper_id": "crowdvlm_r1_2025",
            "paper_name": "CrowdVLM-R1",
            "year": 2025,
            "task_category": "crowd counting foundation",
            "what_we_use_it_for": "Foundation-level counting features and transfer learning baseline for dense stadium scenes.",
            "input_type": "still image or short video crop",
            "output_type": "crowd count estimate and latent scene representation",
            "latency_priority": "medium",
            "deployment_stage": "offline training and benchmarking",
            "notes": "Best suited as a high-capacity benchmark model rather than first-line real-time deployment.",
        },
        {
            "paper_id": "hmstunet_2026",
            "paper_name": "HMSTUNet",
            "year": 2026,
            "task_category": "density heatmap generation",
            "what_we_use_it_for": "Dense spatial occupancy estimation around gates, concourses, and chokepoints.",
            "input_type": "single frame or multi-scale image tensor",
            "output_type": "pixel-aligned density heatmap",
            "latency_priority": "medium",
            "deployment_stage": "near-real-time inference",
            "notes": "Useful when count totals alone are insufficient and spatial congestion needs to be visualized.",
        },
        {
            "paper_id": "pet_iccv_2023",
            "paper_name": "PET",
            "year": 2023,
            "task_category": "point-level localization",
            "what_we_use_it_for": "Head or person point localization for zone occupancy and annotation-efficient supervision.",
            "input_type": "image frame",
            "output_type": "set of person points",
            "latency_priority": "medium",
            "deployment_stage": "training support and evaluation",
            "notes": "Complements counting and density maps by preserving interpretable per-person locations.",
        },
        {
            "paper_id": "ffnet_2024",
            "paper_name": "FFNet",
            "year": 2024,
            "task_category": "real-time crowd counting",
            "what_we_use_it_for": "Fast deployment model for live gate-side inference where latency is constrained.",
            "input_type": "video frame",
            "output_type": "crowd count and lightweight density estimate",
            "latency_priority": "high",
            "deployment_stage": "edge deployment",
            "notes": "Primary real-time counting candidate when compute budget is limited.",
        },
        {
            "paper_id": "proactive_crowd_flow_2025",
            "paper_name": "Proactive Crowd Flow",
            "year": 2025,
            "task_category": "forecasting and ACI gap identification",
            "what_we_use_it_for": "Arrival curve forecasting, congestion precursor detection, and operational gap labeling.",
            "input_type": "historical arrivals, sensor states, and event context",
            "output_type": "future congestion risk and intervention windows",
            "latency_priority": "medium",
            "deployment_stage": "batch forecasting with live refresh",
            "notes": "Encodes how to identify upcoming gate pressure before queues fully materialize.",
        },
        {
            "paper_id": "yolov8_2023",
            "paper_name": "YOLOv8",
            "year": 2023,
            "task_category": "live object detection",
            "what_we_use_it_for": "Bounding-box person detection for sparse scenes, validation, and multi-camera observability.",
            "input_type": "video frame",
            "output_type": "bounding boxes with confidence scores",
            "latency_priority": "high",
            "deployment_stage": "real-time deployment",
            "notes": "Works best in moderate density scenes and for operational visibility rather than packed-count precision.",
        },
        {
            "paper_id": "real_esrgan_2021",
            "paper_name": "Real-ESRGAN",
            "year": 2021,
            "task_category": "image enhancement",
            "what_we_use_it_for": "Low-resolution or pixelated camera cleanup before downstream detection or localization.",
            "input_type": "low-resolution image crop",
            "output_type": "super-resolved image",
            "latency_priority": "low",
            "deployment_stage": "preprocessing or selective enhancement",
            "notes": "Should be applied selectively because enhancement adds latency and may hallucinate details.",
        },
        {
            "paper_id": "b2bdet_2024",
            "paper_name": "B2BDet",
            "year": 2024,
            "task_category": "super-resolution plus detection validation",
            "what_we_use_it_for": "Evaluate whether image enhancement materially improves downstream detection quality.",
            "input_type": "paired raw and enhanced images",
            "output_type": "validated detection performance delta",
            "latency_priority": "low",
            "deployment_stage": "offline evaluation",
            "notes": "Useful as a guardrail to avoid deploying enhancement that helps visuals but hurts detector trustworthiness.",
        },
        {
            "paper_id": "farneback_2003",
            "paper_name": "Farneback Optical Flow",
            "year": 2003,
            "task_category": "motion estimation",
            "what_we_use_it_for": "Estimate dominant movement direction and local flow magnitude around gates and corridors.",
            "input_type": "consecutive video frames",
            "output_type": "dense optical flow vectors",
            "latency_priority": "high",
            "deployment_stage": "real-time analytics",
            "notes": "Good classical baseline for directionality even when labels are scarce.",
        },
        {
            "paper_id": "fruin_los_1971",
            "paper_name": "Fruin Level of Service",
            "year": 1971,
            "task_category": "safety scoring",
            "what_we_use_it_for": "Translate density and movement into interpretable crowd pressure and safety levels.",
            "input_type": "density, flow, and space assumptions",
            "output_type": "pressure score and LOS class",
            "latency_priority": "high",
            "deployment_stage": "real-time rules layer",
            "notes": "Physics-inspired heuristic bridge between CV outputs and operator-facing safety alerts.",
        },
        {
            "paper_id": "gabppo_2024",
            "paper_name": "GABPPO",
            "year": 2024,
            "task_category": "gate routing optimization",
            "what_we_use_it_for": "Recommend routing actions such as staying, rerouting, or opening auxiliary gates.",
            "input_type": "gate state graph, pressure scores, and forecast demand",
            "output_type": "routing action policy",
            "latency_priority": "medium",
            "deployment_stage": "decision optimization",
            "notes": "Best used on top of reliable forecasting and safety features rather than raw video alone.",
        },
    ]
    return pd.DataFrame(rows)


def build_model_registry() -> list[dict]:
    return [
        {
            "paper_id": "crowdvlm_r1_2025",
            "name": "CrowdVLM-R1",
            "year": 2025,
            "category": "crowd counting foundation",
            "role_in_system": "High-capacity benchmark and transfer-learning source for dense crowd counting.",
            "upstream_dependencies": ["camera_frames", "curated_annotations"],
            "downstream_dependencies": ["forecasting_layer", "benchmark_reports"],
            "expected_inputs": ["rgb_frame", "camera_metadata", "optional_crop_region"],
            "expected_outputs": ["crowd_count", "scene_embedding"],
            "evaluation_metrics": ["MAE", "RMSE", "NAE"],
            "assumptions": [
                "Dense scenes benefit from large pretraining.",
                "Camera viewpoint is stable enough for transfer learning.",
            ],
            "failure_modes": [
                "Domain shift across stadium camera angles.",
                "Overcounting under extreme occlusion or banners.",
            ],
            "deployment_constraints": ["GPU preferred", "not ideal for low-latency edge devices"],
        },
        {
            "paper_id": "hmstunet_2026",
            "name": "HMSTUNet",
            "year": 2026,
            "category": "density estimation",
            "role_in_system": "Generate spatial heatmaps for occupancy, hotspots, and safety overlays.",
            "upstream_dependencies": ["camera_frames", "density_supervision"],
            "downstream_dependencies": ["fruin_los_1971", "operator_dashboard"],
            "expected_inputs": ["rgb_frame", "roi_mask"],
            "expected_outputs": ["density_heatmap", "integrated_count"],
            "evaluation_metrics": ["MAE", "RMSE", "heatmap_correlation"],
            "assumptions": [
                "Spatial density signal is preserved after perspective normalization.",
                "Zones of interest are calibrated to camera view.",
            ],
            "failure_modes": [
                "Blurred boundaries in overlapping queues.",
                "Underestimation in severe lighting shifts.",
            ],
            "deployment_constraints": ["GPU or high-end CPU recommended", "requires calibration for best spatial fidelity"],
        },
        {
            "paper_id": "pet_iccv_2023",
            "name": "PET",
            "year": 2023,
            "category": "localization",
            "role_in_system": "Produce point-level person localization for occupancy mapping and weak supervision.",
            "upstream_dependencies": ["camera_frames", "point_annotations"],
            "downstream_dependencies": ["density_estimation_validation", "trajectory_seed_generation"],
            "expected_inputs": ["rgb_frame"],
            "expected_outputs": ["person_points"],
            "evaluation_metrics": ["F1", "precision", "recall", "localization_error"],
            "assumptions": [
                "Point annotations are cheaper and more scalable than full boxes in dense scenes.",
            ],
            "failure_modes": [
                "Merged heads in extreme crowd compression.",
                "Reduced precision for oblique views.",
            ],
            "deployment_constraints": ["moderate compute", "camera angle consistency improves results"],
        },
        {
            "paper_id": "ffnet_2024",
            "name": "FFNet",
            "year": 2024,
            "category": "real-time counting",
            "role_in_system": "Primary live count estimator for edge-side deployment.",
            "upstream_dependencies": ["camera_frames"],
            "downstream_dependencies": ["forecasting_layer", "live_gate_state"],
            "expected_inputs": ["rgb_frame", "camera_id"],
            "expected_outputs": ["crowd_count", "lightweight_density_signal"],
            "evaluation_metrics": ["fps", "MAE", "latency_ms"],
            "assumptions": [
                "Real-time inference matters more than best-possible benchmark score.",
            ],
            "failure_modes": [
                "Count drift in extremely dense gates.",
                "Sensitivity to heavy weather artifacts.",
            ],
            "deployment_constraints": ["edge GPU preferred", "usable on constrained hardware"],
        },
        {
            "paper_id": "proactive_crowd_flow_2025",
            "name": "Proactive Crowd Flow",
            "year": 2025,
            "category": "forecasting",
            "role_in_system": "Predict congestion build-up and identify operational intervention gaps before overload.",
            "upstream_dependencies": ["historical_gate_arrivals", "live_counts", "event_context"],
            "downstream_dependencies": ["gabppo_2024", "operator_alerting"],
            "expected_inputs": ["time_series_gate_counts", "kickoff_context", "weather_context"],
            "expected_outputs": ["short_horizon_forecast", "aci_gap_flags"],
            "evaluation_metrics": ["MAPE", "RMSE", "lead_time_gain"],
            "assumptions": [
                "Arrival patterns are partially predictable from event context and recent demand.",
            ],
            "failure_modes": [
                "Sudden policy changes or security incidents break historical priors.",
                "Forecast lag during abrupt gate closures.",
            ],
            "deployment_constraints": ["needs historical data store", "benefits from periodic retraining"],
        },
        {
            "paper_id": "yolov8_2023",
            "name": "YOLOv8",
            "year": 2023,
            "category": "detection",
            "role_in_system": "Live person detection for sparse-to-moderate density scenes and cross-checking counts.",
            "upstream_dependencies": ["camera_frames"],
            "downstream_dependencies": ["tracking_or_count_crosscheck", "super_resolution_validation"],
            "expected_inputs": ["rgb_frame"],
            "expected_outputs": ["bounding_boxes", "class_scores"],
            "evaluation_metrics": ["mAP", "precision", "recall", "fps"],
            "assumptions": [
                "People remain individually separable in many stadium camera views.",
            ],
            "failure_modes": [
                "Box collapse under dense occlusion.",
                "False positives from flags, signs, or mascots.",
            ],
            "deployment_constraints": ["excellent real-time support", "requires resolution suited to person scale"],
        },
        {
            "paper_id": "real_esrgan_2021",
            "name": "Real-ESRGAN",
            "year": 2021,
            "category": "image enhancement",
            "role_in_system": "Selective enhancement for low-resolution or compressed camera feeds.",
            "upstream_dependencies": ["raw_camera_frames"],
            "downstream_dependencies": ["yolov8_2023", "pet_iccv_2023"],
            "expected_inputs": ["low_res_frame"],
            "expected_outputs": ["enhanced_frame"],
            "evaluation_metrics": ["PSNR", "SSIM", "downstream_mAP_delta"],
            "assumptions": [
                "Enhancement can recover useful detail in degraded footage.",
            ],
            "failure_modes": [
                "Hallucinated textures distort detector behavior.",
                "Latency too high for always-on use.",
            ],
            "deployment_constraints": ["GPU beneficial", "best used on-demand or for selected cameras"],
        },
        {
            "paper_id": "b2bdet_2024",
            "name": "B2BDet",
            "year": 2024,
            "category": "enhancement validation",
            "role_in_system": "Validate whether super-resolution improves or harms detector performance.",
            "upstream_dependencies": ["raw_frames", "enhanced_frames", "detector_outputs"],
            "downstream_dependencies": ["model_selection_policy"],
            "expected_inputs": ["paired_raw_and_sr_images", "ground_truth_boxes"],
            "expected_outputs": ["validated_detection_delta", "quality_report"],
            "evaluation_metrics": ["mAP_delta", "precision_delta", "recall_delta"],
            "assumptions": [
                "Perception quality and detection utility are not always aligned.",
            ],
            "failure_modes": [
                "Validation set too narrow to generalize.",
                "False confidence from visually pleasing but incorrect enhancement.",
            ],
            "deployment_constraints": ["offline evaluation workflow", "depends on curated validation data"],
        },
        {
            "paper_id": "farneback_2003",
            "name": "Farneback Optical Flow",
            "year": 2003,
            "category": "motion estimation",
            "role_in_system": "Estimate directional movement and local speed trends around gates and corridors.",
            "upstream_dependencies": ["consecutive_frames"],
            "downstream_dependencies": ["fruin_los_1971", "forecasting_layer"],
            "expected_inputs": ["frame_t", "frame_t_plus_1"],
            "expected_outputs": ["flow_vectors", "dominant_direction"],
            "evaluation_metrics": ["endpoint_error", "direction_consistency", "runtime_ms"],
            "assumptions": [
                "Short-horizon motion fields are informative for queue propagation.",
            ],
            "failure_modes": [
                "Camera shake corrupts flow vectors.",
                "Rain and reflections add noisy motion.",
            ],
            "deployment_constraints": ["classical CPU-friendly baseline", "camera stabilization helps"],
        },
        {
            "paper_id": "fruin_los_1971",
            "name": "Fruin Level of Service",
            "year": 1971,
            "category": "safety scoring",
            "role_in_system": "Convert density and movement into interpretable operator-facing pressure score.",
            "upstream_dependencies": ["density_estimates", "motion_estimates", "space_calibration"],
            "downstream_dependencies": ["gabppo_2024", "operator_alerting"],
            "expected_inputs": ["people_per_m2", "directional_flow", "available_width"],
            "expected_outputs": ["pressure_score", "los_class"],
            "evaluation_metrics": ["alert_precision", "operator_interpretability"],
            "assumptions": [
                "Physical crowding heuristics remain valuable when fused with modern CV signals.",
            ],
            "failure_modes": [
                "Improper calibration of area or width inflates score error.",
                "Ignores nuanced human behavior beyond density and flow.",
            ],
            "deployment_constraints": ["requires calibrated geometry", "rules must be tuned to local venue operations"],
        },
        {
            "paper_id": "gabppo_2024",
            "name": "GABPPO",
            "year": 2024,
            "category": "optimization",
            "role_in_system": "Choose gate-level routing actions that reduce wait and pressure.",
            "upstream_dependencies": ["forecasting_layer", "fruin_los_1971", "live_gate_graph"],
            "downstream_dependencies": ["route_recommendation_service", "simulation_reports"],
            "expected_inputs": ["gate_state_vector", "pressure_scores", "forecast_demand"],
            "expected_outputs": ["route_recommendation", "policy_value"],
            "evaluation_metrics": ["average_wait_reduction", "clearance_time", "constraint_violations"],
            "assumptions": [
                "Operational actions can be represented as discrete route recommendations.",
            ],
            "failure_modes": [
                "Policy overfits to simulated gate graph behavior.",
                "Recommendations degrade if upstream forecasts are poor.",
            ],
            "deployment_constraints": ["best paired with simulation and safety constraints", "requires guardrails for operational trust"],
        },
    ]


def build_cv_annotation_schema() -> dict:
    return {
        "crowd_count": [
            {
                "field_name": "frame_id",
                "type": "string",
                "description": "Unique identifier for the frame being analyzed.",
                "example_value": "cam_gate_a_20261018T170500Z_f000231",
            },
            {
                "field_name": "camera_id",
                "type": "string",
                "description": "Camera source identifier.",
                "example_value": "cam_gate_a_01",
            },
            {
                "field_name": "timestamp",
                "type": "string",
                "description": "ISO-8601 frame capture timestamp.",
                "example_value": "2026-10-18T17:05:00Z",
            },
            {
                "field_name": "estimated_count",
                "type": "integer",
                "description": "Estimated number of visible people in frame or ROI.",
                "example_value": 148,
            },
            {
                "field_name": "roi_id",
                "type": "string",
                "description": "Region-of-interest identifier if count is computed on a sub-area.",
                "example_value": "gate_queue_lane_1",
            },
        ],
        "density_heatmap": [
            {
                "field_name": "frame_id",
                "type": "string",
                "description": "Frame identifier used to join with image metadata.",
                "example_value": "cam_gate_c_20261018T171000Z_f000451",
            },
            {
                "field_name": "heatmap_width",
                "type": "integer",
                "description": "Width of the density heatmap grid.",
                "example_value": 160,
            },
            {
                "field_name": "heatmap_height",
                "type": "integer",
                "description": "Height of the density heatmap grid.",
                "example_value": 90,
            },
            {
                "field_name": "density_values",
                "type": "array<float>",
                "description": "Flattened or nested density values aligned to the heatmap grid.",
                "example_value": [0.0, 0.02, 0.11, 0.34],
            },
            {
                "field_name": "integrated_count",
                "type": "float",
                "description": "Total count recovered by integrating the heatmap.",
                "example_value": 152.7,
            },
        ],
        "point_localization": [
            {
                "field_name": "frame_id",
                "type": "string",
                "description": "Frame identifier.",
                "example_value": "cam_concourse_west_20261018T173000Z_f001212",
            },
            {
                "field_name": "point_id",
                "type": "string",
                "description": "Unique identifier for one localized person point.",
                "example_value": "pt_00031",
            },
            {
                "field_name": "x",
                "type": "float",
                "description": "Horizontal pixel coordinate or normalized x-location.",
                "example_value": 812.4,
            },
            {
                "field_name": "y",
                "type": "float",
                "description": "Vertical pixel coordinate or normalized y-location.",
                "example_value": 436.2,
            },
            {
                "field_name": "confidence",
                "type": "float",
                "description": "Localization confidence score.",
                "example_value": 0.93,
            },
        ],
        "bounding_boxes": [
            {
                "field_name": "frame_id",
                "type": "string",
                "description": "Frame identifier.",
                "example_value": "cam_gate_e_20261018T174500Z_f000882",
            },
            {
                "field_name": "box_id",
                "type": "string",
                "description": "Unique detection identifier within frame.",
                "example_value": "det_00117",
            },
            {
                "field_name": "class_name",
                "type": "string",
                "description": "Detected object class.",
                "example_value": "person",
            },
            {
                "field_name": "bbox_xyxy",
                "type": "array<float>",
                "description": "Bounding box in [x_min, y_min, x_max, y_max] format.",
                "example_value": [420.5, 168.2, 462.8, 281.4],
            },
            {
                "field_name": "confidence",
                "type": "float",
                "description": "Detection confidence score.",
                "example_value": 0.88,
            },
        ],
        "optical_flow": [
            {
                "field_name": "frame_pair_id",
                "type": "string",
                "description": "Identifier for consecutive frames used in motion estimation.",
                "example_value": "cam_gate_b_pair_20261018T170000Z_170001Z",
            },
            {
                "field_name": "camera_id",
                "type": "string",
                "description": "Camera source identifier.",
                "example_value": "cam_gate_b_02",
            },
            {
                "field_name": "mean_magnitude",
                "type": "float",
                "description": "Average optical flow magnitude across ROI.",
                "example_value": 1.84,
            },
            {
                "field_name": "dominant_direction_degrees",
                "type": "float",
                "description": "Dominant movement direction in degrees.",
                "example_value": 273.5,
            },
            {
                "field_name": "flow_grid",
                "type": "array<object>",
                "description": "Grid of vector samples containing x, y, dx, and dy values.",
                "example_value": [{"x": 20, "y": 12, "dx": -0.4, "dy": 1.2}],
            },
        ],
        "super_resolution_validation": [
            {
                "field_name": "sample_id",
                "type": "string",
                "description": "Unique identifier for paired raw and enhanced sample.",
                "example_value": "gate_d_sr_eval_0007",
            },
            {
                "field_name": "raw_frame_path",
                "type": "string",
                "description": "Path or URI to the original low-resolution image.",
                "example_value": "frames/raw/gate_d/frame_0007.jpg",
            },
            {
                "field_name": "enhanced_frame_path",
                "type": "string",
                "description": "Path or URI to the enhanced image output.",
                "example_value": "frames/enhanced/gate_d/frame_0007_sr.jpg",
            },
            {
                "field_name": "detector_metric_delta",
                "type": "float",
                "description": "Change in downstream detector metric after enhancement.",
                "example_value": 0.037,
            },
            {
                "field_name": "validation_outcome",
                "type": "string",
                "description": "Assessment of whether enhancement helps downstream perception.",
                "example_value": "improved",
            },
        ],
    }


def build_system_mapping() -> pd.DataFrame:
    rows = [
        {
            "subsystem": "counting",
            "primary_method": "FFNet",
            "backup_method": "CrowdVLM-R1",
            "input_source": "live gate and concourse camera frames",
            "output_artifact": "per-frame crowd counts",
            "real_time_or_batch": "real-time",
            "why_selected": "FFNet is optimized for deployment latency, while CrowdVLM-R1 provides a stronger benchmark and fallback reference.",
        },
        {
            "subsystem": "density estimation",
            "primary_method": "HMSTUNet",
            "backup_method": "FFNet lightweight density head",
            "input_source": "camera frames with calibrated ROI masks",
            "output_artifact": "density heatmaps and hotspot overlays",
            "real_time_or_batch": "real-time",
            "why_selected": "Spatial density is needed for bottleneck and pressure reasoning beyond scalar counts.",
        },
        {
            "subsystem": "localization",
            "primary_method": "PET",
            "backup_method": "YOLOv8 person centers",
            "input_source": "annotated stadium frames",
            "output_artifact": "point-level person coordinates",
            "real_time_or_batch": "batch",
            "why_selected": "Point localization is annotation-efficient and more stable than boxes in dense crowds.",
        },
        {
            "subsystem": "detection",
            "primary_method": "YOLOv8",
            "backup_method": "B2BDet validation stack",
            "input_source": "live or recorded camera frames",
            "output_artifact": "person bounding boxes with confidence",
            "real_time_or_batch": "real-time",
            "why_selected": "YOLOv8 is practical for live observability in lower-density camera views.",
        },
        {
            "subsystem": "image enhancement",
            "primary_method": "Real-ESRGAN",
            "backup_method": "raw feed passthrough",
            "input_source": "pixelated or low-resolution frames",
            "output_artifact": "enhanced image crops",
            "real_time_or_batch": "batch",
            "why_selected": "Selective super-resolution can recover details before detection, but should not be always-on.",
        },
        {
            "subsystem": "motion estimation",
            "primary_method": "Farneback Optical Flow",
            "backup_method": "frame differencing baseline",
            "input_source": "consecutive gate or corridor frames",
            "output_artifact": "flow vectors and dominant direction",
            "real_time_or_batch": "real-time",
            "why_selected": "A dependable classical baseline is useful when labels are scarce and direction is the main requirement.",
        },
        {
            "subsystem": "safety scoring",
            "primary_method": "Fruin Level of Service",
            "backup_method": "threshold rules on density and wait time",
            "input_source": "density estimates, flow estimates, and geometry assumptions",
            "output_artifact": "pressure score and LOS class",
            "real_time_or_batch": "real-time",
            "why_selected": "It provides an interpretable bridge from perception outputs to operator decisions.",
        },
        {
            "subsystem": "gate optimization",
            "primary_method": "GABPPO",
            "backup_method": "rule-based rerouting policy",
            "input_source": "gate state graph, pressure scores, and forecasts",
            "output_artifact": "route recommendations by gate and time",
            "real_time_or_batch": "real-time",
            "why_selected": "Optimization is needed once gate conditions and safety states are available.",
        },
        {
            "subsystem": "forecasting",
            "primary_method": "Proactive Crowd Flow",
            "backup_method": "historical arrival curve baseline",
            "input_source": "historical gate arrivals, live counts, and event context",
            "output_artifact": "arrival forecasts and ACI gap alerts",
            "real_time_or_batch": "batch",
            "why_selected": "Forecasting enables proactive, not just reactive, crowd operations.",
        },
    ]
    return pd.DataFrame(rows)


def density_level(arrivals_in_minute: int, gate_capacity: int, security_delay_factor: float) -> str:
    intensity = arrivals_in_minute * security_delay_factor / max(gate_capacity, 1)
    if intensity < 0.12:
        return "low"
    if intensity < 0.3:
        return "medium"
    if intensity < 0.52:
        return "high"
    return "critical"


def route_action(density: str, pressure_score: float, gate_behavior: str) -> str:
    if density == "critical" or pressure_score >= 0.82:
        return "open_aux_gate"
    if density == "high":
        return "reroute_left" if gate_behavior in {"late_surge", "steady"} else "reroute_right"
    if density == "medium" and pressure_score > 0.42:
        return "reroute_right" if gate_behavior == "early" else "stay"
    return "stay"


def generate_match_schedule(n_matches: int) -> list[dict]:
    venue_ids = ["camp_nou_benchmark", "beaver_stadium_sim"]
    kickoff_dates = pd.date_range("2026-08-15 15:30:00", periods=n_matches, freq="7D")
    schedule = []
    for idx, kickoff in enumerate(kickoff_dates, start=1):
        schedule.append(
            {
                "match_id": f"match_{idx:03d}",
                "venue_id": venue_ids[idx % len(venue_ids)],
                "kickoff_datetime": kickoff,
                "weather_bucket": WEATHER_BUCKETS[idx % len(WEATHER_BUCKETS)],
                "match_importance": MATCH_IMPORTANCE[idx % len(MATCH_IMPORTANCE)],
            }
        )
    return schedule


def gate_profiles() -> list[dict]:
    return [
        {"gate_id": "gate_a", "behavior": "early", "capacity": 165, "weight": 1.15},
        {"gate_id": "gate_b", "behavior": "early", "capacity": 150, "weight": 0.95},
        {"gate_id": "gate_c", "behavior": "steady", "capacity": 160, "weight": 1.05},
        {"gate_id": "gate_d", "behavior": "late_surge", "capacity": 145, "weight": 0.9},
        {"gate_id": "gate_e", "behavior": "late_surge", "capacity": 175, "weight": 1.2},
        {"gate_id": "gate_f", "behavior": "steady", "capacity": 155, "weight": 1.0},
        {"gate_id": "gate_g", "behavior": "vip", "capacity": 90, "weight": 0.35},
        {"gate_id": "gate_h", "behavior": "member", "capacity": 125, "weight": 0.65},
    ]


def fan_mix_for_gate(gate_behavior: str) -> dict[str, float]:
    if gate_behavior == "vip":
        return {"member": 0.18, "regular": 0.12, "vip": 0.70}
    if gate_behavior == "member":
        return {"member": 0.55, "regular": 0.35, "vip": 0.10}
    return {"member": 0.30, "regular": 0.60, "vip": 0.10}


def arrival_curve(minutes: np.ndarray, behavior: str, fan_type: str) -> np.ndarray:
    if behavior == "early":
        centers = {"member": -80, "regular": -65, "vip": -95}
        widths = {"member": 20, "regular": 24, "vip": 18}
        base = 1.25 * np.exp(-0.5 * ((minutes - centers[fan_type]) / widths[fan_type]) ** 2)
        shoulder = 0.42 * np.exp(-0.5 * ((minutes + 25) / 28) ** 2)
        return base + shoulder
    if behavior == "late_surge":
        centers = {"member": -28, "regular": -18, "vip": -35}
        widths = {"member": 14, "regular": 12, "vip": 15}
        base = 1.35 * np.exp(-0.5 * ((minutes - centers[fan_type]) / widths[fan_type]) ** 2)
        tail = 0.18 * np.exp(-0.5 * ((minutes - 8) / 10) ** 2)
        return base + tail
    if behavior == "vip":
        centers = {"member": -70, "regular": -50, "vip": -82}
        widths = {"member": 18, "regular": 16, "vip": 14}
        lounge = 0.85 * np.exp(-0.5 * ((minutes - centers[fan_type]) / widths[fan_type]) ** 2)
        return lounge
    if behavior == "member":
        centers = {"member": -78, "regular": -58, "vip": -72}
        widths = {"member": 18, "regular": 22, "vip": 17}
        early = 1.05 * np.exp(-0.5 * ((minutes - centers[fan_type]) / widths[fan_type]) ** 2)
        mid = 0.24 * np.exp(-0.5 * ((minutes + 18) / 24) ** 2)
        return early + mid

    centers = {"member": -55, "regular": -42, "vip": -63}
    widths = {"member": 22, "regular": 20, "vip": 20}
    base = 1.0 * np.exp(-0.5 * ((minutes - centers[fan_type]) / widths[fan_type]) ** 2)
    support = 0.2 * np.exp(-0.5 * ((minutes + 2) / 18) ** 2)
    return base + support


def match_scale(match_importance: str, weather_bucket: str) -> float:
    importance_map = {"low": 0.82, "medium": 1.0, "high": 1.14, "derby": 1.24}
    weather_map = {"clear": 1.0, "light_rain": 0.97, "heavy_rain": 0.92, "cold": 0.96, "windy": 0.95}
    return importance_map[match_importance] * weather_map[weather_bucket]


def security_delay(match_importance: str, weather_bucket: str, gate_behavior: str) -> float:
    base = 1.0
    if match_importance in {"high", "derby"}:
        base += 0.08
    if weather_bucket in {"heavy_rain", "windy"}:
        base += 0.05
    if gate_behavior == "late_surge":
        base += 0.03
    return round(base, 2)


def build_synthetic_gate_arrivals(n_matches: int = 36) -> pd.DataFrame:
    minutes = np.arange(-120, 31)
    schedule = generate_match_schedule(n_matches)
    gates = gate_profiles()
    rows: list[dict] = []

    for match in schedule:
        base_scale = match_scale(match["match_importance"], match["weather_bucket"])
        for gate in gates:
            fan_mix = fan_mix_for_gate(gate["behavior"])
            delay_factor = security_delay(match["match_importance"], match["weather_bucket"], gate["behavior"])
            for fan_type in FAN_TYPES:
                gate_total = int(
                    round(
                        gate["capacity"]
                        * 38
                        * gate["weight"]
                        * fan_mix[fan_type]
                        * base_scale
                        * float(RNG.uniform(0.93, 1.08))
                    )
                )
                curve = arrival_curve(minutes, gate["behavior"], fan_type)
                curve = np.clip(curve, 0, None)
                noise = RNG.normal(1.0, 0.08, size=len(minutes))
                curve = np.clip(curve * noise, 0.001, None)
                proportions = curve / curve.sum()
                arrivals = np.floor(proportions * gate_total).astype(int)
                remainder = gate_total - int(arrivals.sum())
                if remainder > 0:
                    top_indices = np.argsort(proportions)[-remainder:]
                    arrivals[top_indices] += 1

                cumulative = 0
                for minute, arrival_count in zip(minutes, arrivals):
                    cumulative += int(arrival_count)
                    timestamp = match["kickoff_datetime"] + pd.Timedelta(minutes=int(minute))
                    normalized_intensity = (
                        (arrival_count / gate["capacity"]) * delay_factor + max(minute + 120, 0) / 900.0
                    )
                    pressure_score = float(np.clip(normalized_intensity + RNG.normal(0, 0.02), 0.02, 0.98))
                    density = density_level(arrival_count, gate["capacity"], delay_factor)
                    recommendation = route_action(density, pressure_score, gate["behavior"])
                    rows.append(
                        {
                            "match_id": match["match_id"],
                            "venue_id": match["venue_id"],
                            "gate_id": gate["gate_id"],
                            "fan_type": fan_type,
                            "kickoff_datetime": match["kickoff_datetime"].strftime("%Y-%m-%dT%H:%M:%S"),
                            "minutes_from_kickoff": int(minute),
                            "timestamp": timestamp.strftime("%Y-%m-%dT%H:%M:%S"),
                            "cumulative_entries": cumulative,
                            "arrivals_in_minute": int(arrival_count),
                            "predicted_density_level": density,
                            "pressure_score": round(pressure_score, 3),
                            "route_recommendation": recommendation,
                            "weather_bucket": match["weather_bucket"],
                            "match_importance": match["match_importance"],
                            "security_delay_factor": delay_factor,
                        }
                    )

    df = pd.DataFrame(rows)
    df.sort_values(
        by=["match_id", "gate_id", "fan_type", "minutes_from_kickoff"],
        inplace=True,
        ignore_index=True,
    )
    return df


def write_readme(file_names: list[str], n_matches: int, n_gates: int) -> None:
    text = f"""# Stadium Crowd Datasets

This folder contains structured research-to-system datasets for a stadium crowd intelligence project. The package is designed for prototyping retrieval systems, benchmarking model choices, simulating gate arrivals, and defining computer vision annotation outputs.

## Files

- `paper_capabilities.csv`: Research-paper-to-capability mapping covering the methods in the requested stack and the role each one plays in the system.
- `model_registry.json`: Structured registry of each paper or method with inputs, outputs, dependencies, evaluation metrics, assumptions, failure modes, and deployment constraints.
- `synthetic_gate_arrivals.csv`: Minute-level synthetic gate arrival data for {n_matches} matches across {n_gates} gates and three fan types.
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

{chr(10).join(f"- `{name}`" for name in file_names)}
"""
    (OUTPUT_DIR / "README.md").write_text(text, encoding="utf-8")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    paper_capabilities = build_paper_capabilities()
    model_registry = build_model_registry()
    synthetic_gate_arrivals = build_synthetic_gate_arrivals(n_matches=36)
    cv_annotation_schema = build_cv_annotation_schema()
    system_mapping = build_system_mapping()

    paper_capabilities.to_csv(OUTPUT_DIR / "paper_capabilities.csv", index=False)
    with (OUTPUT_DIR / "model_registry.json").open("w", encoding="utf-8") as handle:
        json.dump(model_registry, handle, indent=2)
    synthetic_gate_arrivals.to_csv(OUTPUT_DIR / "synthetic_gate_arrivals.csv", index=False)
    with (OUTPUT_DIR / "cv_annotation_schema.json").open("w", encoding="utf-8") as handle:
        json.dump(cv_annotation_schema, handle, indent=2)
    system_mapping.to_csv(OUTPUT_DIR / "system_mapping.csv", index=False)

    file_names = [
        "paper_capabilities.csv",
        "model_registry.json",
        "synthetic_gate_arrivals.csv",
        "cv_annotation_schema.json",
        "system_mapping.csv",
        "validate_datasets.py",
        "generate_more_synthetic_data.py",
        "build_datasets.py",
        "README.md",
    ]
    write_readme(file_names, synthetic_gate_arrivals["match_id"].nunique(), synthetic_gate_arrivals["gate_id"].nunique())


if __name__ == "__main__":
    main()

"""
SmartVenue Kiosk Face Engine

This module is intentionally separate from:
- camera/Camera-engine.py   -> crowd analytics on laptop
- engine/main.py            -> routing / congestion backend on laptop

This file is the Raspberry Pi kiosk-side ML pipeline for:
- face detection
- face embedding
- temporal quality-weighted fusion (TAQFV)
- anti-spoofing
- confidence-calibrated decisions

The UI layer should call:
    engine.get_recognition_result()
    engine.get_live_frame()
"""

from __future__ import annotations

import base64
import os
import queue
import sqlite3
import threading
import time
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np
import onnxruntime as ort
from amazon_rekognition_provider import get_rekognition_provider


# ---------------------------------------------------------------------------
# Paths / configuration
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
DB_PATH = DATA_DIR / "fans.db"

CAMERA_INDEX = 0
FRAME_W = 640
FRAME_H = 480
FPS_TARGET = 30

TAQFV_FRAMES = 2

# Demo mode makes verification faster and more forgiving for live presentations.
DEMO_MODE = True

# Confidence calibration
CONF_HIGH = 0.55
CONF_MEDIUM = 0.40
CONF_LOW = 0.40

SPOOF_THRESHOLD = 0.60

# Progressive pre-computation thresholds
FAR_FACE_MIN_PX = 40
NEAR_FACE_MIN_PX = 100

# Reset if nobody is in front of the kiosk
FACE_TIMEOUT_SECONDS = 3.0
FACE_CROP_MARGIN = 0.28

# Public result states used by display-ui.py
STATUS_IDLE = "idle"
STATUS_WELCOME = "welcome"
STATUS_SCANNING = "scanning"
STATUS_PROCESSING = "processing"
STATUS_MEDIUM = "medium"
STATUS_VERIFIED = "verified"
STATUS_DENIED = "denied"
STATUS_SPOOF = "spoof"


MODEL_URLS = {
    # YuNet is an OpenCV Zoo detector; fast enough for CPU-only Pi usage.
    "retinaface": "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
    # Public OpenCV Zoo SFace model. Can later be swapped for LVFace / TopoFR ONNX.
    "embedding": "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx",
    # Silent-Face-Anti-Spoofing placeholder ONNX
    "antispoof": "https://github.com/minivision-ai/Silent-Face-Anti-Spoofing/raw/master/resources/anti_spoof_models/2.7_80x80_MiniFASNetV2.onnx",
}


DATA_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS fans (
            fan_id TEXT PRIMARY KEY,
            name TEXT,
            seat_section TEXT,
            gate_assignment TEXT,
            embedding BLOB,
            ticket_valid INTEGER,
            registered_at TEXT
        )
        """
    )
    conn.commit()
    return conn


def load_all_embeddings() -> Dict[str, dict]:
    conn = get_db()
    rows = conn.execute(
        """
        SELECT fan_id, name, seat_section, gate_assignment, embedding
        FROM fans
        WHERE ticket_valid = 1
        """
    ).fetchall()
    conn.close()

    database: Dict[str, dict] = {}
    for fan_id, name, seat_section, gate_assignment, emb_blob in rows:
        embedding = np.frombuffer(emb_blob, dtype=np.float32).copy()
        database[fan_id] = {
            "name": name,
            "seat_section": seat_section,
            "gate": gate_assignment,
            "embedding": embedding,
        }
    return database


# ---------------------------------------------------------------------------
# Downloads / preprocessing
# ---------------------------------------------------------------------------

def download_model(name: str, url: str) -> Path:
    path = MODELS_DIR / f"{name}.onnx"
    if not path.exists():
        print(f"Downloading {name}...")
        urllib.request.urlretrieve(url, path)
        print(f"{name} ready")
    return path


def preprocess_face(face_img: np.ndarray, size: Tuple[int, int] = (112, 112)) -> np.ndarray:
    face = cv2.resize(face_img, size)
    face = face.astype(np.float32) / 255.0
    face = (face - 0.5) / 0.5
    face = face.transpose(2, 0, 1)
    return np.expand_dims(face, axis=0)


def preprocess_antispoof(face_img: np.ndarray, size: Tuple[int, int] = (80, 80)) -> np.ndarray:
    face = cv2.resize(face_img, size)
    face = face.astype(np.float32)
    face = face.transpose(2, 0, 1)
    return np.expand_dims(face, axis=0)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    a = a / (np.linalg.norm(a) + 1e-8)
    b = b / (np.linalg.norm(b) + 1e-8)
    return float(np.dot(a, b))


def adaface_quality_score(embedding: np.ndarray) -> float:
    # AdaFace insight: feature norm acts as a quality proxy.
    return float(np.linalg.norm(embedding))


def taqfv_fuse(embeddings_and_qualities: List[Tuple[np.ndarray, float]]) -> Optional[np.ndarray]:
    if not embeddings_and_qualities:
        return None

    total_quality = sum(q for _, q in embeddings_and_qualities)
    if total_quality < 1e-8:
        return None

    fused = sum(embedding * (quality / total_quality) for embedding, quality in embeddings_and_qualities)
    fused = fused / (np.linalg.norm(fused) + 1e-8)
    return fused.astype(np.float32)


def find_best_match(query_embedding: np.ndarray, database: Dict[str, dict]) -> Tuple[Optional[str], float]:
    best_id = None
    best_score = 0.0

    for fan_id, data in database.items():
        score = cosine_similarity(query_embedding, data["embedding"])
        if score > best_score:
            best_score = score
            best_id = fan_id

    return best_id, best_score


def decode_base64_image(encoded: str) -> np.ndarray:
    raw = base64.b64decode(encoded)
    arr = np.frombuffer(raw, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode image")
    return image


def lookup_fan(database: Dict[str, dict], fan_id: str) -> Optional[dict]:
    if fan_id in database:
        return database[fan_id]
    for db_fan_id, data in database.items():
        if str(db_fan_id).lower() == str(fan_id).lower():
            return data
    return None


def fan_from_rekognition_profile(profile: dict) -> dict:
    return {
        "name": profile.get("name", ""),
        "seat_section": profile.get("ticket_section", ""),
        "gate": profile.get("assigned_gate", ""),
    }


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class MatchDecision:
    status: str
    confidence: float
    fan_id: str = ""
    fan_name: str = ""
    gate: str = ""
    seat_section: str = ""


# ---------------------------------------------------------------------------
# Face engine
# ---------------------------------------------------------------------------

class FaceEngine:
    def __init__(self) -> None:
        self.rekognition = get_rekognition_provider()
        ret_path = download_model("retinaface", MODEL_URLS["retinaface"])
        emb_path = download_model("embedding", MODEL_URLS["embedding"])
        anti_path: Optional[Path] = None
        try:
            anti_path = download_model("antispoof", MODEL_URLS["antispoof"])
        except Exception as exc:
            print(f"Warning: anti-spoof model unavailable, continuing without it ({exc})")

        # YuNet detector used as kiosk-friendly single-stage detector.
        self.detector = cv2.FaceDetectorYN.create(
            str(ret_path),
            "",
            (FRAME_W, FRAME_H),
            score_threshold=0.6,
            nms_threshold=0.3,
            top_k=1,
        )

        sess_opts = ort.SessionOptions()
        sess_opts.intra_op_num_threads = 4
        sess_opts.inter_op_num_threads = 2

        self.embedder = ort.InferenceSession(
            str(emb_path),
            sess_options=sess_opts,
            providers=["CPUExecutionProvider"],
        )
        self.embed_input = self.embedder.get_inputs()[0].name

        self.antispoofing = None
        self.antispoof_input = ""
        if anti_path is not None and anti_path.exists():
            self.antispoofing = ort.InferenceSession(
                str(anti_path),
                providers=["CPUExecutionProvider"],
            )
            self.antispoof_input = self.antispoofing.get_inputs()[0].name

        self.database = load_all_embeddings()
        print(f"Loaded {len(self.database)} registered fans")

        self._lock = threading.Lock()
        self._result = {
            "status": STATUS_IDLE,
            "ui_phase": "welcome",
            "instruction": "Welcome to Beaver Stadium",
            "confidence": 0.0,
            "fan_name": "",
            "gate": "",
            "seat_section": "",
            "fan_id": "",
            "face_box": None,
            "progress": 0.0,
            "frame": np.zeros((FRAME_H, FRAME_W, 3), dtype=np.uint8),
        }

        self._raw_frame_q: queue.Queue[np.ndarray] = queue.Queue(maxsize=2)
        self._det_frame_q: queue.Queue[np.ndarray] = queue.Queue(maxsize=2)
        self._spoof_q: queue.Queue[np.ndarray] = queue.Queue(maxsize=2)

        self._emb_buffer: List[Tuple[np.ndarray, float]] = []
        self._pre_embedding: Optional[np.ndarray] = None
        self._spoof_result = False
        self._last_face_time = 0.0
        self._running = True

        threading.Thread(target=self._capture_loop, daemon=True).start()
        threading.Thread(target=self._detection_loop, daemon=True).start()
        threading.Thread(target=self._antispoof_loop, daemon=True).start()

        print("FaceEngine ready")

    # ------------------------------------------------------------------
    # Thread 1: capture
    # ------------------------------------------------------------------
    def _capture_loop(self) -> None:
        cap = cv2.VideoCapture(CAMERA_INDEX)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_W)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_H)
        cap.set(cv2.CAP_PROP_FPS, FPS_TARGET)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        while self._running:
            ret, frame = cap.read()
            if not ret:
                time.sleep(0.01)
                continue

            for q in [self._raw_frame_q, self._det_frame_q, self._spoof_q]:
                if q.full():
                    try:
                        q.get_nowait()
                    except queue.Empty:
                        pass
                q.put(frame)

        cap.release()

    # ------------------------------------------------------------------
    # Thread 2: detection + embeddings + TAQFV + confidence calibration
    # ------------------------------------------------------------------
    def _detection_loop(self) -> None:
        while self._running:
            try:
                frame = self._det_frame_q.get(timeout=1)
            except queue.Empty:
                continue

            display = frame.copy()
            faces = self._detect_faces(frame)

            if not faces:
                if time.time() - self._last_face_time > FACE_TIMEOUT_SECONDS:
                    self._emb_buffer = []
                    self._pre_embedding = None
                    with self._lock:
                        self._result["status"] = STATUS_IDLE
                        self._result["ui_phase"] = "welcome"
                        self._result["instruction"] = "Welcome to Beaver Stadium"
                        self._result["confidence"] = 0.0
                        self._result["fan_name"] = ""
                        self._result["gate"] = ""
                        self._result["seat_section"] = ""
                        self._result["fan_id"] = ""
                        self._result["face_box"] = None
                        self._result["progress"] = 0.0
                        self._result["frame"] = display
                continue

            self._last_face_time = time.time()

            face_box = max(faces, key=lambda f: f[2] * f[3])
            x, y, w, h = int(face_box[0]), int(face_box[1]), int(face_box[2]), int(face_box[3])
            x, y = max(0, x), max(0, y)
            pad_x = int(w * FACE_CROP_MARGIN)
            pad_y = int(h * FACE_CROP_MARGIN)
            crop_x1 = max(0, x - pad_x)
            crop_y1 = max(0, y - pad_y)
            crop_x2 = min(frame.shape[1], x + w + pad_x)
            crop_y2 = min(frame.shape[0], y + h + pad_y)
            face_crop = frame[crop_y1:crop_y2, crop_x1:crop_x2]
            if face_crop.size == 0:
                continue

            face_size = min(w, h)
            cv2.rectangle(display, (x, y), (x + w, y + h), (0, 212, 255), 2)

            # Progressive pre-computation:
            if face_size < FAR_FACE_MIN_PX:
                with self._lock:
                    self._result.update(
                        {
                            "status": STATUS_SCANNING,
                            "ui_phase": "approach",
                            "instruction": "Step closer to scan",
                            "confidence": 0.0,
                            "fan_name": "",
                            "gate": "",
                            "seat_section": "",
                            "fan_id": "",
                            "face_box": (x, y, w, h),
                            "progress": min(face_size / max(FAR_FACE_MIN_PX, 1), 1.0) * 0.35,
                            "frame": display,
                        }
                    )
                emb = self._get_embedding(face_crop)
                if emb is not None:
                    self._pre_embedding = emb
                continue

            with self._lock:
                self._result.update(
                    {
                        "status": STATUS_PROCESSING,
                        "ui_phase": "scanning",
                        "instruction": "Verifying identity...",
                        "confidence": 0.0,
                        "fan_name": "",
                        "gate": "",
                        "seat_section": "",
                        "fan_id": "",
                        "face_box": (x, y, w, h),
                        "progress": min(len(self._emb_buffer) / max(TAQFV_FRAMES, 1), 1.0),
                        "frame": display,
                    }
                )

            emb = self._get_embedding(face_crop)
            if emb is None:
                continue

            quality = adaface_quality_score(emb)

            if self._pre_embedding is not None and not self._emb_buffer:
                pre_q = adaface_quality_score(self._pre_embedding)
                self._emb_buffer.append((self._pre_embedding, pre_q))
                self._pre_embedding = None

            self._emb_buffer.append((emb, quality))

            if len(self._emb_buffer) < TAQFV_FRAMES:
                with self._lock:
                    self._result["frame"] = display
                continue

            fused = taqfv_fuse(self._emb_buffer)
            self._emb_buffer = []
            if fused is None:
                continue

            if self._spoof_result:
                decision = MatchDecision(status=STATUS_SPOOF, confidence=0.0)
            else:
                decision = None
                rekognition_result = None
                used_rekognition = self.rekognition.is_ready()

                if used_rekognition:
                    try:
                        rekognition_result = self.rekognition.search_face(face_crop)
                    except Exception:
                        rekognition_result = {"status": "error", "matched": False}

                    if rekognition_result.get("matched"):
                        matched_fan_id = rekognition_result.get("fan_id", "")
                        matched_profile = rekognition_result.get("profile")
                        fan = (
                            fan_from_rekognition_profile(matched_profile)
                            if isinstance(matched_profile, dict)
                            else lookup_fan(self.database, matched_fan_id)
                        )
                        if fan is not None:
                            decision = MatchDecision(
                                status=STATUS_VERIFIED,
                                confidence=float(rekognition_result.get("confidence", 0.0)),
                                fan_id=matched_fan_id,
                                fan_name=fan["name"],
                                gate=fan["gate"],
                                seat_section=fan["seat_section"],
                            )
                        else:
                            # AWS matched someone who is no longer in the local ticket DB.
                            decision = MatchDecision(status=STATUS_DENIED, confidence=0.0)
                    elif rekognition_result.get("status") in {"no-match", "disabled"}:
                        # When Rekognition is active, treat "no match" as authoritative
                        # instead of letting the local demo matcher guess a person.
                        decision = MatchDecision(status=STATUS_DENIED, confidence=0.0)

                if decision is None:
                    fan_id, score = find_best_match(fused, self.database)
                    if score >= CONF_HIGH and fan_id:
                        fan = self.database[fan_id]
                        decision = MatchDecision(
                            status=STATUS_VERIFIED,
                            confidence=score,
                            fan_id=fan_id,
                            fan_name=fan["name"],
                            gate=fan["gate"],
                            seat_section=fan["seat_section"],
                        )
                    elif score >= CONF_MEDIUM and fan_id:
                        decision = MatchDecision(status=STATUS_MEDIUM, confidence=score)
                        # Keep the latest frame in buffer so UI can ask user to hold still.
                        self._emb_buffer = [(emb, quality)]
                    else:
                        decision = MatchDecision(status=STATUS_DENIED, confidence=score if not used_rekognition else 0.0)

            with self._lock:
                self._result.update(
                    {
                        "status": decision.status,
                        "ui_phase": (
                            "verified"
                            if decision.status == STATUS_VERIFIED
                            else "hold_still"
                            if decision.status == STATUS_MEDIUM
                            else "denied"
                            if decision.status == STATUS_DENIED
                            else "spoof"
                        ),
                        "instruction": (
                            f"Welcome {decision.fan_name}"
                            if decision.status == STATUS_VERIFIED
                            else "Hold still for one more scan"
                            if decision.status == STATUS_MEDIUM
                            else "Identity not recognised"
                            if decision.status == STATUS_DENIED
                            else "Please present yourself in person"
                        ),
                        "confidence": decision.confidence,
                        "fan_name": decision.fan_name,
                        "gate": decision.gate,
                        "seat_section": decision.seat_section,
                        "fan_id": decision.fan_id,
                        "face_box": (x, y, w, h),
                        "progress": 1.0 if decision.status == STATUS_VERIFIED else 0.65 if decision.status == STATUS_MEDIUM else 0.0,
                        "frame": display,
                    }
                )

    # ------------------------------------------------------------------
    # Thread 3: anti-spoofing
    # ------------------------------------------------------------------
    def _antispoof_loop(self) -> None:
        if DEMO_MODE:
            while self._running:
                self._spoof_result = False
                time.sleep(0.15)
            return

        if self.antispoofing is None:
            while self._running:
                self._spoof_result = False
                time.sleep(0.2)
            return

        while self._running:
            try:
                frame = self._spoof_q.get(timeout=1)
            except queue.Empty:
                continue

            faces = self._detect_faces(frame)
            if not faces:
                self._spoof_result = False
                continue

            face_box = max(faces, key=lambda f: f[2] * f[3])
            x, y, w, h = int(face_box[0]), int(face_box[1]), int(face_box[2]), int(face_box[3])
            x, y = max(0, x), max(0, y)
            face_crop = frame[y : y + h, x : x + w]
            if face_crop.size == 0:
                continue

            inp = preprocess_antispoof(face_crop)
            try:
                out = self.antispoofing.run(None, {self.antispoof_input: inp})[0]
                fake_prob = float(out[0][1]) if out.shape[-1] > 1 else 0.0
                self._spoof_result = fake_prob > SPOOF_THRESHOLD
            except Exception:
                self._spoof_result = False

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _detect_faces(self, frame: np.ndarray) -> List[np.ndarray]:
        self.detector.setInputSize((frame.shape[1], frame.shape[0]))
        _, faces = self.detector.detect(frame)
        if faces is None:
            return []
        return list(faces)

    def _get_embedding(self, face_crop: np.ndarray) -> Optional[np.ndarray]:
        try:
            inp = preprocess_face(face_crop)
            out = self.embedder.run(None, {self.embed_input: inp})[0]
            return out[0].astype(np.float32)
        except Exception:
            return None

    # ------------------------------------------------------------------
    # Public API for UI layer
    # ------------------------------------------------------------------
    def get_recognition_result(self) -> dict:
        with self._lock:
            return dict(self._result)

    def get_live_frame(self) -> np.ndarray:
        with self._lock:
            return self._result["frame"].copy()

    def reload_database(self) -> None:
        self.database = load_all_embeddings()
        print(f"Database reloaded: {len(self.database)} fans")

    def stop(self) -> None:
        self._running = False


# Singleton instance for the UI layer to import.
engine = FaceEngine()


if __name__ == "__main__":
    print("FaceEngine running standalone. Press Ctrl+C to stop.")
    try:
        while True:
            result = engine.get_recognition_result()
            status = result["status"]
            confidence = result["confidence"]
            name = result["fan_name"]
            print(f"\r[{status.upper():12s}] conf={confidence:.3f} fan={name:20s}", end="")
            time.sleep(0.1)
    except KeyboardInterrupt:
        engine.stop()
        print("\nStopped")

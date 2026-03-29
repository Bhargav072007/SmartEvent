"""
SmartVenue Kiosk Registration Service

Receives enrollment data from the app and stores face embeddings in the same
SQLite database used by kiosk/face-engine.py.

Accepted enrollment styles:
- multiple photos (recommended minimum 3)
- one short enrollment video encoded as base64
"""

from __future__ import annotations

import base64
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from amazon_rekognition_provider import get_rekognition_provider

from face_engine import (
    DB_PATH,
    MODEL_URLS,
    adaface_quality_score,
    download_model,
    get_db,
    preprocess_face,
    taqfv_fuse,
)

import onnxruntime as ort


APP = FastAPI(title="SmartVenue Kiosk Registration Service", version="1.0.0")
APP.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RegisterFaceRequest(BaseModel):
    fan_id: str
    name: str
    seat_section: str
    gate_assignment: str = "C"
    ticket_valid: bool = True
    photos: List[str] = Field(default_factory=list)
    video_base64: Optional[str] = None


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class EnrollmentEngine:
    def __init__(self) -> None:
        detector_path = download_model("retinaface", MODEL_URLS["retinaface"])
        embedder_path = download_model("embedding", MODEL_URLS["embedding"])

        self.detector = cv2.FaceDetectorYN.create(
            str(detector_path),
            "",
            (640, 480),
            score_threshold=0.6,
            nms_threshold=0.3,
            top_k=1,
        )

        sess_opts = ort.SessionOptions()
        sess_opts.intra_op_num_threads = 4
        sess_opts.inter_op_num_threads = 2
        self.embedder = ort.InferenceSession(
            str(embedder_path),
            sess_options=sess_opts,
            providers=["CPUExecutionProvider"],
        )
        self.embed_input = self.embedder.get_inputs()[0].name

    def detect_largest_face(self, image: np.ndarray):
        self.detector.setInputSize((image.shape[1], image.shape[0]))
        _, faces = self.detector.detect(image)
        if faces is None:
            return None
        return max(faces, key=lambda item: item[2] * item[3])

    def get_embedding(self, face_crop: np.ndarray):
        try:
            inp = preprocess_face(face_crop)
            out = self.embedder.run(None, {self.embed_input: inp})[0]
            return out[0].astype(np.float32)
        except Exception:
            return None

    def embedding_from_image(self, image: np.ndarray):
        face = self.detect_largest_face(image)
        if face is None:
            return None, None

        x, y, w, h = int(face[0]), int(face[1]), int(face[2]), int(face[3])
        x, y = max(0, x), max(0, y)
        crop = image[y : y + h, x : x + w]
        if crop.size == 0:
            return None, None

        embedding = self.get_embedding(crop)
        if embedding is None:
            return None, None

        quality = adaface_quality_score(embedding)
        return embedding, quality


ENGINE = EnrollmentEngine()
REKOGNITION = get_rekognition_provider()


def decode_base64_image(encoded: str) -> np.ndarray:
    raw = base64.b64decode(encoded)
    arr = np.frombuffer(raw, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode image")
    return image


def decode_video_to_frames(encoded_video: str, max_frames: int = 10) -> List[np.ndarray]:
    raw = base64.b64decode(encoded_video)
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(raw)
        tmp_path = Path(tmp.name)

    frames: List[np.ndarray] = []
    try:
        cap = cv2.VideoCapture(str(tmp_path))
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0
        step = max(total // max_frames, 1) if total else 3

        index = 0
        while True and len(frames) < max_frames:
            ok, frame = cap.read()
            if not ok:
                break
            if index % step == 0:
                frames.append(frame)
            index += 1
        cap.release()
    finally:
        try:
            tmp_path.unlink(missing_ok=True)
        except Exception:
            pass

    return frames


def compute_enrollment_embedding(images: List[np.ndarray]) -> np.ndarray:
    embeddings_and_qualities = []
    for image in images:
        embedding, quality = ENGINE.embedding_from_image(image)
        if embedding is not None and quality is not None:
            embeddings_and_qualities.append((embedding, quality))

    if not embeddings_and_qualities:
        raise HTTPException(status_code=400, detail="No usable face found in enrollment data")

    fused = taqfv_fuse(embeddings_and_qualities)
    if fused is None:
        raise HTTPException(status_code=400, detail="Could not compute enrollment embedding")

    return fused.astype(np.float32)


def save_fan(
    fan_id: str,
    name: str,
    seat_section: str,
    gate_assignment: str,
    embedding: np.ndarray,
    ticket_valid: bool,
) -> None:
    conn = get_db()
    conn.execute("DELETE FROM fans WHERE fan_id = ?", (fan_id,))
    if name:
        conn.execute("DELETE FROM fans WHERE name = ?", (name,))
    conn.execute(
        """
        INSERT OR REPLACE INTO fans (
            fan_id, name, seat_section, gate_assignment,
            embedding, ticket_valid, registered_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            fan_id,
            name,
            seat_section,
            gate_assignment,
            embedding.astype(np.float32).tobytes(),
            1 if ticket_valid else 0,
            now_iso(),
        ),
    )
    conn.commit()
    conn.close()


def best_enrollment_image(images: List[np.ndarray]) -> np.ndarray:
    best_image = images[0]
    best_quality = -1.0
    for image in images:
        embedding, quality = ENGINE.embedding_from_image(image)
        if embedding is not None and quality is not None and quality > best_quality:
            best_quality = quality
            best_image = image
    return best_image


@APP.get("/")
def root():
    return {
        "service": "SmartVenue Kiosk Registration Service",
        "status": "online",
        "db_path": str(DB_PATH),
        "timestamp": now_iso(),
    }


@APP.post("/register")
def register_face(payload: RegisterFaceRequest):
    images: List[np.ndarray] = []

    for photo in payload.photos:
        try:
            images.append(decode_base64_image(photo))
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Invalid photo payload: {exc}")

    if payload.video_base64:
        try:
            images.extend(decode_video_to_frames(payload.video_base64))
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Invalid video payload: {exc}")

    if not images:
        raise HTTPException(status_code=400, detail="Provide at least one photo or one video")

    embedding = compute_enrollment_embedding(images)
    save_fan(
        fan_id=payload.fan_id,
        name=payload.name,
        seat_section=payload.seat_section,
        gate_assignment=payload.gate_assignment,
        embedding=embedding,
        ticket_valid=payload.ticket_valid,
    )

    rekognition_status = None
    if REKOGNITION.is_ready():
        try:
            rekognition_status = REKOGNITION.register_face(payload.fan_id, best_enrollment_image(images))
        except Exception as exc:
            rekognition_status = {"status": "error", "reason": str(exc), **REKOGNITION.status()}

    return {
        "status": "success",
        "fan_id": payload.fan_id,
        "name": payload.name,
        "seat_section": payload.seat_section,
        "gate_assignment": payload.gate_assignment,
        "frames_processed": len(images),
        "provider": "rekognition+local" if REKOGNITION.is_ready() else "local",
        "rekognition": rekognition_status,
        "timestamp": now_iso(),
    }

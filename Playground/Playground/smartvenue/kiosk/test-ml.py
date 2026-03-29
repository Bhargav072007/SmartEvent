"""
SmartVenue kiosk ML smoke test

Usage:
  1. Run this script.
  2. Press `r` to register the current face from webcam into the local DB.
  3. Step back in front of the camera and watch live status updates.
  4. Press `q` to quit.

This is a pragmatic local test harness before the iPhone app / UI are connected.
"""

from __future__ import annotations

import sqlite3
import time
from datetime import datetime, timezone

import cv2
import numpy as np

from face_engine import (
    DB_PATH,
    adaface_quality_score,
    engine,
    get_db,
    preprocess_face,
    taqfv_fuse,
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def register_current_face(fan_id: str = "local-test", name: str = "Local Test User", seat_section: str = "14", gate_assignment: str = "C") -> bool:
    cap = cv2.VideoCapture(0)
    embeddings_and_qualities = []
    start = time.time()

    while time.time() - start < 5 and len(embeddings_and_qualities) < 5:
        ok, frame = cap.read()
        if not ok:
            continue

        faces = engine._detect_faces(frame)
        if not faces:
            cv2.imshow("Register Face", frame)
            cv2.waitKey(1)
            continue

        face_box = max(faces, key=lambda f: f[2] * f[3])
        x, y, w, h = int(face_box[0]), int(face_box[1]), int(face_box[2]), int(face_box[3])
        x, y = max(0, x), max(0, y)
        crop = frame[y : y + h, x : x + w]
        if crop.size == 0:
            continue

        emb = engine._get_embedding(crop)
        if emb is None:
            continue

        quality = adaface_quality_score(emb)
        embeddings_and_qualities.append((emb, quality))

        preview = frame.copy()
        cv2.rectangle(preview, (x, y), (x + w, y + h), (0, 212, 255), 2)
        cv2.putText(preview, f"Captured {len(embeddings_and_qualities)}/5", (18, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        cv2.imshow("Register Face", preview)
        cv2.waitKey(1)
        time.sleep(0.12)

    cap.release()
    cv2.destroyWindow("Register Face")

    if len(embeddings_and_qualities) < 3:
        print("Not enough good face frames captured for registration.")
        return False

    fused = taqfv_fuse(embeddings_and_qualities)
    if fused is None:
        print("Could not fuse registration embedding.")
        return False

    conn = get_db()
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
            fused.astype(np.float32).tobytes(),
            1,
            now_iso(),
        ),
    )
    conn.commit()
    conn.close()

    engine.reload_database()
    print(f"Registered {name} as {fan_id}")
    return True


def main():
    print("SmartVenue ML test harness")
    print("Press R to register the current face")
    print("Press Q to quit")

    while True:
        result = engine.get_recognition_result()
        frame = result["frame"].copy()
        status = result["status"]
        ui_phase = result.get("ui_phase", "")
        instruction = result.get("instruction", "")
        confidence = result["confidence"]
        face_box = result.get("face_box")

        if face_box:
            x, y, w, h = face_box
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 212, 255), 2)

        cv2.rectangle(frame, (0, 0), (frame.shape[1], 54), (15, 18, 24), -1)
        cv2.putText(frame, f"status={status} phase={ui_phase}", (12, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        cv2.putText(frame, f"conf={confidence:.3f} instruction={instruction}", (12, 45), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 220, 255), 1)

        cv2.imshow("SmartVenue Kiosk ML Test", frame)
        key = cv2.waitKey(1) & 0xFF
        if key == ord("q"):
            break
        if key == ord("r"):
            register_current_face()

    cv2.destroyAllWindows()
    engine.stop()


if __name__ == "__main__":
    main()

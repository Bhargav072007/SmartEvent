"""
SmartVenue - Camera Engine
Clean person detection only. Fast. No gate overlays.
External ROG Eye preferred.
"""

import os
import queue
import threading
import time

import cv2
import numpy as np
import requests
import torch
from ultralytics import YOLO


ROUTING_ENGINE_URL = os.environ.get("SMARTVENUE_ROUTING_ENGINE_URL", "http://localhost:8000/api/camera/update")
GATE_ID = os.environ.get("SMARTVENUE_GATE", "A").upper()
CAMERA_ID = os.environ.get("SMARTVENUE_CAMERA_ID", f"cam_{GATE_ID.lower()}_01")
CONFIDENCE = 0.20
DISPLAY_W = 1280
DISPLAY_H = 720
PUSH_INTERVAL = 1.0
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
INFER_SIZE = 768
CENTER_RESCAN_EVERY = 3

BOX_COLOR = (220, 100, 20)  # BGR blue
BOX_THICK = 2
ACCENT = (0, 212, 255)
WHITE = (255, 255, 255)
DARK = (10, 10, 10)


print("Loading YOLO model...")
model = YOLO("yolov8s.pt")
model.fuse()
dummy = np.zeros((640, 640, 3), dtype=np.uint8)
model(dummy, verbose=False, device=DEVICE)
print(f"YOLO ready on {DEVICE}")
print(f"Configured for gate {GATE_ID} via camera {CAMERA_ID}")


def open_camera():
    # Prefer the external ROG Eye first, then fall back.
    camera_indices = [1, 2, 0, 3]
    backends = [
        (cv2.CAP_MSMF, "MSMF"),
        (cv2.CAP_DSHOW, "DirectShow"),
        (cv2.CAP_ANY, "AUTO"),
    ]

    for idx in camera_indices:
        for backend, name in backends:
            cap = cv2.VideoCapture(idx, backend)
            if not cap.isOpened():
                cap.release()
                continue

            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)
            cap.set(cv2.CAP_PROP_FPS, 60)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            cap.set(cv2.CAP_PROP_AUTOFOCUS, 1)
            cap.set(cv2.CAP_PROP_AUTO_EXPOSURE, 1)

            ret, _ = cap.read()
            if ret:
                print(f"Camera opened: index={idx} backend={name}")
                return cap
            cap.release()

    raise RuntimeError("No camera found - check ROG Eye S is plugged in")


cap = open_camera()


lock = threading.Lock()
latest_raw = None
person_boxes = []
total_count = 0
fps_display = 0.0
fps_ai = 0.0

raw_q = queue.Queue(maxsize=1)
push_q = queue.Queue(maxsize=10)


def enhance(frame):
    # Display-only enhancement to reduce yellow tint.
    b, g, r = cv2.split(frame.astype(np.float32))
    b = np.clip(b * 1.07, 0, 255).astype(np.uint8)
    r = np.clip(r * 0.90, 0, 255).astype(np.uint8)
    g = g.astype(np.uint8)
    frame = cv2.merge([b, g, r])

    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=1.8, tileGridSize=(8, 8))
    l_channel = clahe.apply(l_channel)
    frame = cv2.cvtColor(cv2.merge([l_channel, a_channel, b_channel]), cv2.COLOR_LAB2BGR)

    kernel = np.array([[0, -0.3, 0], [-0.3, 2.2, -0.3], [0, -0.3, 0]])
    return cv2.filter2D(frame, -1, kernel)


def capture_loop():
    global latest_raw
    while True:
        ret, frame = cap.read()
        if not ret:
            time.sleep(0.005)
            continue

        with lock:
            latest_raw = frame

        if raw_q.full():
            try:
                raw_q.get_nowait()
            except queue.Empty:
                pass
        raw_q.put(frame)


threading.Thread(target=capture_loop, daemon=True).start()


def detection_loop():
    global person_boxes, total_count, fps_ai
    det_n = 0
    t0 = time.time()
    rescan_counter = 0

    while True:
        try:
            raw = raw_q.get(timeout=1)
        except queue.Empty:
            continue

        det = cv2.resize(raw, (640, 640))
        results = model(
            det,
            classes=[0],
            conf=CONFIDENCE,
            iou=0.35,
            imgsz=INFER_SIZE,
            verbose=False,
            device=DEVICE,
        )[0]

        scale_x = DISPLAY_W / 640
        scale_y = DISPLAY_H / 640

        boxes = []
        for box in results.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            conf = float(box.conf[0])
            x1 = int(x1 * scale_x)
            y1 = int(y1 * scale_y)
            x2 = int(x2 * scale_x)
            y2 = int(y2 * scale_y)
            width = x2 - x1
            height = y2 - y1

            if width < 10 or height < 15:
                continue
            if width > DISPLAY_W * 0.85:
                continue
            if width > height * 1.5:
                continue

            boxes.append((x1, y1, x2, y2, conf))

        # Lightweight second pass for farther people:
        # rescan a centered crop at higher effective scale every few cycles.
        rescan_counter += 1
        if rescan_counter % CENTER_RESCAN_EVERY == 0:
            crop_x1, crop_y1, crop_x2, crop_y2 = 160, 90, 1120, 630
            center_crop = raw[crop_y1:crop_y2, crop_x1:crop_x2]
            if center_crop.size > 0:
                crop_det = cv2.resize(center_crop, (640, 640))
                crop_results = model(
                    crop_det,
                    classes=[0],
                    conf=0.16,
                    iou=0.30,
                    imgsz=INFER_SIZE,
                    verbose=False,
                    device=DEVICE,
                )[0]

                crop_scale_x = (crop_x2 - crop_x1) / 640
                crop_scale_y = (crop_y2 - crop_y1) / 640

                for box in crop_results.boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    conf = float(box.conf[0])
                    x1 = int(x1 * crop_scale_x) + crop_x1
                    y1 = int(y1 * crop_scale_y) + crop_y1
                    x2 = int(x2 * crop_scale_x) + crop_x1
                    y2 = int(y2 * crop_scale_y) + crop_y1
                    width = x2 - x1
                    height = y2 - y1

                    if width < 8 or height < 12:
                        continue
                    if width > height * 1.6:
                        continue

                    duplicate = False
                    for ex1, ey1, ex2, ey2, _ in boxes:
                        inter_x1 = max(x1, ex1)
                        inter_y1 = max(y1, ey1)
                        inter_x2 = min(x2, ex2)
                        inter_y2 = min(y2, ey2)
                        if inter_x2 <= inter_x1 or inter_y2 <= inter_y1:
                            continue
                        inter = (inter_x2 - inter_x1) * (inter_y2 - inter_y1)
                        area_a = max(1, (x2 - x1) * (y2 - y1))
                        area_b = max(1, (ex2 - ex1) * (ey2 - ey1))
                        iou = inter / float(area_a + area_b - inter)
                        if iou > 0.35:
                            duplicate = True
                            break

                    if not duplicate:
                        boxes.append((x1, y1, x2, y2, conf))

        with lock:
            person_boxes = boxes
            total_count = len(boxes)

        if push_q.full():
            try:
                push_q.get_nowait()
            except queue.Empty:
                pass
        push_q.put(len(boxes))

        det_n += 1
        now = time.time()
        if now - t0 >= 1.0:
            with lock:
                fps_ai = det_n / (now - t0)
            det_n = 0
            t0 = now


threading.Thread(target=detection_loop, daemon=True).start()


def push_loop():
    last_push = time.time()
    last_count = 0

    while True:
        try:
            count = push_q.get(timeout=0.5)
            last_count = count
        except queue.Empty:
            count = last_count

        now = time.time()
        if now - last_push < PUSH_INTERVAL:
            continue
        last_push = now

        density = min(count / 20, 1.0)
        pressure = round(density * (1 - min(density, 0.8)), 2)

        try:
            requests.post(
                ROUTING_ENGINE_URL,
                json={
                    "gate": GATE_ID,
                    "camera_id": CAMERA_ID,
                    "person_count": count,
                    "density_score": round(density, 2),
                    "pressure_score": pressure,
                    "flow_speed": 0.5,
                    "flow_direction": "inbound",
                    "detection_confidence": 0.9,
                    "image_quality": "good",
                    "lighting_condition": "daylight",
                    "occlusion_level": "medium" if count >= 12 else "low",
                    "super_resolution_needed": False,
                },
                timeout=0.3,
            )
        except Exception:
            pass


threading.Thread(target=push_loop, daemon=True).start()


def hud_text(img, text, x, y, scale=0.5, color=WHITE, bold=False):
    thickness = 2 if bold else 1
    cv2.putText(img, text, (x, y), cv2.FONT_HERSHEY_SIMPLEX, scale, DARK, thickness + 2)
    cv2.putText(img, text, (x, y), cv2.FONT_HERSHEY_SIMPLEX, scale, color, thickness)


def alpha_rect(img, x1, y1, x2, y2, color, alpha=0.5):
    overlay = img.copy()
    cv2.rectangle(overlay, (x1, y1), (x2, y2), color, -1)
    cv2.addWeighted(overlay, alpha, img, 1 - alpha, 0, img)


def draw_frame(raw):
    frame = cv2.resize(raw, (DISPLAY_W, DISPLAY_H))
    frame = enhance(frame)

    with lock:
        boxes = list(person_boxes)
        count = total_count
        display_rate = fps_display
        ai_rate = fps_ai

    for x1, y1, x2, y2, conf in boxes:
        cv2.rectangle(frame, (x1, y1), (x2, y2), BOX_COLOR, BOX_THICK)
        label = f"{conf:.0%}"
        label_w = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.35, 1)[0][0]
        cv2.rectangle(frame, (x1, y1 - 16), (x1 + label_w + 6, y1), BOX_COLOR, -1)
        cv2.putText(frame, label, (x1 + 3, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.35, WHITE, 1)

    alpha_rect(frame, 0, 0, DISPLAY_W, 46, DARK, 0.78)
    cv2.line(frame, (0, 46), (DISPLAY_W, 46), ACCENT, 1)

    hud_text(frame, "SMARTVENUE  |  CROWD ANALYTICS", 12, 28, 0.58, ACCENT, bold=True)
    hud_text(frame, f"PEOPLE DETECTED: {count}", DISPLAY_W // 2 - 80, 28, 0.55, WHITE, bold=True)

    timestamp = time.strftime("%H:%M:%S")
    hud_text(frame, f"{timestamp}  |  {display_rate:.0f} fps  |  AI {ai_rate:.0f} fps", DISPLAY_W - 260, 28, 0.42, (180, 180, 180))

    alpha_rect(frame, 0, DISPLAY_H - 22, DISPLAY_W, DISPLAY_H, DARK, 0.72)
    hud_text(frame, "YOLOv8s  |  Real-time person detection  |  SmartVenue PSU  |  Q to quit", 12, DISPLAY_H - 5, 0.36, (140, 140, 140))

    return frame


print("")
print("Camera engine running.")
print(f"Posting updates to {ROUTING_ENGINE_URL}")
print(f"Streaming detections for Gate {GATE_ID}")
print("Press Q to quit")
print("")

cv2.namedWindow("SmartVenue | Crowd Analytics", cv2.WINDOW_NORMAL)
cv2.resizeWindow("SmartVenue | Crowd Analytics", DISPLAY_W, DISPLAY_H)

frame_counter = 0
frame_time = time.time()

while True:
    with lock:
        raw = latest_raw

    if raw is None:
        time.sleep(0.005)
        continue

    display = draw_frame(raw)
    cv2.imshow("SmartVenue | Crowd Analytics", display)

    frame_counter += 1
    now = time.time()
    if now - frame_time >= 1.0:
        with lock:
            fps_display = frame_counter / (now - frame_time)
        frame_counter = 0
        frame_time = now

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()

"""
YOLOv8-based evidence detector for crime scene images.
Detects 11 evidence classes with bounding boxes.
Falls back to a pretrained COCO model if custom model is not found,
mapping COCO classes to the closest evidence classes.
"""
from __future__ import annotations
import logging
import shutil
from pathlib import Path
from typing import List, Dict

import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

EVIDENCE_CLASSES = [
    "Person", "Gun", "Knife", "Blood", "Mask", "Gloves",
    "Mobile Phone", "Bag", "Vehicle", "Broken Glass", "Suspicious Object",
]

# Weights for risk engine
EVIDENCE_WEIGHTS = {
    "Gun": 25,
    "Blood": 20,
    "Knife": 18,
    "Suspicious Object": 15,
    "Broken Glass": 10,
    "Mask": 8,
    "Gloves": 8,
    "Vehicle": 5,
    "Mobile Phone": 3,
    "Bag": 3,
    "Person": 2,
}

# COCO fallback mapping: coco class name → evidence class
COCO_TO_EVIDENCE = {
    "person": "Person",
    "knife": "Knife",
    "cell phone": "Mobile Phone",
    "handbag": "Bag",
    "backpack": "Bag",
    "suitcase": "Bag",
    "car": "Vehicle",
    "truck": "Vehicle",
    "motorcycle": "Vehicle",
    "bus": "Vehicle",
}

CONFIDENCE_THRESHOLD = 0.40
IOU_THRESHOLD = 0.45

_yolo_model = None


def _load_model():
    global _yolo_model
    if _yolo_model is None:
        from ultralytics import YOLO
        from app.config import settings

        custom_path = Path(settings.YOLO_MODEL_PATH)
        if custom_path.exists():
            logger.info(f"Loading custom YOLOv8 model: {custom_path}")
            _yolo_model = YOLO(str(custom_path))
        else:
            logger.warning(
                f"Custom YOLO model not found at {custom_path}. "
                "Falling back to yolov8n pretrained on COCO."
            )
            _yolo_model = YOLO("yolov8n.pt")

        logger.info("YOLOv8 model loaded")


def detect_evidence(image_path: str, annotated_output_path: str) -> List[Dict]:
    """
    Run YOLOv8 on image, draw bounding boxes, save annotated image.
    Returns list of evidence dicts: {class_name, count, confidence, bounding_boxes}
    """
    _load_model()

    results = _yolo_model.predict(
        source=image_path,
        conf=CONFIDENCE_THRESHOLD,
        iou=IOU_THRESHOLD,
        verbose=False,
    )

    img = cv2.imread(image_path)
    if img is None:
        img_pil = Image.open(image_path).convert("RGB")
        img = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)

    evidence_map: Dict[str, Dict] = {}

    result = results[0]
    names = result.names  # {idx: class_name}

    if result.boxes is not None:
        for box in result.boxes:
            raw_class = names[int(box.cls[0])].lower()
            conf = float(box.conf[0])

            # Map to evidence class
            evidence_class = None
            raw_title = raw_class.title()
            if raw_title in EVIDENCE_CLASSES:
                evidence_class = raw_title
            elif raw_class in COCO_TO_EVIDENCE:
                evidence_class = COCO_TO_EVIDENCE[raw_class]
            else:
                # Try partial match
                for ev in EVIDENCE_CLASSES:
                    if ev.lower() in raw_class or raw_class in ev.lower():
                        evidence_class = ev
                        break

            if evidence_class is None:
                continue  # skip non-evidence detections

            x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]

            if evidence_class not in evidence_map:
                evidence_map[evidence_class] = {
                    "class_name": evidence_class,
                    "count": 0,
                    "confidence_sum": 0.0,
                    "bounding_boxes": [],
                }
            evidence_map[evidence_class]["count"] += 1
            evidence_map[evidence_class]["confidence_sum"] += conf
            evidence_map[evidence_class]["bounding_boxes"].append(
                {"x1": x1, "y1": y1, "x2": x2, "y2": y2}
            )

            # Draw on image
            color = _get_color(evidence_class)
            cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
            label = f"{evidence_class} {conf:.2f}"
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
            cv2.rectangle(img, (x1, y1 - th - 6), (x1 + tw + 4, y1), color, -1)
            cv2.putText(img, label, (x1 + 2, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)

    # Save annotated image
    Path(annotated_output_path).parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(annotated_output_path, img)

    # Build final evidence list
    evidence_list = []
    for ev_data in evidence_map.values():
        count = ev_data["count"]
        evidence_list.append({
            "class_name": ev_data["class_name"],
            "count": count,
            "confidence": round(ev_data["confidence_sum"] / count, 4),
            "bounding_boxes": ev_data["bounding_boxes"],
        })

    logger.info(f"YOLO detected {len(evidence_list)} evidence classes: {[e['class_name'] for e in evidence_list]}")
    return evidence_list


def _get_color(class_name: str) -> tuple:
    """Return BGR color per evidence class."""
    palette = {
        "Gun": (0, 0, 255),
        "Knife": (0, 128, 255),
        "Blood": (0, 0, 180),
        "Person": (255, 128, 0),
        "Mask": (128, 0, 255),
        "Gloves": (255, 0, 255),
        "Vehicle": (0, 255, 128),
        "Bag": (128, 255, 0),
        "Mobile Phone": (255, 255, 0),
        "Broken Glass": (0, 200, 200),
        "Suspicious Object": (50, 50, 255),
    }
    return palette.get(class_name, (0, 165, 255))

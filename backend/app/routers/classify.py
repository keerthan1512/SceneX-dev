"""
POST /classify
Standalone crime scene classifier — upload an image, get back
the crime type + all class probabilities. No case is created.
"""
from __future__ import annotations
import logging
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List

from app.services.auth_service import get_current_user
from app.utils.file_handler import ALLOWED_MIME_TYPES, MAX_BYTES

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/classify", tags=["Classify"])


class ClassProbability(BaseModel):
    crime_type: str
    probability: float


class ClassifyResponse(BaseModel):
    predicted_class: str
    confidence: float
    all_probabilities: List[ClassProbability]


@router.post("", response_model=ClassifyResponse)
async def classify_scene(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """
    Upload a crime scene image and get an instant classification result.
    Returns the top predicted crime type, confidence, and full probability
    distribution across all 10 classes. No case record is created.
    """
    # ── Validate file ─────────────────────────────────────────────────────────
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid file type '{file.content_type}'. Allowed: JPEG, PNG, WEBP, BMP",
        )
    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(status_code=422, detail="File too large. Maximum 20 MB.")

    # ── Save to temp file and run CLIP ────────────────────────────────────────
    suffix = Path(file.filename or "image.jpg").suffix or ".jpg"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        predicted, confidence, all_probs = classify_image_full(tmp_path)
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    return ClassifyResponse(
        predicted_class=predicted,
        confidence=confidence,
        all_probabilities=[
            ClassProbability(crime_type=k, probability=v)
            for k, v in sorted(all_probs.items(), key=lambda x: x[1], reverse=True)
        ],
    )


def classify_image_full(image_path: str):
    """
    Extended version of clip_classifier that returns all class probabilities.
    Uses the trained MLP on CLIP features. Accesses models via module reference
    so lazy-loaded globals are always current.
    """
    import app.ai.clip_classifier as cc
    import torch
    import numpy as np
    from PIL import Image

    # Ensure all models are loaded
    cc._load_models()

    image = Image.open(image_path).convert("RGB")

    # Extract L2-normalised CLIP image embedding
    inputs = cc._clip_processor(images=image, return_tensors="pt")
    with torch.no_grad():
        features = cc._clip_model.get_image_features(**inputs)
        features = features / features.norm(p=2, dim=-1, keepdim=True)

    features_np = features.cpu().numpy()  # shape: (1, 512)

    # Get all class probabilities from MLP
    proba = cc._classifier.predict_proba(features_np)[0]          # shape: (n_classes,)
    classes = cc._label_encoder.classes_                          # array of class name strings

    best_idx = int(np.argmax(proba))
    all_probs = {
        classes[i]: round(float(proba[i]), 5)
        for i in range(len(classes))
    }

    return classes[best_idx], round(float(proba[best_idx]), 5), all_probs

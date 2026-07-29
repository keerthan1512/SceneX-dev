"""
CLIP-based crime scene classifier.
Uses openai/clip-vit-base-patch32 as a feature extractor and a pre-trained
sklearn MLP classifier (saved_model.joblib + label_encoder.joblib) for
classification — replacing the previous zero-shot text-similarity approach.

Public interface is unchanged:
    classify_image(image_path: str) -> Tuple[str, float]
"""
from __future__ import annotations
import logging
from typing import Tuple

from PIL import Image

logger = logging.getLogger(__name__)

# Lazily loaded singletons
_clip_model = None
_clip_processor = None
_classifier = None
_label_encoder = None


def _load_models():
    global _clip_model, _clip_processor, _classifier, _label_encoder

    if _clip_model is None:
        try:
            from transformers import CLIPProcessor, CLIPModel
            from app.config import settings

            logger.info(f"Loading CLIP feature extractor: {settings.CLIP_MODEL_NAME}")
            _clip_processor = CLIPProcessor.from_pretrained(settings.CLIP_MODEL_NAME)
            _clip_model = CLIPModel.from_pretrained(settings.CLIP_MODEL_NAME)
            _clip_model.eval()
            logger.info("CLIP feature extractor loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load CLIP model: {e}")
            raise

    if _classifier is None:
        try:
            import joblib
            from app.config import settings

            logger.info(f"Loading MLP classifier: {settings.CLIP_CLASSIFIER_PATH}")
            _classifier = joblib.load(settings.CLIP_CLASSIFIER_PATH)
            logger.info(f"Loading label encoder: {settings.CLIP_LABEL_ENCODER_PATH}")
            _label_encoder = joblib.load(settings.CLIP_LABEL_ENCODER_PATH)
            logger.info("MLP classifier and label encoder loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load MLP classifier or label encoder: {e}")
            raise


def classify_image(image_path: str) -> Tuple[str, float]:
    """
    Classify a crime scene image using the trained MLP on CLIP embeddings.
    Returns (crime_type_label, confidence_score 0.0–1.0)
    """
    _load_models()
    import torch
    import numpy as np

    image = Image.open(image_path).convert("RGB")

    # Extract L2-normalised CLIP image embedding (512-dim)
    inputs = _clip_processor(images=image, return_tensors="pt")
    with torch.no_grad():
        features = _clip_model.get_image_features(**inputs)
        features = features / features.norm(p=2, dim=-1, keepdim=True)

    features_np = features.cpu().numpy()  # shape: (1, 512)

    # Predict with the trained MLP classifier
    pred = _classifier.predict(features_np)                    # encoded label index
    proba = _classifier.predict_proba(features_np)[0]          # probabilities per class

    crime_type = _label_encoder.inverse_transform(pred)[0]     # decode to string
    confidence = float(np.max(proba))                          # highest class probability

    logger.info(f"MLP classification: {crime_type} ({confidence:.3f})")
    return crime_type, confidence

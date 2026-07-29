"""
Risk Engine — computes weighted risk score from detected evidence.
Score = min(100, sum(weight × count) for all detected evidence)
"""
from typing import List, Dict, Tuple
from app.ai.yolo_detector import EVIDENCE_WEIGHTS


def compute_risk(evidence_list: List[Dict]) -> Tuple[int, str]:
    """
    Returns (risk_score: int 0-100, risk_level: str)
    """
    score = 0
    for item in evidence_list:
        class_name = item["class_name"]
        count = item["count"]
        weight = EVIDENCE_WEIGHTS.get(class_name, 1)
        score += weight * count

    score = min(100, score)

    if score < 25:
        level = "low"
    elif score < 50:
        level = "medium"
    elif score < 75:
        level = "high"
    else:
        level = "critical"

    return score, level

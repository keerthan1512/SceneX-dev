"""
Groq LLM Reasoner — generates probabilistic crime narrative, 
sequence of events, and investigation recommendations.
"""
from __future__ import annotations
import json
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a forensic AI assistant helping investigators analyze crime scenes.
Your role is to provide PROBABILISTIC analysis based on visual evidence.
You MUST use uncertain, probabilistic language throughout your response.
Never make definitive statements. Always use phrases like:
- "possibly", "likely", "suggests", "may indicate", "appears to", "could be", "probable"

Example: "The scene suggests a possible robbery involving a firearm" — NOT "A robbery occurred."

You will receive structured evidence data and must respond with a JSON object only.
Do not include any text outside the JSON object."""

USER_PROMPT_TEMPLATE = """Analyze this crime scene evidence and provide a forensic assessment.

Crime Classification: {crime_type} (Confidence: {confidence:.1%})
Risk Score: {risk_score}/100 (Level: {risk_level})

Detected Evidence:
{evidence_text}

Respond with ONLY a valid JSON object in this exact format:
{{
  "summary": "A 2-3 sentence probabilistic narrative describing what may have occurred at this scene.",
  "sequence_of_events": [
    "First probable event or action",
    "Second probable event or action",
    "Third probable event or action"
  ],
  "recommendations": [
    "Actionable investigation step 1",
    "Actionable investigation step 2",
    "Actionable investigation step 3"
  ]
}}"""


def _format_evidence(evidence_list: List[Dict]) -> str:
    if not evidence_list:
        return "No specific evidence objects detected."
    lines = []
    for item in evidence_list:
        lines.append(
            f"- {item['class_name']}: {item['count']} instance(s) "
            f"(avg confidence: {item['confidence']:.1%})"
        )
    return "\n".join(lines)


def _fallback_response(crime_type: str, risk_level: str, evidence_list: List[Dict]) -> Dict:
    """Generate a basic response when LLM is unavailable."""
    evidence_names = [e["class_name"] for e in evidence_list] if evidence_list else ["unknown items"]
    ev_str = ", ".join(evidence_names) if evidence_names else "unidentified objects"
    return {
        "summary": (
            f"The scene possibly suggests a {crime_type.lower()} incident. "
            f"Visual analysis may indicate the presence of {ev_str}, "
            f"suggesting a {risk_level} risk situation. Further investigation is recommended."
        ),
        "sequence_of_events": [
            f"An incident possibly consistent with {crime_type.lower()} may have occurred at this location.",
            f"Evidence suggesting {ev_str} was potentially observed at the scene.",
            "The sequence and timing of events remains uncertain and requires further investigation.",
        ],
        "recommendations": [
            "Secure the perimeter and preserve physical evidence for forensic examination.",
            f"Interview potential witnesses regarding any activity consistent with {crime_type.lower()}.",
            "Cross-reference findings with similar incident reports in the database.",
        ],
    }


async def generate_reasoning(
    crime_type: str,
    crime_confidence: float,
    risk_score: int,
    risk_level: str,
    evidence_list: List[Dict],
) -> Dict:
    """
    Call Groq LLM to generate reasoning JSON.
    Falls back to template-based response on error.
    """
    from app.config import settings

    if not settings.GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not set — using fallback LLM response")
        return _fallback_response(crime_type, risk_level, evidence_list)

    evidence_text = _format_evidence(evidence_list)
    user_prompt = USER_PROMPT_TEMPLATE.format(
        crime_type=crime_type,
        confidence=crime_confidence,
        risk_score=risk_score,
        risk_level=risk_level,
        evidence_text=evidence_text,
    )

    try:
        from groq import Groq

        client = Groq(api_key=settings.GROQ_API_KEY)
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=1024,
            timeout=20,
        )
        raw = response.choices[0].message.content.strip()

        # Extract JSON from response
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()

        result = json.loads(raw)
        # Validate required keys
        for key in ("summary", "sequence_of_events", "recommendations"):
            if key not in result:
                raise ValueError(f"Missing key: {key}")

        logger.info("LLM reasoning generated successfully")
        return result

    except Exception as e:
        logger.error(f"LLM reasoning failed: {e}. Using fallback.")
        return _fallback_response(crime_type, risk_level, evidence_list)

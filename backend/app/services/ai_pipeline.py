"""
Orchestrates the 6-step AI analysis pipeline:
1. CLIP crime classification
2. YOLOv8 evidence detection
3. Evidence statistics aggregation (done inside YOLO)
4. Groq LLM reasoning
5. Risk score computation
6. ReportLab PDF generation
"""
from __future__ import annotations
import logging
from datetime import datetime, timezone
from pathlib import Path

from bson import ObjectId

from app.config import settings
from app.db.collections import cases_collection, users_collection, organizations_collection
from app.ai.clip_classifier import classify_image
from app.ai.yolo_detector import detect_evidence
from app.ai.risk_engine import compute_risk
from app.ai.llm_reasoner import generate_reasoning
from app.ai.report_builder import generate_report

logger = logging.getLogger(__name__)


async def run_pipeline(case_db_id: str):
    """
    Entry point for background pipeline execution.
    Updates the case document at each step.
    """
    cases = cases_collection()
    case = await cases.find_one({"_id": ObjectId(case_db_id)})
    if not case:
        logger.error(f"Pipeline: case {case_db_id} not found")
        return

    image_path = str(Path(settings.STORAGE_PATH) / case["image_path"])

    try:
        # ── Step 1: Crime Classification ──────────────────────────────────────
        logger.info(f"Pipeline [{case['case_id']}] Step 1: CLIP classification")
        crime_type, crime_confidence = classify_image(image_path)

        await cases.update_one(
            {"_id": ObjectId(case_db_id)},
            {"$set": {"crime_type": crime_type, "crime_confidence": crime_confidence}},
        )

        # ── Step 2 & 3: Evidence Detection ────────────────────────────────────
        logger.info(f"Pipeline [{case['case_id']}] Step 2: YOLO detection")
        annotated_filename = f"annotated_{Path(case['image_path']).name}"
        annotated_rel_path = f"images/{annotated_filename}"
        annotated_abs_path = str(Path(settings.STORAGE_PATH) / annotated_rel_path)

        evidence_list = detect_evidence(image_path, annotated_abs_path)

        await cases.update_one(
            {"_id": ObjectId(case_db_id)},
            {
                "$set": {
                    "evidence_detected": evidence_list,
                    "annotated_image_path": annotated_rel_path,
                }
            },
        )

        # ── Step 5: Risk Score (before LLM so we can pass it) ────────────────
        logger.info(f"Pipeline [{case['case_id']}] Step 5: Risk computation")
        risk_score, risk_level = compute_risk(evidence_list)

        await cases.update_one(
            {"_id": ObjectId(case_db_id)},
            {"$set": {"risk_score": risk_score, "risk_level": risk_level}},
        )

        # ── Step 4: LLM Reasoning ─────────────────────────────────────────────
        logger.info(f"Pipeline [{case['case_id']}] Step 4: LLM reasoning")
        llm_result = await generate_reasoning(
            crime_type=crime_type,
            crime_confidence=crime_confidence,
            risk_score=risk_score,
            risk_level=risk_level,
            evidence_list=evidence_list,
        )

        await cases.update_one(
            {"_id": ObjectId(case_db_id)},
            {
                "$set": {
                    "ai_summary": llm_result.get("summary", ""),
                    "sequence_of_events": llm_result.get("sequence_of_events", []),
                    "recommendations": llm_result.get("recommendations", []),
                }
            },
        )

        # ── Step 6: PDF Report ────────────────────────────────────────────────
        logger.info(f"Pipeline [{case['case_id']}] Step 6: PDF report generation")

        # Fetch user and org names for report
        investigator = await users_collection().find_one({"_id": case["investigator_id"]})
        org = await organizations_collection().find_one({"_id": case["org_id"]})
        investigator_name = investigator["name"] if investigator else "Unknown Investigator"
        org_name = org["name"] if org else "Unknown Organization"

        report_filename = f"report_{case['case_id']}.pdf"
        report_rel_path = f"reports/{report_filename}"
        report_abs_path = str(Path(settings.STORAGE_PATH) / report_rel_path)

        generate_report(
            output_path=report_abs_path,
            case_id=case["case_id"],
            investigator_name=investigator_name,
            org_name=org_name,
            created_at=case["created_at"],
            crime_type=crime_type,
            crime_confidence=crime_confidence,
            risk_score=risk_score,
            risk_level=risk_level,
            evidence_list=evidence_list,
            ai_summary=llm_result.get("summary", ""),
            sequence_of_events=llm_result.get("sequence_of_events", []),
            recommendations=llm_result.get("recommendations", []),
            original_image_path=image_path,
            annotated_image_path=annotated_abs_path,
            notes=case.get("notes", []),
        )

        # ── Finalize ──────────────────────────────────────────────────────────
        now = datetime.now(timezone.utc)
        await cases.update_one(
            {"_id": ObjectId(case_db_id)},
            {
                "$set": {
                    "report_path": report_rel_path,
                    "status": "under_investigation",
                    "analysis_completed_at": now,
                    "updated_at": now,
                    "analysis_failed": False,
                }
            },
        )
        logger.info(f"Pipeline [{case['case_id']}] COMPLETED successfully")

    except Exception as e:
        logger.error(f"Pipeline [{case.get('case_id', case_db_id)}] FAILED: {e}", exc_info=True)
        await cases.update_one(
            {"_id": ObjectId(case_db_id)},
            {
                "$set": {
                    "analysis_failed": True,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

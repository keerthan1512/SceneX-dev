from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId

from app.db.collections import cases_collection, users_collection
from app.models.case import CaseDetail, EvidenceItem, InvestigatorNote, BoundingBox


async def get_next_case_id(org_id: ObjectId) -> str:
    """Generate sequential case ID: CS-YYYY-NNNN scoped per org."""
    year = datetime.now(timezone.utc).year
    count = await cases_collection().count_documents({
        "org_id": org_id,
        "case_id": {"$regex": f"^CS-{year}-"},
    })
    return f"CS-{year}-{str(count + 1).zfill(4)}"


async def build_case_detail(doc: dict, base_url: str = "") -> CaseDetail:
    investigator = await users_collection().find_one({"_id": doc["investigator_id"]})
    investigator_name = investigator["name"] if investigator else "Unknown"

    def make_url(path: Optional[str]) -> Optional[str]:
        """
        Return a relative /storage/... URL so it resolves correctly in
        both local dev (proxied by Vite) and Docker (proxied by Nginx).
        base_url is kept for backward compat but ignored when empty.
        """
        if not path:
            return None
        if base_url:
            return f"{base_url}/storage/{path}"
        return f"/storage/{path}"

    evidence = []
    for ev in doc.get("evidence_detected", []):
        boxes = [BoundingBox(**b) for b in ev.get("bounding_boxes", [])]
        evidence.append(EvidenceItem(
            class_name=ev["class_name"],
            count=ev["count"],
            confidence=ev["confidence"],
            bounding_boxes=boxes,
        ))

    notes = []
    for n in doc.get("notes", []):
        notes.append(InvestigatorNote(
            note_id=n["note_id"],
            text=n["text"],
            author_id=str(n["author_id"]),
            author_name=n["author_name"],
            created_at=n["created_at"],
        ))

    return CaseDetail(
        id=str(doc["_id"]),
        case_id=doc["case_id"],
        org_id=str(doc["org_id"]),
        status=doc["status"],
        image_url=make_url(doc.get("image_path")),
        annotated_image_url=make_url(doc.get("annotated_image_path")),
        crime_type=doc.get("crime_type"),
        crime_confidence=doc.get("crime_confidence"),
        risk_score=doc.get("risk_score"),
        risk_level=doc.get("risk_level"),
        evidence_detected=evidence,
        ai_summary=doc.get("ai_summary"),
        sequence_of_events=doc.get("sequence_of_events", []),
        recommendations=doc.get("recommendations", []),
        report_url=make_url(doc.get("report_path")),
        notes=notes,
        investigator_id=str(doc["investigator_id"]),
        investigator_name=investigator_name,
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
        analysis_completed_at=doc.get("analysis_completed_at"),
        analysis_failed=doc.get("analysis_failed", False),
    )

import asyncio
import uuid
from datetime import datetime, timezone
from math import ceil
from pathlib import Path
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import FileResponse

from app.config import settings
from app.db.collections import cases_collection, users_collection
from app.models.case import (
    CaseDetail, CasesListResponse, CaseListItem, UploadResponse,
    StatusUpdateRequest, AddNoteRequest, case_doc_to_list_item,
)
from app.services.auth_service import get_current_user
from app.services.case_service import get_next_case_id, build_case_detail
from app.services.ai_pipeline import run_pipeline
from app.utils.file_handler import save_upload

router = APIRouter(prefix="/cases", tags=["Cases"])


def _storage_url(path: str) -> str:
    """
    Return a relative storage URL so it works in both dev and Docker.
    The frontend/nginx proxies /storage/* to the backend.
    """
    return f"/storage/{path}" if path else None


@router.post("/upload", response_model=UploadResponse, status_code=201)
async def upload_case(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """Upload a crime scene image and trigger the AI analysis pipeline."""
    image_rel_path = await save_upload(file, subfolder="images")

    org_id = ObjectId(current_user.org_id)
    case_id_str = await get_next_case_id(org_id)
    now = datetime.now(timezone.utc)

    case_doc = {
        "case_id": case_id_str,
        "org_id": org_id,
        "investigator_id": ObjectId(current_user.id),
        "status": "open",
        "image_path": image_rel_path,
        "crime_type": None,
        "crime_confidence": None,
        "risk_score": None,
        "risk_level": None,
        "evidence_detected": [],
        "annotated_image_path": None,
        "ai_summary": None,
        "sequence_of_events": [],
        "recommendations": [],
        "report_path": None,
        "notes": [],
        "analysis_failed": False,
        "analysis_completed_at": None,
        "created_at": now,
        "updated_at": now,
    }

    result = await cases_collection().insert_one(case_doc)
    case_db_id = str(result.inserted_id)

    # Org case count increment
    from app.db.collections import organizations_collection
    await organizations_collection().update_one(
        {"_id": org_id}, {"$inc": {"case_count": 1}}
    )

    # Fire-and-forget pipeline
    asyncio.create_task(run_pipeline(case_db_id))

    return UploadResponse(
        case_id=case_id_str,
        message=f"Case {case_id_str} created. AI analysis pipeline is running.",
    )


@router.get("", response_model=CasesListResponse)
async def list_cases(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    crime_type: Optional[str] = None,
    search: Optional[str] = None,
    current_user=Depends(get_current_user),
):
    """List all cases for the current user's organization."""
    query: dict = {"org_id": ObjectId(current_user.org_id)}

    if status:
        query["status"] = status
    if crime_type:
        query["crime_type"] = {"$regex": crime_type, "$options": "i"}
    if search:
        query["case_id"] = {"$regex": search, "$options": "i"}

    total = await cases_collection().count_documents(query)
    skip = (page - 1) * page_size

    cursor = cases_collection().find(query).sort("created_at", -1).skip(skip).limit(page_size)
    docs = await cursor.to_list(length=page_size)

    # Bulk fetch investigator names
    inv_ids = list({doc["investigator_id"] for doc in docs})
    investigators = await users_collection().find({"_id": {"$in": inv_ids}}).to_list(length=100)
    inv_map = {str(u["_id"]): u["name"] for u in investigators}

    cases_out = []
    for doc in docs:
        inv_name = inv_map.get(str(doc["investigator_id"]), "Unknown")
        item = CaseListItem(
            id=str(doc["_id"]),
            case_id=doc["case_id"],
            status=doc["status"],
            crime_type=doc.get("crime_type"),
            crime_confidence=doc.get("crime_confidence"),
            risk_score=doc.get("risk_score"),
            risk_level=doc.get("risk_level"),
            investigator_name=inv_name,
            created_at=doc["created_at"],
            analysis_completed_at=doc.get("analysis_completed_at"),
            image_url=_storage_url(doc['image_path']) if doc.get("image_path") else None,
        )
        cases_out.append(item)

    return CasesListResponse(
        cases=cases_out,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total else 1,
    )


@router.get("/{case_id}", response_model=CaseDetail)
async def get_case(case_id: str, current_user=Depends(get_current_user)):
    """Get full case detail."""
    doc = await cases_collection().find_one({
        "case_id": case_id,
        "org_id": ObjectId(current_user.org_id),
    })
    if not doc:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    return await build_case_detail(doc, "")


@router.patch("/{case_id}/status")
async def update_status(
    case_id: str,
    req: StatusUpdateRequest,
    current_user=Depends(get_current_user),
):
    result = await cases_collection().update_one(
        {"case_id": case_id, "org_id": ObjectId(current_user.org_id)},
        {"$set": {"status": req.status, "updated_at": datetime.now(timezone.utc)}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    return {"message": f"Status updated to {req.status}"}


@router.post("/{case_id}/notes")
async def add_note(
    case_id: str,
    req: AddNoteRequest,
    current_user=Depends(get_current_user),
):
    note = {
        "note_id": uuid.uuid4().hex,
        "text": req.text,
        "author_id": ObjectId(current_user.id),
        "author_name": current_user.name,
        "created_at": datetime.now(timezone.utc),
    }
    result = await cases_collection().update_one(
        {"case_id": case_id, "org_id": ObjectId(current_user.org_id)},
        {
            "$push": {"notes": note},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    return {"message": "Note added", "note_id": note["note_id"]}


@router.get("/{case_id}/report")
async def download_report(case_id: str, current_user=Depends(get_current_user)):
    doc = await cases_collection().find_one({
        "case_id": case_id,
        "org_id": ObjectId(current_user.org_id),
    })
    if not doc:
        raise HTTPException(status_code=404, detail="Case not found")
    if not doc.get("report_path"):
        raise HTTPException(status_code=404, detail="Report not yet generated")

    report_path = Path(settings.STORAGE_PATH) / doc["report_path"]
    if not report_path.exists():
        raise HTTPException(status_code=404, detail="Report file not found on disk")

    return FileResponse(
        path=str(report_path),
        media_type="application/pdf",
        filename=f"SceneSolver_{case_id}_Report.pdf",
    )


@router.delete("/{case_id}")
async def delete_case(case_id: str, current_user=Depends(get_current_user)):
    """Delete case — Org Admin only, after retention period check."""
    from app.services.auth_service import require_admin
    from app.models.user import UserRole

    if current_user.role != UserRole.org_admin:
        raise HTTPException(status_code=403, detail="Only organization admins can delete cases")

    doc = await cases_collection().find_one({
        "case_id": case_id,
        "org_id": ObjectId(current_user.org_id),
    })
    if not doc:
        raise HTTPException(status_code=404, detail="Case not found")

    # Retention check: 2-year minimum
    created_at = doc["created_at"]
    age_days = (datetime.now(timezone.utc) - created_at.replace(tzinfo=timezone.utc)).days
    if age_days < 730:
        raise HTTPException(
            status_code=403,
            detail=f"Case cannot be deleted. Minimum retention period is 2 years "
                   f"({730 - age_days} days remaining).",
        )

    await cases_collection().delete_one({"_id": doc["_id"]})
    # Decrement org case count
    from app.db.collections import organizations_collection
    await organizations_collection().update_one(
        {"_id": doc["org_id"]}, {"$inc": {"case_count": -1}}
    )

    return {"message": f"Case {case_id} deleted"}

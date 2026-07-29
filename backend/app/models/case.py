from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class CaseStatus(str, Enum):
    open = "open"
    under_investigation = "under_investigation"
    closed = "closed"


class RiskLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


# ── Sub-schemas ───────────────────────────────────────────────────────────────

class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class EvidenceItem(BaseModel):
    class_name: str
    count: int
    confidence: float
    bounding_boxes: List[BoundingBox] = []


class InvestigatorNote(BaseModel):
    note_id: str
    text: str
    author_id: str
    author_name: str
    created_at: datetime


# ── Requests ──────────────────────────────────────────────────────────────────

class StatusUpdateRequest(BaseModel):
    status: CaseStatus


class AddNoteRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)


# ── Responses ─────────────────────────────────────────────────────────────────

class CaseListItem(BaseModel):
    id: str
    case_id: str
    status: CaseStatus
    crime_type: Optional[str]
    crime_confidence: Optional[float]
    risk_score: Optional[int]
    risk_level: Optional[RiskLevel]
    investigator_name: str
    created_at: datetime
    analysis_completed_at: Optional[datetime]
    image_url: Optional[str]


class CaseDetail(BaseModel):
    id: str
    case_id: str
    org_id: str
    status: CaseStatus
    image_url: Optional[str]
    annotated_image_url: Optional[str]
    crime_type: Optional[str]
    crime_confidence: Optional[float]
    risk_score: Optional[int]
    risk_level: Optional[RiskLevel]
    evidence_detected: List[EvidenceItem] = []
    ai_summary: Optional[str]
    sequence_of_events: List[str] = []
    recommendations: List[str] = []
    report_url: Optional[str]
    notes: List[InvestigatorNote] = []
    investigator_id: str
    investigator_name: str
    created_at: datetime
    updated_at: datetime
    analysis_completed_at: Optional[datetime]
    analysis_failed: bool = False


class CasesListResponse(BaseModel):
    cases: List[CaseListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class UploadResponse(BaseModel):
    case_id: str
    message: str


def case_doc_to_list_item(doc: dict, investigator_name: str, base_url: str) -> CaseListItem:
    image_url = f"{base_url}/storage/{doc['image_path']}" if doc.get("image_path") else None
    return CaseListItem(
        id=str(doc["_id"]),
        case_id=doc["case_id"],
        status=doc["status"],
        crime_type=doc.get("crime_type"),
        crime_confidence=doc.get("crime_confidence"),
        risk_score=doc.get("risk_score"),
        risk_level=doc.get("risk_level"),
        investigator_name=investigator_name,
        created_at=doc["created_at"],
        analysis_completed_at=doc.get("analysis_completed_at"),
        image_url=image_url,
    )

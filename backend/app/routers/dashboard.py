from bson import ObjectId
from fastapi import APIRouter, Depends
from app.db.collections import cases_collection
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
async def get_stats(current_user=Depends(get_current_user)):
    """Dashboard statistics for the current org."""
    org_id = ObjectId(current_user.org_id)

    total_cases = await cases_collection().count_documents({"org_id": org_id})

    # Risk distribution
    risk_pipeline = [
        {"$match": {"org_id": org_id, "risk_level": {"$ne": None}}},
        {"$group": {"_id": "$risk_level", "count": {"$sum": 1}}},
    ]
    risk_cursor = cases_collection().aggregate(risk_pipeline)
    risk_dist = {doc["_id"]: doc["count"] async for doc in risk_cursor}

    # Crime type distribution
    crime_pipeline = [
        {"$match": {"org_id": org_id, "crime_type": {"$ne": None}}},
        {"$group": {"_id": "$crime_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    crime_cursor = cases_collection().aggregate(crime_pipeline)
    crime_dist = [{"crime_type": d["_id"], "count": d["count"]} async for d in crime_cursor]

    # Status distribution
    status_pipeline = [
        {"$match": {"org_id": org_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    status_cursor = cases_collection().aggregate(status_pipeline)
    status_dist = {doc["_id"]: doc["count"] async for doc in status_cursor}

    # Recent 5 cases
    recent_cursor = cases_collection().find(
        {"org_id": org_id},
        {"case_id": 1, "crime_type": 1, "risk_level": 1, "status": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5)
    recent = await recent_cursor.to_list(length=5)
    recent_out = [
        {
            "case_id": d["case_id"],
            "crime_type": d.get("crime_type"),
            "risk_level": d.get("risk_level"),
            "status": d["status"],
            "created_at": d["created_at"].isoformat(),
        }
        for d in recent
    ]

    # Top evidence types
    ev_pipeline = [
        {"$match": {"org_id": org_id, "evidence_detected": {"$ne": []}}},
        {"$unwind": "$evidence_detected"},
        {"$group": {"_id": "$evidence_detected.class_name", "total": {"$sum": "$evidence_detected.count"}}},
        {"$sort": {"total": -1}},
        {"$limit": 8},
    ]
    ev_cursor = cases_collection().aggregate(ev_pipeline)
    evidence_stats = [{"class_name": d["_id"], "total": d["total"]} async for d in ev_cursor]

    return {
        "total_cases": total_cases,
        "risk_distribution": risk_dist,
        "crime_distribution": crime_dist,
        "status_distribution": status_dist,
        "recent_cases": recent_out,
        "evidence_stats": evidence_stats,
    }

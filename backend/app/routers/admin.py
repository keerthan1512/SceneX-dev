from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.db.collections import users_collection
from app.models.user import UserRole, user_doc_to_out
from app.services.auth_service import get_current_user, require_admin, hash_password, get_org_name

router = APIRouter(prefix="/admin", tags=["Admin"])


class InviteInvestigatorRequest(BaseModel):
    name: str
    email: EmailStr
    department: Optional[str] = None
    password: str


class UpdateInvestigatorRequest(BaseModel):
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    department: Optional[str] = None


@router.get("/investigators")
async def list_investigators(current_user=Depends(require_admin)):
    """List all investigators in the org."""
    cursor = users_collection().find({"org_id": ObjectId(current_user.org_id)})
    users = await cursor.to_list(length=500)
    org_name = await get_org_name(ObjectId(current_user.org_id))
    return [user_doc_to_out(u, org_name) for u in users]


@router.post("/investigators", status_code=201)
async def add_investigator(
    req: InviteInvestigatorRequest,
    current_user=Depends(require_admin),
):
    """Add a new investigator to the org."""
    existing = await users_collection().find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_doc = {
        "org_id": ObjectId(current_user.org_id),
        "name": req.name,
        "email": req.email.lower(),
        "password_hash": hash_password(req.password),
        "role": UserRole.investigator,
        "department": req.department,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "last_login": None,
    }
    result = await users_collection().insert_one(user_doc)
    return {"message": "Investigator added", "user_id": str(result.inserted_id)}


@router.patch("/investigators/{user_id}")
async def update_investigator(
    user_id: str,
    req: UpdateInvestigatorRequest,
    current_user=Depends(require_admin),
):
    """Update investigator role or active status."""
    user = await users_collection().find_one({
        "_id": ObjectId(user_id),
        "org_id": ObjectId(current_user.org_id),
    })
    if not user:
        raise HTTPException(status_code=404, detail="Investigator not found")

    updates = {}
    if req.role is not None:
        updates["role"] = req.role
    if req.is_active is not None:
        updates["is_active"] = req.is_active
    if req.department is not None:
        updates["department"] = req.department

    if updates:
        await users_collection().update_one({"_id": ObjectId(user_id)}, {"$set": updates})

    return {"message": "Investigator updated"}

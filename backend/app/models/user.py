from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum
from bson import ObjectId


class UserRole(str, Enum):
    investigator = "investigator"
    org_admin = "org_admin"


# ── Requests ──────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    org_name: str = Field(..., min_length=2, max_length=200)
    role: UserRole = UserRole.investigator
    department: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Responses ─────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole
    department: Optional[str]
    org_id: str
    org_name: str
    is_active: bool
    created_at: datetime

    class Config:
        populate_by_name = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class AccessTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# ── DB Document helper ────────────────────────────────────────────────────────

def user_doc_to_out(user: dict, org_name: str) -> UserOut:
    return UserOut(
        id=str(user["_id"]),
        name=user["name"],
        email=user["email"],
        role=user["role"],
        department=user.get("department"),
        org_id=str(user["org_id"]),
        org_name=org_name,
        is_active=user.get("is_active", True),
        created_at=user["created_at"],
    )

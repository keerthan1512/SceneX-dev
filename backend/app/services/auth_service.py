import hashlib
from datetime import datetime, timezone
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import bcrypt
from bson import ObjectId

from app.db.collections import users_collection, organizations_collection
from app.models.user import RegisterRequest, LoginRequest, UserRole, user_doc_to_out
from app.utils.jwt_utils import (
    create_access_token,
    create_refresh_token,
    decode_token,
    decode_refresh_token,
)

bearer_scheme = HTTPBearer()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _prepare_password(password: str) -> bytes:
    """
    SHA-256 pre-hash before bcrypt to safely handle passwords > 72 bytes.
    Returns a 64-char hex digest encoded as UTF-8 bytes — always under the
    72-byte bcrypt limit.
    """
    return hashlib.sha256(password.encode("utf-8")).hexdigest().encode("utf-8")


def hash_password(password: str) -> str:
    hashed = bcrypt.hashpw(_prepare_password(password), bcrypt.gensalt(rounds=12))
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(_prepare_password(plain), hashed.encode("utf-8"))


async def get_org_name(org_id) -> str:
    org = await organizations_collection().find_one({"_id": org_id})
    return org["name"] if org else "Unknown"


# ── Register ──────────────────────────────────────────────────────────────────

async def register_user(req: RegisterRequest):
    users = users_collection()
    orgs = organizations_collection()

    existing = await users.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create org
    org_doc = {
        "name": req.org_name,
        "admin_user_id": None,
        "created_at": datetime.now(timezone.utc),
        "case_count": 0,
    }
    org_result = await orgs.insert_one(org_doc)
    org_id = org_result.inserted_id

    # Create user
    user_doc = {
        "org_id": org_id,
        "name": req.name,
        "email": req.email.lower(),
        "password_hash": hash_password(req.password),
        "role": req.role,
        "department": req.department,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "last_login": None,
    }
    user_result = await users.insert_one(user_doc)
    user_id = str(user_result.inserted_id)

    # Set org admin if first user / org_admin role
    if req.role == UserRole.org_admin:
        await orgs.update_one({"_id": org_id}, {"$set": {"admin_user_id": user_result.inserted_id}})

    access_token = create_access_token(user_id, str(org_id), req.role)
    refresh_token = create_refresh_token(user_id)

    user_doc["_id"] = user_result.inserted_id
    user_out = user_doc_to_out(user_doc, req.org_name)

    return access_token, refresh_token, user_out


# ── Login ─────────────────────────────────────────────────────────────────────

async def login_user(req: LoginRequest):
    users = users_collection()
    user = await users.find_one({"email": req.email.lower()})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account disabled")

    user_id = str(user["_id"])
    org_id = str(user["org_id"])

    await users.update_one({"_id": user["_id"]}, {"$set": {"last_login": datetime.now(timezone.utc)}})

    access_token = create_access_token(user_id, org_id, user["role"])
    refresh_token = create_refresh_token(user_id)

    org_name = await get_org_name(user["org_id"])
    user_out = user_doc_to_out(user, org_name)

    return access_token, refresh_token, user_out


# ── Refresh ───────────────────────────────────────────────────────────────────

async def refresh_access_token(refresh_token: str):
    user_id = decode_refresh_token(refresh_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user = await users_collection().find_one({"_id": ObjectId(user_id)})
    if not user or not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="User not found or disabled")

    new_access = create_access_token(user_id, str(user["org_id"]), user["role"])
    new_refresh = create_refresh_token(user_id)
    return new_access, new_refresh


# ── Current User Dependency ───────────────────────────────────────────────────

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    token = credentials.credentials
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid or expired access token")

    user_id = payload.get("sub")
    user = await users_collection().find_one({"_id": ObjectId(user_id)})
    if not user or not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="User not found or disabled")

    org_name = await get_org_name(user["org_id"])
    return user_doc_to_out(user, org_name)


async def require_admin(current_user=Depends(get_current_user)):
    if current_user.role != UserRole.org_admin:
        raise HTTPException(status_code=403, detail="Organization admin access required")
    return current_user

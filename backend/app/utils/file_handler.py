import os
import uuid
import aiofiles
from pathlib import Path
from fastapi import UploadFile, HTTPException
from app.config import settings

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp"}
MAX_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024


async def save_upload(file: UploadFile, subfolder: str = "images") -> str:
    """Validate, save upload, return relative path like 'images/uuid.jpg'"""
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid file type '{file.content_type}'. Allowed: JPEG, PNG, WEBP, BMP",
        )

    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(
            status_code=422,
            detail=f"File too large. Maximum size is {settings.MAX_FILE_SIZE_MB}MB",
        )

    ext = Path(file.filename or "image.jpg").suffix.lower() or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    dest_dir = Path(settings.STORAGE_PATH) / subfolder
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / filename

    async with aiofiles.open(dest_path, "wb") as f:
        await f.write(content)

    return f"{subfolder}/{filename}"


def get_storage_path(relative_path: str) -> Path:
    return Path(settings.STORAGE_PATH) / relative_path


def delete_file(relative_path: str):
    path = get_storage_path(relative_path)
    if path.exists():
        path.unlink()

from fastapi import APIRouter, Depends
from app.models.user import (
    RegisterRequest, LoginRequest, RefreshRequest,
    TokenResponse, AccessTokenResponse,
)
from app.services.auth_service import (
    register_user, login_user, refresh_access_token, get_current_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(req: RegisterRequest):
    access_token, refresh_token, user_out = await register_user(req)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_out,
    )


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    access_token, refresh_token, user_out = await login_user(req)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_out,
    )


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh(req: RefreshRequest):
    new_access, new_refresh = await refresh_access_token(req.refresh_token)
    return AccessTokenResponse(access_token=new_access, refresh_token=new_refresh)


@router.post("/logout")
async def logout(current_user=Depends(get_current_user)):
    # JWT is stateless; client discards tokens. 
    # In production, add token to a revocation list.
    return {"message": "Logged out successfully"}


@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    return current_user

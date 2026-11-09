from fastapi import APIRouter, Depends, HTTPException, Request, Response
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime, timezone
import time
from bson import ObjectId
from app.db.mongodb import get_database
from app.core.security import (
    verify_password, get_password_hash,
    create_token_pair, decode_token, hash_refresh_jti
)
from app.core.permissions import Role, ROLE_PERMISSIONS, get_current_user
from app.core.exceptions import ValidationError, UnauthorizedError, ConflictError, ForbiddenError, AccountPendingApprovalError, AccountDisabledError, RateLimitError
from app.core.constants import UserRole

router = APIRouter()
_login_attempts: dict[str, list[float]] = {}


def _check_login_rate_limit(request: Request, email: str) -> None:
    now = time.monotonic()
    key = f"{request.client.host if request.client else 'unknown'}:{email.lower()}"
    attempts = [stamp for stamp in _login_attempts.get(key, []) if now - stamp < 60]
    if len(attempts) >= 5:
        raise RateLimitError()
    attempts.append(now)
    _login_attempts[key] = attempts


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=100)
    phone: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{1,14}$")
    role: UserRole = UserRole.FARMER


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RefreshTokenRequest(BaseModel):
    refresh_token: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str]
    role: UserRole
    is_active: bool
    is_approved: bool
    created_at: datetime
    updated_at: datetime
    permissions: list[str] = []


def _user_payload(user: dict) -> dict:
    role = Role(user["role"])
    return {
        "id": str(user["_id"]), "email": user["email"], "full_name": user["full_name"],
        "phone": user.get("phone"), "role": role, "is_active": user.get("is_active", True),
        "is_approved": user.get("is_approved", True), "created_at": user["created_at"],
        "updated_at": user["updated_at"], "permissions": sorted(ROLE_PERMISSIONS[role]),
    }


async def _store_refresh_token(db: AsyncIOMotorDatabase, token: str, user_id: str) -> None:
    payload = decode_token(token)
    if not payload or not payload.get("jti") or not payload.get("family_id"):
        raise UnauthorizedError("Invalid refresh token")
    expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    await db.refresh_tokens.insert_one({
        "jti_hash": hash_refresh_jti(payload["jti"]), "user_id": user_id,
        "family_id": payload["family_id"], "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc), "rotated_at": None, "revoked_at": None,
    })


def _set_refresh_cookie(response: Response, token: str) -> None:
    from app.core.config import get_settings
    settings = get_settings()
    response.set_cookie(settings.refresh_cookie_name, token, httponly=True, secure=settings.cookie_secure,
                        samesite="lax", max_age=settings.jwt_refresh_token_expire_days * 86400,
                        path="/api/v1/auth")


@router.post("/register")
async def register(user_data: UserRegister, response: Response, db: AsyncIOMotorDatabase = Depends(get_database)):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise ConflictError("Email already registered")
    
    if user_data.role == UserRole.ADMIN:
        raise ValidationError("Cannot register as admin. Contact system administrator.")
    
    is_approved = user_data.role in [UserRole.FARMER, UserRole.BUYER]
    
    hashed_password = get_password_hash(user_data.password)
    
    user_doc = {
        "email": user_data.email,
        "password_hash": hashed_password,
        "full_name": user_data.full_name,
        "phone": user_data.phone,
        "role": user_data.role,
        "is_active": True,
        "is_approved": is_approved,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    if not is_approved:
        return {"status": "PENDING_APPROVAL", "user": {"email": user_data.email, "role": user_data.role}}
    
    tokens = create_token_pair(str(result.inserted_id), user_data.email, user_data.role)
    
    token_response = TokenResponse(
        **tokens,
        user=_user_payload(user_doc)
    )
    await _store_refresh_token(db, tokens["refresh_token"], str(result.inserted_id))
    _set_refresh_cookie(response, tokens["refresh_token"])
    return token_response


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, response: Response, request: Request, db: AsyncIOMotorDatabase = Depends(get_database)):
    _check_login_rate_limit(request, credentials.email)
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise UnauthorizedError("Invalid credentials")
    
    if not verify_password(credentials.password, user["password_hash"]):
        raise UnauthorizedError("Invalid credentials")
    
    if not user.get("is_active", True):
        raise AccountDisabledError()
    
    if not user.get("is_approved", True):
        raise AccountPendingApprovalError()
    
    tokens = create_token_pair(str(user["_id"]), user["email"], user["role"])
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.now(timezone.utc)}}
    )
    
    await _store_refresh_token(db, tokens["refresh_token"], str(user["_id"]))
    _set_refresh_cookie(response, tokens["refresh_token"])
    return TokenResponse(**tokens, user=_user_payload(user))


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(response: Response, raw_request: Request, request: RefreshTokenRequest | None = None,
                        db: AsyncIOMotorDatabase = Depends(get_database)):
    from app.core.config import get_settings
    settings = get_settings()
    token = (request.refresh_token if request else None) or raw_request.cookies.get(settings.refresh_cookie_name)
    payload = decode_token(token) if token else None
    if not payload or payload.get("type") != "refresh":
        raise UnauthorizedError("Invalid refresh token")

    token_doc = await db.refresh_tokens.find_one({"jti_hash": hash_refresh_jti(payload.get("jti", ""))})
    if not token_doc:
        raise UnauthorizedError("Refresh token revoked or unknown")
    if token_doc.get("rotated_at") or token_doc.get("revoked_at"):
        await db.refresh_tokens.update_many({"family_id": token_doc["family_id"]}, {"$set": {"revoked_at": datetime.now(timezone.utc)}})
        raise UnauthorizedError("Refresh token reuse detected")
    rotated = await db.refresh_tokens.update_one(
        {"_id": token_doc["_id"], "rotated_at": None, "revoked_at": None},
        {"$set": {"rotated_at": datetime.now(timezone.utc)}})
    if rotated.modified_count != 1:
        raise UnauthorizedError("Refresh token reuse detected")

    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user or not user.get("is_active", True):
        raise UnauthorizedError("User not found or inactive")
    if not user.get("is_approved", True):
        raise AccountPendingApprovalError()
    
    tokens = create_token_pair(str(user["_id"]), user["email"], user["role"])
    
    tokens["refresh_token"] = create_token_pair(str(user["_id"]), user["email"], user["role"])["refresh_token"]
    from app.core.security import create_refresh_token
    tokens["refresh_token"] = create_refresh_token({"sub": str(user["_id"]), "email": user["email"], "role": user["role"], "family_id": payload["family_id"]})
    await _store_refresh_token(db, tokens["refresh_token"], str(user["_id"]))
    _set_refresh_cookie(response, tokens["refresh_token"])
    return TokenResponse(**tokens, user=_user_payload(user))


@router.post("/logout")
async def logout(response: Response, current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_database)):
    await db.refresh_tokens.update_many({"user_id": current_user["sub"], "revoked_at": None}, {"$set": {"revoked_at": datetime.now(timezone.utc)}})
    from app.core.config import get_settings
    response.delete_cookie(get_settings().refresh_cookie_name, path="/api/v1/auth")
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_database)):
    user = await db.users.find_one({"_id": ObjectId(current_user["sub"])})
    if not user:
        raise UnauthorizedError("User not found")
    
    return UserResponse(**_user_payload(user))

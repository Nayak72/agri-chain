import time
from datetime import datetime, timezone
from typing import Optional, Union
from fastapi import APIRouter, Depends, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from bson import ObjectId

from app.db.mongodb import get_database
from app.core.security import (
    verify_password, get_password_hash,
    create_token_pair
)
from app.core.permissions import Role, ROLE_PERMISSIONS, get_current_user
from app.core.exceptions import (
    ValidationError, UnauthorizedError, ConflictError, ForbiddenError,
    AccountPendingApprovalError, AccountDisabledError, RateLimitError, NotFoundError
)
from app.core.constants import UserRole
from app.schemas.validators import normalize_email

router = APIRouter()
_failed_login_attempts: dict[str, list[float]] = {}


def _record_failed_login(request: Request, email: str) -> None:
    now = time.monotonic()
    key = f"{request.client.host if request.client else 'unknown'}:{email.lower()}"
    attempts = [stamp for stamp in _failed_login_attempts.get(key, []) if now - stamp < 60]
    attempts.append(now)
    _failed_login_attempts[key] = attempts


def _check_login_rate_limit(request: Request, email: str) -> None:
    now = time.monotonic()
    key = f"{request.client.host if request.client else 'unknown'}:{email.lower()}"
    attempts = [stamp for stamp in _failed_login_attempts.get(key, []) if now - stamp < 60]
    if len(attempts) >= 5:
        raise RateLimitError()


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(...)
    full_name: str = Field(...)
    phone: Optional[str] = Field(None)
    role: UserRole = UserRole.FARMER
    model_config = ConfigDict(extra="forbid")


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    model_config = ConfigDict(extra="forbid")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class RegistrationPendingResponse(BaseModel):
    status: str = "PENDING_APPROVAL"
    user: dict


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    role: UserRole
    is_active: bool = True
    is_approved: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    permissions: list[str] = Field(default_factory=list)


def _user_payload(user: dict) -> dict:
    role_raw = user.get("role", "FARMER")
    try:
        role = Role(role_raw)
    except Exception:
        role = Role.FARMER
    return {
        "id": str(user["_id"]),
        "email": user.get("email", ""),
        "full_name": user.get("full_name", ""),
        "phone": user.get("phone"),
        "role": role.value if hasattr(role, "value") else str(role),
        "is_active": user.get("is_active", True),
        "is_approved": user.get("is_approved", True),
        "created_at": user.get("created_at"),
        "updated_at": user.get("updated_at"),
        "permissions": sorted(list(ROLE_PERMISSIONS.get(role, set()))),
    }


@router.post("/register", response_model=Union[TokenResponse, RegistrationPendingResponse])
async def register(user_data: UserRegister, db: AsyncIOMotorDatabase = Depends(get_database)):
    clean_email = normalize_email(user_data.email)
    existing = await db.users.find_one({"email": clean_email})
    if existing:
        raise ConflictError("Email already registered")
    
    if user_data.role == UserRole.ADMIN:
        raise ValidationError("Cannot register as admin. Contact system administrator.")
    
    is_approved = user_data.role in [UserRole.FARMER, UserRole.BUYER]
    hashed_password = get_password_hash(user_data.password)
    now = datetime.now(timezone.utc)
    
    user_doc = {
        "email": clean_email,
        "password_hash": hashed_password,
        "full_name": user_data.full_name.strip(),
        "phone": user_data.phone,
        "role": user_data.role.value if hasattr(user_data.role, "value") else str(user_data.role),
        "is_active": True,
        "is_approved": is_approved,
        "created_at": now,
        "updated_at": now,
    }
    
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    if not is_approved:
        return {
            "status": "PENDING_APPROVAL",
            "message": "Account created. Awaiting admin approval.",
            "user": _user_payload(user_doc)
        }
    
    tokens = create_token_pair(str(result.inserted_id), clean_email, user_doc["role"])
    return TokenResponse(**tokens, user=_user_payload(user_doc))


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, request: Request, db: AsyncIOMotorDatabase = Depends(get_database)):
    clean_email = normalize_email(credentials.email)
    _check_login_rate_limit(request, clean_email)
    
    user = await db.users.find_one({"email": clean_email})
    if not user:
        _record_failed_login(request, clean_email)
        raise UnauthorizedError("Invalid credentials")
    
    password_hash = user.get("password_hash")
    if not password_hash or not verify_password(credentials.password, password_hash):
        _record_failed_login(request, clean_email)
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
    
    return TokenResponse(**tokens, user=_user_payload(user))


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_database)):
    if not ObjectId.is_valid(current_user["sub"]):
        raise UnauthorizedError("Invalid user token subject")
    user = await db.users.find_one({"_id": ObjectId(current_user["sub"])})
    if not user:
        raise UnauthorizedError("User not found")
    
    return UserResponse(**_user_payload(user))

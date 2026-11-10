import hashlib
import time
from datetime import datetime, timezone
from typing import Optional, Union
from fastapi import APIRouter, Depends, Request, Response
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from bson import ObjectId

from app.db.mongodb import get_database
from app.core.security import (
    verify_password, get_password_hash,
    create_token_pair, create_refresh_token, decode_token, hash_refresh_jti
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
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=100)
    phone: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{1,14}$")
    role: UserRole = UserRole.FARMER
    model_config = ConfigDict(extra="forbid")


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    model_config = ConfigDict(extra="forbid")


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RegistrationPendingResponse(BaseModel):
    status: str = "PENDING_APPROVAL"
    user: dict


class RefreshTokenRequest(BaseModel):
    refresh_token: Optional[str] = None
    model_config = ConfigDict(extra="forbid")


class ActivateDriverRequest(BaseModel):
    invitation_token: str = Field(..., min_length=10)
    password: str = Field(..., min_length=8)
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{1,14}$")
    model_config = ConfigDict(extra="forbid")


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


async def _store_refresh_token(db: AsyncIOMotorDatabase, token: str, user_id: str) -> None:
    payload = decode_token(token)
    if not payload or not payload.get("jti") or not payload.get("family_id"):
        raise UnauthorizedError("Invalid refresh token")
    expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    await db.refresh_tokens.insert_one({
        "jti_hash": hash_refresh_jti(payload["jti"]),
        "user_id": user_id,
        "family_id": payload["family_id"],
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc),
        "rotated_at": None,
        "revoked_at": None,
    })


def _set_refresh_cookie(response: Response, token: str) -> None:
    from app.core.config import get_settings
    settings = get_settings()
    response.set_cookie(
        settings.refresh_cookie_name, token, httponly=True, secure=settings.cookie_secure,
        samesite="lax", max_age=settings.jwt_refresh_token_expire_days * 86400,
        path="/api/v1/auth"
    )


@router.post("/register", response_model=Union[TokenResponse, RegistrationPendingResponse])
async def register(user_data: UserRegister, response: Response, db: AsyncIOMotorDatabase = Depends(get_database)):
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
    await _store_refresh_token(db, tokens["refresh_token"], str(result.inserted_id))
    _set_refresh_cookie(response, tokens["refresh_token"])
    return TokenResponse(**tokens, user=_user_payload(user_doc))


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, response: Response, request: Request, db: AsyncIOMotorDatabase = Depends(get_database)):
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
    
    await _store_refresh_token(db, tokens["refresh_token"], str(user["_id"]))
    _set_refresh_cookie(response, tokens["refresh_token"])
    return TokenResponse(**tokens, user=_user_payload(user))


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    response: Response, raw_request: Request, request: RefreshTokenRequest | None = None,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    from app.core.config import get_settings
    settings = get_settings()
    token = (request.refresh_token if request else None) or raw_request.cookies.get(settings.refresh_cookie_name)
    payload = decode_token(token) if token else None
    if not payload or payload.get("type") != "refresh":
        raise UnauthorizedError("Invalid refresh token")

    jti = payload.get("jti")
    family_id = payload.get("family_id")
    if not jti or not family_id:
        raise UnauthorizedError("Invalid refresh token payload")

    token_doc = await db.refresh_tokens.find_one({"jti_hash": hash_refresh_jti(jti)})
    if not token_doc:
        raise UnauthorizedError("Refresh token revoked or unknown")
    
    if token_doc.get("rotated_at") or token_doc.get("revoked_at"):
        await db.refresh_tokens.update_many({"family_id": family_id}, {"$set": {"revoked_at": datetime.now(timezone.utc)}})
        raise UnauthorizedError("Refresh token reuse detected")
    
    rotated = await db.refresh_tokens.update_one(
        {"_id": token_doc["_id"], "rotated_at": None, "revoked_at": None},
        {"$set": {"rotated_at": datetime.now(timezone.utc)}}
    )
    if rotated.modified_count != 1:
        raise UnauthorizedError("Refresh token reuse detected")

    user_sub = payload.get("sub")
    if not user_sub or not ObjectId.is_valid(user_sub):
        raise UnauthorizedError("Invalid token subject")
    
    user = await db.users.find_one({"_id": ObjectId(user_sub)})
    if not user or not user.get("is_active", True):
        raise UnauthorizedError("User not found or inactive")
    if not user.get("is_approved", True):
        raise AccountPendingApprovalError()
    
    # Generate new token pair preserving family_id
    from app.core.security import create_access_token
    new_access = create_access_token({"sub": str(user["_id"]), "email": user["email"], "role": user["role"]})
    new_refresh = create_refresh_token({"sub": str(user["_id"]), "email": user["email"], "role": user["role"], "family_id": family_id})
    
    await _store_refresh_token(db, new_refresh, str(user["_id"]))
    _set_refresh_cookie(response, new_refresh)
    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        token_type="bearer",
        user=_user_payload(user)
    )


@router.post("/logout")
async def logout(response: Response, raw_request: Request, db: AsyncIOMotorDatabase = Depends(get_database)):
    from app.core.config import get_settings
    settings = get_settings()
    user_id = None
    
    auth_header = raw_request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        payload = decode_token(auth_header.split(" ")[1])
        if payload:
            user_id = payload.get("sub")
    
    if not user_id:
        cookie_token = raw_request.cookies.get(settings.refresh_cookie_name)
        if cookie_token:
            payload = decode_token(cookie_token)
            if payload:
                user_id = payload.get("sub")
    
    if user_id:
        await db.refresh_tokens.update_many(
            {"user_id": user_id, "revoked_at": None},
            {"$set": {"revoked_at": datetime.now(timezone.utc)}}
        )
    
    response.delete_cookie(settings.refresh_cookie_name, path="/api/v1/auth")
    return {"message": "Logged out successfully"}


@router.post("/activate-driver")
async def activate_driver(
    body: ActivateDriverRequest,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Activate account from secure invitation link and set driver's chosen password.
    Atomically validates token hash, pending status, expiration, and email match.
    """
    now = datetime.now(timezone.utc)
    token_hash = hashlib.sha256(body.invitation_token.encode("utf-8")).hexdigest()

    # Atomically validate & redeem pending, unexpired invitation
    invite = await db.driver_invitations.find_one_and_update(
        {
            "token_hash": token_hash,
            "status": "PENDING",
            "expires_at": {"$gt": now}
        },
        {
            "$set": {
                "status": "ACCEPTED",
                "accepted_at": now,
                "updated_at": now
            }
        }
    )
    if not invite:
        existing = await db.driver_invitations.find_one({"token_hash": token_hash})
        if existing:
            if existing.get("status") == "ACCEPTED":
                raise ConflictError("Invitation token has already been used")
            elif existing.get("expires_at") and existing["expires_at"].replace(tzinfo=timezone.utc) <= now:
                raise UnauthorizedError("Invitation token has expired")
            else:
                raise UnauthorizedError("Invitation token is no longer valid")
        raise UnauthorizedError("Invalid or expired invitation token")

    clean_invite_email = normalize_email(invite["email"])

    # Validate email match if body.email provided
    if body.email:
        clean_body_email = normalize_email(str(body.email))
        if clean_body_email != clean_invite_email:
            # Revert token status so it is not consumed if activation failed on email mismatch
            await db.driver_invitations.update_one(
                {"_id": invite["_id"]},
                {"$set": {"status": "PENDING", "accepted_at": None}}
            )
            raise ForbiddenError("Activation email does not match invitation recipient")

    driver = await db.drivers.find_one({"_id": ObjectId(invite["driver_id"])})
    if not driver:
        raise NotFoundError("Driver Record", invite["driver_id"])

    # Check if user already exists
    user = await db.users.find_one({"email": clean_invite_email})
    if not user:
        full_name = body.full_name or driver.get("name", "Driver")
        phone = body.phone or driver.get("phone")
        user_doc = {
            "email": clean_invite_email,
            "password_hash": get_password_hash(body.password),
            "full_name": full_name,
            "phone": phone,
            "role": UserRole.DRIVER.value,
            "is_active": True,
            "is_approved": True,
            "created_at": now,
            "updated_at": now,
        }
        res = await db.users.insert_one(user_doc)
        user_id = str(res.inserted_id)
        user = user_doc
    else:
        user_id = str(user["_id"])
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "password_hash": get_password_hash(body.password),
                "is_approved": True,
                "is_active": True,
                "role": UserRole.DRIVER.value,
                "updated_at": now
            }}
        )

    # Link user to driver record
    await db.drivers.update_one({"_id": driver["_id"]}, {"$set": {"user_id": user_id, "updated_at": now}})

    tokens = create_token_pair(user_id, clean_invite_email, UserRole.DRIVER.value)
    await _store_refresh_token(db, tokens["refresh_token"], user_id)
    _set_refresh_cookie(response, tokens["refresh_token"])
    return TokenResponse(**tokens, user=_user_payload(user))


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_database)):
    if not ObjectId.is_valid(current_user["sub"]):
        raise UnauthorizedError("Invalid user token subject")
    user = await db.users.find_one({"_id": ObjectId(current_user["sub"])})
    if not user:
        raise UnauthorizedError("User not found")
    
    return UserResponse(**_user_payload(user))

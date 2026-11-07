from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId
from app.db.mongodb import get_database
from app.core.security import (
    verify_password, get_password_hash,
    create_token_pair, decode_token
)
from app.core.permissions import Role, get_current_user
from app.core.exceptions import ValidationError, UnauthorizedError, ConflictError
from app.core.constants import UserRole

router = APIRouter()


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
    refresh_token: str


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


@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserRegister, db: AsyncIOMotorDatabase = Depends(get_database)):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise ConflictError("Email already registered")
    
    if user_data.role == UserRole.ADMIN:
        raise ValidationError("Cannot register as admin. Contact system administrator.")
    
    is_approved = user_data.role != UserRole.TRANSPORTER
    
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
    
    tokens = create_token_pair(str(result.inserted_id), user_data.email, user_data.role)
    
    return TokenResponse(
        **tokens,
        user={
            "id": str(result.inserted_id),
            "email": user_data.email,
            "full_name": user_data.full_name,
            "phone": user_data.phone,
            "role": user_data.role,
            "is_active": True,
            "is_approved": is_approved,
            "created_at": user_doc["created_at"],
            "updated_at": user_doc["updated_at"],
        }
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: AsyncIOMotorDatabase = Depends(get_database)):
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise UnauthorizedError("Invalid credentials")
    
    if not verify_password(credentials.password, user["password_hash"]):
        raise UnauthorizedError("Invalid credentials")
    
    if not user.get("is_active", True):
        raise UnauthorizedError("Account is deactivated")
    
    if not user.get("is_approved", True):
        raise UnauthorizedError("Account pending approval")
    
    tokens = create_token_pair(str(user["_id"]), user["email"], user["role"])
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.now(timezone.utc)}}
    )
    
    return TokenResponse(
        **tokens,
        user={
            "id": str(user["_id"]),
            "email": user["email"],
            "full_name": user["full_name"],
            "phone": user.get("phone"),
            "role": user["role"],
            "is_active": user["is_active"],
            "is_approved": user["is_approved"],
            "created_at": user["created_at"],
            "updated_at": user["updated_at"],
        }
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest, db: AsyncIOMotorDatabase = Depends(get_database)):
    payload = decode_token(request.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise UnauthorizedError("Invalid refresh token")
    
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user or not user.get("is_active", True):
        raise UnauthorizedError("User not found or inactive")
    
    tokens = create_token_pair(str(user["_id"]), user["email"], user["role"])
    
    return TokenResponse(
        **tokens,
        user={
            "id": str(user["_id"]),
            "email": user["email"],
            "full_name": user["full_name"],
            "phone": user.get("phone"),
            "role": user["role"],
            "is_active": user["is_active"],
            "is_approved": user["is_approved"],
            "created_at": user["created_at"],
            "updated_at": user["updated_at"],
        }
    )


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_database)):
    user = await db.users.find_one({"_id": ObjectId(current_user["sub"])})
    if not user:
        raise UnauthorizedError("User not found")
    
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        full_name=user["full_name"],
        phone=user.get("phone"),
        role=user["role"],
        is_active=user["is_active"],
        is_approved=user["is_approved"],
        created_at=user["created_at"],
        updated_at=user["updated_at"],
    )
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
from app.db.mongodb import get_database
from app.core.permissions import Role, get_current_user, get_current_admin_user, require_permission
from app.core.exceptions import NotFoundError, ValidationError
from app.core.constants import UserRole

router = APIRouter()


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{1,14}$")
    is_active: Optional[bool] = None


class UserListResponse(BaseModel):
    users: List[dict]
    total: int
    page: int
    page_size: int


@router.get("", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if role:
        query["role"] = role
    if is_active is not None:
        query["is_active"] = is_active
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    
    total = await db.users.count_documents(query)
    users = await db.users.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    
    return UserListResponse(
        users=[{
            "id": str(u["_id"]),
            "email": u["email"],
            "full_name": u["full_name"],
            "phone": u.get("phone"),
            "role": u["role"],
            "is_active": u.get("is_active", True),
            "is_approved": u.get("is_approved", True),
            "created_at": u["created_at"],
            "updated_at": u["updated_at"],
        } for u in users],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{user_id}")
async def get_user(
    user_id: str,
    current_user: dict = Depends(get_current_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(user_id):
        raise ValidationError("Invalid user ID")
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise NotFoundError("User", user_id)
    
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "full_name": user["full_name"],
        "phone": user.get("phone"),
        "role": user["role"],
        "is_active": user.get("is_active", True),
        "is_approved": user.get("is_approved", True),
        "created_at": user["created_at"],
        "updated_at": user["updated_at"],
    }


@router.patch("/{user_id}")
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    current_user: dict = Depends(get_current_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(user_id):
        raise ValidationError("Invalid user ID")
    
    update_data = {k: v for k, v in user_data.model_dump().items() if v is not None}
    if not update_data:
        raise ValidationError("No valid fields to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise NotFoundError("User", user_id)
    
    return {"message": "User updated successfully"}


@router.post("/{user_id}/approve")
async def approve_user(
    user_id: str,
    current_user: dict = Depends(get_current_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(user_id):
        raise ValidationError("Invalid user ID")
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_approved": True, "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.matched_count == 0:
        raise NotFoundError("User", user_id)
    
    return {"message": "User approved successfully"}


@router.post("/{user_id}/suspend")
async def suspend_user(
    user_id: str,
    current_user: dict = Depends(get_current_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(user_id):
        raise ValidationError("Invalid user ID")
    
    if user_id == current_user["sub"]:
        raise ValidationError("Cannot suspend yourself")
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.matched_count == 0:
        raise NotFoundError("User", user_id)
    
    return {"message": "User suspended successfully"}


@router.post("/{user_id}/activate")
async def activate_user(
    user_id: str,
    current_user: dict = Depends(get_current_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(user_id):
        raise ValidationError("Invalid user ID")
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_active": True, "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.matched_count == 0:
        raise NotFoundError("User", user_id)
    
    return {"message": "User activated successfully"}

from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId

from app.db.mongodb import get_database
from app.core.permissions import get_current_admin_user
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError
from app.core.constants import UserRole, LedgerEventType
from app.db.unit_of_work import run_in_txn
from app.services.ledger_service import append_ledger_block
from app.schemas.validators import escape_search

router = APIRouter()


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None)
    phone: Optional[str] = Field(None)
    is_active: Optional[bool] = None
    model_config = ConfigDict(extra="forbid")


class UserListResponse(BaseModel):
    users: List[dict]
    total: int
    page: int
    page_size: int


@router.get("", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1),
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if role:
        query["role"] = role.value if hasattr(role, "value") else str(role)
    if is_active is not None:
        query["is_active"] = is_active
    if search:
        escaped = escape_search(search)
        query["$or"] = [
            {"full_name": {"$regex": escaped, "$options": "i"}},
            {"email": {"$regex": escaped, "$options": "i"}},
        ]
    
    total = await db.users.count_documents(query)
    users = await db.users.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    
    return UserListResponse(
        users=[{
            "id": str(u["_id"]),
            "email": u["email"],
            "full_name": u.get("full_name", ""),
            "phone": u.get("phone"),
            "role": u["role"],
            "is_active": u.get("is_active", True),
            "is_approved": u.get("is_approved", True),
            "created_at": u.get("created_at"),
            "updated_at": u.get("updated_at"),
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
        "full_name": user.get("full_name", ""),
        "phone": user.get("phone"),
        "role": user["role"],
        "is_active": user.get("is_active", True),
        "is_approved": user.get("is_approved", True),
        "created_at": user.get("created_at"),
        "updated_at": user.get("updated_at"),
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
    
    target = await db.users.find_one({"_id": ObjectId(user_id)})
    if not target:
        raise NotFoundError("User", user_id)
    
    update_data = user_data.model_dump(exclude_unset=True)
    if not update_data:
        raise ValidationError("No valid fields to update")
    
    if update_data.get("is_active") is False:
        if user_id == current_user["sub"]:
            raise ValidationError("Cannot deactivate your own account")
        if target.get("role") == UserRole.ADMIN:
            active_admins = await db.users.count_documents({"role": UserRole.ADMIN, "is_active": True})
            if active_admins <= 1:
                raise ValidationError("Cannot deactivate the last active administrator")

    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    return {"message": "User updated successfully"}


@router.post("/{user_id}/approve")
async def approve_user(
    user_id: str,
    current_user: dict = Depends(get_current_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(user_id):
        raise ValidationError("Invalid user ID")
    
    now = datetime.now(timezone.utc)
    async def approve_transaction(session):
        result = await db.users.update_one(
            {"_id": ObjectId(user_id), "is_approved": {"$ne": True}},
            {"$set": {"is_approved": True, "updated_at": now}}, session=session,
        )
        if result.matched_count == 0:
            raise NotFoundError("Unapproved user", user_id)
        await append_ledger_block(
            db, event_type=LedgerEventType.USER_APPROVED,
            entity_type="USER", entity_id=user_id,
            actor_id=current_user["sub"], actor_role=current_user["role"],
            event_summary="User approved", payload={"user_id": user_id}, session=session,
        )

    await run_in_txn(approve_transaction)
    
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
    
    target = await db.users.find_one({"_id": ObjectId(user_id)})
    if not target:
        raise NotFoundError("User", user_id)
    if target.get("role") == UserRole.ADMIN:
        raise ForbiddenError("Cannot suspend another administrator")
    
    now = datetime.now(timezone.utc)
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_active": False, "updated_at": now}}
    )
    return {"message": "User suspended successfully"}


@router.post("/{user_id}/activate")
async def activate_user(
    user_id: str,
    current_user: dict = Depends(get_current_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(user_id):
        raise ValidationError("Invalid user ID")
    
    now = datetime.now(timezone.utc)
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_active": True, "updated_at": now}}
    )
    if result.matched_count == 0:
        raise NotFoundError("User", user_id)
    
    return {"message": "User activated successfully"}

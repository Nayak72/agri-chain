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
    role: Optional[UserRole] = None
    reason: str = Field(..., min_length=1, max_length=500)
    model_config = ConfigDict(extra="forbid")


class UserStatusChange(BaseModel):
    reason: str = Field(..., min_length=1, max_length=500)
    model_config = ConfigDict(extra="forbid")


class UserListResponse(BaseModel):
    users: List[dict]
    total: int
    page: int
    page_size: int
    active_count: int
    pending_approval_count: int


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
    active_count = await db.users.count_documents({"$and": [query, {"is_active": {"$ne": False}}]})
    pending_approval_count = await db.users.count_documents({"$and": [query, {"is_approved": False}]})
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
        active_count=active_count,
        pending_approval_count=pending_approval_count,
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
    
    update_data = user_data.model_dump(exclude_unset=True)
    reason = update_data.pop("reason", "").strip()
    if not reason:
        raise ValidationError("A reason is required for administrative changes")
    if not update_data:
        raise ValidationError("No valid fields to update")
    if any(value is None for value in update_data.values()):
        raise ValidationError("Updated fields cannot be null")
    now = datetime.now(timezone.utc)
    async def transaction(session):
        target = await db.users.find_one({"_id": ObjectId(user_id)}, session=session)
        if not target:
            raise NotFoundError("User", user_id)
        target_role = str(target.get('role', '')).strip().upper()
        role_changed = 'role' in update_data and update_data['role'] != target_role
        if role_changed and (user_id == current_user['sub'] or target_role == UserRole.ADMIN or update_data['role'] == UserRole.ADMIN):
            raise ForbiddenError("Administrator roles cannot be assigned or changed through this operation")
        if update_data.get('is_active') is False and (user_id == current_user['sub'] or target_role == UserRole.ADMIN):
            raise ForbiddenError("Administrator accounts cannot be deactivated through this operation")
        before = {key: target.get(key) for key in update_data}
        after = {key: (value.value if hasattr(value, 'value') else value) for key, value in update_data.items()}
        result = await db.users.update_one({'_id': target['_id']}, {'$set': {**after, 'updated_at': now}}, session=session)
        if result.matched_count != 1:
            raise NotFoundError('User', user_id)
        audit = {'user_id': user_id, 'actor_id': current_user['sub'], 'actor_role': current_user['role'],
                 'reason': reason, 'previous': before, 'updated': after, 'created_at': now}
        await db.admin_audit_events.insert_one(audit.copy(), session=session)
        await append_ledger_block(db, event_type=LedgerEventType.USER_PROFILE_UPDATED, entity_type='USER', entity_id=user_id,
            actor_id=current_user['sub'], actor_role=current_user['role'], event_summary='Administrator updated user profile',
            payload={'user_id': user_id, 'reason': reason, 'previous': before, 'updated': after}, session=session)
    await run_in_txn(transaction)
    return {"message": "User updated successfully"}


@router.get('/{user_id}/audit-history')
async def user_audit_history(user_id: str, current_user: dict = Depends(get_current_admin_user),
                             db: AsyncIOMotorDatabase = Depends(get_database)):
    if not ObjectId.is_valid(user_id):
        raise ValidationError('Invalid user ID')
    events = await db.admin_audit_events.find({'user_id': user_id}, {'_id': 0}).sort('created_at', -1).limit(100).to_list(100)
    return events


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
    change: UserStatusChange,
    current_user: dict = Depends(get_current_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    await update_user(user_id, UserUpdate(is_active=False, reason=change.reason), current_user, db)
    return {"message": "User suspended successfully"}


@router.post("/{user_id}/activate")
async def activate_user(
    user_id: str,
    change: UserStatusChange,
    current_user: dict = Depends(get_current_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    await update_user(user_id, UserUpdate(is_active=True, reason=change.reason), current_user, db)
    return {"message": "User activated successfully"}

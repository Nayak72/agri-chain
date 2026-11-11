import hashlib
import secrets
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, date, timezone, timedelta
from bson import ObjectId

from app.db.mongodb import get_database
from app.core.permissions import get_current_user
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError, ConflictError
from app.core.constants import DriverStatus, UserRole
from app.utils.serialization import to_response
from app.utils.mongo import to_mongo, resolve_doc

router = APIRouter()


class DriverCreate(BaseModel):
    transporter_id: Optional[str] = None
    name: str = Field(...)
    phone: str = Field(...)
    city: str = Field(...)
    state: str = Field(...)
    model_config = ConfigDict(extra="forbid")


class DriverUpdate(BaseModel):
    name: Optional[str] = Field(None)
    phone: Optional[str] = Field(None)
    city: Optional[str] = Field(None)
    state: Optional[str] = Field(None)
    model_config = ConfigDict(extra="forbid")


class LinkDriverUserRequest(BaseModel):
    user_id: str
    model_config = ConfigDict(extra="forbid")


class DriverResponse(BaseModel):
    id: str
    driver_id: str
    transporter_id: str
    user_id: Optional[str] = None
    name: str
    phone: str
    city: str
    state: str
    status: DriverStatus
    current_assignment: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


def generate_driver_id() -> str:
    import uuid
    return f"DRV-{uuid.uuid4().hex[:8].upper()}"


@router.post("", response_model=DriverResponse)
async def create_driver(
    driver_data: DriverCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.TRANSPORTER, UserRole.ADMIN]:
        raise ForbiddenError("Only transporters or admins can create drivers")
    
    trans_id = driver_data.transporter_id
    if not trans_id and current_user["role"] == UserRole.TRANSPORTER:
        t_doc = await db.transporters.find_one({"user_id": current_user["sub"]})
        if t_doc:
            trans_id = str(t_doc["_id"])
    
    if not trans_id or not ObjectId.is_valid(trans_id):
        raise ValidationError("Invalid transporter ID")
    
    transporter = await db.transporters.find_one({"_id": ObjectId(trans_id)})
    if not transporter:
        raise NotFoundError("Transporter", trans_id)
    
    if current_user["role"] == UserRole.TRANSPORTER and transporter.get("user_id") != current_user["sub"]:
        raise ForbiddenError("Not authorized to add drivers for this transporter")
    
    driver_id = generate_driver_id()
    while await db.drivers.find_one({"driver_id": driver_id}):
        driver_id = generate_driver_id()
    
    now = datetime.now(timezone.utc)
    driver_doc = {
        "driver_id": driver_id,
        "transporter_id": trans_id,
        "user_id": None,
        **driver_data.model_dump(),
        "status": DriverStatus.AVAILABLE.value,
        "current_assignment": None,
        "created_at": now,
        "updated_at": now,
    }
    
    result = await db.drivers.insert_one(to_mongo(driver_doc))
    driver_doc["_id"] = result.inserted_id
    
    return to_response(DriverResponse, driver_doc)


@router.get("", response_model=List[DriverResponse])
async def list_drivers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1),
    transporter_id: Optional[str] = None,
    status: Optional[DriverStatus] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if current_user["role"] == UserRole.TRANSPORTER:
        t_doc = await db.transporters.find_one({"user_id": current_user["sub"]})
        if t_doc:
            query["transporter_id"] = str(t_doc["_id"])
        else:
            return []
    elif current_user["role"] == UserRole.DRIVER:
        query["user_id"] = current_user["sub"]
    elif transporter_id:
        if not ObjectId.is_valid(transporter_id):
            raise ValidationError("Invalid transporter ID")
        query["transporter_id"] = transporter_id
    
    if status:
        query["status"] = status.value if hasattr(status, "value") else str(status)
    
    drivers = await db.drivers.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [to_response(DriverResponse, d) for d in drivers]


@router.get("/{driver_id}", response_model=DriverResponse)
async def get_driver(
    driver_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    driver = await resolve_doc(db.drivers, driver_id, "Driver", business_key="driver_id")
    
    if current_user["role"] == UserRole.TRANSPORTER:
        t_doc = await db.transporters.find_one({"user_id": current_user["sub"]})
        if not t_doc or driver["transporter_id"] != str(t_doc["_id"]):
            raise ForbiddenError("Not authorized to view this driver")
    elif current_user["role"] == UserRole.DRIVER:
        if driver.get("user_id") != current_user["sub"]:
            raise ForbiddenError("Not authorized to view this driver")
    
    return to_response(DriverResponse, driver)


@router.patch("/{driver_id}", response_model=DriverResponse)
async def update_driver(
    driver_id: str,
    driver_data: DriverUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.TRANSPORTER, UserRole.ADMIN]:
        raise ForbiddenError("Only transporters or admins can update drivers")

    driver = await resolve_doc(db.drivers, driver_id, "Driver", business_key="driver_id")
    
    if current_user["role"] == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
        if not transporter or driver["transporter_id"] != str(transporter["_id"]):
            raise ForbiddenError("Not authorized to update this driver")
    
    update_data = driver_data.model_dump(exclude_unset=True)
    if not update_data:
        raise ValidationError("No valid fields to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.drivers.update_one(
        {"_id": driver["_id"]},
        {"$set": to_mongo(update_data)}
    )
    
    updated = await db.drivers.find_one({"_id": driver["_id"]})
    return to_response(DriverResponse, updated)


@router.post("/{driver_id}/link-user", response_model=DriverResponse)
async def link_driver_user(
    driver_id: str,
    body: LinkDriverUserRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Link an existing registered DRIVER account to a transporter's driver record."""
    if current_user["role"] not in [UserRole.TRANSPORTER, UserRole.ADMIN]:
        raise ForbiddenError("Only transporters or admins can link driver accounts")

    driver = await resolve_doc(db.drivers, driver_id, "Driver", business_key="driver_id")
    
    if current_user["role"] == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
        if not transporter or driver["transporter_id"] != str(transporter["_id"]):
            raise ForbiddenError("Not authorized to manage this driver")
    
    if driver.get("user_id") and driver["user_id"] != body.user_id:
        raise ConflictError("Driver profile is already linked to another user")

    if not ObjectId.is_valid(body.user_id):
        raise ValidationError("Invalid user ID")
    
    target_user = await db.users.find_one({"_id": ObjectId(body.user_id)})
    if not target_user:
        raise NotFoundError("User", body.user_id)
    
    if target_user.get("role") != UserRole.DRIVER or not target_user.get("is_approved", False) or not target_user.get("is_active", False):
        raise ValidationError("The target user account must possess the DRIVER role")
    
    # Ensure this user is not already linked to another driver
    existing_link = await db.drivers.find_one({"user_id": body.user_id, "_id": {"$ne": driver["_id"]}})
    if existing_link:
        raise ConflictError(f"This user account is already linked to driver {existing_link['driver_id']}")
    
    now = datetime.now(timezone.utc)
    await db.drivers.update_one(
        {"_id": driver["_id"]},
        {"$set": {"user_id": body.user_id, "updated_at": now}}
    )
    
    updated = await db.drivers.find_one({"_id": driver["_id"]})
    return to_response(DriverResponse, updated)

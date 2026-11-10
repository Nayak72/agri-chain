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
from app.schemas.validators import normalize_identifier, normalize_email
from app.services.outbox import schedule_outbox_event, OutboxEventType

router = APIRouter()


class DriverCreate(BaseModel):
    transporter_id: Optional[str] = None
    name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., pattern=r"^\+?[1-9]\d{1,14}$")
    email: Optional[str] = Field(None, pattern=r"^[^@]+@[^@]+\.[^@]+$")
    license_number: str = Field(..., min_length=5, max_length=30)
    license_expiry: date
    address: str = Field(..., min_length=5, max_length=200)
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    pincode: str = Field(..., pattern=r"^\d{6}$")
    experience_years: int = Field(0, ge=0, le=60)
    model_config = ConfigDict(extra="forbid")


class DriverUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{1,14}$")
    email: Optional[str] = Field(None, pattern=r"^[^@]+@[^@]+\.[^@]+$")
    license_number: Optional[str] = Field(None, min_length=5, max_length=30)
    license_expiry: Optional[date] = None
    address: Optional[str] = Field(None, min_length=5, max_length=200)
    city: Optional[str] = Field(None, min_length=2, max_length=100)
    state: Optional[str] = Field(None, min_length=2, max_length=100)
    pincode: Optional[str] = Field(None, pattern=r"^\d{6}$")
    experience_years: Optional[int] = Field(None, ge=0, le=60)
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
    email: Optional[str] = None
    license_number: str
    license_expiry: date
    address: str
    city: str
    state: str
    pincode: str
    experience_years: int
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
    
    clean_license = normalize_identifier(driver_data.license_number)
    existing = await db.drivers.find_one({"license_number": clean_license})
    if existing:
        raise ConflictError(f"Driver with license {clean_license} already exists")
    
    clean_email = normalize_email(driver_data.email)
    
    # Auto-link if a DRIVER user with matching email already exists
    linked_user_id = None
    if clean_email:
        user_account = await db.users.find_one({"email": clean_email, "role": UserRole.DRIVER})
        if user_account:
            # Check if this user is already linked to another driver
            already_linked = await db.drivers.find_one({"user_id": str(user_account["_id"])})
            if not already_linked:
                linked_user_id = str(user_account["_id"])
    
    driver_id = generate_driver_id()
    while await db.drivers.find_one({"driver_id": driver_id}):
        driver_id = generate_driver_id()
    
    now = datetime.now(timezone.utc)
    driver_doc = {
        "driver_id": driver_id,
        "transporter_id": trans_id,
        "user_id": linked_user_id,
        **driver_data.model_dump(),
        "license_number": clean_license,
        "email": clean_email,
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
    page_size: int = Query(20, ge=1, le=100),
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
    
    if "license_number" in update_data:
        update_data["license_number"] = normalize_identifier(update_data["license_number"])
    if "email" in update_data:
        update_data["email"] = normalize_email(update_data["email"])
    
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
    
    if not ObjectId.is_valid(body.user_id):
        raise ValidationError("Invalid user ID")
    
    target_user = await db.users.find_one({"_id": ObjectId(body.user_id)})
    if not target_user:
        raise NotFoundError("User", body.user_id)
    
    if target_user.get("role") != UserRole.DRIVER:
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


@router.post("/{driver_id}/invite")
async def invite_driver(
    driver_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Generate a secure, single-use activation invitation token for the driver."""
    if current_user["role"] not in [UserRole.TRANSPORTER, UserRole.ADMIN]:
        raise ForbiddenError("Only transporters or admins can invite drivers")

    driver = await resolve_doc(db.drivers, driver_id, "Driver", business_key="driver_id")
    if not driver.get("email"):
        raise ValidationError("Driver record must have a valid email address to issue an invitation")
    
    # Check if driver is already linked to an active user
    if driver.get("user_id"):
        raise ConflictError("Driver is already linked to an active user account")
    
    # Generate 32-byte cryptographic token
    raw_token = secrets.token_hex(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=48)
    
    # Invalidate existing pending invitations for this driver
    await db.driver_invitations.update_many(
        {"driver_id": str(driver["_id"]), "status": "PENDING"},
        {"$set": {"status": "REVOKED", "updated_at": datetime.now(timezone.utc)}}
    )
    
    invitation_doc = {
        "driver_id": str(driver["_id"]),
        "email": driver["email"],
        "token_hash": token_hash,
        "status": "PENDING",
        "expires_at": expires_at,
        "created_by": current_user["sub"],
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.driver_invitations.insert_one(invitation_doc)
    invitation_doc["_id"] = result.inserted_id

    await schedule_outbox_event(
        db, OutboxEventType.SEND_DRIVER_INVITATION,
        {
            "invitation_id": str(result.inserted_id),
            "driver_id": str(driver["_id"]),
            "email": driver["email"],
            "token": raw_token
        }
    )
    
    # In actual production, this raw_token is delivered via email.
    return {
        "message": f"Invitation issued for {driver['email']}",
        "expires_at": expires_at.isoformat(),
        "invitation_token": raw_token
    }

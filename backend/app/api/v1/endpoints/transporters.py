from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
from app.db.mongodb import get_database
from app.core.permissions import get_current_user, get_current_admin_user, Role
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError
from app.core.constants import UserRole
from app.core.security import get_password_hash

router = APIRouter()


class TransporterCreate(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=100)
    contact_person: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., pattern=r"^[^@]+@[^@]+\.[^@]+$")
    phone: str = Field(..., pattern=r"^\+?[1-9]\d{1,14}$")
    address: str = Field(..., min_length=5, max_length=200)
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    pincode: str = Field(..., pattern=r"^\d{6}$")
    gst_number: Optional[str] = None
    license_number: Optional[str] = None
    bank_account: Optional[str] = None
    ifsc_code: Optional[str] = None


class TransporterUpdate(BaseModel):
    company_name: Optional[str] = Field(None, min_length=2, max_length=100)
    contact_person: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[str] = Field(None, pattern=r"^[^@]+@[^@]+\.[^@]+$")
    phone: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{1,14}$")
    address: Optional[str] = Field(None, min_length=5, max_length=200)
    city: Optional[str] = Field(None, min_length=2, max_length=100)
    state: Optional[str] = Field(None, min_length=2, max_length=100)
    pincode: Optional[str] = Field(None, pattern=r"^\d{6}$")
    gst_number: Optional[str] = None
    license_number: Optional[str] = None
    bank_account: Optional[str] = None
    ifsc_code: Optional[str] = None
    approval_status: Optional[str] = None
    is_active: Optional[bool] = None


class TransporterResponse(BaseModel):
    id: str
    transporter_id: str
    user_id: Optional[str]
    company_name: str
    contact_person: str
    email: str
    phone: str
    address: str
    city: str
    state: str
    pincode: str
    gst_number: Optional[str]
    license_number: Optional[str]
    bank_account: Optional[str]
    ifsc_code: Optional[str]
    approval_status: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


def generate_transporter_id() -> str:
    import uuid
    return f"TRN-{uuid.uuid4().hex[:8].upper()}"


@router.post("", response_model=TransporterResponse)
async def create_transporter(
    transporter_data: TransporterCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.TRANSPORTER, UserRole.ADMIN]:
        raise ForbiddenError("Only transporters can create transporter profiles")
    
    existing = await db.transporters.find_one({"email": transporter_data.email})
    if existing:
        raise ValidationError("Email already registered")
    
    transporter_id = generate_transporter_id()
    existing = await db.transporters.find_one({"transporter_id": transporter_id})
    while existing:
        transporter_id = generate_transporter_id()
        existing = await db.transporters.find_one({"transporter_id": transporter_id})
    
    user_id = current_user["sub"] if current_user["role"] == UserRole.TRANSPORTER else None
    
    transporter_doc = {
        "transporter_id": transporter_id,
        "user_id": user_id,
        **transporter_data.model_dump(),
        "approval_status": "PENDING" if current_user["role"] == UserRole.TRANSPORTER else "APPROVED",
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    
    result = await db.transporters.insert_one(transporter_doc)
    transporter_doc["_id"] = result.inserted_id
    
    return TransporterResponse(id=str(result.inserted_id), **transporter_doc)


@router.get("", response_model=List[TransporterResponse])
async def list_transporters(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    approval_status: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if current_user["role"] == UserRole.TRANSPORTER:
        query["user_id"] = current_user["sub"]
    elif current_user["role"] in [UserRole.BUYER, UserRole.FARMER]:
        query["approval_status"] = "APPROVED"
        query["is_active"] = True
    
    if approval_status and current_user["role"] == UserRole.ADMIN:
        query["approval_status"] = approval_status
    if is_active is not None:
        query["is_active"] = is_active
    
    transporters = await db.transporters.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [TransporterResponse(id=str(t["_id"]), **t) for t in transporters]


@router.get("/{transporter_id}", response_model=TransporterResponse)
async def get_transporter(
    transporter_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(transporter_id):
        raise ValidationError("Invalid transporter ID")
    
    transporter = await db.transporters.find_one({"_id": ObjectId(transporter_id)})
    if not transporter:
        raise NotFoundError("Transporter", transporter_id)
    
    if current_user["role"] == UserRole.TRANSPORTER and transporter.get("user_id") != current_user["sub"]:
        raise ForbiddenError("Not authorized to view this transporter")
    
    return TransporterResponse(id=str(transporter["_id"]), **transporter)


@router.patch("/{transporter_id}", response_model=TransporterResponse)
async def update_transporter(
    transporter_id: str,
    transporter_data: TransporterUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(transporter_id):
        raise ValidationError("Invalid transporter ID")
    
    transporter = await db.transporters.find_one({"_id": ObjectId(transporter_id)})
    if not transporter:
        raise NotFoundError("Transporter", transporter_id)
    
    if current_user["role"] == UserRole.TRANSPORTER and transporter.get("user_id") != current_user["sub"]:
        raise ForbiddenError("Not authorized to update this transporter")
    
    update_data = {k: v for k, v in transporter_data.model_dump().items() if v is not None}
    if not update_data:
        raise ValidationError("No valid fields to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.transporters.update_one(
        {"_id": ObjectId(transporter_id)},
        {"$set": update_data}
    )
    
    updated = await db.transporters.find_one({"_id": ObjectId(transporter_id)})
    return TransporterResponse(id=str(updated["_id"]), **updated)


@router.post("/{transporter_id}/approve")
async def approve_transporter(
    transporter_id: str,
    current_user: dict = Depends(get_current_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(transporter_id):
        raise ValidationError("Invalid transporter ID")
    
    result = await db.transporters.update_one(
        {"_id": ObjectId(transporter_id)},
        {"$set": {"approval_status": "APPROVED", "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.matched_count == 0:
        raise NotFoundError("Transporter", transporter_id)
    
    return {"message": "Transporter approved successfully"}
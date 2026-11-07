from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date, timezone
from bson import ObjectId
from app.db.mongodb import get_database
from app.core.permissions import get_current_user, Role
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError
from app.core.constants import DriverStatus, UserRole

router = APIRouter()


class DriverCreate(BaseModel):
    transporter_id: Optional[str] = None
    name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., pattern=r"^\+?[1-9]\d{1,14}$")
    email: Optional[str] = Field(None, pattern=r"^[^@]+@[^@]+\.[^@]+$")
    license_number: str = Field(..., min_length=5, max_length=20)
    license_expiry: date
    address: str = Field(..., min_length=5, max_length=200)
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    pincode: str = Field(..., pattern=r"^\d{6}$")
    experience_years: int = Field(0, ge=0)


class DriverUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{1,14}$")
    email: Optional[str] = Field(None, pattern=r"^[^@]+@[^@]+\.[^@]+$")
    license_number: Optional[str] = Field(None, min_length=5, max_length=20)
    license_expiry: Optional[date] = None
    address: Optional[str] = Field(None, min_length=5, max_length=200)
    city: Optional[str] = Field(None, min_length=2, max_length=100)
    state: Optional[str] = Field(None, min_length=2, max_length=100)
    pincode: Optional[str] = Field(None, pattern=r"^\d{6}$")
    experience_years: Optional[int] = Field(None, ge=0)
    status: Optional[DriverStatus] = None
    current_assignment: Optional[str] = None


class DriverResponse(BaseModel):
    id: str
    driver_id: str
    transporter_id: str
    name: str
    phone: str
    email: Optional[str]
    license_number: str
    license_expiry: date
    address: str
    city: str
    state: str
    pincode: str
    experience_years: int
    status: DriverStatus
    current_assignment: Optional[str]
    created_at: datetime
    updated_at: datetime


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
        raise ForbiddenError("Only transporters can create drivers")
    
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
        raise ForbiddenError("Not authorized for this transporter")
    
    existing = await db.drivers.find_one({"license_number": driver_data.license_number})
    if existing:
        raise ValidationError("License number already exists")
    
    driver_id = generate_driver_id()
    existing = await db.drivers.find_one({"driver_id": driver_id})
    while existing:
        driver_id = generate_driver_id()
        existing = await db.drivers.find_one({"driver_id": driver_id})
    
    driver_doc = {
        "driver_id": driver_id,
        "transporter_id": trans_id,
        "name": driver_data.name,
        "phone": driver_data.phone,
        "email": driver_data.email,
        "license_number": driver_data.license_number,
        "license_expiry": datetime.combine(driver_data.license_expiry, datetime.min.time()),
        "address": driver_data.address,
        "city": driver_data.city,
        "state": driver_data.state,
        "pincode": driver_data.pincode,
        "experience_years": driver_data.experience_years,
        "status": DriverStatus.AVAILABLE,
        "current_assignment": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    
    result = await db.drivers.insert_one(driver_doc)
    driver_doc["_id"] = result.inserted_id
    
    return DriverResponse(id=str(result.inserted_id), **driver_doc)


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
        transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
        if transporter:
            query["transporter_id"] = str(transporter["_id"])
    
    if transporter_id and current_user["role"] == UserRole.ADMIN:
        if not ObjectId.is_valid(transporter_id):
            raise ValidationError("Invalid transporter ID")
        query["transporter_id"] = transporter_id
    if status:
        query["status"] = status
    
    drivers = await db.drivers.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [DriverResponse(id=str(d["_id"]), **d) for d in drivers]


@router.get("/{driver_id}", response_model=DriverResponse)
async def get_driver(
    driver_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if ObjectId.is_valid(driver_id):
        driver = await db.drivers.find_one({"_id": ObjectId(driver_id)})
    else:
        driver = await db.drivers.find_one({"driver_id": driver_id})
    if not driver:
        raise NotFoundError("Driver", driver_id)
    
    if current_user["role"] == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
        if not transporter or driver["transporter_id"] != str(transporter["_id"]):
            raise ForbiddenError("Not authorized to view this driver")
    
    return DriverResponse(id=str(driver["_id"]), **driver)


@router.patch("/{driver_id}", response_model=DriverResponse)
async def update_driver(
    driver_id: str,
    driver_data: DriverUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(driver_id):
        raise ValidationError("Invalid driver ID")
    
    driver = await db.drivers.find_one({"_id": ObjectId(driver_id)})
    if not driver:
        raise NotFoundError("Driver", driver_id)
    
    if current_user["role"] == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
        if not transporter or driver["transporter_id"] != str(transporter["_id"]):
            raise ForbiddenError("Not authorized to update this driver")
    
    update_data = {k: v for k, v in driver_data.model_dump().items() if v is not None}
    if not update_data:
        raise ValidationError("No valid fields to update")
    
    if "license_expiry" in update_data:
        update_data["license_expiry"] = datetime.combine(update_data["license_expiry"], datetime.min.time())
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.drivers.update_one(
        {"_id": ObjectId(driver_id)},
        {"$set": update_data}
    )
    
    updated = await db.drivers.find_one({"_id": ObjectId(driver_id)})
    return DriverResponse(id=str(updated["_id"]), **updated)
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date, timezone
from bson import ObjectId
from app.db.mongodb import get_database
from app.core.permissions import get_current_user, Role
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError
from app.core.constants import (
    VehicleCategory, VehicleType, VehicleStatus, UserRole
)

router = APIRouter()


class VehicleCreate(BaseModel):
    transporter_id: str
    registration_number: str = Field(..., pattern=r"^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$")
    category: VehicleCategory
    vehicle_type: VehicleType
    max_payload_kg: float = Field(..., gt=0)
    refrigeration_available: bool = False
    temperature_min: Optional[float] = None
    temperature_max: Optional[float] = None
    registration_expiry: date
    insurance_expiry: date
    fitness_expiry: date
    last_maintenance_date: Optional[date] = None
    next_maintenance_date: Optional[date] = None


class VehicleUpdate(BaseModel):
    category: Optional[VehicleCategory] = None
    vehicle_type: Optional[VehicleType] = None
    max_payload_kg: Optional[float] = Field(None, gt=0)
    available_capacity_kg: Optional[float] = Field(None, ge=0)
    refrigeration_available: Optional[bool] = None
    temperature_min: Optional[float] = None
    temperature_max: Optional[float] = None
    status: Optional[VehicleStatus] = None
    registration_expiry: Optional[date] = None
    insurance_expiry: Optional[date] = None
    fitness_expiry: Optional[date] = None
    last_maintenance_date: Optional[date] = None
    next_maintenance_date: Optional[date] = None


class VehicleResponse(BaseModel):
    id: str
    vehicle_id: str
    transporter_id: str
    registration_number: str
    category: VehicleCategory
    vehicle_type: VehicleType
    max_payload_kg: float
    available_capacity_kg: float
    refrigeration_available: bool
    temperature_min: Optional[float]
    temperature_max: Optional[float]
    status: VehicleStatus
    registration_expiry: date
    insurance_expiry: date
    fitness_expiry: date
    last_maintenance_date: Optional[date]
    next_maintenance_date: Optional[date]
    created_at: datetime
    updated_at: datetime


def generate_vehicle_id() -> str:
    import uuid
    return f"VEH-{uuid.uuid4().hex[:8].upper()}"


@router.post("", response_model=VehicleResponse)
async def create_vehicle(
    vehicle_data: VehicleCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.TRANSPORTER, UserRole.ADMIN]:
        raise ForbiddenError("Only transporters can create vehicles")
    
    if not ObjectId.is_valid(vehicle_data.transporter_id):
        raise ValidationError("Invalid transporter ID")
    
    transporter = await db.transporters.find_one({"_id": ObjectId(vehicle_data.transporter_id)})
    if not transporter:
        raise NotFoundError("Transporter", vehicle_data.transporter_id)
    
    if current_user["role"] == UserRole.TRANSPORTER and transporter.get("user_id") != current_user["sub"]:
        raise ForbiddenError("Not authorized for this transporter")
    
    existing = await db.vehicles.find_one({"registration_number": vehicle_data.registration_number})
    if existing:
        raise ValidationError("Registration number already exists")
    
    vehicle_id = generate_vehicle_id()
    existing = await db.vehicles.find_one({"vehicle_id": vehicle_id})
    while existing:
        vehicle_id = generate_vehicle_id()
        existing = await db.vehicles.find_one({"vehicle_id": vehicle_id})
    
    from app.core.constants import VEHICLE_CAPACITY_KG, VEHICLE_REFRIGERATION, VEHICLE_TEMP_RANGES
    
    vehicle_doc = {
        "vehicle_id": vehicle_id,
        "transporter_id": vehicle_data.transporter_id,
        "registration_number": vehicle_data.registration_number,
        "category": vehicle_data.category,
        "vehicle_type": vehicle_data.vehicle_type,
        "max_payload_kg": vehicle_data.max_payload_kg,
        "available_capacity_kg": vehicle_data.max_payload_kg,
        "refrigeration_available": vehicle_data.refrigeration_available,
        "temperature_min": vehicle_data.temperature_min,
        "temperature_max": vehicle_data.temperature_max,
        "status": VehicleStatus.AVAILABLE,
        "registration_expiry": datetime.combine(vehicle_data.registration_expiry, datetime.min.time()),
        "insurance_expiry": datetime.combine(vehicle_data.insurance_expiry, datetime.min.time()),
        "fitness_expiry": datetime.combine(vehicle_data.fitness_expiry, datetime.min.time()),
        "last_maintenance_date": datetime.combine(vehicle_data.last_maintenance_date, datetime.min.time()) if vehicle_data.last_maintenance_date else None,
        "next_maintenance_date": datetime.combine(vehicle_data.next_maintenance_date, datetime.min.time()) if vehicle_data.next_maintenance_date else None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    
    result = await db.vehicles.insert_one(vehicle_doc)
    vehicle_doc["_id"] = result.inserted_id
    
    return VehicleResponse(id=str(result.inserted_id), **vehicle_doc)


@router.get("", response_model=List[VehicleResponse])
async def list_vehicles(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    transporter_id: Optional[str] = None,
    category: Optional[VehicleCategory] = None,
    status: Optional[VehicleStatus] = None,
    refrigeration_available: Optional[bool] = None,
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
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    if refrigeration_available is not None:
        query["refrigeration_available"] = refrigeration_available
    
    vehicles = await db.vehicles.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [VehicleResponse(id=str(v["_id"]), **v) for v in vehicles]


@router.get("/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(
    vehicle_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(vehicle_id):
        raise ValidationError("Invalid vehicle ID")
    
    vehicle = await db.vehicles.find_one({"_id": ObjectId(vehicle_id)})
    if not vehicle:
        raise NotFoundError("Vehicle", vehicle_id)
    
    if current_user["role"] == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
        if not transporter or vehicle["transporter_id"] != str(transporter["_id"]):
            raise ForbiddenError("Not authorized to view this vehicle")
    
    return VehicleResponse(id=str(vehicle["_id"]), **vehicle)


@router.patch("/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(
    vehicle_id: str,
    vehicle_data: VehicleUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(vehicle_id):
        raise ValidationError("Invalid vehicle ID")
    
    vehicle = await db.vehicles.find_one({"_id": ObjectId(vehicle_id)})
    if not vehicle:
        raise NotFoundError("Vehicle", vehicle_id)
    
    if current_user["role"] == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
        if not transporter or vehicle["transporter_id"] != str(transporter["_id"]):
            raise ForbiddenError("Not authorized to update this vehicle")
    
    update_data = {k: v for k, v in vehicle_data.model_dump().items() if v is not None}
    if not update_data:
        raise ValidationError("No valid fields to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.vehicles.update_one(
        {"_id": ObjectId(vehicle_id)},
        {"$set": update_data}
    )
    
    updated = await db.vehicles.find_one({"_id": ObjectId(vehicle_id)})
    return VehicleResponse(id=str(updated["_id"]), **updated)
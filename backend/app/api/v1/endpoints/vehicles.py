from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, date, timezone
from bson import ObjectId

from app.db.mongodb import get_database
from app.core.permissions import get_current_user
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError, ConflictError
from app.core.constants import VehicleCategory, VehicleType, VehicleStatus, UserRole
from app.utils.serialization import to_response
from app.utils.mongo import to_mongo, resolve_doc
from app.schemas.validators import validate_temperature_range, normalize_identifier

router = APIRouter()


class VehicleCreate(BaseModel):
    transporter_id: Optional[str] = None
    registration_number: str = Field(..., pattern=r"^[A-Z0-9]{5,20}$")
    category: VehicleCategory
    vehicle_type: VehicleType
    max_payload_kg: float = Field(..., gt=0, le=100000.0)
    refrigeration_available: bool = False
    temperature_min: Optional[float] = Field(None, ge=-50.0, le=50.0)
    temperature_max: Optional[float] = Field(None, ge=-50.0, le=50.0)
    registration_expiry: date
    insurance_expiry: date
    fitness_expiry: date
    last_maintenance_date: Optional[date] = None
    next_maintenance_date: Optional[date] = None
    model_config = ConfigDict(extra="forbid")


class VehicleUpdate(BaseModel):
    category: Optional[VehicleCategory] = None
    vehicle_type: Optional[VehicleType] = None
    max_payload_kg: Optional[float] = Field(None, gt=0, le=100000.0)
    refrigeration_available: Optional[bool] = None
    temperature_min: Optional[float] = Field(None, ge=-50.0, le=50.0)
    temperature_max: Optional[float] = Field(None, ge=-50.0, le=50.0)
    registration_expiry: Optional[date] = None
    insurance_expiry: Optional[date] = None
    fitness_expiry: Optional[date] = None
    last_maintenance_date: Optional[date] = None
    next_maintenance_date: Optional[date] = None
    model_config = ConfigDict(extra="forbid")


class VehicleResponse(BaseModel):
    id: str
    vehicle_id: str
    transporter_id: Optional[str] = None
    registration_number: str
    category: VehicleCategory
    vehicle_type: VehicleType
    max_payload_kg: float
    available_capacity_kg: float
    refrigeration_available: bool
    temperature_min: Optional[float] = None
    temperature_max: Optional[float] = None
    status: VehicleStatus
    registration_expiry: date
    insurance_expiry: date
    fitness_expiry: date
    last_maintenance_date: Optional[date] = None
    next_maintenance_date: Optional[date] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


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
        raise ForbiddenError("Only transporters or admins can register vehicles")
    
    trans_id = vehicle_data.transporter_id
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
        raise ForbiddenError("Not authorized to add vehicles for this transporter")
    
    clean_reg = normalize_identifier(vehicle_data.registration_number)
    existing = await db.vehicles.find_one({"registration_number": clean_reg})
    if existing:
        raise ConflictError(f"Vehicle with registration {clean_reg} is already registered")
    
    validate_temperature_range(vehicle_data.temperature_min, vehicle_data.temperature_max)
    
    vehicle_id = generate_vehicle_id()
    while await db.vehicles.find_one({"vehicle_id": vehicle_id}):
        vehicle_id = generate_vehicle_id()
    
    now = datetime.now(timezone.utc)
    vehicle_doc = {
        **vehicle_data.model_dump(),
        "vehicle_id": vehicle_id,
        "transporter_id": trans_id,
        "registration_number": clean_reg,
        "available_capacity_kg": vehicle_data.max_payload_kg,
        "status": VehicleStatus.AVAILABLE.value,
        "created_at": now,
        "updated_at": now,
    }
    
    result = await db.vehicles.insert_one(to_mongo(vehicle_doc))
    vehicle_doc["_id"] = result.inserted_id
    
    return to_response(VehicleResponse, vehicle_doc)


@router.get("", response_model=List[VehicleResponse])
async def list_vehicles(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    transporter_id: Optional[str] = None,
    category: Optional[VehicleCategory] = None,
    status: Optional[VehicleStatus] = None,
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
    elif transporter_id:
        if not ObjectId.is_valid(transporter_id):
            raise ValidationError("Invalid transporter ID")
        query["transporter_id"] = transporter_id
    
    if category:
        query["category"] = category.value if hasattr(category, "value") else str(category)
    if status:
        query["status"] = status.value if hasattr(status, "value") else str(status)
    
    vehicles = await db.vehicles.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [to_response(VehicleResponse, v) for v in vehicles]


@router.get("/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(
    vehicle_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    vehicle = await resolve_doc(db.vehicles, vehicle_id, "Vehicle", business_key="vehicle_id")
    
    if current_user["role"] == UserRole.TRANSPORTER:
        t_doc = await db.transporters.find_one({"user_id": current_user["sub"]})
        if not t_doc or vehicle["transporter_id"] != str(t_doc["_id"]):
            raise ForbiddenError("Not authorized to view this vehicle")
    
    return to_response(VehicleResponse, vehicle)


@router.patch("/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(
    vehicle_id: str,
    vehicle_data: VehicleUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.TRANSPORTER, UserRole.ADMIN]:
        raise ForbiddenError("Only transporters or admins can update vehicles")

    vehicle = await resolve_doc(db.vehicles, vehicle_id, "Vehicle", business_key="vehicle_id")
    
    if current_user["role"] == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
        if not transporter or vehicle["transporter_id"] != str(transporter["_id"]):
            raise ForbiddenError("Not authorized to update this vehicle")
    
    update_data = vehicle_data.model_dump(exclude_unset=True)
    if not update_data:
        raise ValidationError("No valid fields to update")
    
    temp_min = update_data.get("temperature_min", vehicle.get("temperature_min"))
    temp_max = update_data.get("temperature_max", vehicle.get("temperature_max"))
    validate_temperature_range(temp_min, temp_max)
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # Crucial: to_mongo encodes datetime.date to datetime(UTC midnight)
    await db.vehicles.update_one(
        {"_id": vehicle["_id"]},
        {"$set": to_mongo(update_data)}
    )
    
    updated = await db.vehicles.find_one({"_id": vehicle["_id"]})
    return to_response(VehicleResponse, updated)

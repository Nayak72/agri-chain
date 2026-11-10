from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId

from app.db.mongodb import get_database
from app.core.permissions import get_current_user, get_current_admin_user
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError, ConflictError
from app.core.constants import UserRole
from app.utils.serialization import to_response
from app.utils.mongo import to_mongo, resolve_doc
from app.schemas.validators import validate_temperature_range

router = APIRouter()


class WarehouseCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    manager_id: Optional[str] = None
    address: str = Field(..., min_length=5, max_length=200)
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    pincode: str = Field(..., pattern=r"^\d{6}$")
    capacity_kg: float = Field(..., gt=0, le=100000000.0)
    cold_storage_capacity_kg: float = Field(0.0, ge=0)
    temperature_range_min: Optional[float] = None
    temperature_range_max: Optional[float] = None
    has_refrigeration: bool = False
    certifications: List[str] = Field(default_factory=list)
    model_config = ConfigDict(extra="forbid")


class WarehouseUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    manager_id: Optional[str] = None
    address: Optional[str] = Field(None, min_length=5, max_length=200)
    city: Optional[str] = Field(None, min_length=2, max_length=100)
    state: Optional[str] = Field(None, min_length=2, max_length=100)
    pincode: Optional[str] = Field(None, pattern=r"^\d{6}$")
    capacity_kg: Optional[float] = Field(None, gt=0, le=100000000.0)
    cold_storage_capacity_kg: Optional[float] = Field(None, ge=0)
    temperature_range_min: Optional[float] = None
    temperature_range_max: Optional[float] = None
    has_refrigeration: Optional[bool] = None
    certifications: Optional[List[str]] = None
    is_active: Optional[bool] = None
    model_config = ConfigDict(extra="forbid")


class WarehouseResponse(BaseModel):
    id: str
    name: str
    manager_id: Optional[str] = None
    address: str
    city: str
    state: str
    pincode: str
    capacity_kg: float
    cold_storage_capacity_kg: float = 0.0
    temperature_range_min: Optional[float] = None
    temperature_range_max: Optional[float] = None
    has_refrigeration: bool = False
    certifications: List[str] = Field(default_factory=list)
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@router.post("", response_model=WarehouseResponse)
async def create_warehouse(
    warehouse_data: WarehouseCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER]:
        raise ForbiddenError("Only warehouse managers or admins can create warehouses")
    
    validate_temperature_range(warehouse_data.temperature_range_min, warehouse_data.temperature_range_max)

    manager_id = warehouse_data.manager_id or current_user["sub"]
    if not ObjectId.is_valid(manager_id):
        raise ValidationError("Invalid manager ID")
    
    manager = await db.users.find_one({"_id": ObjectId(manager_id)})
    if not manager:
        raise ValidationError("Manager not found")
    if manager.get("role") not in [UserRole.WAREHOUSE_MANAGER.value, UserRole.ADMIN.value, UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN]:
        raise ValidationError("Assigned manager must have WAREHOUSE_MANAGER or ADMIN role")
    
    clean_name = warehouse_data.name.strip()
    existing = await db.warehouses.find_one({"name": clean_name})
    if existing:
        raise ConflictError(f"Warehouse with name '{clean_name}' already exists")
    
    now = datetime.now(timezone.utc)
    data_dict = warehouse_data.model_dump()
    data_dict["name"] = clean_name
    data_dict["manager_id"] = manager_id
    warehouse_doc = {
        **data_dict,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    
    result = await db.warehouses.insert_one(to_mongo(warehouse_doc))
    warehouse_doc["_id"] = result.inserted_id
    
    return to_response(WarehouseResponse, warehouse_doc)


@router.get("", response_model=List[WarehouseResponse])
async def list_warehouses(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_active: Optional[bool] = None,
    manager_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if current_user["role"] == UserRole.WAREHOUSE_MANAGER:
        query["manager_id"] = current_user["sub"]
    elif is_active is not None:
        query["is_active"] = is_active
    
    if manager_id and current_user["role"] == UserRole.ADMIN:
        if not ObjectId.is_valid(manager_id):
            raise ValidationError("Invalid manager ID")
        query["manager_id"] = manager_id
    
    warehouses = await db.warehouses.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [to_response(WarehouseResponse, w) for w in warehouses]


@router.get("/{warehouse_id}", response_model=WarehouseResponse)
async def get_warehouse(
    warehouse_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    warehouse = await resolve_doc(db.warehouses, warehouse_id, "Warehouse", business_key="name")
    
    if current_user["role"] == UserRole.WAREHOUSE_MANAGER and warehouse.get("manager_id") != current_user["sub"]:
        raise ForbiddenError("Not authorized to view this warehouse")
    
    return to_response(WarehouseResponse, warehouse)


@router.patch("/{warehouse_id}", response_model=WarehouseResponse)
async def update_warehouse(
    warehouse_id: str,
    warehouse_data: WarehouseUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER]:
        raise ForbiddenError("Only warehouse managers or admins can update warehouses")

    warehouse = await resolve_doc(db.warehouses, warehouse_id, "Warehouse", business_key="name")
    
    if current_user["role"] == UserRole.WAREHOUSE_MANAGER and warehouse.get("manager_id") != current_user["sub"]:
        raise ForbiddenError("Not authorized to update this warehouse")
    
    update_data = warehouse_data.model_dump(exclude_unset=True)
    if not update_data:
        raise ValidationError("No valid fields to update")
    
    if "name" in update_data:
        update_data["name"] = update_data["name"].strip()
        existing = await db.warehouses.find_one({"name": update_data["name"], "_id": {"$ne": warehouse["_id"]}})
        if existing:
            raise ConflictError(f"Warehouse with name '{update_data['name']}' already exists")

    if "manager_id" in update_data and update_data["manager_id"]:
        if current_user["role"] != UserRole.ADMIN:
            raise ForbiddenError("Only admins can reassign warehouse managers")
        if not ObjectId.is_valid(update_data["manager_id"]):
            raise ValidationError("Invalid manager ID")
        mgr = await db.users.find_one({"_id": ObjectId(update_data["manager_id"])})
        if not mgr:
            raise ValidationError("Manager not found")

    validate_temperature_range(
        update_data.get("temperature_range_min", warehouse.get("temperature_range_min")),
        update_data.get("temperature_range_max", warehouse.get("temperature_range_max"))
    )

    now = datetime.now(timezone.utc)
    update_data["updated_at"] = now
    
    await db.warehouses.update_one(
        {"_id": warehouse["_id"]},
        {"$set": to_mongo(update_data)}
    )
    
    updated = await db.warehouses.find_one({"_id": warehouse["_id"]})
    return to_response(WarehouseResponse, updated)

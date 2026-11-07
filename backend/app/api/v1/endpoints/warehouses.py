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

router = APIRouter()


class WarehouseCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    manager_id: str
    address: str = Field(..., min_length=5, max_length=200)
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    pincode: str = Field(..., pattern=r"^\d{6}$")
    capacity_kg: float = Field(..., gt=0)
    cold_storage_capacity_kg: float = Field(0, ge=0)
    temperature_range_min: Optional[float] = None
    temperature_range_max: Optional[float] = None
    has_refrigeration: bool = False
    certifications: List[str] = []


class WarehouseUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    manager_id: Optional[str] = None
    address: Optional[str] = Field(None, min_length=5, max_length=200)
    city: Optional[str] = Field(None, min_length=2, max_length=100)
    state: Optional[str] = Field(None, min_length=2, max_length=100)
    pincode: Optional[str] = Field(None, pattern=r"^\d{6}$")
    capacity_kg: Optional[float] = Field(None, gt=0)
    cold_storage_capacity_kg: Optional[float] = Field(None, ge=0)
    temperature_range_min: Optional[float] = None
    temperature_range_max: Optional[float] = None
    has_refrigeration: Optional[bool] = None
    certifications: Optional[List[str]] = None
    is_active: Optional[bool] = None


class WarehouseResponse(BaseModel):
    id: str
    name: str
    manager_id: str
    address: str
    city: str
    state: str
    pincode: str
    capacity_kg: float
    cold_storage_capacity_kg: float
    temperature_range_min: Optional[float]
    temperature_range_max: Optional[float]
    has_refrigeration: bool
    certifications: List[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime


@router.post("", response_model=WarehouseResponse)
async def create_warehouse(
    warehouse_data: WarehouseCreate,
    current_user: dict = Depends(get_current_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(warehouse_data.manager_id):
        raise ValidationError("Invalid manager ID")
    
    manager = await db.users.find_one({"_id": ObjectId(warehouse_data.manager_id)})
    if not manager or manager["role"] != UserRole.WAREHOUSE_MANAGER:
        raise ValidationError("Manager must be a warehouse manager")
    
    existing = await db.warehouses.find_one({"name": warehouse_data.name})
    if existing:
        raise ValidationError("Warehouse name already exists")
    
    warehouse_doc = {
        **warehouse_data.model_dump(),
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    
    result = await db.warehouses.insert_one(warehouse_doc)
    warehouse_doc["_id"] = result.inserted_id
    
    return WarehouseResponse(id=str(result.inserted_id), **warehouse_doc)


@router.get("", response_model=List[WarehouseResponse])
async def list_warehouses(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_active: Optional[bool] = True,
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
    return [WarehouseResponse(id=str(w["_id"]), **w) for w in warehouses]


@router.get("/{warehouse_id}", response_model=WarehouseResponse)
async def get_warehouse(
    warehouse_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(warehouse_id):
        raise ValidationError("Invalid warehouse ID")
    
    warehouse = await db.warehouses.find_one({"_id": ObjectId(warehouse_id)})
    if not warehouse:
        raise NotFoundError("Warehouse", warehouse_id)
    
    if current_user["role"] == UserRole.WAREHOUSE_MANAGER and warehouse["manager_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized to view this warehouse")
    
    return WarehouseResponse(id=str(warehouse["_id"]), **warehouse)


@router.patch("/{warehouse_id}", response_model=WarehouseResponse)
async def update_warehouse(
    warehouse_id: str,
    warehouse_data: WarehouseUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(warehouse_id):
        raise ValidationError("Invalid warehouse ID")
    
    warehouse = await db.warehouses.find_one({"_id": ObjectId(warehouse_id)})
    if not warehouse:
        raise NotFoundError("Warehouse", warehouse_id)
    
    if current_user["role"] == UserRole.WAREHOUSE_MANAGER and warehouse["manager_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized to update this warehouse")
    
    update_data = {k: v for k, v in warehouse_data.model_dump().items() if v is not None}
    if not update_data:
        raise ValidationError("No valid fields to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.warehouses.update_one(
        {"_id": ObjectId(warehouse_id)},
        {"$set": update_data}
    )
    
    updated = await db.warehouses.find_one({"_id": ObjectId(warehouse_id)})
    return WarehouseResponse(id=str(updated["_id"]), **updated)
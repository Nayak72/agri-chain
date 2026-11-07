from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
from app.db.mongodb import get_database
from app.core.permissions import get_current_user, Role
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError
from app.core.constants import UserRole

router = APIRouter()


class FarmCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    address: str = Field(..., min_length=5, max_length=200)
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    pincode: str = Field(..., pattern=r"^\d{6}$")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area_hectares: Optional[float] = Field(None, gt=0)
    certifications: List[str] = []
    description: Optional[str] = None


class FarmUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    address: Optional[str] = Field(None, min_length=5, max_length=200)
    city: Optional[str] = Field(None, min_length=2, max_length=100)
    state: Optional[str] = Field(None, min_length=2, max_length=100)
    pincode: Optional[str] = Field(None, pattern=r"^\d{6}$")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area_hectares: Optional[float] = Field(None, gt=0)
    certifications: Optional[List[str]] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class FarmResponse(BaseModel):
    id: str
    farmer_id: str
    name: str
    address: str
    city: str
    state: str
    pincode: str
    latitude: Optional[float]
    longitude: Optional[float]
    area_hectares: Optional[float]
    certifications: List[str]
    description: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime


@router.post("", response_model=FarmResponse)
async def create_farm(
    farm_data: FarmCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.FARMER, UserRole.ADMIN]:
        raise ForbiddenError("Only farmers can create farms")
    
    farmer_id = current_user["sub"] if current_user["role"] == UserRole.FARMER else farm_data.model_dump().get("farmer_id")
    if not farmer_id:
        raise ValidationError("Farmer ID required")
    
    farm_doc = {
        "farmer_id": farmer_id,
        **farm_data.model_dump(),
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    
    result = await db.farms.insert_one(farm_doc)
    farm_doc["_id"] = result.inserted_id
    
    return FarmResponse(
        id=str(result.inserted_id),
        **farm_doc
    )


@router.get("", response_model=List[FarmResponse])
async def list_farms(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_active: Optional[bool] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if current_user["role"] == UserRole.FARMER:
        query["farmer_id"] = current_user["sub"]
    elif current_user["role"] in [UserRole.WAREHOUSE_MANAGER, UserRole.BUYER, UserRole.TRANSPORTER]:
        query["is_active"] = True
    
    if is_active is not None:
        query["is_active"] = is_active
    
    farms = await db.farms.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    
    return [FarmResponse(id=str(f["_id"]), **f) for f in farms]


@router.get("/{farm_id}", response_model=FarmResponse)
async def get_farm(
    farm_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(farm_id):
        raise ValidationError("Invalid farm ID")
    
    farm = await db.farms.find_one({"_id": ObjectId(farm_id)})
    if not farm:
        raise NotFoundError("Farm", farm_id)
    
    if current_user["role"] == UserRole.FARMER and farm["farmer_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized to view this farm")
    
    return FarmResponse(id=str(farm["_id"]), **farm)


@router.patch("/{farm_id}", response_model=FarmResponse)
async def update_farm(
    farm_id: str,
    farm_data: FarmUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(farm_id):
        raise ValidationError("Invalid farm ID")
    
    farm = await db.farms.find_one({"_id": ObjectId(farm_id)})
    if not farm:
        raise NotFoundError("Farm", farm_id)
    
    if current_user["role"] == UserRole.FARMER and farm["farmer_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized to update this farm")
    
    update_data = {k: v for k, v in farm_data.model_dump().items() if v is not None}
    if not update_data:
        raise ValidationError("No valid fields to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.farms.update_one(
        {"_id": ObjectId(farm_id)},
        {"$set": update_data}
    )
    
    updated = await db.farms.find_one({"_id": ObjectId(farm_id)})
    return FarmResponse(id=str(updated["_id"]), **updated)
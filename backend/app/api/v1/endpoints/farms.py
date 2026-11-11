from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
from app.db.mongodb import get_database
from app.core.permissions import get_current_user
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError, ConflictError
from app.core.constants import UserRole
from app.utils.serialization import to_response
from app.utils.mongo import to_mongo, resolve_doc

router = APIRouter()


class FarmCreate(BaseModel):
    name: str = Field(...)
    city: str = Field(...)
    state: str = Field(...)
    pincode: str = Field(...)
    description: Optional[str] = Field(None)
    farmer_id: Optional[str] = None
    model_config = ConfigDict(extra="forbid")


class FarmUpdate(BaseModel):
    name: Optional[str] = Field(None)
    city: Optional[str] = Field(None)
    state: Optional[str] = Field(None)
    pincode: Optional[str] = Field(None)
    description: Optional[str] = Field(None)
    is_active: Optional[bool] = None
    model_config = ConfigDict(extra="forbid")


class FarmResponse(BaseModel):
    id: str
    farmer_id: str
    name: str
    city: str
    state: str
    pincode: str
    description: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@router.post("", response_model=FarmResponse)
async def create_farm(
    farm_data: FarmCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.FARMER, UserRole.ADMIN]:
        raise ForbiddenError("Only farmers or admins can create farms")
    
    if current_user["role"] == UserRole.FARMER:
        farmer_id = current_user["sub"]
    else:
        farmer_id = farm_data.farmer_id
        if not farmer_id:
            raise ValidationError("farmer_id is required when admin creates a farm")
        if not ObjectId.is_valid(farmer_id):
            raise ValidationError("Invalid farmer ID")
        farmer = await db.users.find_one({"_id": ObjectId(farmer_id), "role": UserRole.FARMER})
        if not farmer:
            raise ValidationError("Specified user is not a valid active farmer")
    
    # Pre-check unique farm name per farmer
    existing = await db.farms.find_one({"farmer_id": farmer_id, "name": farm_data.name.strip()})
    if existing:
        raise ConflictError(f"A farm named '{farm_data.name}' already exists for this farmer")

    dump = farm_data.model_dump(exclude_unset=True)
    dump.pop("farmer_id", None)
    
    farm_doc = {
        "farmer_id": farmer_id,
        **dump,
        "name": farm_data.name.strip(),
        "city": farm_data.city.strip(),
        "state": farm_data.state.strip(),
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    
    result = await db.farms.insert_one(to_mongo(farm_doc))
    farm_doc["_id"] = result.inserted_id
    
    return to_response(FarmResponse, farm_doc)


@router.get("", response_model=List[FarmResponse])
async def list_farms(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1),
    is_active: Optional[bool] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if current_user["role"] == UserRole.FARMER:
        query["farmer_id"] = current_user["sub"]
    elif current_user["role"] in [UserRole.WAREHOUSE_MANAGER, UserRole.BUYER, UserRole.TRANSPORTER, UserRole.DRIVER]:
        query["is_active"] = True
    
    if is_active is not None:
        query["is_active"] = is_active
    
    farms = await db.farms.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [to_response(FarmResponse, f) for f in farms]


@router.get("/{farm_id}", response_model=FarmResponse)
async def get_farm(
    farm_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    farm = await resolve_doc(db.farms, farm_id, "Farm")
    
    if current_user["role"] == UserRole.FARMER and farm["farmer_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized to view this farm")
    
    return to_response(FarmResponse, farm)


@router.patch("/{farm_id}", response_model=FarmResponse)
async def update_farm(
    farm_id: str,
    farm_data: FarmUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.FARMER, UserRole.ADMIN]:
        raise ForbiddenError("Only farmers or admins can update farms")

    farm = await resolve_doc(db.farms, farm_id, "Farm")
    
    if current_user["role"] == UserRole.FARMER and farm["farmer_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized to update this farm")
    
    update_data = farm_data.model_dump(exclude_unset=True)
    if not update_data:
        raise ValidationError("No fields provided to update")
    
    if "name" in update_data:
        new_name = update_data["name"].strip()
        existing = await db.farms.find_one({
            "farmer_id": farm["farmer_id"],
            "name": new_name,
            "_id": {"$ne": farm["_id"]}
        })
        if existing:
            raise ConflictError(f"A farm named '{new_name}' already exists for this farmer")
        update_data["name"] = new_name

    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.farms.update_one(
        {"_id": farm["_id"]},
        {"$set": to_mongo(update_data)}
    )
    
    updated = await db.farms.find_one({"_id": farm["_id"]})
    return to_response(FarmResponse, updated)

from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date, timezone, timedelta
from bson import ObjectId
from app.db.mongodb import get_database
from app.core.permissions import get_current_user, Role
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError
from app.core.constants import ProduceType, QualityGrade, PackagingType, BatchStatus, UserRole
from app.services.ledger_service import append_ledger_block
from app.core.constants import LedgerEventType
import uuid

router = APIRouter()


def generate_batch_id(produce_type: ProduceType, farm_location: str) -> str:
    prefix = produce_type[:3].upper()
    location_code = farm_location[:3].upper()
    unique = uuid.uuid4().hex[:6].upper()
    return f"{prefix}-{location_code}-{unique}"


class BatchCreate(BaseModel):
    produce_type: ProduceType
    farm_id: str
    harvest_date: date
    harvest_location: str
    initial_quantity_kg: float = Field(..., gt=0)
    quality_grade: QualityGrade = QualityGrade.GRADE_A
    packaging_type: PackagingType = PackagingType.CRATE
    estimated_shelf_life_days: int = Field(..., gt=0)
    handling_requirements: Optional[str] = None


class BatchUpdate(BaseModel):
    quality_grade: Optional[QualityGrade] = None
    packaging_type: Optional[PackagingType] = None
    handling_requirements: Optional[str] = None
    status: Optional[BatchStatus] = None


class BatchResponse(BaseModel):
    id: str
    batch_id: str
    produce_type: ProduceType
    farmer_id: str
    farm_id: str
    harvest_date: date
    harvest_location: str
    initial_quantity_kg: float
    available_quantity_kg: float
    reserved_quantity_kg: float
    dispatched_quantity_kg: float
    accepted_quantity_kg: float
    rejected_quantity_kg: float
    quality_grade: QualityGrade
    packaging_type: PackagingType
    estimated_shelf_life_end: date
    handling_requirements: Optional[str]
    status: BatchStatus
    created_at: datetime
    updated_at: datetime


@router.post("", response_model=BatchResponse)
async def create_batch(
    batch_data: BatchCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.FARMER, UserRole.ADMIN]:
        raise ForbiddenError("Only farmers can create batches")
    
    farmer_id = current_user["sub"] if current_user["role"] == UserRole.FARMER else None
    if not farmer_id:
        raise ValidationError("Farmer ID required")
    
    if not ObjectId.is_valid(batch_data.farm_id):
        raise ValidationError("Invalid farm ID")
    
    farm = await db.farms.find_one({"_id": ObjectId(batch_data.farm_id)})
    if not farm:
        raise NotFoundError("Farm", batch_data.farm_id)
    
    if farm["farmer_id"] != farmer_id and current_user["role"] != UserRole.ADMIN:
        raise ForbiddenError("Farm does not belong to this farmer")
    
    from app.core.constants import PRODUCE_HANDLING_PROFILES
    profile = PRODUCE_HANDLING_PROFILES.get(batch_data.produce_type, {})
    shelf_life_days = batch_data.estimated_shelf_life_days or profile.get("shelf_life_days", 30)
    
    harvest_datetime = datetime.combine(batch_data.harvest_date, datetime.min.time())
    shelf_life_end = harvest_datetime + timedelta(days=shelf_life_days)
    
    batch_id = generate_batch_id(batch_data.produce_type, batch_data.harvest_location)
    
    existing = await db.produce_batches.find_one({"batch_id": batch_id})
    while existing:
        batch_id = generate_batch_id(batch_data.produce_type, batch_data.harvest_location)
        existing = await db.produce_batches.find_one({"batch_id": batch_id})
    
    batch_doc = {
        "batch_id": batch_id,
        "produce_type": batch_data.produce_type,
        "farmer_id": farmer_id,
        "farm_id": batch_data.farm_id,
        "harvest_date": harvest_datetime,
        "harvest_location": batch_data.harvest_location,
        "initial_quantity_kg": batch_data.initial_quantity_kg,
        "available_quantity_kg": batch_data.initial_quantity_kg,
        "reserved_quantity_kg": 0.0,
        "dispatched_quantity_kg": 0.0,
        "accepted_quantity_kg": 0.0,
        "rejected_quantity_kg": 0.0,
        "quality_grade": batch_data.quality_grade,
        "packaging_type": batch_data.packaging_type,
        "estimated_shelf_life_end": shelf_life_end,
        "handling_requirements": batch_data.handling_requirements or profile.get("special_handling"),
        "status": BatchStatus.CREATED,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    
    result = await db.produce_batches.insert_one(batch_doc)
    batch_doc["_id"] = result.inserted_id
    
    await append_ledger_block(
        db,
        event_type=LedgerEventType.PRODUCE_BATCH_CREATED,
        entity_type="PRODUCE_BATCH",
        entity_id=str(result.inserted_id),
        actor_id=farmer_id,
        actor_role=current_user["role"],
        event_summary=f"Harvest batch {batch_id} created for {batch_data.produce_type}",
        payload={
            "batch_id": batch_id,
            "produce_type": batch_data.produce_type,
            "initial_quantity_kg": batch_data.initial_quantity_kg,
            "farm_id": batch_data.farm_id,
        }
    )
    
    return BatchResponse(id=str(result.inserted_id), **batch_doc)


@router.get("", response_model=List[BatchResponse])
async def list_batches(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    produce_type: Optional[ProduceType] = None,
    status: Optional[BatchStatus] = None,
    farm_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if current_user["role"] == UserRole.FARMER:
        query["farmer_id"] = current_user["sub"]
    elif current_user["role"] in [UserRole.WAREHOUSE_MANAGER, UserRole.BUYER]:
        query["status"] = {"$in": [BatchStatus.AT_WAREHOUSE, BatchStatus.INSPECTED, BatchStatus.PACKAGED]}
    
    if produce_type:
        query["produce_type"] = produce_type
    if status:
        query["status"] = status
    if farm_id:
        if not ObjectId.is_valid(farm_id):
            raise ValidationError("Invalid farm ID")
        query["farm_id"] = farm_id
    
    batches = await db.produce_batches.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [BatchResponse(id=str(b["_id"]), **b) for b in batches]


@router.get("/{batch_id}", response_model=BatchResponse)
async def get_batch(
    batch_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(batch_id):
        raise ValidationError("Invalid batch ID")
    
    batch = await db.produce_batches.find_one({"_id": ObjectId(batch_id)})
    if not batch:
        raise NotFoundError("Batch", batch_id)
    
    if current_user["role"] == UserRole.FARMER and batch["farmer_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized to view this batch")
    
    return BatchResponse(id=str(batch["_id"]), **batch)


@router.patch("/{batch_id}", response_model=BatchResponse)
async def update_batch(
    batch_id: str,
    batch_data: BatchUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(batch_id):
        raise ValidationError("Invalid batch ID")
    
    batch = await db.produce_batches.find_one({"_id": ObjectId(batch_id)})
    if not batch:
        raise NotFoundError("Batch", batch_id)
    
    if current_user["role"] == UserRole.FARMER and batch["farmer_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized to update this batch")
    
    update_data = {k: v for k, v in batch_data.model_dump().items() if v is not None}
    if not update_data:
        raise ValidationError("No valid fields to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.produce_batches.update_one(
        {"_id": ObjectId(batch_id)},
        {"$set": update_data}
    )
    
    await append_ledger_block(
        db,
        event_type=LedgerEventType.PRODUCE_BATCH_UPDATED,
        entity_type="PRODUCE_BATCH",
        entity_id=batch_id,
        actor_id=current_user["sub"],
        actor_role=current_user["role"],
        event_summary=f"Batch {batch['batch_id']} updated",
        payload=update_data
    )
    
    updated = await db.produce_batches.find_one({"_id": ObjectId(batch_id)})
    return BatchResponse(id=str(updated["_id"]), **updated)


@router.get("/{batch_id}/history")
async def get_batch_history(
    batch_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(batch_id):
        raise ValidationError("Invalid batch ID")
    
    batch = await db.produce_batches.find_one({"_id": ObjectId(batch_id)})
    if not batch:
        raise NotFoundError("Batch", batch_id)
    
    if current_user["role"] == UserRole.FARMER and batch["farmer_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized to view this batch")
    
    from app.services.ledger_service import get_entity_history
    return await get_entity_history(db, "PRODUCE_BATCH", batch_id)
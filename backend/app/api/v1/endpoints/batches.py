import re
import uuid
from datetime import datetime, date, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, ConfigDict
from bson import ObjectId

from app.db.mongodb import get_database
from app.core.permissions import get_current_user
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError
from app.core.constants import ProduceType, QualityGrade, PackagingType, BatchStatus, UserRole, LedgerEventType
from app.services.ledger_service import append_ledger_block
from app.db.unit_of_work import run_in_txn
from app.utils.serialization import to_response
from app.utils.mongo import to_mongo, resolve_doc
from app.schemas.validators import validate_shelf_life

router = APIRouter()


async def _with_stock(db, batch):
    result = dict(batch)
    rows = await db.inventory_items.find({"batch_id": str(batch["_id"])}).to_list(100)
    result["available_kg"] = sum(float(row.get("available_kg", 0)) for row in rows)
    return result


def generate_batch_id(produce_type: ProduceType, farm_location: str) -> str:
    prefix = str(produce_type)[:3].upper()
    cleaned = re.sub(r"[^A-Za-z0-9]", "", farm_location)
    loc_code = cleaned[:3].upper() if len(cleaned) >= 3 else (cleaned.upper() + "XXX")[:3]
    unique = uuid.uuid4().hex[:6].upper()
    return f"{prefix}-{loc_code}-{unique}"


class BatchCreate(BaseModel):
    produce_type: ProduceType
    farm_id: str
    harvest_location: str = Field(...)
    initial_quantity_kg: float = Field(..., gt=0, allow_inf_nan=False)
    quality_grade: QualityGrade = QualityGrade.GRADE_A
    packaging_type: PackagingType = PackagingType.CRATE
    estimated_shelf_life_days: int = Field(..., gt=0)
    model_config = ConfigDict(extra="forbid")


class BatchUpdate(BaseModel):
    quality_grade: Optional[QualityGrade] = None
    packaging_type: Optional[PackagingType] = None
    model_config = ConfigDict(extra="forbid")


class BatchResponse(BaseModel):
    id: str
    batch_id: str
    produce_type: ProduceType
    farmer_id: str
    farm_id: str
    harvest_location: str
    initial_quantity_kg: float
    available_kg: Optional[float] = None
    quality_grade: QualityGrade
    packaging_type: PackagingType
    estimated_shelf_life_end: date
    status: BatchStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@router.post("", response_model=BatchResponse)
async def create_batch(
    batch_data: BatchCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.FARMER, UserRole.ADMIN]:
        raise ForbiddenError("Only farmers or admins can create batches")
    
    farm = await resolve_doc(db.farms, batch_data.farm_id, "Farm")
    if not farm.get("is_active", True):
        raise ValidationError("Farm is inactive")
    
    if current_user["role"] == UserRole.FARMER:
        farmer_id = current_user["sub"]
        if farm["farmer_id"] != farmer_id:
            raise ForbiddenError("Farm does not belong to this farmer")
    else:
        # Admin creation: derive farmer_id from the farm
        farmer_id = farm["farmer_id"]
    
    # Check catalogue if entry exists
    produce_type_val = batch_data.produce_type.value if hasattr(batch_data.produce_type, "value") else str(batch_data.produce_type)
    cat = await db.produce_catalogue.find_one({"produce_type": produce_type_val})
    if cat and cat.get("is_active") is False:
        raise ValidationError(f"Produce type {produce_type_val} is deactivated in the catalogue")
    
    shelf_life_days = validate_shelf_life(batch_data.estimated_shelf_life_days)
    shelf_life_end = (datetime.now(timezone.utc) + timedelta(days=shelf_life_days)).date()
    
    batch_id = generate_batch_id(batch_data.produce_type, batch_data.harvest_location)
    while await db.produce_batches.find_one({"batch_id": batch_id}):
        batch_id = generate_batch_id(batch_data.produce_type, batch_data.harvest_location)
    
    now = datetime.now(timezone.utc)
    batch_doc = {
        "batch_id": batch_id,
        "produce_type": produce_type_val,
        "farmer_id": farmer_id,
        "farm_id": str(farm["_id"]),
        "harvest_location": batch_data.harvest_location.strip(),
        "initial_quantity_kg": batch_data.initial_quantity_kg,
        "quality_grade": batch_data.quality_grade.value if hasattr(batch_data.quality_grade, "value") else batch_data.quality_grade,
        "packaging_type": batch_data.packaging_type.value if hasattr(batch_data.packaging_type, "value") else batch_data.packaging_type,
        "estimated_shelf_life_end": shelf_life_end,
        "status": BatchStatus.CREATED.value,
        "created_by": current_user["sub"],
        "created_at": now,
        "updated_at": now,
    }
    
    async def create_transaction(session):
        result = await db.produce_batches.insert_one(to_mongo(batch_doc), session=session)
        batch_doc["_id"] = result.inserted_id
        await append_ledger_block(
            db, event_type=LedgerEventType.PRODUCE_BATCH_CREATED,
            entity_type="PRODUCE_BATCH", entity_id=str(result.inserted_id),
            actor_id=current_user["sub"], actor_role=current_user["role"],
            event_summary=f"Batch {batch_id} created for {produce_type_val}",
            payload={"batch_id": batch_id, "initial_quantity_kg": batch_data.initial_quantity_kg},
            session=session,
        )

    await run_in_txn(create_transaction)
    
    return to_response(BatchResponse, batch_doc)


@router.get("", response_model=List[BatchResponse])
async def list_batches(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1),
    produce_type: Optional[ProduceType] = None,
    status: Optional[BatchStatus] = None,
    farm_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    conditions = []
    if current_user["role"] == UserRole.FARMER:
        conditions.append({"farmer_id": current_user["sub"]})
    elif current_user["role"] == UserRole.BUYER:
        conditions.append({"status": {"$in": [
            BatchStatus.AT_WAREHOUSE.value
        ]}})
    
    if produce_type:
        p_val = produce_type.value if hasattr(produce_type, "value") else str(produce_type)
        conditions.append({"produce_type": p_val})
    if status:
        s_val = status.value if hasattr(status, "value") else str(status)
        conditions.append({"status": s_val})
    if farm_id:
        if not ObjectId.is_valid(farm_id):
            raise ValidationError("Invalid farm ID")
        conditions.append({"farm_id": farm_id})
    
    query = {"$and": conditions} if conditions else {}
    batches = await db.produce_batches.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [to_response(BatchResponse, await _with_stock(db, b)) for b in batches]


@router.get("/{batch_id}", response_model=BatchResponse)
async def get_batch(
    batch_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    batch = await resolve_doc(db.produce_batches, batch_id, "Batch", business_key="batch_id")
    
    if current_user["role"] == UserRole.FARMER and batch["farmer_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized to view this batch")
    
    return to_response(BatchResponse, await _with_stock(db, batch))


@router.patch("/{batch_id}", response_model=BatchResponse)
async def update_batch(
    batch_id: str,
    batch_data: BatchUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.FARMER, UserRole.ADMIN]:
        raise ForbiddenError("Only farmers or admins can update batches")
    
    batch = await resolve_doc(db.produce_batches, batch_id, "Batch", business_key="batch_id")
    
    if current_user["role"] == UserRole.FARMER and batch["farmer_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized to update this batch")
    
    update_data = batch_data.model_dump(exclude_unset=True)
    if not update_data:
        raise ValidationError("No valid fields to update")
    
    now = datetime.now(timezone.utc)
    update_data["updated_at"] = now
    
    await db.produce_batches.update_one(
        {"_id": batch["_id"]},
        {"$set": to_mongo(update_data)}
    )
    
    updated = await db.produce_batches.find_one({"_id": batch["_id"]})
    return to_response(BatchResponse, updated)


@router.get("/{batch_id}/history")
async def get_batch_history(
    batch_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    batch = await resolve_doc(db.produce_batches, batch_id, "Batch", business_key="batch_id")
    
    if current_user["role"] == UserRole.FARMER and batch["farmer_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized to view this batch")
    
    from app.services.ledger_service import get_entity_history
    return await get_entity_history(db, "PRODUCE_BATCH", str(batch["_id"]))

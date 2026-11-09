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
from app.services.ledger_service import append_ledger_block
from app.core.constants import LedgerEventType
from app.db.transaction import transaction_session
import uuid

router = APIRouter()


class CheckpointCreate(BaseModel):
    shipment_id: str
    name: str = Field(..., min_length=2, max_length=100)
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    sequence: int = Field(..., ge=0)
    notes: Optional[str] = None


class CheckpointUpdate(BaseModel):
    actual_arrival: Optional[datetime] = None
    actual_departure: Optional[datetime] = None
    status: Optional[str] = Field(None, pattern="^(PENDING|ARRIVED|DEPARTED|COMPLETED)$")
    notes: Optional[str] = None


class CheckpointResponse(BaseModel):
    id: str
    checkpoint_id: str
    shipment_id: str
    name: str
    city: str
    state: str
    sequence: int
    actual_arrival: Optional[datetime] = None
    actual_departure: Optional[datetime] = None
    status: str
    notes: Optional[str] = None
    recorded_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime


@router.post("", response_model=CheckpointResponse)
async def create_checkpoint(
    checkpoint_data: CheckpointCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.DRIVER, UserRole.TRANSPORTER, UserRole.WAREHOUSE_MANAGER]:
        raise ForbiddenError("Only driver, transporter, or warehouse manager can record checkpoints")
    
    if not ObjectId.is_valid(checkpoint_data.shipment_id):
        raise ValidationError("Invalid shipment ID")
    
    shipment = await db.shipments.find_one({"_id": ObjectId(checkpoint_data.shipment_id)})
    if not shipment:
        raise NotFoundError("Shipment", checkpoint_data.shipment_id)
    
    if current_user["role"] == UserRole.DRIVER and shipment["driver_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized")
    if current_user["role"] == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
        if not transporter or shipment["transporter_id"] != str(transporter["_id"]):
            raise ForbiddenError("Not authorized")
    
    existing = await db.route_checkpoints.find_one({
        "shipment_id": checkpoint_data.shipment_id,
        "sequence": checkpoint_data.sequence
    })
    if existing:
        raise ValidationError("Checkpoint already exists at this sequence")
    
    checkpoint_id = f"CP-{uuid.uuid4().hex[:8].upper()}"
    
    checkpoint_doc = {
        "checkpoint_id": checkpoint_id,
        "shipment_id": checkpoint_data.shipment_id,
        "name": checkpoint_data.name,
        "city": checkpoint_data.city,
        "state": checkpoint_data.state,
        "sequence": checkpoint_data.sequence,
        "actual_arrival": None,
        "actual_departure": None,
        "status": "PENDING",
        "notes": checkpoint_data.notes,
        "recorded_by": current_user["sub"],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    
    result = await db.route_checkpoints.insert_one(checkpoint_doc)
    checkpoint_doc["_id"] = result.inserted_id
    
    await append_ledger_block(
        db,
        event_type=LedgerEventType.CHECKPOINT_RECORDED,
        entity_type="SHIPMENT",
        entity_id=checkpoint_data.shipment_id,
        actor_id=current_user["sub"],
        actor_role=current_user["role"],
        event_summary=f"Checkpoint {checkpoint_data.name} recorded for shipment {shipment['shipment_id']}",
        payload={
            "checkpoint_id": checkpoint_id,
            "name": checkpoint_data.name,
            "city": checkpoint_data.city,
            "state": checkpoint_data.state,
            "sequence": checkpoint_data.sequence,
        }
    )
    
    return CheckpointResponse(id=str(result.inserted_id), **checkpoint_doc)


@router.get("", response_model=List[CheckpointResponse])
async def list_checkpoints(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    shipment_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if shipment_id:
        if not ObjectId.is_valid(shipment_id):
            raise ValidationError("Invalid shipment ID")
        shipment = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
        if not shipment:
            raise NotFoundError("Shipment", shipment_id)
        
        if current_user["role"] == UserRole.FARMER and shipment["farmer_id"] != current_user["sub"]:
            raise ForbiddenError("Not authorized")
        if current_user["role"] == UserRole.BUYER and shipment["buyer_id"] != current_user["sub"]:
            raise ForbiddenError("Not authorized")
        if current_user["role"] == UserRole.TRANSPORTER:
            transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
            if not transporter or shipment["transporter_id"] != str(transporter["_id"]):
                raise ForbiddenError("Not authorized")
        if current_user["role"] == UserRole.DRIVER and shipment["driver_id"] != current_user["sub"]:
            raise ForbiddenError("Not authorized")
        
        query["shipment_id"] = shipment_id
    
    if status:
        query["status"] = status
    
    checkpoints = await db.route_checkpoints.find(query).sort("sequence", 1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [CheckpointResponse(id=str(c["_id"]), **c) for c in checkpoints]


@router.get("/{checkpoint_id}", response_model=CheckpointResponse)
async def get_checkpoint(
    checkpoint_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(checkpoint_id):
        raise ValidationError("Invalid checkpoint ID")
    
    checkpoint = await db.route_checkpoints.find_one({"_id": ObjectId(checkpoint_id)})
    if not checkpoint:
        raise NotFoundError("Checkpoint", checkpoint_id)
    
    shipment = await db.shipments.find_one({"_id": ObjectId(checkpoint["shipment_id"])})
    if not shipment:
        raise NotFoundError("Shipment", checkpoint["shipment_id"])
    
    if current_user["role"] == UserRole.FARMER and shipment["farmer_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized")
    if current_user["role"] == UserRole.BUYER and shipment["buyer_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized")
    if current_user["role"] == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
        if not transporter or shipment["transporter_id"] != str(transporter["_id"]):
            raise ForbiddenError("Not authorized")
    if current_user["role"] == UserRole.DRIVER and shipment["driver_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized")
    
    return CheckpointResponse(id=str(checkpoint["_id"]), **checkpoint)


@router.patch("/{checkpoint_id}", response_model=CheckpointResponse)
async def update_checkpoint(
    checkpoint_id: str,
    checkpoint_data: CheckpointUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.DRIVER, UserRole.TRANSPORTER, UserRole.WAREHOUSE_MANAGER]:
        raise ForbiddenError("Only driver, transporter, or warehouse manager can update checkpoints")
    
    if not ObjectId.is_valid(checkpoint_id):
        raise ValidationError("Invalid checkpoint ID")
    
    checkpoint = await db.route_checkpoints.find_one({"_id": ObjectId(checkpoint_id)})
    if not checkpoint:
        raise NotFoundError("Checkpoint", checkpoint_id)
    
    shipment = await db.shipments.find_one({"_id": ObjectId(checkpoint["shipment_id"])})
    if not shipment:
        raise NotFoundError("Shipment", checkpoint["shipment_id"])
    
    if current_user["role"] == UserRole.DRIVER and shipment["driver_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized")
    if current_user["role"] == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
        if not transporter or shipment["transporter_id"] != str(transporter["_id"]):
            raise ForbiddenError("Not authorized")
    
    update_data = {k: v for k, v in checkpoint_data.model_dump().items() if v is not None}
    if not update_data:
        raise ValidationError("No valid fields to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    if update_data.get("actual_arrival") and update_data.get("actual_departure"):
        update_data["status"] = "COMPLETED"
    elif update_data.get("actual_arrival"):
        update_data["status"] = "ARRIVED"
    elif update_data.get("actual_departure"):
        update_data["status"] = "DEPARTED"
    
    await db.route_checkpoints.update_one(
        {"_id": ObjectId(checkpoint_id)},
        {"$set": update_data}
    )
    
    updated = await db.route_checkpoints.find_one({"_id": ObjectId(checkpoint_id)})
    return CheckpointResponse(id=str(updated["_id"]), **updated)
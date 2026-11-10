import uuid
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, ConfigDict
from bson import ObjectId

from app.db.mongodb import get_database
from app.core.permissions import get_current_user
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError
from app.core.constants import UserRole, LedgerEventType, ShipmentStatus
from app.services.ledger_service import append_ledger_block
from app.db.unit_of_work import uow
from app.utils.serialization import to_response
from app.utils.mongo import to_mongo, resolve_doc
from app.core.access import assert_can_view_shipment, get_driver_for_user, get_transporter_for_user

router = APIRouter()


class CheckpointCreate(BaseModel):
    shipment_id: str
    name: str = Field(..., min_length=2, max_length=100)
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    sequence: int = Field(..., ge=0)
    notes: Optional[str] = Field(None, max_length=1000)
    model_config = ConfigDict(extra="forbid")


class CheckpointUpdate(BaseModel):
    actual_arrival: Optional[datetime] = None
    actual_departure: Optional[datetime] = None
    status: Optional[str] = Field(None, pattern="^(PENDING|ARRIVED|DEPARTED|COMPLETED)$")
    notes: Optional[str] = Field(None, max_length=1000)
    model_config = ConfigDict(extra="forbid")


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
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@router.post("", response_model=CheckpointResponse)
async def create_checkpoint(
    checkpoint_data: CheckpointCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.DRIVER, UserRole.TRANSPORTER, UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN]:
        raise ForbiddenError("Only driver, transporter, warehouse manager, or admin can record checkpoints")
    
    shipment = await resolve_doc(db.shipments, checkpoint_data.shipment_id, "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)
    
    canonical_shipment_id = str(shipment["_id"])
    existing = await db.route_checkpoints.find_one({
        "shipment_id": canonical_shipment_id,
        "sequence": checkpoint_data.sequence
    })
    if existing:
        raise ValidationError("Checkpoint already exists at this sequence")
    
    checkpoint_id = f"CP-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc)
    
    checkpoint_doc = {
        "checkpoint_id": checkpoint_id,
        "shipment_id": canonical_shipment_id,
        "name": checkpoint_data.name.strip(),
        "city": checkpoint_data.city.strip(),
        "state": checkpoint_data.state.strip(),
        "sequence": checkpoint_data.sequence,
        "actual_arrival": None,
        "actual_departure": None,
        "status": "PENDING",
        "notes": checkpoint_data.notes,
        "recorded_by": current_user["sub"],
        "created_at": now,
        "updated_at": now,
    }
    
    async with uow() as session:
        result = await db.route_checkpoints.insert_one(to_mongo(checkpoint_doc), session=session)
        checkpoint_doc["_id"] = result.inserted_id
        
        await append_ledger_block(
            db,
            event_type=LedgerEventType.CHECKPOINT_RECORDED,
            entity_type="SHIPMENT",
            entity_id=canonical_shipment_id,
            actor_id=current_user["sub"],
            actor_role=current_user["role"],
            event_summary=f"Checkpoint {checkpoint_data.name} created for shipment {shipment.get('shipment_id')}",
            payload={
                "checkpoint_id": checkpoint_id,
                "name": checkpoint_data.name,
                "city": checkpoint_data.city,
                "state": checkpoint_data.state,
                "sequence": checkpoint_data.sequence,
            },
            session=session
        )
    
    return to_response(CheckpointResponse, checkpoint_doc)


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
        shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
        await assert_can_view_shipment(db, current_user, shipment)
        query["shipment_id"] = str(shipment["_id"])
    
    if status:
        query["status"] = status
    
    checkpoints = await db.route_checkpoints.find(query).sort("sequence", 1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [to_response(CheckpointResponse, c) for c in checkpoints]


@router.get("/{checkpoint_id}", response_model=CheckpointResponse)
async def get_checkpoint(
    checkpoint_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    checkpoint = await resolve_doc(db.route_checkpoints, checkpoint_id, "Checkpoint", business_key="checkpoint_id")
    shipment = await resolve_doc(db.shipments, checkpoint["shipment_id"], "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)
    
    return to_response(CheckpointResponse, checkpoint)


@router.patch("/{checkpoint_id}", response_model=CheckpointResponse)
async def update_checkpoint(
    checkpoint_id: str,
    checkpoint_data: CheckpointUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.DRIVER, UserRole.TRANSPORTER, UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN]:
        raise ForbiddenError("Only driver, transporter, warehouse manager, or admin can update checkpoints")
    
    checkpoint = await resolve_doc(db.route_checkpoints, checkpoint_id, "Checkpoint", business_key="checkpoint_id")
    shipment = await resolve_doc(db.shipments, checkpoint["shipment_id"], "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)
    
    update_data = checkpoint_data.model_dump(exclude_unset=True)
    if not update_data:
        raise ValidationError("No valid fields to update")
    
    now = datetime.now(timezone.utc)
    new_status = update_data.get("status")
    
    if new_status == "ARRIVED" and "actual_arrival" not in update_data:
        update_data["actual_arrival"] = now
    elif new_status in ["DEPARTED", "COMPLETED"] and "actual_departure" not in update_data:
        update_data["actual_departure"] = now
    
    update_data["updated_at"] = now
    
    async with uow() as session:
        await db.route_checkpoints.update_one(
            {"_id": checkpoint["_id"]},
            {"$set": to_mongo(update_data)},
            session=session
        )
        
        # CP-01: Auto-advance shipment status based on checkpoint updates
        current_shipment_status = shipment.get("status")
        if hasattr(current_shipment_status, "value"):
            current_shipment_status = current_shipment_status.value
            
        if new_status == "ARRIVED" and current_shipment_status == "IN_TRANSIT":
            await db.shipments.update_one(
                {"_id": shipment["_id"]},
                {"$set": {"status": ShipmentStatus.AT_CHECKPOINT.value, "updated_at": now}},
                session=session
            )
        elif new_status in ["DEPARTED", "COMPLETED"] and current_shipment_status == "AT_CHECKPOINT":
            await db.shipments.update_one(
                {"_id": shipment["_id"]},
                {"$set": {"status": ShipmentStatus.IN_TRANSIT.value, "updated_at": now}},
                session=session
            )
        
        await append_ledger_block(
            db,
            event_type=LedgerEventType.CHECKPOINT_RECORDED,
            entity_type="SHIPMENT",
            entity_id=str(shipment["_id"]),
            actor_id=current_user["sub"],
            actor_role=current_user["role"],
            event_summary=f"Checkpoint {checkpoint.get('name')} updated to {new_status or 'UPDATED'}",
            payload={"checkpoint_id": checkpoint.get("checkpoint_id"), "status": new_status},
            session=session
        )
    
    updated = await db.route_checkpoints.find_one({"_id": checkpoint["_id"]})
    return to_response(CheckpointResponse, updated)

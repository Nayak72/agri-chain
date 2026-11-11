import uuid
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, ConfigDict

from app.db.mongodb import get_database
from app.core.permissions import get_current_user
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError
from app.core.constants import UserRole, LedgerEventType
from app.services.ledger_service import append_ledger_block
from app.db.unit_of_work import run_in_txn
from app.utils.serialization import to_response
from app.utils.mongo import to_mongo, resolve_doc
from app.core.access import assert_can_view_shipment

router = APIRouter()


class CheckpointCreate(BaseModel):
    shipment_id: str
    name: str
    city: str
    model_config = ConfigDict(extra="forbid")


class CheckpointResponse(BaseModel):
    id: str
    checkpoint_id: str
    shipment_id: str
    name: str
    city: str
    recorded_at: datetime
    recorded_by: str


@router.post("", response_model=CheckpointResponse)
async def create_checkpoint(
    checkpoint_data: CheckpointCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] != UserRole.DRIVER:
        raise ForbiddenError("Only the assigned driver can record checkpoints")
    
    shipment = await resolve_doc(db.shipments, checkpoint_data.shipment_id, "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)
    
    canonical_shipment_id = str(shipment["_id"])
    if shipment.get("status") != "IN_TRANSIT":
        raise ValidationError("Checkpoints can only be recorded in transit")
    
    checkpoint_id = f"CP-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc)
    
    checkpoint_doc = {
        "checkpoint_id": checkpoint_id,
        "shipment_id": canonical_shipment_id,
        "name": checkpoint_data.name.strip(),
        "city": checkpoint_data.city.strip(),
        "recorded_by": current_user["sub"],
        "recorded_at": now,
    }
    
    async def _transaction(session):
        claimed = await db.shipments.update_one(
            {"_id": shipment["_id"], "status": "IN_TRANSIT"},
            {"$set": {"updated_at": now}}, session=session,
        )
        if claimed.matched_count == 0:
            raise ValidationError("Shipment is no longer in transit")
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
            },
            session=session
        )
    await run_in_txn(_transaction)
    
    return to_response(CheckpointResponse, checkpoint_doc)


@router.get("", response_model=List[CheckpointResponse])
async def list_checkpoints(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1),
    shipment_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if not shipment_id:
        raise ValidationError("shipment_id is required")
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)
    query["shipment_id"] = str(shipment["_id"])
    
    checkpoints = await db.route_checkpoints.find(query).sort("recorded_at", 1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
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

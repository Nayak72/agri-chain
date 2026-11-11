import uuid
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, ConfigDict

from app.db.mongodb import get_database
from app.core.permissions import get_current_user
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError, ConflictError
from app.core.constants import (
    InventoryStatus, WarehouseReceiptStatus, InspectionResult,
    UserRole, ProduceType, LedgerEventType
)
from app.services.ledger_service import append_ledger_block
from app.db.unit_of_work import run_in_txn
from app.utils.serialization import to_response
from app.utils.mongo import to_mongo, resolve_doc

router = APIRouter()


class WarehouseReceiptCreate(BaseModel):
    warehouse_id: str
    batch_id: str
    received_weight_kg: float = Field(..., gt=0)
    accepted_weight_kg: float = Field(..., ge=0)
    damaged_weight_kg: float = Field(0.0, ge=0)
    rejected_weight_kg: float = Field(0.0, ge=0)
    inspection_result: InspectionResult = InspectionResult.PASSED
    packaging_condition: str = "GOOD"
    storage_location: str = Field(...)
    model_config = ConfigDict(extra="forbid")


class WarehouseReceiptResponse(BaseModel):
    id: str
    receipt_id: str
    warehouse_id: str
    batch_id: str
    farmer_id: str
    received_weight_kg: float
    accepted_weight_kg: float
    damaged_weight_kg: float = 0.0
    rejected_weight_kg: float = 0.0
    inspection_result: InspectionResult
    packaging_condition: Optional[str] = "GOOD"
    storage_location: Optional[str] = None
    status: WarehouseReceiptStatus
    receiving_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@router.post("/warehouses/{warehouse_id}/receipts", response_model=WarehouseReceiptResponse)
async def create_warehouse_receipt(
    warehouse_id: str,
    receipt_data: WarehouseReceiptCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN]:
        raise ForbiddenError("Only warehouse managers or admins can create receipts")
    
    warehouse = await resolve_doc(db.warehouses, warehouse_id, "Warehouse")
    if receipt_data.warehouse_id != warehouse_id:
        raise ValidationError("Receipt warehouse does not match URL")
    if current_user["role"] == UserRole.WAREHOUSE_MANAGER and warehouse.get("manager_id") != current_user["sub"]:
        raise ForbiddenError("Not authorized for this warehouse")
    
    batch = await resolve_doc(db.produce_batches, receipt_data.batch_id, "Batch")
    if batch.get("status") not in ("CREATED", "HARVESTED"):
        raise ConflictError("Batch has already been received or cannot be received")
    if receipt_data.received_weight_kg > batch["initial_quantity_kg"]:
        raise ValidationError("Received weight cannot exceed the batch's initial quantity")
    
    total_parts = receipt_data.accepted_weight_kg + receipt_data.damaged_weight_kg + receipt_data.rejected_weight_kg
    if abs(receipt_data.received_weight_kg - total_parts) > 0.01:
        raise ValidationError("Received weight must exactly equal sum of accepted, damaged, and rejected weights")
    
    receipt_id = f"WR-{warehouse_id[:8]}-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc)
    
    receipt_doc = {
        "receipt_id": receipt_id,
        "warehouse_id": warehouse_id,
        "batch_id": str(batch["_id"]),
        "farmer_id": batch["farmer_id"],
        "received_weight_kg": receipt_data.received_weight_kg,
        "accepted_weight_kg": receipt_data.accepted_weight_kg,
        "damaged_weight_kg": receipt_data.damaged_weight_kg,
        "rejected_weight_kg": receipt_data.rejected_weight_kg,
        "inspection_result": receipt_data.inspection_result.value if hasattr(receipt_data.inspection_result, "value") else receipt_data.inspection_result,
        "packaging_condition": receipt_data.packaging_condition,
        "storage_location": receipt_data.storage_location,
        "status": WarehouseReceiptStatus.RECEIVED.value if hasattr(WarehouseReceiptStatus.RECEIVED, "value") else WarehouseReceiptStatus.RECEIVED,
        "receiving_date": now,
        "created_at": now,
        "updated_at": now,
    }
    
    async def _transaction(session):
        result = await db.warehouse_receipts.insert_one(to_mongo(receipt_doc), session=session)
        receipt_doc["_id"] = result.inserted_id
        
        batch_status = "AT_WAREHOUSE"
        if receipt_data.inspection_result == InspectionResult.FAILED or receipt_data.accepted_weight_kg == 0:
            batch_status = "REJECTED"

        claimed = await db.produce_batches.update_one(
            {"_id": batch["_id"], "status": {"$in": ["CREATED", "HARVESTED"]}},
            {
                "$set": {
                    "status": batch_status,
                    "updated_at": now
                }
            },
            session=session
        )
        if claimed.matched_count == 0:
            raise ConflictError("Batch has already been received or cannot be received")
        
        inventory_id = f"INV-{warehouse_id[:6]}-{uuid.uuid4().hex[:6].upper()}"
        inventory_doc = {
            "inventory_id": inventory_id,
            "warehouse_id": warehouse_id,
            "batch_id": str(batch["_id"]),
            "produce_type": batch["produce_type"],
            "accepted_kg": receipt_data.accepted_weight_kg,
            "available_kg": receipt_data.accepted_weight_kg,
            "status": InventoryStatus.AVAILABLE.value if hasattr(InventoryStatus.AVAILABLE, "value") else InventoryStatus.AVAILABLE,
            "storage_location": receipt_data.storage_location,
                "estimated_shelf_life_end": batch.get("estimated_shelf_life_end"),
            "created_at": now,
            "updated_at": now,
        }
        
        await db.inventory_items.insert_one(to_mongo(inventory_doc), session=session)
        
        await append_ledger_block(
            db,
            event_type=LedgerEventType.WAREHOUSE_RECEIVED,
            entity_type="WAREHOUSE_RECEIPT",
            entity_id=str(result.inserted_id),
            actor_id=current_user["sub"],
            actor_role=current_user["role"],
            event_summary=f"Warehouse receipt {receipt_id} for batch {batch.get('batch_id', str(batch['_id']))}",
            payload={
                "receipt_id": receipt_id,
                "batch_id": batch.get("batch_id", str(batch["_id"])),
                "accepted_weight_kg": receipt_data.accepted_weight_kg,
                "warehouse_id": warehouse_id,
            },
            session=session
        )
    await run_in_txn(_transaction)
    
    return to_response(WarehouseReceiptResponse, receipt_doc)


@router.get("/receipts", response_model=List[WarehouseReceiptResponse])
async def list_warehouse_receipts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1),
    warehouse_id: Optional[str] = None,
    batch_id: Optional[str] = None,
    status: Optional[WarehouseReceiptStatus] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if current_user["role"] == UserRole.WAREHOUSE_MANAGER:
        warehouses = await db.warehouses.find({"manager_id": current_user["sub"]}).to_list(100)
        wh_ids = [str(w["_id"]) for w in warehouses]
        query["warehouse_id"] = {"$in": wh_ids}
    elif warehouse_id:
        query["warehouse_id"] = warehouse_id
    
    if batch_id:
        query["batch_id"] = batch_id
    if status:
        query["status"] = status.value if hasattr(status, "value") else status
    
    receipts = await db.warehouse_receipts.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [to_response(WarehouseReceiptResponse, r) for r in receipts]


class InventoryItemResponse(BaseModel):
    id: str
    inventory_id: str
    warehouse_id: str
    batch_id: str
    produce_type: ProduceType
    accepted_kg: float
    available_kg: float
    status: InventoryStatus
    storage_location: Optional[str] = None
    estimated_shelf_life_end: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@router.get("", response_model=List[InventoryItemResponse])
async def list_inventory(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1),
    warehouse_id: Optional[str] = None,
    batch_id: Optional[str] = None,
    produce_type: Optional[ProduceType] = None,
    status: Optional[InventoryStatus] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if current_user["role"] == UserRole.WAREHOUSE_MANAGER:
        warehouses = await db.warehouses.find({"manager_id": current_user["sub"]}).to_list(100)
        wh_ids = [str(w["_id"]) for w in warehouses]
        query["warehouse_id"] = {"$in": wh_ids}
    
    if warehouse_id:
        query["warehouse_id"] = warehouse_id
    if batch_id:
        query["batch_id"] = batch_id
    if produce_type:
        query["produce_type"] = produce_type.value if hasattr(produce_type, "value") else str(produce_type)
    if status:
        query["status"] = status.value if hasattr(status, "value") else str(status)
    
    inventory = await db.inventory_items.find(query).sort("estimated_shelf_life_end", 1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [to_response(InventoryItemResponse, i) for i in inventory]

import uuid
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, ConfigDict
from bson import ObjectId

from app.db.mongodb import get_database
from app.core.permissions import get_current_user
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError, InsufficientStockError
from app.core.constants import (
    InventoryStatus, WarehouseReceiptStatus, InspectionResult,
    QualityGrade, UserRole, ProduceType, LedgerEventType
)
from app.services.ledger_service import append_ledger_block
from app.db.unit_of_work import uow
from app.utils.serialization import to_response
from app.utils.mongo import to_mongo, resolve_doc
from app.services.inventory_service import (
    reserve_stock, release_stock, dispatch_stock, return_stock, assert_inventory_invariant
)

router = APIRouter()


class WarehouseReceiptCreate(BaseModel):
    warehouse_id: str
    batch_id: str
    farmer_id: str
    received_weight_kg: float = Field(..., gt=0)
    accepted_weight_kg: float = Field(..., ge=0)
    damaged_weight_kg: float = Field(0.0, ge=0)
    rejected_weight_kg: float = Field(0.0, ge=0)
    inspection_result: InspectionResult = InspectionResult.PASSED
    quality_grade: QualityGrade = QualityGrade.GRADE_A
    packaging_condition: str = "GOOD"
    storage_location: str = Field(..., min_length=1, max_length=50)
    notes: Optional[str] = Field(None, max_length=1000)
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
    quality_grade: QualityGrade
    packaging_condition: Optional[str] = "GOOD"
    storage_location: Optional[str] = None
    notes: Optional[str] = None
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
    if current_user["role"] == UserRole.WAREHOUSE_MANAGER and warehouse.get("manager_id") != current_user["sub"]:
        raise ForbiddenError("Not authorized for this warehouse")
    
    batch = await resolve_doc(db.produce_batches, receipt_data.batch_id, "Batch")
    
    total_parts = receipt_data.accepted_weight_kg + receipt_data.damaged_weight_kg + receipt_data.rejected_weight_kg
    if abs(receipt_data.received_weight_kg - total_parts) > 0.01:
        raise ValidationError("Received weight must exactly equal sum of accepted, damaged, and rejected weights")
    
    receipt_id = f"WR-{warehouse_id[:8]}-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc)
    
    receipt_doc = {
        "receipt_id": receipt_id,
        "warehouse_id": warehouse_id,
        "batch_id": str(batch["_id"]),
        "farmer_id": receipt_data.farmer_id,
        "received_weight_kg": receipt_data.received_weight_kg,
        "accepted_weight_kg": receipt_data.accepted_weight_kg,
        "damaged_weight_kg": receipt_data.damaged_weight_kg,
        "rejected_weight_kg": receipt_data.rejected_weight_kg,
        "inspection_result": receipt_data.inspection_result.value if hasattr(receipt_data.inspection_result, "value") else receipt_data.inspection_result,
        "quality_grade": receipt_data.quality_grade.value if hasattr(receipt_data.quality_grade, "value") else receipt_data.quality_grade,
        "packaging_condition": receipt_data.packaging_condition,
        "storage_location": receipt_data.storage_location,
        "notes": receipt_data.notes,
        "status": WarehouseReceiptStatus.RECEIVED.value if hasattr(WarehouseReceiptStatus.RECEIVED, "value") else WarehouseReceiptStatus.RECEIVED,
        "receiving_date": now,
        "created_at": now,
        "updated_at": now,
    }
    
    async with uow() as session:
        result = await db.warehouse_receipts.insert_one(to_mongo(receipt_doc), session=session)
        receipt_doc["_id"] = result.inserted_id
        
        batch_status = "AT_WAREHOUSE"
        if receipt_data.inspection_result == InspectionResult.FAILED or receipt_data.accepted_weight_kg == 0:
            batch_status = "REJECTED"

        await db.produce_batches.update_one(
            {"_id": batch["_id"]},
            {
                "$set": {
                    "status": batch_status,
                    "quality_grade": receipt_data.quality_grade.value if hasattr(receipt_data.quality_grade, "value") else receipt_data.quality_grade,
                    "available_quantity_kg": receipt_data.accepted_weight_kg,
                    "accepted_quantity_kg": receipt_data.accepted_weight_kg,
                    "rejected_quantity_kg": receipt_data.rejected_weight_kg,
                    "updated_at": now
                }
            },
            session=session
        )
        
        inventory_id = f"INV-{warehouse_id[:6]}-{uuid.uuid4().hex[:6].upper()}"
        inventory_doc = {
            "inventory_id": inventory_id,
            "warehouse_id": warehouse_id,
            "batch_id": str(batch["_id"]),
            "produce_type": batch["produce_type"],
            "quantity_kg": receipt_data.accepted_weight_kg,
            "available_quantity_kg": receipt_data.accepted_weight_kg,
            "received_total_kg": receipt_data.received_weight_kg,
            "reserved_quantity_kg": 0.0,
            "dispatched_quantity_kg": 0.0,
            "delivered_quantity_kg": 0.0,
            "damaged_quantity_kg": receipt_data.damaged_weight_kg,
            "rejected_quantity_kg": receipt_data.rejected_weight_kg,
            "status": InventoryStatus.AVAILABLE.value if hasattr(InventoryStatus.AVAILABLE, "value") else InventoryStatus.AVAILABLE,
            "storage_location": receipt_data.storage_location,
            "quality_grade": receipt_data.quality_grade.value if hasattr(receipt_data.quality_grade, "value") else receipt_data.quality_grade,
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
    
    return to_response(WarehouseReceiptResponse, receipt_doc)


@router.get("/receipts", response_model=List[WarehouseReceiptResponse])
async def list_warehouse_receipts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
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


class QualityInspectionCreate(BaseModel):
    receipt_id: str
    batch_id: str
    inspector_id: Optional[str] = None
    visual_quality_score: float = Field(..., ge=0, le=100)
    size_uniformity_score: float = Field(..., ge=0, le=100)
    ripeness_score: Optional[float] = Field(None, ge=0, le=100)
    defect_percentage: float = Field(..., ge=0, le=100)
    foreign_matter_present: bool = False
    result: InspectionResult
    quality_grade: QualityGrade
    notes: Optional[str] = Field(None, max_length=1000)
    model_config = ConfigDict(extra="forbid")


class QualityInspectionResponse(BaseModel):
    id: str
    inspection_id: str
    receipt_id: str
    batch_id: str
    inspector_id: Optional[str] = None
    visual_quality_score: float
    size_uniformity_score: float
    ripeness_score: Optional[float] = None
    defect_percentage: float
    foreign_matter_present: bool = False
    result: InspectionResult
    quality_grade: QualityGrade
    notes: Optional[str] = None
    inspection_date: Optional[datetime] = None
    created_at: Optional[datetime] = None


@router.post("/quality-inspections", response_model=QualityInspectionResponse)
async def create_quality_inspection(
    inspection_data: QualityInspectionCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN]:
        raise ForbiddenError("Only warehouse managers or admins can create inspections")
    
    receipt = await resolve_doc(db.warehouse_receipts, inspection_data.receipt_id, "Warehouse Receipt")
    
    if current_user["role"] == UserRole.WAREHOUSE_MANAGER:
        warehouse = await db.warehouses.find_one({"_id": ObjectId(receipt["warehouse_id"]) if ObjectId.is_valid(receipt["warehouse_id"]) else receipt["warehouse_id"]})
        if warehouse and warehouse.get("manager_id") != current_user["sub"]:
            raise ForbiddenError("Not authorized to inspect receipts for this warehouse")
    
    inspection_id = f"QI-{uuid.uuid4().hex[:10].upper()}"
    inspector_id = inspection_data.inspector_id or current_user["sub"]
    now = datetime.now(timezone.utc)
    
    inspection_doc = {
        "inspection_id": inspection_id,
        "receipt_id": str(receipt["_id"]),
        "batch_id": inspection_data.batch_id,
        "inspector_id": inspector_id,
        "visual_quality_score": inspection_data.visual_quality_score,
        "size_uniformity_score": inspection_data.size_uniformity_score,
        "ripeness_score": inspection_data.ripeness_score,
        "defect_percentage": inspection_data.defect_percentage,
        "foreign_matter_present": inspection_data.foreign_matter_present,
        "result": inspection_data.result.value if hasattr(inspection_data.result, "value") else inspection_data.result,
        "quality_grade": inspection_data.quality_grade.value if hasattr(inspection_data.quality_grade, "value") else inspection_data.quality_grade,
        "notes": inspection_data.notes,
        "inspection_date": now,
        "created_at": now,
    }
    
    async with uow() as session:
        result = await db.quality_inspections.insert_one(to_mongo(inspection_doc), session=session)
        inspection_doc["_id"] = result.inserted_id
        
        await db.warehouse_receipts.update_one(
            {"_id": receipt["_id"]},
            {
                "$set": {
                    "inspection_result": inspection_doc["result"],
                    "quality_grade": inspection_doc["quality_grade"],
                    "status": WarehouseReceiptStatus.INSPECTED.value if hasattr(WarehouseReceiptStatus.INSPECTED, "value") else WarehouseReceiptStatus.INSPECTED,
                    "updated_at": now
                }
            },
            session=session
        )
        
        await db.inventory_items.update_one(
            {"batch_id": inspection_data.batch_id, "warehouse_id": receipt["warehouse_id"]},
            {
                "$set": {
                    "quality_grade": inspection_doc["quality_grade"],
                    "updated_at": now
                }
            },
            session=session
        )
        
        await append_ledger_block(
            db,
            event_type=LedgerEventType.QUALITY_INSPECTED,
            entity_type="QUALITY_INSPECTION",
            entity_id=str(result.inserted_id),
            actor_id=current_user["sub"],
            actor_role=current_user["role"],
            event_summary=f"Quality inspection {inspection_id} for batch {receipt.get('batch_id')}",
            payload={
                "inspection_id": inspection_id,
                "batch_id": receipt.get("batch_id"),
                "result": inspection_doc["result"],
                "quality_grade": inspection_doc["quality_grade"],
            },
            session=session
        )
    
    return to_response(QualityInspectionResponse, inspection_doc)


@router.get("/quality-inspections", response_model=List[QualityInspectionResponse])
async def list_quality_inspections(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    receipt_id: Optional[str] = None,
    batch_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if receipt_id:
        query["receipt_id"] = receipt_id
    if batch_id:
        query["batch_id"] = batch_id
    
    inspections = await db.quality_inspections.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [to_response(QualityInspectionResponse, i) for i in inspections]


class InventoryItemResponse(BaseModel):
    id: str
    warehouse_id: str
    batch_id: str
    produce_type: ProduceType
    quantity_kg: float
    available_quantity_kg: Optional[float] = None
    reserved_quantity_kg: float = 0.0
    dispatched_quantity_kg: float = 0.0
    delivered_quantity_kg: float = 0.0
    damaged_quantity_kg: float = 0.0
    rejected_quantity_kg: float = 0.0
    status: InventoryStatus
    storage_location: Optional[str] = None
    quality_grade: QualityGrade
    estimated_shelf_life_end: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@router.get("", response_model=List[InventoryItemResponse])
async def list_inventory(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
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


class InventoryMovementCreate(BaseModel):
    inventory_id: str
    movement_type: str = Field(..., pattern="^(RECEIPT|RESERVE|RELEASE|DISPATCH|DAMAGE|REJECT|TRANSFER|ADJUSTMENT)$")
    quantity_kg: float = Field(..., gt=0)
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=1000)
    model_config = ConfigDict(extra="forbid")


class InventoryMovementResponse(BaseModel):
    id: str
    movement_id: str
    inventory_id: str
    batch_id: str
    movement_type: str
    quantity_kg: float
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None


@router.post("/movements", response_model=InventoryMovementResponse)
async def create_inventory_movement(
    movement_data: InventoryMovementCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN]:
        raise ForbiddenError("Only warehouse managers or admins can create inventory movements")
    
    inventory = await resolve_doc(db.inventory_items, movement_data.inventory_id, "Inventory Item")
    
    if current_user["role"] == UserRole.WAREHOUSE_MANAGER:
        wh = await db.warehouses.find_one({"_id": ObjectId(inventory["warehouse_id"]) if ObjectId.is_valid(inventory["warehouse_id"]) else inventory["warehouse_id"]})
        if wh and wh.get("manager_id") != current_user["sub"]:
            raise ForbiddenError("Not authorized to manage inventory for this warehouse")
    
    movement_id = f"IM-{uuid.uuid4().hex[:10].upper()}"
    now = datetime.now(timezone.utc)
    
    async with uow() as session:
        if movement_data.movement_type == "RESERVE":
            await reserve_stock(
                db, str(inventory["_id"]), movement_data.quantity_kg,
                actor_id=current_user["sub"], actor_role=current_user["role"],
                reference_id=movement_data.reference_id, session=session
            )
        elif movement_data.movement_type == "RELEASE":
            await release_stock(
                db, str(inventory["_id"]), movement_data.quantity_kg,
                actor_id=current_user["sub"], actor_role=current_user["role"],
                reference_id=movement_data.reference_id, session=session
            )
        elif movement_data.movement_type == "DISPATCH":
            await dispatch_stock(
                db, str(inventory["_id"]), movement_data.quantity_kg,
                actor_id=current_user["sub"], actor_role=current_user["role"],
                reference_id=movement_data.reference_id, from_reserved=False, session=session
            )
        elif movement_data.movement_type in ["DAMAGE", "REJECT"]:
            inc_field = "damaged_quantity_kg" if movement_data.movement_type == "DAMAGE" else "rejected_quantity_kg"
            new_status = InventoryStatus.DAMAGED.value if movement_data.movement_type == "DAMAGE" else InventoryStatus.REJECTED.value
            res = await db.inventory_items.update_one(
                {"_id": inventory["_id"], "available_quantity_kg": {"$gte": movement_data.quantity_kg}},
                {
                    "$inc": {"available_quantity_kg": -movement_data.quantity_kg, inc_field: movement_data.quantity_kg},
                    "$set": {"updated_at": now, "status": new_status}
                },
                session=session
            )
            if res.modified_count == 0:
                avail = float(inventory.get("available_quantity_kg", inventory.get("quantity_kg", 0.0)))
                raise InsufficientStockError(available=avail, requested=movement_data.quantity_kg)
        
        movement_doc = {
            "movement_id": movement_id,
            "inventory_id": str(inventory["_id"]),
            "batch_id": inventory["batch_id"],
            "movement_type": movement_data.movement_type,
            "quantity_kg": movement_data.quantity_kg,
            "reference_id": movement_data.reference_id,
            "reference_type": movement_data.reference_type,
            "notes": movement_data.notes,
            "created_by": current_user["sub"],
            "created_at": now,
        }
        
        result = await db.inventory_movements.insert_one(to_mongo(movement_doc), session=session)
        movement_doc["_id"] = result.inserted_id
        
        await append_ledger_block(
            db,
            event_type=LedgerEventType.INVENTORY_MOVEMENT_RECORDED,
            entity_type="INVENTORY_MOVEMENT",
            entity_id=str(result.inserted_id),
            actor_id=current_user["sub"],
            actor_role=current_user["role"],
            event_summary=f"Inventory movement {movement_id} for batch {inventory.get('batch_id')}",
            payload={
                "movement_id": movement_id,
                "batch_id": inventory.get("batch_id"),
                "movement_type": movement_data.movement_type,
                "quantity_kg": movement_data.quantity_kg,
            },
            session=session
        )
    
    return to_response(InventoryMovementResponse, movement_doc)


@router.get("/movements", response_model=List[InventoryMovementResponse])
async def list_inventory_movements(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    inventory_id: Optional[str] = None,
    batch_id: Optional[str] = None,
    movement_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if inventory_id:
        query["inventory_id"] = inventory_id
    if batch_id:
        query["batch_id"] = batch_id
    if movement_type:
        query["movement_type"] = movement_type
    
    movements = await db.inventory_movements.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [to_response(InventoryMovementResponse, m) for m in movements]

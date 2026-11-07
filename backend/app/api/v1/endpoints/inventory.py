from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
from app.db.mongodb import get_database
from app.core.permissions import get_current_user, Role
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError
from app.core.constants import (
    InventoryStatus, WarehouseReceiptStatus, InspectionResult,
    QualityGrade, UserRole, ProduceType
)
from app.services.ledger_service import append_ledger_block
from app.core.constants import LedgerEventType
from app.db.transaction import transaction_session

router = APIRouter()


class WarehouseReceiptCreate(BaseModel):
    warehouse_id: str
    batch_id: str
    farmer_id: str
    received_weight_kg: float = Field(..., gt=0)
    accepted_weight_kg: float = Field(..., ge=0)
    damaged_weight_kg: float = Field(0, ge=0)
    rejected_weight_kg: float = Field(0, ge=0)
    inspection_result: InspectionResult = InspectionResult.PASSED
    quality_grade: QualityGrade = QualityGrade.GRADE_A
    packaging_condition: str = "GOOD"
    storage_location: str
    notes: Optional[str] = None


class WarehouseReceiptResponse(BaseModel):
    id: str
    receipt_id: str
    warehouse_id: str
    batch_id: str
    farmer_id: str
    received_weight_kg: float
    accepted_weight_kg: float
    damaged_weight_kg: float
    rejected_weight_kg: float
    inspection_result: InspectionResult
    quality_grade: QualityGrade
    packaging_condition: str
    storage_location: str
    notes: Optional[str]
    status: WarehouseReceiptStatus
    receiving_date: datetime
    created_at: datetime
    updated_at: datetime


@router.post("/warehouses/{warehouse_id}/receipts", response_model=WarehouseReceiptResponse)
async def create_warehouse_receipt(
    warehouse_id: str,
    receipt_data: WarehouseReceiptCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN]:
        raise ForbiddenError("Only warehouse managers can create receipts")
    
    if not ObjectId.is_valid(warehouse_id):
        raise ValidationError("Invalid warehouse ID")
    
    warehouse = await db.warehouses.find_one({"_id": ObjectId(warehouse_id)})
    if not warehouse:
        raise NotFoundError("Warehouse", warehouse_id)
    
    if current_user["role"] == UserRole.WAREHOUSE_MANAGER and warehouse["manager_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized for this warehouse")
    
    if not ObjectId.is_valid(receipt_data.batch_id):
        raise ValidationError("Invalid batch ID")
    
    batch = await db.produce_batches.find_one({"_id": ObjectId(receipt_data.batch_id)})
    if not batch:
        raise NotFoundError("Batch", receipt_data.batch_id)
    
    if receipt_data.accepted_weight_kg + receipt_data.damaged_weight_kg + receipt_data.rejected_weight_kg > receipt_data.received_weight_kg:
        raise ValidationError("Sum of accepted, damaged, rejected exceeds received weight")
    
    import uuid
    receipt_id = f"WR-{warehouse_id[:8]}-{uuid.uuid4().hex[:8].upper()}"
    
    receipt_doc = {
        "receipt_id": receipt_id,
        "warehouse_id": warehouse_id,
        "batch_id": receipt_data.batch_id,
        "farmer_id": receipt_data.farmer_id,
        "received_weight_kg": receipt_data.received_weight_kg,
        "accepted_weight_kg": receipt_data.accepted_weight_kg,
        "damaged_weight_kg": receipt_data.damaged_weight_kg,
        "rejected_weight_kg": receipt_data.rejected_weight_kg,
        "inspection_result": receipt_data.inspection_result,
        "quality_grade": receipt_data.quality_grade,
        "packaging_condition": receipt_data.packaging_condition,
        "storage_location": receipt_data.storage_location,
        "notes": receipt_data.notes,
        "status": WarehouseReceiptStatus.RECEIVED,
        "receiving_date": datetime.now(timezone.utc),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    
    async with transaction_session() as session:
        result = await db.warehouse_receipts.insert_one(receipt_doc, session=session)
        receipt_doc["_id"] = result.inserted_id
        
        await db.produce_batches.update_one(
            {"_id": ObjectId(receipt_data.batch_id)},
            {
                "$set": {
                    "status": "AT_WAREHOUSE",
                    "quality_grade": receipt_data.quality_grade,
                    "updated_at": datetime.now(timezone.utc)
                },
                "$inc": {
                    "available_quantity_kg": receipt_data.accepted_weight_kg,
                    "rejected_quantity_kg": receipt_data.rejected_weight_kg,
                    "accepted_quantity_kg": receipt_data.accepted_weight_kg
                }
            },
            session=session
        )
        
        inventory_doc = {
            "warehouse_id": warehouse_id,
            "batch_id": receipt_data.batch_id,
            "produce_type": batch["produce_type"],
            "quantity_kg": receipt_data.accepted_weight_kg,
            "reserved_quantity_kg": 0.0,
            "dispatched_quantity_kg": 0.0,
            "damaged_quantity_kg": receipt_data.damaged_weight_kg,
            "rejected_quantity_kg": receipt_data.rejected_weight_kg,
            "status": InventoryStatus.AVAILABLE,
            "storage_location": receipt_data.storage_location,
            "quality_grade": receipt_data.quality_grade,
            "estimated_shelf_life_end": batch["estimated_shelf_life_end"],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        
        await db.inventory_items.insert_one(inventory_doc, session=session)
        
        await append_ledger_block(
            db,
            event_type=LedgerEventType.WAREHOUSE_RECEIVED,
            entity_type="WAREHOUSE_RECEIPT",
            entity_id=str(result.inserted_id),
            actor_id=current_user["sub"],
            actor_role=current_user["role"],
            event_summary=f"Warehouse receipt {receipt_id} for batch {batch['batch_id']}",
            payload={
                "receipt_id": receipt_id,
                "batch_id": batch["batch_id"],
                "accepted_weight_kg": receipt_data.accepted_weight_kg,
                "warehouse_id": warehouse_id,
            },
            session=session
        )
    
    return WarehouseReceiptResponse(id=str(receipt_doc["_id"]), **receipt_doc)


class QualityInspectionCreate(BaseModel):
    receipt_id: str
    batch_id: str
    inspector_id: str
    visual_quality_score: float = Field(..., ge=0, le=100)
    size_uniformity_score: float = Field(..., ge=0, le=100)
    ripeness_score: Optional[float] = Field(None, ge=0, le=100)
    defect_percentage: float = Field(..., ge=0, le=100)
    foreign_matter_present: bool = False
    result: InspectionResult
    quality_grade: QualityGrade
    notes: Optional[str] = None


class QualityInspectionResponse(BaseModel):
    id: str
    inspection_id: str
    receipt_id: str
    batch_id: str
    inspector_id: str
    visual_quality_score: float
    size_uniformity_score: float
    ripeness_score: Optional[float]
    defect_percentage: float
    foreign_matter_present: bool
    result: InspectionResult
    quality_grade: QualityGrade
    notes: Optional[str]
    inspection_date: datetime
    created_at: datetime


@router.post("/quality-inspections", response_model=QualityInspectionResponse)
async def create_quality_inspection(
    inspection_data: QualityInspectionCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN]:
        raise ForbiddenError("Only warehouse managers can create inspections")
    
    if not ObjectId.is_valid(inspection_data.receipt_id):
        raise ValidationError("Invalid receipt ID")
    
    receipt = await db.warehouse_receipts.find_one({"_id": ObjectId(inspection_data.receipt_id)})
    if not receipt:
        raise NotFoundError("Warehouse Receipt", inspection_data.receipt_id)
    
    import uuid
    inspection_id = f"QI-{uuid.uuid4().hex[:10].upper()}"
    
    inspection_doc = {
        "inspection_id": inspection_id,
        "receipt_id": inspection_data.receipt_id,
        "batch_id": inspection_data.batch_id,
        "inspector_id": inspection_data.inspector_id,
        "visual_quality_score": inspection_data.visual_quality_score,
        "size_uniformity_score": inspection_data.size_uniformity_score,
        "ripeness_score": inspection_data.ripeness_score,
        "defect_percentage": inspection_data.defect_percentage,
        "foreign_matter_present": inspection_data.foreign_matter_present,
        "result": inspection_data.result,
        "quality_grade": inspection_data.quality_grade,
        "notes": inspection_data.notes,
        "inspection_date": datetime.now(timezone.utc),
        "created_at": datetime.now(timezone.utc),
    }
    
    async with transaction_session() as session:
        result = await db.quality_inspections.insert_one(inspection_doc, session=session)
        inspection_doc["_id"] = result.inserted_id
        
        await db.warehouse_receipts.update_one(
            {"_id": ObjectId(inspection_data.receipt_id)},
            {
                "$set": {
                    "inspection_result": inspection_data.result,
                    "quality_grade": inspection_data.quality_grade,
                    "status": WarehouseReceiptStatus.INSPECTED,
                    "updated_at": datetime.now(timezone.utc)
                }
            },
            session=session
        )
        
        await db.inventory_items.update_one(
            {"batch_id": inspection_data.batch_id, "warehouse_id": receipt["warehouse_id"]},
            {
                "$set": {
                    "quality_grade": inspection_data.quality_grade,
                    "updated_at": datetime.now(timezone.utc)
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
            event_summary=f"Quality inspection {inspection_id} for batch {receipt['batch_id']}",
            payload={
                "inspection_id": inspection_id,
                "batch_id": receipt["batch_id"],
                "result": inspection_data.result,
                "quality_grade": inspection_data.quality_grade,
            },
            session=session
        )
    
    return QualityInspectionResponse(id=str(inspection_doc["_id"]), **inspection_doc)


class InventoryItemResponse(BaseModel):
    id: str
    warehouse_id: str
    batch_id: str
    produce_type: ProduceType
    quantity_kg: float
    reserved_quantity_kg: float
    dispatched_quantity_kg: float
    damaged_quantity_kg: float
    rejected_quantity_kg: float
    status: InventoryStatus
    storage_location: str
    quality_grade: QualityGrade
    estimated_shelf_life_end: datetime
    created_at: datetime
    updated_at: datetime


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
        warehouse = await db.warehouses.find_one({"manager_id": current_user["sub"]})
        if warehouse:
            query["warehouse_id"] = str(warehouse["_id"])
    
    if warehouse_id:
        if not ObjectId.is_valid(warehouse_id):
            raise ValidationError("Invalid warehouse ID")
        query["warehouse_id"] = warehouse_id
    if batch_id:
        if not ObjectId.is_valid(batch_id):
            raise ValidationError("Invalid batch ID")
        query["batch_id"] = batch_id
    if produce_type:
        query["produce_type"] = produce_type
    if status:
        query["status"] = status
    
    inventory = await db.inventory_items.find(query).sort("estimated_shelf_life_end", 1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [InventoryItemResponse(id=str(i["_id"]), **i) for i in inventory]


class InventoryMovementCreate(BaseModel):
    inventory_id: str
    movement_type: str = Field(..., pattern="^(RECEIPT|RESERVE|RELEASE|DISPATCH|DAMAGE|REJECT|TRANSFER|ADJUSTMENT)$")
    quantity_kg: float = Field(..., gt=0)
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    notes: Optional[str] = None


class InventoryMovementResponse(BaseModel):
    id: str
    movement_id: str
    inventory_id: str
    batch_id: str
    movement_type: str
    quantity_kg: float
    reference_id: Optional[str]
    reference_type: Optional[str]
    notes: Optional[str]
    created_at: datetime


@router.post("/movements", response_model=InventoryMovementResponse)
async def create_inventory_movement(
    movement_data: InventoryMovementCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN]:
        raise ForbiddenError("Only warehouse managers can create inventory movements")
    
    if not ObjectId.is_valid(movement_data.inventory_id):
        raise ValidationError("Invalid inventory ID")
    
    inventory = await db.inventory_items.find_one({"_id": ObjectId(movement_data.inventory_id)})
    if not inventory:
        raise NotFoundError("Inventory Item", movement_data.inventory_id)
    
    import uuid
    movement_id = f"IM-{uuid.uuid4().hex[:10].upper()}"
    
    async with transaction_session() as session:
        if movement_data.movement_type == "RESERVE":
            if inventory["quantity_kg"] - inventory["reserved_quantity_kg"] < movement_data.quantity_kg:
                raise ValidationError("Insufficient available quantity to reserve")
            
            await db.inventory_items.update_one(
                {"_id": ObjectId(movement_data.inventory_id)},
                {"$inc": {"reserved_quantity_kg": movement_data.quantity_kg}, "$set": {"updated_at": datetime.now(timezone.utc)}},
                session=session
            )
        
        elif movement_data.movement_type == "RELEASE":
            if inventory["reserved_quantity_kg"] < movement_data.quantity_kg:
                raise ValidationError("Insufficient reserved quantity to release")
            
            await db.inventory_items.update_one(
                {"_id": ObjectId(movement_data.inventory_id)},
                {"$inc": {"reserved_quantity_kg": -movement_data.quantity_kg}, "$set": {"updated_at": datetime.now(timezone.utc)}},
                session=session
            )
        
        elif movement_data.movement_type == "DISPATCH":
            available = inventory["quantity_kg"] - inventory["reserved_quantity_kg"] - inventory["dispatched_quantity_kg"]
            if available < movement_data.quantity_kg:
                raise ValidationError("Insufficient available quantity to dispatch")
            
            await db.inventory_items.update_one(
                {"_id": ObjectId(movement_data.inventory_id)},
                {"$inc": {"dispatched_quantity_kg": movement_data.quantity_kg}, "$set": {"updated_at": datetime.now(timezone.utc), "status": InventoryStatus.DISPATCHED}},
                session=session
            )
            
            await db.produce_batches.update_one(
                {"_id": ObjectId(inventory["batch_id"])},
                {"$inc": {"dispatched_quantity_kg": movement_data.quantity_kg, "available_quantity_kg": -movement_data.quantity_kg}, "$set": {"updated_at": datetime.now(timezone.utc)}},
                session=session
            )
        
        elif movement_data.movement_type == "DAMAGE":
            if inventory["quantity_kg"] - inventory["damaged_quantity_kg"] < movement_data.quantity_kg:
                raise ValidationError("Insufficient quantity to mark as damaged")
            
            await db.inventory_items.update_one(
                {"_id": ObjectId(movement_data.inventory_id)},
                {"$inc": {"damaged_quantity_kg": movement_data.quantity_kg, "quantity_kg": -movement_data.quantity_kg}, "$set": {"updated_at": datetime.now(timezone.utc), "status": InventoryStatus.DAMAGED}},
                session=session
            )
        
        elif movement_data.movement_type == "REJECT":
            if inventory["quantity_kg"] - inventory["rejected_quantity_kg"] < movement_data.quantity_kg:
                raise ValidationError("Insufficient quantity to reject")
            
            await db.inventory_items.update_one(
                {"_id": ObjectId(movement_data.inventory_id)},
                {"$inc": {"rejected_quantity_kg": movement_data.quantity_kg, "quantity_kg": -movement_data.quantity_kg}, "$set": {"updated_at": datetime.now(timezone.utc), "status": InventoryStatus.REJECTED}},
                session=session
            )
        
        movement_doc = {
            "movement_id": movement_id,
            "inventory_id": movement_data.inventory_id,
            "batch_id": inventory["batch_id"],
            "movement_type": movement_data.movement_type,
            "quantity_kg": movement_data.quantity_kg,
            "reference_id": movement_data.reference_id,
            "reference_type": movement_data.reference_type,
            "notes": movement_data.notes,
            "created_by": current_user["sub"],
            "created_at": datetime.now(timezone.utc),
        }
        
        result = await db.inventory_movements.insert_one(movement_doc, session=session)
        movement_doc["_id"] = result.inserted_id
        
        await append_ledger_block(
            db,
            event_type=LedgerEventType.INVENTORY_MOVEMENT_RECORDED,
            entity_type="INVENTORY_MOVEMENT",
            entity_id=str(result.inserted_id),
            actor_id=current_user["sub"],
            actor_role=current_user["role"],
            event_summary=f"Inventory movement {movement_id} for batch {inventory['batch_id']}",
            payload={
                "movement_id": movement_id,
                "batch_id": inventory["batch_id"],
                "movement_type": movement_data.movement_type,
                "quantity_kg": movement_data.quantity_kg,
            },
            session=session
        )
    
    return InventoryMovementResponse(id=str(movement_doc["_id"]), **movement_doc)


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
        if not ObjectId.is_valid(inventory_id):
            raise ValidationError("Invalid inventory ID")
        query["inventory_id"] = inventory_id
    if batch_id:
        if not ObjectId.is_valid(batch_id):
            raise ValidationError("Invalid batch ID")
        query["batch_id"] = batch_id
    if movement_type:
        query["movement_type"] = movement_type
    
    movements = await db.inventory_movements.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [InventoryMovementResponse(id=str(m["_id"]), **m) for m in movements]
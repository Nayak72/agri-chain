from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from app.schemas.common import BaseSchema


class InventoryItemBase(BaseModel):
    warehouse_id: str
    batch_id: str
    produce_type: str
    quantity_kg: float = Field(..., gt=0)
    reserved_quantity_kg: float = 0.0
    dispatched_quantity_kg: float = 0.0
    damaged_quantity_kg: float = 0.0
    rejected_quantity_kg: float = 0.0
    status: str = "AVAILABLE"
    storage_location: str
    quality_grade: str
    estimated_shelf_life_end: datetime


class InventoryItemResponse(BaseSchema, InventoryItemBase):
    created_at: datetime
    updated_at: datetime


class InventoryMovementBase(BaseModel):
    inventory_id: str
    movement_type: str
    quantity_kg: float = Field(..., gt=0)
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    notes: Optional[str] = None


class InventoryMovementResponse(BaseSchema, InventoryMovementBase):
    batch_id: str
    created_by: str
    created_at: datetime
from pydantic import BaseModel, Field
from datetime import datetime
from app.schemas.common import BaseSchema

class InventoryItemBase(BaseModel):
    inventory_id: str
    warehouse_id: str
    batch_id: str
    produce_type: str
    accepted_kg: float = Field(..., ge=0)
    available_kg: float = Field(..., ge=0)
    status: str = "AVAILABLE"
    storage_location: str
    estimated_shelf_life_end: datetime

class InventoryItemResponse(BaseSchema, InventoryItemBase):
    created_at: datetime
    updated_at: datetime

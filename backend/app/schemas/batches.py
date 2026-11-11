from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from app.schemas.common import BaseSchema


class BatchBase(BaseModel):
    produce_type: str
    farm_id: str
    harvest_location: str
    initial_quantity_kg: float = Field(..., gt=0)
    quality_grade: str = "GRADE_A"
    packaging_type: str = "CRATE"
    estimated_shelf_life_days: int = Field(..., gt=0)


class BatchCreate(BatchBase):
    pass


class BatchUpdate(BaseModel):
    quality_grade: Optional[str] = None
    packaging_type: Optional[str] = None
    status: Optional[str] = None


class BatchResponse(BaseSchema, BatchBase):
    batch_id: str
    farmer_id: str
    available_kg: Optional[float] = None
    estimated_shelf_life_end: datetime
    status: str
    created_at: datetime
    updated_at: datetime
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.schemas.common import BaseSchema


class CheckpointBase(BaseModel):
    shipment_id: str
    name: str = Field(..., min_length=2, max_length=100)
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    sequence: int = Field(..., ge=0)
    notes: Optional[str] = None


class CheckpointCreate(CheckpointBase):
    pass


class CheckpointUpdate(BaseModel):
    actual_arrival: Optional[datetime] = None
    actual_departure: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class CheckpointResponse(BaseSchema, CheckpointBase):
    checkpoint_id: str
    status: str
    recorded_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
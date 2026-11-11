from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from app.schemas.common import BaseSchema


class WarehouseBase(BaseModel):
    name: str = Field(...)
    manager_id: str
    city: str = Field(...)
    state: str = Field(...)
    capacity_kg: float = Field(..., gt=0)
    cold_storage_capacity_kg: float = Field(0, ge=0)
    temperature_range_min: Optional[float] = None
    temperature_range_max: Optional[float] = None
    has_refrigeration: bool = False


class WarehouseCreate(WarehouseBase):
    pass


class WarehouseUpdate(BaseModel):
    name: Optional[str] = Field(None)
    manager_id: Optional[str] = None
    city: Optional[str] = Field(None)
    state: Optional[str] = Field(None)
    capacity_kg: Optional[float] = Field(None, gt=0)
    cold_storage_capacity_kg: Optional[float] = Field(None, ge=0)
    temperature_range_min: Optional[float] = None
    temperature_range_max: Optional[float] = None
    has_refrigeration: Optional[bool] = None
    is_active: Optional[bool] = None


class WarehouseResponse(BaseSchema, WarehouseBase):
    is_active: bool
    created_at: datetime
    updated_at: datetime
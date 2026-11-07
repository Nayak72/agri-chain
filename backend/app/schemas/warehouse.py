from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from app.schemas.common import BaseSchema


class WarehouseBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    manager_id: str
    address: str = Field(..., min_length=5, max_length=200)
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    pincode: str = Field(..., pattern=r"^\d{6}$")
    capacity_kg: float = Field(..., gt=0)
    cold_storage_capacity_kg: float = Field(0, ge=0)
    temperature_range_min: Optional[float] = None
    temperature_range_max: Optional[float] = None
    has_refrigeration: bool = False
    certifications: List[str] = []


class WarehouseCreate(WarehouseBase):
    pass


class WarehouseUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    manager_id: Optional[str] = None
    address: Optional[str] = Field(None, min_length=5, max_length=200)
    city: Optional[str] = Field(None, min_length=2, max_length=100)
    state: Optional[str] = Field(None, min_length=2, max_length=100)
    pincode: Optional[str] = Field(None, pattern=r"^\d{6}$")
    capacity_kg: Optional[float] = Field(None, gt=0)
    cold_storage_capacity_kg: Optional[float] = Field(None, ge=0)
    temperature_range_min: Optional[float] = None
    temperature_range_max: Optional[float] = None
    has_refrigeration: Optional[bool] = None
    certifications: Optional[List[str]] = None
    is_active: Optional[bool] = None


class WarehouseResponse(BaseSchema, WarehouseBase):
    is_active: bool
    created_at: datetime
    updated_at: datetime
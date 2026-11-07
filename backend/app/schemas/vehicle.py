from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from app.schemas.common import BaseSchema


class VehicleBase(BaseModel):
    transporter_id: str
    registration_number: str
    category: str
    vehicle_type: str
    max_payload_kg: float = Field(..., gt=0)
    refrigeration_available: bool = False
    temperature_min: Optional[float] = None
    temperature_max: Optional[float] = None
    registration_expiry: date
    insurance_expiry: date
    fitness_expiry: date
    last_maintenance_date: Optional[date] = None
    next_maintenance_date: Optional[date] = None


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(BaseModel):
    category: Optional[str] = None
    vehicle_type: Optional[str] = None
    max_payload_kg: Optional[float] = Field(None, gt=0)
    available_capacity_kg: Optional[float] = Field(None, ge=0)
    refrigeration_available: Optional[bool] = None
    temperature_min: Optional[float] = None
    temperature_max: Optional[float] = None
    status: Optional[str] = None
    registration_expiry: Optional[date] = None
    insurance_expiry: Optional[date] = None
    fitness_expiry: Optional[date] = None
    last_maintenance_date: Optional[date] = None
    next_maintenance_date: Optional[date] = None


class VehicleResponse(BaseSchema, VehicleBase):
    vehicle_id: str
    available_capacity_kg: float
    status: str
    created_at: datetime
    updated_at: datetime
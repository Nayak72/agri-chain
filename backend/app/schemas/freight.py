from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from app.schemas.common import BaseSchema


class FreightBookingBase(BaseModel):
    purchase_order_id: str
    batch_ids: List[str]
    cargo_quantity_kg: float = Field(..., gt=0)
    total_cargo_weight_kg: float = Field(..., gt=0)
    package_count: int = Field(..., gt=0)
    pickup_address: str
    pickup_city: str
    pickup_state: str
    destination_address: str
    destination_city: str
    destination_state: str
    requested_pickup_date: date
    required_delivery_date: date
    preferred_vehicle_category: str
    refrigeration_required: bool = False
    temperature_min: Optional[float] = None
    temperature_max: Optional[float] = None
    packaging_details: Optional[str] = None
    special_handling_instructions: Optional[str] = None


class FreightBookingCreate(FreightBookingBase):
    pass


class FreightBookingResponse(BaseSchema, FreightBookingBase):
    booking_id: str
    status: str
    created_at: datetime
    updated_at: datetime
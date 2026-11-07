from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.schemas.common import BaseSchema


class ShipmentBase(BaseModel):
    booking_id: str
    accepted_quotation_id: str
    vehicle_id: str
    driver_id: str
    batch_ids: List[str]


class ShipmentCreate(ShipmentBase):
    pass


class ShipmentResponse(BaseSchema, ShipmentBase):
    shipment_id: str
    purchase_order_id: str
    farmer_id: str
    buyer_id: str
    transporter_id: str
    cargo_quantity_kg: float
    total_cargo_weight_kg: float
    package_count: int
    pickup_address: str
    pickup_city: str
    pickup_state: str
    destination_address: str
    destination_city: str
    destination_state: str
    planned_dispatch_time: Optional[datetime] = None
    expected_arrival_time: Optional[datetime] = None
    actual_dispatch_time: Optional[datetime] = None
    actual_arrival_time: Optional[datetime] = None
    status: str
    exception_flags: List[str]
    created_at: datetime
    updated_at: datetime
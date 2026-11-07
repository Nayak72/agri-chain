from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.schemas.common import BaseSchema


class DeliveryReportBase(BaseModel):
    shipment_id: str
    delivered_quantity_kg: float = Field(..., ge=0)
    damaged_quantity_kg: float = Field(0, ge=0)
    missing_quantity_kg: float = Field(0, ge=0)
    received_by: str
    received_at: datetime
    delivery_photos: List[str] = []
    receiver_signature: Optional[str] = None
    notes: Optional[str] = None
    status: str = "DELIVERED"


class DeliveryReportCreate(DeliveryReportBase):
    pass


class DeliveryReportResponse(BaseSchema, DeliveryReportBase):
    report_id: str
    created_at: datetime
    updated_at: datetime


class DamageClaimBase(BaseModel):
    shipment_id: str
    batch_id: str
    reported_by: str
    claimed_quantity_kg: float = Field(..., gt=0)
    damage_type: str
    description: str
    status: str = "OPEN"


class DamageClaimResponse(BaseSchema, DamageClaimBase):
    claim_id: str
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    corrective_action: Optional[str] = None
    created_at: datetime
    updated_at: datetime
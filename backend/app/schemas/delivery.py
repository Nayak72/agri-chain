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
    status: str = "DELIVERED"


class DeliveryReportCreate(DeliveryReportBase):
    pass


class DeliveryReportResponse(BaseSchema, DeliveryReportBase):
    report_id: str
    created_at: datetime
    updated_at: datetime

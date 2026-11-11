from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from app.schemas.common import BaseSchema


class PurchaseOrderBase(BaseModel):
    seller_id: str
    produce_type: str
    batch_id: str
    requested_quantity_kg: float = Field(..., gt=0)
    unit_price_paise: int = Field(..., gt=0)
    preferred_delivery_date: date


class PurchaseOrderCreate(PurchaseOrderBase):
    pass


class PurchaseOrderResponse(BaseSchema, PurchaseOrderBase):
    buyer_id: str
    order_id: str
    unit_price_paise: int
    total_amount_paise: int
    status: str
    accepted_quantity_kg: float
    fulfilled_quantity_kg: float
    created_at: datetime
    updated_at: datetime
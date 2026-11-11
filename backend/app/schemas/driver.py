from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from app.schemas.common import BaseSchema


class DriverBase(BaseModel):
    transporter_id: str
    name: str = Field(...)
    phone: str
    city: str = Field(...)
    state: str = Field(...)


class DriverCreate(DriverBase):
    pass


class DriverUpdate(BaseModel):
    name: Optional[str] = Field(None)
    phone: Optional[str] = None
    city: Optional[str] = Field(None)
    state: Optional[str] = Field(None)
    status: Optional[str] = None
    current_assignment: Optional[str] = None


class DriverResponse(BaseSchema, DriverBase):
    driver_id: str
    status: str
    current_assignment: Optional[str] = None
    created_at: datetime
    updated_at: datetime
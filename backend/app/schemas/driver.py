from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from app.schemas.common import BaseSchema


class DriverBase(BaseModel):
    transporter_id: str
    name: str = Field(..., min_length=2, max_length=100)
    phone: str
    email: Optional[str] = None
    license_number: str = Field(..., min_length=5, max_length=20)
    license_expiry: date
    address: str = Field(..., min_length=5, max_length=200)
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    pincode: str = Field(..., pattern=r"^\d{6}$")
    experience_years: int = Field(0, ge=0)


class DriverCreate(DriverBase):
    pass


class DriverUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = None
    email: Optional[str] = None
    license_number: Optional[str] = Field(None, min_length=5, max_length=20)
    license_expiry: Optional[date] = None
    address: Optional[str] = Field(None, min_length=5, max_length=200)
    city: Optional[str] = Field(None, min_length=2, max_length=100)
    state: Optional[str] = Field(None, min_length=2, max_length=100)
    pincode: Optional[str] = Field(None, pattern=r"^\d{6}$")
    experience_years: Optional[int] = Field(None, ge=0)
    status: Optional[str] = None
    current_assignment: Optional[str] = None


class DriverResponse(BaseSchema, DriverBase):
    driver_id: str
    status: str
    current_assignment: Optional[str] = None
    created_at: datetime
    updated_at: datetime
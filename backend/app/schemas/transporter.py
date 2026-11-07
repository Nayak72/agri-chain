from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from app.schemas.common import BaseSchema


class TransporterBase(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=100)
    contact_person: str = Field(..., min_length=2, max_length=100)
    email: str
    phone: str
    address: str = Field(..., min_length=5, max_length=200)
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    pincode: str = Field(..., pattern=r"^\d{6}$")
    gst_number: Optional[str] = None
    license_number: Optional[str] = None
    bank_account: Optional[str] = None
    ifsc_code: Optional[str] = None


class TransporterCreate(TransporterBase):
    pass


class TransporterUpdate(BaseModel):
    company_name: Optional[str] = Field(None, min_length=2, max_length=100)
    contact_person: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = Field(None, min_length=5, max_length=200)
    city: Optional[str] = Field(None, min_length=2, max_length=100)
    state: Optional[str] = Field(None, min_length=2, max_length=100)
    pincode: Optional[str] = Field(None, pattern=r"^\d{6}$")
    gst_number: Optional[str] = None
    license_number: Optional[str] = None
    bank_account: Optional[str] = None
    ifsc_code: Optional[str] = None
    approval_status: Optional[str] = None
    is_active: Optional[bool] = None


class TransporterResponse(BaseSchema, TransporterBase):
    transporter_id: str
    user_id: Optional[str] = None
    approval_status: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
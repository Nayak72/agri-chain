from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from app.schemas.common import BaseSchema


class TransporterBase(BaseModel):
    company_name: str = Field(...)
    contact_person: str = Field(...)
    email: str
    phone: str
    address: str = Field(...)
    city: str = Field(...)
    state: str = Field(...)
    pincode: str = Field(...)
    gst_number: Optional[str] = None
    license_number: Optional[str] = None
    bank_account: Optional[str] = None
    ifsc_code: Optional[str] = None


class TransporterCreate(TransporterBase):
    pass


class TransporterUpdate(BaseModel):
    company_name: Optional[str] = Field(None)
    contact_person: Optional[str] = Field(None)
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = Field(None)
    city: Optional[str] = Field(None)
    state: Optional[str] = Field(None)
    pincode: Optional[str] = Field(None)
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
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from app.schemas.common import BaseSchema


class FarmBase(BaseModel):
    name: str = Field(...)
    city: str = Field(...)
    state: str = Field(...)
    pincode: str = Field(...)
    description: Optional[str] = None


class FarmCreate(FarmBase):
    pass


class FarmUpdate(BaseModel):
    name: Optional[str] = Field(None)
    city: Optional[str] = Field(None)
    state: Optional[str] = Field(None)
    pincode: Optional[str] = Field(None)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class FarmResponse(BaseSchema, FarmBase):
    farmer_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
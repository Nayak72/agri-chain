from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from app.schemas.common import BaseSchema


class FarmBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    address: str = Field(..., min_length=5, max_length=200)
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    pincode: str = Field(..., pattern=r"^\d{6}$")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area_hectares: Optional[float] = Field(None, gt=0)
    certifications: list = []
    description: Optional[str] = None


class FarmCreate(FarmBase):
    pass


class FarmUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    address: Optional[str] = Field(None, min_length=5, max_length=200)
    city: Optional[str] = Field(None, min_length=2, max_length=100)
    state: Optional[str] = Field(None, min_length=2, max_length=100)
    pincode: Optional[str] = Field(None, pattern=r"^\d{6}$")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area_hectares: Optional[float] = Field(None, gt=0)
    certifications: Optional[list] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class FarmResponse(BaseSchema, FarmBase):
    farmer_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
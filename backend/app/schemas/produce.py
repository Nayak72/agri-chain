from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from app.schemas.common import BaseSchema


class ProduceBase(BaseModel):
    produce_type: str
    name: str = Field(..., min_length=2, max_length=100)
    category: str
    unit: str = Field(..., min_length=1, max_length=20)
    description: Optional[str] = None


class ProduceCreate(ProduceBase):
    pass


class ProduceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    category: Optional[str] = None
    unit: Optional[str] = Field(None, min_length=1, max_length=20)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ProduceResponse(BaseSchema, ProduceBase):
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
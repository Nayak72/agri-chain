from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from app.schemas.common import BaseSchema


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(...)
    phone: Optional[str] = None
    role: str


class UserCreate(UserBase):
    password: str = Field(...)


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None)
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    is_approved: Optional[bool] = None


class UserResponse(BaseSchema, UserBase):
    is_active: bool
    is_approved: bool
    created_at: datetime
    updated_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

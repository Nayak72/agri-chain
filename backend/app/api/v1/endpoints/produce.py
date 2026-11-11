from typing import Optional, List
from datetime import datetime, timezone
import re
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, ConfigDict
from bson import ObjectId

from app.db.mongodb import get_database
from app.core.permissions import get_current_user, get_current_admin_user
from app.core.exceptions import NotFoundError, ValidationError, ConflictError
from app.core.constants import ProduceCategory, ProduceType
from app.schemas.common import Page
from app.utils.serialization import to_response
from app.utils.mongo import to_mongo, resolve_doc

router = APIRouter()


class ProduceCreate(BaseModel):
    produce_type: ProduceType
    name: str = Field(...)
    category: ProduceCategory
    unit: str = Field("kg")
    description: Optional[str] = Field(None)
    model_config = ConfigDict(extra="forbid")


class ProduceUpdate(BaseModel):
    name: Optional[str] = Field(None)
    category: Optional[ProduceCategory] = None
    unit: Optional[str] = Field(None)
    description: Optional[str] = Field(None)
    is_active: Optional[bool] = None
    model_config = ConfigDict(extra="forbid")


class ProduceResponse(BaseModel):
    id: str
    produce_type: ProduceType
    name: str
    category: ProduceCategory
    unit: str
    description: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@router.post("", response_model=ProduceResponse)
async def create_produce(
    produce_data: ProduceCreate,
    current_user: dict = Depends(get_current_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    type_val = produce_data.produce_type.value if hasattr(produce_data.produce_type, "value") else str(produce_data.produce_type)
    existing = await db.produce_catalogue.find_one({"produce_type": type_val})
    if existing:
        raise ConflictError(f"Produce type {type_val} already exists")
    
    now = datetime.now(timezone.utc)
    produce_doc = {
        **produce_data.model_dump(),
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    
    result = await db.produce_catalogue.insert_one(to_mongo(produce_doc))
    produce_doc["_id"] = result.inserted_id
    
    return to_response(ProduceResponse, produce_doc)


@router.get("", response_model=Page[ProduceResponse])
async def list_produce(
    category: Optional[ProduceCategory] = None,
    is_active: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1),
    q: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if category:
        query["category"] = category.value if hasattr(category, "value") else str(category)
    if is_active is not None:
        query["is_active"] = is_active
    if q:
        escaped_q = re.escape(q.strip())
        query["$or"] = [
            {"name": {"$regex": escaped_q, "$options": "i"}},
            {"produce_type": {"$regex": escaped_q.upper()}}
        ]
        
    total = await db.produce_catalogue.count_documents(query)
    produce = await db.produce_catalogue.find(query).sort("name", 1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    items = [to_response(ProduceResponse, p) for p in produce]
    return Page(items=items, total=total, page=page, page_size=page_size, has_next=page * page_size < total)


@router.get("/{produce_id}", response_model=ProduceResponse)
async def get_produce(
    produce_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    produce = await resolve_doc(db.produce_catalogue, produce_id, "Produce", business_key="produce_type")
    return to_response(ProduceResponse, produce)


@router.patch("/{produce_id}", response_model=ProduceResponse)
async def update_produce(
    produce_id: str,
    produce_data: ProduceUpdate,
    current_user: dict = Depends(get_current_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    produce = await resolve_doc(db.produce_catalogue, produce_id, "Produce", business_key="produce_type")
    
    update_data = produce_data.model_dump(exclude_unset=True)
    if not update_data:
        raise ValidationError("No valid fields to update")
    
    now = datetime.now(timezone.utc)
    update_data["updated_at"] = now
    
    await db.produce_catalogue.update_one(
        {"_id": produce["_id"]},
        {"$set": to_mongo(update_data)}
    )
    
    updated = await db.produce_catalogue.find_one({"_id": produce["_id"]})
    return to_response(ProduceResponse, updated)

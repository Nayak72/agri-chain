from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
from app.db.mongodb import get_database
from app.core.permissions import get_current_user, get_current_admin_user, Role
from app.core.exceptions import NotFoundError, ValidationError
from app.core.constants import ProduceCategory, ProduceType
from app.schemas.common import Page

router = APIRouter()


class ProduceCreate(BaseModel):
    produce_type: ProduceType
    name: str = Field(..., min_length=2, max_length=100)
    category: ProduceCategory
    unit: str = Field(..., min_length=1, max_length=20)
    description: Optional[str] = None


class ProduceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    category: Optional[ProduceCategory] = None
    unit: Optional[str] = Field(None, min_length=1, max_length=20)
    description: Optional[str] = None
    is_active: Optional[bool] = None


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
    existing = await db.produce_catalogue.find_one({"produce_type": produce_data.produce_type})
    if existing:
        raise ValidationError(f"Produce type {produce_data.produce_type} already exists")
    
    produce_doc = {
        **produce_data.model_dump(),
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    
    result = await db.produce_catalogue.insert_one(produce_doc)
    produce_doc["_id"] = result.inserted_id
    
    return ProduceResponse(id=str(result.inserted_id), **produce_doc)


@router.get("", response_model=Page[ProduceResponse])
async def list_produce(
    category: Optional[ProduceCategory] = None,
    is_active: Optional[bool] = True,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None, max_length=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if category:
        query["category"] = category
    if is_active is not None:
        query["is_active"] = is_active
    if q:
        import re
        query["$or"] = [{"name": {"$regex": re.escape(q), "$options": "i"}}, {"produce_type": {"$regex": re.escape(q.upper())}}]
    total = await db.produce_catalogue.count_documents(query)
    produce = await db.produce_catalogue.find(query).sort("name", 1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    items = []
    now = datetime.now(timezone.utc)
    for p in produce:
        doc = dict(p)
        doc_id = str(doc.pop("_id", doc.get("id", "")))
        doc.pop("id", None)
        doc.setdefault("created_at", now)
        doc.setdefault("updated_at", now)
        doc.setdefault("is_active", True)
        doc.setdefault("description", None)
        items.append(ProduceResponse(id=doc_id, **doc))
    return Page(items=items, total=total, page=page, page_size=page_size, has_next=page * page_size < total)


@router.get("/{produce_id}", response_model=ProduceResponse)
async def get_produce(
    produce_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    from app.repositories.produce_repository import ProduceRepository
    produce = await ProduceRepository(db).get_by_any_id(produce_id)
    if not produce:
        raise NotFoundError("Produce", produce_id)
    
    doc = dict(produce)
    doc_id = str(doc.pop("_id", doc.get("id", "")))
    doc.pop("id", None)
    now = datetime.now(timezone.utc)
    doc.setdefault("created_at", now)
    doc.setdefault("updated_at", now)
    doc.setdefault("is_active", True)
    doc.setdefault("description", None)
    return ProduceResponse(id=doc_id, **doc)


@router.patch("/{produce_id}", response_model=ProduceResponse)
async def update_produce(
    produce_id: str,
    produce_data: ProduceUpdate,
    current_user: dict = Depends(get_current_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    from app.repositories.produce_repository import ProduceRepository
    existing = await ProduceRepository(db).get_by_any_id(produce_id)
    if not existing:
        raise NotFoundError("Produce", produce_id)
    
    update_data = {k: v for k, v in produce_data.model_dump().items() if v is not None}
    if not update_data:
        raise ValidationError("No valid fields to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.produce_catalogue.update_one(
        {"_id": existing["_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise NotFoundError("Produce", produce_id)
    
    updated = await db.produce_catalogue.find_one({"_id": existing["_id"]})
    if not updated:
        raise NotFoundError("Produce", produce_id)
    doc = dict(updated)
    doc_id = str(doc.pop("_id", doc.get("id", "")))
    doc.pop("id", None)
    now = datetime.now(timezone.utc)
    doc.setdefault("created_at", now)
    doc.setdefault("updated_at", now)
    doc.setdefault("is_active", True)
    doc.setdefault("description", None)
    return ProduceResponse(id=doc_id, **doc)

from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
from app.db.mongodb import get_database
from app.core.permissions import get_current_user, Role
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError
from app.core.constants import UserRole
from app.utils.serialization import to_response
from app.services.ledger_service import (
    verify_ledger_integrity,
    verify_entity_history,
    get_entity_history,
    GENESIS_HASH,
    CHAIN_ID,
)

router = APIRouter()


class BlockResponse(BaseModel):
    id: str
    index: int
    block_id: str
    timestamp: datetime
    event_type: str
    entity_type: str
    entity_id: str
    actor_id: str
    actor_role: str
    event_summary: str
    payload_hash: str
    previous_hash: str
    hash: str
    hash_algorithm: str
    schema_version: str


@router.get("/blocks", response_model=List[BlockResponse])
async def get_ledger_blocks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort: str = Query("desc", pattern="^(asc|desc)$"),
    event_type: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    actor_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {"chain_id": CHAIN_ID}
    if event_type:
        query["event_type"] = event_type
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = str(entity_id)
    if actor_id:
        query["actor_id"] = str(actor_id)
    
    sort_dir = -1 if sort == "desc" else 1
    blocks = await db.ledger_blocks.find(query).sort("index", sort_dir).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [to_response(BlockResponse, b) for b in blocks]


@router.get("/blocks/{block_index}", response_model=BlockResponse)
async def get_ledger_block(
    block_index: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    block = await db.ledger_blocks.find_one({"chain_id": CHAIN_ID, "index": block_index})
    if not block:
        raise NotFoundError("Ledger Block", str(block_index))
    
    return to_response(BlockResponse, block)


@router.get("/verify")
async def verify_ledger(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] != UserRole.ADMIN:
        raise ForbiddenError("Only administrators can trigger full ledger verification")
    result = await verify_ledger_integrity(db)
    return result


@router.get("/verify/{entity_type}/{entity_id}")
async def verify_entity_ledger_history(
    entity_type: str,
    entity_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    result = await verify_entity_history(db, entity_type, entity_id)
    return result


@router.get("/entities/{entity_type}/{entity_id}")
async def get_entity_audit_history(
    entity_type: str,
    entity_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    history = await get_entity_history(db, entity_type, entity_id)
    return {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "total_events": len(history),
        "events": history,
    }


@router.get("/statistics")
async def get_ledger_statistics(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    total_blocks = await db.ledger_blocks.count_documents({"chain_id": CHAIN_ID})
    
    pipeline = [
        {"$group": {"_id": "$event_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    event_counts = await db.ledger_blocks.aggregate(pipeline).to_list(None)
    
    head = await db.ledger_heads.find_one({"chain_id": CHAIN_ID})
    
    return {
        "chain_id": CHAIN_ID,
        "total_blocks": total_blocks,
        "last_index": head.get("last_index", 0) if head else 0,
        "last_hash": head.get("last_hash", GENESIS_HASH) if head else GENESIS_HASH,
        "event_type_distribution": event_counts,
    }
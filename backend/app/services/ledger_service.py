import hashlib
import json
import asyncio
from datetime import date, datetime, timezone
from enum import Enum
from typing import Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorClientSession
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError
from bson import ObjectId
from app.core.config import get_settings
from app.core.constants import LedgerEventType
from app.core.exceptions import LedgerError
import logging

logger = logging.getLogger(__name__)

settings = get_settings()

GENESIS_HASH = "0" * 64
CHAIN_ID = settings.ledger_chain_id


def truncate_datetime_to_ms(dt: datetime) -> datetime:
    """Ensure datetime has millisecond precision matching MongoDB BSON storage."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    ms = (dt.microsecond // 1000) * 1000
    return dt.replace(microsecond=ms).astimezone(timezone.utc)


def canonical_json(data: Dict[str, Any]) -> str:
    def default_serializer(obj):
        if isinstance(obj, datetime):
            truncated = truncate_datetime_to_ms(obj)
            if truncated.microsecond == 0:
                return truncated.strftime("%Y-%m-%dT%H:%M:%SZ")
            return truncated.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
        if isinstance(obj, date):
            return obj.isoformat()
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, Enum):
            return obj.value
        if hasattr(obj, "__dict__"):
            return obj.__dict__
        raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
    
    return json.dumps(
        data,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        default=default_serializer
    )


def calculate_block_hash(block_data: Dict[str, Any]) -> str:
    hashable_data = {k: v for k, v in block_data.items() if k not in ("hash", "_id")}
    canonical = canonical_json(hashable_data)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


async def get_ledger_head(db: AsyncIOMotorDatabase, session: AsyncIOMotorClientSession = None) -> Dict[str, Any]:
    if session:
        head = await db.ledger_heads.find_one({"chain_id": CHAIN_ID}, session=session)
    else:
        head = await db.ledger_heads.find_one({"chain_id": CHAIN_ID})
    if not head:
        return {"chain_id": CHAIN_ID, "last_index": 0, "last_hash": GENESIS_HASH}
    return head


async def update_ledger_head(db: AsyncIOMotorDatabase, index: int, hash_value: str, session: AsyncIOMotorClientSession = None) -> None:
    update = {
        "$set": {
            "chain_id": CHAIN_ID,
            "last_index": index,
            "last_hash": hash_value,
            "updated_at": datetime.now(timezone.utc)
        }
    }
    if session:
        await db.ledger_heads.update_one({"chain_id": CHAIN_ID}, update, upsert=True, session=session)
    else:
        await db.ledger_heads.update_one({"chain_id": CHAIN_ID}, update, upsert=True)


async def append_ledger_block(
    db: AsyncIOMotorDatabase,
    event_type: LedgerEventType,
    entity_type: str,
    entity_id: str,
    actor_id: str,
    actor_role: str,
    event_summary: str,
    payload: Dict[str, Any],
    session: AsyncIOMotorClientSession = None
) -> Dict[str, Any]:
    norm_entity_id = str(entity_id) if entity_id is not None else ""
    event_type_val = event_type.value if hasattr(event_type, "value") else str(event_type)
    now_ms = truncate_datetime_to_ms(datetime.now(timezone.utc))

    payload_hash = hashlib.sha256(canonical_json(payload).encode("utf-8")).hexdigest()

    # If running within an explicit transaction session, use atomic find_one_and_update
    if session is not None:
        head = await db.ledger_heads.find_one({"chain_id": CHAIN_ID}, session=session)
        if not head:
            new_index = 1
            previous_hash = GENESIS_HASH
        else:
            new_index = head.get("last_index", 0) + 1
            previous_hash = head.get("last_hash", GENESIS_HASH)

        block_id = f"{CHAIN_ID}-{new_index:06d}"
        block_data = {
            "chain_id": CHAIN_ID,
            "index": new_index,
            "block_id": block_id,
            "timestamp": now_ms,
            "event_type": event_type_val,
            "entity_type": entity_type,
            "entity_id": norm_entity_id,
            "actor_id": str(actor_id),
            "actor_role": str(actor_role),
            "event_summary": event_summary,
            "payload_hash": payload_hash,
            "payload_snapshot": payload,
            "previous_hash": previous_hash,
            "hash_algorithm": "SHA-256",
            "schema_version": "1.0",
        }
        block_data["hash"] = calculate_block_hash(block_data)
        await db.ledger_blocks.insert_one(block_data, session=session)
        await update_ledger_head(db, new_index, block_data["hash"], session=session)
        logger.info(f"Ledger block {block_id} appended at index {new_index}")
        return block_data

    # Optimistic retry loop when transactions are not active
    for attempt in range(20):
        head = await db.ledger_heads.find_one({"chain_id": CHAIN_ID})
        if not head:
            new_index = 1
            previous_hash = GENESIS_HASH
        else:
            new_index = head.get("last_index", 0) + 1
            previous_hash = head.get("last_hash", GENESIS_HASH)

        block_id = f"{CHAIN_ID}-{new_index:06d}"
        block_data = {
            "chain_id": CHAIN_ID,
            "index": new_index,
            "block_id": block_id,
            "timestamp": now_ms,
            "event_type": event_type_val,
            "entity_type": entity_type,
            "entity_id": norm_entity_id,
            "actor_id": str(actor_id),
            "actor_role": str(actor_role),
            "event_summary": event_summary,
            "payload_hash": payload_hash,
            "payload_snapshot": payload,
            "previous_hash": previous_hash,
            "hash_algorithm": "SHA-256",
            "schema_version": "1.0",
        }
        block_data["hash"] = calculate_block_hash(block_data)
        try:
            await db.ledger_blocks.insert_one(block_data)
            await db.ledger_heads.update_one(
                {"chain_id": CHAIN_ID},
                {"$set": {"last_index": new_index, "last_hash": block_data["hash"], "updated_at": now_ms}},
                upsert=True
            )
            logger.info(f"Ledger block {block_id} appended at index {new_index}")
            return block_data
        except DuplicateKeyError:
            await asyncio.sleep(0.01)
            continue

    raise LedgerError("Failed to append ledger block after concurrent retry attempts")


async def verify_ledger_integrity(db: AsyncIOMotorDatabase) -> Dict[str, Any]:
    cursor = db.ledger_blocks.find({"chain_id": CHAIN_ID}).sort("index", 1)
    blocks = []
    async for block in cursor:
        blocks.append(block)

    if not blocks:
        return {
            "valid": True,
            "chain_id": CHAIN_ID,
            "total_blocks": 0,
            "verified_blocks": 0,
            "invalid_blocks": 0,
            "first_invalid_block": None,
            "message": "Ledger is empty (only genesis)"
        }
    
    expected_previous = GENESIS_HASH
    invalid_blocks = []
    
    for i, block in enumerate(blocks):
        if block["index"] != i + 1:
            invalid_blocks.append({
                "index": block["index"],
                "expected_index": i + 1,
                "error": "Index sequence broken"
            })
            break
        
        if block["previous_hash"] != expected_previous:
            invalid_blocks.append({
                "index": block["index"],
                "expected_previous_hash": expected_previous,
                "actual_previous_hash": block["previous_hash"],
                "error": "Previous hash mismatch"
            })
            break
        
        recalculated = calculate_block_hash(block)
        if block["hash"] != recalculated:
            invalid_blocks.append({
                "index": block["index"],
                "stored_hash": block["hash"],
                "recalculated_hash": recalculated,
                "error": "Hash mismatch - block data modified"
            })
            break

        if "payload_snapshot" in block:
            payload_hash = hashlib.sha256(canonical_json(block["payload_snapshot"]).encode("utf-8")).hexdigest()
            if payload_hash != block.get("payload_hash"):
                invalid_blocks.append({"index": block["index"], "error": "Payload snapshot hash mismatch"})
                break
        
        expected_previous = block["hash"]
    
    if invalid_blocks:
        first_invalid = invalid_blocks[0]
        affected_count = len(blocks) - first_invalid["index"] + 1
        return {
            "valid": False,
            "chain_id": CHAIN_ID,
            "total_blocks": len(blocks),
            "verified_blocks": first_invalid["index"] - 1,
            "invalid_blocks": affected_count,
            "first_invalid_block": first_invalid,
            "message": f"Ledger integrity check failed at block {first_invalid['index']}"
        }
    
    return {
        "valid": True,
        "chain_id": CHAIN_ID,
        "total_blocks": len(blocks),
        "verified_blocks": len(blocks),
        "invalid_blocks": 0,
        "first_invalid_block": None,
        "message": "Ledger integrity verified successfully"
    }


async def get_entity_history(
    db: AsyncIOMotorDatabase,
    entity_type: str,
    entity_id: str
) -> list:
    cursor = db.ledger_blocks.find({
        "chain_id": CHAIN_ID,
        "entity_type": entity_type,
        "entity_id": entity_id
    }).sort("index", 1)
    blocks = []
    async for block in cursor:
        blocks.append(block)
    
    return [{
        "index": b["index"],
        "block_id": b["block_id"],
        "timestamp": b["timestamp"],
        "event_type": b["event_type"],
        "actor_id": b["actor_id"],
        "actor_role": b["actor_role"],
        "event_summary": b["event_summary"],
        "hash": b["hash"],
    } for b in blocks]


async def verify_entity_history(
    db: AsyncIOMotorDatabase,
    entity_type: str,
    entity_id: str
) -> Dict[str, Any]:
    # First verify the integrity of the full global chain
    global_integrity = await verify_ledger_integrity(db)
    
    cursor = db.ledger_blocks.find({
        "chain_id": CHAIN_ID,
        "entity_type": entity_type,
        "entity_id": entity_id
    }).sort("index", 1)
    blocks = []
    async for block in cursor:
        blocks.append(block)
    
    if not blocks:
        return {
            "valid": True,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "blocks_checked": 0,
            "global_chain_valid": global_integrity["valid"],
            "message": "No ledger entries for this entity"
        }
    
    # Verify each entity block's content hash and its link to the previous global block
    invalid_blocks = []
    for block in blocks:
        # Check recalculation of content hash
        recalculated = calculate_block_hash(block)
        if block["hash"] != recalculated:
            invalid_blocks.append({
                "index": block["index"],
                "block_id": block["block_id"],
                "error": "Block data has been modified (hash mismatch)"
            })
            continue
        
        # Verify block's link into the global chain
        if block["index"] > 1:
            preceding_block = await db.ledger_blocks.find_one({
                "chain_id": CHAIN_ID,
                "index": block["index"] - 1
            })
            if not preceding_block or preceding_block["hash"] != block["previous_hash"]:
                invalid_blocks.append({
                    "index": block["index"],
                    "block_id": block["block_id"],
                    "error": "Previous hash link in global chain is broken"
                })
        elif block["index"] == 1:
            if block["previous_hash"] != GENESIS_HASH:
                invalid_blocks.append({
                    "index": block["index"],
                    "block_id": block["block_id"],
                    "error": "Genesis block does not link to GENESIS_HASH"
                })
    
    is_valid = global_integrity["valid"] and len(invalid_blocks) == 0
    
    return {
        "valid": is_valid,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "blocks_checked": len(blocks),
        "global_chain_valid": global_integrity["valid"],
        "invalid_blocks": invalid_blocks,
        "message": f"Entity history verified: {len(blocks)} blocks ({'VALID' if is_valid else 'COMPROMISED'})"
    }

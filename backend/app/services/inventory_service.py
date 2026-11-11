"""Atomic stock operations for the single inventory counter."""
from datetime import datetime, timezone
from bson import ObjectId
from app.core.exceptions import InsufficientStockError, ConflictError


async def reserve_stock(db, inv_id: str, qty: float, session):
    if qty <= 0:
        raise ValueError("Quantity must be positive")
    result = await db.inventory_items.update_one(
        {"_id": ObjectId(inv_id), "available_kg": {"$gte": qty}},
        {"$inc": {"available_kg": -qty}, "$set": {"updated_at": datetime.now(timezone.utc)}},
        session=session,
    )
    if result.modified_count != 1:
        current = await db.inventory_items.find_one({"_id": ObjectId(inv_id)}, session=session)
        raise InsufficientStockError(float(current.get("available_kg", 0)) if current else 0, qty)


async def release_stock(db, inv_id: str, qty: float, session):
    if qty <= 0:
        raise ValueError("Quantity must be positive")
    result = await db.inventory_items.update_one(
        {"_id": ObjectId(inv_id), "$expr": {"$lte": [{"$add": ["$available_kg", qty]}, "$accepted_kg"]}},
        {"$inc": {"available_kg": qty}, "$set": {"updated_at": datetime.now(timezone.utc)}},
        session=session,
    )
    if result.modified_count != 1:
        raise ConflictError("Stock release would exceed accepted quantity")

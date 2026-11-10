"""
Authoritative Inventory Service enforcing the conservation invariant:
Received Total = Available + Reserved + Dispatched + Delivered + Damaged + Rejected
"""
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorClientSession
from app.core.exceptions import InsufficientStockError, ValidationError, NotFoundError
from app.core.constants import LedgerEventType, InventoryStatus
from app.services.ledger_service import append_ledger_block
from app.utils.mongo import to_mongo, resolve_doc
import uuid


def assert_inventory_invariant(item: dict) -> None:
    received = round(float(item.get("received_total_kg", item.get("quantity_kg", 0.0))), 2)
    available = round(float(item.get("available_quantity_kg", item.get("quantity_kg", 0.0))), 2)
    reserved = round(float(item.get("reserved_quantity_kg", 0.0)), 2)
    dispatched = round(float(item.get("dispatched_quantity_kg", 0.0)), 2)
    delivered = round(float(item.get("delivered_quantity_kg", 0.0)), 2)
    damaged = round(float(item.get("damaged_quantity_kg", 0.0)), 2)
    rejected = round(float(item.get("rejected_quantity_kg", 0.0)), 2)

    buckets_sum = round(available + reserved + dispatched + delivered + damaged + rejected, 2)
    if abs(received - buckets_sum) > 0.02:
        raise ValidationError(
            f"Inventory conservation invariant violated: received={received} != buckets={buckets_sum} "
            f"(avail={available}, res={reserved}, disp={dispatched}, deliv={delivered}, dam={damaged}, rej={rejected})"
        )


async def reserve_stock(
    db: AsyncIOMotorDatabase,
    inventory_id: str,
    quantity_kg: float,
    actor_id: str,
    actor_role: str,
    reference_id: Optional[str] = None,
    session: Optional[AsyncIOMotorClientSession] = None,
) -> dict:
    if quantity_kg <= 0:
        raise ValidationError("Quantity to reserve must be greater than 0")

    inv = await resolve_doc(db.inventory_items, inventory_id, "Inventory Item", session=session)
    available = float(inv.get("available_quantity_kg", inv.get("quantity_kg", 0.0)))

    now = datetime.now(timezone.utc)
    res = await db.inventory_items.update_one(
        {
            "_id": inv["_id"],
            "$or": [
                {"available_quantity_kg": {"$gte": quantity_kg}},
                {"available_quantity_kg": {"$exists": False}, "quantity_kg": {"$gte": quantity_kg}},
            ]
        },
        {
            "$inc": {"available_quantity_kg": -quantity_kg, "reserved_quantity_kg": quantity_kg},
            "$set": {"updated_at": now}
        },
        session=session
    )
    if res.modified_count == 0:
        raise InsufficientStockError(available=available, requested=quantity_kg)

    mov_id = f"IM-{uuid.uuid4().hex[:10].upper()}"
    mov_doc = {
        "movement_id": mov_id,
        "inventory_id": str(inv["_id"]),
        "batch_id": inv["batch_id"],
        "movement_type": "RESERVE",
        "quantity_kg": quantity_kg,
        "reference_id": reference_id,
        "reference_type": "PURCHASE_ORDER",
        "created_by": actor_id,
        "created_at": now,
    }
    await db.inventory_movements.insert_one(to_mongo(mov_doc), session=session)
    updated = await db.inventory_items.find_one({"_id": inv["_id"]}, session=session)
    assert_inventory_invariant(updated)
    return updated


async def release_stock(
    db: AsyncIOMotorDatabase,
    inventory_id: str,
    quantity_kg: float,
    actor_id: str,
    actor_role: str,
    reference_id: Optional[str] = None,
    session: Optional[AsyncIOMotorClientSession] = None,
) -> dict:
    if quantity_kg <= 0:
        raise ValidationError("Quantity to release must be greater than 0")

    inv = await resolve_doc(db.inventory_items, inventory_id, "Inventory Item", session=session)
    reserved = float(inv.get("reserved_quantity_kg", 0.0))

    now = datetime.now(timezone.utc)
    res = await db.inventory_items.update_one(
        {"_id": inv["_id"], "reserved_quantity_kg": {"$gte": quantity_kg}},
        {
            "$inc": {"reserved_quantity_kg": -quantity_kg, "available_quantity_kg": quantity_kg},
            "$set": {"updated_at": now}
        },
        session=session
    )
    if res.modified_count == 0:
        raise ValidationError(f"Cannot release {quantity_kg}kg; only {reserved}kg is reserved")

    mov_id = f"IM-{uuid.uuid4().hex[:10].upper()}"
    mov_doc = {
        "movement_id": mov_id,
        "inventory_id": str(inv["_id"]),
        "batch_id": inv["batch_id"],
        "movement_type": "RELEASE",
        "quantity_kg": quantity_kg,
        "reference_id": reference_id,
        "reference_type": "PURCHASE_ORDER",
        "created_by": actor_id,
        "created_at": now,
    }
    await db.inventory_movements.insert_one(to_mongo(mov_doc), session=session)
    updated = await db.inventory_items.find_one({"_id": inv["_id"]}, session=session)
    assert_inventory_invariant(updated)
    return updated


async def dispatch_stock(
    db: AsyncIOMotorDatabase,
    inventory_id: str,
    quantity_kg: float,
    actor_id: str,
    actor_role: str,
    reference_id: Optional[str] = None,
    from_reserved: bool = True,
    session: Optional[AsyncIOMotorClientSession] = None,
) -> dict:
    if quantity_kg <= 0:
        raise ValidationError("Quantity to dispatch must be greater than 0")

    inv = await resolve_doc(db.inventory_items, inventory_id, "Inventory Item", session=session)
    now = datetime.now(timezone.utc)

    if from_reserved:
        filter_query = {"_id": inv["_id"], "reserved_quantity_kg": {"$gte": quantity_kg}}
        inc_doc = {"reserved_quantity_kg": -quantity_kg, "dispatched_quantity_kg": quantity_kg}
    else:
        filter_query = {"_id": inv["_id"], "available_quantity_kg": {"$gte": quantity_kg}}
        inc_doc = {"available_quantity_kg": -quantity_kg, "dispatched_quantity_kg": quantity_kg}

    res = await db.inventory_items.update_one(
        filter_query,
        {
            "$inc": inc_doc,
            "$set": {"updated_at": now, "status": InventoryStatus.DISPATCHED.value}
        },
        session=session
    )
    if res.modified_count == 0:
        pool = "reserved" if from_reserved else "available"
        raise InsufficientStockError(available=inv.get(f"{pool}_quantity_kg", 0.0), requested=quantity_kg)

    # Sync batch dispatched count
    await db.produce_batches.update_one(
        {"_id": ObjectId(inv["batch_id"]) if ObjectId.is_valid(inv["batch_id"]) else inv["batch_id"]},
        {"$inc": {"dispatched_quantity_kg": quantity_kg}, "$set": {"updated_at": now}},
        session=session
    )

    mov_id = f"IM-{uuid.uuid4().hex[:10].upper()}"
    mov_doc = {
        "movement_id": mov_id,
        "inventory_id": str(inv["_id"]),
        "batch_id": inv["batch_id"],
        "movement_type": "DISPATCH",
        "quantity_kg": quantity_kg,
        "reference_id": reference_id,
        "reference_type": "SHIPMENT",
        "created_by": actor_id,
        "created_at": now,
    }
    await db.inventory_movements.insert_one(to_mongo(mov_doc), session=session)
    updated = await db.inventory_items.find_one({"_id": inv["_id"]}, session=session)
    assert_inventory_invariant(updated)
    return updated


async def deliver_stock(
    db: AsyncIOMotorDatabase,
    inventory_id: str,
    delivered_kg: float,
    returned_reusable_kg: float = 0.0,
    returned_damaged_kg: float = 0.0,
    returned_rejected_kg: float = 0.0,
    actor_id: str = "SYSTEM",
    actor_role: str = "SYSTEM",
    reference_id: Optional[str] = None,
    session: Optional[AsyncIOMotorClientSession] = None,
) -> dict:
    if delivered_kg < 0 or returned_reusable_kg < 0 or returned_damaged_kg < 0 or returned_rejected_kg < 0:
        raise ValidationError("Delivered and returned quantities must be non-negative")

    total_settled = round(delivered_kg + returned_reusable_kg + returned_damaged_kg + returned_rejected_kg, 3)
    if total_settled <= 0:
        raise ValidationError("Total settled quantity (delivered + returns) must be greater than 0")

    inv = await resolve_doc(db.inventory_items, inventory_id, "Inventory Item", session=session)
    dispatched = round(float(inv.get("dispatched_quantity_kg", 0.0)), 3)

    if total_settled > dispatched + 0.02:
        raise ValidationError(
            f"Cannot deliver/return {total_settled}kg; only {dispatched}kg is in transit/dispatched"
        )

    now = datetime.now(timezone.utc)
    inc_doc = {"dispatched_quantity_kg": -total_settled}
    if delivered_kg > 0:
        inc_doc["delivered_quantity_kg"] = delivered_kg
    if returned_reusable_kg > 0:
        inc_doc["available_quantity_kg"] = returned_reusable_kg
    if returned_damaged_kg > 0:
        inc_doc["damaged_quantity_kg"] = returned_damaged_kg
    if returned_rejected_kg > 0:
        inc_doc["rejected_quantity_kg"] = returned_rejected_kg

    res = await db.inventory_items.update_one(
        {"_id": inv["_id"], "dispatched_quantity_kg": {"$gte": total_settled - 0.02}},
        {
            "$inc": inc_doc,
            "$set": {"updated_at": now, "status": InventoryStatus.DELIVERED.value if hasattr(InventoryStatus, "DELIVERED") else "DELIVERED"}
        },
        session=session
    )
    if res.modified_count == 0:
        raise ValidationError(f"Cannot settle {total_settled}kg against dispatched stock {dispatched}kg")

    if delivered_kg > 0:
        await db.inventory_movements.insert_one(to_mongo({
            "movement_id": f"IM-{uuid.uuid4().hex[:10].upper()}",
            "inventory_id": str(inv["_id"]),
            "batch_id": inv["batch_id"],
            "movement_type": "DELIVER",
            "quantity_kg": delivered_kg,
            "reference_id": reference_id,
            "reference_type": "SHIPMENT",
            "created_by": actor_id,
            "created_at": now,
        }), session=session)

    if returned_reusable_kg > 0:
        await db.inventory_movements.insert_one(to_mongo({
            "movement_id": f"IM-{uuid.uuid4().hex[:10].upper()}",
            "inventory_id": str(inv["_id"]),
            "batch_id": inv["batch_id"],
            "movement_type": "RETURN_REUSABLE",
            "quantity_kg": returned_reusable_kg,
            "reference_id": reference_id,
            "reference_type": "SHIPMENT_RETURN",
            "created_by": actor_id,
            "created_at": now,
        }), session=session)

    if returned_damaged_kg > 0:
        await db.inventory_movements.insert_one(to_mongo({
            "movement_id": f"IM-{uuid.uuid4().hex[:10].upper()}",
            "inventory_id": str(inv["_id"]),
            "batch_id": inv["batch_id"],
            "movement_type": "RETURN_DAMAGED",
            "quantity_kg": returned_damaged_kg,
            "reference_id": reference_id,
            "reference_type": "SHIPMENT_RETURN",
            "created_by": actor_id,
            "created_at": now,
        }), session=session)

    if returned_rejected_kg > 0:
        await db.inventory_movements.insert_one(to_mongo({
            "movement_id": f"IM-{uuid.uuid4().hex[:10].upper()}",
            "inventory_id": str(inv["_id"]),
            "batch_id": inv["batch_id"],
            "movement_type": "RETURN_REJECTED",
            "quantity_kg": returned_rejected_kg,
            "reference_id": reference_id,
            "reference_type": "SHIPMENT_RETURN",
            "created_by": actor_id,
            "created_at": now,
        }), session=session)

    updated = await db.inventory_items.find_one({"_id": inv["_id"]}, session=session)
    assert_inventory_invariant(updated)
    return updated


async def reconcile_loading_discrepancy(
    db: AsyncIOMotorDatabase,
    inventory_id: str,
    reserved_kg: float,
    actual_loaded_kg: float,
    actor_id: str,
    actor_role: str,
    reference_id: Optional[str] = None,
    session: Optional[AsyncIOMotorClientSession] = None,
) -> dict:
    """
    If actual loaded quantity is less than reserved quantity, release the unused
    reservation back to available stock.
    """
    if actual_loaded_kg >= reserved_kg:
        return await resolve_doc(db.inventory_items, inventory_id, "Inventory Item", session=session)

    excess_kg = round(reserved_kg - actual_loaded_kg, 3)
    if excess_kg <= 0:
        return await resolve_doc(db.inventory_items, inventory_id, "Inventory Item", session=session)

    return await release_stock(
        db, inventory_id, excess_kg,
        actor_id=actor_id, actor_role=actor_role,
        reference_id=reference_id,
        session=session
    )


async def return_stock(
    db: AsyncIOMotorDatabase,
    inventory_id: str,
    quantity_kg: float,
    condition: str,  # REUSABLE, DAMAGED, REJECTED
    actor_id: str,
    actor_role: str,
    reference_id: Optional[str] = None,
    session: Optional[AsyncIOMotorClientSession] = None,
) -> dict:
    if quantity_kg <= 0:
        raise ValidationError("Returned quantity must be greater than 0")

    inv = await resolve_doc(db.inventory_items, inventory_id, "Inventory Item", session=session)
    now = datetime.now(timezone.utc)

    if condition == "REUSABLE":
        inc_target = "available_quantity_kg"
    elif condition == "DAMAGED":
        inc_target = "damaged_quantity_kg"
    elif condition == "REJECTED":
        inc_target = "rejected_quantity_kg"
    else:
        raise ValidationError(f"Invalid return condition '{condition}'; must be REUSABLE, DAMAGED, or REJECTED")

    res = await db.inventory_items.update_one(
        {"_id": inv["_id"], "dispatched_quantity_kg": {"$gte": quantity_kg}},
        {
            "$inc": {"dispatched_quantity_kg": -quantity_kg, inc_target: quantity_kg},
            "$set": {"updated_at": now}
        },
        session=session
    )
    if res.modified_count == 0:
        dispatched = float(inv.get("dispatched_quantity_kg", 0.0))
        raise ValidationError(f"Cannot return {quantity_kg}kg; only {dispatched}kg is currently dispatched")

    mov_id = f"IM-{uuid.uuid4().hex[:10].upper()}"
    mov_doc = {
        "movement_id": mov_id,
        "inventory_id": str(inv["_id"]),
        "batch_id": inv["batch_id"],
        "movement_type": f"RETURN_{condition}",
        "quantity_kg": quantity_kg,
        "reference_id": reference_id,
        "reference_type": "SHIPMENT_RETURN",
        "created_by": actor_id,
        "created_at": now,
    }
    await db.inventory_movements.insert_one(to_mongo(mov_doc), session=session)
    updated = await db.inventory_items.find_one({"_id": inv["_id"]}, session=session)
    assert_inventory_invariant(updated)
    return updated

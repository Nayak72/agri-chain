"""
Shipment Workflow State Machine and Lifecycle Orchestration.
Single source of truth for shipment lifecycle transitions, resource locking/release,
inventory settlement, and sensor session teardown.
"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorClientSession

from app.core.constants import ShipmentStatus, LedgerEventType, FreightBookingStatus, UserRole
from app.core.exceptions import InvalidStateTransitionError, ValidationError, ForbiddenError, NotFoundError
from app.services.ledger_service import append_ledger_block
from app.services.inventory_service import deliver_stock, return_stock, release_stock
from app.services.outbox import schedule_outbox_event, OutboxEventType
from app.utils.mongo import to_mongo, resolve_doc
import logging

logger = logging.getLogger(__name__)

# Single source of truth for allowed state transitions
ALLOWED_TRANSITIONS: Dict[str, List[str]] = {
    "BOOKING_REQUESTED": ["BOOKING_CONFIRMED", "CANCELLED"],
    "BOOKING_CONFIRMED": ["VEHICLE_ASSIGNED", "CANCELLED"],
    "VEHICLE_ASSIGNED": ["DRIVER_ASSIGNED", "CANCELLED"],
    "DRIVER_ASSIGNED": ["LOADING", "LOADED", "CANCELLED"],
    "LOADING": ["LOADED", "CANCELLED"],
    "LOADED": ["DISPATCHED", "CANCELLED"],
    "DISPATCHED": ["IN_TRANSIT", "CANCELLED"],
    "IN_TRANSIT": ["AT_CHECKPOINT", "DELAYED", "ARRIVED_AT_DESTINATION", "CANCELLED"],
    "AT_CHECKPOINT": ["IN_TRANSIT", "DELAYED", "ARRIVED_AT_DESTINATION", "CANCELLED"],
    "DELAYED": ["IN_TRANSIT", "ARRIVED_AT_DESTINATION", "CANCELLED"],
    "ARRIVED_AT_DESTINATION": ["OUT_FOR_DELIVERY", "CANCELLED"],
    "OUT_FOR_DELIVERY": ["DELIVERED", "PARTIALLY_DELIVERED", "DELIVERY_FAILED", "DELIVERY_REJECTED", "CANCELLED"],
    "DELIVERED": [],
    "PARTIALLY_DELIVERED": [],
    "DELIVERY_FAILED": [],
    "DELIVERY_REJECTED": [],
    "CANCELLED": [],
}


def assert_valid_transition(current_state: str, target_state: str) -> None:
    allowed = ALLOWED_TRANSITIONS.get(current_state, [])
    if target_state not in allowed:
        raise InvalidStateTransitionError(current_state=current_state, target_state=target_state)


async def transition_shipment(
    db: AsyncIOMotorDatabase,
    shipment_id: str,
    target_status: str,
    actor_id: str,
    actor_role: str,
    session: Optional[AsyncIOMotorClientSession] = None,
    extra_updates: Optional[Dict[str, Any]] = None,
    event_summary: Optional[str] = None,
) -> dict:
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id", session=session)
    current_status = shipment.get("status")
    if hasattr(current_status, "value"):
        current_status = current_status.value

    assert_valid_transition(current_status, target_status)

    now = datetime.now(timezone.utc)
    updates = {
        "status": target_status,
        "updated_at": now,
    }
    if extra_updates:
        updates.update(extra_updates)

    await db.shipments.update_one(
        {"_id": shipment["_id"]},
        {"$set": to_mongo(updates)},
        session=session
    )

    ledger_event = {
        "IN_TRANSIT": LedgerEventType.SHIPMENT_IN_TRANSIT if hasattr(LedgerEventType, "SHIPMENT_IN_TRANSIT") else "SHIPMENT_IN_TRANSIT",
        "AT_CHECKPOINT": LedgerEventType.CHECKPOINT_RECORDED,
        "ARRIVED_AT_DESTINATION": LedgerEventType.SHIPMENT_ARRIVED if hasattr(LedgerEventType, "SHIPMENT_ARRIVED") else "SHIPMENT_ARRIVED",
        "OUT_FOR_DELIVERY": LedgerEventType.SHIPMENT_OUT_FOR_DELIVERY if hasattr(LedgerEventType, "SHIPMENT_OUT_FOR_DELIVERY") else "SHIPMENT_OUT_FOR_DELIVERY",
        "CANCELLED": LedgerEventType.SHIPMENT_CANCELLED if hasattr(LedgerEventType, "SHIPMENT_CANCELLED") else "SHIPMENT_CANCELLED",
    }.get(target_status, LedgerEventType.SHIPMENT_UPDATED if hasattr(LedgerEventType, "SHIPMENT_UPDATED") else "SHIPMENT_UPDATED")

    summary = event_summary or f"Shipment {shipment.get('shipment_id')} transitioned to {target_status}"
    await append_ledger_block(
        db,
        event_type=ledger_event,
        entity_type="SHIPMENT",
        entity_id=str(shipment["_id"]),
        actor_id=actor_id,
        actor_role=actor_role,
        event_summary=summary,
        payload={"from_status": current_status, "to_status": target_status},
        session=session
    )

    updated = await db.shipments.find_one({"_id": shipment["_id"]}, session=session)

    if target_status == "IN_TRANSIT":
        await schedule_outbox_event(
            db, OutboxEventType.START_SENSOR_SIMULATION,
            {"shipment_id": str(shipment["_id"])},
            session=session
        )

    return updated


async def finalize_shipment(
    db: AsyncIOMotorDatabase,
    shipment: dict,
    outcome: str,  # DELIVERED, PARTIALLY_DELIVERED, DELIVERY_REJECTED
    actor_id: str,
    actor_role: str,
    delivered_qty: float,
    returned_reusable_qty: float = 0.0,
    returned_damaged_qty: float = 0.0,
    returned_rejected_qty: float = 0.0,
    damaged_qty: Optional[float] = None,
    missing_qty: Optional[float] = None,
    session: Optional[AsyncIOMotorClientSession] = None,
) -> dict:
    current_status = shipment.get("status")
    if hasattr(current_status, "value"):
        current_status = current_status.value

    # DELIVERY FINALIZATION MUST OCCUR ONLY FROM OUT_FOR_DELIVERY
    if current_status != "OUT_FOR_DELIVERY":
        raise ValidationError(
            f"Delivery finalization must occur from OUT_FOR_DELIVERY state only (current state: {current_status})"
        )

    # Backward compatibility with damaged_qty / missing_qty
    if damaged_qty is not None and returned_damaged_qty == 0.0:
        returned_damaged_qty = damaged_qty
    if missing_qty is not None and returned_rejected_qty == 0.0:
        returned_rejected_qty = missing_qty

    cargo_weight = float(shipment.get("total_cargo_weight_kg", shipment.get("cargo_quantity_kg", 0.0)))
    if outcome == "DELIVERED" and returned_reusable_qty == 0 and returned_damaged_qty == 0 and returned_rejected_qty == 0:
        delivered_qty = delivered_qty or cargo_weight
    elif outcome == "DELIVERY_REJECTED" and (returned_reusable_qty + returned_damaged_qty + returned_rejected_qty == 0):
        returned_rejected_qty = cargo_weight

    total_settled = round(delivered_qty + returned_reusable_qty + returned_damaged_qty + returned_rejected_qty, 3)
    if cargo_weight > 0 and abs(total_settled - cargo_weight) > 0.02:
        raise ValidationError(
            f"Dispatched quantity ({cargo_weight}kg) must equal delivered ({delivered_qty}kg) + "
            f"reusable ({returned_reusable_qty}kg) + damaged ({returned_damaged_qty}kg) + rejected ({returned_rejected_qty}kg)"
        )

    now = datetime.now(timezone.utc)
    canonical_id = str(shipment["_id"])

    # 1. Update shipment state
    await db.shipments.update_one(
        {"_id": shipment["_id"]},
        {"$set": {
            "status": outcome,
            "actual_arrival_time": now,
            "delivered_quantity_kg": delivered_qty,
            "returned_reusable_quantity_kg": returned_reusable_qty,
            "damaged_quantity_kg": returned_damaged_qty,
            "missing_quantity_kg": returned_rejected_qty,
            "updated_at": now
        }},
        session=session
    )

    # 2. Release assigned vehicle to AVAILABLE (only if assigned to this shipment)
    vehicle_id = shipment.get("vehicle_id")
    if vehicle_id:
        v_query = {
            "$or": [{"current_assignment": canonical_id}, {"current_assignment": None}],
            **({"_id": ObjectId(vehicle_id)} if ObjectId.is_valid(vehicle_id) else {"vehicle_id": vehicle_id})
        }
        await db.vehicles.update_one(
            v_query,
            {"$set": {"status": "AVAILABLE", "current_assignment": None, "updated_at": now}},
            session=session
        )

    # 3. Release assigned driver to AVAILABLE (only if assigned to this shipment)
    driver_id = shipment.get("driver_id")
    if driver_id:
        d_query = {
            "$or": [{"current_assignment": canonical_id}, {"current_assignment": None}],
            **({"_id": ObjectId(driver_id)} if ObjectId.is_valid(driver_id) else {"driver_id": driver_id})
        }
        await db.drivers.update_one(
            d_query,
            {"$set": {"status": "AVAILABLE", "current_assignment": None, "updated_at": now}},
            session=session
        )

    # 4. Teardown / stop active sensor simulation session
    await db.sensor_sessions.update_many(
        {"shipment_id": canonical_id, "status": "ACTIVE"},
        {"$set": {"status": "STOPPED", "ended_at": now, "updated_at": now}},
        session=session
    )
    await schedule_outbox_event(
        db, OutboxEventType.STOP_SENSOR_SIMULATION,
        {"shipment_id": canonical_id},
        session=session
    )

    # 5. Fulfill Purchase Order
    po_id = shipment.get("purchase_order_id")
    if po_id:
        po_query = {"_id": ObjectId(po_id)} if ObjectId.is_valid(po_id) else {"order_id": po_id}
        po_status = "FULFILLED" if outcome in ["DELIVERED", "PARTIALLY_DELIVERED"] else "FAILED"
        await db.purchase_orders.update_one(
            po_query,
            {"$set": {
                "status": po_status,
                "fulfilled_quantity_kg": delivered_qty,
                "updated_at": now
            }},
            session=session
        )

    # 6. Settle inventory buckets
    batch_ids = shipment.get("batch_ids", [])
    num_batches = len(batch_ids) if batch_ids else 1
    for b_id in batch_ids:
        inv = await db.inventory_items.find_one({"batch_id": b_id}, session=session)
        if inv:
            inv_id = str(inv["_id"])
            disp_in_inv = float(inv.get("dispatched_quantity_kg", 0.0))
            ratio = (disp_in_inv / cargo_weight) if cargo_weight > 0 else (1.0 / num_batches)
            b_deliv = round(min(delivered_qty * ratio, disp_in_inv), 3)
            b_reusable = round(returned_reusable_qty * ratio, 3)
            b_damaged = round(returned_damaged_qty * ratio, 3)
            b_rejected = round(returned_rejected_qty * ratio, 3)

            try:
                await deliver_stock(
                    db, inv_id,
                    delivered_kg=b_deliv,
                    returned_reusable_kg=b_reusable,
                    returned_damaged_kg=b_damaged,
                    returned_rejected_kg=b_rejected,
                    actor_id=actor_id,
                    actor_role=actor_role,
                    reference_id=canonical_id,
                    session=session
                )
            except Exception as e:
                logger.warning(f"Could not settle delivery stock for {inv_id}: {e}")

    # 7. Record in ledger
    await append_ledger_block(
        db,
        event_type=LedgerEventType.DELIVERY_RECORDED,
        entity_type="SHIPMENT",
        entity_id=canonical_id,
        actor_id=actor_id,
        actor_role=actor_role,
        event_summary=f"Delivery finalized for shipment {shipment.get('shipment_id')} with outcome {outcome}",
        payload={
            "outcome": outcome,
            "delivered_quantity_kg": delivered_qty,
            "returned_reusable_quantity_kg": returned_reusable_qty,
            "damaged_quantity_kg": returned_damaged_qty,
            "missing_quantity_kg": returned_rejected_qty,
        },
        session=session
    )

    return await db.shipments.find_one({"_id": shipment["_id"]}, session=session)


async def cancel_shipment(
    db: AsyncIOMotorDatabase,
    shipment: dict,
    actor_id: str,
    actor_role: str,
    reason: str = "User cancelled",
    session: Optional[AsyncIOMotorClientSession] = None,
) -> dict:
    current_status = shipment.get("status")
    if hasattr(current_status, "value"):
        current_status = current_status.value

    terminal = ["DELIVERED", "PARTIALLY_DELIVERED", "DELIVERY_FAILED", "DELIVERY_REJECTED", "CANCELLED"]
    if current_status in terminal:
        raise ValidationError(f"Cannot cancel shipment in terminal status {current_status}")

    now = datetime.now(timezone.utc)
    canonical_id = str(shipment["_id"])

    # 1. Update shipment to CANCELLED
    await db.shipments.update_one(
        {"_id": shipment["_id"]},
        {"$set": {"status": "CANCELLED", "cancellation_reason": reason, "updated_at": now}},
        session=session
    )

    # 2. Release vehicle (prevent double-releasing)
    vehicle_id = shipment.get("vehicle_id")
    if vehicle_id:
        v_query = {
            "$or": [{"current_assignment": canonical_id}, {"current_assignment": None}],
            **({"_id": ObjectId(vehicle_id)} if ObjectId.is_valid(vehicle_id) else {"vehicle_id": vehicle_id})
        }
        await db.vehicles.update_one(
            v_query,
            {"$set": {"status": "AVAILABLE", "current_assignment": None, "updated_at": now}},
            session=session
        )

    # 3. Release driver (prevent double-releasing)
    driver_id = shipment.get("driver_id")
    if driver_id:
        d_query = {
            "$or": [{"current_assignment": canonical_id}, {"current_assignment": None}],
            **({"_id": ObjectId(driver_id)} if ObjectId.is_valid(driver_id) else {"driver_id": driver_id})
        }
        await db.drivers.update_one(
            d_query,
            {"$set": {"status": "AVAILABLE", "current_assignment": None, "updated_at": now}},
            session=session
        )

    # 4. Teardown active sensor session
    await db.sensor_sessions.update_many(
        {"shipment_id": canonical_id, "status": "ACTIVE"},
        {"$set": {"status": "STOPPED", "ended_at": now, "updated_at": now}},
        session=session
    )
    await schedule_outbox_event(
        db, OutboxEventType.STOP_SENSOR_SIMULATION,
        {"shipment_id": canonical_id},
        session=session
    )

    # 5. Inventory reconciliation
    cargo_weight = float(shipment.get("total_cargo_weight_kg", shipment.get("cargo_quantity_kg", 0.0)))
    was_dispatched = current_status in ["DISPATCHED", "IN_TRANSIT", "AT_CHECKPOINT", "DELAYED", "ARRIVED_AT_DESTINATION", "OUT_FOR_DELIVERY"]

    for b_id in shipment.get("batch_ids", []):
        inv = await db.inventory_items.find_one({"batch_id": b_id}, session=session)
        if inv:
            inv_id = str(inv["_id"])
            if was_dispatched:
                disp_in_inv = float(inv.get("dispatched_quantity_kg", 0.0))
                ret_amt = min(cargo_weight, disp_in_inv)
                if ret_amt > 0:
                    try:
                        await deliver_stock(
                            db, inv_id,
                            delivered_kg=0.0,
                            returned_reusable_kg=ret_amt,
                            returned_damaged_kg=0.0,
                            returned_rejected_kg=0.0,
                            actor_id=actor_id,
                            actor_role=actor_role,
                            reference_id=canonical_id,
                            session=session
                        )
                    except Exception as e:
                        logger.warning(f"Error returning dispatched stock for cancelled shipment {canonical_id}: {e}")
            else:
                res_in_inv = float(inv.get("reserved_quantity_kg", 0.0))
                rel_amt = min(cargo_weight, res_in_inv)
                if rel_amt > 0:
                    try:
                        await release_stock(db, inv_id, rel_amt, actor_id, actor_role, canonical_id, session)
                    except Exception as e:
                        logger.warning(f"Error releasing reserved stock for cancelled shipment {canonical_id}: {e}")

    # 6. Ledger entry
    await append_ledger_block(
        db,
        event_type=LedgerEventType.SHIPMENT_CANCELLED if hasattr(LedgerEventType, "SHIPMENT_CANCELLED") else "SHIPMENT_CANCELLED",
        entity_type="SHIPMENT",
        entity_id=canonical_id,
        actor_id=actor_id,
        actor_role=actor_role,
        event_summary=f"Shipment {shipment.get('shipment_id')} cancelled: {reason}",
        payload={"reason": reason},
        session=session
    )

    return await db.shipments.find_one({"_id": shipment["_id"]}, session=session)

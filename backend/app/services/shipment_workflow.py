"""Shipment state transitions and resource release."""
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from app.core.constants import LedgerEventType
from app.core.exceptions import InvalidStateTransitionError, ValidationError, ConflictError
from app.services.ledger_service import append_ledger_block
from app.utils.mongo import resolve_doc, to_mongo

ALLOWED_TRANSITIONS = {
    "DRIVER_ASSIGNED": ["LOADED", "CANCELLED"],
    "LOADED": ["DISPATCHED", "CANCELLED"],
    "DISPATCHED": ["IN_TRANSIT", "CANCELLED"],
    "IN_TRANSIT": ["ARRIVED_AT_DESTINATION", "CANCELLED"],
    "ARRIVED_AT_DESTINATION": ["OUT_FOR_DELIVERY"],
    "OUT_FOR_DELIVERY": ["DELIVERED", "PARTIALLY_DELIVERED", "DELIVERY_REJECTED"],
    "DELIVERED": [], "PARTIALLY_DELIVERED": [], "DELIVERY_REJECTED": [], "CANCELLED": [],
}


def assert_valid_transition(current_state, target_state):
    if target_state not in ALLOWED_TRANSITIONS.get(current_state, []):
        raise InvalidStateTransitionError(current_state, target_state)


async def transition_shipment(db, shipment_id, target_status, actor_id, actor_role, session=None,
                              extra_updates=None, event_summary=None):
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id", session=session)
    current = shipment["status"]
    assert_valid_transition(current, target_status)
    now = datetime.now(timezone.utc)
    updates = {"status": target_status, "updated_at": now}
    updates.update(extra_updates or {})
    result = await db.shipments.update_one(
        {"_id": shipment["_id"], "status": current},
        {"$set": to_mongo(updates), "$push": {"status_history": {"status": target_status, "at": now}}},
        session=session,
    )
    if result.matched_count != 1:
        raise ConflictError("Shipment status changed; reload and try again")
    event = {
        "LOADED": LedgerEventType.CARGO_LOADED,
        "IN_TRANSIT": LedgerEventType.SHIPMENT_IN_TRANSIT,
        "ARRIVED_AT_DESTINATION": LedgerEventType.SHIPMENT_ARRIVED,
    }.get(target_status)
    if event:
        await append_ledger_block(
            db, event_type=event, entity_type="SHIPMENT", entity_id=str(shipment["_id"]),
            actor_id=actor_id, actor_role=actor_role,
            event_summary=event_summary or f"Shipment {shipment.get('shipment_id')} became {target_status}",
            payload={"from_status": current, "to_status": target_status}, session=session,
        )
    return await db.shipments.find_one({"_id": shipment["_id"]}, session=session)


async def _release_resources(db, shipment, now, session):
    assignment = str(shipment["_id"])
    for collection_name, key in (("vehicles", "vehicle_id"), ("drivers", "driver_id")):
        raw_id = shipment.get(key)
        if raw_id:
            collection = getattr(db, collection_name)
            query_id = ObjectId(raw_id) if ObjectId.is_valid(raw_id) else raw_id
            result = await collection.update_one(
                {"_id": query_id, "current_assignment": assignment, "status": "ASSIGNED"},
                {"$set": {"status": "AVAILABLE", "current_assignment": None, "updated_at": now}},
                session=session,
            )
            if result.matched_count != 1:
                raise ConflictError(f"{key} assignment changed")


async def finalize_shipment(db, shipment, outcome, actor_id, actor_role, delivered_qty,
                            damaged_qty=0.0, missing_qty=0.0, report_hash=None, session=None):
    if shipment.get("status") != "OUT_FOR_DELIVERY":
        raise ValidationError("Delivery requires OUT_FOR_DELIVERY status")
    if outcome not in ("DELIVERED", "PARTIALLY_DELIVERED", "DELIVERY_REJECTED"):
        raise ValidationError("Invalid delivery outcome")
    now = datetime.now(timezone.utc)
    updates = {"status": outcome, "updated_at": now}
    if not shipment.get("actual_arrival_time"):
        updates["actual_arrival_time"] = now
    result = await db.shipments.update_one(
        {"_id": shipment["_id"], "status": "OUT_FOR_DELIVERY"},
        {"$set": updates, "$push": {"status_history": {"status": outcome, "at": now}}}, session=session,
    )
    if result.matched_count != 1:
        raise ConflictError("Shipment already finalized")
    po_id = shipment.get("purchase_order_id")
    if po_id:
        result = await db.purchase_orders.update_one(
            {"_id": ObjectId(po_id) if ObjectId.is_valid(po_id) else po_id, "status": "ACCEPTED"},
            {"$set": {"status": "FAILED" if outcome == "DELIVERY_REJECTED" else "FULFILLED",
                      "fulfilled_quantity_kg": delivered_qty, "updated_at": now}}, session=session,
        )
        if result.matched_count != 1:
            raise ConflictError("Purchase order changed before delivery")
    await _release_resources(db, shipment, now, session)
    await append_ledger_block(
        db, event_type=LedgerEventType.DELIVERY_REJECTED if outcome == "DELIVERY_REJECTED" else LedgerEventType.DELIVERY_CONFIRMED,
        entity_type="SHIPMENT", entity_id=str(shipment["_id"]), actor_id=actor_id, actor_role=actor_role,
        event_summary=f"Delivery {outcome.lower()} for shipment {shipment.get('shipment_id')}",
        payload={"outcome": outcome, "delivered_quantity_kg": delivered_qty,
                 "damaged_quantity_kg": damaged_qty, "missing_quantity_kg": missing_qty,
                 "report_sha256": report_hash}, session=session,
    )
    return await db.shipments.find_one({"_id": shipment["_id"]}, session=session)


async def cancel_shipment(db, shipment, actor_id, actor_role, reason="User cancelled", session=None):
    current = shipment.get("status")
    assert_valid_transition(current, "CANCELLED")
    now = datetime.now(timezone.utc)
    result = await db.shipments.update_one(
        {"_id": shipment["_id"], "status": current},
        {"$set": {"status": "CANCELLED", "cancellation_reason": reason, "updated_at": now},
         "$push": {"status_history": {"status": "CANCELLED", "at": now}}}, session=session,
    )
    if result.matched_count != 1:
        raise ConflictError("Shipment status changed")
    await _release_resources(db, shipment, now, session)
    await append_ledger_block(
        db, event_type=LedgerEventType.SHIPMENT_CANCELLED, entity_type="SHIPMENT",
        entity_id=str(shipment["_id"]), actor_id=actor_id, actor_role=actor_role,
        event_summary=f"Shipment {shipment.get('shipment_id')} cancelled: {reason}",
        payload={"reason": reason}, session=session,
    )
    return await db.shipments.find_one({"_id": shipment["_id"]}, session=session)

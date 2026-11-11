#!/usr/bin/env python3
"""Check stock, assignment, and hash-chain invariants against a replica set."""
import asyncio
import os
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.config import get_settings
from app.db.mongodb import connect_to_mongo, close_mongo_connection, get_database
from app.services.ledger_service import verify_ledger_integrity

ACTIVE_SHIPMENT_STATUSES = {
    "DRIVER_ASSIGNED", "LOADED", "DISPATCHED", "IN_TRANSIT",
    "ARRIVED_AT_DESTINATION", "OUT_FOR_DELIVERY",
}
CONSUMING_ORDER_STATUSES = {"ACCEPTED", "FULFILLED", "FAILED"}


async def reconcile(db):
    violations = []
    consumed = defaultdict(float)
    for order in await db.purchase_orders.find({"status": {"$in": list(CONSUMING_ORDER_STATUSES)}}).to_list(None):
        quantity = float(order.get("accepted_quantity_kg") or order.get("requested_quantity_kg") or 0)
        consumed[str(order.get("batch_id"))] += quantity
    stock = defaultdict(lambda: {"accepted": 0.0, "available": 0.0})
    for item in await db.inventory_items.find({}).to_list(None):
        batch_id = str(item.get("batch_id"))
        accepted = float(item.get("accepted_kg", 0))
        available = float(item.get("available_kg", 0))
        if accepted < 0 or available < -1e-6 or available > accepted + 1e-6:
            violations.append(f"inventory {item['_id']}: invalid accepted/available balance")
        stock[batch_id]["accepted"] += accepted
        stock[batch_id]["available"] += available
    for batch_id, balance in stock.items():
        expected = balance["accepted"] - consumed[batch_id]
        if abs(balance["available"] - expected) > 1e-6:
            violations.append(f"batch {batch_id}: available {balance['available']} != accepted {balance['accepted']} - consumed {consumed[batch_id]}")
    for batch_id, quantity in consumed.items():
        if batch_id not in stock and quantity:
            violations.append(f"batch {batch_id}: consumed {quantity} without inventory")

    active = await db.shipments.find({"status": {"$in": list(ACTIVE_SHIPMENT_STATUSES)}}).to_list(None)
    for kind in ("vehicle", "driver"):
        assignments = defaultdict(list)
        for shipment in active:
            assignments[str(shipment.get(f"{kind}_id"))].append(str(shipment["_id"]))
        for asset_id, shipment_ids in assignments.items():
            if len(shipment_ids) != 1:
                violations.append(f"{kind} {asset_id}: {len(shipment_ids)} active shipments")
        collection = db.vehicles if kind == "vehicle" else db.drivers
        for asset in await collection.find({}).to_list(None):
            asset_id = str(asset["_id"])
            shipment_ids = assignments.get(asset_id, [])
            status = asset.get("status")
            current = str(asset.get("current_assignment")) if asset.get("current_assignment") else None
            if shipment_ids and (status != "ASSIGNED" or current != shipment_ids[0]):
                violations.append(f"{kind} {asset_id}: assignment does not match active shipment")
            if not shipment_ids and status == "ASSIGNED":
                violations.append(f"{kind} {asset_id}: assigned without active shipment")
    ledger = await verify_ledger_integrity(db)
    if not ledger["valid"]:
        violations.append(f"ledger: {ledger['message']}")
    return violations


async def main():
    settings = get_settings()
    test_uri = os.getenv("TEST_MONGODB_URI")
    if test_uri:
        settings.mongodb_uri = test_uri
        settings.database_name = os.getenv("TEST_DATABASE_NAME", "agri_chain_test")
    await connect_to_mongo()
    try:
        issues = await reconcile(get_database())
        if issues:
            for issue in issues:
                print(issue, file=sys.stderr)
            return 1
        print("Reconciliation passed: stock, assignments, and ledger are consistent")
        return 0
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

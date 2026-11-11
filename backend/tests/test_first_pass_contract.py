from unittest.mock import AsyncMock, MagicMock

import pytest
from bson import ObjectId

from app.core.exceptions import ConflictError, InsufficientStockError, ValidationError
from app.services.inventory_service import reserve_stock, release_stock
from app.services.shipment_workflow import ALLOWED_TRANSITIONS
from app.api.v1.endpoints.delivery import ConfirmDeliveryRequest, confirm_delivery
from app.core.constants import UserRole


@pytest.mark.asyncio
async def test_stock_reservation_is_conditional_and_single_counter():
    db = MagicMock()
    db.inventory_items.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
    inv_id = str(ObjectId())
    session = object()
    await reserve_stock(db, inv_id, 25, session)
    query, update = db.inventory_items.update_one.await_args.args
    assert query == {"_id": ObjectId(inv_id), "available_kg": {"$gte": 25}}
    assert update["$inc"] == {"available_kg": -25}
    assert db.inventory_items.update_one.await_args.kwargs["session"] is session


@pytest.mark.asyncio
async def test_reservation_rejects_shortage_and_release_has_ceiling():
    db = MagicMock()
    db.inventory_items.update_one = AsyncMock(return_value=MagicMock(modified_count=0))
    db.inventory_items.find_one = AsyncMock(return_value={"available_kg": 10})
    inv_id = str(ObjectId())
    with pytest.raises(InsufficientStockError):
        await reserve_stock(db, inv_id, 50, object())
    with pytest.raises(ConflictError):
        await release_stock(db, inv_id, 50, object())
    query, update = db.inventory_items.update_one.await_args.args
    assert query["$expr"] == {"$lte": [{"$add": ["$available_kg", 50]}, "$accepted_kg"]}
    assert update["$inc"] == {"available_kg": 50}


def test_reduced_shipment_state_machine_is_closed():
    assert len(ALLOWED_TRANSITIONS) == 10
    assert ALLOWED_TRANSITIONS["IN_TRANSIT"] == ["ARRIVED_AT_DESTINATION", "CANCELLED"]
    assert ALLOWED_TRANSITIONS["OUT_FOR_DELIVERY"] == ["DELIVERED", "PARTIALLY_DELIVERED", "DELIVERY_REJECTED"]
    assert all(status in ALLOWED_TRANSITIONS for targets in ALLOWED_TRANSITIONS.values() for status in targets)


@pytest.mark.asyncio
async def test_delivery_requires_weight_equation_before_any_write():
    shipment_id = ObjectId()
    db = MagicMock()
    db.shipments.find_one = AsyncMock(return_value={"_id": shipment_id, "buyer_id": "buyer", "status": "OUT_FOR_DELIVERY", "loaded_weight_kg": 100})
    data = ConfirmDeliveryRequest(delivered_quantity_kg=90, damaged_quantity_kg=5, missing_quantity_kg=0, received_by="Buyer")
    with pytest.raises(ValidationError, match="must equal loaded weight"):
        await confirm_delivery(str(shipment_id), data, {"role": UserRole.BUYER, "sub": "buyer"}, db)
    db.delivery_reports.insert_one.assert_not_called()

@pytest.mark.asyncio
async def test_partial_delivery_writes_report_and_releases_resources(monkeypatch):
    from contextlib import asynccontextmanager
    from app.api.v1.endpoints import delivery
    from app.services import shipment_workflow

    @asynccontextmanager
    async def transaction():
        yield object()

    shipment_id, order_id, vehicle_id, driver_id = (ObjectId() for _ in range(4))
    shipment = {"_id": shipment_id, "shipment_id": "SHIP-1", "buyer_id": "buyer",
                "status": "OUT_FOR_DELIVERY", "loaded_weight_kg": 100,
                "purchase_order_id": str(order_id), "vehicle_id": str(vehicle_id),
                "driver_id": str(driver_id)}
    db = MagicMock()
    db.shipments.find_one = AsyncMock(return_value=shipment)
    db.shipments.update_one = AsyncMock(return_value=MagicMock(matched_count=1))
    db.purchase_orders.update_one = AsyncMock(return_value=MagicMock(matched_count=1))
    db.vehicles.update_one = AsyncMock(return_value=MagicMock(matched_count=1))
    db.drivers.update_one = AsyncMock(return_value=MagicMock(matched_count=1))
    db.delivery_reports.insert_one = AsyncMock(return_value=MagicMock(inserted_id=ObjectId()))
    ledger = AsyncMock()
    monkeypatch.setattr(delivery, "run_in_txn", lambda callback: callback(object()))
    monkeypatch.setattr(delivery, "to_response", lambda model, doc: doc)
    monkeypatch.setattr(shipment_workflow, "append_ledger_block", ledger)
    report = await delivery.confirm_delivery(
        str(shipment_id), ConfirmDeliveryRequest(delivered_quantity_kg=90, damaged_quantity_kg=5,
                                                missing_quantity_kg=5, received_by="Buyer"),
        {"role": UserRole.BUYER, "sub": "buyer"}, db,
    )
    assert report["status"] == "PARTIAL"
    assert db.shipments.update_one.await_args.args[1]["$set"]["status"] == "PARTIALLY_DELIVERED"
    assert db.purchase_orders.update_one.await_args.args[1]["$set"]["status"] == "FULFILLED"
    assert db.vehicles.update_one.await_args.args[1]["$set"]["status"] == "AVAILABLE"
    assert db.drivers.update_one.await_args.args[1]["$set"]["status"] == "AVAILABLE"
    assert len(ledger.await_args.kwargs["payload"]["report_sha256"]) == 64
    db.inventory_items.update_one.assert_not_called()

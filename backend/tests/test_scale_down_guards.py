from unittest.mock import AsyncMock, MagicMock

import pytest
from bson import ObjectId

from app.api.v1.endpoints.inventory import WarehouseReceiptCreate, create_warehouse_receipt
from app.core.constants import UserRole
from app.core.exceptions import ConflictError, ValidationError
from app.services.sensor_simulator import generate_stateless_reading
from app.api.v1.endpoints import purchase_orders, shipments
from app.db import unit_of_work
from app.services import shipment_workflow
from contextlib import asynccontextmanager


@pytest.mark.parametrize("produce,minimum,maximum", [("TOMATO", 7, 13), ("POTATO", 7, 10)])
def test_simulator_uses_commodity_ranges(produce, minimum, maximum):
    reading = generate_stateless_reading("shipment", produce, "TEMP_EXCURSION", 0)
    assert (reading["configured_temp_min"], reading["configured_temp_max"]) == (minimum, maximum)


def test_stateless_excursion_is_repeatable_and_recovers():
    readings = [generate_stateless_reading("shipment", "TOMATO", "TEMP_EXCURSION", step) for step in range(8)]
    assert readings == [generate_stateless_reading("shipment", "TOMATO", "TEMP_EXCURSION", step) for step in range(8)]
    assert all(reading["temperature"] > 13 for reading in readings[3:7])
    assert readings[7]["temperature"] <= 13


@pytest.mark.asyncio
@pytest.mark.parametrize("status,initial,expected", [
    ("AT_WAREHOUSE", 100, ConflictError),
    ("CREATED", 50, ValidationError),
])
async def test_receipt_rejects_previously_received_or_excess_weight(status, initial, expected):
    database = MagicMock()
    warehouse_id, batch_id = str(ObjectId()), str(ObjectId())
    database.warehouses.find_one = AsyncMock(return_value={"_id": ObjectId(warehouse_id), "manager_id": "manager"})
    database.produce_batches.find_one = AsyncMock(return_value={
        "_id": ObjectId(batch_id), "status": status, "initial_quantity_kg": initial,
    })
    receipt = WarehouseReceiptCreate(warehouse_id=warehouse_id, batch_id=batch_id,
                                     received_weight_kg=100, accepted_weight_kg=100,
                                     storage_location="A")
    with pytest.raises(expected):
        await create_warehouse_receipt(warehouse_id, receipt, {"role": UserRole.WAREHOUSE_MANAGER, "sub": "manager"}, database)
    database.warehouse_receipts.insert_one.assert_not_called()


@pytest.mark.asyncio
async def test_order_acceptance_rejects_stale_state_before_reserving(monkeypatch):
    async def transaction(callback):
        return await callback(object())

    order_id = ObjectId()
    database = MagicMock()
    database.purchase_orders.find_one = AsyncMock(return_value={
        "_id": order_id, "seller_id": "farmer", "status": "PLACED",
        "requested_quantity_kg": 100, "batch_id": str(ObjectId()),
    })
    database.purchase_orders.update_one = AsyncMock(return_value=MagicMock(matched_count=0))
    monkeypatch.setattr(purchase_orders, "run_in_txn", transaction)
    with pytest.raises(ConflictError):
        await purchase_orders.accept_purchase_order(str(order_id), {"role": UserRole.FARMER, "sub": "farmer"}, database)
    database.produce_batches.update_one.assert_not_called()


@pytest.mark.asyncio
async def test_order_cancellation_rejects_existing_shipment(monkeypatch):
    @asynccontextmanager
    async def transaction():
        yield object()

    order_id = ObjectId()
    database = MagicMock()
    database.purchase_orders.find_one = AsyncMock(return_value={
        "_id": order_id, "buyer_id": "buyer", "status": "ACCEPTED",
        "requested_quantity_kg": 100, "batch_id": str(ObjectId()),
    })
    database.shipments.find_one = AsyncMock(return_value={"status": "DRIVER_ASSIGNED"})
    database.purchase_orders.update_one = AsyncMock()
    monkeypatch.setattr(purchase_orders, "run_in_txn", lambda callback: callback(object()))
    with pytest.raises(ConflictError):
        await purchase_orders.cancel_purchase_order(str(order_id), {"role": UserRole.BUYER, "sub": "buyer"}, database)
    database.purchase_orders.update_one.assert_not_awaited()


@pytest.mark.asyncio
async def test_transaction_helper_delegates_retry_to_driver(monkeypatch):
    session = MagicMock()
    session.__aenter__ = AsyncMock(return_value=session)
    session.__aexit__ = AsyncMock(return_value=None)
    session.with_transaction = AsyncMock(return_value="committed")
    client = MagicMock()
    client.start_session = AsyncMock(return_value=session)
    monkeypatch.setattr(unit_of_work, "supports_transactions", lambda: True)
    monkeypatch.setattr(unit_of_work, "get_client", lambda: client)
    callback = AsyncMock()
    assert await unit_of_work.run_in_txn(callback) == "committed"
    args, kwargs = session.with_transaction.await_args
    assert args == (callback,)
    assert kwargs["read_concern"].level == "snapshot"
    assert kwargs["write_concern"].document["w"] == "majority"


@pytest.mark.asyncio
async def test_shipment_cancellation_keeps_order_stock_reserved(monkeypatch):
    shipment_id, inventory_id = ObjectId(), ObjectId()
    shipment = {"_id": shipment_id, "shipment_id": "S-1", "status": "IN_TRANSIT",
                "batch_ids": ["batch"], "loaded_weight_kg": 100}
    database = MagicMock()
    database.shipments.update_one = AsyncMock(return_value=MagicMock(matched_count=1))
    database.shipments.find_one = AsyncMock(return_value={**shipment, "status": "CANCELLED"})
    database.inventory_items.find_one = AsyncMock(return_value={"_id": inventory_id})
    database.inventory_items.update_one = AsyncMock(return_value=MagicMock(matched_count=1))
    monkeypatch.setattr(shipment_workflow, "append_ledger_block", AsyncMock())
    await shipment_workflow.cancel_shipment(database, shipment, "user", "TRANSPORTER", session=object())
    database.inventory_items.update_one.assert_not_awaited()



@pytest.mark.asyncio
async def test_short_load_keeps_stock_reserved(monkeypatch):
    @asynccontextmanager
    async def transaction():
        yield object()

    shipment_id = ObjectId()
    shipment = {"_id": shipment_id, "shipment_id": "S-1", "status": "DRIVER_ASSIGNED",
                "cargo_quantity_kg": 100, "total_cargo_weight_kg": 100, "batch_ids": ["batch"]}
    database = MagicMock()
    database.shipments.find_one = AsyncMock(return_value=shipment)
    database.inventory_items.find_one = AsyncMock()
    monkeypatch.setattr(shipments, "assert_can_view_shipment", AsyncMock())
    monkeypatch.setattr(shipments, "run_in_txn", lambda callback: callback(object()))
    transition = AsyncMock(return_value=shipment)
    monkeypatch.setattr(shipments, "transition_shipment", transition)
    monkeypatch.setattr(shipments, "to_response", lambda model, value: value)
    await shipments.load_shipment(str(shipment_id), shipments.ShipmentLoad(actual_weight_kg=90, actual_package_count=1),
                                  {"role": UserRole.ADMIN, "sub": "admin"}, database)
    assert transition.await_args.kwargs["extra_updates"]["loaded_weight_kg"] == 90
    assert "total_cargo_weight_kg" not in transition.await_args.kwargs["extra_updates"]
    database.inventory_items.find_one.assert_not_awaited()


@pytest.mark.asyncio
async def test_stale_delivery_does_not_release_assets():
    shipment = {"_id": ObjectId(), "status": "OUT_FOR_DELIVERY", "loaded_weight_kg": 100}
    database = MagicMock()
    database.shipments.update_one = AsyncMock(return_value=MagicMock(matched_count=0))
    database.vehicles.update_one = AsyncMock()
    database.drivers.update_one = AsyncMock()
    with pytest.raises(ConflictError):
        await shipment_workflow.finalize_shipment(database, shipment, "DELIVERED", "buyer", "BUYER", 100, session=object())
    database.vehicles.update_one.assert_not_awaited()
    database.drivers.update_one.assert_not_awaited()

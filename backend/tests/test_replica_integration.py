"""Real MongoDB checks. Set TEST_MONGODB_URI to a replica set URI."""
import asyncio
import os
from datetime import date, timedelta
from uuid import uuid4

import pytest
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from app.api.v1.endpoints import inventory, purchase_orders, sensors, batches
from app.core.exceptions import ConflictError, ForbiddenError, InsufficientStockError
from app.db import unit_of_work
from app.services.ledger_service import verify_ledger_integrity
from scripts.reconcile import reconcile

URI = os.getenv("TEST_MONGODB_URI")
pytestmark = pytest.mark.skipif(not URI, reason="Set TEST_MONGODB_URI to a MongoDB replica set URI")


@pytest.fixture
async def db(monkeypatch):
    client = AsyncIOMotorClient(URI, serverSelectionTimeoutMS=5000, directConnection=True)
    assert (await client.admin.command("hello")).get("setName"), "Replica set required"
    database = client[f"agri_chain_it_{uuid4().hex}"]
    monkeypatch.setattr(unit_of_work, "get_client", lambda: client)
    monkeypatch.setattr(unit_of_work, "supports_transactions", lambda: True)
    await database.ledger_blocks.create_index([("chain_id", 1), ("index", 1)], unique=True)
    try:
        yield database
    finally:
        await client.drop_database(database.name)
        client.close()


async def stock_fixture(db, accepted=100):
    farmer, manager, buyer = (str(ObjectId()) for _ in range(3))
    await db.users.insert_many([{"_id": ObjectId(farmer), "role": "FARMER"}, {"_id": ObjectId(buyer), "role": "BUYER"}])
    farm_id = (await db.farms.insert_one({"farmer_id": farmer, "is_active": True})).inserted_id
    warehouse_id = (await db.warehouses.insert_one({"manager_id": manager})).inserted_id
    batch_id = (await db.produce_batches.insert_one({
        "batch_id": f"TOM-{uuid4().hex[:8]}", "farmer_id": farmer, "farm_id": str(farm_id),
        "produce_type": "TOMATO", "initial_quantity_kg": accepted,
        "status": "CREATED", "quality_grade": "GRADE_A", "packaging_type": "CRATE",
        "harvest_location": "Nashik", "estimated_shelf_life_end": date.today().isoformat(),
    })).inserted_id
    return farmer, manager, buyer, warehouse_id, batch_id


async def receive(db, manager, warehouse_id, batch_id, accepted=100):
    request = inventory.WarehouseReceiptCreate(
        warehouse_id=str(warehouse_id), batch_id=str(batch_id),
        received_weight_kg=accepted, accepted_weight_kg=accepted, storage_location="A1")
    return await inventory.create_warehouse_receipt(str(warehouse_id), request,
        {"role": "WAREHOUSE_MANAGER", "sub": manager}, db)


async def test_duplicate_receipt_and_reconciliation(db):
    farmer, manager, buyer, wh, batch = await stock_fixture(db)
    await receive(db, manager, wh, batch)
    with pytest.raises(ConflictError):
        await receive(db, manager, wh, batch)
    assert await db.warehouse_receipts.count_documents({}) == 1
    assert await db.inventory_items.count_documents({}) == 1
    assert (await verify_ledger_integrity(db))["valid"]
    assert await reconcile(db) == []
    with pytest.raises(ForbiddenError):
        await receive(db, buyer, wh, batch)


async def test_concurrent_order_accepts_cannot_oversell(db):
    farmer, manager, buyer, wh, batch = await stock_fixture(db)
    await receive(db, manager, wh, batch)
    orders = []
    for _ in range(2):
        order = await purchase_orders.create_purchase_order(
            purchase_orders.PurchaseOrderCreate(produce_type="TOMATO", batch_id=str(batch),
                requested_quantity_kg=70, unit_price_paise=100,
                preferred_delivery_date=date.today() + timedelta(days=1)),
            {"role": "BUYER", "sub": buyer}, db)
        orders.append(order)
    results = await asyncio.gather(*(purchase_orders.accept_purchase_order(
        order.id, {"role": "FARMER", "sub": farmer}, db) for order in orders),
        return_exceptions=True)
    assert sum(not isinstance(result, Exception) for result in results) == 1
    assert sum(isinstance(result, (ConflictError, InsufficientStockError)) for result in results) == 1
    assert (await db.inventory_items.find_one({"batch_id": str(batch)}))["available_kg"] == 30
    assert await reconcile(db) == []


async def test_ledger_failure_rolls_back_batch(db, monkeypatch):
    farmer, manager, buyer, wh, batch = await stock_fixture(db)
    async def fail(*args, **kwargs):
        raise RuntimeError("ledger unavailable")
    monkeypatch.setattr(batches, "append_ledger_block", fail)
    with pytest.raises(RuntimeError, match="ledger unavailable"):
        await batches.create_batch(batches.BatchCreate(
            produce_type="TOMATO", farm_id=str((await db.farms.find_one({}))['_id']),
            harvest_location="Nashik", initial_quantity_kg=20,
            estimated_shelf_life_days=14), {"role": "FARMER", "sub": farmer}, db)
    assert await db.produce_batches.count_documents({}) == 1


async def test_tamper_detection_and_sensor_alert(db):
    farmer, manager, buyer, wh, batch = await stock_fixture(db)
    await receive(db, manager, wh, batch)
    shipment_id = (await db.shipments.insert_one({
        "shipment_id": "SHIP-SENSOR", "batch_ids": [str(batch)],
        "status": "IN_TRANSIT", "buyer_id": buyer})).inserted_id
    for _ in range(4):
        await sensors.next_reading_endpoint(str(shipment_id), sensors.ReadingRequest(scenario="TEMP_EXCURSION"),
                                            {"role": "ADMIN", "sub": "admin"}, db)
    alert = await db.sensor_alerts.find_one({"shipment_id": str(shipment_id), "status": "ACTIVE"})
    assert alert and alert["alert_type"] == "TEMPERATURE"
    assert alert["configured_min"] == 7 and alert["configured_max"] == 13
    await sensors.resolve_alert(str(alert["_id"]), sensors.AlertResolve(corrective_action="Adjusted reefer setpoint"),
                                {"role": "ADMIN", "sub": "admin"}, db)
    assert (await db.sensor_alerts.find_one({"_id": alert["_id"]}))["status"] == "RESOLVED"
    assert (await verify_ledger_integrity(db))["valid"]
    await db.ledger_blocks.update_one({"index": 1}, {"$set": {"event_summary": "tampered"}})
    assert not (await verify_ledger_integrity(db))["valid"]
    assert any(issue.startswith("ledger:") for issue in await reconcile(db))


async def test_concurrent_shipment_vehicle_claim(db):
    from app.api.v1.endpoints import shipments
    farmer, manager, buyer, wh, batch = await stock_fixture(db)
    transporter_user = str(ObjectId())
    transporter_id = (await db.transporters.insert_one({
        "user_id": transporter_user, "approval_status": "APPROVED", "is_active": True,
    })).inserted_id
    vehicle_id = (await db.vehicles.insert_one({
        "transporter_id": str(transporter_id), "vehicle_id": "VEH-1",
        "max_payload_kg": 1000, "refrigeration_available": True,
        "status": "AVAILABLE",
    })).inserted_id
    driver_ids = []
    for number in (1, 2):
        driver_ids.append((await db.drivers.insert_one({
            "transporter_id": str(transporter_id), "driver_id": f"DRV-{number}",
            "status": "AVAILABLE",
        })).inserted_id)
    requests = []
    for number in (1, 2):
        order_id = (await db.purchase_orders.insert_one({
            "order_id": f"PO-{number}", "status": "ACCEPTED",
            "seller_id": farmer, "buyer_id": buyer,
        })).inserted_id
        booking_id = (await db.freight_bookings.insert_one({
            "booking_id": f"FB-{number}", "status": "CONFIRMED",
            "purchase_order_id": str(order_id), "cargo_quantity_kg": 20,
            "batch_ids": [str(batch)], "package_count": 1,
        })).inserted_id
        quote_id = (await db.freight_quotations.insert_one({
            "quotation_id": f"FQ-{number}", "booking_id": str(booking_id),
            "transporter_id": str(transporter_id), "status": "ACCEPTED",
        })).inserted_id
        await db.freight_bookings.update_one({"_id": booking_id},
            {"$set": {"accepted_quotation_id": str(quote_id)}})
        requests.append(shipments.ShipmentCreate(
            booking_id=str(booking_id), accepted_quotation_id=str(quote_id),
            vehicle_id=str(vehicle_id), driver_id=str(driver_ids[number - 1])))
    results = await asyncio.gather(*(shipments.create_shipment(
        request, {"role": "TRANSPORTER", "sub": transporter_user}, db)
        for request in requests), return_exceptions=True)
    assert sum(not isinstance(result, Exception) for result in results) == 1
    assert sum(isinstance(result, ConflictError) for result in results) == 1
    assert await db.shipments.count_documents({}) == 1
    vehicle = await db.vehicles.find_one({"_id": vehicle_id})
    shipment = await db.shipments.find_one({})
    assert vehicle["current_assignment"] == str(shipment["_id"])
    assert (await verify_ledger_integrity(db))["valid"]


async def test_partial_delivery_equation_and_asset_release(db):
    from app.api.v1.endpoints import delivery
    from app.core.exceptions import ValidationError
    farmer, manager, buyer, wh, batch = await stock_fixture(db)
    await receive(db, manager, wh, batch)
    order_id = (await db.purchase_orders.insert_one({
        "status": "ACCEPTED", "batch_id": str(batch),
        "requested_quantity_kg": 100, "accepted_quantity_kg": 100,
    })).inserted_id
    await db.inventory_items.update_one({"batch_id": str(batch)}, {"$set": {"available_kg": 0}})
    vehicle_id = (await db.vehicles.insert_one({"status": "ASSIGNED"})).inserted_id
    driver_id = (await db.drivers.insert_one({"status": "ASSIGNED"})).inserted_id
    shipment_id = ObjectId()
    await db.shipments.insert_one({
        "_id": shipment_id, "shipment_id": "SHIP-DELIVERY", "status": "OUT_FOR_DELIVERY",
        "buyer_id": buyer, "loaded_weight_kg": 100,
        "purchase_order_id": str(order_id), "vehicle_id": str(vehicle_id),
        "driver_id": str(driver_id),
    })
    for collection, asset_id in ((db.vehicles, vehicle_id), (db.drivers, driver_id)):
        await collection.update_one({"_id": asset_id}, {"$set": {"current_assignment": str(shipment_id)}})
    with pytest.raises(ValidationError):
        await delivery.confirm_delivery(str(shipment_id), delivery.ConfirmDeliveryRequest(
            delivered_quantity_kg=90, damaged_quantity_kg=5, missing_quantity_kg=0,
            received_by="Buyer"), {"role": "BUYER", "sub": buyer}, db)
    report = await delivery.confirm_delivery(str(shipment_id), delivery.ConfirmDeliveryRequest(
        delivered_quantity_kg=90, damaged_quantity_kg=5, missing_quantity_kg=5,
        received_by="Buyer"), {"role": "BUYER", "sub": buyer}, db)
    assert report.status == "PARTIAL"
    assert (await db.shipments.find_one({"_id": shipment_id}))["status"] == "PARTIALLY_DELIVERED"
    assert (await db.purchase_orders.find_one({"_id": order_id}))["status"] == "FULFILLED"
    assert (await db.vehicles.find_one({"_id": vehicle_id}))["status"] == "AVAILABLE"
    assert (await db.drivers.find_one({"_id": driver_id}))["status"] == "AVAILABLE"
    assert await reconcile(db) == []


async def test_six_role_lifecycle_and_ledger(db):
    from app.api.v1.endpoints import freight_bookings, freight_quotes, shipments, checkpoints, delivery, users
    farmer, manager, buyer, wh, unused_batch = await stock_fixture(db, accepted=2000)
    admin = str(ObjectId())
    transporter_user = str(ObjectId())
    driver_user = str(ObjectId())
    await db.users.insert_many([
        {"_id": ObjectId(admin), "role": "ADMIN", "is_approved": True},
        {"_id": ObjectId(transporter_user), "role": "TRANSPORTER", "is_approved": False},
        {"_id": ObjectId(driver_user), "role": "DRIVER", "is_approved": True},
    ])
    await users.approve_user(transporter_user, {"role": "ADMIN", "sub": admin}, db)
    assert (await db.users.find_one({"_id": ObjectId(transporter_user)}))["is_approved"]
    farm = await db.farms.find_one({})
    batch = await batches.create_batch(batches.BatchCreate(
        produce_type="TOMATO", farm_id=str(farm["_id"]), harvest_location="Nashik",
        initial_quantity_kg=2000, estimated_shelf_life_days=14),
        {"role": "FARMER", "sub": farmer}, db)
    await receive(db, manager, wh, batch.id, accepted=2000)
    order = await purchase_orders.create_purchase_order(
        purchase_orders.PurchaseOrderCreate(produce_type="TOMATO", batch_id=batch.id,
            requested_quantity_kg=100, unit_price_paise=100,
            preferred_delivery_date=date.today() + timedelta(days=3)),
        {"role": "BUYER", "sub": buyer}, db)
    await purchase_orders.accept_purchase_order(order.id, {"role": "FARMER", "sub": farmer}, db)
    booking = await freight_bookings.create_freight_booking(
        freight_bookings.FreightBookingCreate(
            purchase_order_id=order.id, batch_ids=[batch.id], cargo_quantity_kg=100,
            package_count=10, pickup_city="Nashik", pickup_state="Maharashtra",
            destination_city="Bengaluru", destination_state="Karnataka",
            requested_pickup_date=date.today() + timedelta(days=1),
            required_delivery_date=date.today() + timedelta(days=3),
            preferred_vehicle_category="REFRIGERATED_TRUCK", refrigeration_required=True,
            temperature_min=7, temperature_max=13),
        {"role": "BUYER", "sub": buyer}, db)
    transporter_id = (await db.transporters.insert_one({
        "user_id": transporter_user, "approval_status": "APPROVED", "is_active": True,
    })).inserted_id
    quote = await freight_quotes.create_freight_quotation(
        freight_quotes.FreightQuotationCreate(
            booking_id=booking.id, proposed_vehicle_category="REFRIGERATED_TRUCK",
            freight_base_charge_paise=10000, planned_distance_km=1000,
            estimated_transit_hours=20),
        {"role": "TRANSPORTER", "sub": transporter_user}, db)
    await freight_quotes.accept_freight_quotation(quote.id, {"role": "BUYER", "sub": buyer}, db)
    vehicle_id = (await db.vehicles.insert_one({
        "vehicle_id": "VEH-LIFECYCLE", "transporter_id": str(transporter_id),
        "max_payload_kg": 1000, "refrigeration_available": True, "status": "AVAILABLE",
    })).inserted_id
    driver_id = (await db.drivers.insert_one({
        "driver_id": "DRV-LIFECYCLE", "user_id": driver_user,
        "transporter_id": str(transporter_id), "status": "AVAILABLE",
    })).inserted_id
    shipment = await shipments.create_shipment(shipments.ShipmentCreate(
        booking_id=booking.id, accepted_quotation_id=quote.id,
        vehicle_id=str(vehicle_id), driver_id=str(driver_id)),
        {"role": "TRANSPORTER", "sub": transporter_user}, db)
    driver = {"role": "DRIVER", "sub": driver_user}
    await shipments.load_shipment(shipment.id, shipments.ShipmentLoad(
        actual_weight_kg=100, actual_package_count=10), driver, db)
    await shipments.dispatch_shipment(shipment.id, driver, db)
    await shipments.start_transit(shipment.id, driver, db)
    await checkpoints.create_checkpoint(checkpoints.CheckpointCreate(
        shipment_id=shipment.id, name="Pune checkpoint", city="Pune"), driver, db)
    await shipments.arrive_at_destination(shipment.id, driver, db)
    await shipments.set_out_for_delivery(shipment.id, driver, db)
    await delivery.confirm_delivery(shipment.id, delivery.ConfirmDeliveryRequest(
        delivered_quantity_kg=100, received_by="Bengaluru Buyer"),
        {"role": "BUYER", "sub": buyer}, db)
    assert (await db.shipments.find_one({"_id": ObjectId(shipment.id)}))["status"] == "DELIVERED"
    assert (await verify_ledger_integrity(db))["valid"]
    assert await reconcile(db) == []

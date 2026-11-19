"""Comprehensive tests for returns, movements, warehouse capacity, simulation, and analytics."""

from datetime import datetime, timezone
from bson import ObjectId
from unittest.mock import AsyncMock, MagicMock
import pytest
from pydantic import ValidationError as PydanticValidationError

from app.api.v1.endpoints import shipments
from app.api.v1.endpoints.shipments import ShipmentPartialReturn, receive_partial_shipment_return
from app.api.v1.endpoints.analytics import get_workspace_metrics, get_freight_analytics
from app.core.constants import (
    LedgerEventType,
    SensorScenario,
    ShipmentStatus,
    UserRole,
)
from app.core.exceptions import ConflictError, ValidationError
from app.services.sensor_simulator import generate_stateless_reading, classify_reading


# =====================================================================
# 1. Quantity Precision & Return Payload Validation
# =====================================================================

@pytest.mark.parametrize("quantity", [float("nan"), float("inf"), -1.0, 0.0001, 10.0005])
def test_partial_return_rejects_nonfinite_negative_or_subgram(quantity):
    with pytest.raises(PydanticValidationError):
        ShipmentPartialReturn(
            usable_quantity_kg=quantity,
            condition="Good",
            received_by="Manager",
        )


def test_partial_return_accepts_clean_whole_grams():
    model = ShipmentPartialReturn(
        usable_quantity_kg=12.345,
        damaged_quantity_kg=2.000,
        rejected_quantity_kg=1.500,
        condition="Inspection passed",
        disposition_notes="Restock usable, isolate damaged",
        received_by="WH Officer",
    )
    assert model.usable_quantity_kg == 12.345
    assert model.damaged_quantity_kg == 2.0
    assert model.rejected_quantity_kg == 1.5


# =====================================================================
# 2. Graded / Partial Return Endpoint Logic
# =====================================================================

@pytest.fixture
def mock_db_for_return():
    db = MagicMock()
    ship_id = ObjectId()
    inv_id = ObjectId()
    po_id = ObjectId()
    wh_id = ObjectId()

    shipment = {
        "_id": ship_id,
        "shipment_id": "SHP-001",
        "status": ShipmentStatus.DELIVERY_REJECTED.value,
        "loaded_weight_kg": 100.0,
        "loaded_weight_g": 100000,
        "inventory_item_id": str(inv_id),
        "purchase_order_id": str(po_id),
        "warehouse_id": str(wh_id),
        "requires_cold_storage": True,
        "booking_id": "bk_1",
        "accepted_quotation_id": "q_1",
        "farmer_id": "f_1",
        "buyer_id": "b_1",
        "transporter_id": "t_1",
        "vehicle_id": "v_1",
        "driver_id": "d_1",
        "cargo_quantity_kg": 100.0,
        "cargo_quantity_g": 100000,
        "total_freight_charge_paise": 10000,
        "origin_warehouse_id": str(wh_id),
        "destination_city": "City",
        "origin_city": "Origin",
        "produce_category": "VEGETABLES",
        "produce_type": "TOMATO",
        "return_received_at": None,
    }

    inv_item = {
        "_id": inv_id,
        "batch_id": "batch_001",
        "warehouse_id": str(wh_id),
        "accepted_kg": 1000.0,
        "accepted_g": 1000000,
        "available_kg": 900.0,
        "available_g": 900000,
        "reserved_kg": 100.0,
        "reserved_g": 100000,
        "damaged_kg": 0.0,
        "damaged_g": 0,
        "rejected_kg": 0.0,
        "rejected_g": 0,
        "cold_storage": True,
    }

    po = {
        "_id": po_id,
        "inventory_id": str(inv_id),
        "batch_id": "batch_001",
        "status": "FAILED",
        "reserved_quantity_kg": 100.0,
        "ordered_quantity_kg": 100.0,
    }

    warehouse = {
        "_id": wh_id,
        "manager_id": "user_wh_01",
        "capacity_kg": 10000.0,
        "cold_storage_capacity_kg": 5000.0,
        "has_refrigeration": True,
    }

    db.shipments.find_one = AsyncMock(return_value=shipment)
    db.inventory_items.find_one = AsyncMock(return_value=inv_item)
    db.purchase_orders.find_one = AsyncMock(return_value=po)
    db.warehouses.find_one = AsyncMock(return_value=warehouse)
    db.delivery_reports.find_one = AsyncMock(return_value=None)

    db.shipments.update_one = AsyncMock(return_value=MagicMock(matched_count=1, modified_count=1))
    db.inventory_items.update_one = AsyncMock(return_value=MagicMock(matched_count=1, modified_count=1))
    db.purchase_orders.update_one = AsyncMock(return_value=MagicMock(matched_count=1, modified_count=1))
    db.warehouses.update_one = AsyncMock(return_value=MagicMock(matched_count=1, modified_count=1))
    db.ledger_heads.find_one = AsyncMock(return_value=None)
    db.ledger_heads.update_one = AsyncMock()
    db.inventory_movements.insert_one = AsyncMock()
    db.ledger_blocks.insert_one = AsyncMock()

    # Capacity aggregation mock
    db.inventory_items.aggregate.return_value.to_list = AsyncMock(
        return_value=[{"total": 1000.0, "cold": 500.0}]
    )
    db.inventory_movements.aggregate.return_value.to_list = AsyncMock(
        return_value=[{"total_dispatched_kg": 100.0, "total_dispatched_cold_kg": 100.0}]
    )

    db._ship_id = str(ship_id)
    return db


@pytest.mark.asyncio
async def test_receive_partial_return_success(mock_db_for_return, monkeypatch):
    monkeypatch.setattr(shipments, "run_in_txn", lambda callback: callback(object()))
    monkeypatch.setattr(shipments, "to_response", lambda model, doc: doc)
    db = mock_db_for_return
    payload = ShipmentPartialReturn(
        usable_quantity_kg=50.0,
        damaged_quantity_kg=30.0,
        rejected_quantity_kg=20.0,
        condition="Partial frost damage during transit",
        disposition_notes="Restock usable, destroy damaged, return rejected to vendor",
        received_by="Manager John",
        inspected_usable=True,
    )
    current_user = {"sub": "user_wh_01", "role": UserRole.WAREHOUSE_MANAGER}

    result = await receive_partial_shipment_return(db._ship_id, payload, current_user, db)

    assert result["shipment_id"] == "SHP-001"

    # Verify inventory movements were created for all three dispositions
    inserted_movements = [call.args[0] for call in db.inventory_movements.insert_one.call_args_list]
    movement_types = [m["type"] for m in inserted_movements]
    assert "RETURN_RECEIPT_USABLE" in movement_types
    assert "RETURN_RECEIPT_DAMAGED" in movement_types
    assert "RETURN_RECEIPT_REJECTED" in movement_types

    # Check that damaged and rejected update_one was called on inventory_items
    calls = [c.args for c in db.inventory_items.update_one.call_args_list]
    increments = [c[1]["$inc"] for c in calls if "$inc" in c[1]]
    has_damaged = any("damaged_kg" in inc for inc in increments)
    has_rejected = any("rejected_kg" in inc for inc in increments)
    assert has_damaged
    assert has_rejected

    # Check ledger block creation
    db.ledger_blocks.insert_one.assert_awaited_once()
    ledger_call = db.ledger_blocks.insert_one.call_args.args[0]
    assert ledger_call["event_type"] == LedgerEventType.SHIPMENT_RETURN_RECEIVED
    assert ledger_call["payload_snapshot"]["usable_kg"] == 50.0
    assert ledger_call["payload_snapshot"]["damaged_kg"] == 30.0
    assert ledger_call["payload_snapshot"]["rejected_kg"] == 20.0


@pytest.mark.asyncio
async def test_receive_partial_return_exceeds_loaded_weight(mock_db_for_return, monkeypatch):
    monkeypatch.setattr(shipments, "run_in_txn", lambda callback: callback(object()))
    monkeypatch.setattr(shipments, "to_response", lambda model, doc: doc)
    db = mock_db_for_return
    payload = ShipmentPartialReturn(
        usable_quantity_kg=80.0,
        damaged_quantity_kg=30.0,  # 80 + 30 = 110 > 100 loaded
        rejected_quantity_kg=0.0,
        condition="Over return",
        received_by="Manager John",
    )
    current_user = {"sub": "user_wh_01", "role": UserRole.WAREHOUSE_MANAGER}

    with pytest.raises(ValidationError, match="cannot exceed eligible dispatched quantity"):
        await receive_partial_shipment_return(db._ship_id, payload, current_user, db)


@pytest.mark.asyncio
async def test_receive_partial_return_zero_total_fails(mock_db_for_return):
    db = mock_db_for_return
    payload = ShipmentPartialReturn(
        usable_quantity_kg=0.0,
        damaged_quantity_kg=0.0,
        rejected_quantity_kg=0.0,
        condition="Zero return",
        received_by="Manager John",
    )
    current_user = {"sub": "user_wh_01", "role": UserRole.WAREHOUSE_MANAGER}

    with pytest.raises(ValidationError, match="greater than zero"):
        await receive_partial_shipment_return(db._ship_id, payload, current_user, db)


@pytest.mark.asyncio
async def test_receive_partial_return_already_returned_conflict(mock_db_for_return, monkeypatch):
    monkeypatch.setattr(shipments, "run_in_txn", lambda callback: callback(object()))
    monkeypatch.setattr(shipments, "to_response", lambda model, doc: doc)
    db = mock_db_for_return
    # Mark shipment as already returned
    db.shipments.find_one = AsyncMock(return_value={
        "_id": ObjectId(db._ship_id),
        "status": ShipmentStatus.DELIVERY_REJECTED.value,
        "return_received_at": datetime.now(timezone.utc),
        "loaded_weight_kg": 100.0,
    })
    payload = ShipmentPartialReturn(
        usable_quantity_kg=100.0,
        condition="Return again",
        received_by="Manager John",
    )
    current_user = {"sub": "user_wh_01", "role": UserRole.WAREHOUSE_MANAGER}

    with pytest.raises(ConflictError, match="Return has already been received"):
        await receive_partial_shipment_return(db._ship_id, payload, current_user, db)


@pytest.mark.asyncio
async def test_receive_partial_return_invalid_status_conflict(mock_db_for_return, monkeypatch):
    monkeypatch.setattr(shipments, "run_in_txn", lambda callback: callback(object()))
    monkeypatch.setattr(shipments, "to_response", lambda model, doc: doc)
    db = mock_db_for_return
    # Shipment is in transit, cannot be received back yet
    db.shipments.find_one = AsyncMock(return_value={
        "_id": ObjectId(db._ship_id),
        "status": ShipmentStatus.IN_TRANSIT.value,
        "loaded_weight_kg": 100.0,
        "return_received_at": None,
    })
    payload = ShipmentPartialReturn(
        usable_quantity_kg=100.0,
        condition="Return while in transit",
        received_by="Manager John",
    )
    current_user = {"sub": "user_wh_01", "role": UserRole.WAREHOUSE_MANAGER}

    with pytest.raises(ValidationError, match="Returns are only permitted for CANCELLED, DELIVERY_REJECTED, or PARTIALLY_DELIVERED shipments"):
        await receive_partial_shipment_return(db._ship_id, payload, current_user, db)


# =====================================================================
# 3. Sensor Simulator: TRANSIT_DELAY Scenario & Hysteresis
# =====================================================================

def test_sensor_simulator_transit_delay():
    reading = generate_stateless_reading(
        "shipment-delay-test",
        "TOMATO",
        SensorScenario.TRANSIT_DELAY,
        5,
    )
    # Transit delay should maintain in-range temperature/humidity
    assert reading["temperature"] >= reading["configured_temp_min"]
    assert reading["temperature"] <= reading["configured_temp_max"]
    assert reading["humidity"] >= reading["configured_humidity_min"]
    assert reading["humidity"] <= reading["configured_humidity_max"]

    # Must flag simulated_delay
    assert reading.get("simulated_delay") is True


def test_classify_reading_hysteresis():
    # Previous reading was warning/critical excursion
    prev = {
        "status": "WARNING",
        "temperature": 15.0,
        "humidity": 95.0,
        "configured_temp_min": 10.0,
        "configured_temp_max": 12.0,
        "configured_humidity_min": 85.0,
        "configured_humidity_max": 90.0,
    }
    # Current reading is marginally back inside threshold (e.g. 11.9°C), within 0.2°C margin of max
    current_barely_inside = {
        "temperature": 11.9,
        "humidity": 88.0,
        "configured_temp_min": 10.0,
        "configured_temp_max": 12.0,
        "configured_humidity_min": 85.0,
        "configured_humidity_max": 90.0,
    }
    # Hysteresis keeps warning status until safely inside margin
    assert classify_reading(current_barely_inside, prev) == "WARNING"

    # Current reading safely inside margin
    current_safely_inside = {
        "temperature": 11.0,
        "humidity": 87.0,
        "configured_temp_min": 10.0,
        "configured_temp_max": 12.0,
        "configured_humidity_min": 85.0,
        "configured_humidity_max": 90.0,
    }
    assert classify_reading(current_safely_inside, prev) == "NORMAL"


# =====================================================================
# 4. Workspace Analytics for Six Roles
# =====================================================================

@pytest.fixture
def mock_analytics_db():
    db = MagicMock()

    # Every count_documents returns AsyncMock(return_value=5)
    for col_name in [
        "farms", "produce_batches", "warehouses", "transporters", "shipments",
        "users", "sensor_alerts", "purchase_orders", "inventory_items",
        "warehouse_receipts", "vehicles", "drivers", "freight_quotations", "delivery_reports",
        "freight_bookings", "sensor_telemetry"
    ]:
        getattr(db, col_name).count_documents = AsyncMock(return_value=5)

    # Scopes
    quote_id = ObjectId()
    db.drivers.find_one = AsyncMock(return_value={"_id": "drv_1", "driver_id": "D-01"})
    db.transporters.find_one = AsyncMock(return_value={"_id": "tr_1", "transporter_id": "T-01"})
    db.warehouses.find.return_value.to_list = AsyncMock(return_value=[{"_id": "wh_1"}])
    db.inventory_items.find.return_value.to_list = AsyncMock(return_value=[{"batch_id": "b_1"}])
    db.shipments.find.return_value.to_list = AsyncMock(return_value=[{"_id": "sh_1", "shipment_id": "SH-01", "accepted_quotation_id": str(quote_id)}])
    db.freight_bookings.find.return_value.to_list = AsyncMock(return_value=[{"_id": "fb_1"}])

    # Aggregations
    db.freight_quotations.aggregate.return_value.to_list = AsyncMock(return_value=[
        {"_id": None, "total_quoted": 13500000, "total_accepted": 13500000, "total": 5000000, "count": 10}
    ])
    db.shipments.aggregate.return_value.to_list = AsyncMock(return_value=[
        {
            "_id": None,
            "settled_freight_expenditure_paise": 5000000,
            "committed_freight_expenditure_paise": 8500000,
            "avg_freight_rate_per_km_paise": 2500,
            "avg_freight_rate_per_kg_km_paise": 15,
        }
    ])
    db.inventory_items.aggregate.return_value.to_list = AsyncMock(return_value=[
        {"_id": None, "available": 500.0}
    ])
    db.delivery_reports.aggregate.return_value.to_list = AsyncMock(return_value=[
        {"_id": None, "total": 1000.0}
    ])

    return db


@pytest.mark.asyncio
@pytest.mark.parametrize("role", [
    UserRole.ADMIN,
    UserRole.FARMER,
    UserRole.BUYER,
    UserRole.WAREHOUSE_MANAGER,
    UserRole.TRANSPORTER,
    UserRole.DRIVER,
])
async def test_workspace_analytics_returns_structured_metrics_for_all_roles(mock_analytics_db, role):
    db = mock_analytics_db
    current_user = {"sub": f"user_{role}", "role": role}

    response = await get_workspace_metrics(current_user=current_user, db=db)

    assert response.role == role
    assert isinstance(response.metrics, list)
    assert len(response.metrics) >= 2  # Each role receives dedicated KPIs


@pytest.mark.asyncio
async def test_freight_analytics_financial_semantics(mock_analytics_db):
    db = mock_analytics_db
    current_user = {"sub": "admin_user", "role": UserRole.ADMIN}

    response = await get_freight_analytics(current_user=current_user, db=db)

    assert response["settled_freight_expenditure_paise"] == 5000000
    assert response["committed_freight_expenditure_paise"] == 8500000
    assert response["financial_semantics"]["currency"] == "INR"
    assert "paise" in response["financial_semantics"]["smallest_unit"]
    assert "DELIVERED" in response["financial_semantics"]["settled_expenditure_criteria"]

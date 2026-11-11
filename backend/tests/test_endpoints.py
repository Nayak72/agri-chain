"""AgriChain API Endpoint Integration Unit Tests."""

import pytest
from bson import ObjectId
from app.core.constants import UserRole, DeliveryStatus, FreightBookingStatus
from app.api.v1.endpoints.delivery import ConfirmDeliveryRequest, DeliveryReportResponse
from app.api.v1.endpoints.freight_bookings import FreightBookingCreate
from app.api.v1.endpoints.vehicles import VehicleCreate
from app.api.v1.endpoints.drivers import DriverCreate
from app.api.v1.endpoints.produce import ProduceCreate, ProduceResponse
from app.api.v1.endpoints.warehouses import WarehouseCreate
from datetime import date, datetime, timezone


def test_delivery_report_schema_validation():
    model = ConfirmDeliveryRequest(delivered_quantity_kg=950.5, damaged_quantity_kg=40.0,
                                   missing_quantity_kg=9.5, received_by="R. Sharma")
    assert model.delivered_quantity_kg + model.damaged_quantity_kg + model.missing_quantity_kg == 1000


def test_vehicle_create_schema_defaults():
    payload = {
        "registration_number": "MH12AB1234",
        "category": "REFRIGERATED_TRUCK",
        "vehicle_type": "10T_TRUCK",
        "max_payload_kg": 12000.0,
        "refrigeration_available": True,
        "temperature_min": -2.0,
        "temperature_max": 8.0,
    }
    model = VehicleCreate(**payload)
    assert model.transporter_id is None
    assert model.registration_number == "MH12AB1234"
    assert model.refrigeration_available is True


def test_driver_create_schema_validation():
    model = DriverCreate(name="Suresh Patil", phone="+919876543210", city="Nashik", state="Maharashtra")
    assert model.name == "Suresh Patil"


def test_warehouse_create_optional_manager():
    payload = {
        "name": "Nashik Cold Storage Terminal 1",
        "city": "Nashik",
        "state": "Maharashtra",
        "capacity_kg": 50000.0,
        "cold_storage_capacity_kg": 25000.0,
        "has_refrigeration": True,
        "temperature_range_min": 0.0,
        "temperature_range_max": 10.0,
    }
    model = WarehouseCreate(**payload)
    assert model.manager_id is None
    assert model.capacity_kg == 50000.0


def test_produce_catalogue_schema():
    payload = {
        "produce_type": "TOMATO",
        "name": "Roma Tomato",
        "category": "VEGETABLE",
        "unit": "kg",
        "description": "High lycopene content, ideal for cold transit",
    }
    model = ProduceCreate(**payload)
    assert model.produce_type == "TOMATO"
    assert model.unit == "kg"

    # Verify ProduceResponse handles legacy/seeded documents without timestamps
    doc = {
        "id": "6aeee6b2446b99c151122334",
        "produce_type": "APPLE",
        "name": "Apple",
        "category": "FRUIT",
        "unit": "kg",
    }
    resp = ProduceResponse(**doc)
    assert resp.name == "Apple"
    assert resp.is_active is True
    assert resp.description is None
    assert resp.created_at is None


@pytest.mark.asyncio
async def test_base_repository_database_truth_check_safe():
    """Verify BaseRepository does not perform truth-value testing on database instances."""
    from unittest.mock import MagicMock
    from app.repositories.base import BaseRepository

    class MockMongoDatabase:
        def __getitem__(self, name):
            mock_col = MagicMock()
            mock_col.find_one = MagicMock()
            return mock_col

        def __bool__(self):
            raise NotImplementedError("Database objects do not implement truth value testing or bool().")

    mock_db = MockMongoDatabase()
    repo = BaseRepository(database=mock_db)
    repo.collection = "test_col"

    col = repo._collection()
    assert col is not None

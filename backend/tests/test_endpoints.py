"""AgriChain API Endpoint Integration Unit Tests."""

import pytest
from bson import ObjectId
from app.core.constants import UserRole, DeliveryStatus, FreightBookingStatus
from app.api.v1.endpoints.delivery import DeliveryReportCreate, DeliveryReportResponse
from app.api.v1.endpoints.freight_bookings import FreightBookingCreate
from app.api.v1.endpoints.vehicles import VehicleCreate
from app.api.v1.endpoints.drivers import DriverCreate
from app.api.v1.endpoints.produce import ProduceCreate, ProduceResponse
from app.api.v1.endpoints.warehouses import WarehouseCreate
from datetime import date, datetime, timezone


def test_delivery_report_schema_validation():
    payload = {
        "shipment_id": str(ObjectId()),
        "delivered_quantity_kg": 950.5,
        "damaged_quantity_kg": 40.0,
        "missing_quantity_kg": 9.5,
        "received_by": "R. Sharma",
        "received_at": datetime.now(timezone.utc),
        "delivery_photos": ["photo1.jpg"],
        "receiver_signature": "SIG-SHA256-PROOF",
        "notes": "Delivered with minor crate vibration damage",
        "status": DeliveryStatus.PARTIAL,
    }
    model = DeliveryReportCreate(**payload)
    assert model.delivered_quantity_kg == 950.5
    assert model.damaged_quantity_kg == 40.0
    assert model.status == DeliveryStatus.PARTIAL


def test_vehicle_create_schema_defaults():
    payload = {
        "registration_number": "MH12AB1234",
        "category": "REFRIGERATED_TRUCK",
        "vehicle_type": "10T_TRUCK",
        "max_payload_kg": 12000.0,
        "refrigeration_available": True,
        "temperature_min": -2.0,
        "temperature_max": 8.0,
        "registration_expiry": date(2027, 1, 1),
        "insurance_expiry": date(2027, 1, 1),
        "fitness_expiry": date(2027, 1, 1),
    }
    model = VehicleCreate(**payload)
    assert model.transporter_id is None
    assert model.registration_number == "MH12AB1234"
    assert model.refrigeration_available is True


def test_driver_create_schema_validation():
    payload = {
        "name": "Suresh Patil",
        "phone": "+919876543210",
        "license_number": "MH1520190012345",
        "license_expiry": date(2028, 5, 20),
        "address": "MIDC Area, Ambad",
        "city": "Nashik",
        "state": "Maharashtra",
        "pincode": "422010",
        "experience_years": 8,
    }
    model = DriverCreate(**payload)
    assert model.transporter_id is None
    assert model.name == "Suresh Patil"
    assert model.experience_years == 8


def test_warehouse_create_optional_manager():
    payload = {
        "name": "Nashik Cold Storage Terminal 1",
        "address": "Plot 10, MIDC",
        "city": "Nashik",
        "state": "Maharashtra",
        "pincode": "422001",
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

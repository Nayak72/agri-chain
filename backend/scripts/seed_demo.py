#!/usr/bin/env python3
"""AgriChain Demo Data Seeding Script.

Seeds the database with realistic demonstration data for all six user roles.
Idempotent: safe to run multiple times without creating duplicates.
"""

import asyncio
import sys
import os
from datetime import datetime, date, timedelta, timezone
from bson import ObjectId

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.mongodb import connect_to_mongo, close_mongo_connection, get_database
from app.core.security import get_password_hash
from app.core.constants import (
    UserRole, ProduceType, QualityGrade, PackagingType, BatchStatus,
    WarehouseReceiptStatus, InspectionResult, InventoryStatus,
    PurchaseOrderStatus, FreightBookingStatus, VehicleCategory, VehicleType,
    VehicleStatus, DriverStatus, ShipmentStatus, SensorScenario,
    PRODUCE_HANDLING_PROFILES
)
from app.services.ledger_service import append_ledger_block, GENESIS_HASH, CHAIN_ID, canonical_json
from app.core.constants import LedgerEventType
import hashlib
import json

# Demo users
DEMO_USERS = [
    {"email": "admin@agrichain.com", "password": "Admin123!", "full_name": "System Administrator", "role": UserRole.ADMIN, "is_approved": True},
    {"email": "farmer1@agrichain.com", "password": "Farmer123!", "full_name": "Rajesh Kumar", "role": UserRole.FARMER, "is_approved": True},
    {"email": "farmer2@agrichain.com", "password": "Farmer123!", "full_name": "Priya Sharma", "role": UserRole.FARMER, "is_approved": True},
    {"email": "farmer3@agrichain.com", "password": "Farmer123!", "full_name": "Amit Patel", "role": UserRole.FARMER, "is_approved": True},
    {"email": "warehouse1@agrichain.com", "password": "Warehouse123!", "full_name": "Suresh Reddy", "role": UserRole.WAREHOUSE_MANAGER, "is_approved": True},
    {"email": "warehouse2@agrichain.com", "password": "Warehouse123!", "full_name": "Lakshmi Nair", "role": UserRole.WAREHOUSE_MANAGER, "is_approved": True},
    {"email": "transporter1@agrichain.com", "password": "Transporter123!", "full_name": "Vikram Singh", "role": UserRole.TRANSPORTER, "is_approved": True},
    {"email": "transporter2@agrichain.com", "password": "Transporter123!", "full_name": "Mohammed Ali", "role": UserRole.TRANSPORTER, "is_approved": True},
    {"email": "transporter3@agrichain.com", "password": "Transporter123!", "full_name": "Ravi Kumar", "role": UserRole.TRANSPORTER, "is_approved": True},
    {"email": "driver1@agrichain.com", "password": "Driver123!", "full_name": "Sanjay Yadav", "role": UserRole.DRIVER, "is_approved": True},
    {"email": "driver2@agrichain.com", "password": "Driver123!", "full_name": "Ramesh Gupta", "role": UserRole.DRIVER, "is_approved": True},
    {"email": "driver3@agrichain.com", "password": "Driver123!", "full_name": "Dinesh Kumar", "role": UserRole.DRIVER, "is_approved": True},
    {"email": "driver4@agrichain.com", "password": "Driver123!", "full_name": "Arjun Mehta", "role": UserRole.DRIVER, "is_approved": True},
    {"email": "driver5@agrichain.com", "password": "Driver123!", "full_name": "Karan Joshi", "role": UserRole.DRIVER, "is_approved": True},
    {"email": "buyer1@agrichain.com", "password": "Buyer123!", "full_name": "Deepak Agarwal", "role": UserRole.BUYER, "is_approved": True},
    {"email": "buyer2@agrichain.com", "password": "Buyer123!", "full_name": "Neha Verma", "role": UserRole.BUYER, "is_approved": True},
    {"email": "buyer3@agrichain.com", "password": "Buyer123!", "full_name": "Amit Desai", "role": UserRole.BUYER, "is_approved": True},
]

FARMS = [
    {"name": "Green Valley Farm", "address": "NH-60, Nashik", "city": "Nashik", "state": "Maharashtra", "pincode": "422001", "area_hectares": 25.5},
    {"name": "Sunrise Orchards", "address": "Sinhagad Road, Pune", "city": "Pune", "state": "Maharashtra", "pincode": "411041", "area_hectares": 18.0},
    {"name": "Deccan Agro Farm", "address": "Hosur Road, Kolar", "city": "Kolar", "state": "Karnataka", "pincode": "563101", "area_hectares": 32.0},
    {"name": "Garden City Produce", "address": "Hennur Road, Bengaluru", "city": "Bengaluru", "state": "Karnataka", "pincode": "560043", "area_hectares": 15.0},
    {"name": "Royal Farm Estates", "address": "Mysuru Road, Mysuru", "city": "Mysuru", "state": "Karnataka", "pincode": "570008", "area_hectares": 28.0},
]

WAREHOUSES = [
    {"name": "Nashik Cold Storage", "city": "Nashik", "state": "Maharashtra", "pincode": "422001", "capacity_kg": 50000, "cold_storage_capacity_kg": 20000, "has_refrigeration": True},
    {"name": "Pune Agri Warehouse", "city": "Pune", "state": "Maharashtra", "pincode": "411041", "capacity_kg": 40000, "cold_storage_capacity_kg": 15000, "has_refrigeration": True},
    {"name": "Bengaluru Distribution Centre", "city": "Bengaluru", "state": "Karnataka", "pincode": "560043", "capacity_kg": 60000, "cold_storage_capacity_kg": 25000, "has_refrigeration": True},
]

VEHICLES = [
    {"registration_number": "MH15AB1234", "category": VehicleCategory.REFRIGERATED_TRUCK, "vehicle_type": VehicleType.TRUCK_20T, "max_payload_kg": 20000, "refrigeration_available": True, "temperature_min": -2, "temperature_max": 15},
    {"registration_number": "MH12CD5678", "category": VehicleCategory.INSULATED_TRUCK, "vehicle_type": VehicleType.TRUCK_15T, "max_payload_kg": 15000, "refrigeration_available": True, "temperature_min": 5, "temperature_max": 20},
    {"registration_number": "KA01EF9012", "category": VehicleCategory.NORMAL_CARGO_TRUCK, "vehicle_type": VehicleType.TRUCK_25T, "max_payload_kg": 25000, "refrigeration_available": False},
    {"registration_number": "MH04GH3456", "category": VehicleCategory.SMALL_DELIVERY_VEHICLE, "vehicle_type": VehicleType.VAN, "max_payload_kg": 1500, "refrigeration_available": False},
    {"registration_number": "KA03IJ7890", "category": VehicleCategory.REFRIGERATED_TRUCK, "vehicle_type": VehicleType.TRUCK_10T, "max_payload_kg": 10000, "refrigeration_available": True, "temperature_min": -2, "temperature_max": 15},
]

DRIVERS = [
    {"name": "Sanjay Yadav", "license_number": "MH1520230001234", "phone": "+91 98765 43210", "experience_years": 8},
    {"name": "Ramesh Gupta", "license_number": "MH1220230005678", "phone": "+91 98765 43211", "experience_years": 12},
    {"name": "Dinesh Kumar", "license_number": "KA0120230009012", "phone": "+91 98765 43212", "experience_years": 6},
    {"name": "Arjun Mehta", "license_number": "MH0420230003456", "phone": "+91 98765 43213", "experience_years": 10},
    {"name": "Karan Joshi", "license_number": "KA0320230007890", "phone": "+91 98765 43214", "experience_years": 5},
]

PRODUCE_BATCHES = [
    {"produce_type": ProduceType.TOMATO, "harvest_location": "Nashik", "initial_quantity_kg": 5000, "quality_grade": QualityGrade.GRADE_A, "packaging_type": PackagingType.CRATE, "shelf_life_days": 14},
    {"produce_type": ProduceType.ONION, "harvest_location": "Nashik", "initial_quantity_kg": 8000, "quality_grade": QualityGrade.GRADE_A, "packaging_type": PackagingType.BAG, "shelf_life_days": 180},
    {"produce_type": ProduceType.POTATO, "harvest_location": "Pune", "initial_quantity_kg": 6000, "quality_grade": QualityGrade.GRADE_A, "packaging_type": PackagingType.BAG, "shelf_life_days": 120},
    {"produce_type": ProduceType.GRAPES, "harvest_location": "Nashik", "initial_quantity_kg": 3000, "quality_grade": QualityGrade.GRADE_A, "packaging_type": PackagingType.CRATE, "shelf_life_days": 56},
    {"produce_type": ProduceType.MANGO, "harvest_location": "Kolar", "initial_quantity_kg": 4000, "quality_grade": QualityGrade.GRADE_A, "packaging_type": PackagingType.BOX, "shelf_life_days": 21},
    {"produce_type": ProduceType.BANANA, "harvest_location": "Mysuru", "initial_quantity_kg": 7000, "quality_grade": QualityGrade.GRADE_A, "packaging_type": PackagingType.CRATE, "shelf_life_days": 14},
    {"produce_type": ProduceType.APPLE, "harvest_location": "Kolar", "initial_quantity_kg": 2500, "quality_grade": QualityGrade.GRADE_A, "packaging_type": PackagingType.BOX, "shelf_life_days": 180},
    {"produce_type": ProduceType.SPINACH, "harvest_location": "Bengaluru", "initial_quantity_kg": 1500, "quality_grade": QualityGrade.GRADE_A, "packaging_type": PackagingType.BAG, "shelf_life_days": 10},
]

async def seed():
    await connect_to_mongo()
    db = get_database()
    
    print("Seeding demo data...")
    
    # Seed users
    user_ids = {}
    for user_data in DEMO_USERS:
        existing = await db.users.find_one({"email": user_data["email"]})
        if existing:
            user_ids[user_data["role"]] = user_ids.get(user_data["role"], []) + [str(existing["_id"])]
            continue
        
        user_doc = {
            "email": user_data["email"],
            "password_hash": get_password_hash(user_data["password"]),
            "full_name": user_data["full_name"],
            "role": user_data["role"],
            "is_active": True,
            "is_approved": user_data["is_approved"],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        result = await db.users.insert_one(user_doc)
        user_ids.setdefault(user_data["role"], []).append(str(result.inserted_id))
        print(f"Created user: {user_data['email']}")
    
    # Seed farms
    farm_ids = []
    for i, farm_data in enumerate(FARMS):
        farmer_id = user_ids.get(UserRole.FARMER, [None])[i % len(user_ids.get(UserRole.FARMER, []))]
        if not farmer_id:
            continue
        existing = await db.farms.find_one({"name": farm_data["name"]})
        if existing:
            farm_ids.append(str(existing["_id"]))
            continue
        farm_doc = {**farm_data, "farmer_id": farmer_id, "is_active": True, "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}
        result = await db.farms.insert_one(farm_doc)
        farm_ids.append(str(result.inserted_id))
        print(f"Created farm: {farm_data['name']}")
    
    # Seed warehouses
    warehouse_ids = []
    warehouse_manager_ids = user_ids.get(UserRole.WAREHOUSE_MANAGER, [])
    for i, wh_data in enumerate(WAREHOUSES):
        manager_id = warehouse_manager_ids[i % len(warehouse_manager_ids)] if warehouse_manager_ids else None
        if not manager_id:
            continue
        existing = await db.warehouses.find_one({"name": wh_data["name"]})
        if existing:
            warehouse_ids.append(str(existing["_id"]))
            continue
        wh_doc = {**wh_data, "manager_id": manager_id, "is_active": True, "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}
        result = await db.warehouses.insert_one(wh_doc)
        warehouse_ids.append(str(result.inserted_id))
        print(f"Created warehouse: {wh_data['name']}")
    
    # Seed transporters
    transporter_ids = []
    transporter_user_ids = user_ids.get(UserRole.TRANSPORTER, [])
    for i, user_id in enumerate(transporter_user_ids):
        existing = await db.transporters.find_one({"user_id": user_id})
        if existing:
            transporter_ids.append(str(existing["_id"]))
            continue
        t_doc = {
            "transporter_id": f"TRN-{i+1:03d}",
            "user_id": user_id,
            "company_name": f"AgriTransit {i+1}",
            "contact_person": DEMO_USERS[6+i]["full_name"],
            "email": DEMO_USERS[6+i]["email"],
            "phone": "+91 98765 00000",
            "address": f"Transport Hub, City {i+1}",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400001",
            "approval_status": "APPROVED",
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        result = await db.transporters.insert_one(t_doc)
        transporter_ids.append(str(result.inserted_id))
        print(f"Created transporter: {t_doc['company_name']}")
    
    # Seed vehicles
    vehicle_ids = []
    for i, v_data in enumerate(VEHICLES):
        transporter_id = transporter_ids[i % len(transporter_ids)] if transporter_ids else None
        if not transporter_id:
            continue
        existing = await db.vehicles.find_one({"registration_number": v_data["registration_number"]})
        if existing:
            vehicle_ids.append(str(existing["_id"]))
            continue
        v_doc = {
            **v_data,
            "transporter_id": transporter_id,
            "available_capacity_kg": v_data["max_payload_kg"],
            "status": VehicleStatus.AVAILABLE,
            "registration_expiry": datetime.now(timezone.utc) + timedelta(days=365),
            "insurance_expiry": datetime.now(timezone.utc) + timedelta(days=180),
            "fitness_expiry": datetime.now(timezone.utc) + timedelta(days=90),
            "last_maintenance_date": datetime.now(timezone.utc) - timedelta(days=30),
            "next_maintenance_date": datetime.now(timezone.utc) + timedelta(days=30),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        result = await db.vehicles.insert_one(v_doc)
        vehicle_ids.append(str(result.inserted_id))
        print(f"Created vehicle: {v_data['registration_number']}")
    
    # Seed drivers
    driver_ids = []
    for i, d_data in enumerate(DRIVERS):
        transporter_id = transporter_ids[i % len(transporter_ids)] if transporter_ids else None
        if not transporter_id:
            continue
        existing = await db.drivers.find_one({"license_number": d_data["license_number"]})
        if existing:
            driver_ids.append(str(existing["_id"]))
            continue
        d_doc = {
            **d_data,
            "driver_id": f"DRV-{i+1:03d}",
            "transporter_id": transporter_id,
            "status": DriverStatus.AVAILABLE,
            "license_expiry": datetime.now(timezone.utc) + timedelta(days=365),
            "address": f"Driver Colony, City {i+1}",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400001",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        result = await db.drivers.insert_one(d_doc)
        driver_ids.append(str(result.inserted_id))
        print(f"Created driver: {d_data['name']}")
    
    # Seed batches
    batch_ids = []
    farmer_ids = user_ids.get(UserRole.FARMER, [])
    for i, b_data in enumerate(PRODUCE_BATCHES):
        farmer_id = farmer_ids[i % len(farmer_ids)] if farmer_ids else None
        farm_id = farm_ids[i % len(farm_ids)] if farm_ids else None
        if not farmer_id or not farm_id:
            continue
        harvest_date = datetime.now(timezone.utc) - timedelta(days=i+1)
        shelf_life_end = harvest_date + timedelta(days=b_data["shelf_life_days"])
        batch_id = f"{b_data['produce_type'][:3].upper()}-NAS-{i+1:03d}"
        existing = await db.produce_batches.find_one({"batch_id": batch_id})
        if existing:
            batch_ids.append(str(existing["_id"]))
            continue
        b_doc = {
            "batch_id": batch_id,
            "produce_type": b_data["produce_type"],
            "farmer_id": farmer_id,
            "farm_id": farm_id,
            "harvest_date": harvest_date,
            "harvest_location": b_data["harvest_location"],
            "initial_quantity_kg": b_data["initial_quantity_kg"],
            "available_quantity_kg": b_data["initial_quantity_kg"],
            "reserved_quantity_kg": 0.0,
            "dispatched_quantity_kg": 0.0,
            "accepted_quantity_kg": 0.0,
            "rejected_quantity_kg": 0.0,
            "quality_grade": b_data["quality_grade"],
            "packaging_type": b_data["packaging_type"],
            "estimated_shelf_life_end": shelf_life_end,
            "handling_requirements": PRODUCE_HANDLING_PROFILES.get(b_data["produce_type"], {}).get("special_handling"),
            "status": BatchStatus.CREATED,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        result = await db.produce_batches.insert_one(b_doc)
        batch_ids.append(batch_id)
        print(f"Created batch: {batch_id}")
    
    # Seed ledger events
    print("Seeding ledger events...")
    for i, batch_id in enumerate(batch_ids[:5]):
        await append_ledger_block(
            db,
            event_type=LedgerEventType.PRODUCE_BATCH_CREATED,
            entity_type="PRODUCE_BATCH",
            entity_id=batch_id,
            actor_id=farmer_ids[0] if farmer_ids else "",
            actor_role=UserRole.FARMER,
            event_summary=f"Harvest batch {batch_id} created",
            payload={"batch_id": batch_id, "produce_type": PRODUCE_BATCHES[i]["produce_type"] if i < len(PRODUCE_BATCHES) else "UNKNOWN"},
        )
    
    print("\nDemo data seeding complete!")
    print("\nDemo credentials:")
    for u in DEMO_USERS[:5]:
        print(f"  {u['email']} / {u['password']} ({u['role']})")
    
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(seed())
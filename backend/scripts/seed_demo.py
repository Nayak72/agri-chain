#!/usr/bin/env python3
"""Seed a small, repeatable six-role Nashik-to-Bengaluru demonstration."""
import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.db.mongodb import connect_to_mongo, close_mongo_connection, get_database
from app.db.unit_of_work import run_in_txn
from app.core.security import get_password_hash
from app.core.constants import LedgerEventType
from app.services.ledger_service import append_ledger_block

USERS = [
    ("admin", "ADMIN", "System Administrator"),
    ("farmer1", "FARMER", "Nashik Farmer"),
    ("warehouse1", "WAREHOUSE_MANAGER", "Bengaluru Warehouse Manager"),
    ("transporter1", "TRANSPORTER", "Cold Chain Transporter"),
    ("driver1", "DRIVER", "Reefer Driver"),
    ("buyer1", "BUYER", "Bengaluru Buyer"),
]

PASSWORD_BY_ROLE = {
    "ADMIN": "Admin123!",
    "FARMER": "Farmer123!",
    "WAREHOUSE_MANAGER": "Warehouse123!",
    "TRANSPORTER": "Transporter123!",
    "DRIVER": "Driver123!",
    "BUYER": "Buyer123!",
}


async def ensure(db, collection, key, document):
    existing = await db[collection].find_one(key)
    if existing:
        return existing
    await db[collection].insert_one(document)
    return document


async def seed():
    await connect_to_mongo()
    try:
        db = get_database()
        now = datetime.now(timezone.utc)
        users = {}
        for name, role, full_name in USERS:
            email = f"{name}@agrichain.com"
            users[role] = await ensure(db, "users", {"email": email}, {
                "email": email, "password_hash": get_password_hash(PASSWORD_BY_ROLE[role]),
                "full_name": full_name, "role": role, "is_active": True,
                "is_approved": True, "created_at": now, "updated_at": now,
            })
        farmer_id = str(users["FARMER"]["_id"])
        manager_id = str(users["WAREHOUSE_MANAGER"]["_id"])
        transporter_user_id = str(users["TRANSPORTER"]["_id"])
        farm = await ensure(db, "farms", {"name": "Nashik Tomato Farm"}, {
            "name": "Nashik Tomato Farm", "farmer_id": farmer_id,
            "city": "Nashik", "state": "Maharashtra", "pincode": "422001",
            "is_active": True, "created_at": now, "updated_at": now,
        })
        await ensure(db, "warehouses", {"name": "Bengaluru Cold Warehouse"}, {
            "name": "Bengaluru Cold Warehouse", "manager_id": manager_id,
            "city": "Bengaluru", "state": "Karnataka", "pincode": "560001",
            "capacity_kg": 10000, "has_refrigeration": True,
            "is_active": True, "created_at": now, "updated_at": now,
        })
        transporter = await ensure(db, "transporters", {"user_id": transporter_user_id}, {
            "transporter_id": "TRN-DEMO", "user_id": transporter_user_id,
            "company_name": "AgriChain Cold Transport", "contact_person": "Cold Chain Transporter",
            "email": "transporter1@agrichain.com", "phone": "+919876500000",
            "city": "Nashik", "state": "Maharashtra", "pincode": "422001",
            "approval_status": "APPROVED", "is_active": True,
            "created_at": now, "updated_at": now,
        })
        transporter_id = str(transporter["_id"])
        for number in (1, 2):
            await ensure(db, "vehicles", {"registration_number": f"MH15RE{number:04d}"}, {
                "vehicle_id": f"VEH-DEMO-{number}",
                "registration_number": f"MH15RE{number:04d}",
                "transporter_id": transporter_id, "category": "REFRIGERATED_TRUCK",
                "vehicle_type": "10T_TRUCK", "max_payload_kg": 10000,
                "refrigeration_available": True, "temperature_min": 7,
                "temperature_max": 13, "status": "AVAILABLE",
                "created_at": now, "updated_at": now,
            })
            await ensure(db, "drivers", {"driver_id": f"DRV-DEMO-{number}"}, {
                "driver_id": f"DRV-DEMO-{number}", "user_id": str(users["DRIVER"]["_id"]) if number == 1 else None,
                "name": f"Reefer Driver {number}", "phone": f"+91987650000{number}",
                "city": "Nashik", "state": "Maharashtra", "transporter_id": transporter_id,
                "status": "AVAILABLE", "created_at": now, "updated_at": now,
            })
        if not await db.produce_batches.find_one({"batch_id": "TOM-NAS-DEMO"}):
            batch = {
                "batch_id": "TOM-NAS-DEMO", "produce_type": "TOMATO",
                "farmer_id": farmer_id, "farm_id": str(farm["_id"]),
                "harvest_location": "Nashik", "initial_quantity_kg": 2000,
                "quality_grade": "GRADE_A", "packaging_type": "CRATE",
                "estimated_shelf_life_end": (now + timedelta(days=14)).date().isoformat(),
                "status": "CREATED", "created_by": farmer_id,
                "created_at": now, "updated_at": now,
            }
            async def create_batch(session):
                result = await db.produce_batches.insert_one(batch, session=session)
                await append_ledger_block(
                    db, event_type=LedgerEventType.PRODUCE_BATCH_CREATED,
                    entity_type="PRODUCE_BATCH", entity_id=str(result.inserted_id),
                    actor_id=farmer_id, actor_role="FARMER",
                    event_summary="Demo tomato batch created",
                    payload={"batch_id": batch["batch_id"], "initial_quantity_kg": 2000},
                    session=session,
                )
            await run_in_txn(create_batch)
        print("Demo ready: six roles, Nashik tomato batch (2000 kg), Bengaluru warehouse, two reefers and drivers.")
        print("Demo passwords follow Role123! (for example, Admin123!).")
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(seed())

"""
AgriChain HTTP-level acceptance harness.

Run from the backend/ folder:
    pip install mongomock-motor httpx
    python smoke_acceptance.py

It boots the real FastAPI app against an in-memory Mongo (mongomock-motor),
logs in as all six roles and fires real HTTP requests.
Every line prints PASS/FAIL.  On the ORIGINAL code the 10 checks marked
[BUG] FAIL.  After the fixes, ALL checks must PASS (exit code 0).
Extend this file as you fix more items - one check per bug.
"""
import asyncio, logging, os, sys
sys.path.insert(0, ".")
os.environ.update(JWT_SECRET_KEY="x" * 40, SIMULATOR_ENABLED="false", UPLOAD_DIRECTORY="/tmp/agri_up")
logging.disable(logging.NOTSET)

import httpx
from bson import ObjectId
from datetime import datetime, timezone
from mongomock_motor import AsyncMongoMockClient

import app.db.mongodb as mongo
from app.main import app
from app.db.indexes import create_indexes
from app.core.security import get_password_hash

RESULTS = []


def check(name, ok, detail=""):
    RESULTS.append(ok)
    print(f"{'PASS' if ok else 'FAIL'}  {name}  {detail}")


async def main():
    client = AsyncMongoMockClient()
    db = client["smoke"]
    mongo._client, mongo._database, mongo._supports_transactions = client, db, False
    await create_indexes(db)
    now = datetime.now(timezone.utc)

    ids = {}
    for role in ["ADMIN", "FARMER", "BUYER", "TRANSPORTER", "DRIVER", "WAREHOUSE_MANAGER"]:
        r = await db.users.insert_one({
            "email": f"{role.lower()}@x.com", "password_hash": get_password_hash("Passw0rd!"),
            "full_name": role.title(), "phone": None, "role": role, "is_active": True,
            "is_approved": True, "created_at": now, "updated_at": now})
        ids[role] = str(r.inserted_id)

    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        H = {}
        for role in ids:
            r = await c.post("/api/v1/auth/login", json={"email": f"{role.lower()}@x.com", "password": "Passw0rd!"})
            H[role] = {"Authorization": "Bearer " + r.json()["access_token"]}
        api = "/api/v1"

        # ---- legacy / seed-shaped data must never crash list endpoints ----
        await db.farms.insert_one({"farmer_id": ids["FARMER"], "name": "Seed Farm", "address": "addr1",
                                   "city": "Pune", "state": "MH", "pincode": "411001",
                                   "is_active": True, "created_at": now, "updated_at": now})
        r = await c.get(f"{api}/farms", headers=H["FARMER"])
        check("[BUG] GET /farms tolerates docs missing optional fields", r.status_code == 200, r.status_code)

        r = await c.post(f"{api}/farms", headers=H["FARMER"], json={
            "name": "API Farm", "address": "addr12", "city": "Pune", "state": "MH", "pincode": "411001"})
        farm_id = r.json()["id"]

        def batch_body(**kw):
            b = {"produce_type": "TOMATO", "farm_id": farm_id, "harvest_date": "2026-11-01",
                 "harvest_location": "Pune", "initial_quantity_kg": 100, "estimated_shelf_life_days": 10}
            b.update(kw); return b

        r = await c.post(f"{api}/batches", headers=H["FARMER"], json=batch_body())
        batch = r.json()
        r = await c.post(f"{api}/batches", headers=H["FARMER"], json=batch_body(estimated_shelf_life_days=10**9))
        check("[BUG] absurd shelf-life -> 422 (not 500)", r.status_code == 422, r.status_code)

        r = await c.patch(f"{api}/batches/{batch['id']}", headers=H["BUYER"], json={"quality_grade": "GRADE_C"})
        check("[BUG] BUYER cannot PATCH a farmer's batch", r.status_code == 403, r.status_code)
        r = await c.patch(f"{api}/batches/{batch['id']}", headers=H["FARMER"], json={"status": "DELIVERED"})
        check("farmer cannot jump batch status to DELIVERED", r.status_code in (400, 403, 422), r.status_code)

        def po_body(qty, price):
            return {"seller_id": ids["FARMER"], "produce_type": "TOMATO", "batch_id": batch["id"],
                    "requested_quantity_kg": qty, "unit_price_paise": price,
                    "preferred_delivery_date": "2026-12-01", "pickup_address": "a", "delivery_address": "b"}

        r = await c.post(f"{api}/purchase-orders", headers=H["BUYER"], json=po_body(12.55, 10150))
        check("[BUG] PO with fractional total (12.55kg x 10150p) succeeds", r.status_code == 200, r.status_code)
        r = await c.post(f"{api}/purchase-orders", headers=H["BUYER"], json=po_body(10, 1000))
        po = r.json()
        r = await c.post(f"{api}/purchase-orders/{po['id']}/accept", headers=H["BUYER"])
        check("[BUG] BUYER cannot accept their own PO", r.status_code == 403, r.status_code)

        # ---- warehouse receipts: second receipt must not hit duplicate-null index ----
        r = await c.post(f"{api}/warehouses", headers=H["WAREHOUSE_MANAGER"], json={
            "name": "WH1", "address": "addr12", "city": "Pune", "state": "MH", "pincode": "411001", "capacity_kg": 10000})
        wh = r.json()
        b2 = (await c.post(f"{api}/batches", headers=H["FARMER"], json=batch_body(produce_type="ONION", initial_quantity_kg=50))).json()

        def receipt(b, q):
            return {"warehouse_id": wh["id"], "batch_id": b["id"], "farmer_id": ids["FARMER"],
                    "received_weight_kg": q, "accepted_weight_kg": q, "storage_location": "A1"}

        r1 = await c.post(f"{api}/inventory/warehouses/{wh['id']}/receipts", headers=H["WAREHOUSE_MANAGER"], json=receipt(batch, 100))
        r2 = await c.post(f"{api}/inventory/warehouses/{wh['id']}/receipts", headers=H["WAREHOUSE_MANAGER"], json=receipt(b2, 50))
        check("[BUG] 2nd warehouse receipt (other batch) succeeds", r1.status_code == 200 and r2.status_code == 200,
              f"{r1.status_code}/{r2.status_code}")
        bb = await db.produce_batches.find_one({"_id": ObjectId(batch["id"])})
        check("[BUG] batch available_quantity not double-counted on receipt (<=100)",
              bb["available_quantity_kg"] <= 100.0, bb["available_quantity_kg"])

        # ---- transporter / vehicle ----
        t = await c.post(f"{api}/transporters", headers=H["TRANSPORTER"], json={
            "company_name": "TCo", "contact_person": "Bob", "email": "t@x.com", "phone": "+919999999999",
            "address": "addr12", "city": "Pune", "state": "MH", "pincode": "411001"})
        tid = t.json()["id"]
        await c.patch(f"{api}/transporters/{tid}", headers=H["TRANSPORTER"], json={"approval_status": "APPROVED"})
        doc = await db.transporters.find_one({"_id": ObjectId(tid)})
        check("[BUG] transporter cannot self-approve", doc["approval_status"] != "APPROVED", doc["approval_status"])
        r = await c.patch(f"{api}/transporters/{tid}", headers=H["BUYER"], json={"company_name": "HACKED"})
        check("[BUG] BUYER cannot edit a transporter", r.status_code == 403, r.status_code)

        v = await c.post(f"{api}/vehicles", headers=H["TRANSPORTER"], json={
            "registration_number": "MH12AB1234", "category": "REFRIGERATED_TRUCK", "vehicle_type": "10T_TRUCK",
            "max_payload_kg": 10000, "refrigeration_available": True, "registration_expiry": "2030-01-01",
            "insurance_expiry": "2030-01-01", "fitness_expiry": "2030-01-01"})
        r = await c.patch(f"{api}/vehicles/{v.json()['id']}", headers=H["TRANSPORTER"], json={"insurance_expiry": "2031-01-01"})
        check("[BUG] PATCH /vehicles with a date field succeeds", r.status_code == 200, r.status_code)

        # ---- free-text search must be escaped ----
        r = await c.get(f"{api}/users", headers=H["ADMIN"], params={"search": "(unclosed"})
        check("[BUG] /users?search=(unclosed does not 500", r.status_code == 200, r.status_code)

        # ---- Approve transporter by admin ----
        r = await c.post(f"{api}/transporters/{tid}/approve", headers=H["ADMIN"])
        check("ADMIN approves transporter", r.status_code == 200, r.status_code)

        # ---- Driver profile & link user account ----
        drv_res = await c.post(f"{api}/drivers", headers=H["TRANSPORTER"], json={
            "transporter_id": tid, "name": "Ramesh Kumar",
            "license_number": "MH1220200012345",
            "license_expiry": "2030-01-01", "phone": "+919888888888", "email": "driver@x.com",
            "address": "Pune Station Road", "city": "Pune", "state": "Maharashtra", "pincode": "411001"
        })
        drv_id = drv_res.json()["id"]
        r = await c.post(f"{api}/drivers/{drv_id}/link-user", headers=H["TRANSPORTER"], json={"user_id": ids["DRIVER"]})
        check("Link driver to user account", r.status_code == 200, r.status_code)

        # ---- Farmer accepts PO ----
        r = await c.post(f"{api}/purchase-orders/{po['id']}/accept", headers=H["FARMER"])
        check("Farmer accepts PO", r.status_code == 200, r.status_code)

        # ---- Freight Booking ----
        fb_res = await c.post(f"{api}/freight-bookings", headers=H["BUYER"], json={
            "purchase_order_id": po["id"],
            "batch_ids": [batch["id"]],
            "cargo_quantity_kg": 10.0,
            "total_cargo_weight_kg": 10.0,
            "package_count": 1,
            "pickup_address": "Pune Central WH",
            "pickup_city": "Pune",
            "pickup_state": "Maharashtra",
            "destination_address": "APMC Vashi",
            "destination_city": "Navi Mumbai",
            "destination_state": "Maharashtra",
            "requested_pickup_date": "2026-12-01",
            "required_delivery_date": "2026-12-02",
            "preferred_vehicle_category": "REFRIGERATED_TRUCK"
        })
        check("Buyer creates freight booking", fb_res.status_code == 200, fb_res.status_code)
        booking_id = fb_res.json()["id"]

        # ---- Transporter quotes and Buyer accepts ----
        q_res = await c.post(f"{api}/freight-quotes", headers=H["TRANSPORTER"], json={
            "booking_id": booking_id,
            "proposed_vehicle_category": "REFRIGERATED_TRUCK",
            "freight_base_charge_paise": 500000,
            "planned_distance_km": 150.0,
            "estimated_transit_hours": 4.5,
            "expected_pickup_date": "2026-12-01",
            "expected_delivery_date": "2026-12-02"
        })
        quote_id = q_res.json()["id"]
        r = await c.post(f"{api}/freight-quotes/{quote_id}/accept", headers=H["BUYER"])
        check("Buyer accepts freight quotation", r.status_code == 200, r.status_code)

        # ---- Transporter creates Shipment ----
        s_res = await c.post(f"{api}/shipments", headers=H["TRANSPORTER"], json={
            "booking_id": booking_id,
            "accepted_quotation_id": quote_id,
            "vehicle_id": v.json()["id"],
            "driver_id": drv_id
        })
        check("Transporter creates shipment", s_res.status_code == 200, s_res.status_code)
        shipment_id = s_res.json()["id"]

        # ---- Shipment State Machine Flow ----
        # Load
        r = await c.post(f"{api}/shipments/{shipment_id}/load", headers=H["TRANSPORTER"], json={
            "actual_weight_kg": 10.0, "actual_package_count": 1, "batch_quantities": []
        })
        check("Shipment load transition", r.status_code == 200 and r.json()["status"] == "LOADED", r.status_code)

        # Dispatch
        r = await c.post(f"{api}/shipments/{shipment_id}/dispatch", headers=H["TRANSPORTER"])
        check("Shipment dispatch transition", r.status_code == 200 and r.json()["status"] == "DISPATCHED", r.status_code)

        # Start transit
        r = await c.post(f"{api}/shipments/{shipment_id}/start-transit", headers=H["DRIVER"])
        check("Driver start transit transition", r.status_code == 200 and r.json()["status"] == "IN_TRANSIT", r.status_code)

        # Checkpoint
        r = await c.post(f"{api}/checkpoints", headers=H["DRIVER"], json={
            "shipment_id": shipment_id, "name": "Kalyan Toll", "city": "Kalyan", "state": "Maharashtra", "sequence": 1
        })
        check("Driver records corridor checkpoint", r.status_code == 200, r.status_code)

        # Arrive
        r = await c.post(f"{api}/shipments/{shipment_id}/arrive", headers=H["DRIVER"])
        check("Driver arrives at destination", r.status_code == 200 and r.json()["status"] == "ARRIVED_AT_DESTINATION", r.status_code)

        # Out for delivery
        r = await c.post(f"{api}/shipments/{shipment_id}/out-for-delivery", headers=H["DRIVER"])
        check("Driver sets out for delivery", r.status_code == 200 and r.json()["status"] == "OUT_FOR_DELIVERY", r.status_code)

        # Delivery report
        r = await c.post(f"{api}/delivery/shipments/{shipment_id}/delivery-report", headers=H["DRIVER"], json={
            "shipment_id": shipment_id,
            "delivered_quantity_kg": 10.0,
            "damaged_quantity_kg": 0.0,
            "missing_quantity_kg": 0.0,
            "received_by": "Buyer Consignee",
            "status": "DELIVERED"
        })
        check("Driver submits delivery report", r.status_code == 200, r.status_code)

        # Buyer confirms delivery
        r = await c.post(f"{api}/delivery/shipments/{shipment_id}/confirm-delivery", headers=H["BUYER"])
        check("Buyer confirms delivery acceptance", r.status_code == 200, r.status_code)

        # Verify vehicle & driver released to AVAILABLE
        veh_doc = await db.vehicles.find_one({"_id": ObjectId(v.json()["id"])})
        drv_doc = await db.drivers.find_one({"_id": ObjectId(drv_id)})
        check("Vehicle and driver released to AVAILABLE after delivery",
              veh_doc["status"] == "AVAILABLE" and drv_doc["status"] == "AVAILABLE",
              f"v:{veh_doc['status']} d:{drv_doc['status']}")

        # ---- Cancellation releases vehicle and driver ----
        po2 = (await c.post(f"{api}/purchase-orders", headers=H["BUYER"], json=po_body(15, 1200))).json()
        await c.post(f"{api}/purchase-orders/{po2['id']}/accept", headers=H["FARMER"])

        fb2 = (await c.post(f"{api}/freight-bookings", headers=H["BUYER"], json={
            "purchase_order_id": po2["id"],
            "batch_ids": [batch["id"]],
            "cargo_quantity_kg": 15.0,
            "total_cargo_weight_kg": 15.0,
            "package_count": 1,
            "pickup_address": "Pune Central WH",
            "pickup_city": "Pune",
            "pickup_state": "Maharashtra",
            "destination_address": "APMC Vashi",
            "destination_city": "Navi Mumbai",
            "destination_state": "Maharashtra",
            "requested_pickup_date": "2026-12-05",
            "required_delivery_date": "2026-12-06",
            "preferred_vehicle_category": "REFRIGERATED_TRUCK"
        })).json()
        q2 = (await c.post(f"{api}/freight-quotes", headers=H["TRANSPORTER"], json={
            "booking_id": fb2["id"],
            "proposed_vehicle_category": "REFRIGERATED_TRUCK",
            "freight_base_charge_paise": 300000,
            "planned_distance_km": 150.0,
            "estimated_transit_hours": 4.5,
            "expected_pickup_date": "2026-12-05",
            "expected_delivery_date": "2026-12-06"
        })).json()
        await c.post(f"{api}/freight-quotes/{q2['id']}/accept", headers=H["BUYER"])
        s2 = (await c.post(f"{api}/shipments", headers=H["TRANSPORTER"], json={
            "booking_id": fb2["id"],
            "accepted_quotation_id": q2["id"],
            "vehicle_id": v.json()["id"],
            "driver_id": drv_id
        })).json()
        r = await c.post(f"{api}/shipments/{s2['id']}/cancel", headers=H["TRANSPORTER"], json={"reason": "Customer cancellation"})
        check("Shipment cancellation succeeds", r.status_code == 200, r.status_code)
        veh2 = await db.vehicles.find_one({"_id": ObjectId(v.json()["id"])})
        drv2 = await db.drivers.find_one({"_id": ObjectId(drv_id)})
        check("Vehicle and driver released to AVAILABLE after cancellation",
              veh2["status"] == "AVAILABLE" and drv2["status"] == "AVAILABLE",
              f"v:{veh2['status']} d:{drv2['status']}")

    failed = RESULTS.count(False)
    print(f"\n{len(RESULTS) - failed}/{len(RESULTS)} passed")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    asyncio.run(main())

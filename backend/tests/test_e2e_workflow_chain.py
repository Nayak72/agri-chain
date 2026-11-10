"""End-to-End Workflow Chain Test.

Validates the full multi-role transactional lifecycle:
1. Harvest batch creation (Farmer)
2. Warehouse intake with exact weight reconciliation (Warehouse Manager)
3. Quality grading inspection (Warehouse Manager)
4. Purchase Order creation & acceptance (Buyer & Farmer)
5. Freight booking creation & quotation acceptance (Buyer & Transporter)
6. Shipment consignment creation & dispatch (Transporter)
7. Checkpoint logging along corridor (Driver)
8. Delivery report submission (Driver)
9. Consignment confirmation & audit sealing (Buyer)
"""

import pytest
from bson import ObjectId
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, date, timezone
from app.core.constants import (
    UserRole, ProduceType, QualityGrade, InspectionResult,
    WarehouseReceiptStatus, PurchaseOrderStatus, FreightBookingStatus,
    ShipmentStatus, DeliveryStatus, VehicleCategory
)
from app.api.v1.endpoints.inventory import (
    create_warehouse_receipt, WarehouseReceiptCreate,
    create_quality_inspection, QualityInspectionCreate
)
from app.api.v1.endpoints.purchase_orders import (
    create_purchase_order, PurchaseOrderCreate,
    accept_purchase_order
)
from app.api.v1.endpoints.freight_bookings import (
    create_freight_booking, FreightBookingCreate
)
from app.api.v1.endpoints.freight_quotes import (
    create_freight_quotation, FreightQuotationCreate,
    accept_freight_quotation
)
from app.api.v1.endpoints.shipments import (
    create_shipment, ShipmentCreate,
    load_shipment, ShipmentLoad,
    dispatch_shipment, start_transit,
    arrive_at_destination, set_out_for_delivery
)
from app.api.v1.endpoints.checkpoints import (
    create_checkpoint, CheckpointCreate
)
from app.api.v1.endpoints.delivery import (
    create_delivery_report, DeliveryReportCreate,
    confirm_delivery
)


@pytest.mark.asyncio
async def test_full_lifecycle_workflow_chain():
    """Simulates the interconnected 6-role supply chain flow."""
    # Shared IDs
    farmer_id = str(ObjectId())
    buyer_id = str(ObjectId())
    transporter_user_id = str(ObjectId())
    transporter_record_id = str(ObjectId())
    driver_id = str(ObjectId())
    wh_mgr_id = str(ObjectId())
    wh_id = str(ObjectId())
    batch_oid = ObjectId()
    batch_id_str = str(batch_oid)

    # In-memory storage mock to simulate state progression
    state = {
        "batches": {
            batch_id_str: {
                "_id": batch_oid,
                "batch_id": "BATCH-PUN-001",
                "farmer_id": farmer_id,
                "produce_type": ProduceType.TOMATO,
                "harvested_quantity_kg": 5000.0,
                "available_quantity_kg": 0.0,
                "estimated_shelf_life_end": datetime.now(timezone.utc),
            }
        },
        "warehouses": {
            wh_id: {
                "_id": ObjectId(wh_id),
                "name": "Central Agro Hub",
                "manager_id": wh_mgr_id,
            }
        },
        "users": {
            farmer_id: {"_id": ObjectId(farmer_id), "role": UserRole.FARMER, "email": "farmer@test.com"},
            buyer_id: {"_id": ObjectId(buyer_id), "role": UserRole.BUYER, "email": "buyer@test.com"},
        },
        "receipts": {},
        "purchase_orders": {},
        "bookings": {},
        "quotes": {},
        "shipments": {},
        "transporters": {
            transporter_user_id: {
                "_id": ObjectId(transporter_record_id),
                "transporter_id": "TR-001",
                "user_id": transporter_user_id,
                "approval_status": "APPROVED",
                "is_active": True,
            }
        },
        "vehicles": {},
        "drivers": {},
        "checkpoints": {},
        "delivery_reports": {},
        "ledger": [],
    }

    vehicle_id = str(ObjectId())
    state["vehicles"][vehicle_id] = {
        "_id": ObjectId(vehicle_id),
        "vehicle_id": "VEH-MH-001",
        "transporter_id": transporter_record_id,
        "max_payload_kg": 5000.0,
        "capacity_kg": 5000.0,
        "refrigeration_available": True,
        "is_refrigerated": True,
        "status": "AVAILABLE",
    }

    state["drivers"][driver_id] = {
        "_id": ObjectId(driver_id),
        "driver_id": "DRV-MH-001",
        "user_id": driver_id,
        "transporter_id": transporter_record_id,
        "status": "AVAILABLE",
    }

    def update_batch(q, u, *a, **k):
        b = state["batches"].get(str(q.get("_id")))
        if b:
            if "$inc" in u:
                for field, delta in u["$inc"].items():
                    b[field] = b.get(field, 0.0) + delta
            if "$set" in u:
                b.update(u["$set"])
        return MagicMock(modified_count=1)

    mock_db = MagicMock()
    mock_db.warehouses.find_one = AsyncMock(side_effect=lambda q, *a, **k: state["warehouses"].get(str(q.get("_id"))))
    mock_db.produce_batches.find_one = AsyncMock(side_effect=lambda q, *a, **k: state["batches"].get(str(q.get("_id"))))
    mock_db.produce_batches.update_one = AsyncMock(side_effect=update_batch)
    mock_db.users.find_one = AsyncMock(side_effect=lambda q, *a, **k: state["users"].get(str(q.get("_id"))))
    mock_db.warehouse_receipts.insert_one = AsyncMock(side_effect=lambda doc, *a, **k: MagicMock(inserted_id=ObjectId()))
    mock_db.warehouse_receipts.find_one = AsyncMock(side_effect=lambda q, *a, **k: state["receipts"].get(str(q.get("_id"))))
    mock_db.warehouse_receipts.update_one = AsyncMock()
    mock_db.inventory_items.insert_one = AsyncMock(return_value=MagicMock(inserted_id=ObjectId()))
    mock_db.inventory_items.find_one = AsyncMock(return_value=None)
    mock_db.inventory_items.update_one = AsyncMock()
    mock_db.ledger_heads.find_one = AsyncMock(return_value={"chain_id": "agrichain_main", "last_index": 1, "last_hash": "0" * 64})
    mock_db.ledger_heads.find_one_and_update = AsyncMock(return_value={"chain_id": "agrichain_main", "last_index": 1, "last_hash": "0" * 64})
    mock_db.ledger_heads.update_one = AsyncMock()
    mock_db.ledger_blocks.insert_one = AsyncMock(return_value=MagicMock(inserted_id=ObjectId()))
    mock_db.ledger_blocks.find_one = AsyncMock(return_value=None)
    mock_db.audit_logs.insert_one = AsyncMock(return_value=MagicMock(inserted_id=ObjectId()))
    mock_db.outbox_events.insert_one = AsyncMock(return_value=MagicMock(inserted_id=ObjectId()))
    mock_db.outbox_events.find_one = AsyncMock(return_value=None)
    mock_db.sensor_sessions.update_many = AsyncMock()
    mock_db.freight_bookings.find_one = AsyncMock(
        side_effect=lambda q, *a, **k: state["bookings"].get(str(q.get("_id"))) if "_id" in q else None
    )
    mock_db.freight_bookings.update_one = AsyncMock(
        side_effect=lambda q, u, *a, **k: state["bookings"].get(str(q.get("_id")), {}).update(u.get("$set", {}))
    )
    mock_db.freight_quotations.update_one = AsyncMock(
        side_effect=lambda q, u, *a, **k: state["quotes"].get(str(q.get("_id")), {}).update(u.get("$set", {}))
    )
    mock_db.freight_quotations.update_many = AsyncMock()
    mock_db.shipments.update_one = AsyncMock(
        side_effect=lambda q, u, *a, **k: state["shipments"].get(str(q.get("_id")), {}).update(u.get("$set", {}))
    )
    mock_db.shipment_items.insert_one = AsyncMock(return_value=MagicMock(inserted_id=ObjectId()))

    # 1. Warehouse Intake (exact reconciliation: 5000 = 4800 + 150 + 50)
    receipt_in = WarehouseReceiptCreate(
        warehouse_id=wh_id,
        batch_id=batch_id_str,
        farmer_id=farmer_id,
        received_weight_kg=5000.0,
        accepted_weight_kg=4800.0,
        damaged_weight_kg=150.0,
        rejected_weight_kg=50.0,
        inspection_result=InspectionResult.PASSED,
        quality_grade=QualityGrade.GRADE_A,
        packaging_condition="GOOD",
        storage_location="Bay 3",
    )
    wh_user = {"sub": wh_mgr_id, "role": UserRole.WAREHOUSE_MANAGER}
    receipt_res = await create_warehouse_receipt(wh_id, receipt_in, current_user=wh_user, db=mock_db)
    assert receipt_res.accepted_weight_kg == 4800.0
    state["receipts"][receipt_res.id] = {
        "_id": ObjectId(receipt_res.id),
        "receipt_id": receipt_res.receipt_id,
        "batch_id": batch_id_str,
        "warehouse_id": wh_id,
        "status": WarehouseReceiptStatus.RECEIVED,
        "quality_grade": QualityGrade.GRADE_A,
    }

    # 2. Quality Grading Inspection
    mock_db.quality_inspections.insert_one = AsyncMock(return_value=MagicMock(inserted_id=ObjectId()))
    inspection_in = QualityInspectionCreate(
        receipt_id=receipt_res.id,
        batch_id=batch_id_str,
        inspector_id=wh_mgr_id,
        visual_quality_score=94.0,
        size_uniformity_score=92.0,
        ripeness_score=88.0,
        defect_percentage=1.5,
        foreign_matter_present=False,
        result=InspectionResult.PASSED,
        quality_grade=QualityGrade.GRADE_A,
    )
    inspection_res = await create_quality_inspection(inspection_in, current_user=wh_user, db=mock_db)
    assert inspection_res.result == InspectionResult.PASSED
    assert inspection_res.quality_grade == QualityGrade.GRADE_A

    # 3. Buyer Creates Purchase Order
    po_oid = ObjectId()
    po_id_str = str(po_oid)
    mock_db.purchase_orders.insert_one = AsyncMock(return_value=MagicMock(inserted_id=po_oid))
    po_in = PurchaseOrderCreate(
        seller_id=farmer_id,
        produce_type=ProduceType.TOMATO,
        batch_id=batch_id_str,
        requested_quantity_kg=2500.0,
        unit_price_paise=3500,  # ₹35/kg
        preferred_delivery_date=date(2026, 12, 1),
        pickup_address="Central Agro Hub, Nashik",
        delivery_address="APMC Market, Vashi",
    )
    buyer_user = {"sub": buyer_id, "role": UserRole.BUYER}
    po_res = await create_purchase_order(po_in, current_user=buyer_user, db=mock_db)
    assert po_res.total_amount_paise == 2500.0 * 3500
    po_doc = po_res.model_dump()
    po_doc.pop("id", None)
    po_doc["_id"] = ObjectId(po_res.id)
    po_doc["batch_id"] = batch_id_str
    po_doc["pickup_state"] = "Maharashtra"
    po_doc["destination_state"] = "Maharashtra"
    state["purchase_orders"][po_res.id] = po_doc

    # 4. Farmer Accepts Purchase Order
    mock_db.purchase_orders.find_one = AsyncMock(side_effect=lambda q, *a, **k: state["purchase_orders"].get(str(q.get("_id"))))
    mock_db.purchase_orders.update_one = AsyncMock(side_effect=lambda q, u, *a, **k: state["purchase_orders"][str(q["_id"])].update(u.get("$set", {})))
    farmer_user = {"sub": farmer_id, "role": UserRole.FARMER}
    accept_res = await accept_purchase_order(po_res.id, current_user=farmer_user, db=mock_db)
    assert accept_res.status == PurchaseOrderStatus.ACCEPTED
    assert state["purchase_orders"][po_res.id]["status"] == PurchaseOrderStatus.ACCEPTED

    # 5. Buyer Creates Freight Booking
    booking_oid = ObjectId()
    booking_id_str = str(booking_oid)
    mock_db.freight_bookings.insert_one = AsyncMock(return_value=MagicMock(inserted_id=booking_oid))
    fb_in = FreightBookingCreate(
        purchase_order_id=po_res.id,
        batch_ids=[batch_id_str],
        cargo_quantity_kg=2500.0,
        total_cargo_weight_kg=2500.0,
        package_count=120,
        pickup_address="Central Agro Hub, Nashik",
        pickup_city="Nashik",
        pickup_state="Maharashtra",
        destination_address="APMC Market, Vashi",
        destination_city="Navi Mumbai",
        destination_state="Maharashtra",
        requested_pickup_date=date(2026, 12, 1),
        required_delivery_date=date(2026, 12, 2),
        preferred_vehicle_category=VehicleCategory.REFRIGERATED_TRUCK,
    )
    fb_res = await create_freight_booking(fb_in, current_user=buyer_user, db=mock_db)
    assert fb_res.cargo_quantity_kg == 2500.0
    fb_doc = fb_res.model_dump()
    fb_doc.pop("id", None)
    fb_doc["_id"] = ObjectId(fb_res.id)
    fb_doc["batch_ids"] = [batch_id_str]
    state["bookings"][fb_res.id] = fb_doc

    # 6. Transporter Submits Quotation
    mock_db.transporters.find_one = AsyncMock(side_effect=lambda q, *a, **k: state["transporters"].get(q.get("user_id")))
    mock_db.freight_bookings.find_one = AsyncMock(side_effect=lambda q, *a, **k: state["bookings"].get(str(q.get("_id"))))
    mock_db.freight_quotations.find_one = AsyncMock(side_effect=lambda q, *a, **k: state["quotes"].get(str(q.get("_id"))) if "_id" in q else None)
    quote_oid = ObjectId()
    mock_db.freight_quotations.insert_one = AsyncMock(return_value=MagicMock(inserted_id=quote_oid))
    quote_in = FreightQuotationCreate(
        booking_id=fb_res.id,
        proposed_vehicle_category="REFRIGERATED_TRUCK",
        freight_base_charge_paise=1800000,
        planned_distance_km=150.0,
        estimated_transit_hours=10.0,
        expected_pickup_date=date(2026, 12, 1),
        expected_delivery_date=date(2026, 12, 2),
    )
    transporter_user = {"sub": transporter_user_id, "role": UserRole.TRANSPORTER}
    quote_res = await create_freight_quotation(quote_in, current_user=transporter_user, db=mock_db)
    q_doc = quote_res.model_dump()
    q_doc.pop("id", None)
    q_doc["_id"] = ObjectId(quote_res.id)
    state["quotes"][quote_res.id] = q_doc

    # 7. Buyer Accepts Quotation -> Freight Booking Confirmed
    mock_db.freight_quotations.find_one = AsyncMock(side_effect=lambda q, *a, **k: state["quotes"].get(str(q.get("_id"))))
    mock_db.freight_quotations.update_one = AsyncMock(side_effect=lambda q, u, *a, **k: state["quotes"][str(q["_id"])].update(u.get("$set", {})))
    mock_db.freight_quotations.update_many = AsyncMock()
    mock_db.freight_bookings.update_one = AsyncMock(side_effect=lambda q, u, *a, **k: state["bookings"][str(q["_id"])].update(u.get("$set", {})))
    accept_q_res = await accept_freight_quotation(quote_res.id, current_user=buyer_user, db=mock_db)
    assert accept_q_res.status == "ACCEPTED"
    assert state["bookings"][fb_res.id]["status"] == FreightBookingStatus.CONFIRMED

    # 8. Transporter Initializes Shipment Consignment
    mock_db.vehicles.find_one = AsyncMock(side_effect=lambda q, *a, **k: state["vehicles"].get(str(q.get("_id"))))
    mock_db.vehicles.update_one = AsyncMock(side_effect=lambda q, u, *a, **k: state["vehicles"][str(q["_id"])].update(u.get("$set", {})))
    def find_driver(q, *a, **k):
        if "_id" in q:
            return state["drivers"].get(str(q["_id"]))
        if "user_id" in q:
            for d in state["drivers"].values():
                if d.get("user_id") == q["user_id"]:
                    return d
        return None
    mock_db.drivers.find_one = AsyncMock(side_effect=find_driver)
    mock_db.drivers.update_one = AsyncMock(side_effect=lambda q, u, *a, **k: state["drivers"][str(q["_id"])].update(u.get("$set", {})))
    shipment_oid = ObjectId()
    mock_db.shipments.insert_one = AsyncMock(return_value=MagicMock(inserted_id=shipment_oid))
    mock_db.shipments.find_one = AsyncMock(side_effect=lambda q, *a, **k: state["shipments"].get(str(q.get("_id"))))

    shipment_in = ShipmentCreate(
        booking_id=fb_res.id,
        accepted_quotation_id=quote_res.id,
        vehicle_id=vehicle_id,
        driver_id=driver_id,
    )
    shipment_res = await create_shipment(shipment_in, current_user=transporter_user, db=mock_db)
    assert shipment_res.status == ShipmentStatus.DRIVER_ASSIGNED
    s_doc = shipment_res.model_dump()
    s_doc.pop("id", None)
    s_doc["_id"] = ObjectId(shipment_res.id)
    state["shipments"][shipment_res.id] = s_doc

    # 9. Transporter Loads Shipment
    mock_db.shipments.update_one = AsyncMock(side_effect=lambda q, u, *a, **k: state["shipments"][str(q["_id"])].update(u.get("$set", {})))
    load_in = ShipmentLoad(actual_weight_kg=2500.0, actual_package_count=120, batch_quantities=[])
    load_res = await load_shipment(shipment_res.id, load_in, current_user=transporter_user, db=mock_db)
    assert load_res.status == ShipmentStatus.LOADED

    # 10. Transporter Dispatches Shipment
    dispatch_res = await dispatch_shipment(shipment_res.id, current_user=transporter_user, db=mock_db)
    assert dispatch_res.status == ShipmentStatus.DISPATCHED

    # 11. Driver Starts Transit & Logs Corridor Checkpoint
    driver_user = {"sub": driver_id, "role": UserRole.DRIVER}
    transit_res = await start_transit(shipment_res.id, current_user=driver_user, db=mock_db)
    assert transit_res.status == ShipmentStatus.IN_TRANSIT

    mock_db.route_checkpoints.insert_one = AsyncMock(return_value=MagicMock(inserted_id=ObjectId()))
    mock_db.route_checkpoints.find_one = AsyncMock(return_value=None)
    cp_in = CheckpointCreate(
        shipment_id=shipment_res.id,
        name="Igatpuri Ghath Milestone",
        city="Igatpuri",
        state="Maharashtra",
        sequence=1,
        notes="Seal inspected, telemetry nominal",
    )
    cp_res = await create_checkpoint(cp_in, current_user=driver_user, db=mock_db)
    assert cp_res.sequence == 1
    assert cp_res.status == "PENDING"

    # Driver Arrives and sets Out for Delivery
    arrive_res = await arrive_at_destination(shipment_res.id, current_user=driver_user, db=mock_db)
    assert arrive_res.status == ShipmentStatus.ARRIVED_AT_DESTINATION

    ofd_res = await set_out_for_delivery(shipment_res.id, current_user=driver_user, db=mock_db)
    assert ofd_res.status == ShipmentStatus.OUT_FOR_DELIVERY

    # 12. Driver Submits Delivery Report
    mock_db.delivery_reports.find_one = AsyncMock(return_value=None)
    mock_db.delivery_reports.insert_one = AsyncMock(return_value=MagicMock(inserted_id=ObjectId()))
    report_in = DeliveryReportCreate(
        shipment_id=shipment_res.id,
        delivered_quantity_kg=2480.0,
        damaged_quantity_kg=20.0,
        missing_quantity_kg=0.0,
        received_by="Buyer Consignee Agent",
        received_at=datetime.now(timezone.utc),
        notes="Delivered in prime condition with cold chain integrity",
        status=DeliveryStatus.DELIVERED,
    )
    report_res = await create_delivery_report(shipment_res.id, report_in, current_user=driver_user, db=mock_db)
    assert report_res.delivered_quantity_kg == 2480.0
    r_doc = report_res.model_dump()
    r_doc.pop("id", None)
    r_doc["_id"] = ObjectId(report_res.id)
    state["delivery_reports"][report_res.id] = r_doc

    # 13. Buyer Confirms Consignment Delivery
    mock_db.delivery_reports.find_one = AsyncMock(return_value=r_doc)
    confirm_res = await confirm_delivery(shipment_res.id, current_user=buyer_user, db=mock_db)
    assert confirm_res["message"] == "Delivery confirmed"
    assert state["shipments"][shipment_res.id]["status"] == ShipmentStatus.PARTIALLY_DELIVERED

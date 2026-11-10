import uuid
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, ConfigDict
from bson import ObjectId

from app.db.mongodb import get_database
from app.core.permissions import get_current_user
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError
from app.core.constants import UserRole, DeliveryStatus, ShipmentStatus, LedgerEventType
from app.services.ledger_service import append_ledger_block
from app.db.unit_of_work import uow
from app.utils.serialization import to_response
from app.utils.mongo import to_mongo, resolve_doc
from app.core.access import assert_can_view_shipment, get_driver_for_user, get_transporter_for_user
from app.services.shipment_workflow import finalize_shipment

router = APIRouter()


class DeliveryReportCreate(BaseModel):
    shipment_id: str
    delivered_quantity_kg: float = Field(..., ge=0, le=1000000.0)
    returned_reusable_quantity_kg: float = Field(0.0, ge=0, le=1000000.0)
    damaged_quantity_kg: float = Field(0.0, ge=0, le=1000000.0)
    missing_quantity_kg: float = Field(0.0, ge=0, le=1000000.0)
    received_by: str = Field(..., min_length=2, max_length=100)
    received_at: Optional[datetime] = None
    delivery_photos: List[str] = Field(default_factory=list)
    receiver_signature: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=1000)
    status: DeliveryStatus = DeliveryStatus.DELIVERED
    model_config = ConfigDict(extra="forbid")


class DeliveryReportResponse(BaseModel):
    id: str
    report_id: str
    shipment_id: str
    shipment_public_id: Optional[str] = None
    delivered_quantity_kg: float
    returned_reusable_quantity_kg: float = 0.0
    damaged_quantity_kg: float = 0.0
    missing_quantity_kg: float = 0.0
    received_by: str
    received_at: Optional[datetime] = None
    delivery_photos: List[str] = Field(default_factory=list)
    receiver_signature: Optional[str] = None
    notes: Optional[str] = None
    status: DeliveryStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DeliveryReportListResponse(BaseModel):
    items: List[DeliveryReportResponse]
    total: int
    page: int
    page_size: int


@router.get("/reports", response_model=DeliveryReportListResponse)
async def list_delivery_reports(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[DeliveryStatus] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    
    if current_user["role"] == UserRole.DRIVER:
        driver = await get_driver_for_user(db, current_user["sub"])
        d_ids = [current_user["sub"]]
        if driver:
            d_ids.extend([str(driver["_id"]), driver.get("driver_id")])
        shipments = await db.shipments.find({"$or": [{"driver_id": {"$in": d_ids}}, {"driver_user_id": current_user["sub"]}]}, {"_id": 1}).to_list(100)
        shipment_ids = [str(s["_id"]) for s in shipments]
        query["shipment_id"] = {"$in": shipment_ids}
    elif current_user["role"] == UserRole.BUYER:
        shipments = await db.shipments.find({"buyer_id": current_user["sub"]}, {"_id": 1}).to_list(100)
        shipment_ids = [str(s["_id"]) for s in shipments]
        query["shipment_id"] = {"$in": shipment_ids}
    elif current_user["role"] == UserRole.TRANSPORTER:
        transporter = await get_transporter_for_user(db, current_user["sub"])
        if transporter:
            shipments = await db.shipments.find({"transporter_id": str(transporter["_id"])}, {"_id": 1}).to_list(100)
            shipment_ids = [str(s["_id"]) for s in shipments]
            query["shipment_id"] = {"$in": shipment_ids}
        else:
            query["shipment_id"] = {"$in": []}
    elif current_user["role"] == UserRole.FARMER:
        shipments = await db.shipments.find({"farmer_id": current_user["sub"]}, {"_id": 1}).to_list(100)
        shipment_ids = [str(s["_id"]) for s in shipments]
        query["shipment_id"] = {"$in": shipment_ids}
    
    if status:
        query["status"] = status.value if hasattr(status, "value") else str(status)
    
    total = await db.delivery_reports.count_documents(query)
    reports = await db.delivery_reports.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    
    items = []
    for r in reports:
        doc = dict(r)
        if ObjectId.is_valid(doc.get("shipment_id", "")):
            sh = await db.shipments.find_one({"_id": ObjectId(doc["shipment_id"])}, {"shipment_id": 1})
            if sh:
                doc["shipment_public_id"] = sh.get("shipment_id")
        items.append(to_response(DeliveryReportResponse, doc))
        
    return DeliveryReportListResponse(items=items, total=total, page=page, page_size=page_size)


@router.post("/shipments/{shipment_id}/delivery-report", response_model=DeliveryReportResponse)
@router.post("/reports", response_model=DeliveryReportResponse)
async def create_delivery_report(
    report_data: DeliveryReportCreate,
    shipment_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if isinstance(report_data, str) and isinstance(shipment_id, DeliveryReportCreate):
        shipment_id, report_data = report_data, shipment_id

    if current_user["role"] not in [UserRole.DRIVER, UserRole.TRANSPORTER]:
        raise ForbiddenError("Only assigned driver or transporter can submit delivery reports")
    
    target_shipment_id = shipment_id or report_data.shipment_id
    shipment = await resolve_doc(db.shipments, target_shipment_id, "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)
    
    cur_status = shipment.get("status")
    if hasattr(cur_status, "value"):
        cur_status = cur_status.value

    # DL-01: DELIVERY FINALIZATION MUST OCCUR ONLY FROM OUT_FOR_DELIVERY
    if cur_status != "OUT_FOR_DELIVERY":
        raise ValidationError(
            f"Delivery report can only be submitted when shipment is OUT_FOR_DELIVERY (current: {cur_status})"
        )
    
    canonical_shipment_id = str(shipment["_id"])
    existing = await db.delivery_reports.find_one({"shipment_id": canonical_shipment_id})
    if existing:
        raise ValidationError("Delivery report already exists for this shipment")
    
    now = datetime.now(timezone.utc)
    report_id = f"DR-{uuid.uuid4().hex[:8].upper()}"
    received_at = report_data.received_at or now
    
    report_doc = {
        "report_id": report_id,
        "shipment_id": canonical_shipment_id,
        "shipment_public_id": shipment.get("shipment_id"),
        "delivered_quantity_kg": report_data.delivered_quantity_kg,
        "returned_reusable_quantity_kg": report_data.returned_reusable_quantity_kg,
        "damaged_quantity_kg": report_data.damaged_quantity_kg,
        "missing_quantity_kg": report_data.missing_quantity_kg,
        "received_by": report_data.received_by.strip(),
        "received_at": received_at,
        "delivery_photos": report_data.delivery_photos,
        "receiver_signature": report_data.receiver_signature,
        "notes": report_data.notes,
        "status": report_data.status.value if hasattr(report_data.status, "value") else str(report_data.status),
        "created_at": now,
        "updated_at": now,
    }
    
    outcome = ShipmentStatus.DELIVERED.value
    if report_data.status == DeliveryStatus.PARTIAL or (report_data.damaged_quantity_kg > 0 or report_data.missing_quantity_kg > 0):
        outcome = ShipmentStatus.PARTIALLY_DELIVERED.value
    elif report_data.status == DeliveryStatus.REJECTED or report_data.delivered_quantity_kg == 0:
        outcome = ShipmentStatus.DELIVERY_REJECTED.value
    
    async with uow() as session:
        result = await db.delivery_reports.insert_one(to_mongo(report_doc), session=session)
        report_doc["_id"] = result.inserted_id
        
        await finalize_shipment(
            db, shipment, outcome=outcome,
            actor_id=current_user["sub"], actor_role=current_user["role"],
            delivered_qty=report_data.delivered_quantity_kg,
            returned_reusable_qty=report_data.returned_reusable_quantity_kg,
            returned_damaged_qty=report_data.damaged_quantity_kg,
            returned_rejected_qty=report_data.missing_quantity_kg,
            session=session
        )
    
    return to_response(DeliveryReportResponse, report_doc)


@router.get("/reports/{report_id}", response_model=DeliveryReportResponse)
async def get_delivery_report_by_id(
    report_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    report = await resolve_doc(db.delivery_reports, report_id, "Delivery Report", business_key="report_id")
    if ObjectId.is_valid(report.get("shipment_id", "")):
        sh = await db.shipments.find_one({"_id": ObjectId(report["shipment_id"])})
        if sh:
            await assert_can_view_shipment(db, current_user, sh)
            report["shipment_public_id"] = sh.get("shipment_id")
    return to_response(DeliveryReportResponse, report)


@router.get("/shipments/{shipment_id}/delivery-report", response_model=DeliveryReportResponse)
async def get_delivery_report(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)
    
    canonical_id = str(shipment["_id"])
    report = await db.delivery_reports.find_one({"$or": [{"shipment_id": canonical_id}, {"shipment_id": shipment.get("shipment_id")}]})
    if not report:
        raise NotFoundError("Delivery Report for shipment", shipment_id)
    
    report["shipment_public_id"] = shipment.get("shipment_id")
    return to_response(DeliveryReportResponse, report)


@router.post("/shipments/{shipment_id}/confirm-delivery")
async def confirm_delivery(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] != UserRole.BUYER:
        raise ForbiddenError("Only the buyer can confirm delivery")
    
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    if current_user["role"] == UserRole.BUYER and shipment.get("buyer_id") != current_user["sub"]:
        raise ForbiddenError("Not authorized to confirm delivery for this shipment")
    
    canonical_id = str(shipment["_id"])
    now = datetime.now(timezone.utc)
    
    cur_status = shipment.get("status")
    if hasattr(cur_status, "value"):
        cur_status = cur_status.value

    # If shipment was already finalized to DELIVERED/PARTIALLY_DELIVERED by report:
    if cur_status in ["DELIVERED", "PARTIALLY_DELIVERED"]:
        await append_ledger_block(
            db,
            event_type=LedgerEventType.DELIVERY_CONFIRMED,
            entity_type="SHIPMENT",
            entity_id=canonical_id,
            actor_id=current_user["sub"],
            actor_role=current_user["role"],
            event_summary=f"Delivery sign-off confirmed by buyer for shipment {shipment.get('shipment_id')}",
            payload={"buyer_id": current_user["sub"]},
        )
        return {"message": "Delivery confirmed"}
    
    # If currently OUT_FOR_DELIVERY, finalize it directly
    if cur_status == "OUT_FOR_DELIVERY":
        report = await db.delivery_reports.find_one({"shipment_id": canonical_id})
        cargo_qty = float(shipment.get("total_cargo_weight_kg", shipment.get("cargo_quantity_kg", 0.0)))
        deliv_qty = report.get("delivered_quantity_kg", cargo_qty) if report else cargo_qty
        reus_qty = report.get("returned_reusable_quantity_kg", 0.0) if report else 0.0
        dam_qty = report.get("damaged_quantity_kg", 0.0) if report else 0.0
        rej_qty = report.get("missing_quantity_kg", 0.0) if report else 0.0
        outcome = "DELIVERED"
        if dam_qty > 0 or reus_qty > 0 or rej_qty > 0:
            outcome = "PARTIALLY_DELIVERED"
        async with uow() as session:
            await finalize_shipment(
                db, shipment, outcome=outcome,
                actor_id=current_user["sub"], actor_role=current_user["role"],
                delivered_qty=deliv_qty,
                returned_reusable_qty=reus_qty,
                returned_damaged_qty=dam_qty,
                returned_rejected_qty=rej_qty,
                session=session
            )
        return {"message": "Delivery confirmed"}
    
    raise ValidationError(f"Cannot confirm delivery for shipment in status '{cur_status}'; must be OUT_FOR_DELIVERY or DELIVERED")


@router.post("/shipments/{shipment_id}/reject-delivery")
async def reject_delivery(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.BUYER, UserRole.ADMIN]:
        raise ForbiddenError("Only buyer or admin can reject delivery")
    
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    if current_user["role"] == UserRole.BUYER and shipment.get("buyer_id") != current_user["sub"]:
        raise ForbiddenError("Not authorized to reject delivery for this shipment")
    
    cur_status = shipment.get("status")
    if hasattr(cur_status, "value"):
        cur_status = cur_status.value

    if cur_status not in ["OUT_FOR_DELIVERY", "ARRIVED_AT_DESTINATION"]:
        raise ValidationError(f"Cannot reject delivery in status '{cur_status}'")
    
    qty = float(shipment.get("total_cargo_weight_kg", shipment.get("cargo_quantity_kg", 0.0)))
    async with uow() as session:
        # Ensure it moves to OUT_FOR_DELIVERY first if at destination
        if cur_status == "ARRIVED_AT_DESTINATION":
            await db.shipments.update_one({"_id": shipment["_id"]}, {"$set": {"status": "OUT_FOR_DELIVERY"}}, session=session)
            shipment["status"] = "OUT_FOR_DELIVERY"
            
        await finalize_shipment(
            db, shipment, outcome="DELIVERY_REJECTED",
            actor_id=current_user["sub"], actor_role=current_user["role"],
            delivered_qty=0.0, damaged_qty=0.0, missing_qty=qty,
            session=session
        )
    return {"message": "Delivery rejected"}

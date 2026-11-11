import hashlib
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
from app.core.constants import UserRole, DeliveryStatus
from app.db.unit_of_work import run_in_txn
from app.utils.serialization import to_response
from app.utils.mongo import to_mongo, resolve_doc
from app.core.access import assert_can_view_shipment, get_driver_for_user, get_transporter_for_user
from app.services.shipment_workflow import finalize_shipment
from app.services.ledger_service import canonical_json

router = APIRouter()


class ConfirmDeliveryRequest(BaseModel):
    delivered_quantity_kg: float = Field(..., ge=0)
    damaged_quantity_kg: float = Field(0.0, ge=0)
    missing_quantity_kg: float = Field(0.0, ge=0)
    received_by: str
    model_config = ConfigDict(extra="forbid")


class RejectDeliveryRequest(BaseModel):
    reason: str
    received_by: str
    model_config = ConfigDict(extra="forbid")


class DeliveryReportResponse(BaseModel):
    id: str
    report_id: str
    shipment_id: str
    shipment_public_id: Optional[str] = None
    delivered_quantity_kg: float = 0.0
    damaged_quantity_kg: float = 0.0
    missing_quantity_kg: float = 0.0
    received_by: str
    received_at: datetime
    status: DeliveryStatus
    reason: Optional[str] = None
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
    page_size: int = Query(20, ge=1),
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


async def _record_delivery(db, shipment, current_user, status, report_values):
    now = datetime.now(timezone.utc)
    now = now.replace(microsecond=(now.microsecond // 1000) * 1000)
    report = {
        "report_id": f"DR-{uuid.uuid4().hex[:10].upper()}",
        "shipment_id": str(shipment["_id"]),
        "shipment_public_id": shipment.get("shipment_id"),
        "delivered_quantity_kg": report_values.get("delivered_quantity_kg", 0.0),
        "damaged_quantity_kg": report_values.get("damaged_quantity_kg", 0.0),
        "missing_quantity_kg": report_values.get("missing_quantity_kg", 0.0),
        "received_by": report_values["received_by"], "received_at": now,
        "status": status, "created_at": now, "updated_at": now,
    }
    if "reason" in report_values:
        report["reason"] = report_values["reason"]
    digest = hashlib.sha256(canonical_json(report).encode("utf-8")).hexdigest()
    outcome = "DELIVERY_REJECTED" if status == "REJECTED" else ("DELIVERED" if status == "DELIVERED" else "PARTIALLY_DELIVERED")
    async def _transaction(session):
        result = await db.delivery_reports.insert_one(to_mongo(report), session=session)
        report["_id"] = result.inserted_id
        await finalize_shipment(
            db, shipment, outcome, current_user["sub"], current_user["role"],
            report["delivered_quantity_kg"], report["damaged_quantity_kg"],
            report["missing_quantity_kg"], digest, session,
        )
    await run_in_txn(_transaction)
    return to_response(DeliveryReportResponse, report)


@router.post("/shipments/{shipment_id}/confirm-delivery", response_model=DeliveryReportResponse)
async def confirm_delivery(shipment_id: str, data: ConfirmDeliveryRequest,
                           current_user: dict = Depends(get_current_user),
                           db: AsyncIOMotorDatabase = Depends(get_database)):
    if current_user["role"] != UserRole.BUYER:
        raise ForbiddenError("Only the buyer can confirm delivery")
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    if shipment.get("buyer_id") != current_user["sub"]:
        raise ForbiddenError("Not authorized for this shipment")
    if shipment.get("status") != "OUT_FOR_DELIVERY":
        raise ValidationError("Shipment must be OUT_FOR_DELIVERY")
    loaded = shipment.get("loaded_weight_kg")
    if loaded is None or abs(data.delivered_quantity_kg + data.damaged_quantity_kg + data.missing_quantity_kg - loaded) > 0.01:
        raise ValidationError("Delivered, damaged, and missing must equal loaded weight")
    status = "DELIVERED" if data.damaged_quantity_kg + data.missing_quantity_kg == 0 else "PARTIAL"
    return await _record_delivery(db, shipment, current_user, status, data.model_dump())


@router.post("/shipments/{shipment_id}/reject-delivery", response_model=DeliveryReportResponse)
async def reject_delivery(shipment_id: str, data: RejectDeliveryRequest,
                          current_user: dict = Depends(get_current_user),
                          db: AsyncIOMotorDatabase = Depends(get_database)):
    if current_user["role"] != UserRole.BUYER:
        raise ForbiddenError("Only the buyer can reject delivery")
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    if shipment.get("buyer_id") != current_user["sub"]:
        raise ForbiddenError("Not authorized for this shipment")
    if shipment.get("status") != "OUT_FOR_DELIVERY":
        raise ValidationError("Shipment must be OUT_FOR_DELIVERY")
    if not data.reason.strip() or not data.received_by.strip():
        raise ValidationError("Reason and received_by are required")
    values = data.model_dump() | {"missing_quantity_kg": shipment.get("loaded_weight_kg") or 0.0}
    return await _record_delivery(db, shipment, current_user, "REJECTED", values)

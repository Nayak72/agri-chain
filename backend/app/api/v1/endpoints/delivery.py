from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
from app.db.mongodb import get_database
from app.core.permissions import get_current_user, Role
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError
from app.core.constants import UserRole, DeliveryStatus, ShipmentStatus
from app.services.ledger_service import append_ledger_block
from app.core.constants import LedgerEventType
from app.db.transaction import transaction_session
import uuid

router = APIRouter()


class DeliveryReportCreate(BaseModel):
    shipment_id: str
    delivered_quantity_kg: float = Field(..., ge=0)
    damaged_quantity_kg: float = Field(0, ge=0)
    missing_quantity_kg: float = Field(0, ge=0)
    received_by: str
    received_at: datetime
    delivery_photos: List[str] = []
    receiver_signature: Optional[str] = None
    notes: Optional[str] = None
    status: DeliveryStatus = DeliveryStatus.DELIVERED


class DeliveryReportResponse(BaseModel):
    id: str
    report_id: str
    shipment_id: str
    delivered_quantity_kg: float
    damaged_quantity_kg: float
    missing_quantity_kg: float
    received_by: str
    received_at: datetime
    delivery_photos: List[str]
    receiver_signature: Optional[str]
    notes: Optional[str]
    status: DeliveryStatus
    created_at: datetime
    updated_at: datetime


@router.post("/shipments/{shipment_id}/delivery-report", response_model=DeliveryReportResponse)
async def create_delivery_report(
    shipment_id: str,
    report_data: DeliveryReportCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.DRIVER, UserRole.TRANSPORTER, UserRole.BUYER]:
        raise ForbiddenError("Only driver, transporter, or buyer can create delivery reports")
    
    if not ObjectId.is_valid(shipment_id):
        raise ValidationError("Invalid shipment ID")
    
    shipment = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
    if not shipment:
        raise NotFoundError("Shipment", shipment_id)
    
    if current_user["role"] == UserRole.DRIVER and shipment["driver_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized")
    if current_user["role"] == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
        if not transporter or shipment["transporter_id"] != str(transporter["_id"]):
            raise ForbiddenError("Not authorized")
    if current_user["role"] == UserRole.BUYER and shipment["buyer_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized")
    
    existing = await db.delivery_reports.find_one({"shipment_id": shipment_id})
    if existing:
        raise ValidationError("Delivery report already exists for this shipment")
    
    report_id = f"DR-{uuid.uuid4().hex[:8].upper()}"
    
    report_doc = {
        "report_id": report_id,
        "shipment_id": shipment_id,
        "delivered_quantity_kg": report_data.delivered_quantity_kg,
        "damaged_quantity_kg": report_data.damaged_quantity_kg,
        "missing_quantity_kg": report_data.missing_quantity_kg,
        "received_by": report_data.received_by,
        "received_at": report_data.received_at,
        "delivery_photos": report_data.delivery_photos,
        "receiver_signature": report_data.receiver_signature,
        "notes": report_data.notes,
        "status": report_data.status,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    
    async with transaction_session() as session:
        result = await db.delivery_reports.insert_one(report_doc, session=session)
        report_doc["_id"] = result.inserted_id
        
        if report_data.status == DeliveryStatus.DELIVERED:
            new_status = ShipmentStatus.DELIVERED
        elif report_data.status == DeliveryStatus.PARTIAL:
            new_status = ShipmentStatus.PARTIALLY_DELIVERED
        else:
            new_status = ShipmentStatus.DELIVERY_REJECTED
        
        await db.shipments.update_one(
            {"_id": ObjectId(shipment_id)},
            {"$set": {"status": new_status, "actual_arrival_time": report_data.received_at, "updated_at": datetime.now(timezone.utc)}},
            session=session
        )
        
        await append_ledger_block(
            db,
            event_type=LedgerEventType.DELIVERY_RECORDED,
            entity_type="SHIPMENT",
            entity_id=shipment_id,
            actor_id=current_user["sub"],
            actor_role=current_user["role"],
            event_summary=f"Delivery recorded for shipment {shipment['shipment_id']} - {report_data.delivered_quantity_kg}kg delivered",
            payload={
                "report_id": report_id,
                "delivered_quantity_kg": report_data.delivered_quantity_kg,
                "damaged_quantity_kg": report_data.damaged_quantity_kg,
                "missing_quantity_kg": report_data.missing_quantity_kg,
            },
            session=session
        )
    
    return DeliveryReportResponse(id=str(report_doc["_id"]), **report_doc)


@router.get("/shipments/{shipment_id}/delivery-report", response_model=DeliveryReportResponse)
async def get_delivery_report(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(shipment_id):
        raise ValidationError("Invalid shipment ID")
    
    report = await db.delivery_reports.find_one({"shipment_id": shipment_id})
    if not report:
        raise NotFoundError("Delivery Report", shipment_id)
    
    shipment = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
    if not shipment:
        raise NotFoundError("Shipment", shipment_id)
    
    if current_user["role"] == UserRole.FARMER and shipment["farmer_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized")
    if current_user["role"] == UserRole.BUYER and shipment["buyer_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized")
    if current_user["role"] == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
        if not transporter or shipment["transporter_id"] != str(transporter["_id"]):
            raise ForbiddenError("Not authorized")
    if current_user["role"] == UserRole.DRIVER and shipment["driver_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized")
    
    return DeliveryReportResponse(id=str(report["_id"]), **report)


@router.post("/shipments/{shipment_id}/confirm-delivery")
async def confirm_delivery(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] != UserRole.BUYER:
        raise ForbiddenError("Only buyer can confirm delivery")
    
    if not ObjectId.is_valid(shipment_id):
        raise ValidationError("Invalid shipment ID")
    
    shipment = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
    if not shipment:
        raise NotFoundError("Shipment", shipment_id)
    
    if shipment["buyer_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized")
    
    report = await db.delivery_reports.find_one({"shipment_id": shipment_id})
    if not report:
        raise ValidationError("No delivery report found")
    
    if shipment["status"] not in [ShipmentStatus.DELIVERED, ShipmentStatus.PARTIALLY_DELIVERED]:
        raise ValidationError(f"Cannot confirm delivery at status {shipment['status']}")
    
    await db.shipments.update_one(
        {"_id": ObjectId(shipment_id)},
        {"$set": {"status": ShipmentStatus.DELIVERED, "updated_at": datetime.now(timezone.utc)}}
    )
    
    await append_ledger_block(
        db,
        event_type=LedgerEventType.DELIVERY_CONFIRMED,
        entity_type="SHIPMENT",
        entity_id=shipment_id,
        actor_id=current_user["sub"],
        actor_role=current_user["role"],
        event_summary=f"Delivery confirmed by buyer for shipment {shipment['shipment_id']}",
        payload={"buyer_id": current_user["sub"]},
    )
    
    return {"message": "Delivery confirmed"}


@router.post("/shipments/{shipment_id}/reject-delivery")
async def reject_delivery(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] != UserRole.BUYER:
        raise ForbiddenError("Only buyer can reject delivery")
    
    if not ObjectId.is_valid(shipment_id):
        raise ValidationError("Invalid shipment ID")
    
    shipment = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
    if not shipment:
        raise NotFoundError("Shipment", shipment_id)
    
    if shipment["buyer_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized")
    
    await db.shipments.update_one(
        {"_id": ObjectId(shipment_id)},
        {"$set": {"status": ShipmentStatus.DELIVERY_REJECTED, "updated_at": datetime.now(timezone.utc)}}
    )
    
    await append_ledger_block(
        db,
        event_type=LedgerEventType.DELIVERY_REJECTED,
        entity_type="SHIPMENT",
        entity_id=shipment_id,
        actor_id=current_user["sub"],
        actor_role=current_user["role"],
        event_summary=f"Delivery rejected by buyer for shipment {shipment['shipment_id']}",
        payload={"buyer_id": current_user["sub"]},
    )
    
    return {"message": "Delivery rejected"}


@router.post("/shipments/{shipment_id}/partial-delivery")
async def partial_delivery(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] != UserRole.BUYER:
        raise ForbiddenError("Only buyer can confirm partial delivery")
    
    if not ObjectId.is_valid(shipment_id):
        raise ValidationError("Invalid shipment ID")
    
    shipment = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
    if not shipment:
        raise NotFoundError("Shipment", shipment_id)
    
    if shipment["buyer_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized")
    
    await db.shipments.update_one(
        {"_id": ObjectId(shipment_id)},
        {"$set": {"status": ShipmentStatus.PARTIALLY_DELIVERED, "updated_at": datetime.now(timezone.utc)}}
    )
    
    await append_ledger_block(
        db,
        event_type=LedgerEventType.PARTIAL_DELIVERY_CONFIRMED,
        entity_type="SHIPMENT",
        entity_id=shipment_id,
        actor_id=current_user["sub"],
        actor_role=current_user["role"],
        event_summary=f"Partial delivery confirmed by buyer for shipment {shipment['shipment_id']}",
        payload={"buyer_id": current_user["sub"]},
    )
    
    return {"message": "Partial delivery confirmed"}
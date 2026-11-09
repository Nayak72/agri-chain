from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date, timezone
from bson import ObjectId
from app.db.mongodb import get_database
from app.core.permissions import get_current_user, Role
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError
from app.core.constants import (
    FreightBookingStatus, VehicleCategory, ProduceType, UserRole
)
from app.services.ledger_service import append_ledger_block
from app.core.constants import LedgerEventType
import uuid

router = APIRouter()


class FreightBookingCreate(BaseModel):
    purchase_order_id: str
    batch_ids: List[str]
    cargo_quantity_kg: float = Field(..., gt=0)
    total_cargo_weight_kg: float = Field(..., gt=0)
    package_count: int = Field(..., gt=0)
    pickup_address: str
    pickup_city: str
    pickup_state: str
    destination_address: str
    destination_city: str
    destination_state: str
    requested_pickup_date: date
    required_delivery_date: date
    preferred_vehicle_category: VehicleCategory
    refrigeration_required: bool = False
    temperature_min: Optional[float] = None
    temperature_max: Optional[float] = None
    packaging_details: Optional[str] = None
    special_handling_instructions: Optional[str] = None


class FreightBookingResponse(BaseModel):
    id: str
    booking_id: str
    purchase_order_id: str
    batch_ids: List[str]
    cargo_quantity_kg: float
    total_cargo_weight_kg: float
    package_count: int
    pickup_address: str
    pickup_city: str
    pickup_state: str
    destination_address: str
    destination_city: str
    destination_state: str
    requested_pickup_date: date
    required_delivery_date: date
    preferred_vehicle_category: VehicleCategory
    refrigeration_required: bool
    temperature_min: Optional[float]
    temperature_max: Optional[float]
    packaging_details: Optional[str]
    special_handling_instructions: Optional[str]
    status: FreightBookingStatus
    created_at: datetime
    updated_at: datetime


def generate_booking_id() -> str:
    return f"FB-{uuid.uuid4().hex[:10].upper()}"


@router.post("", response_model=FreightBookingResponse)
async def create_freight_booking(
    booking_data: FreightBookingCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.BUYER, UserRole.FARMER, UserRole.ADMIN]:
        raise ForbiddenError("Only buyers or farmers can create freight bookings")
    
    if not ObjectId.is_valid(booking_data.purchase_order_id):
        raise ValidationError("Invalid purchase order ID")
    
    po = await db.purchase_orders.find_one({"_id": ObjectId(booking_data.purchase_order_id)})
    if not po:
        raise NotFoundError("Purchase Order", booking_data.purchase_order_id)
    
    if current_user["role"] == UserRole.BUYER and po["buyer_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized for this purchase order")
    if current_user["role"] == UserRole.FARMER and po["seller_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized for this purchase order")
    
    if po["status"] != "ACCEPTED":
        raise ValidationError("Purchase order must be accepted before creating freight booking")
    
    for batch_id in booking_data.batch_ids:
        if not ObjectId.is_valid(batch_id):
            raise ValidationError(f"Invalid batch ID: {batch_id}")
        batch = await db.produce_batches.find_one({"_id": ObjectId(batch_id)})
        if not batch:
            raise NotFoundError("Batch", batch_id)
    
    booking_id = generate_booking_id()
    
    booking_doc = {
        "booking_id": booking_id,
        "purchase_order_id": booking_data.purchase_order_id,
        "batch_ids": booking_data.batch_ids,
        "cargo_quantity_kg": booking_data.cargo_quantity_kg,
        "total_cargo_weight_kg": booking_data.total_cargo_weight_kg,
        "package_count": booking_data.package_count,
        "pickup_address": booking_data.pickup_address,
        "pickup_city": booking_data.pickup_city,
        "pickup_state": booking_data.pickup_state,
        "destination_address": booking_data.destination_address,
        "destination_city": booking_data.destination_city,
        "destination_state": booking_data.destination_state,
        "requested_pickup_date": datetime.combine(booking_data.requested_pickup_date, datetime.min.time()),
        "required_delivery_date": datetime.combine(booking_data.required_delivery_date, datetime.min.time()),
        "preferred_vehicle_category": booking_data.preferred_vehicle_category,
        "refrigeration_required": booking_data.refrigeration_required,
        "temperature_min": booking_data.temperature_min,
        "temperature_max": booking_data.temperature_max,
        "packaging_details": booking_data.packaging_details,
        "special_handling_instructions": booking_data.special_handling_instructions,
        "status": FreightBookingStatus.REQUESTED,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    
    result = await db.freight_bookings.insert_one(booking_doc)
    booking_doc["_id"] = result.inserted_id
    
    await append_ledger_block(
        db,
        event_type=LedgerEventType.FREIGHT_BOOKING_CREATED,
        entity_type="FREIGHT_BOOKING",
        entity_id=str(result.inserted_id),
        actor_id=current_user["sub"],
        actor_role=current_user["role"],
        event_summary=f"Freight booking {booking_id} created for PO {po['order_id']}",
        payload={
            "booking_id": booking_id,
            "purchase_order_id": po["order_id"],
            "cargo_weight_kg": booking_data.total_cargo_weight_kg,
            "pickup": f"{booking_data.pickup_city}, {booking_data.pickup_state}",
            "destination": f"{booking_data.destination_city}, {booking_data.destination_state}",
        }
    )
    
    return FreightBookingResponse(id=str(result.inserted_id), **booking_doc)


@router.get("", response_model=List[FreightBookingResponse])
async def list_freight_bookings(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[FreightBookingStatus] = None,
    purchase_order_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if current_user["role"] == UserRole.BUYER:
        pos = await db.purchase_orders.find({"buyer_id": current_user["sub"]}).to_list(None)
        po_ids = [str(po["_id"]) for po in pos]
        query["purchase_order_id"] = {"$in": po_ids}
    elif current_user["role"] == UserRole.FARMER:
        pos = await db.purchase_orders.find({"seller_id": current_user["sub"]}).to_list(None)
        po_ids = [str(po["_id"]) for po in pos]
        query["purchase_order_id"] = {"$in": po_ids}
    elif current_user["role"] == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
        t_id = str(transporter["_id"]) if transporter else None
        if status == FreightBookingStatus.CONFIRMED:
            my_quotes = await db.freight_quotations.find({"transporter_id": t_id, "status": "ACCEPTED"}).to_list(None) if t_id else []
            my_quote_ids = [str(q["_id"]) for q in my_quotes]
            query["status"] = FreightBookingStatus.CONFIRMED
            query["accepted_quotation_id"] = {"$in": my_quote_ids}
        elif status:
            query["status"] = status
        else:
            query["status"] = {"$in": [FreightBookingStatus.REQUESTED, FreightBookingStatus.QUOTATION_PENDING]}
    
    if status and current_user["role"] != UserRole.TRANSPORTER:
        query["status"] = status
    if purchase_order_id:
        if not ObjectId.is_valid(purchase_order_id):
            raise ValidationError("Invalid purchase order ID")
        query["purchase_order_id"] = purchase_order_id
    
    bookings = await db.freight_bookings.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [FreightBookingResponse(id=str(b["_id"]), **b) for b in bookings]


@router.get("/{booking_id}", response_model=FreightBookingResponse)
async def get_freight_booking(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if ObjectId.is_valid(booking_id):
        booking = await db.freight_bookings.find_one({"_id": ObjectId(booking_id)})
    else:
        booking = await db.freight_bookings.find_one({"booking_id": booking_id})
    if not booking:
        raise NotFoundError("Freight Booking", booking_id)
    
    if current_user["role"] == UserRole.BUYER:
        po = await db.purchase_orders.find_one({"_id": ObjectId(booking["purchase_order_id"])})
        if not po or po["buyer_id"] != current_user["sub"]:
            raise ForbiddenError("Not authorized to view this booking")
    elif current_user["role"] == UserRole.FARMER:
        po = await db.purchase_orders.find_one({"_id": ObjectId(booking["purchase_order_id"])})
        if not po or po["seller_id"] != current_user["sub"]:
            raise ForbiddenError("Not authorized to view this booking")
    
    return FreightBookingResponse(id=str(booking["_id"]), **booking)
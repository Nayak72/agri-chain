import uuid
from typing import Optional, List
from datetime import datetime, date, timezone
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, ConfigDict
from bson import ObjectId

from app.db.mongodb import get_database
from app.core.permissions import get_current_user
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError, ConflictError
from app.core.constants import (
    FreightBookingStatus, VehicleCategory, ProduceType, UserRole, LedgerEventType
)
from app.services.ledger_service import append_ledger_block
from app.db.unit_of_work import run_in_txn
from app.utils.serialization import to_response
from app.utils.mongo import to_mongo, resolve_doc
from app.schemas.validators import validate_date_order, validate_temperature_range

router = APIRouter()


class FreightBookingCreate(BaseModel):
    purchase_order_id: str
    batch_ids: List[str]
    cargo_quantity_kg: float = Field(..., gt=0)
    package_count: int = Field(..., gt=0)
    pickup_city: str = Field(...)
    pickup_state: str = Field(...)
    destination_city: str = Field(...)
    destination_state: str = Field(...)
    requested_pickup_date: date
    required_delivery_date: date
    preferred_vehicle_category: VehicleCategory
    refrigeration_required: bool = False
    temperature_min: Optional[float] = None
    temperature_max: Optional[float] = None
    packaging_details: Optional[str] = Field(None)
    model_config = ConfigDict(extra="forbid")


class FreightBookingUpdate(BaseModel):
    pickup_city: Optional[str] = Field(None)
    pickup_state: Optional[str] = Field(None)
    destination_city: Optional[str] = Field(None)
    destination_state: Optional[str] = Field(None)
    requested_pickup_date: Optional[date] = None
    required_delivery_date: Optional[date] = None
    packaging_details: Optional[str] = Field(None)
    model_config = ConfigDict(extra="forbid")


class FreightBookingResponse(BaseModel):
    id: str
    booking_id: str
    purchase_order_id: str
    buyer_id: Optional[str] = None
    seller_id: Optional[str] = None
    batch_ids: List[str]
    cargo_quantity_kg: float
    package_count: int
    pickup_city: str
    pickup_state: str
    destination_city: str
    destination_state: str
    requested_pickup_date: date
    required_delivery_date: date
    preferred_vehicle_category: VehicleCategory
    refrigeration_required: bool
    temperature_min: Optional[float] = None
    temperature_max: Optional[float] = None
    packaging_details: Optional[str] = None
    accepted_quotation_id: Optional[str] = None
    status: FreightBookingStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


def generate_booking_id() -> str:
    return f"FB-{uuid.uuid4().hex[:10].upper()}"


@router.post("", response_model=FreightBookingResponse)
async def create_freight_booking(
    booking_data: FreightBookingCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.BUYER, UserRole.FARMER, UserRole.ADMIN]:
        raise ForbiddenError("Only buyers, farmers, or admins can create freight bookings")
    
    validate_date_order(booking_data.requested_pickup_date, booking_data.required_delivery_date,
                        "requested_pickup_date", "required_delivery_date")
    validate_temperature_range(booking_data.temperature_min, booking_data.temperature_max)

    po = await resolve_doc(db.purchase_orders, booking_data.purchase_order_id, "Purchase Order", business_key="order_id")
    
    if current_user["role"] == UserRole.BUYER and po["buyer_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized for this purchase order")
    if current_user["role"] == UserRole.FARMER and po["seller_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized for this purchase order")
    
    if po["status"] != "ACCEPTED":
        raise ValidationError("Purchase order must be accepted before creating freight booking")

    # Cross-check cargo quantity against PO requested quantity
    po_qty = float(po.get("accepted_quantity_kg", 0.0))
    if po_qty <= 0 or abs(booking_data.cargo_quantity_kg - po_qty) > 0.001:
        raise ValidationError(f"Cargo quantity {booking_data.cargo_quantity_kg}kg must match PO quantity {po_qty}kg")
    if len(booking_data.batch_ids) != 1:
        raise ValidationError("Booking must contain exactly the purchase order batch")

    # Verify batches belong to PO seller
    for batch_id in booking_data.batch_ids:
        batch = await resolve_doc(db.produce_batches, batch_id, "Batch", business_key="batch_id")
        if str(batch["_id"]) != po.get("batch_id"):
            raise ValidationError("Booking batch must match the purchase order batch")
        if batch.get("farmer_id") != po["seller_id"] and current_user["role"] != UserRole.ADMIN:
            raise ValidationError(f"Batch {batch_id} does not belong to the purchase order seller")
    
    booking_id = generate_booking_id()
    while await db.freight_bookings.find_one({"booking_id": booking_id}):
        booking_id = generate_booking_id()

    now = datetime.now(timezone.utc)
    booking_doc = {
        "booking_id": booking_id,
        "purchase_order_id": str(po["_id"]),
        "buyer_id": po["buyer_id"],
        "seller_id": po["seller_id"],
        "batch_ids": booking_data.batch_ids,
        "cargo_quantity_kg": booking_data.cargo_quantity_kg,
        "package_count": booking_data.package_count,
        "pickup_city": booking_data.pickup_city.strip(),
        "pickup_state": booking_data.pickup_state.strip(),
        "destination_city": booking_data.destination_city.strip(),
        "destination_state": booking_data.destination_state.strip(),
        "requested_pickup_date": booking_data.requested_pickup_date,
        "required_delivery_date": booking_data.required_delivery_date,
        "preferred_vehicle_category": booking_data.preferred_vehicle_category.value if hasattr(booking_data.preferred_vehicle_category, "value") else booking_data.preferred_vehicle_category,
        "refrigeration_required": booking_data.refrigeration_required,
        "temperature_min": booking_data.temperature_min,
        "temperature_max": booking_data.temperature_max,
        "packaging_details": booking_data.packaging_details,
        "status": FreightBookingStatus.REQUESTED.value if hasattr(FreightBookingStatus.REQUESTED, "value") else FreightBookingStatus.REQUESTED,
        "accepted_quotation_id": None,
        "created_by": current_user["sub"],
        "created_at": now,
        "updated_at": now,
    }
    
    async def _transaction(session):
        claim = await db.purchase_orders.update_one(
            {"_id": po["_id"], "status": "ACCEPTED"}, {"$set": {"updated_at": now}}, session=session,
        )
        if claim.matched_count == 0:
            raise ConflictError("Purchase order is no longer accepted")
        result = await db.freight_bookings.insert_one(to_mongo(booking_doc), session=session)
        booking_doc["_id"] = result.inserted_id
        await append_ledger_block(
            db, event_type=LedgerEventType.FREIGHT_BOOKING_CREATED,
            entity_type="FREIGHT_BOOKING", entity_id=str(result.inserted_id),
            actor_id=current_user["sub"], actor_role=current_user["role"],
            event_summary=f"Freight booking {booking_id} created for PO {po.get('order_id', str(po['_id']))}",
            payload={"booking_id": booking_id, "purchase_order_id": po.get("order_id", str(po["_id"])),
                     "cargo_weight_kg": booking_data.cargo_quantity_kg,
                     "pickup": f"{booking_data.pickup_city}, {booking_data.pickup_state}",
                     "destination": f"{booking_data.destination_city}, {booking_data.destination_state}"},
            session=session,
        )
    await run_in_txn(_transaction)
    
    return to_response(FreightBookingResponse, booking_doc)


@router.get("", response_model=List[FreightBookingResponse])
async def list_freight_bookings(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1),
    status: Optional[FreightBookingStatus] = None,
    purchase_order_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if current_user["role"] == UserRole.BUYER:
        query["buyer_id"] = current_user["sub"]
    elif current_user["role"] == UserRole.FARMER:
        query["seller_id"] = current_user["sub"]
    elif current_user["role"] == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
        t_id = str(transporter["_id"]) if transporter else None
        if status == FreightBookingStatus.CONFIRMED:
            my_quotes = await db.freight_quotations.find({"transporter_id": t_id, "status": "ACCEPTED"}).to_list(None) if t_id else []
            my_quote_ids = [str(q["_id"]) for q in my_quotes]
            query["status"] = FreightBookingStatus.CONFIRMED.value
            query["accepted_quotation_id"] = {"$in": my_quote_ids}
        elif status:
            query["status"] = status.value if hasattr(status, "value") else status
        else:
            query["status"] = {"$in": [
                FreightBookingStatus.REQUESTED.value,
                FreightBookingStatus.QUOTATION_PENDING.value,
                FreightBookingStatus.QUOTED.value
            ]}
    
    if status and current_user["role"] != UserRole.TRANSPORTER:
        query["status"] = status.value if hasattr(status, "value") else status
    if purchase_order_id:
        query["purchase_order_id"] = purchase_order_id
    
    bookings = await db.freight_bookings.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [to_response(FreightBookingResponse, b) for b in bookings]


@router.get("/{booking_id}", response_model=FreightBookingResponse)
async def get_freight_booking(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    booking = await resolve_doc(db.freight_bookings, booking_id, "Freight Booking", business_key="booking_id")
    
    if current_user["role"] == UserRole.BUYER and booking.get("buyer_id") != current_user["sub"]:
        raise ForbiddenError("Not authorized to view this booking")
    elif current_user["role"] == UserRole.FARMER and booking.get("seller_id") != current_user["sub"]:
        raise ForbiddenError("Not authorized to view this booking")
    
    return to_response(FreightBookingResponse, booking)


@router.patch("/{booking_id}", response_model=FreightBookingResponse)
async def update_freight_booking(
    booking_id: str,
    booking_data: FreightBookingUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    booking = await resolve_doc(db.freight_bookings, booking_id, "Freight Booking", business_key="booking_id")
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.BUYER, UserRole.FARMER]:
        raise ForbiddenError("Only booking creator or admin can update freight booking")
    if current_user["role"] == UserRole.BUYER and booking.get("buyer_id") != current_user["sub"]:
        raise ForbiddenError("Not authorized to update this booking")
    if current_user["role"] == UserRole.FARMER and booking.get("seller_id") != current_user["sub"]:
        raise ForbiddenError("Not authorized to update this booking")
    
    allowed_statuses = [
        FreightBookingStatus.REQUESTED.value, FreightBookingStatus.QUOTATION_PENDING.value, FreightBookingStatus.QUOTED.value,
        FreightBookingStatus.REQUESTED, FreightBookingStatus.QUOTATION_PENDING, FreightBookingStatus.QUOTED
    ]
    if booking.get("status") not in allowed_statuses:
        raise ValidationError(f"Cannot update booking in status {booking.get('status')}")

    update_data = booking_data.model_dump(exclude_unset=True)
    if not update_data:
        raise ValidationError("No valid fields to update")

    pickup_date = update_data.get("requested_pickup_date") or booking.get("requested_pickup_date")
    delivery_date = update_data.get("required_delivery_date") or booking.get("required_delivery_date")
    if isinstance(pickup_date, datetime):
        pickup_date = pickup_date.date()
    if isinstance(delivery_date, datetime):
        delivery_date = delivery_date.date()
    if pickup_date and delivery_date:
        validate_date_order(pickup_date, delivery_date, "requested_pickup_date", "required_delivery_date")

    now = datetime.now(timezone.utc)
    update_data["updated_at"] = now

    await db.freight_bookings.update_one(
        {"_id": booking["_id"]},
        {"$set": to_mongo(update_data)}
    )

    updated = await db.freight_bookings.find_one({"_id": booking["_id"]})
    return to_response(FreightBookingResponse, updated)


@router.post("/{booking_id}/cancel", response_model=FreightBookingResponse)
async def cancel_freight_booking(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    booking = await resolve_doc(db.freight_bookings, booking_id, "Freight Booking", business_key="booking_id")

    if current_user["role"] not in [UserRole.ADMIN, UserRole.BUYER, UserRole.FARMER]:
        raise ForbiddenError("Only booking creator or admin can cancel freight booking")
    if current_user["role"] == UserRole.BUYER and booking.get("buyer_id") != current_user["sub"]:
        raise ForbiddenError("Not authorized to cancel this booking")
    if current_user["role"] == UserRole.FARMER and booking.get("seller_id") != current_user["sub"]:
        raise ForbiddenError("Not authorized to cancel this booking")

    forbidden_cancel = [
        FreightBookingStatus.CONFIRMED.value, FreightBookingStatus.COMPLETED.value, FreightBookingStatus.CANCELLED.value,
        FreightBookingStatus.CONFIRMED, FreightBookingStatus.COMPLETED, FreightBookingStatus.CANCELLED
    ]
    if booking.get("status") in forbidden_cancel:
        raise ValidationError(f"Cannot cancel booking with status {booking.get('status')}")

    now = datetime.now(timezone.utc)
    async def _transaction(session):
        await db.freight_bookings.update_one(
            {"_id": booking["_id"]},
            {"$set": {"status": FreightBookingStatus.CANCELLED.value, "updated_at": now}},
            session=session
        )
        # Reject any submitted quotations
        await db.freight_quotations.update_many(
            {"booking_id": str(booking["_id"]), "status": "SUBMITTED"},
            {"$set": {"status": "REJECTED", "updated_at": now}},
            session=session
        )
    await run_in_txn(_transaction)

    updated = await db.freight_bookings.find_one({"_id": booking["_id"]})
    return to_response(FreightBookingResponse, updated)

import uuid
from typing import Optional, List
from datetime import datetime, date, timezone, timedelta
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, ConfigDict
from bson import ObjectId

from app.db.mongodb import get_database
from app.core.permissions import get_current_user
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError, ConflictError
from app.core.constants import UserRole, FreightBookingStatus, LedgerEventType
from app.services.ledger_service import append_ledger_block
from app.db.unit_of_work import run_in_txn
from app.utils.serialization import to_response
from app.utils.mongo import to_mongo, resolve_doc
from app.schemas.validators import validate_date_order

router = APIRouter()


class FreightQuotationCreate(BaseModel):
    booking_id: str
    proposed_vehicle_category: str = Field(...)
    freight_base_charge_paise: int = Field(..., ge=0)
    fuel_surcharge_paise: int = Field(0, ge=0)
    planned_distance_km: float = Field(..., gt=0)
    estimated_transit_hours: float = Field(..., gt=0)
    model_config = ConfigDict(extra="forbid")


class FreightQuotationAccept(BaseModel):
    quotation_id: str
    model_config = ConfigDict(extra="forbid")


class FreightQuotationResponse(BaseModel):
    id: str
    quotation_id: str
    booking_id: str
    transporter_id: str
    proposed_vehicle_category: str
    freight_base_charge_paise: int
    fuel_surcharge_paise: int = 0
    total_freight_charge_paise: int
    planned_distance_km: float
    estimated_transit_hours: float
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


def generate_quotation_id() -> str:
    return f"FQ-{uuid.uuid4().hex[:10].upper()}"


@router.post("", response_model=FreightQuotationResponse)
async def create_freight_quotation(
    quotation_data: FreightQuotationCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.TRANSPORTER, UserRole.ADMIN]:
        raise ForbiddenError("Only transporters or admins can submit quotations")
    
    transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
    if not transporter and current_user["role"] != UserRole.ADMIN:
        raise NotFoundError("Transporter profile", current_user["sub"])
    
    t_id = str(transporter["_id"]) if transporter else current_user["sub"]
    

    booking = await resolve_doc(db.freight_bookings, quotation_data.booking_id, "Freight Booking", business_key="booking_id")
    
    allowed_statuses = [
        FreightBookingStatus.REQUESTED.value,
        FreightBookingStatus.QUOTATION_PENDING.value,
        FreightBookingStatus.QUOTED.value,
        FreightBookingStatus.REQUESTED,
        FreightBookingStatus.QUOTATION_PENDING,
        FreightBookingStatus.QUOTED,
    ]
    if booking["status"] not in allowed_statuses:
        raise ValidationError(f"Booking is not accepting quotations (status: {booking['status']})")
    
    existing = await db.freight_quotations.find_one({
        "booking_id": str(booking["_id"]),
        "transporter_id": t_id,
        "status": {"$in": ["SUBMITTED", "ACCEPTED"]}
    })
    if existing:
        raise ConflictError("An active quotation has already been submitted for this booking by your company")
    
    total_charge = (
        quotation_data.freight_base_charge_paise +
        quotation_data.fuel_surcharge_paise
    )
    
    quotation_id = generate_quotation_id()
    while await db.freight_quotations.find_one({"quotation_id": quotation_id}):
        quotation_id = generate_quotation_id()

    now = datetime.now(timezone.utc)
    
    quotation_doc = {
        "quotation_id": quotation_id,
        "booking_id": str(booking["_id"]),
        "transporter_id": t_id,
        "proposed_vehicle_category": quotation_data.proposed_vehicle_category,
        "freight_base_charge_paise": quotation_data.freight_base_charge_paise,
        "fuel_surcharge_paise": quotation_data.fuel_surcharge_paise,
        "total_freight_charge_paise": total_charge,
        "planned_distance_km": quotation_data.planned_distance_km,
        "estimated_transit_hours": quotation_data.estimated_transit_hours,
        "status": "SUBMITTED",
        "created_at": now,
        "updated_at": now,
    }
    
    async def _transaction(session):
        result = await db.freight_quotations.insert_one(to_mongo(quotation_doc), session=session)
        quotation_doc["_id"] = result.inserted_id
        
        await db.freight_bookings.update_one(
            {"_id": booking["_id"]},
            {"$set": {"status": FreightBookingStatus.QUOTED.value, "updated_at": now}},
            session=session
        )
    await run_in_txn(_transaction)
        
    return to_response(FreightQuotationResponse, quotation_doc)


@router.get("", response_model=List[FreightQuotationResponse])
async def list_freight_quotations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1),
    booking_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if current_user["role"] == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
        if transporter:
            query["transporter_id"] = str(transporter["_id"])
        else:
            return []
    elif current_user["role"] in [UserRole.BUYER, UserRole.FARMER]:
        if booking_id:
            booking = await resolve_doc(db.freight_bookings, booking_id, "Freight Booking", business_key="booking_id")
            if current_user["role"] == UserRole.BUYER and booking.get("buyer_id") != current_user["sub"]:
                raise ForbiddenError("Not authorized to view quotations for this booking")
            if current_user["role"] == UserRole.FARMER and booking.get("seller_id") != current_user["sub"]:
                raise ForbiddenError("Not authorized to view quotations for this booking")
            query["booking_id"] = str(booking["_id"])
        else:
            # Scoped by user's bookings
            match_field = "buyer_id" if current_user["role"] == UserRole.BUYER else "seller_id"
            my_bookings = await db.freight_bookings.find({match_field: current_user["sub"]}).to_list(100)
            b_ids = [str(b["_id"]) for b in my_bookings]
            query["booking_id"] = {"$in": b_ids}
    
    if booking_id and current_user["role"] == UserRole.ADMIN:
        b = await resolve_doc(db.freight_bookings, booking_id, "Freight Booking", business_key="booking_id")
        query["booking_id"] = str(b["_id"])
    
    if status:
        query["status"] = status
    
    quotations = await db.freight_quotations.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [to_response(FreightQuotationResponse, q) for q in quotations]


@router.get("/{quotation_id}", response_model=FreightQuotationResponse)
async def get_freight_quotation(
    quotation_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    quotation = await resolve_doc(db.freight_quotations, quotation_id, "Freight Quotation", business_key="quotation_id")
    
    if current_user["role"] == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
        if not transporter or quotation["transporter_id"] != str(transporter["_id"]):
            raise ForbiddenError("Not authorized to view this quotation")
    elif current_user["role"] in [UserRole.BUYER, UserRole.FARMER]:
        booking = await db.freight_bookings.find_one({"_id": ObjectId(quotation["booking_id"]) if ObjectId.is_valid(quotation["booking_id"]) else quotation["booking_id"]})
        if booking:
            field = "buyer_id" if current_user["role"] == UserRole.BUYER else "seller_id"
            if booking.get(field) != current_user["sub"]:
                raise ForbiddenError("Not authorized to view this quotation")
    
    return to_response(FreightQuotationResponse, quotation)


@router.post("/{quotation_id}/accept", response_model=FreightQuotationResponse)
async def accept_freight_quotation(
    quotation_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    quotation = await resolve_doc(db.freight_quotations, quotation_id, "Freight Quotation", business_key="quotation_id")
    
    if quotation.get("status") != "SUBMITTED":
        raise ValidationError(f"Quotation cannot be accepted in status '{quotation.get('status')}'")
    
    booking = await resolve_doc(db.freight_bookings, quotation["booking_id"], "Freight Booking", business_key="booking_id")
    if booking.get("status") not in [
        FreightBookingStatus.REQUESTED.value, FreightBookingStatus.QUOTATION_PENDING.value, FreightBookingStatus.QUOTED.value,
        FreightBookingStatus.REQUESTED, FreightBookingStatus.QUOTATION_PENDING, FreightBookingStatus.QUOTED
    ]:
        raise ValidationError(f"Booking is not open for quote acceptance (status: {booking.get('status')})")

    if current_user["role"] == UserRole.BUYER:
        if booking.get("buyer_id") != current_user["sub"]:
            raise ForbiddenError("Not authorized to accept quotation for this booking")
    elif current_user["role"] == UserRole.FARMER:
        if booking.get("seller_id") != current_user["sub"]:
            raise ForbiddenError("Not authorized to accept quotation for this booking")
    elif current_user["role"] != UserRole.ADMIN:
        raise ForbiddenError("Only the buyer, seller, or admin can accept quotation")
    
    qid = quotation["_id"]
    now = datetime.now(timezone.utc)
    async def _transaction(session):
        await db.freight_quotations.update_one(
            {"_id": qid},
            {"$set": {"status": "ACCEPTED", "updated_at": now}},
            session=session
        )
        
        await db.freight_quotations.update_many(
            {"booking_id": quotation["booking_id"], "_id": {"$ne": qid}},
            {"$set": {"status": "REJECTED", "updated_at": now}},
            session=session
        )
        
        await db.freight_bookings.update_one(
            {"_id": booking["_id"]},
            {"$set": {
                "status": FreightBookingStatus.CONFIRMED.value,
                "accepted_quotation_id": str(qid),
                "updated_at": now
            }},
            session=session
        )
        
        await append_ledger_block(
            db,
            event_type=LedgerEventType.FREIGHT_QUOTATION_ACCEPTED,
            entity_type="FREIGHT_QUOTATION",
            entity_id=str(qid),
            actor_id=current_user["sub"],
            actor_role=current_user["role"],
            event_summary=f"Freight quotation {quotation['quotation_id']} accepted for booking {booking.get('booking_id')}",
            payload={
                "quotation_id": quotation["quotation_id"],
                "booking_id": booking.get("booking_id"),
                "transporter_id": quotation["transporter_id"],
            },
            session=session
        )
    await run_in_txn(_transaction)
    
    updated = await db.freight_quotations.find_one({"_id": qid})
    return to_response(FreightQuotationResponse, updated)

from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date, timezone, timedelta
from bson import ObjectId
from app.db.mongodb import get_database
from app.core.permissions import get_current_user, Role
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError
from app.core.constants import UserRole, FreightBookingStatus
from app.services.ledger_service import append_ledger_block
from app.core.constants import LedgerEventType
from app.db.transaction import transaction_session
import uuid

router = APIRouter()


class FreightQuotationCreate(BaseModel):
    booking_id: str
    proposed_vehicle_category: str
    freight_base_charge_paise: int = Field(..., ge=0)
    handling_charge_paise: int = Field(0, ge=0)
    fuel_surcharge_paise: int = Field(0, ge=0)
    other_charges_paise: int = Field(0, ge=0)
    planned_distance_km: float = Field(..., gt=0)
    estimated_transit_hours: float = Field(..., gt=0)
    expected_pickup_date: date
    expected_delivery_date: date
    validity_days: int = Field(7, gt=0)
    additional_terms: Optional[str] = None


class FreightQuotationAccept(BaseModel):
    quotation_id: str


class FreightQuotationResponse(BaseModel):
    id: str
    quotation_id: str
    booking_id: str
    transporter_id: str
    proposed_vehicle_category: str
    freight_base_charge_paise: int
    handling_charge_paise: int
    fuel_surcharge_paise: int
    other_charges_paise: int
    total_freight_charge_paise: int
    planned_distance_km: float
    estimated_transit_hours: float
    expected_pickup_date: date
    expected_delivery_date: date
    validity_date: datetime
    additional_terms: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime


def generate_quotation_id() -> str:
    return f"FQ-{uuid.uuid4().hex[:10].upper()}"


@router.post("", response_model=FreightQuotationResponse)
async def create_freight_quotation(
    quotation_data: FreightQuotationCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] != UserRole.TRANSPORTER:
        raise ForbiddenError("Only transporters can submit quotations")
    
    transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
    if not transporter:
        raise NotFoundError("Transporter profile", current_user["sub"])
    
    if not ObjectId.is_valid(quotation_data.booking_id):
        raise ValidationError("Invalid booking ID")
    
    booking = await db.freight_bookings.find_one({"_id": ObjectId(quotation_data.booking_id)})
    if not booking:
        raise NotFoundError("Freight Booking", quotation_data.booking_id)
    
    if booking["status"] not in [FreightBookingStatus.REQUESTED, FreightBookingStatus.QUOTATION_PENDING]:
        raise ValidationError("Booking is not accepting quotations")
    
    existing = await db.freight_quotations.find_one({
        "booking_id": quotation_data.booking_id,
        "transporter_id": str(transporter["_id"])
    })
    if existing:
        raise ValidationError("Quotation already submitted for this booking")
    
    total_charge = (
        quotation_data.freight_base_charge_paise +
        quotation_data.handling_charge_paise +
        quotation_data.fuel_surcharge_paise +
        quotation_data.other_charges_paise
    )
    
    quotation_id = generate_quotation_id()
    validity_date = datetime.now(timezone.utc) + timedelta(days=quotation_data.validity_days)
    
    quotation_doc = {
        "quotation_id": quotation_id,
        "booking_id": quotation_data.booking_id,
        "transporter_id": str(transporter["_id"]),
        "proposed_vehicle_category": quotation_data.proposed_vehicle_category,
        "freight_base_charge_paise": quotation_data.freight_base_charge_paise,
        "handling_charge_paise": quotation_data.handling_charge_paise,
        "fuel_surcharge_paise": quotation_data.fuel_surcharge_paise,
        "other_charges_paise": quotation_data.other_charges_paise,
        "total_freight_charge_paise": total_charge,
        "planned_distance_km": quotation_data.planned_distance_km,
        "estimated_transit_hours": quotation_data.estimated_transit_hours,
        "expected_pickup_date": datetime.combine(quotation_data.expected_pickup_date, datetime.min.time()),
        "expected_delivery_date": datetime.combine(quotation_data.expected_delivery_date, datetime.min.time()),
        "validity_date": validity_date,
        "additional_terms": quotation_data.additional_terms,
        "status": "SUBMITTED",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    
    result = await db.freight_quotations.insert_one(quotation_doc)
    quotation_doc["_id"] = result.inserted_id
    
    await db.freight_bookings.update_one(
        {"_id": ObjectId(quotation_data.booking_id)},
        {"$set": {"status": FreightBookingStatus.QUOTED, "updated_at": datetime.now(timezone.utc)}}
    )
    
    await append_ledger_block(
        db,
        event_type=LedgerEventType.FREIGHT_QUOTATION_SUBMITTED,
        entity_type="FREIGHT_QUOTATION",
        entity_id=str(result.inserted_id),
        actor_id=current_user["sub"],
        actor_role=current_user["role"],
        event_summary=f"Freight quotation {quotation_id} submitted for booking {booking['booking_id']}",
        payload={
            "quotation_id": quotation_id,
            "booking_id": booking["booking_id"],
            "total_charge_paise": total_charge,
            "transporter_id": transporter["transporter_id"],
        }
    )
    
    return FreightQuotationResponse(id=str(result.inserted_id), **quotation_doc)


@router.get("", response_model=List[FreightQuotationResponse])
async def list_freight_quotations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
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
    elif current_user["role"] in [UserRole.BUYER, UserRole.FARMER]:
        if booking_id:
            if not ObjectId.is_valid(booking_id):
                raise ValidationError("Invalid booking ID")
            booking = await db.freight_bookings.find_one({"_id": ObjectId(booking_id)})
            if not booking:
                raise NotFoundError("Freight Booking", booking_id)
            
            if current_user["role"] == UserRole.BUYER:
                po = await db.purchase_orders.find_one({"_id": ObjectId(booking["purchase_order_id"])})
                if not po or po["buyer_id"] != current_user["sub"]:
                    raise ForbiddenError("Not authorized")
            else:
                po = await db.purchase_orders.find_one({"_id": ObjectId(booking["purchase_order_id"])})
                if not po or po["seller_id"] != current_user["sub"]:
                    raise ForbiddenError("Not authorized")
            
            query["booking_id"] = booking_id
    
    if booking_id and current_user["role"] == UserRole.ADMIN:
        if not ObjectId.is_valid(booking_id):
            raise ValidationError("Invalid booking ID")
        query["booking_id"] = booking_id
    if status:
        query["status"] = status
    
    quotations = await db.freight_quotations.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [FreightQuotationResponse(id=str(q["_id"]), **q) for q in quotations]


@router.get("/{quotation_id}", response_model=FreightQuotationResponse)
async def get_freight_quotation(
    quotation_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(quotation_id):
        raise ValidationError("Invalid quotation ID")
    
    quotation = await db.freight_quotations.find_one({"_id": ObjectId(quotation_id)})
    if not quotation:
        raise NotFoundError("Freight Quotation", quotation_id)
    
    if current_user["role"] == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
        if not transporter or quotation["transporter_id"] != str(transporter["_id"]):
            raise ForbiddenError("Not authorized to view this quotation")
    
    return FreightQuotationResponse(id=str(quotation["_id"]), **quotation)


@router.post("/{quotation_id}/accept", response_model=FreightQuotationResponse)
async def accept_freight_quotation(
    quotation_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(quotation_id):
        raise ValidationError("Invalid quotation ID")
    
    quotation = await db.freight_quotations.find_one({"_id": ObjectId(quotation_id)})
    if not quotation:
        raise NotFoundError("Freight Quotation", quotation_id)
    
    booking = await db.freight_bookings.find_one({"_id": ObjectId(quotation["booking_id"])})
    if not booking:
        raise NotFoundError("Freight Booking", quotation["booking_id"])
    
    if current_user["role"] == UserRole.BUYER:
        po = await db.purchase_orders.find_one({"_id": ObjectId(booking["purchase_order_id"])})
        if not po or po["buyer_id"] != current_user["sub"]:
            raise ForbiddenError("Not authorized")
    elif current_user["role"] == UserRole.FARMER:
        po = await db.purchase_orders.find_one({"_id": ObjectId(booking["purchase_order_id"])})
        if not po or po["seller_id"] != current_user["sub"]:
            raise ForbiddenError("Not authorized")
    else:
        raise ForbiddenError("Only buyer or seller can accept quotation")
    
    async with transaction_session() as session:
        await db.freight_quotations.update_one(
            {"_id": ObjectId(quotation_id)},
            {"$set": {"status": "ACCEPTED", "updated_at": datetime.now(timezone.utc)}},
            session=session
        )
        
        await db.freight_quotations.update_many(
            {"booking_id": quotation["booking_id"], "_id": {"$ne": ObjectId(quotation_id)}},
            {"$set": {"status": "REJECTED", "updated_at": datetime.now(timezone.utc)}},
            session=session
        )
        
        await db.freight_bookings.update_one(
            {"_id": ObjectId(quotation["booking_id"])},
            {"$set": {"status": FreightBookingStatus.CONFIRMED, "accepted_quotation_id": quotation_id, "updated_at": datetime.now(timezone.utc)}},
            session=session
        )
        
        await append_ledger_block(
            db,
            event_type=LedgerEventType.FREIGHT_QUOTATION_ACCEPTED,
            entity_type="FREIGHT_QUOTATION",
            entity_id=quotation_id,
            actor_id=current_user["sub"],
            actor_role=current_user["role"],
            event_summary=f"Freight quotation {quotation['quotation_id']} accepted for booking {booking['booking_id']}",
            payload={
                "quotation_id": quotation["quotation_id"],
                "booking_id": booking["booking_id"],
                "transporter_id": quotation["transporter_id"],
            },
            session=session
        )
    
    updated = await db.freight_quotations.find_one({"_id": ObjectId(quotation_id)})
    return FreightQuotationResponse(id=str(updated["_id"]), **updated)
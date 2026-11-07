from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
from app.db.mongodb import get_database
from app.core.permissions import get_current_user, Role
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError
from app.core.constants import (
    ShipmentStatus, UserRole, ShipmentExceptionType, VehicleCategory, FreightBookingStatus
)
from app.services.ledger_service import append_ledger_block
from app.core.constants import LedgerEventType
from app.db.transaction import transaction_session
import uuid

router = APIRouter()


class ShipmentCreate(BaseModel):
    booking_id: str
    accepted_quotation_id: str
    vehicle_id: str
    driver_id: str
    planned_checkpoints: List[dict] = []


class ShipmentAssignVehicle(BaseModel):
    vehicle_id: str


class ShipmentAssignDriver(BaseModel):
    driver_id: str


class ShipmentStatusUpdate(BaseModel):
    status: ShipmentStatus


class ShipmentExceptionReport(BaseModel):
    exception_type: ShipmentExceptionType
    description: str
    severity: str = Field(..., pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$")


class ShipmentLoad(BaseModel):
    actual_weight_kg: float = Field(..., gt=0)
    actual_package_count: int = Field(..., gt=0)
    batch_quantities: List[dict]


class ShipmentResponse(BaseModel):
    id: str
    shipment_id: str
    booking_id: str
    purchase_order_id: str
    farmer_id: str
    buyer_id: str
    transporter_id: str
    vehicle_id: str
    driver_id: str
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
    planned_dispatch_time: Optional[datetime]
    expected_arrival_time: Optional[datetime]
    actual_dispatch_time: Optional[datetime]
    actual_arrival_time: Optional[datetime]
    status: ShipmentStatus
    exception_flags: List[str]
    created_at: datetime
    updated_at: datetime


def generate_shipment_id(pickup_state: str, destination_state: str) -> str:
    pickup_code = pickup_state[:3].upper()
    dest_code = destination_state[:3].upper()
    unique = uuid.uuid4().hex[:6].upper()
    return f"SHIP-{pickup_code}-{dest_code}-{unique}"


@router.post("", response_model=ShipmentResponse)
async def create_shipment(
    shipment_data: ShipmentCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] != UserRole.TRANSPORTER:
        raise ForbiddenError("Only transporters can create shipments")
    
    if not ObjectId.is_valid(shipment_data.booking_id):
        raise ValidationError("Invalid booking ID")
    
    booking = await db.freight_bookings.find_one({"_id": ObjectId(shipment_data.booking_id)})
    if not booking:
        raise NotFoundError("Freight Booking", shipment_data.booking_id)
    
    if booking["status"] != FreightBookingStatus.CONFIRMED:
        raise ValidationError("Booking must be confirmed before creating shipment")
    
    if booking.get("accepted_quotation_id") != shipment_data.accepted_quotation_id:
        raise ValidationError("Quotation ID does not match accepted quotation")
    
    quotation = await db.freight_quotations.find_one({"_id": ObjectId(shipment_data.accepted_quotation_id)})
    if not quotation:
        raise NotFoundError("Quotation", shipment_data.accepted_quotation_id)
    
    transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
    if not transporter:
        raise NotFoundError("Transporter profile", current_user["sub"])
    
    if quotation["transporter_id"] != str(transporter["_id"]):
        raise ForbiddenError("Quotation does not belong to this transporter")
    
    if not ObjectId.is_valid(shipment_data.vehicle_id):
        raise ValidationError("Invalid vehicle ID")
    vehicle = await db.vehicles.find_one({"_id": ObjectId(shipment_data.vehicle_id)})
    if not vehicle:
        raise NotFoundError("Vehicle", shipment_data.vehicle_id)
    if vehicle["transporter_id"] != str(transporter["_id"]):
        raise ForbiddenError("Vehicle does not belong to this transporter")
    if vehicle["status"] != "AVAILABLE":
        raise ValidationError("Vehicle is not available")
    
    if not ObjectId.is_valid(shipment_data.driver_id):
        raise ValidationError("Invalid driver ID")
    driver = await db.drivers.find_one({"_id": ObjectId(shipment_data.driver_id)})
    if not driver:
        raise NotFoundError("Driver", shipment_data.driver_id)
    if driver["transporter_id"] != str(transporter["_id"]):
        raise ForbiddenError("Driver does not belong to this transporter")
    if driver["status"] != "AVAILABLE":
        raise ValidationError("Driver is not available")
    
    po = await db.purchase_orders.find_one({"_id": ObjectId(booking["purchase_order_id"])})
    if not po:
        raise NotFoundError("Purchase Order", booking["purchase_order_id"])
    
    shipment_id = generate_shipment_id(booking["pickup_state"], booking["destination_state"])
    existing = await db.shipments.find_one({"shipment_id": shipment_id})
    while existing:
        shipment_id = generate_shipment_id(booking["pickup_state"], booking["destination_state"])
        existing = await db.shipments.find_one({"shipment_id": shipment_id})
    
    shipment_doc = {
        "shipment_id": shipment_id,
        "booking_id": shipment_data.booking_id,
        "purchase_order_id": booking["purchase_order_id"],
        "farmer_id": po["seller_id"],
        "buyer_id": po["buyer_id"],
        "transporter_id": str(transporter["_id"]),
        "vehicle_id": shipment_data.vehicle_id,
        "driver_id": shipment_data.driver_id,
        "batch_ids": booking["batch_ids"],
        "cargo_quantity_kg": booking["cargo_quantity_kg"],
        "total_cargo_weight_kg": booking["total_cargo_weight_kg"],
        "package_count": booking["package_count"],
        "pickup_address": booking["pickup_address"],
        "pickup_city": booking["pickup_city"],
        "pickup_state": booking["pickup_state"],
        "destination_address": booking["destination_address"],
        "destination_city": booking["destination_city"],
        "destination_state": booking["destination_state"],
        "planned_dispatch_time": None,
        "expected_arrival_time": None,
        "actual_dispatch_time": None,
        "actual_arrival_time": None,
        "status": ShipmentStatus.BOOKING_CONFIRMED,
        "exception_flags": [],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    
    async with transaction_session() as session:
        result = await db.shipments.insert_one(shipment_doc, session=session)
        shipment_doc["_id"] = result.inserted_id
        
        await db.vehicles.update_one(
            {"_id": ObjectId(shipment_data.vehicle_id)},
            {"$set": {"status": "ASSIGNED", "updated_at": datetime.now(timezone.utc)}},
            session=session
        )
        
        await db.drivers.update_one(
            {"_id": ObjectId(shipment_data.driver_id)},
            {"$set": {"status": "ASSIGNED", "current_assignment": str(result.inserted_id), "updated_at": datetime.now(timezone.utc)}},
            session=session
        )
        
        for checkpoint in shipment_data.planned_checkpoints:
            checkpoint_doc = {
                "checkpoint_id": f"CP-{uuid.uuid4().hex[:8].upper()}",
                "shipment_id": str(result.inserted_id),
                "name": checkpoint.get("name"),
                "city": checkpoint.get("city"),
                "state": checkpoint.get("state"),
                "sequence": checkpoint.get("sequence", 0),
                "planned_arrival": checkpoint.get("planned_arrival"),
                "planned_departure": checkpoint.get("planned_departure"),
                "status": "PENDING",
                "created_at": datetime.now(timezone.utc),
            }
            await db.route_checkpoints.insert_one(checkpoint_doc, session=session)
        
        for batch_id in booking["batch_ids"]:
            item_doc = {
                "item_id": f"SI-{uuid.uuid4().hex[:8].upper()}",
                "shipment_id": str(result.inserted_id),
                "batch_id": batch_id,
                "quantity_kg": 0,
                "created_at": datetime.now(timezone.utc),
            }
            await db.shipment_items.insert_one(item_doc, session=session)
        
        await append_ledger_block(
            db,
            event_type=LedgerEventType.SHIPMENT_CREATED,
            entity_type="SHIPMENT",
            entity_id=str(result.inserted_id),
            actor_id=current_user["sub"],
            actor_role=current_user["role"],
            event_summary=f"Shipment {shipment_id} created from booking {booking['booking_id']}",
            payload={
                "shipment_id": shipment_id,
                "booking_id": booking["booking_id"],
                "vehicle_id": vehicle["vehicle_id"],
                "driver_id": driver["driver_id"],
            },
            session=session
        )
    
    return ShipmentResponse(id=str(shipment_doc["_id"]), **shipment_doc)


@router.get("", response_model=List[ShipmentResponse])
async def list_shipments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[ShipmentStatus] = None,
    transporter_id: Optional[str] = None,
    driver_id: Optional[str] = None,
    vehicle_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if current_user["role"] == UserRole.FARMER:
        query["farmer_id"] = current_user["sub"]
    elif current_user["role"] == UserRole.BUYER:
        query["buyer_id"] = current_user["sub"]
    elif current_user["role"] == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
        if transporter:
            query["transporter_id"] = str(transporter["_id"])
    elif current_user["role"] == UserRole.DRIVER:
        query["driver_id"] = current_user["sub"]
    
    if status:
        query["status"] = status
    if transporter_id and current_user["role"] == UserRole.ADMIN:
        if not ObjectId.is_valid(transporter_id):
            raise ValidationError("Invalid transporter ID")
        query["transporter_id"] = transporter_id
    if driver_id:
        if not ObjectId.is_valid(driver_id):
            raise ValidationError("Invalid driver ID")
        query["driver_id"] = driver_id
    if vehicle_id:
        if not ObjectId.is_valid(vehicle_id):
            raise ValidationError("Invalid vehicle ID")
        query["vehicle_id"] = vehicle_id
    
    shipments = await db.shipments.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [ShipmentResponse(id=str(s["_id"]), **s) for s in shipments]


@router.get("/{shipment_id}", response_model=ShipmentResponse)
async def get_shipment(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if ObjectId.is_valid(shipment_id):
        shipment = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
    else:
        shipment = await db.shipments.find_one({"shipment_id": shipment_id})
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
    
    return ShipmentResponse(id=str(shipment["_id"]), **shipment)


@router.post("/{shipment_id}/assign-vehicle", response_model=ShipmentResponse)
async def assign_vehicle(
    shipment_id: str,
    assign_data: ShipmentAssignVehicle,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] != UserRole.TRANSPORTER:
        raise ForbiddenError("Only transporters can assign vehicles")
    
    if not ObjectId.is_valid(shipment_id):
        raise ValidationError("Invalid shipment ID")
    
    shipment = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
    if not shipment:
        raise NotFoundError("Shipment", shipment_id)
    
    transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
    if not transporter or shipment["transporter_id"] != str(transporter["_id"]):
        raise ForbiddenError("Not authorized")
    
    if not ObjectId.is_valid(assign_data.vehicle_id):
        raise ValidationError("Invalid vehicle ID")
    vehicle = await db.vehicles.find_one({"_id": ObjectId(assign_data.vehicle_id)})
    if not vehicle:
        raise NotFoundError("Vehicle", assign_data.vehicle_id)
    if vehicle["transporter_id"] != str(transporter["_id"]):
        raise ForbiddenError("Vehicle does not belong to this transporter")
    if vehicle["status"] != "AVAILABLE":
        raise ValidationError("Vehicle is not available")
    
    if shipment["status"] != ShipmentStatus.BOOKING_CONFIRMED:
        raise ValidationError("Vehicle can only be assigned at BOOKING_CONFIRMED status")
    
    async with transaction_session() as session:
        await db.shipments.update_one(
            {"_id": ObjectId(shipment_id)},
            {"$set": {"vehicle_id": assign_data.vehicle_id, "status": ShipmentStatus.VEHICLE_ASSIGNED, "updated_at": datetime.now(timezone.utc)}},
            session=session
        )
        
        await db.vehicles.update_one(
            {"_id": ObjectId(assign_data.vehicle_id)},
            {"$set": {"status": "ASSIGNED", "updated_at": datetime.now(timezone.utc)}},
            session=session
        )
        
        await append_ledger_block(
            db,
            event_type=LedgerEventType.VEHICLE_ASSIGNED,
            entity_type="SHIPMENT",
            entity_id=shipment_id,
            actor_id=current_user["sub"],
            actor_role=current_user["role"],
            event_summary=f"Vehicle {vehicle['vehicle_id']} assigned to shipment {shipment['shipment_id']}",
            payload={"vehicle_id": vehicle["vehicle_id"], "shipment_id": shipment["shipment_id"]},
            session=session
        )
    
    updated = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
    return ShipmentResponse(id=str(updated["_id"]), **updated)


@router.post("/{shipment_id}/assign-driver", response_model=ShipmentResponse)
async def assign_driver(
    shipment_id: str,
    assign_data: ShipmentAssignDriver,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] != UserRole.TRANSPORTER:
        raise ForbiddenError("Only transporters can assign drivers")
    
    if not ObjectId.is_valid(shipment_id):
        raise ValidationError("Invalid shipment ID")
    
    shipment = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
    if not shipment:
        raise NotFoundError("Shipment", shipment_id)
    
    transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
    if not transporter or shipment["transporter_id"] != str(transporter["_id"]):
        raise ForbiddenError("Not authorized")
    
    if not ObjectId.is_valid(assign_data.driver_id):
        raise ValidationError("Invalid driver ID")
    driver = await db.drivers.find_one({"_id": ObjectId(assign_data.driver_id)})
    if not driver:
        raise NotFoundError("Driver", assign_data.driver_id)
    if driver["transporter_id"] != str(transporter["_id"]):
        raise ForbiddenError("Driver does not belong to this transporter")
    if driver["status"] != "AVAILABLE":
        raise ValidationError("Driver is not available")
    
    if shipment["status"] != ShipmentStatus.VEHICLE_ASSIGNED:
        raise ValidationError("Driver can only be assigned at VEHICLE_ASSIGNED status")
    
    async with transaction_session() as session:
        await db.shipments.update_one(
            {"_id": ObjectId(shipment_id)},
            {"$set": {"driver_id": assign_data.driver_id, "status": ShipmentStatus.DRIVER_ASSIGNED, "updated_at": datetime.now(timezone.utc)}},
            session=session
        )
        
        await db.drivers.update_one(
            {"_id": ObjectId(assign_data.driver_id)},
            {"$set": {"status": "ASSIGNED", "current_assignment": shipment_id, "updated_at": datetime.now(timezone.utc)}},
            session=session
        )
        
        await append_ledger_block(
            db,
            event_type=LedgerEventType.DRIVER_ASSIGNED,
            entity_type="SHIPMENT",
            entity_id=shipment_id,
            actor_id=current_user["sub"],
            actor_role=current_user["role"],
            event_summary=f"Driver {driver['driver_id']} assigned to shipment {shipment['shipment_id']}",
            payload={"driver_id": driver["driver_id"], "shipment_id": shipment["shipment_id"]},
            session=session
        )
    
    updated = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
    return ShipmentResponse(id=str(updated["_id"]), **updated)


@router.post("/{shipment_id}/load", response_model=ShipmentResponse)
async def load_shipment(
    shipment_id: str,
    load_data: ShipmentLoad,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.DRIVER, UserRole.TRANSPORTER, UserRole.WAREHOUSE_MANAGER]:
        raise ForbiddenError("Only driver, transporter, or warehouse manager can load shipment")
    
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
    
    if shipment["status"] not in [ShipmentStatus.DRIVER_ASSIGNED, ShipmentStatus.LOADING]:
        raise ValidationError("Shipment can only be loaded at DRIVER_ASSIGNED or LOADING status")
    
    async with transaction_session() as session:
        for item in load_data.batch_quantities:
            batch_id = item.get("batch_id")
            quantity = item.get("quantity_kg", 0)
            await db.shipment_items.update_one(
                {"shipment_id": shipment_id, "batch_id": batch_id},
                {"$set": {"quantity_kg": quantity, "updated_at": datetime.now(timezone.utc)}},
                session=session
            )
        
        await db.shipments.update_one(
            {"_id": ObjectId(shipment_id)},
            {"$set": {"status": ShipmentStatus.LOADED, "actual_dispatch_time": None, "updated_at": datetime.now(timezone.utc)}},
            session=session
        )
        
        await append_ledger_block(
            db,
            event_type=LedgerEventType.CARGO_LOADED,
            entity_type="SHIPMENT",
            entity_id=shipment_id,
            actor_id=current_user["sub"],
            actor_role=current_user["role"],
            event_summary=f"Shipment {shipment['shipment_id']} loaded with {load_data.actual_weight_kg}kg",
            payload={"actual_weight_kg": load_data.actual_weight_kg, "package_count": load_data.actual_package_count},
            session=session
        )
    
    updated = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
    return ShipmentResponse(id=str(updated["_id"]), **updated)


@router.post("/{shipment_id}/dispatch", response_model=ShipmentResponse)
async def dispatch_shipment(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.DRIVER, UserRole.TRANSPORTER]:
        raise ForbiddenError("Only driver or transporter can dispatch shipment")
    
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
    
    if shipment["status"] != ShipmentStatus.LOADED:
        raise ValidationError("Shipment can only be dispatched at LOADED status")
    
    async with transaction_session() as session:
        await db.shipments.update_one(
            {"_id": ObjectId(shipment_id)},
            {"$set": {"status": ShipmentStatus.DISPATCHED, "actual_dispatch_time": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}},
            session=session
        )
        
        for batch_id in shipment["batch_ids"]:
            await db.produce_batches.update_one(
                {"_id": ObjectId(batch_id)},
                {"$set": {"status": "DISPATCHED", "updated_at": datetime.now(timezone.utc)}},
                session=session
            )
        
        await append_ledger_block(
            db,
            event_type=LedgerEventType.SHIPMENT_DISPATCHED,
            entity_type="SHIPMENT",
            entity_id=shipment_id,
            actor_id=current_user["sub"],
            actor_role=current_user["role"],
            event_summary=f"Shipment {shipment['shipment_id']} dispatched",
            payload={"dispatch_time": datetime.now(timezone.utc).isoformat()},
            session=session
        )
    
    updated = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
    return ShipmentResponse(id=str(updated["_id"]), **updated)


@router.post("/{shipment_id}/report-exception", response_model=ShipmentResponse)
async def report_exception(
    shipment_id: str,
    exception_data: ShipmentExceptionReport,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.DRIVER, UserRole.TRANSPORTER]:
        raise ForbiddenError("Only driver or transporter can report exceptions")
    
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
    
    exception_flag = exception_data.exception_type
    current_flags = shipment.get("exception_flags", [])
    if exception_flag not in current_flags:
        current_flags.append(exception_flag)
    
    async with transaction_session() as session:
        await db.shipments.update_one(
            {"_id": ObjectId(shipment_id)},
            {"$set": {"exception_flags": current_flags, "updated_at": datetime.now(timezone.utc)}},
            session=session
        )
        
        event_doc = {
            "event_id": f"EV-{uuid.uuid4().hex[:10].upper()}",
            "shipment_id": shipment_id,
            "event_type": exception_data.exception_type,
            "description": exception_data.description,
            "severity": exception_data.severity,
            "reported_by": current_user["sub"],
            "created_at": datetime.now(timezone.utc),
        }
        await db.shipment_events.insert_one(event_doc, session=session)
        
        if exception_data.exception_type == ShipmentExceptionType.TEMPERATURE_ALERT:
            ledger_event = LedgerEventType.TEMPERATURE_ALERT_RAISED
        elif exception_data.exception_type == ShipmentExceptionType.HUMIDITY_ALERT:
            ledger_event = LedgerEventType.HUMIDITY_ALERT_RAISED
        elif exception_data.exception_type == ShipmentExceptionType.DELAYED:
            ledger_event = LedgerEventType.SHIPMENT_DELAYED
        elif exception_data.exception_type == ShipmentExceptionType.VEHICLE_BREAKDOWN:
            ledger_event = LedgerEventType.VEHICLE_BREAKDOWN_REPORTED
        else:
            ledger_event = None
        
        if ledger_event:
            await append_ledger_block(
                db,
                event_type=ledger_event,
                entity_type="SHIPMENT",
                entity_id=shipment_id,
                actor_id=current_user["sub"],
                actor_role=current_user["role"],
                event_summary=f"Exception {exception_data.exception_type} reported for shipment {shipment['shipment_id']}",
                payload={"exception_type": exception_data.exception_type, "description": exception_data.description, "severity": exception_data.severity},
                session=session
            )
    
    updated = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
    return ShipmentResponse(id=str(updated["_id"]), **updated)


@router.get("/{shipment_id}/timeline")
async def get_shipment_timeline(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(shipment_id):
        raise ValidationError("Invalid shipment ID")
    
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
    
    checkpoints = await db.route_checkpoints.find({"shipment_id": shipment_id}).sort("sequence", 1).to_list(None)
    events = await db.shipment_events.find({"shipment_id": shipment_id}).sort("created_at", 1).to_list(None)
    
    return {
        "shipment_id": shipment["shipment_id"],
        "current_status": shipment["status"],
        "exception_flags": shipment.get("exception_flags", []),
        "checkpoints": [{
            "checkpoint_id": c["checkpoint_id"],
            "name": c["name"],
            "city": c["city"],
            "state": c["state"],
            "sequence": c["sequence"],
            "planned_arrival": c.get("planned_arrival"),
            "planned_departure": c.get("planned_departure"),
            "actual_arrival": c.get("actual_arrival"),
            "actual_departure": c.get("actual_departure"),
            "status": c["status"],
            "notes": c.get("notes"),
        } for c in checkpoints],
        "events": [{
            "event_id": e["event_id"],
            "event_type": e["event_type"],
            "description": e["description"],
            "severity": e["severity"],
            "reported_by": e["reported_by"],
            "created_at": e["created_at"],
        } for e in events],
    }
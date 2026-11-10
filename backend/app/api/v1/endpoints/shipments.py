import uuid
import logging
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, ConfigDict
from bson import ObjectId

from app.db.mongodb import get_database
from app.core.permissions import get_current_user
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError, ConflictError
from app.core.constants import (
    ShipmentStatus, UserRole, ShipmentExceptionType, VehicleCategory, FreightBookingStatus, LedgerEventType
)
from app.services.ledger_service import append_ledger_block
from app.db.unit_of_work import uow
from app.utils.serialization import to_response
from app.utils.mongo import to_mongo, resolve_doc
from app.core.access import get_transporter_for_user, get_driver_for_user, assert_can_view_shipment
from app.services.shipment_workflow import transition_shipment, cancel_shipment, finalize_shipment
from app.services.inventory_service import dispatch_stock, reserve_stock, release_stock

router = APIRouter()
logger = logging.getLogger(__name__)


class ShipmentCreate(BaseModel):
    booking_id: str
    accepted_quotation_id: str
    vehicle_id: str
    driver_id: str
    planned_checkpoints: List[dict] = Field(default_factory=list)
    model_config = ConfigDict(extra="forbid")


class ShipmentAssignVehicle(BaseModel):
    vehicle_id: str
    model_config = ConfigDict(extra="forbid")


class ShipmentAssignDriver(BaseModel):
    driver_id: str
    model_config = ConfigDict(extra="forbid")


class ShipmentStatusUpdate(BaseModel):
    status: ShipmentStatus
    model_config = ConfigDict(extra="forbid")


class ShipmentExceptionReport(BaseModel):
    exception_type: ShipmentExceptionType
    description: str = Field(..., min_length=2, max_length=1000)
    severity: str = Field(..., pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$")
    model_config = ConfigDict(extra="forbid")


class ShipmentLoad(BaseModel):
    actual_weight_kg: float = Field(..., gt=0, le=1000000.0)
    actual_package_count: int = Field(..., gt=0, le=100000)
    batch_quantities: List[dict] = Field(default_factory=list)
    model_config = ConfigDict(extra="forbid")


class ShipmentCancelRequest(BaseModel):
    reason: str = Field(..., min_length=2, max_length=500)
    model_config = ConfigDict(extra="forbid")


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
    driver_user_id: Optional[str] = None
    batch_ids: List[str] = Field(default_factory=list)
    cargo_quantity_kg: float
    total_cargo_weight_kg: float
    package_count: int
    pickup_address: str
    pickup_city: str
    pickup_state: str
    destination_address: str
    destination_city: str
    destination_state: str
    planned_dispatch_time: Optional[datetime] = None
    expected_arrival_time: Optional[datetime] = None
    actual_dispatch_time: Optional[datetime] = None
    actual_arrival_time: Optional[datetime] = None
    status: ShipmentStatus
    exception_flags: List[str] = Field(default_factory=list)
    cancellation_reason: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


def generate_shipment_id(pickup_state: str, destination_state: str) -> str:
    pickup_code = (pickup_state[:3] if len(pickup_state) >= 3 else (pickup_state + "XXX")[:3]).upper()
    dest_code = (destination_state[:3] if len(destination_state) >= 3 else (destination_state + "XXX")[:3]).upper()
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
    
    booking = await resolve_doc(db.freight_bookings, shipment_data.booking_id, "Freight Booking", business_key="booking_id")
    
    if booking.get("status") not in [FreightBookingStatus.CONFIRMED.value, FreightBookingStatus.CONFIRMED]:
        raise ValidationError("Booking must be confirmed before creating shipment")
    
    quotation = await resolve_doc(db.freight_quotations, shipment_data.accepted_quotation_id, "Freight Quotation", business_key="quotation_id")
    if booking.get("accepted_quotation_id") and booking.get("accepted_quotation_id") != str(quotation["_id"]):
        raise ValidationError("Quotation ID does not match accepted quotation on booking")
    
    transporter = await get_transporter_for_user(db, current_user["sub"])
    if not transporter and current_user["role"] != UserRole.ADMIN:
        raise NotFoundError("Transporter profile", current_user["sub"])
    
    t_id = str(transporter["_id"]) if transporter else quotation["transporter_id"]
    if quotation["transporter_id"] != t_id and current_user["role"] != UserRole.ADMIN:
        raise ForbiddenError("Quotation does not belong to this transporter")
    
    vehicle = await resolve_doc(db.vehicles, shipment_data.vehicle_id, "Vehicle", business_key="vehicle_id")
    if vehicle.get("transporter_id") != t_id and current_user["role"] != UserRole.ADMIN:
        raise ForbiddenError("Vehicle does not belong to this transporter")
    if vehicle.get("status") != "AVAILABLE":
        raise ValidationError(f"Vehicle is not available (status: {vehicle.get('status')})")
    
    # W-03: Vehicle capacity and refrigeration suitability check
    total_cargo = float(booking.get("total_cargo_weight_kg", booking.get("cargo_quantity_kg", 0.0)))
    payload_cap = float(vehicle.get("max_payload_kg") or vehicle.get("capacity_kg") or 0.0)
    if payload_cap < total_cargo:
        raise ValidationError(
            f"Vehicle payload capacity ({payload_cap}kg) is insufficient for cargo ({total_cargo}kg)"
        )
    if booking.get("refrigeration_required", False) and not vehicle.get("refrigeration_available", False):
        raise ValidationError("Booking requires refrigerated vehicle, but selected vehicle does not support refrigeration")
    
    driver = await resolve_doc(db.drivers, shipment_data.driver_id, "Driver", business_key="driver_id")
    if driver.get("transporter_id") != t_id and current_user["role"] != UserRole.ADMIN:
        raise ForbiddenError("Driver does not belong to this transporter")
    if driver.get("status") != "AVAILABLE":
        raise ValidationError(f"Driver is not available (status: {driver.get('status')})")
    
    po = await resolve_doc(db.purchase_orders, booking["purchase_order_id"], "Purchase Order", business_key="order_id")
    
    pickup_st = booking.get("pickup_state", "MH")
    dest_st = booking.get("destination_state", "MH")
    shipment_id = generate_shipment_id(pickup_st, dest_st)
    while await db.shipments.find_one({"shipment_id": shipment_id}):
        shipment_id = generate_shipment_id(pickup_st, dest_st)
    
    now = datetime.now(timezone.utc)
    shipment_doc = {
        "shipment_id": shipment_id,
        "booking_id": str(booking["_id"]),
        "purchase_order_id": str(po["_id"]),
        "farmer_id": po["seller_id"],
        "buyer_id": po["buyer_id"],
        "transporter_id": t_id,
        "vehicle_id": str(vehicle["_id"]),
        "driver_id": str(driver["_id"]),
        "driver_user_id": driver.get("user_id"),
        "batch_ids": booking.get("batch_ids", []),
        "cargo_quantity_kg": booking.get("cargo_quantity_kg", 0.0),
        "total_cargo_weight_kg": booking.get("total_cargo_weight_kg", 0.0),
        "package_count": booking.get("package_count", 1),
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
        "status": ShipmentStatus.DRIVER_ASSIGNED.value,
        "exception_flags": [],
        "created_at": now,
        "updated_at": now,
    }
    
    async with uow() as session:
        result = await db.shipments.insert_one(to_mongo(shipment_doc), session=session)
        shipment_doc["_id"] = result.inserted_id
        
        # Lock vehicle
        await db.vehicles.update_one(
            {"_id": vehicle["_id"]},
            {"$set": {"status": "ASSIGNED", "updated_at": now}},
            session=session
        )
        
        # Lock driver
        await db.drivers.update_one(
            {"_id": driver["_id"]},
            {"$set": {"status": "ASSIGNED", "current_assignment": str(result.inserted_id), "updated_at": now}},
            session=session
        )
        
        for cp in shipment_data.planned_checkpoints:
            cp_doc = {
                "checkpoint_id": f"CP-{uuid.uuid4().hex[:8].upper()}",
                "shipment_id": str(result.inserted_id),
                "name": cp.get("name", "Checkpoint"),
                "city": cp.get("city", ""),
                "state": cp.get("state", ""),
                "sequence": cp.get("sequence", 0),
                "planned_arrival": cp.get("planned_arrival"),
                "planned_departure": cp.get("planned_departure"),
                "status": "PENDING",
                "created_at": now,
            }
            await db.route_checkpoints.insert_one(to_mongo(cp_doc), session=session)
        
        batch_ids = booking.get("batch_ids", [])
        total_cargo = float(booking.get("total_cargo_weight_kg", booking.get("cargo_quantity_kg", 0.0)))
        per_batch_qty = (total_cargo / len(batch_ids)) if batch_ids else total_cargo

        for b_id in batch_ids:
            item_doc = {
                "item_id": f"SI-{uuid.uuid4().hex[:8].upper()}",
                "shipment_id": str(result.inserted_id),
                "batch_id": b_id,
                "quantity_kg": per_batch_qty,
                "created_at": now,
            }
            await db.shipment_items.insert_one(to_mongo(item_doc), session=session)

            # Reserve stock in inventory item if present and not already reserved by PO
            inv = await db.inventory_items.find_one({"batch_id": b_id}, session=session)
            if inv:
                res_already = float(inv.get("reserved_quantity_kg", 0.0))
                needed_res = max(0.0, per_batch_qty - res_already)
                avail_qty = float(inv.get("available_quantity_kg", 0.0))
                reserve_amt = min(needed_res, avail_qty)
                if reserve_amt > 0:
                    try:
                        await reserve_stock(
                            db, str(inv["_id"]), reserve_amt,
                            actor_id=current_user["sub"], actor_role=current_user["role"],
                            reference_id=str(result.inserted_id),
                            session=session
                        )
                    except Exception as e:
                        logger.warning(f"Stock reservation non-critical failure: {type(e)} {e}")
        
        await append_ledger_block(
            db,
            event_type=LedgerEventType.SHIPMENT_CREATED,
            entity_type="SHIPMENT",
            entity_id=str(result.inserted_id),
            actor_id=current_user["sub"],
            actor_role=current_user["role"],
            event_summary=f"Shipment {shipment_id} created from booking {booking.get('booking_id')}",
            payload={
                "shipment_id": shipment_id,
                "booking_id": booking.get("booking_id"),
                "vehicle_id": vehicle.get("vehicle_id"),
                "driver_id": driver.get("driver_id"),
            },
            session=session
        )
    
    return to_response(ShipmentResponse, shipment_doc)


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
        transporter = await get_transporter_for_user(db, current_user["sub"])
        if transporter:
            query["transporter_id"] = str(transporter["_id"])
        else:
            return []
    elif current_user["role"] == UserRole.DRIVER:
        driver = await get_driver_for_user(db, current_user["sub"])
        if driver:
            query["$or"] = [
                {"driver_id": str(driver["_id"])},
                {"driver_id": driver.get("driver_id")},
                {"driver_user_id": current_user["sub"]},
                {"driver_id": current_user["sub"]}
            ]
        else:
            query["$or"] = [{"driver_id": current_user["sub"]}, {"driver_user_id": current_user["sub"]}]
    
    if status:
        query["status"] = status.value if hasattr(status, "value") else str(status)
    if transporter_id and current_user["role"] == UserRole.ADMIN:
        query["transporter_id"] = transporter_id
    if driver_id:
        query["driver_id"] = driver_id
    if vehicle_id:
        query["vehicle_id"] = vehicle_id
    
    shipments = await db.shipments.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [to_response(ShipmentResponse, s) for s in shipments]


@router.get("/{shipment_id}", response_model=ShipmentResponse)
async def get_shipment(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)
    return to_response(ShipmentResponse, shipment)


@router.post("/{shipment_id}/load", response_model=ShipmentResponse)
async def load_shipment(
    shipment_id: str,
    load_data: ShipmentLoad,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.DRIVER, UserRole.TRANSPORTER, UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN]:
        raise ForbiddenError("Only driver, transporter, warehouse manager, or admin can load shipment")
    
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)
    
    cur_status = shipment.get("status")
    if hasattr(cur_status, "value"):
        cur_status = cur_status.value
    if cur_status not in ["DRIVER_ASSIGNED", "LOADING"]:
        raise ValidationError(f"Shipment can only be loaded from DRIVER_ASSIGNED or LOADING status (current: {cur_status})")
    
    now = datetime.now(timezone.utc)
    planned_cargo = float(shipment.get("total_cargo_weight_kg", shipment.get("cargo_quantity_kg", 0.0)))
    actual_weight = float(load_data.actual_weight_kg)

    async with uow() as session:
        for item in load_data.batch_quantities:
            b_id = item.get("batch_id")
            qty = item.get("quantity_kg", 0)
            await db.shipment_items.update_one(
                {"shipment_id": str(shipment["_id"]), "batch_id": b_id},
                {"$set": {"quantity_kg": qty, "updated_at": now}},
                session=session
            )

        # Loading discrepancy: release unused reservation back to available
        if actual_weight < planned_cargo:
            diff = planned_cargo - actual_weight
            batch_ids = shipment.get("batch_ids", [])
            per_batch_diff = diff / len(batch_ids) if batch_ids else diff
            for b_id in batch_ids:
                inv = await db.inventory_items.find_one({"batch_id": b_id}, session=session)
                if inv:
                    res_in_inv = float(inv.get("reserved_quantity_kg", 0.0))
                    release_amt = min(per_batch_diff, res_in_inv)
                    if release_amt > 0:
                        try:
                            await release_stock(
                                db, str(inv["_id"]), release_amt,
                                actor_id=current_user["sub"], actor_role=current_user["role"],
                                reference_id=str(shipment["_id"]),
                                session=session
                            )
                        except Exception as e:
                            logger.warning(f"Error releasing excess reserved stock for shipment {shipment_id}: {e}")
        
        updated = await transition_shipment(
            db, str(shipment["_id"]), ShipmentStatus.LOADED.value,
            actor_id=current_user["sub"], actor_role=current_user["role"],
            session=session,
            extra_updates={"actual_dispatch_time": None, "total_cargo_weight_kg": load_data.actual_weight_kg, "package_count": load_data.actual_package_count},
            event_summary=f"Shipment {shipment.get('shipment_id')} loaded with {load_data.actual_weight_kg}kg"
        )
    
    return to_response(ShipmentResponse, updated)


@router.post("/{shipment_id}/dispatch", response_model=ShipmentResponse)
async def dispatch_shipment(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.DRIVER, UserRole.TRANSPORTER, UserRole.ADMIN]:
        raise ForbiddenError("Only driver, transporter, or admin can dispatch shipment")
    
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)
    
    now = datetime.now(timezone.utc)
    async with uow() as session:
        updated = await transition_shipment(
            db, str(shipment["_id"]), ShipmentStatus.DISPATCHED.value,
            actor_id=current_user["sub"], actor_role=current_user["role"],
            session=session,
            extra_updates={"actual_dispatch_time": now},
            event_summary=f"Shipment {shipment.get('shipment_id')} dispatched"
        )
        
        # Mark batches as DISPATCHED and transition inventory from reserved to dispatched
        total_cargo = float(shipment.get("total_cargo_weight_kg", shipment.get("cargo_quantity_kg", 0.0)))
        batch_ids = shipment.get("batch_ids", [])
        per_batch_qty = (total_cargo / len(batch_ids)) if batch_ids else total_cargo

        for b_id in batch_ids:
            b_query = {"_id": ObjectId(b_id)} if ObjectId.is_valid(b_id) else {"batch_id": b_id}
            await db.produce_batches.update_one(
                b_query,
                {"$set": {"status": "DISPATCHED", "updated_at": now}},
                session=session
            )
            inv = await db.inventory_items.find_one({"batch_id": b_id}, session=session)
            if inv:
                res_qty = float(inv.get("reserved_quantity_kg", 0.0))
                disp_amount = min(per_batch_qty, res_qty)
                if disp_amount > 0:
                    try:
                        await dispatch_stock(
                            db, str(inv["_id"]), disp_amount,
                            actor_id=current_user["sub"], actor_role=current_user["role"],
                            reference_id=str(shipment["_id"]),
                            from_reserved=True,
                            session=session
                        )
                    except Exception as e:
                        logger.warning(f"Stock reservation non-critical failure: {type(e)} {e}")
    
    return to_response(ShipmentResponse, updated)


@router.post("/{shipment_id}/start-transit", response_model=ShipmentResponse)
async def start_transit(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.DRIVER, UserRole.TRANSPORTER, UserRole.ADMIN]:
        raise ForbiddenError("Only driver, transporter, or admin can start transit")
    
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)
    
    async with uow() as session:
        updated = await transition_shipment(
            db, str(shipment["_id"]), ShipmentStatus.IN_TRANSIT.value,
            actor_id=current_user["sub"], actor_role=current_user["role"],
            session=session,
            event_summary=f"Shipment {shipment.get('shipment_id')} started transit"
        )
    return to_response(ShipmentResponse, updated)


@router.post("/{shipment_id}/arrive", response_model=ShipmentResponse)
async def arrive_at_destination(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.DRIVER, UserRole.TRANSPORTER, UserRole.ADMIN]:
        raise ForbiddenError("Only driver, transporter, or admin can report arrival at destination")
    
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)
    
    async with uow() as session:
        updated = await transition_shipment(
            db, str(shipment["_id"]), ShipmentStatus.ARRIVED_AT_DESTINATION.value,
            actor_id=current_user["sub"], actor_role=current_user["role"],
            session=session,
            event_summary=f"Shipment {shipment.get('shipment_id')} arrived at destination"
        )
    return to_response(ShipmentResponse, updated)


@router.post("/{shipment_id}/out-for-delivery", response_model=ShipmentResponse)
async def set_out_for_delivery(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.DRIVER, UserRole.TRANSPORTER, UserRole.ADMIN]:
        raise ForbiddenError("Only driver, transporter, or admin can set shipment out for delivery")
    
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)
    
    async with uow() as session:
        updated = await transition_shipment(
            db, str(shipment["_id"]), ShipmentStatus.OUT_FOR_DELIVERY.value,
            actor_id=current_user["sub"], actor_role=current_user["role"],
            session=session,
            event_summary=f"Shipment {shipment.get('shipment_id')} is out for delivery"
        )
    return to_response(ShipmentResponse, updated)


@router.post("/{shipment_id}/cancel", response_model=ShipmentResponse)
async def cancel_shipment_endpoint(
    shipment_id: str,
    cancel_data: ShipmentCancelRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.TRANSPORTER, UserRole.ADMIN]:
        raise ForbiddenError("Only transporter or admin can cancel shipment")
    
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)
    
    async with uow() as session:
        updated = await cancel_shipment(
            db, shipment,
            actor_id=current_user["sub"], actor_role=current_user["role"],
            reason=cancel_data.reason, session=session
        )
    return to_response(ShipmentResponse, updated)


@router.post("/{shipment_id}/report-exception", response_model=ShipmentResponse)
async def report_exception(
    shipment_id: str,
    exception_data: ShipmentExceptionReport,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.DRIVER, UserRole.TRANSPORTER, UserRole.ADMIN]:
        raise ForbiddenError("Only driver, transporter, or admin can report exceptions")
    
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)
    
    ex_val = exception_data.exception_type.value if hasattr(exception_data.exception_type, "value") else str(exception_data.exception_type)
    current_flags = shipment.get("exception_flags", [])
    if ex_val not in current_flags:
        current_flags.append(ex_val)
    
    now = datetime.now(timezone.utc)
    async with uow() as session:
        await db.shipments.update_one(
            {"_id": shipment["_id"]},
            {"$set": {"exception_flags": current_flags, "updated_at": now}},
            session=session
        )
        
        event_doc = {
            "event_id": f"EV-{uuid.uuid4().hex[:10].upper()}",
            "shipment_id": str(shipment["_id"]),
            "event_type": ex_val,
            "description": exception_data.description,
            "severity": exception_data.severity,
            "reported_by": current_user["sub"],
            "created_at": now,
        }
        await db.shipment_events.insert_one(to_mongo(event_doc), session=session)
        
        await append_ledger_block(
            db,
            event_type=LedgerEventType.SHIPMENT_UPDATED if hasattr(LedgerEventType, "SHIPMENT_UPDATED") else "SHIPMENT_UPDATED",
            entity_type="SHIPMENT",
            entity_id=str(shipment["_id"]),
            actor_id=current_user["sub"],
            actor_role=current_user["role"],
            event_summary=f"Exception {ex_val} reported for shipment {shipment.get('shipment_id')}",
            payload={"exception_type": ex_val, "severity": exception_data.severity},
            session=session
        )
    
    updated = await db.shipments.find_one({"_id": shipment["_id"]})
    return to_response(ShipmentResponse, updated)


@router.get("/{shipment_id}/timeline")
async def get_shipment_timeline(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)
    
    canonical_id = str(shipment["_id"])
    checkpoints = await db.route_checkpoints.find({"shipment_id": canonical_id}).sort("sequence", 1).to_list(100)
    events = await db.shipment_events.find({"shipment_id": canonical_id}).sort("created_at", 1).to_list(100)
    
    return {
        "shipment_id": shipment.get("shipment_id"),
        "current_status": shipment.get("status"),
        "exception_flags": shipment.get("exception_flags", []),
        "checkpoints": [{
            "checkpoint_id": c.get("checkpoint_id"),
            "name": c.get("name"),
            "city": c.get("city"),
            "state": c.get("state"),
            "sequence": c.get("sequence"),
            "planned_arrival": c.get("planned_arrival"),
            "planned_departure": c.get("planned_departure"),
            "actual_arrival": c.get("actual_arrival"),
            "actual_departure": c.get("actual_departure"),
            "status": c.get("status"),
            "notes": c.get("notes"),
        } for c in checkpoints],
        "events": [{
            "event_id": e.get("event_id"),
            "event_type": e.get("event_type"),
            "description": e.get("description"),
            "severity": e.get("severity"),
            "reported_by": e.get("reported_by"),
            "created_at": e.get("created_at"),
        } for e in events],
    }

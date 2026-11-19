import uuid
from decimal import Decimal, InvalidOperation
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, ConfigDict
from bson import ObjectId

from app.db.mongodb import get_database
from app.core.permissions import get_current_user, enforce_permission
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError, ConflictError
from app.core.constants import (
    ShipmentStatus, UserRole, FreightBookingStatus, LedgerEventType
)
from app.services.ledger_service import append_ledger_block
from app.db.unit_of_work import run_in_txn
from app.utils.serialization import to_response
from app.utils.mongo import to_mongo, resolve_doc
from app.core.access import get_transporter_for_user, get_driver_for_user, assert_can_view_shipment, shipment_scope
from app.services.shipment_workflow import transition_shipment, cancel_shipment
from app.services.inventory_service import release_stock, kilograms_to_grams
from app.services.warehouse_capacity import lock_warehouse, check_capacity

router = APIRouter()


class ShipmentCreate(BaseModel):
    booking_id: str
    accepted_quotation_id: str
    vehicle_id: str
    driver_id: str
    model_config = ConfigDict(extra="forbid")


class ShipmentLoad(BaseModel):
    actual_weight_kg: float = Field(..., gt=0, allow_inf_nan=False, multiple_of=0.001)
    actual_package_count: int = Field(..., gt=0)
    batch_quantities: List[dict] = Field(default_factory=list)
    model_config = ConfigDict(extra="forbid")


class ShipmentCancelRequest(BaseModel):
    reason: str = Field(...)
    model_config = ConfigDict(extra="forbid")


class ShipmentReturnReceipt(BaseModel):
    returned_quantity_kg: float = Field(..., gt=0, allow_inf_nan=False, multiple_of=0.001)
    condition: str = Field(..., min_length=1, max_length=500)
    inspected_usable: bool
    model_config = ConfigDict(extra="forbid")


class ShipmentPartialReturn(BaseModel):
    usable_quantity_kg: float = Field(0.0, ge=0, allow_inf_nan=False, multiple_of=0.001)
    damaged_quantity_kg: float = Field(0.0, ge=0, allow_inf_nan=False, multiple_of=0.001)
    rejected_quantity_kg: float = Field(0.0, ge=0, allow_inf_nan=False, multiple_of=0.001)
    condition: str = Field(..., min_length=1, max_length=1000)
    disposition_notes: Optional[str] = Field(None, max_length=1000)
    received_by: str = Field(..., min_length=1, max_length=200)
    inspected_usable: bool = True
    model_config = ConfigDict(extra="forbid")


class ShipmentResponse(BaseModel):
    id: str
    shipment_id: str
    booking_id: str
    accepted_quotation_id: str
    purchase_order_id: str
    farmer_id: str
    buyer_id: str
    transporter_id: str
    vehicle_id: str
    driver_id: str
    driver_user_id: Optional[str] = None
    batch_ids: List[str] = Field(default_factory=list)
    cargo_quantity_kg: float
    loaded_weight_kg: Optional[float] = None
    package_count: int
    planned_dispatch_time: Optional[datetime] = None
    expected_arrival_time: Optional[datetime] = None
    actual_dispatch_time: Optional[datetime] = None
    actual_arrival_time: Optional[datetime] = None
    status: ShipmentStatus
    is_delayed: bool = False
    status_history: List[dict] = Field(default_factory=list)
    cancellation_reason: Optional[str] = None
    return_received_at: Optional[datetime] = None
    return_received_by: Optional[str] = None
    returned_quantity_kg: Optional[float] = None
    returned_usable_quantity_kg: Optional[float] = None
    returned_damaged_quantity_kg: Optional[float] = None
    returned_rejected_quantity_kg: Optional[float] = None
    return_condition: Optional[str] = None
    return_disposition: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


def _shipment_response(shipment):
    doc = dict(shipment)
    arrival, expected = doc.get("actual_arrival_time"), doc.get("expected_arrival_time")
    doc["is_delayed"] = bool(arrival and expected and arrival > expected)
    return doc


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
    if booking.get("accepted_quotation_id") != str(quotation["_id"]) or quotation.get("status") != "ACCEPTED":
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

    # W-03: Vehicle capacity and refrigeration suitability check
    total_cargo = float(booking.get("cargo_quantity_kg", 0.0))
    payload_cap = float(vehicle.get("max_payload_kg") or vehicle.get("capacity_kg") or 0.0)
    if payload_cap < total_cargo:
        raise ValidationError(
            f"Vehicle payload capacity ({payload_cap}kg) is insufficient for cargo ({total_cargo}kg)"
        )
    if booking.get("refrigeration_required", False) and not vehicle.get("refrigeration_available", False):
        raise ValidationError("Booking requires refrigerated vehicle, but selected vehicle does not support refrigeration")
    if booking.get("refrigeration_required", False):
        required_min, required_max = booking.get("temperature_min"), booking.get("temperature_max")
        vehicle_min, vehicle_max = vehicle.get("temperature_min"), vehicle.get("temperature_max")
        if required_min is None or required_max is None or vehicle_min is None or vehicle_max is None:
            raise ValidationError("Refrigerated bookings and vehicles must specify temperature capabilities")
        if vehicle_min > required_min or vehicle_max < required_max:
            raise ValidationError("Vehicle temperature capability does not cover the booking's required range")

    driver = await resolve_doc(db.drivers, shipment_data.driver_id, "Driver", business_key="driver_id")
    if driver.get("transporter_id") != t_id and current_user["role"] != UserRole.ADMIN:
        raise ForbiddenError("Driver does not belong to this transporter")

    po = await resolve_doc(db.purchase_orders, booking["purchase_order_id"], "Purchase Order", business_key="order_id")
    if Decimal(str(po.get("accepted_quantity_kg", 0))) != Decimal(str(booking.get("cargo_quantity_kg", 0))):
        raise ConflictError("Booking cargo no longer matches the order reservation; create a new booking")

    pickup_st = booking.get("pickup_state", "MH")
    dest_st = booking.get("destination_state", "MH")
    shipment_id = generate_shipment_id(pickup_st, dest_st)
    while await db.shipments.find_one({"shipment_id": shipment_id}):
        shipment_id = generate_shipment_id(pickup_st, dest_st)

    now = datetime.now(timezone.utc)
    shipment_doc = {
        "shipment_id": shipment_id,
        "booking_id": str(booking["_id"]),
        "accepted_quotation_id": str(quotation["_id"]),
        "purchase_order_id": str(po["_id"]),
        "farmer_id": po["seller_id"],
        "buyer_id": po["buyer_id"],
        "transporter_id": t_id,
        "vehicle_id": str(vehicle["_id"]),
        "driver_id": str(driver["_id"]),
        "driver_user_id": driver.get("user_id"),
        "batch_ids": booking.get("batch_ids", []),
        "cargo_quantity_kg": booking.get("cargo_quantity_kg", 0.0),
        "loaded_weight_kg": None,
        "package_count": booking.get("package_count", 1),
        "planned_dispatch_time": None,
        "expected_arrival_time": None,
        "actual_dispatch_time": None,
        "actual_arrival_time": None,
        "status": ShipmentStatus.DRIVER_ASSIGNED.value,
        "status_history": [{"status": "DRIVER_ASSIGNED", "at": now}],
        "created_at": now,
        "updated_at": now,
    }

    async def _transaction(session):
        # Serialize shipment creation with cancellation of the same order.
        order_claim = await db.purchase_orders.update_one(
            {"_id": po["_id"], "status": "ACCEPTED", "accepted_quantity_kg": po["accepted_quantity_kg"]},
            {"$set": {"updated_at": now}}, session=session,
        )
        if order_claim.matched_count == 0:
            raise ConflictError("Purchase order is no longer accepted")
        result = await db.shipments.insert_one(to_mongo(shipment_doc), session=session)
        shipment_doc["_id"] = result.inserted_id

        # Lock vehicle
        vehicle_lock = await db.vehicles.update_one(
            {"_id": vehicle["_id"], "status": "AVAILABLE"},
            {"$set": {"status": "ASSIGNED", "current_assignment": str(result.inserted_id), "updated_at": now}},
            session=session
        )
        if vehicle_lock.matched_count == 0:
            raise ConflictError("Vehicle is no longer available")

        # Lock driver
        driver_lock = await db.drivers.update_one(
            {"_id": driver["_id"], "status": "AVAILABLE"},
            {"$set": {"status": "ASSIGNED", "current_assignment": str(result.inserted_id), "updated_at": now}},
            session=session
        )
        if driver_lock.matched_count == 0:
            raise ConflictError("Driver is no longer available")

        batch_ids = booking.get("batch_ids", [])
        total_cargo = float(booking.get("cargo_quantity_kg", 0.0))
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
    await run_in_txn(_transaction)

    return to_response(ShipmentResponse, _shipment_response(shipment_doc))


@router.get("", response_model=List[ShipmentResponse])
async def list_shipments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1),
    status: Optional[ShipmentStatus] = None,
    transporter_id: Optional[str] = None,
    driver_id: Optional[str] = None,
    vehicle_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = await shipment_scope(db, current_user)

    if status:
        query["status"] = status.value if hasattr(status, "value") else str(status)
    if transporter_id and current_user["role"] == UserRole.ADMIN:
        query["transporter_id"] = transporter_id
    if driver_id:
        query.setdefault("$and", []).append({"driver_id": driver_id})
    if vehicle_id:
        query["vehicle_id"] = vehicle_id

    shipments = await db.shipments.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [to_response(ShipmentResponse, _shipment_response(s)) for s in shipments]


@router.get("/{shipment_id}", response_model=ShipmentResponse)
async def get_shipment(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)
    return to_response(ShipmentResponse, _shipment_response(shipment))


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
    if cur_status != "DRIVER_ASSIGNED":
        raise ValidationError(f"Shipment can only be loaded from DRIVER_ASSIGNED status (current: {cur_status})")

    if load_data.actual_weight_kg > shipment["cargo_quantity_kg"]:
        raise ValidationError("Loaded weight cannot exceed planned cargo")
    if load_data.batch_quantities:
        try:
            ids = [item["batch_id"] for item in load_data.batch_quantities]
            quantities = [Decimal(str(item["quantity_kg"])) for item in load_data.batch_quantities]
            if len(ids) != len(set(ids)) or set(ids) != set(shipment.get("batch_ids", [])):
                raise ValidationError("Batch quantities must identify each shipment batch exactly once")
            if any(not qty.is_finite() or qty < 0 or qty * 1000 != (qty * 1000).to_integral_value() for qty in quantities):
                raise ValidationError("Batch quantities must be non-negative and in whole grams")
        except (KeyError, TypeError, InvalidOperation, ValueError) as exc:
            raise ValidationError("Invalid batch quantities") from exc
        if sum(quantities) != Decimal(str(load_data.actual_weight_kg)):
            raise ValidationError("Batch quantities must equal loaded weight")
    now = datetime.now(timezone.utc)
    async def _transaction(session):
        # The current model permits one accepted order and one batch per shipment.
        # Release an unshipped part of that order at loading, atomically with the
        # status transition. Never infer an allocation for older incomplete data.
        if Decimal(str(load_data.actual_weight_kg)) < Decimal(str(shipment["cargo_quantity_kg"])):
            order = await resolve_doc(db.purchase_orders, shipment.get("purchase_order_id"), "Purchase Order", session=session)
            reserved = Decimal(str(order.get("accepted_quantity_kg", 0)))
            loaded = Decimal(str(load_data.actual_weight_kg))
            if order.get("status") != "ACCEPTED" or reserved != Decimal(str(shipment["cargo_quantity_kg"])):
                raise ConflictError("Order reservation no longer matches the shipment")
            inventory_id = order.get("inventory_id")
            if not inventory_id or not ObjectId.is_valid(inventory_id):
                raise ConflictError("Short loading requires a valid inventory allocation")
            inventory = await db.inventory_items.find_one({"_id": ObjectId(inventory_id)}, session=session)
            if not inventory or inventory.get("batch_id") != order.get("batch_id"):
                raise ConflictError("Order inventory allocation changed")
            shortfall = float(reserved - loaded)
            claim = await db.purchase_orders.update_one(
                {"_id": order["_id"], "status": "ACCEPTED", "accepted_quantity_kg": order["accepted_quantity_kg"]},
                {"$set": {"accepted_quantity_kg": float(loaded), "short_loaded_quantity_kg": shortfall, "updated_at": now}}, session=session)
            if not claim.matched_count:
                raise ConflictError("Order reservation changed")
            await release_stock(db, inventory_id, shortfall, session)
            await db.inventory_movements.insert_one({
                "type": "SHORT_LOAD_RELEASE", "inventory_id": inventory_id, "batch_id": order.get("batch_id"),
                "warehouse_id": inventory.get("warehouse_id"), "quantity_kg": shortfall,
                "previous_available_kg": inventory["available_kg"],
                "new_available_kg": float(Decimal(str(inventory["available_kg"])) + Decimal(str(shortfall))),
                "actor_id": current_user["sub"], "actor_role": current_user["role"],
                "reference_type": "SHIPMENT", "reference_id": str(shipment["_id"]), "created_at": now,
            }, session=session)
        for item in load_data.batch_quantities:
            b_id = item.get("batch_id")
            qty = item.get("quantity_kg", 0)
            item_update = await db.shipment_items.update_one(
                {"shipment_id": str(shipment["_id"]), "batch_id": b_id},
                {"$set": {"quantity_kg": qty, "updated_at": now}},
                session=session
            )
            if not item_update.matched_count:
                raise ConflictError("Shipment batch allocation changed")

        if not load_data.batch_quantities and len(shipment.get("batch_ids", [])) == 1:
            item_update = await db.shipment_items.update_one(
                {"shipment_id": str(shipment["_id"]), "batch_id": shipment["batch_ids"][0]},
                {"$set": {"quantity_kg": load_data.actual_weight_kg, "updated_at": now}}, session=session)
            if not item_update.matched_count:
                raise ConflictError("Shipment batch allocation changed")

        updated = await transition_shipment(
            db, str(shipment["_id"]), ShipmentStatus.LOADED.value,
            actor_id=current_user["sub"], actor_role=current_user["role"],
            session=session,
            extra_updates={"actual_dispatch_time": None, "loaded_weight_kg": load_data.actual_weight_kg, "package_count": load_data.actual_package_count},
            event_summary=f"Shipment {shipment.get('shipment_id')} loaded with {load_data.actual_weight_kg}kg"
        )
        return updated
    updated = await run_in_txn(_transaction)

    return to_response(ShipmentResponse, _shipment_response(updated))


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
    quote = await resolve_doc(db.freight_quotations, shipment["accepted_quotation_id"], "Quotation", business_key="quotation_id")
    hours = float(quote.get("estimated_transit_hours", 0))
    async def _transaction(session):
        updated = await transition_shipment(
            db, str(shipment["_id"]), ShipmentStatus.DISPATCHED.value,
            actor_id=current_user["sub"], actor_role=current_user["role"],
            session=session,
            extra_updates={"actual_dispatch_time": now, "expected_arrival_time": now + timedelta(hours=hours)},
            event_summary=f"Shipment {shipment.get('shipment_id')} dispatched"
        )
        # Reservation already reduced availability. Dispatch changes custody,
        # not the available balance; record the actual weight exactly once in
        # the same transaction as the conditional shipment transition.
        order_id = shipment.get("purchase_order_id")
        if order_id:
            order = await resolve_doc(db.purchase_orders, order_id, "Purchase Order", session=session)
            inv_id = order.get("inventory_id")
            if inv_id and ObjectId.is_valid(inv_id):
                inventory = await db.inventory_items.find_one({"_id": ObjectId(inv_id)}, session=session)
                if not inventory or inventory.get("batch_id") != order.get("batch_id"):
                    raise ConflictError("Order inventory allocation changed")
                await lock_warehouse(db, inventory.get("warehouse_id"), session)
                if updated.get("loaded_weight_kg") is None:
                    raise ConflictError("Shipment has no verified loaded weight")
                await db.inventory_movements.insert_one({
                    "type": "DISPATCH", "inventory_id": inv_id, "batch_id": order.get("batch_id"),
                    "warehouse_id": inventory.get("warehouse_id"), "quantity_kg": updated["loaded_weight_kg"],
                    "previous_available_kg": inventory["available_kg"], "new_available_kg": inventory["available_kg"],
                    "actor_id": current_user["sub"], "actor_role": current_user["role"],
                    "reference_type": "SHIPMENT", "reference_id": str(shipment["_id"]), "created_at": now,
                }, session=session)
        return updated
    updated = await run_in_txn(_transaction)

    return to_response(ShipmentResponse, _shipment_response(updated))


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

    async def _transaction(session):
        updated = await transition_shipment(
            db, str(shipment["_id"]), ShipmentStatus.IN_TRANSIT.value,
            actor_id=current_user["sub"], actor_role=current_user["role"],
            session=session,
            event_summary=f"Shipment {shipment.get('shipment_id')} started transit"
        )
        return updated
    updated = await run_in_txn(_transaction)
    return to_response(ShipmentResponse, _shipment_response(updated))


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

    async def _transaction(session):
        updated = await transition_shipment(
            db, str(shipment["_id"]), ShipmentStatus.ARRIVED_AT_DESTINATION.value,
            actor_id=current_user["sub"], actor_role=current_user["role"],
            session=session,
            extra_updates={"actual_arrival_time": datetime.now(timezone.utc)},
            event_summary=f"Shipment {shipment.get('shipment_id')} arrived at destination"
        )
        return updated
    updated = await run_in_txn(_transaction)
    return to_response(ShipmentResponse, _shipment_response(updated))


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

    async def _transaction(session):
        updated = await transition_shipment(
            db, str(shipment["_id"]), ShipmentStatus.OUT_FOR_DELIVERY.value,
            actor_id=current_user["sub"], actor_role=current_user["role"],
            session=session,
            event_summary=f"Shipment {shipment.get('shipment_id')} is out for delivery"
        )
        return updated
    updated = await run_in_txn(_transaction)
    return to_response(ShipmentResponse, _shipment_response(updated))


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

    async def _transaction(session):
        updated = await cancel_shipment(
            db, shipment,
            actor_id=current_user["sub"], actor_role=current_user["role"],
            reason=cancel_data.reason, session=session
        )
        return updated
    updated = await run_in_txn(_transaction)
    return to_response(ShipmentResponse, _shipment_response(updated))


@router.post("/{shipment_id}/return-receipt", response_model=ShipmentResponse)
async def receive_shipment_return(shipment_id: str, data: ShipmentReturnReceipt,
                                  current_user: dict = Depends(get_current_user),
                                  db: AsyncIOMotorDatabase = Depends(get_database)):
    enforce_permission(current_user, "returns:receive")
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    if not data.inspected_usable or not data.condition.strip():
        raise ValidationError("Confirm the returned goods are usable and describe their condition")
    if shipment.get("status") != "CANCELLED" or not shipment.get("actual_dispatch_time"):
        raise ValidationError("A return receipt requires a cancelled shipment that was dispatched")
    if shipment.get("loaded_weight_kg") is None or Decimal(str(data.returned_quantity_kg)) != Decimal(str(shipment["loaded_weight_kg"])):
        raise ValidationError("The full loaded quantity must be returned; partial or damaged returns require a separate workflow")
    now = datetime.now(timezone.utc)

    async def transaction(session):
        order = await resolve_doc(db.purchase_orders, shipment.get("purchase_order_id"), "Purchase Order", session=session)
        if Decimal(str(order.get("accepted_quantity_kg", 0))) != Decimal(str(data.returned_quantity_kg)):
            raise ConflictError("Returned quantity does not match the remaining order reservation; reconcile this legacy order first")
        inv_id = order.get("inventory_id")
        if not inv_id or not ObjectId.is_valid(inv_id):
            raise ConflictError("Return requires a valid inventory allocation")
        inventory = await db.inventory_items.find_one({"_id": ObjectId(inv_id)}, session=session)
        if not inventory or inventory.get("batch_id") != order.get("batch_id"):
            raise ConflictError("Order inventory allocation changed")
        if current_user["role"] == UserRole.WAREHOUSE_MANAGER:
            warehouse = await resolve_doc(db.warehouses, inventory.get("warehouse_id"), "Warehouse", session=session)
            if warehouse.get("manager_id") != current_user["sub"]:
                raise ForbiddenError("Return belongs to another warehouse")
        warehouse = await resolve_doc(db.warehouses, inventory.get("warehouse_id"), "Warehouse", session=session)
        cold_storage = inventory.get("cold_storage")
        if cold_storage is None:
            cold_storage = bool(warehouse.get("has_refrigeration"))
        await check_capacity(db, inventory.get("warehouse_id"), data.returned_quantity_kg, cold_storage, session)
        order_claim = await db.purchase_orders.update_one({"_id": order["_id"], "status": "ACCEPTED"},
            {"$set": {"updated_at": now}}, session=session)
        if not order_claim.matched_count:
            raise ConflictError("Order is no longer reserved")
        claim = await db.shipments.update_one({"_id": shipment["_id"], "status": "CANCELLED", "return_received_at": None},
            {"$set": {"return_received_at": now, "return_received_by": current_user["sub"],
                      "returned_quantity_kg": data.returned_quantity_kg, "return_condition": data.condition.strip(), "updated_at": now}}, session=session)
        if not claim.matched_count:
            raise ConflictError("Return was already recorded or shipment changed")
        # Returned stock stays reserved until the buyer cancels the order.
        await db.inventory_movements.insert_one({"type": "RETURN_RECEIPT_RESERVED", "inventory_id": inv_id,
            "batch_id": order.get("batch_id"), "warehouse_id": inventory.get("warehouse_id"),
            "quantity_kg": data.returned_quantity_kg, "previous_available_kg": inventory["available_kg"],
            "new_available_kg": inventory["available_kg"], "actor_id": current_user["sub"],
            "actor_role": current_user["role"], "reference_type": "SHIPMENT", "reference_id": str(shipment["_id"]),
            "reason": data.condition.strip(), "created_at": now}, session=session)
        await append_ledger_block(db, event_type=LedgerEventType.SHIPMENT_RETURN_RECEIVED,
            entity_type="SHIPMENT", entity_id=str(shipment["_id"]), actor_id=current_user["sub"],
            actor_role=current_user["role"], event_summary="Full usable shipment return received",
            payload={"quantity_kg": data.returned_quantity_kg, "condition": data.condition.strip()}, session=session)
        return await db.shipments.find_one({"_id": shipment["_id"]}, session=session)

    return to_response(ShipmentResponse, _shipment_response(await run_in_txn(transaction)))


@router.post("/{shipment_id}/partial-return", response_model=ShipmentResponse)
async def receive_partial_shipment_return(
    shipment_id: str,
    data: ShipmentPartialReturn,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    enforce_permission(current_user, "returns:receive")
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")

    total_returned_parts = (
        Decimal(str(data.usable_quantity_kg)) +
        Decimal(str(data.damaged_quantity_kg)) +
        Decimal(str(data.rejected_quantity_kg))
    )
    if total_returned_parts <= 0:
        raise ValidationError("Total returned quantity must be greater than zero")

    if data.usable_quantity_kg > 0 and not data.inspected_usable:
        raise ValidationError("Usable goods must pass physical inspection before being accepted as usable stock")

    status = shipment.get("status")
    allowed_statuses = ("CANCELLED", "DELIVERY_REJECTED", "PARTIALLY_DELIVERED")
    if status not in allowed_statuses:
        raise ValidationError(f"Returns are only permitted for CANCELLED, DELIVERY_REJECTED, or PARTIALLY_DELIVERED shipments (current: {status})")

    loaded_weight = shipment.get("loaded_weight_kg")
    if loaded_weight is None:
        raise ConflictError("Shipment has no verified loaded weight")

    if status in ("CANCELLED", "DELIVERY_REJECTED"):
        eligible_max = Decimal(str(loaded_weight))
    else:
        report = await db.delivery_reports.find_one({"$or": [{"shipment_id": str(shipment["_id"])}, {"shipment_id": shipment.get("shipment_id")}]})
        delivered = Decimal(str(report.get("delivered_quantity_kg", 0.0))) if report else Decimal("0")
        eligible_max = Decimal(str(loaded_weight)) - delivered

    if total_returned_parts > eligible_max:
        raise ValidationError(f"Total returned quantity ({total_returned_parts}kg) cannot exceed eligible dispatched quantity ({eligible_max}kg)")

    if shipment.get("return_received_at") is not None:
        raise ConflictError("Return has already been received for this shipment")

    now = datetime.now(timezone.utc)

    async def transaction(session):
        order = await resolve_doc(db.purchase_orders, shipment.get("purchase_order_id"), "Purchase Order", session=session)
        inv_id = order.get("inventory_id")
        if not inv_id or not ObjectId.is_valid(inv_id):
            raise ConflictError("Return requires a valid inventory allocation")

        inventory = await db.inventory_items.find_one({"_id": ObjectId(inv_id)}, session=session)
        if not inventory or inventory.get("batch_id") != order.get("batch_id"):
            raise ConflictError("Order inventory allocation changed")

        warehouse = await resolve_doc(db.warehouses, inventory.get("warehouse_id"), "Warehouse", session=session)
        if current_user["role"] == UserRole.WAREHOUSE_MANAGER and warehouse.get("manager_id") != current_user["sub"]:
            raise ForbiddenError("Return belongs to another warehouse")

        cold_storage = inventory.get("cold_storage")
        if cold_storage is None:
            cold_storage = bool(warehouse.get("has_refrigeration"))

        total_ret_float = float(total_returned_parts)
        await check_capacity(db, inventory.get("warehouse_id"), total_ret_float, cold_storage, session)

        claim = await db.shipments.update_one(
            {"_id": shipment["_id"], "return_received_at": None},
            {"$set": {
                "return_received_at": now,
                "return_received_by": current_user["sub"],
                "returned_quantity_kg": total_ret_float,
                "returned_usable_quantity_kg": data.usable_quantity_kg,
                "returned_damaged_quantity_kg": data.damaged_quantity_kg,
                "returned_rejected_quantity_kg": data.rejected_quantity_kg,
                "return_condition": data.condition.strip(),
                "return_disposition": data.disposition_notes.strip() if data.disposition_notes else None,
                "updated_at": now
            }}, session=session
        )
        if not claim.matched_count:
            raise ConflictError("Return was already recorded or shipment changed")

        # 1. Usable quantity handling
        if data.usable_quantity_kg > 0:
            if order.get("status") in ("CANCELLED", "FAILED"):
                await release_stock(db, inv_id, data.usable_quantity_kg, session)
                inv_fresh = await db.inventory_items.find_one({"_id": ObjectId(inv_id)}, session=session)
                prev_avail = inventory["available_kg"]
                new_avail = inv_fresh["available_kg"]
                mov_type = "RETURN_RECEIPT_USABLE"
            else:
                prev_avail = inventory["available_kg"]
                new_avail = inventory["available_kg"]
                mov_type = "RETURN_RECEIPT_RESERVED"

            await db.inventory_movements.insert_one({
                "type": mov_type, "inventory_id": inv_id,
                "batch_id": order.get("batch_id"), "warehouse_id": inventory.get("warehouse_id"),
                "quantity_kg": data.usable_quantity_kg,
                "previous_available_kg": prev_avail,
                "new_available_kg": new_avail,
                "actor_id": current_user["sub"], "actor_role": current_user["role"],
                "reference_type": "SHIPMENT", "reference_id": str(shipment["_id"]),
                "reason": f"Usable return: {data.condition.strip()}",
                "created_at": now
            }, session=session)

        # 2. Damaged quantity handling
        if data.damaged_quantity_kg > 0:
            damaged_g = kilograms_to_grams(data.damaged_quantity_kg)
            await db.inventory_items.update_one(
                {"_id": ObjectId(inv_id)},
                {"$inc": {"damaged_kg": data.damaged_quantity_kg, "damaged_g": damaged_g}, "$set": {"updated_at": now}},
                session=session
            )
            await db.inventory_movements.insert_one({
                "type": "RETURN_RECEIPT_DAMAGED", "inventory_id": inv_id,
                "batch_id": order.get("batch_id"), "warehouse_id": inventory.get("warehouse_id"),
                "quantity_kg": data.damaged_quantity_kg,
                "previous_available_kg": inventory["available_kg"],
                "new_available_kg": inventory["available_kg"],
                "actor_id": current_user["sub"], "actor_role": current_user["role"],
                "reference_type": "SHIPMENT", "reference_id": str(shipment["_id"]),
                "reason": f"Damaged return: {data.condition.strip()}",
                "created_at": now
            }, session=session)

        # 3. Rejected quantity handling
        if data.rejected_quantity_kg > 0:
            rejected_g = kilograms_to_grams(data.rejected_quantity_kg)
            await db.inventory_items.update_one(
                {"_id": ObjectId(inv_id)},
                {"$inc": {"rejected_kg": data.rejected_quantity_kg, "rejected_g": rejected_g}, "$set": {"updated_at": now}},
                session=session
            )
            await db.inventory_movements.insert_one({
                "type": "RETURN_RECEIPT_REJECTED", "inventory_id": inv_id,
                "batch_id": order.get("batch_id"), "warehouse_id": inventory.get("warehouse_id"),
                "quantity_kg": data.rejected_quantity_kg,
                "previous_available_kg": inventory["available_kg"],
                "new_available_kg": inventory["available_kg"],
                "actor_id": current_user["sub"], "actor_role": current_user["role"],
                "reference_type": "SHIPMENT", "reference_id": str(shipment["_id"]),
                "reason": f"Rejected return: {data.condition.strip()}",
                "created_at": now
            }, session=session)

        non_resellable = float(Decimal(str(data.damaged_quantity_kg)) + Decimal(str(data.rejected_quantity_kg)))
        if non_resellable > 0 and order.get("status") == "ACCEPTED":
            await db.purchase_orders.update_one(
                {"_id": order["_id"]},
                {"$inc": {"accepted_quantity_kg": -non_resellable}, "$set": {"updated_at": now}},
                session=session
            )

        await append_ledger_block(
            db, event_type=LedgerEventType.SHIPMENT_RETURN_RECEIVED,
            entity_type="SHIPMENT", entity_id=str(shipment["_id"]),
            actor_id=current_user["sub"], actor_role=current_user["role"],
            event_summary=f"Shipment return received ({total_ret_float}kg: usable={data.usable_quantity_kg}kg, damaged={data.damaged_quantity_kg}kg, rejected={data.rejected_quantity_kg}kg)",
            payload={
                "quantity_kg": total_ret_float,
                "usable_kg": data.usable_quantity_kg,
                "damaged_kg": data.damaged_quantity_kg,
                "rejected_kg": data.rejected_quantity_kg,
                "condition": data.condition.strip(),
                "disposition": data.disposition_notes,
            }, session=session
        )

        return await db.shipments.find_one({"_id": shipment["_id"]}, session=session)

    return to_response(ShipmentResponse, _shipment_response(await run_in_txn(transaction)))


@router.get("/{shipment_id}/timeline")
async def get_shipment_timeline(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)

    canonical_id = str(shipment["_id"])
    checkpoints = await db.route_checkpoints.find({"shipment_id": canonical_id}).sort("recorded_at", 1).to_list(100)
    events = await db.ledger_blocks.find({"entity_type": "SHIPMENT", "entity_id": canonical_id}).sort("timestamp", 1).to_list(100)

    return {
        "shipment_id": shipment.get("shipment_id"),
        "current_status": shipment.get("status"),
        "status_history": shipment.get("status_history", []),
        "checkpoints": [{
            "checkpoint_id": c.get("checkpoint_id"),
            "name": c.get("name"),
            "city": c.get("city"),
            "recorded_at": c.get("recorded_at"),
            "recorded_by": c.get("recorded_by"),
        } for c in checkpoints],
        "events": [{"event_type": e.get("event_type"), "event_summary": e.get("event_summary"),
                    "timestamp": e.get("timestamp")} for e in events],
    }

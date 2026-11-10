import uuid
from decimal import Decimal
from datetime import datetime, date, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, ConfigDict
from bson import ObjectId

from app.db.mongodb import get_database
from app.core.permissions import get_current_user
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError
from app.core.constants import PurchaseOrderStatus, ProduceType, UserRole, LedgerEventType
from app.services.ledger_service import append_ledger_block
from app.db.unit_of_work import uow
from app.utils.serialization import to_response
from app.utils.mongo import to_mongo, resolve_doc
from app.core.access import get_warehouses_for_user
from app.services.inventory_service import reserve_stock, release_stock

router = APIRouter()


class PurchaseOrderCreate(BaseModel):
    seller_id: Optional[str] = None
    produce_type: ProduceType
    batch_id: Optional[str] = None
    requested_quantity_kg: float = Field(..., gt=0, le=1000000.0, allow_inf_nan=False)
    unit_price_paise: int = Field(..., gt=0, le=100000000)
    preferred_delivery_date: date
    pickup_address: str = Field(..., min_length=1, max_length=500)
    delivery_address: str = Field(..., min_length=1, max_length=500)
    handling_requirements: Optional[str] = Field(None, max_length=1000)
    buyer_id: Optional[str] = None
    model_config = ConfigDict(extra="forbid")


class PurchaseOrderUpdate(BaseModel):
    status: Optional[PurchaseOrderStatus] = None
    delivery_address: Optional[str] = Field(None, min_length=1, max_length=500)
    pickup_address: Optional[str] = Field(None, min_length=1, max_length=500)
    handling_requirements: Optional[str] = Field(None, max_length=1000)
    model_config = ConfigDict(extra="forbid")


class PurchaseOrderResponse(BaseModel):
    id: str
    order_id: str
    buyer_id: str
    seller_id: str
    produce_type: ProduceType
    batch_id: Optional[str] = None
    requested_quantity_kg: float
    unit_price_paise: int
    total_amount_paise: int
    preferred_delivery_date: date
    pickup_address: str
    delivery_address: str
    handling_requirements: Optional[str] = None
    status: PurchaseOrderStatus
    accepted_quantity_kg: float = 0.0
    fulfilled_quantity_kg: float = 0.0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


def generate_order_id() -> str:
    return f"PO-{uuid.uuid4().hex[:10].upper()}"


@router.post("", response_model=PurchaseOrderResponse)
async def create_purchase_order(
    order_data: PurchaseOrderCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.BUYER, UserRole.ADMIN]:
        raise ForbiddenError("Only buyers or admins can create purchase orders")
    
    if current_user["role"] == UserRole.BUYER:
        buyer_id = current_user["sub"]
    else:
        buyer_id = order_data.buyer_id
        if not buyer_id:
            raise ValidationError("buyer_id required when admin creates a purchase order")
        buyer = await resolve_doc(db.users, buyer_id, "Buyer")
        if buyer.get("role") != UserRole.BUYER:
            raise ValidationError("Specified user is not a buyer")

    seller_id = order_data.seller_id
    batch = None
    if order_data.batch_id:
        batch = await resolve_doc(db.produce_batches, order_data.batch_id, "Batch", business_key="batch_id")
        p_val = order_data.produce_type.value if hasattr(order_data.produce_type, "value") else str(order_data.produce_type)
        if batch["produce_type"] != p_val:
            raise ValidationError(f"Batch produce type ({batch['produce_type']}) does not match order produce type ({p_val})")
        
        # Derive seller_id from batch
        if not seller_id:
            seller_id = batch["farmer_id"]
        elif seller_id != batch["farmer_id"]:
            raise ValidationError("Specified seller does not own the selected batch")

    if not seller_id:
        raise ValidationError("Seller ID is required")
    
    seller = await resolve_doc(db.users, seller_id, "Seller")
    if seller.get("role") not in [UserRole.FARMER, UserRole.ADMIN]:
        raise ValidationError("Seller must be an active farmer")
    
    order_id = generate_order_id()
    # High-precision integer paise calculation
    qty_dec = Decimal(str(order_data.requested_quantity_kg))
    price_dec = Decimal(str(order_data.unit_price_paise))
    total_amount_paise = int(round(qty_dec * price_dec))
    
    now = datetime.now(timezone.utc)
    order_doc = {
        "order_id": order_id,
        "buyer_id": buyer_id,
        "seller_id": seller_id,
        "produce_type": order_data.produce_type.value if hasattr(order_data.produce_type, "value") else str(order_data.produce_type),
        "batch_id": str(batch["_id"]) if batch else None,
        "requested_quantity_kg": round(float(qty_dec), 3),
        "unit_price_paise": order_data.unit_price_paise,
        "total_amount_paise": total_amount_paise,
        "preferred_delivery_date": order_data.preferred_delivery_date,
        "pickup_address": order_data.pickup_address.strip(),
        "delivery_address": order_data.delivery_address.strip(),
        "handling_requirements": order_data.handling_requirements,
        "status": PurchaseOrderStatus.DRAFT.value,
        "accepted_quantity_kg": 0.0,
        "fulfilled_quantity_kg": 0.0,
        "created_by": current_user["sub"],
        "created_at": now,
        "updated_at": now,
    }
    
    result = await db.purchase_orders.insert_one(to_mongo(order_doc))
    order_doc["_id"] = result.inserted_id
    
    await append_ledger_block(
        db,
        event_type=LedgerEventType.PURCHASE_ORDER_CREATED,
        entity_type="PURCHASE_ORDER",
        entity_id=str(result.inserted_id),
        actor_id=current_user["sub"],
        actor_role=current_user["role"],
        event_summary=f"Purchase order {order_id} created",
        payload={
            "order_id": order_id,
            "produce_type": order_doc["produce_type"],
            "requested_quantity_kg": order_doc["requested_quantity_kg"],
            "total_amount_paise": total_amount_paise,
            "seller_id": seller_id,
        }
    )
    
    return to_response(PurchaseOrderResponse, order_doc)


@router.post("/{order_id}/place", response_model=PurchaseOrderResponse)
async def place_purchase_order(
    order_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    order = await resolve_doc(db.purchase_orders, order_id, "Purchase Order", business_key="order_id")
    
    if current_user["role"] not in [UserRole.BUYER, UserRole.ADMIN]:
        raise ForbiddenError("Only buyers or admins can place purchase orders")
    if current_user["role"] == UserRole.BUYER and order["buyer_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized to place this order")
    
    if order["status"] != PurchaseOrderStatus.DRAFT.value:
        raise ValidationError(f"Order cannot be placed from status {order['status']}")
    
    now = datetime.now(timezone.utc)
    await db.purchase_orders.update_one(
        {"_id": order["_id"]},
        {"$set": {"status": PurchaseOrderStatus.PLACED.value, "updated_at": now}}
    )
    
    order["status"] = PurchaseOrderStatus.PLACED.value
    order["updated_at"] = now
    return to_response(PurchaseOrderResponse, order)


@router.get("", response_model=List[PurchaseOrderResponse])
async def list_purchase_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[PurchaseOrderStatus] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    conditions = []
    if current_user["role"] == UserRole.BUYER:
        conditions.append({"buyer_id": current_user["sub"]})
    elif current_user["role"] == UserRole.FARMER:
        conditions.append({"seller_id": current_user["sub"]})
    elif current_user["role"] == UserRole.WAREHOUSE_MANAGER:
        warehouses = await get_warehouses_for_user(db, current_user)
        inv_batches = await db.inventory_items.distinct("batch_id", {"warehouse_id": {"$in": warehouses}})
        conditions.append({"batch_id": {"$in": inv_batches}})
    
    if status:
        s_val = status.value if hasattr(status, "value") else str(status)
        conditions.append({"status": s_val})
    
    query = {"$and": conditions} if conditions else {}
    orders = await db.purchase_orders.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [to_response(PurchaseOrderResponse, o) for o in orders]


@router.get("/{order_id}", response_model=PurchaseOrderResponse)
async def get_purchase_order(
    order_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    order = await resolve_doc(db.purchase_orders, order_id, "Purchase Order", business_key="order_id")
    
    role = current_user["role"]
    uid = current_user["sub"]
    if role == UserRole.BUYER and order["buyer_id"] != uid:
        raise ForbiddenError("Not authorized to view this purchase order")
    if role == UserRole.FARMER and order["seller_id"] != uid:
        raise ForbiddenError("Not authorized to view this purchase order")
    
    return to_response(PurchaseOrderResponse, order)


@router.post("/{order_id}/accept", response_model=PurchaseOrderResponse)
async def accept_purchase_order(
    order_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    order = await resolve_doc(db.purchase_orders, order_id, "Purchase Order", business_key="order_id")
    
    # Strict RBAC: only the seller or ADMIN can accept
    if current_user["role"] not in [UserRole.FARMER, UserRole.ADMIN]:
        raise ForbiddenError("Only the seller or admin can accept this order")
    if current_user["role"] == UserRole.FARMER and order["seller_id"] != current_user["sub"]:
        raise ForbiddenError("Only the seller or admin can accept this order")
    
    allowed_statuses = [PurchaseOrderStatus.PLACED.value, PurchaseOrderStatus.DRAFT.value, PurchaseOrderStatus.PLACED, PurchaseOrderStatus.DRAFT]
    if order["status"] not in allowed_statuses:
        raise ValidationError(f"Order cannot be accepted from status {order['status']}")
    
    batch_id = order.get("batch_id")
    qty = order["requested_quantity_kg"]
    now = datetime.now(timezone.utc)

    async with uow() as session:
        # Atomic stock reservation if linked to batch
        if batch_id:
            batch = await resolve_doc(db.produce_batches, batch_id, "Batch", session=session)
            if batch.get("available_quantity_kg", 0) < qty:
                raise ValidationError("Insufficient available quantity in batch to reserve")
            
            # Atomic conditional update on batch
            res = await db.produce_batches.update_one(
                {"_id": batch["_id"], "available_quantity_kg": {"$gte": qty}},
                {"$inc": {"reserved_quantity_kg": qty, "available_quantity_kg": -qty}, "$set": {"updated_at": now}},
                session=session
            )
            if res.matched_count == 0:
                raise ValidationError("Batch stock was reserved by a concurrent request")
            
            # Update warehouse inventory if exists
            inv = await db.inventory_items.find_one({"batch_id": str(batch["_id"])}, session=session)
            if inv:
                avail_inv = float(inv.get("available_quantity_kg", inv.get("quantity_kg", 0.0)))
                res_amt = min(qty, avail_inv)
                if res_amt > 0:
                    try:
                        await reserve_stock(
                            db, str(inv["_id"]), res_amt,
                            actor_id=current_user["sub"], actor_role=current_user["role"],
                            reference_id=str(order["_id"]),
                            session=session
                        )
                    except Exception:
                        pass

        await db.purchase_orders.update_one(
            {"_id": order["_id"]},
            {"$set": {
                "status": PurchaseOrderStatus.ACCEPTED.value,
                "accepted_quantity_kg": qty,
                "updated_at": now
            }},
            session=session
        )
        
        await append_ledger_block(
            db,
            event_type=LedgerEventType.PURCHASE_ORDER_ACCEPTED,
            entity_type="PURCHASE_ORDER",
            entity_id=str(order["_id"]),
            actor_id=current_user["sub"],
            actor_role=current_user["role"],
            event_summary=f"Purchase order {order['order_id']} accepted",
            payload={"order_id": order["order_id"], "accepted_quantity_kg": qty},
            session=session
        )
    
    updated = await db.purchase_orders.find_one({"_id": order["_id"]})
    return to_response(PurchaseOrderResponse, updated)


@router.post("/{order_id}/reject", response_model=PurchaseOrderResponse)
async def reject_purchase_order(
    order_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    order = await resolve_doc(db.purchase_orders, order_id, "Purchase Order", business_key="order_id")
    
    # Strict RBAC: only the seller or ADMIN can reject
    if current_user["role"] not in [UserRole.FARMER, UserRole.ADMIN]:
        raise ForbiddenError("Only the seller or admin can reject this order")
    if current_user["role"] == UserRole.FARMER and order["seller_id"] != current_user["sub"]:
        raise ForbiddenError("Only the seller or admin can reject this order")
    
    now = datetime.now(timezone.utc)
    qty = order["requested_quantity_kg"]
    batch_id = order.get("batch_id")

    async with uow() as session:
        # If previously accepted, release reservation
        if order["status"] == PurchaseOrderStatus.ACCEPTED.value and batch_id:
            await db.produce_batches.update_one(
                {"_id": ObjectId(batch_id) if ObjectId.is_valid(batch_id) else batch_id, "reserved_quantity_kg": {"$gte": qty}},
                {"$inc": {"reserved_quantity_kg": -qty, "available_quantity_kg": qty}, "$set": {"updated_at": now}},
                session=session
            )
            inv = await db.inventory_items.find_one({"batch_id": batch_id}, session=session)
            if inv:
                res_in_inv = float(inv.get("reserved_quantity_kg", 0.0))
                rel_amt = min(qty, res_in_inv)
                if rel_amt > 0:
                    try:
                        await release_stock(
                            db, str(inv["_id"]), rel_amt,
                            actor_id=current_user["sub"], actor_role=current_user["role"],
                            reference_id=str(order["_id"]),
                            session=session
                        )
                    except Exception:
                        pass

        await db.purchase_orders.update_one(
            {"_id": order["_id"]},
            {"$set": {"status": PurchaseOrderStatus.REJECTED.value, "updated_at": now}},
            session=session
        )
        
        await append_ledger_block(
            db,
            event_type=LedgerEventType.PURCHASE_ORDER_REJECTED,
            entity_type="PURCHASE_ORDER",
            entity_id=str(order["_id"]),
            actor_id=current_user["sub"],
            actor_role=current_user["role"],
            event_summary=f"Purchase order {order['order_id']} rejected",
            payload={"order_id": order["order_id"]},
            session=session
        )
    
    updated = await db.purchase_orders.find_one({"_id": order["_id"]})
    return to_response(PurchaseOrderResponse, updated)


@router.post("/{order_id}/cancel", response_model=PurchaseOrderResponse)
async def cancel_purchase_order(
    order_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    order = await resolve_doc(db.purchase_orders, order_id, "Purchase Order", business_key="order_id")
    
    # Strict RBAC: only the buyer or ADMIN can cancel
    if current_user["role"] not in [UserRole.BUYER, UserRole.ADMIN]:
        raise ForbiddenError("Only the buyer or admin can cancel this order")
    if current_user["role"] == UserRole.BUYER and order["buyer_id"] != current_user["sub"]:
        raise ForbiddenError("Only the buyer or admin can cancel this order")
    
    if order["status"] in [PurchaseOrderStatus.FULFILLED.value, PurchaseOrderStatus.CANCELLED.value, PurchaseOrderStatus.REJECTED.value]:
        raise ValidationError(f"Order cannot be cancelled from status {order['status']}")
    
    now = datetime.now(timezone.utc)
    qty = order["requested_quantity_kg"]
    batch_id = order.get("batch_id")

    async with uow() as session:
        # If order was accepted, release reservation
        if order["status"] == PurchaseOrderStatus.ACCEPTED.value and batch_id:
            await db.produce_batches.update_one(
                {"_id": ObjectId(batch_id) if ObjectId.is_valid(batch_id) else batch_id, "reserved_quantity_kg": {"$gte": qty}},
                {"$inc": {"reserved_quantity_kg": -qty, "available_quantity_kg": qty}, "$set": {"updated_at": now}},
                session=session
            )
            inv = await db.inventory_items.find_one({"batch_id": batch_id}, session=session)
            if inv:
                res_in_inv = float(inv.get("reserved_quantity_kg", 0.0))
                rel_amt = min(qty, res_in_inv)
                if rel_amt > 0:
                    try:
                        await release_stock(
                            db, str(inv["_id"]), rel_amt,
                            actor_id=current_user["sub"], actor_role=current_user["role"],
                            reference_id=str(order["_id"]),
                            session=session
                        )
                    except Exception:
                        pass

        await db.purchase_orders.update_one(
            {"_id": order["_id"]},
            {"$set": {"status": PurchaseOrderStatus.CANCELLED.value, "updated_at": now}},
            session=session
        )
        
        await append_ledger_block(
            db,
            event_type=LedgerEventType.PURCHASE_ORDER_REJECTED,
            entity_type="PURCHASE_ORDER",
            entity_id=str(order["_id"]),
            actor_id=current_user["sub"],
            actor_role=current_user["role"],
            event_summary=f"Purchase order {order['order_id']} cancelled",
            payload={"order_id": order["order_id"], "reason": "Buyer cancellation"},
            session=session
        )
    
    updated = await db.purchase_orders.find_one({"_id": order["_id"]})
    return to_response(PurchaseOrderResponse, updated)

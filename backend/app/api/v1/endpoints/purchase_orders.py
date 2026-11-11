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
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError, ConflictError
from app.core.constants import PurchaseOrderStatus, ProduceType, UserRole, LedgerEventType
from app.services.ledger_service import append_ledger_block
from app.db.unit_of_work import run_in_txn
from app.utils.serialization import to_response
from app.utils.mongo import to_mongo, resolve_doc
from app.core.access import get_warehouses_for_user
from app.services.inventory_service import reserve_stock, release_stock

router = APIRouter()


class PurchaseOrderCreate(BaseModel):
    seller_id: Optional[str] = None
    produce_type: ProduceType
    batch_id: str
    requested_quantity_kg: float = Field(..., gt=0, allow_inf_nan=False)
    unit_price_paise: int = Field(..., gt=0)
    preferred_delivery_date: date
    buyer_id: Optional[str] = None
    model_config = ConfigDict(extra="forbid")


class PurchaseOrderResponse(BaseModel):
    id: str
    order_id: str
    buyer_id: str
    seller_id: str
    produce_type: ProduceType
    batch_id: str
    requested_quantity_kg: float
    unit_price_paise: int
    total_amount_paise: int
    preferred_delivery_date: date
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
        "batch_id": str(batch["_id"]),
        "requested_quantity_kg": round(float(qty_dec), 3),
        "unit_price_paise": order_data.unit_price_paise,
        "total_amount_paise": total_amount_paise,
        "preferred_delivery_date": order_data.preferred_delivery_date,
        "status": PurchaseOrderStatus.PLACED.value,
        "accepted_quantity_kg": 0.0,
        "fulfilled_quantity_kg": 0.0,
        "created_by": current_user["sub"],
        "created_at": now,
        "updated_at": now,
    }
    
    async def _transaction(session):
        result = await db.purchase_orders.insert_one(to_mongo(order_doc), session=session)
        order_doc["_id"] = result.inserted_id
        await append_ledger_block(
            db, event_type=LedgerEventType.PURCHASE_ORDER_CREATED,
            entity_type="PURCHASE_ORDER", entity_id=str(result.inserted_id),
            actor_id=current_user["sub"], actor_role=current_user["role"],
            event_summary=f"Purchase order {order_id} created",
            payload={"order_id": order_id, "produce_type": order_doc["produce_type"],
                     "requested_quantity_kg": order_doc["requested_quantity_kg"],
                     "total_amount_paise": total_amount_paise, "seller_id": seller_id},
            session=session,
        )
    await run_in_txn(_transaction)
    
    return to_response(PurchaseOrderResponse, order_doc)


@router.get("", response_model=List[PurchaseOrderResponse])
async def list_purchase_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1),
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
    
    allowed_statuses = [PurchaseOrderStatus.PLACED.value]
    if order["status"] not in allowed_statuses:
        raise ValidationError(f"Order cannot be accepted from status {order['status']}")
    
    batch_id = order.get("batch_id")
    qty = order["requested_quantity_kg"]
    now = datetime.now(timezone.utc)

    async def accept_transaction(session):
        claim = await db.purchase_orders.update_one(
            {"_id": order["_id"], "status": {"$in": [PurchaseOrderStatus.PLACED.value]}},
            {"$set": {"status": PurchaseOrderStatus.ACCEPTED.value, "accepted_quantity_kg": qty, "updated_at": now}},
            session=session,
        )
        if claim.matched_count == 0:
            raise ConflictError("Order was already processed")
        batch = await resolve_doc(db.produce_batches, batch_id, "Batch", session=session)
        if batch.get("status") != "AT_WAREHOUSE":
            raise ValidationError("Batch has no accepted warehouse receipt")
        inv = await db.inventory_items.find_one({"batch_id": batch_id}, sort=[("estimated_shelf_life_end", 1)], session=session)
        if not inv:
            raise ValidationError("Batch has no accepted warehouse stock")
        await reserve_stock(db, str(inv["_id"]), qty, session)
        await db.purchase_orders.update_one(
            {"_id": order["_id"]}, {"$set": {"inventory_id": str(inv["_id"])}}, session=session,
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
    await run_in_txn(accept_transaction)
    
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
    if order["status"] not in (PurchaseOrderStatus.PLACED.value):
        raise ValidationError(f"Order cannot be rejected from status {order['status']}")
    
    now = datetime.now(timezone.utc)
    async def _transaction(session):
        claim = await db.purchase_orders.update_one(
            {"_id": order["_id"], "status": order["status"]},
            {"$set": {"status": PurchaseOrderStatus.REJECTED.value, "updated_at": now}}, session=session,
        )
        if claim.matched_count == 0:
            raise ConflictError("Order was already processed")
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
    await run_in_txn(_transaction)
    
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
    
    if order["status"] not in [PurchaseOrderStatus.PLACED.value, PurchaseOrderStatus.ACCEPTED.value]:
        raise ValidationError(f"Order cannot be cancelled from status {order['status']}")
    
    now = datetime.now(timezone.utc)
    qty = order["requested_quantity_kg"]
    batch_id = order.get("batch_id")

    async def _transaction(session):
        shipment = await db.shipments.find_one(
            {"purchase_order_id": str(order["_id"]), "status": {"$ne": "CANCELLED"}}, session=session,
        )
        if shipment:
            raise ConflictError("Cancel the shipment before cancelling this order")
        claim = await db.purchase_orders.update_one(
            {"_id": order["_id"], "status": order["status"]},
            {"$set": {"status": PurchaseOrderStatus.CANCELLED.value, "updated_at": now}}, session=session,
        )
        if claim.matched_count == 0:
            raise ConflictError("Order was already processed")
        if order["status"] == PurchaseOrderStatus.ACCEPTED.value:
            inventory_id = order.get("inventory_id")
            if not inventory_id:
                raise ConflictError("Accepted order has no inventory allocation")
            await release_stock(db, inventory_id, qty, session)

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
    await run_in_txn(_transaction)
    
    updated = await db.purchase_orders.find_one({"_id": order["_id"]})
    return to_response(PurchaseOrderResponse, updated)

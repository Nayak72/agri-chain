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
    PurchaseOrderStatus, ProduceType, QualityGrade, UserRole
)
from app.services.ledger_service import append_ledger_block
from app.core.constants import LedgerEventType
from app.db.transaction import transaction_session
import uuid

router = APIRouter()


class PurchaseOrderCreate(BaseModel):
    seller_id: str
    produce_type: ProduceType
    batch_id: Optional[str] = None
    requested_quantity_kg: float = Field(..., gt=0)
    unit_price_paise: int = Field(..., gt=0)
    preferred_delivery_date: date
    pickup_address: str
    delivery_address: str
    handling_requirements: Optional[str] = None


class PurchaseOrderUpdate(BaseModel):
    status: Optional[PurchaseOrderStatus] = None


class PurchaseOrderResponse(BaseModel):
    id: str
    order_id: str
    buyer_id: str
    seller_id: str
    produce_type: ProduceType
    batch_id: Optional[str]
    requested_quantity_kg: float
    unit_price_paise: int
    total_amount_paise: int
    preferred_delivery_date: date
    pickup_address: str
    delivery_address: str
    handling_requirements: Optional[str]
    status: PurchaseOrderStatus
    accepted_quantity_kg: float
    fulfilled_quantity_kg: float
    created_at: datetime
    updated_at: datetime


def generate_order_id() -> str:
    return f"PO-{uuid.uuid4().hex[:10].upper()}"


@router.post("", response_model=PurchaseOrderResponse)
async def create_purchase_order(
    order_data: PurchaseOrderCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.BUYER, UserRole.ADMIN]:
        raise ForbiddenError("Only buyers can create purchase orders")
    
    buyer_id = current_user["sub"] if current_user["role"] == UserRole.BUYER else None
    if not buyer_id:
        raise ValidationError("Buyer ID required")
    
    if not ObjectId.is_valid(order_data.seller_id):
        raise ValidationError("Invalid seller ID")
    
    seller = await db.users.find_one({"_id": ObjectId(order_data.seller_id)})
    if not seller or seller["role"] not in [UserRole.FARMER, UserRole.ADMIN]:
        raise ValidationError("Seller must be a farmer")
    
    if order_data.batch_id:
        if not ObjectId.is_valid(order_data.batch_id):
            raise ValidationError("Invalid batch ID")
        batch = await db.produce_batches.find_one({"_id": ObjectId(order_data.batch_id)})
        if not batch:
            raise NotFoundError("Batch", order_data.batch_id)
        if batch["farmer_id"] != order_data.seller_id:
            raise ValidationError("Batch does not belong to this seller")
    
    order_id = generate_order_id()
    total_amount = order_data.requested_quantity_kg * order_data.unit_price_paise
    
    order_doc = {
        "order_id": order_id,
        "buyer_id": buyer_id,
        "seller_id": order_data.seller_id,
        "produce_type": order_data.produce_type,
        "batch_id": order_data.batch_id,
        "requested_quantity_kg": order_data.requested_quantity_kg,
        "unit_price_paise": order_data.unit_price_paise,
        "total_amount_paise": total_amount,
        "preferred_delivery_date": datetime.combine(order_data.preferred_delivery_date, datetime.min.time()),
        "pickup_address": order_data.pickup_address,
        "delivery_address": order_data.delivery_address,
        "handling_requirements": order_data.handling_requirements,
        "status": PurchaseOrderStatus.DRAFT,
        "accepted_quantity_kg": 0.0,
        "fulfilled_quantity_kg": 0.0,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    
    result = await db.purchase_orders.insert_one(order_doc)
    order_doc["_id"] = result.inserted_id
    
    await append_ledger_block(
        db,
        event_type=LedgerEventType.PURCHASE_ORDER_CREATED,
        entity_type="PURCHASE_ORDER",
        entity_id=str(result.inserted_id),
        actor_id=buyer_id,
        actor_role=current_user["role"],
        event_summary=f"Purchase order {order_id} created for {order_data.produce_type}",
        payload={
            "order_id": order_id,
            "produce_type": order_data.produce_type,
            "requested_quantity_kg": order_data.requested_quantity_kg,
            "seller_id": order_data.seller_id,
        }
    )
    
    return PurchaseOrderResponse(id=str(result.inserted_id), **order_doc)


@router.get("", response_model=List[PurchaseOrderResponse])
async def list_purchase_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[PurchaseOrderStatus] = None,
    produce_type: Optional[ProduceType] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if current_user["role"] == UserRole.BUYER:
        query["buyer_id"] = current_user["sub"]
    elif current_user["role"] == UserRole.FARMER:
        query["seller_id"] = current_user["sub"]
    
    if status:
        query["status"] = status
    if produce_type:
        query["produce_type"] = produce_type
    
    orders = await db.purchase_orders.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [PurchaseOrderResponse(id=str(o["_id"]), **o) for o in orders]


@router.get("/{order_id}", response_model=PurchaseOrderResponse)
async def get_purchase_order(
    order_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(order_id):
        raise ValidationError("Invalid order ID")
    
    order = await db.purchase_orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise NotFoundError("Purchase Order", order_id)
    
    if current_user["role"] == UserRole.BUYER and order["buyer_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized to view this order")
    if current_user["role"] == UserRole.FARMER and order["seller_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized to view this order")
    
    return PurchaseOrderResponse(id=str(order["_id"]), **order)


@router.post("/{order_id}/accept", response_model=PurchaseOrderResponse)
async def accept_purchase_order(
    order_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(order_id):
        raise ValidationError("Invalid order ID")
    
    order = await db.purchase_orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise NotFoundError("Purchase Order", order_id)
    
    if current_user["role"] == UserRole.FARMER and order["seller_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized to accept this order")
    
    if order["status"] != PurchaseOrderStatus.PLACED and order["status"] != PurchaseOrderStatus.DRAFT:
        raise ValidationError(f"Order cannot be accepted from status {order['status']}")
    
    if order["batch_id"]:
        batch = await db.produce_batches.find_one({"_id": ObjectId(order["batch_id"])})
        if not batch:
            raise NotFoundError("Batch", order["batch_id"])
        if batch["available_quantity_kg"] < order["requested_quantity_kg"]:
            raise ValidationError("Insufficient available quantity in batch")
    
    async with transaction_session() as session:
        await db.purchase_orders.update_one(
            {"_id": ObjectId(order_id)},
            {"$set": {"status": PurchaseOrderStatus.ACCEPTED, "updated_at": datetime.now(timezone.utc)}},
            session=session
        )
        
        if order["batch_id"]:
            await db.produce_batches.update_one(
                {"_id": ObjectId(order["batch_id"])},
                {"$inc": {"reserved_quantity_kg": order["requested_quantity_kg"], "available_quantity_kg": -order["requested_quantity_kg"]}, "$set": {"updated_at": datetime.now(timezone.utc)}},
                session=session
            )
            
            await db.inventory_items.update_one(
                {"batch_id": order["batch_id"]},
                {"$inc": {"reserved_quantity_kg": order["requested_quantity_kg"], "quantity_kg": -order["requested_quantity_kg"]}, "$set": {"updated_at": datetime.now(timezone.utc), "status": "RESERVED"}},
                session=session
            )
        
        await append_ledger_block(
            db,
            event_type=LedgerEventType.PURCHASE_ORDER_ACCEPTED,
            entity_type="PURCHASE_ORDER",
            entity_id=order_id,
            actor_id=current_user["sub"],
            actor_role=current_user["role"],
            event_summary=f"Purchase order {order['order_id']} accepted",
            payload={"order_id": order["order_id"], "accepted_quantity_kg": order["requested_quantity_kg"]},
            session=session
        )
    
    updated = await db.purchase_orders.find_one({"_id": ObjectId(order_id)})
    return PurchaseOrderResponse(id=str(updated["_id"]), **updated)


@router.post("/{order_id}/reject", response_model=PurchaseOrderResponse)
async def reject_purchase_order(
    order_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(order_id):
        raise ValidationError("Invalid order ID")
    
    order = await db.purchase_orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise NotFoundError("Purchase Order", order_id)
    
    if current_user["role"] == UserRole.FARMER and order["seller_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized to reject this order")
    
    if order["status"] not in [PurchaseOrderStatus.PLACED, PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.ACCEPTED]:
        raise ValidationError(f"Order cannot be rejected from status {order['status']}")
    
    async with transaction_session() as session:
        await db.purchase_orders.update_one(
            {"_id": ObjectId(order_id)},
            {"$set": {"status": PurchaseOrderStatus.REJECTED, "updated_at": datetime.now(timezone.utc)}},
            session=session
        )
        
        if order["status"] == PurchaseOrderStatus.ACCEPTED and order["batch_id"]:
            await db.produce_batches.update_one(
                {"_id": ObjectId(order["batch_id"])},
                {"$inc": {"reserved_quantity_kg": -order["requested_quantity_kg"], "available_quantity_kg": order["requested_quantity_kg"]}, "$set": {"updated_at": datetime.now(timezone.utc)}},
                session=session
            )
            
            await db.inventory_items.update_one(
                {"batch_id": order["batch_id"]},
                {"$inc": {"reserved_quantity_kg": -order["requested_quantity_kg"], "quantity_kg": order["requested_quantity_kg"]}, "$set": {"updated_at": datetime.now(timezone.utc), "status": "AVAILABLE"}},
                session=session
            )
        
        await append_ledger_block(
            db,
            event_type=LedgerEventType.PURCHASE_ORDER_REJECTED,
            entity_type="PURCHASE_ORDER",
            entity_id=order_id,
            actor_id=current_user["sub"],
            actor_role=current_user["role"],
            event_summary=f"Purchase order {order['order_id']} rejected",
            payload={"order_id": order["order_id"]},
            session=session
        )
    
    updated = await db.purchase_orders.find_one({"_id": ObjectId(order_id)})
    return PurchaseOrderResponse(id=str(updated["_id"]), **updated)


@router.post("/{order_id}/cancel", response_model=PurchaseOrderResponse)
async def cancel_purchase_order(
    order_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(order_id):
        raise ValidationError("Invalid order ID")
    
    order = await db.purchase_orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise NotFoundError("Purchase Order", order_id)
    
    if current_user["role"] == UserRole.BUYER and order["buyer_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized to cancel this order")
    
    if order["status"] in [PurchaseOrderStatus.FULFILLED, PurchaseOrderStatus.CANCELLED, PurchaseOrderStatus.REJECTED]:
        raise ValidationError(f"Order cannot be cancelled from status {order['status']}")
    
    async with transaction_session() as session:
        await db.purchase_orders.update_one(
            {"_id": ObjectId(order_id)},
            {"$set": {"status": PurchaseOrderStatus.CANCELLED, "updated_at": datetime.now(timezone.utc)}},
            session=session
        )
        
        if order["status"] == PurchaseOrderStatus.ACCEPTED and order["batch_id"]:
            await db.produce_batches.update_one(
                {"_id": ObjectId(order["batch_id"])},
                {"$inc": {"reserved_quantity_kg": -order["requested_quantity_kg"], "available_quantity_kg": order["requested_quantity_kg"]}, "$set": {"updated_at": datetime.now(timezone.utc)}},
                session=session
            )
            
            await db.inventory_items.update_one(
                {"batch_id": order["batch_id"]},
                {"$inc": {"reserved_quantity_kg": -order["requested_quantity_kg"], "quantity_kg": order["requested_quantity_kg"]}, "$set": {"updated_at": datetime.now(timezone.utc), "status": "AVAILABLE"}},
                session=session
            )
    
    updated = await db.purchase_orders.find_one({"_id": ObjectId(order_id)})
    return PurchaseOrderResponse(id=str(updated["_id"]), **updated)
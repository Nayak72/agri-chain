from typing import List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.constants import UserRole
from app.core.exceptions import ForbiddenError, NotFoundError


async def get_transporter_for_user(db: AsyncIOMotorDatabase, user: any, require_approved: bool = True) -> dict:
    """Resolve transporter profile for the authenticated user (user dict or user_id string)."""
    user_id = user if isinstance(user, str) else (user.get("sub") if isinstance(user, dict) else str(user))
    role = user.get("role") if isinstance(user, dict) else None
    
    if role == UserRole.ADMIN:
        return None

    transporter = await db.transporters.find_one({"user_id": user_id})
    if not transporter:
        raise ForbiddenError("No transporter profile linked to this user account")

    if require_approved:
        if transporter.get("approval_status") != "APPROVED" or not transporter.get("is_active", True):
            raise ForbiddenError("Transporter account is not approved or is inactive")

    return transporter


async def get_driver_for_user(db: AsyncIOMotorDatabase, user: any) -> dict:
    """Resolve driver record linked to the authenticated user account (user dict or user_id string)."""
    user_id = user if isinstance(user, str) else (user.get("sub") if isinstance(user, dict) else str(user))
    role = user.get("role") if isinstance(user, dict) else None
    email = user.get("email") if isinstance(user, dict) else None

    if role == UserRole.ADMIN:
        return None

    driver = await db.drivers.find_one({"user_id": user_id})
    if not driver and email:
        # Also check if driver was referenced by email
        driver = await db.drivers.find_one({"email": email})
        if driver and not driver.get("user_id"):
            # Auto-link by verified email match
            await db.drivers.update_one({"_id": driver["_id"]}, {"$set": {"user_id": user_id}})
            driver["user_id"] = user_id

    if not driver:
        raise ForbiddenError("No driver profile linked to this user account")

    return driver


async def get_warehouses_for_user(db: AsyncIOMotorDatabase, user: any) -> List[str]:
    """Return all warehouse string IDs owned/managed by the user (user dict or user_id string)."""
    user_id = user if isinstance(user, str) else (user.get("sub") if isinstance(user, dict) else str(user))
    role = user.get("role") if isinstance(user, dict) else None

    if role == UserRole.ADMIN:
        warehouses = await db.warehouses.find({}, {"_id": 1}).to_list(1000)
    else:
        warehouses = await db.warehouses.find({"manager_id": user_id}, {"_id": 1}).to_list(1000)
    return [str(w["_id"]) for w in warehouses]


async def assert_can_view_shipment(db: AsyncIOMotorDatabase, user: dict, shipment: dict) -> None:
    """Unified shipment authorization check across endpoints."""
    role = user.get("role")
    user_id = user.get("sub")

    if role == UserRole.ADMIN:
        return

    if role == UserRole.FARMER:
        if shipment.get("farmer_id") != user_id:
            raise ForbiddenError("Not authorized to view this shipment")
        return

    if role == UserRole.BUYER:
        if shipment.get("buyer_id") != user_id:
            raise ForbiddenError("Not authorized to view this shipment")
        return

    if role == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({"user_id": user_id})
        if not transporter or shipment.get("transporter_id") != str(transporter["_id"]):
            raise ForbiddenError("Shipment does not belong to your transport company")
        return

    if role == UserRole.DRIVER:
        driver = await get_driver_for_user(db, user)
        if shipment.get("driver_id") != str(driver["_id"]):
            raise ForbiddenError("You are not the assigned driver for this shipment")
        return

    if role == UserRole.WAREHOUSE_MANAGER:
        warehouse_ids = await get_warehouses_for_user(db, user)
        # Check if origin/destination warehouse matches
        if shipment.get("origin_warehouse_id") in warehouse_ids or shipment.get("destination_warehouse_id") in warehouse_ids:
            return
        raise ForbiddenError("Shipment does not route through any of your warehouses")

    raise ForbiddenError("Role not permitted to view this shipment")

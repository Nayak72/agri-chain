from app.db.mongodb import get_database
from app.core.exceptions import NotFoundError, ForbiddenError, ValidationError
from datetime import datetime, timezone
from bson import ObjectId


class InventoryService:
    @staticmethod
    async def list_inventory(filters: dict = None, skip: int = 0, limit: int = 20):
        db = get_database()
        query = filters or {}
        inventory = await db.inventory_items.find(query).sort("estimated_shelf_life_end", 1).skip(skip).limit(limit).to_list(limit)
        return [{**i, "id": str(i["_id"])} for i in inventory]

    @staticmethod
    async def reserve_quantity(inventory_id: str, quantity_kg: float):
        db = get_database()
        if not ObjectId.is_valid(inventory_id):
            raise ValidationError("Invalid inventory ID")
        inventory = await db.inventory_items.find_one({"_id": ObjectId(inventory_id)})
        if not inventory:
            raise NotFoundError("Inventory Item", inventory_id)
        available = inventory["quantity_kg"] - inventory["reserved_quantity_kg"]
        if available < quantity_kg:
            raise ValidationError("Insufficient available quantity to reserve")
        await db.inventory_items.update_one(
            {"_id": ObjectId(inventory_id)},
            {"$inc": {"reserved_quantity_kg": quantity_kg}, "$set": {"updated_at": datetime.now(timezone.utc)}}
        )

    @staticmethod
    async def release_quantity(inventory_id: str, quantity_kg: float):
        db = get_database()
        if not ObjectId.is_valid(inventory_id):
            raise ValidationError("Invalid inventory ID")
        inventory = await db.inventory_items.find_one({"_id": ObjectId(inventory_id)})
        if not inventory:
            raise NotFoundError("Inventory Item", inventory_id)
        if inventory["reserved_quantity_kg"] < quantity_kg:
            raise ValidationError("Insufficient reserved quantity to release")
        await db.inventory_items.update_one(
            {"_id": ObjectId(inventory_id)},
            {"$inc": {"reserved_quantity_kg": -quantity_kg}, "$set": {"updated_at": datetime.now(timezone.utc)}}
        )

    @staticmethod
    async def dispatch_quantity(inventory_id: str, quantity_kg: float, batch_id: str):
        db = get_database()
        if not ObjectId.is_valid(inventory_id):
            raise ValidationError("Invalid inventory ID")
        inventory = await db.inventory_items.find_one({"_id": ObjectId(inventory_id)})
        if not inventory:
            raise NotFoundError("Inventory Item", inventory_id)
        available = inventory["quantity_kg"] - inventory["reserved_quantity_kg"] - inventory["dispatched_quantity_kg"]
        if available < quantity_kg:
            raise ValidationError("Insufficient available quantity to dispatch")
        await db.inventory_items.update_one(
            {"_id": ObjectId(inventory_id)},
            {"$inc": {"dispatched_quantity_kg": quantity_kg}, "$set": {"updated_at": datetime.now(timezone.utc), "status": "DISPATCHED"}}
        )
        await db.produce_batches.update_one(
            {"_id": ObjectId(batch_id)},
            {"$inc": {"dispatched_quantity_kg": quantity_kg, "available_quantity_kg": -quantity_kg}, "$set": {"updated_at": datetime.now(timezone.utc)}}
        )
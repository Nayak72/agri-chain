from app.db.mongodb import get_database
from app.core.exceptions import NotFoundError, ForbiddenError, ValidationError
from datetime import datetime, timezone
from bson import ObjectId


class WarehouseService:
    @staticmethod
    async def list_warehouses(filters: dict = None, skip: int = 0, limit: int = 20):
        db = get_database()
        query = filters or {}
        warehouses = await db.warehouses.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        return [{**w, "id": str(w["_id"])} for w in warehouses]

    @staticmethod
    async def create_warehouse(warehouse_data: dict, current_user_role: str):
        db = get_database()
        if current_user_role != "ADMIN":
            raise ForbiddenError("Only admins can create warehouses")
        if not ObjectId.is_valid(warehouse_data["manager_id"]):
            raise ValidationError("Invalid manager ID")
        manager = await db.users.find_one({"_id": ObjectId(warehouse_data["manager_id"])})
        if not manager or manager["role"] != "WAREHOUSE_MANAGER":
            raise ValidationError("Manager must be a warehouse manager")
        existing = await db.warehouses.find_one({"name": warehouse_data["name"]})
        if existing:
            raise ValidationError("Warehouse name already exists")
        warehouse_data["is_active"] = True
        warehouse_data["created_at"] = datetime.now(timezone.utc)
        warehouse_data["updated_at"] = datetime.now(timezone.utc)
        result = await db.warehouses.insert_one(warehouse_data)
        return str(result.inserted_id)

    @staticmethod
    async def get_warehouse(warehouse_id: str):
        db = get_database()
        if not ObjectId.is_valid(warehouse_id):
            raise ValidationError("Invalid warehouse ID")
        warehouse = await db.warehouses.find_one({"_id": ObjectId(warehouse_id)})
        if not warehouse:
            raise NotFoundError("Warehouse", warehouse_id)
        return {**warehouse, "id": str(warehouse["_id"])}
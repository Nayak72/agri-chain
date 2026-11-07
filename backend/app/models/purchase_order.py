from datetime import datetime, timezone
from app.db.mongodb import get_database


class PurchaseOrderModel:
    collection = "purchase_orders"

    @staticmethod
    async def create(order_data: dict):
        db = get_database()
        order_data["created_at"] = datetime.now(timezone.utc)
        order_data["updated_at"] = datetime.now(timezone.utc)
        result = await db[PurchaseOrderModel.collection].insert_one(order_data)
        return str(result.inserted_id)

    @staticmethod
    async def get_by_id(order_id: str):
        from bson import ObjectId
        db = get_database()
        return await db[PurchaseOrderModel.collection].find_one({"_id": ObjectId(order_id)})

    @staticmethod
    async def get_by_order_id(order_id: str):
        db = get_database()
        return await db[PurchaseOrderModel.collection].find_one({"order_id": order_id})

    @staticmethod
    async def list(filters: dict = None, skip: int = 0, limit: int = 20):
        db = get_database()
        query = filters or {}
        cursor = db[PurchaseOrderModel.collection].find(query).sort("created_at", -1).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)

    @staticmethod
    async def update(order_id: str, update_data: dict):
        from bson import ObjectId
        db = get_database()
        update_data["updated_at"] = datetime.now(timezone.utc)
        await db[PurchaseOrderModel.collection].update_one(
            {"_id": ObjectId(order_id)}, {"$set": update_data}
        )
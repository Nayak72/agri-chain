from datetime import datetime, timezone
from app.db.mongodb import get_database


class BatchModel:
    collection = "produce_batches"

    @staticmethod
    async def create(batch_data: dict):
        db = get_database()
        batch_data["created_at"] = datetime.now(timezone.utc)
        batch_data["updated_at"] = datetime.now(timezone.utc)
        result = await db[BatchModel.collection].insert_one(batch_data)
        return str(result.inserted_id)

    @staticmethod
    async def get_by_id(batch_id: str):
        from bson import ObjectId
        db = get_database()
        return await db[BatchModel.collection].find_one({"_id": ObjectId(batch_id)})

    @staticmethod
    async def get_by_batch_id(batch_id: str):
        db = get_database()
        return await db[BatchModel.collection].find_one({"batch_id": batch_id})

    @staticmethod
    async def list(filters: dict = None, skip: int = 0, limit: int = 20):
        db = get_database()
        query = filters or {}
        cursor = db[BatchModel.collection].find(query).sort("created_at", -1).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)

    @staticmethod
    async def update(batch_id: str, update_data: dict):
        from bson import ObjectId
        db = get_database()
        update_data["updated_at"] = datetime.now(timezone.utc)
        await db[BatchModel.collection].update_one(
            {"_id": ObjectId(batch_id)}, {"$set": update_data}
        )

    @staticmethod
    async def increment_quantity(batch_id: str, field: str, amount: float):
        from bson import ObjectId
        db = get_database()
        await db[BatchModel.collection].update_one(
            {"_id": ObjectId(batch_id)},
            {"$inc": {field: amount}, "$set": {"updated_at": datetime.now(timezone.utc)}}
        )
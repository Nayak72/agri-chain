from datetime import datetime, timezone
from app.db.mongodb import get_database


class ProduceModel:
    collection = "produce_catalogue"

    @staticmethod
    async def create(produce_data: dict):
        db = get_database()
        produce_data["created_at"] = datetime.now(timezone.utc)
        produce_data["updated_at"] = datetime.now(timezone.utc)
        result = await db[ProduceModel.collection].insert_one(produce_data)
        return str(result.inserted_id)

    @staticmethod
    async def get_by_type(produce_type: str):
        db = get_database()
        return await db[ProduceModel.collection].find_one({"produce_type": produce_type})

    @staticmethod
    async def list(filters: dict = None, skip: int = 0, limit: int = 100):
        db = get_database()
        query = filters or {}
        cursor = db[ProduceModel.collection].find(query).sort("name", 1).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)

    @staticmethod
    async def update(produce_id: str, update_data: dict):
        from bson import ObjectId
        db = get_database()
        update_data["updated_at"] = datetime.now(timezone.utc)
        await db[ProduceModel.collection].update_one(
            {"_id": ObjectId(produce_id)}, {"$set": update_data}
        )
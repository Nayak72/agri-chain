from datetime import datetime, timezone
from app.db.mongodb import get_database


class UserModel:
    collection = "users"

    @staticmethod
    async def create(user_data: dict):
        db = get_database()
        user_data["created_at"] = datetime.now(timezone.utc)
        user_data["updated_at"] = datetime.now(timezone.utc)
        result = await db[UserModel.collection].insert_one(user_data)
        return str(result.inserted_id)

    @staticmethod
    async def get_by_email(email: str):
        db = get_database()
        return await db[UserModel.collection].find_one({"email": email})

    @staticmethod
    async def get_by_id(user_id: str):
        from bson import ObjectId
        db = get_database()
        return await db[UserModel.collection].find_one({"_id": ObjectId(user_id)})

    @staticmethod
    async def update(user_id: str, update_data: dict):
        from bson import ObjectId
        db = get_database()
        update_data["updated_at"] = datetime.now(timezone.utc)
        await db[UserModel.collection].update_one(
            {"_id": ObjectId(user_id)}, {"$set": update_data}
        )

    @staticmethod
    async def list(filters: dict = None, skip: int = 0, limit: int = 20):
        db = get_database()
        query = filters or {}
        cursor = db[UserModel.collection].find(query).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)

    @staticmethod
    async def count(filters: dict = None):
        db = get_database()
        query = filters or {}
        return await db[UserModel.collection].count_documents(query)
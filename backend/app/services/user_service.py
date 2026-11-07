from app.db.mongodb import get_database
from app.core.exceptions import NotFoundError, ForbiddenError, ValidationError
from datetime import datetime, timezone
from bson import ObjectId


class UserService:
    @staticmethod
    async def list_users(filters: dict = None, skip: int = 0, limit: int = 20):
        db = get_database()
        query = filters or {}
        total = await db.users.count_documents(query)
        users = await db.users.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        return {
            "users": [{**u, "id": str(u["_id"])} for u in users],
            "total": total,
            "page": skip // limit + 1,
            "page_size": limit,
        }

    @staticmethod
    async def get_user(user_id: str):
        db = get_database()
        if not ObjectId.is_valid(user_id):
            raise ValidationError("Invalid user ID")
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise NotFoundError("User", user_id)
        return {**user, "id": str(user["_id"])}

    @staticmethod
    async def update_user(user_id: str, update_data: dict, current_user_id: str):
        db = get_database()
        if not ObjectId.is_valid(user_id):
            raise ValidationError("Invalid user ID")
        update_data["updated_at"] = datetime.now(timezone.utc)
        result = await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
        if result.matched_count == 0:
            raise NotFoundError("User", user_id)
        return {"message": "User updated successfully"}

    @staticmethod
    async def approve_user(user_id: str):
        db = get_database()
        if not ObjectId.is_valid(user_id):
            raise ValidationError("Invalid user ID")
        result = await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"is_approved": True, "updated_at": datetime.now(timezone.utc)}}
        )
        if result.matched_count == 0:
            raise NotFoundError("User", user_id)
        return {"message": "User approved successfully"}

    @staticmethod
    async def suspend_user(user_id: str, current_user_id: str):
        db = get_database()
        if not ObjectId.is_valid(user_id):
            raise ValidationError("Invalid user ID")
        if user_id == current_user_id:
            raise ValidationError("Cannot suspend yourself")
        result = await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
        )
        if result.matched_count == 0:
            raise NotFoundError("User", user_id)
        return {"message": "User suspended successfully"}
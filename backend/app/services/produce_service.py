from app.db.mongodb import get_database
from app.core.exceptions import NotFoundError, ForbiddenError, ValidationError
from datetime import datetime, timezone
from bson import ObjectId


class ProduceService:
    @staticmethod
    async def create_produce(produce_data: dict):
        db = get_database()
        existing = await db.produce_catalogue.find_one({"produce_type": produce_data["produce_type"]})
        if existing:
            raise ValidationError(f"Produce type {produce_data['produce_type']} already exists")
        produce_data["is_active"] = True
        produce_data["created_at"] = datetime.now(timezone.utc)
        produce_data["updated_at"] = datetime.now(timezone.utc)
        result = await db.produce_catalogue.insert_one(produce_data)
        return str(result.inserted_id)

    @staticmethod
    async def list_produce(filters: dict = None):
        db = get_database()
        query = filters or {}
        produce = await db.produce_catalogue.find(query).sort("name", 1).to_list(None)
        return [{**p, "id": str(p["_id"])} for p in produce]

    @staticmethod
    async def get_produce(produce_id: str):
        db = get_database()
        if not ObjectId.is_valid(produce_id):
            raise ValidationError("Invalid produce ID")
        produce = await db.produce_catalogue.find_one({"_id": ObjectId(produce_id)})
        if not produce:
            raise NotFoundError("Produce", produce_id)
        return {**produce, "id": str(produce["_id"])}

    @staticmethod
    async def update_produce(produce_id: str, update_data: dict):
        db = get_database()
        if not ObjectId.is_valid(produce_id):
            raise ValidationError("Invalid produce ID")
        update_data["updated_at"] = datetime.now(timezone.utc)
        result = await db.produce_catalogue.update_one({"_id": ObjectId(produce_id)}, {"$set": update_data})
        if result.matched_count == 0:
            raise NotFoundError("Produce", produce_id)
        return {"message": "Produce updated successfully"}
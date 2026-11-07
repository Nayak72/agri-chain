from app.repositories.base import BaseRepository
from app.db.mongodb import get_database
from datetime import datetime, timezone


class ProduceRepository(BaseRepository):
    collection = "produce_catalogue"
    business_key = "produce_type"

    async def get_by_any_id(self, id_or_business_id: str, session=None):
        return await super().get_by_any_id(id_or_business_id, session=session)

    @staticmethod
    async def find_many(filters: dict = None, skip: int = 0, limit: int = 100, sort: list = None):
        db = get_database()
        query = filters or {}
        cursor = db[ProduceRepository.collection].find(query)
        if sort:
            cursor = cursor.sort(sort)
        cursor = cursor.skip(skip).limit(limit)
        return await cursor.to_list(length=limit)

    @staticmethod
    async def create(data: dict):
        db = get_database()
        data["created_at"] = datetime.now(timezone.utc)
        data["updated_at"] = datetime.now(timezone.utc)
        result = await db[ProduceRepository.collection].insert_one(data)
        return str(result.inserted_id)

    @staticmethod
    async def update_one(filters: dict, update_data: dict):
        db = get_database()
        update_data["updated_at"] = datetime.now(timezone.utc)
        return await db[ProduceRepository.collection].update_one(filters, {"$set": update_data})


class InventoryRepository:
    collection = "inventory_items"

    @staticmethod
    async def find_one(filters: dict):
        db = get_database()
        return await db[InventoryRepository.collection].find_one(filters)

    @staticmethod
    async def find_many(filters: dict = None, skip: int = 0, limit: int = 20, sort: list = None):
        db = get_database()
        query = filters or {}
        cursor = db[InventoryRepository.collection].find(query)
        if sort:
            cursor = cursor.sort(sort)
        cursor = cursor.skip(skip).limit(limit)
        return await cursor.to_list(length=limit)

    @staticmethod
    async def create(data: dict):
        db = get_database()
        data["created_at"] = datetime.now(timezone.utc)
        data["updated_at"] = datetime.now(timezone.utc)
        result = await db[InventoryRepository.collection].insert_one(data)
        return str(result.inserted_id)

    @staticmethod
    async def update_one(filters: dict, update_data: dict):
        db = get_database()
        update_data["updated_at"] = datetime.now(timezone.utc)
        return await db[InventoryRepository.collection].update_one(filters, {"$set": update_data})

    @staticmethod
    async def increment_field(filters: dict, field: str, amount: float):
        db = get_database()
        update_data = {"$inc": {field: amount}, "$set": {"updated_at": datetime.now(timezone.utc)}}
        return await db[InventoryRepository.collection].update_one(filters, update_data)


class FreightRepository:
    collection = "freight_bookings"

    @staticmethod
    async def find_one(filters: dict):
        db = get_database()
        return await db[FreightRepository.collection].find_one(filters)

    @staticmethod
    async def find_many(filters: dict = None, skip: int = 0, limit: int = 20, sort: list = None):
        db = get_database()
        query = filters or {}
        cursor = db[FreightRepository.collection].find(query)
        if sort:
            cursor = cursor.sort(sort)
        cursor = cursor.skip(skip).limit(limit)
        return await cursor.to_list(length=limit)

    @staticmethod
    async def create(data: dict):
        db = get_database()
        data["created_at"] = datetime.now(timezone.utc)
        data["updated_at"] = datetime.now(timezone.utc)
        result = await db[FreightRepository.collection].insert_one(data)
        return str(result.inserted_id)

    @staticmethod
    async def update_one(filters: dict, update_data: dict):
        db = get_database()
        update_data["updated_at"] = datetime.now(timezone.utc)
        return await db[FreightRepository.collection].update_one(filters, {"$set": update_data})


class ShipmentRepository:
    collection = "shipments"

    @staticmethod
    async def find_one(filters: dict):
        db = get_database()
        return await db[ShipmentRepository.collection].find_one(filters)

    @staticmethod
    async def find_many(filters: dict = None, skip: int = 0, limit: int = 20, sort: list = None):
        db = get_database()
        query = filters or {}
        cursor = db[ShipmentRepository.collection].find(query)
        if sort:
            cursor = cursor.sort(sort)
        cursor = cursor.skip(skip).limit(limit)
        return await cursor.to_list(length=limit)

    @staticmethod
    async def create(data: dict):
        db = get_database()
        data["created_at"] = datetime.now(timezone.utc)
        data["updated_at"] = datetime.now(timezone.utc)
        result = await db[ShipmentRepository.collection].insert_one(data)
        return str(result.inserted_id)

    @staticmethod
    async def update_one(filters: dict, update_data: dict):
        db = get_database()
        update_data["updated_at"] = datetime.now(timezone.utc)
        return await db[ShipmentRepository.collection].update_one(filters, {"$set": update_data})


class LedgerRepository:
    collection = "ledger_blocks"

    @staticmethod
    async def find_one(filters: dict):
        db = get_database()
        return await db[LedgerRepository.collection].find_one(filters)

    @staticmethod
    async def find_many(filters: dict = None, skip: int = 0, limit: int = 20, sort: list = None):
        db = get_database()
        query = filters or {}
        cursor = db[LedgerRepository.collection].find(query)
        if sort:
            cursor = cursor.sort(sort)
        cursor = cursor.skip(skip).limit(limit)
        return await cursor.to_list(length=limit)

    @staticmethod
    async def create(data: dict):
        db = get_database()
        result = await db[LedgerRepository.collection].insert_one(data)
        return str(result.inserted_id)

    @staticmethod
    async def count(filters: dict = None):
        db = get_database()
        query = filters or {}
        return await db[LedgerRepository.collection].count_documents(query)

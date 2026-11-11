from datetime import datetime, timezone
from app.db.mongodb import get_database


class WarehouseModel:
    collection = "warehouses"

    @staticmethod
    async def create(warehouse_data: dict):
        db = get_database()
        warehouse_data["created_at"] = datetime.now(timezone.utc)
        warehouse_data["updated_at"] = datetime.now(timezone.utc)
        result = await db[WarehouseModel.collection].insert_one(warehouse_data)
        return str(result.inserted_id)

    @staticmethod
    async def get_by_id(warehouse_id: str):
        from bson import ObjectId
        db = get_database()
        return await db[WarehouseModel.collection].find_one({"_id": ObjectId(warehouse_id)})

    @staticmethod
    async def list(filters: dict = None, skip: int = 0, limit: int = 20):
        db = get_database()
        query = filters or {}
        cursor = db[WarehouseModel.collection].find(query).sort("created_at", -1).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)

    @staticmethod
    async def update(warehouse_id: str, update_data: dict):
        from bson import ObjectId
        db = get_database()
        update_data["updated_at"] = datetime.now(timezone.utc)
        await db[WarehouseModel.collection].update_one(
            {"_id": ObjectId(warehouse_id)}, {"$set": update_data}
        )


class TransporterModel:
    collection = "transporters"

    @staticmethod
    async def create(transporter_data: dict):
        db = get_database()
        transporter_data["created_at"] = datetime.now(timezone.utc)
        transporter_data["updated_at"] = datetime.now(timezone.utc)
        result = await db[TransporterModel.collection].insert_one(transporter_data)
        return str(result.inserted_id)

    @staticmethod
    async def get_by_id(transporter_id: str):
        from bson import ObjectId
        db = get_database()
        return await db[TransporterModel.collection].find_one({"_id": ObjectId(transporter_id)})

    @staticmethod
    async def get_by_user_id(user_id: str):
        db = get_database()
        return await db[TransporterModel.collection].find_one({"user_id": user_id})

    @staticmethod
    async def list(filters: dict = None, skip: int = 0, limit: int = 20):
        db = get_database()
        query = filters or {}
        cursor = db[TransporterModel.collection].find(query).sort("created_at", -1).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)

    @staticmethod
    async def update(transporter_id: str, update_data: dict):
        from bson import ObjectId
        db = get_database()
        update_data["updated_at"] = datetime.now(timezone.utc)
        await db[TransporterModel.collection].update_one(
            {"_id": ObjectId(transporter_id)}, {"$set": update_data}
        )


class VehicleModel:
    collection = "vehicles"

    @staticmethod
    async def create(vehicle_data: dict):
        db = get_database()
        vehicle_data["created_at"] = datetime.now(timezone.utc)
        vehicle_data["updated_at"] = datetime.now(timezone.utc)
        result = await db[VehicleModel.collection].insert_one(vehicle_data)
        return str(result.inserted_id)

    @staticmethod
    async def get_by_id(vehicle_id: str):
        from bson import ObjectId
        db = get_database()
        return await db[VehicleModel.collection].find_one({"_id": ObjectId(vehicle_id)})

    @staticmethod
    async def get_by_registration(registration_number: str):
        db = get_database()
        return await db[VehicleModel.collection].find_one({"registration_number": registration_number})

    @staticmethod
    async def list(filters: dict = None, skip: int = 0, limit: int = 20):
        db = get_database()
        query = filters or {}
        cursor = db[VehicleModel.collection].find(query).sort("created_at", -1).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)

    @staticmethod
    async def update(vehicle_id: str, update_data: dict):
        from bson import ObjectId
        db = get_database()
        update_data["updated_at"] = datetime.now(timezone.utc)
        await db[VehicleModel.collection].update_one(
            {"_id": ObjectId(vehicle_id)}, {"$set": update_data}
        )


class DriverModel:
    collection = "drivers"

    @staticmethod
    async def create(driver_data: dict):
        db = get_database()
        driver_data["created_at"] = datetime.now(timezone.utc)
        driver_data["updated_at"] = datetime.now(timezone.utc)
        result = await db[DriverModel.collection].insert_one(driver_data)
        return str(result.inserted_id)

    @staticmethod
    async def get_by_id(driver_id: str):
        from bson import ObjectId
        db = get_database()
        return await db[DriverModel.collection].find_one({"_id": ObjectId(driver_id)})

    @staticmethod

    @staticmethod
    async def list(filters: dict = None, skip: int = 0, limit: int = 20):
        db = get_database()
        query = filters or {}
        cursor = db[DriverModel.collection].find(query).sort("created_at", -1).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)

    @staticmethod
    async def update(driver_id: str, update_data: dict):
        from bson import ObjectId
        db = get_database()
        update_data["updated_at"] = datetime.now(timezone.utc)
        await db[DriverModel.collection].update_one(
            {"_id": ObjectId(driver_id)}, {"$set": update_data}
        )


class ShipmentModel:
    collection = "shipments"

    @staticmethod
    async def create(shipment_data: dict):
        db = get_database()
        shipment_data["created_at"] = datetime.now(timezone.utc)
        shipment_data["updated_at"] = datetime.now(timezone.utc)
        result = await db[ShipmentModel.collection].insert_one(shipment_data)
        return str(result.inserted_id)

    @staticmethod
    async def get_by_id(shipment_id: str):
        from bson import ObjectId
        db = get_database()
        return await db[ShipmentModel.collection].find_one({"_id": ObjectId(shipment_id)})

    @staticmethod
    async def get_by_shipment_id(shipment_id: str):
        db = get_database()
        return await db[ShipmentModel.collection].find_one({"shipment_id": shipment_id})

    @staticmethod
    async def list(filters: dict = None, skip: int = 0, limit: int = 20):
        db = get_database()
        query = filters or {}
        cursor = db[ShipmentModel.collection].find(query).sort("created_at", -1).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)

    @staticmethod
    async def update(shipment_id: str, update_data: dict):
        from bson import ObjectId
        db = get_database()
        update_data["updated_at"] = datetime.now(timezone.utc)
        await db[ShipmentModel.collection].update_one(
            {"_id": ObjectId(shipment_id)}, {"$set": update_data}
        )


class LedgerModel:
    collection = "ledger_blocks"

    @staticmethod
    async def create(block_data: dict):
        db = get_database()
        result = await db[LedgerModel.collection].insert_one(block_data)
        return str(result.inserted_id)

    @staticmethod
    async def list(filters: dict = None, skip: int = 0, limit: int = 20):
        db = get_database()
        query = filters or {}
        cursor = db[LedgerModel.collection].find(query).sort("index", 1).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)

    @staticmethod
    async def get_by_index(index: int):
        db = get_database()
        return await db[LedgerModel.collection].find_one({"index": index})

    @staticmethod
    async def count(filters: dict = None):
        db = get_database()
        query = filters or {}
        return await db[LedgerModel.collection].count_documents(query)
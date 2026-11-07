from app.db.mongodb import get_database
from app.core.exceptions import NotFoundError, ForbiddenError, ValidationError
from datetime import datetime, timezone
from bson import ObjectId


class FleetService:
    @staticmethod
    async def list_vehicles(filters: dict = None, skip: int = 0, limit: int = 20):
        db = get_database()
        query = filters or {}
        vehicles = await db.vehicles.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        return [{**v, "id": str(v["_id"])} for v in vehicles]

    @staticmethod
    async def create_vehicle(vehicle_data: dict, current_user_role: str, current_user_id: str):
        db = get_database()
        if current_user_role not in ["TRANSPORTER", "ADMIN"]:
            raise ForbiddenError("Only transporters can create vehicles")
        if not ObjectId.is_valid(vehicle_data["transporter_id"]):
            raise ValidationError("Invalid transporter ID")
        transporter = await db.transporters.find_one({"_id": ObjectId(vehicle_data["transporter_id"])})
        if not transporter:
            raise NotFoundError("Transporter", vehicle_data["transporter_id"])
        if current_user_role == "TRANSPORTER":
            if transporter.get("user_id") != current_user_id:
                raise ForbiddenError("Not authorized for this transporter")
        existing = await db.vehicles.find_one({"registration_number": vehicle_data["registration_number"]})
        if existing:
            raise ValidationError("Registration number already exists")
        vehicle_data["status"] = "AVAILABLE"
        vehicle_data["available_capacity_kg"] = vehicle_data["max_payload_kg"]
        vehicle_data["created_at"] = datetime.now(timezone.utc)
        vehicle_data["updated_at"] = datetime.now(timezone.utc)
        result = await db.vehicles.insert_one(vehicle_data)
        return str(result.inserted_id)

    @staticmethod
    async def list_drivers(filters: dict = None, skip: int = 0, limit: int = 20):
        db = get_database()
        query = filters or {}
        drivers = await db.drivers.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        return [{**d, "id": str(d["_id"])} for d in drivers]

    @staticmethod
    async def create_driver(driver_data: dict, current_user_role: str, current_user_id: str):
        db = get_database()
        if current_user_role not in ["TRANSPORTER", "ADMIN"]:
            raise ForbiddenError("Only transporters can create drivers")
        if not ObjectId.is_valid(driver_data["transporter_id"]):
            raise ValidationError("Invalid transporter ID")
        transporter = await db.transporters.find_one({"_id": ObjectId(driver_data["transporter_id"])})
        if not transporter:
            raise NotFoundError("Transporter", driver_data["transporter_id"])
        if current_user_role == "TRANSPORTER":
            if transporter.get("user_id") != current_user_id:
                raise ForbiddenError("Not authorized for this transporter")
        existing = await db.drivers.find_one({"license_number": driver_data["license_number"]})
        if existing:
            raise ValidationError("License number already exists")
        driver_data["status"] = "AVAILABLE"
        driver_data["current_assignment"] = None
        driver_data["created_at"] = datetime.now(timezone.utc)
        driver_data["updated_at"] = datetime.now(timezone.utc)
        result = await db.drivers.insert_one(driver_data)
        return str(result.inserted_id)
from app.db.mongodb import get_database
from app.core.exceptions import NotFoundError, ForbiddenError, ValidationError
from datetime import datetime, timezone
from bson import ObjectId
from app.services.ledger_service import append_ledger_block
from app.core.constants import LedgerEventType


class ShipmentService:
    @staticmethod
    async def create_shipment(shipment_data: dict, current_user_id: str, current_user_role: str):
        db = get_database()
        if current_user_role != "TRANSPORTER":
            raise ForbiddenError("Only transporters can create shipments")
        if not ObjectId.is_valid(shipment_data["booking_id"]):
            raise ValidationError("Invalid booking ID")
        booking = await db.freight_bookings.find_one({"_id": ObjectId(shipment_data["booking_id"])})
        if not booking:
            raise NotFoundError("Freight Booking", shipment_data["booking_id"])
        if booking["status"] != "CONFIRMED":
            raise ValidationError("Booking must be confirmed before creating shipment")
        transporter = await db.transporters.find_one({"user_id": current_user_id})
        if not transporter:
            raise NotFoundError("Transporter profile", current_user_id)
        if not ObjectId.is_valid(shipment_data["vehicle_id"]):
            raise ValidationError("Invalid vehicle ID")
        vehicle = await db.vehicles.find_one({"_id": ObjectId(shipment_data["vehicle_id"])})
        if not vehicle:
            raise NotFoundError("Vehicle", shipment_data["vehicle_id"])
        if vehicle["transporter_id"] != str(transporter["_id"]):
            raise ForbiddenError("Vehicle does not belong to this transporter")
        if vehicle["status"] != "AVAILABLE":
            raise ValidationError("Vehicle is not available")
        if not ObjectId.is_valid(shipment_data["driver_id"]):
            raise ValidationError("Invalid driver ID")
        driver = await db.drivers.find_one({"_id": ObjectId(shipment_data["driver_id"])})
        if not driver:
            raise NotFoundError("Driver", shipment_data["driver_id"])
        if driver["transporter_id"] != str(transporter["_id"]):
            raise ForbiddenError("Driver does not belong to this transporter")
        if driver["status"] != "AVAILABLE":
            raise ValidationError("Driver is not available")
        shipment_data["status"] = "BOOKING_CONFIRMED"
        shipment_data["exception_flags"] = []
        shipment_data["created_at"] = datetime.now(timezone.utc)
        shipment_data["updated_at"] = datetime.now(timezone.utc)
        result = await db.shipments.insert_one(shipment_data)
        shipment_id = str(result.inserted_id)
        await db.vehicles.update_one(
            {"_id": ObjectId(shipment_data["vehicle_id"])},
            {"$set": {"status": "ASSIGNED", "updated_at": datetime.now(timezone.utc)}}
        )
        await db.drivers.update_one(
            {"_id": ObjectId(shipment_data["driver_id"])},
            {"$set": {"status": "ASSIGNED", "current_assignment": shipment_id, "updated_at": datetime.now(timezone.utc)}}
        )
        return shipment_id

    @staticmethod
    async def list_shipments(filters: dict = None, skip: int = 0, limit: int = 20):
        db = get_database()
        query = filters or {}
        shipments = await db.shipments.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        return [{**s, "id": str(s["_id"])} for s in shipments]

    @staticmethod
    async def get_shipment(shipment_id: str):
        db = get_database()
        if not ObjectId.is_valid(shipment_id):
            raise ValidationError("Invalid shipment ID")
        shipment = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
        if not shipment:
            raise NotFoundError("Shipment", shipment_id)
        return {**shipment, "id": str(shipment["_id"])}

    @staticmethod
    async def update_status(shipment_id: str, new_status: str, current_user_id: str, current_user_role: str):
        db = get_database()
        if not ObjectId.is_valid(shipment_id):
            raise ValidationError("Invalid shipment ID")
        shipment = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
        if not shipment:
            raise NotFoundError("Shipment", shipment_id)
        if current_user_role == "DRIVER" and shipment["driver_id"] != current_user_id:
            raise ForbiddenError("Not authorized")
        if current_user_role == "TRANSPORTER":
            transporter = await db.transporters.find_one({"user_id": current_user_id})
            if not transporter or shipment["transporter_id"] != str(transporter["_id"]):
                raise ForbiddenError("Not authorized")
        await db.shipments.update_one(
            {"_id": ObjectId(shipment_id)},
            {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc)}}
        )
        return {"message": f"Shipment status updated to {new_status}"}
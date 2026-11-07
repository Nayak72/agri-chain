from app.db.mongodb import get_database
from app.core.exceptions import NotFoundError, ForbiddenError, ValidationError
from datetime import datetime, timezone
from bson import ObjectId


class FreightService:
    @staticmethod
    async def create_booking(booking_data: dict, current_user_id: str, current_user_role: str):
        db = get_database()
        if current_user_role not in ["BUYER", "FARMER", "ADMIN"]:
            raise ForbiddenError("Only buyers or farmers can create freight bookings")
        if not ObjectId.is_valid(booking_data["purchase_order_id"]):
            raise ValidationError("Invalid purchase order ID")
        po = await db.purchase_orders.find_one({"_id": ObjectId(booking_data["purchase_order_id"])})
        if not po:
            raise NotFoundError("Purchase Order", booking_data["purchase_order_id"])
        if current_user_role == "BUYER" and po["buyer_id"] != current_user_id:
            raise ForbiddenError("Not authorized for this purchase order")
        if current_user_role == "FARMER" and po["seller_id"] != current_user_id:
            raise ForbiddenError("Not authorized for this purchase order")
        if po["status"] != "ACCEPTED":
            raise ValidationError("Purchase order must be accepted before creating freight booking")
        booking_data["status"] = "REQUESTED"
        booking_data["created_at"] = datetime.now(timezone.utc)
        booking_data["updated_at"] = datetime.now(timezone.utc)
        result = await db.freight_bookings.insert_one(booking_data)
        return str(result.inserted_id)

    @staticmethod
    async def list_bookings(filters: dict = None, skip: int = 0, limit: int = 20):
        db = get_database()
        query = filters or {}
        bookings = await db.freight_bookings.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        return [{**b, "id": str(b["_id"])} for b in bookings]
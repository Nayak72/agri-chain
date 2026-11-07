from app.db.mongodb import get_database
from app.core.exceptions import NotFoundError, ForbiddenError, ValidationError
from datetime import datetime, timezone
from bson import ObjectId
from app.services.ledger_service import append_ledger_block
from app.core.constants import LedgerEventType


class CheckpointService:
    @staticmethod
    async def create_checkpoint(checkpoint_data: dict, current_user_id: str, current_user_role: str):
        db = get_database()
        if current_user_role not in ["DRIVER", "TRANSPORTER", "WAREHOUSE_MANAGER"]:
            raise ForbiddenError("Only driver, transporter, or warehouse manager can record checkpoints")
        if not ObjectId.is_valid(checkpoint_data["shipment_id"]):
            raise ValidationError("Invalid shipment ID")
        shipment = await db.shipments.find_one({"_id": ObjectId(checkpoint_data["shipment_id"])})
        if not shipment:
            raise NotFoundError("Shipment", checkpoint_data["shipment_id"])
        if current_user_role == "DRIVER" and shipment["driver_id"] != current_user_id:
            raise ForbiddenError("Not authorized")
        existing = await db.route_checkpoints.find_one({
            "shipment_id": checkpoint_data["shipment_id"],
            "sequence": checkpoint_data["sequence"]
        })
        if existing:
            raise ValidationError("Checkpoint already exists at this sequence")
        checkpoint_data["status"] = "PENDING"
        checkpoint_data["recorded_by"] = current_user_id
        checkpoint_data["created_at"] = datetime.now(timezone.utc)
        checkpoint_data["updated_at"] = datetime.now(timezone.utc)
        result = await db.route_checkpoints.insert_one(checkpoint_data)
        return str(result.inserted_id)

    @staticmethod
    async def list_checkpoints(shipment_id: str, skip: int = 0, limit: int = 20):
        db = get_database()
        checkpoints = await db.route_checkpoints.find({"shipment_id": shipment_id}).sort("sequence", 1).skip(skip).limit(limit).to_list(limit)
        return [{**c, "id": str(c["_id"])} for c in checkpoints]

    @staticmethod
    async def update_checkpoint(checkpoint_id: str, update_data: dict, current_user_id: str, current_user_role: str):
        db = get_database()
        if not ObjectId.is_valid(checkpoint_id):
            raise ValidationError("Invalid checkpoint ID")
        checkpoint = await db.route_checkpoints.find_one({"_id": ObjectId(checkpoint_id)})
        if not checkpoint:
            raise NotFoundError("Checkpoint", checkpoint_id)
        shipment = await db.shipments.find_one({"_id": ObjectId(checkpoint["shipment_id"])})
        if not shipment:
            raise NotFoundError("Shipment", checkpoint["shipment_id"])
        if current_user_role == "DRIVER" and shipment["driver_id"] != current_user_id:
            raise ForbiddenError("Not authorized")
        update_data["updated_at"] = datetime.now(timezone.utc)
        if update_data.get("actual_arrival") and update_data.get("actual_departure"):
            update_data["status"] = "COMPLETED"
        elif update_data.get("actual_arrival"):
            update_data["status"] = "ARRIVED"
        elif update_data.get("actual_departure"):
            update_data["status"] = "DEPARTED"
        await db.route_checkpoints.update_one({"_id": ObjectId(checkpoint_id)}, {"$set": update_data})
        return {"message": "Checkpoint updated successfully"}
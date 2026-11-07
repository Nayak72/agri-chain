from app.db.mongodb import get_database
from app.core.exceptions import NotFoundError, ForbiddenError, ValidationError
from datetime import datetime, timezone
from bson import ObjectId
from app.services.ledger_service import append_ledger_block
from app.core.constants import LedgerEventType


class AlertService:
    @staticmethod
    async def list_alerts(shipment_id: str, filters: dict = None, skip: int = 0, limit: int = 20):
        db = get_database()
        query = {"shipment_id": shipment_id}
        if filters:
            query.update(filters)
        alerts = await db.sensor_alerts.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        return alerts

    @staticmethod
    async def acknowledge_alert(alert_id: str, current_user_id: str, corrective_action: str = None):
        db = get_database()
        if not ObjectId.is_valid(alert_id):
            raise ValidationError("Invalid alert ID")
        alert = await db.sensor_alerts.find_one({"_id": ObjectId(alert_id)})
        if not alert:
            raise NotFoundError("Alert", alert_id)
        if alert["status"] != "ACTIVE":
            raise ValidationError(f"Alert is already {alert['status']}")
        await db.sensor_alerts.update_one(
            {"_id": ObjectId(alert_id)},
            {"$set": {
                "status": "ACKNOWLEDGED",
                "acknowledged_by": current_user_id,
                "acknowledged_at": datetime.now(timezone.utc),
                "corrective_action": corrective_action,
                "updated_at": datetime.now(timezone.utc),
            }}
        )
        return {"message": "Alert acknowledged"}

    @staticmethod
    async def resolve_alert(alert_id: str, current_user_id: str, corrective_action: str = None):
        db = get_database()
        if not ObjectId.is_valid(alert_id):
            raise ValidationError("Invalid alert ID")
        alert = await db.sensor_alerts.find_one({"_id": ObjectId(alert_id)})
        if not alert:
            raise NotFoundError("Alert", alert_id)
        if alert["status"] == "RESOLVED":
            raise ValidationError("Alert is already resolved")
        await db.sensor_alerts.update_one(
            {"_id": ObjectId(alert_id)},
            {"$set": {
                "status": "RESOLVED",
                "resolved_by": current_user_id,
                "resolved_at": datetime.now(timezone.utc),
                "corrective_action": corrective_action or alert.get("corrective_action"),
                "updated_at": datetime.now(timezone.utc),
            }}
        )
        return {"message": "Alert resolved"}


class DeliveryService:
    @staticmethod
    async def create_delivery_report(shipment_id: str, report_data: dict, current_user_id: str, current_user_role: str):
        db = get_database()
        if current_user_role not in ["DRIVER", "TRANSPORTER", "BUYER"]:
            raise ForbiddenError("Only driver, transporter, or buyer can create delivery reports")
        if not ObjectId.is_valid(shipment_id):
            raise ValidationError("Invalid shipment ID")
        shipment = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
        if not shipment:
            raise NotFoundError("Shipment", shipment_id)
        if current_user_role == "DRIVER" and shipment["driver_id"] != current_user_id:
            raise ForbiddenError("Not authorized")
        if current_user_role == "BUYER" and shipment["buyer_id"] != current_user_id:
            raise ForbiddenError("Not authorized")
        existing = await db.delivery_reports.find_one({"shipment_id": shipment_id})
        if existing:
            raise ValidationError("Delivery report already exists for this shipment")
        report_data["created_at"] = datetime.now(timezone.utc)
        report_data["updated_at"] = datetime.now(timezone.utc)
        result = await db.delivery_reports.insert_one(report_data)
        report_id = str(result.inserted_id)
        if report_data["status"] == "DELIVERED":
            new_status = "DELIVERED"
        elif report_data["status"] == "PARTIAL":
            new_status = "PARTIALLY_DELIVERED"
        else:
            new_status = "DELIVERY_REJECTED"
        await db.shipments.update_one(
            {"_id": ObjectId(shipment_id)},
            {"$set": {"status": new_status, "actual_arrival_time": report_data["received_at"], "updated_at": datetime.now(timezone.utc)}}
        )
        return report_id

    @staticmethod
    async def get_delivery_report(shipment_id: str):
        db = get_database()
        report = await db.delivery_reports.find_one({"shipment_id": shipment_id})
        if not report:
            raise NotFoundError("Delivery Report", shipment_id)
        return {**report, "id": str(report["_id"])}
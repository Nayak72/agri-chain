from app.db.mongodb import get_database
from app.core.exceptions import NotFoundError, ForbiddenError, ValidationError
from datetime import datetime, timezone
from bson import ObjectId


class AnalyticsService:
    @staticmethod
    async def get_dashboard_metrics(filters: dict = None):
        db = get_database()
        query = filters or {}
        total = await db.shipments.count_documents(query)
        active = await db.shipments.count_documents({**query, "status": {"$in": ["IN_TRANSIT", "AT_CHECKPOINT", "OUT_FOR_DELIVERY"]}})
        completed = await db.shipments.count_documents({**query, "status": "DELIVERED"})
        delayed = await db.shipments.count_documents({**query, "status": "DELAYED"})
        cancelled = await db.shipments.count_documents({**query, "status": "CANCELLED"})
        return {
            "total_shipments": total,
            "active_shipments": active,
            "completed_shipments": completed,
            "delayed_shipments": delayed,
            "cancelled_shipments": cancelled,
            "average_transit_hours": 0.0,
            "on_time_delivery_percentage": 0.0,
        }

    @staticmethod
    async def get_shipment_analytics(filters: dict = None):
        db = get_database()
        query = filters or {}
        pipeline = [
            {"$match": query},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        status_dist = await db.shipments.aggregate(pipeline).to_list(None)
        pipeline = [
            {"$match": query},
            {"$group": {"_id": {"$dateToString": {"format": "%Y-%m", "date": "$created_at"}}, "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}},
        ]
        monthly_volume = await db.shipments.aggregate(pipeline).to_list(None)
        return {
            "status_distribution": status_dist,
            "monthly_volume": monthly_volume,
            "total": sum(s["count"] for s in status_dist),
        }

    @staticmethod
    async def get_freight_analytics(filters: dict = None):
        db = get_database()
        query = filters or {}
        pipeline = [
            {"$match": query},
            {"$group": {"_id": None, "total_cost": {"$sum": "$total_freight_charge_paise"}, "count": {"$sum": 1}}},
        ]
        cost_result = await db.freight_quotations.aggregate(pipeline).to_list(1)
        total_cost = cost_result[0]["total_cost"] if cost_result else 0
        quote_count = cost_result[0]["count"] if cost_result else 0
        avg_cost = total_cost / quote_count if quote_count > 0 else 0
        return {
            "total_freight_expenditure_paise": total_cost,
            "average_freight_cost_paise": round(avg_cost, 2),
            "freight_cost_per_kg": 0.0,
            "average_quotation_value_paise": round(avg_cost, 2),
            "transporter_wise_cost": [],
            "route_wise_cost": [],
        }

    @staticmethod
    async def get_fleet_analytics(filters: dict = None):
        db = get_database()
        query = filters or {}
        total_vehicles = await db.vehicles.count_documents(query)
        available = await db.vehicles.count_documents({**query, "status": "AVAILABLE"})
        assigned = await db.vehicles.count_documents({**query, "status": "ASSIGNED"})
        maintenance = await db.vehicles.count_documents({**query, "status": "MAINTENANCE"})
        utilization = (assigned / total_vehicles * 100) if total_vehicles > 0 else 0.0
        return {
            "total_vehicles": total_vehicles,
            "available_vehicles": available,
            "assigned_vehicles": assigned,
            "maintenance_vehicles": maintenance,
            "total_drivers": await db.drivers.count_documents(query),
            "available_drivers": await db.drivers.count_documents({**query, "status": "AVAILABLE"}),
            "vehicle_utilization_percentage": round(utilization, 2),
        }

    @staticmethod
    async def get_quality_analytics(filters: dict = None):
        db = get_database()
        query = filters or {}
        total_dispatched = await db.shipments.count_documents({**query, "status": {"$in": ["DELIVERED", "PARTIALLY_DELIVERED"]}})
        total_alerts = await db.sensor_alerts.count_documents({"status": "ACTIVE"})
        total_readings = await db.sensor_readings.count_documents({})
        compliance = ((total_readings - total_alerts) / total_readings * 100) if total_readings > 0 else 100
        return {
            "total_dispatched_quantity_kg": total_dispatched,
            "accepted_quantity_kg": total_dispatched,
            "damaged_quantity_kg": 0,
            "rejected_quantity_kg": 0,
            "damage_rate_percentage": 0.0,
            "rejection_rate_percentage": 0.0,
            "cold_chain_compliance_percentage": round(compliance, 2),
            "temperature_excursion_count": total_alerts,
            "total_excursion_duration_hours": 0.0,
        }

    @staticmethod
    async def get_cold_chain_analytics(filters: dict = None):
        db = get_database()
        total_readings = await db.sensor_readings.count_documents({})
        normal_readings = await db.sensor_readings.count_documents({"status": "NORMAL"})
        warning_readings = await db.sensor_readings.count_documents({"status": "WARNING"})
        critical_readings = await db.sensor_readings.count_documents({"status": "CRITICAL"})
        compliance = (normal_readings / total_readings * 100) if total_readings > 0 else 100
        return {
            "total_readings": total_readings,
            "normal_readings": normal_readings,
            "warning_readings": warning_readings,
            "critical_readings": critical_readings,
            "compliance_percentage": round(compliance, 2),
            "active_alerts": await db.sensor_alerts.count_documents({"status": "ACTIVE"}),
            "resolved_alerts": await db.sensor_alerts.count_documents({"status": "RESOLVED"}),
        }
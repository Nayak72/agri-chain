from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from app.db.mongodb import get_database
from app.core.permissions import get_current_user, Role
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError
from app.core.constants import (
    UserRole, ShipmentStatus, DeliveryStatus, VehicleStatus,
    DriverStatus, AlertStatus, SensorStatus, DamageClaimStatus
)

router = APIRouter()


class DashboardMetrics(BaseModel):
    total_shipments: int
    active_shipments: int
    completed_shipments: int
    delayed_shipments: int
    cancelled_shipments: int
    average_transit_hours: float
    on_time_delivery_percentage: float


class FleetMetrics(BaseModel):
    total_vehicles: int
    available_vehicles: int
    assigned_vehicles: int
    maintenance_vehicles: int
    total_drivers: int
    available_drivers: int
    vehicle_utilization_percentage: float


class FreightMetrics(BaseModel):
    total_freight_expenditure_paise: int
    average_freight_cost_paise: int
    freight_cost_per_kg: float
    average_quotation_value_paise: int
    transporter_wise_cost: List[dict]
    route_wise_cost: List[dict]


class QualityMetrics(BaseModel):
    total_dispatched_quantity_kg: float
    accepted_quantity_kg: float
    damaged_quantity_kg: float
    rejected_quantity_kg: float
    damage_rate_percentage: float
    rejection_rate_percentage: float
    cold_chain_compliance_percentage: float
    temperature_excursion_count: int
    total_excursion_duration_hours: float


@router.get("/dashboard", response_model=DashboardMetrics)
async def get_dashboard_metrics(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if current_user["role"] == UserRole.FARMER:
        query["farmer_id"] = current_user["sub"]
    elif current_user["role"] == UserRole.BUYER:
        query["buyer_id"] = current_user["sub"]
    elif current_user["role"] == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
        if transporter:
            query["transporter_id"] = str(transporter["_id"])
    
    total = await db.shipments.count_documents(query)
    active = await db.shipments.count_documents({**query, "status": {"$in": [ShipmentStatus.IN_TRANSIT, ShipmentStatus.AT_CHECKPOINT, ShipmentStatus.OUT_FOR_DELIVERY]}})
    completed = await db.shipments.count_documents({**query, "status": ShipmentStatus.DELIVERED})
    delayed = await db.shipments.count_documents({**query, "status": ShipmentStatus.DELAYED})
    cancelled = await db.shipments.count_documents({**query, "status": ShipmentStatus.CANCELLED})
    
    pipeline = [
        {"$match": query},
        {"$group": {"_id": None, "avg_transit": {"$avg": "$actual_transit_hours"}}}
    ]
    transit_result = await db.shipments.aggregate(pipeline).to_list(1)
    avg_transit = transit_result[0]["avg_transit"] if transit_result else 0
    
    pipeline = [
        {"$match": {**query, "status": ShipmentStatus.DELIVERED}},
        {"$group": {
            "_id": None,
            "on_time": {"$sum": {"$cond": ["$is_on_time", 1, 0]}},
            "total": {"$sum": 1}
        }}
    ]
    ontime_result = await db.shipments.aggregate(pipeline).to_list(1)
    on_time_pct = 0
    if ontime_result and ontime_result[0]["total"] > 0:
        on_time_pct = (ontime_result[0]["on_time"] / ontime_result[0]["total"]) * 100
    
    return DashboardMetrics(
        total_shipments=total,
        active_shipments=active,
        completed_shipments=completed,
        delayed_shipments=delayed,
        cancelled_shipments=cancelled,
        average_transit_hours=round(avg_transit, 2),
        on_time_delivery_percentage=round(on_time_pct, 2),
    )


@router.get("/shipments")
async def get_shipment_analytics(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if current_user["role"] == UserRole.FARMER:
        query["farmer_id"] = current_user["sub"]
    elif current_user["role"] == UserRole.BUYER:
        query["buyer_id"] = current_user["sub"]
    elif current_user["role"] == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
        if transporter:
            query["transporter_id"] = str(transporter["_id"])
    
    if start_date or end_date:
        date_query = {}
        if start_date:
            date_query["$gte"] = start_date
        if end_date:
            date_query["$lte"] = end_date
        query["created_at"] = date_query
    
    pipeline = [
        {"$match": query},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    status_dist = await db.shipments.aggregate(pipeline).to_list(None)
    
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m", "date": "$created_at"}},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}},
    ]
    monthly_volume = await db.shipments.aggregate(pipeline).to_list(None)
    
    return {
        "status_distribution": status_dist,
        "monthly_volume": monthly_volume,
        "total": sum(s["count"] for s in status_dist),
    }


@router.get("/freight")
async def get_freight_analytics(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if current_user["role"] == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
        if transporter:
            query["transporter_id"] = str(transporter["_id"])
    
    # All quotations
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": None,
            "total_quoted": {"$sum": "$total_freight_charge_paise"},
            "count": {"$sum": 1},
        }}
    ]
    cost_result = await db.freight_quotations.aggregate(pipeline).to_list(1)
    
    # Accepted quotations = committed/actual freight expenditure
    accepted_pipeline = [
        {"$match": {**query, "status": "ACCEPTED"}},
        {"$group": {
            "_id": None,
            "total_accepted": {"$sum": "$total_freight_charge_paise"},
            "count": {"$sum": 1},
        }}
    ]
    accepted_result = await db.freight_quotations.aggregate(accepted_pipeline).to_list(1)
    
    pipeline = [
        {"$match": query},
        {"$group": {"_id": "$transporter_id", "total_cost": {"$sum": "$total_freight_charge_paise"}, "count": {"$sum": 1}}},
        {"$sort": {"total_cost": -1}},
    ]
    transporter_costs = await db.freight_quotations.aggregate(pipeline).to_list(None)
    
    # Route-wise costs from shipments
    route_pipeline = [
        {"$group": {
            "_id": {"origin": "$pickup_city", "dest": "$destination_city"},
            "count": {"$sum": 1},
            "total_weight": {"$sum": "$total_cargo_weight_kg"}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    route_costs = await db.shipments.aggregate(route_pipeline).to_list(None)
    
    total_quoted = cost_result[0]["total_quoted"] if cost_result else 0
    quote_count = cost_result[0]["count"] if cost_result else 0
    avg_quote = int(total_quoted / quote_count) if quote_count > 0 else 0
    
    total_expenditure = accepted_result[0]["total_accepted"] if accepted_result else 0
    accepted_count = accepted_result[0]["count"] if accepted_result else 0
    avg_freight = int(total_expenditure / accepted_count) if accepted_count > 0 else avg_quote
    
    # Delivered weight for cost per kg
    weight_res = await db.delivery_reports.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$delivered_quantity_kg"}}}
    ]).to_list(1)
    total_kg = weight_res[0]["total"] if weight_res else 0
    cost_per_kg = round((total_expenditure / 100) / total_kg, 2) if total_kg > 0 else 0.0
    
    return {
        "total_freight_expenditure_paise": total_expenditure,
        "average_freight_cost_paise": avg_freight,
        "freight_cost_per_kg": cost_per_kg,
        "average_quotation_value_paise": avg_quote,
        "transporter_wise_cost": transporter_costs,
        "route_wise_cost": [{"route": f"{r['_id']['origin']} → {r['_id']['dest']}", "shipments": r["count"], "weight_kg": r["total_weight"]} for r in route_costs if r.get("_id")],
    }


@router.get("/fleet")
async def get_fleet_analytics(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if current_user["role"] == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
        if transporter:
            query["transporter_id"] = str(transporter["_id"])
    
    total_vehicles = await db.vehicles.count_documents(query)
    available = await db.vehicles.count_documents({**query, "status": VehicleStatus.AVAILABLE})
    assigned = await db.vehicles.count_documents({**query, "status": VehicleStatus.ASSIGNED})
    maintenance = await db.vehicles.count_documents({**query, "status": VehicleStatus.MAINTENANCE})
    
    driver_query = {}
    if current_user["role"] == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
        if transporter:
            driver_query["transporter_id"] = str(transporter["_id"])
    
    total_drivers = await db.drivers.count_documents(driver_query)
    available_drivers = await db.drivers.count_documents({**driver_query, "status": DriverStatus.AVAILABLE})
    
    utilization = 0.0
    if total_vehicles > 0:
        utilization = (assigned / total_vehicles) * 100
    
    return {
        "total_vehicles": total_vehicles,
        "available_vehicles": available,
        "assigned_vehicles": assigned,
        "maintenance_vehicles": maintenance,
        "total_drivers": total_drivers,
        "available_drivers": available_drivers,
        "vehicle_utilization_percentage": round(utilization, 2),
    }


@router.get("/quality")
async def get_quality_analytics(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if current_user["role"] == UserRole.FARMER:
        query["farmer_id"] = current_user["sub"]
    
    # Calculate actual dispatched weight from shipments
    shipment_weight_pipeline = [
        {"$match": {**query, "status": {"$in": [ShipmentStatus.DELIVERED, ShipmentStatus.PARTIALLY_DELIVERED]}}},
        {"$group": {"_id": None, "total_weight": {"$sum": "$total_cargo_weight_kg"}}}
    ]
    weight_res = await db.shipments.aggregate(shipment_weight_pipeline).to_list(1)
    total_dispatched_kg = float(weight_res[0]["total_weight"]) if weight_res and weight_res[0].get("total_weight") else 0.0
    
    # Calculate delivery breakdown
    delivery_pipeline = [
        {"$group": {
            "_id": None,
            "delivered": {"$sum": "$delivered_quantity_kg"},
            "damaged": {"$sum": "$damaged_quantity_kg"},
            "missing": {"$sum": "$missing_quantity_kg"},
        }}
    ]
    delivery_result = await db.delivery_reports.aggregate(delivery_pipeline).to_list(1)
    
    if delivery_result:
        delivered_qty = float(delivery_result[0]["delivered"])
        damaged_qty = float(delivery_result[0]["damaged"])
        rejected_qty = float(delivery_result[0]["missing"])
        if total_dispatched_kg == 0.0:
            total_dispatched_kg = delivered_qty + damaged_qty + rejected_qty
        accepted_qty = delivered_qty
    else:
        damaged_qty = 0.0
        rejected_qty = 0.0
        accepted_qty = total_dispatched_kg
    
    damage_rate = (damaged_qty / total_dispatched_kg * 100) if total_dispatched_kg > 0 else 0.0
    rejection_rate = (rejected_qty / total_dispatched_kg * 100) if total_dispatched_kg > 0 else 0.0
    
    total_alerts = await db.sensor_alerts.count_documents({"status": AlertStatus.ACTIVE})
    total_readings = await db.sensor_readings.count_documents({})
    normal_readings = await db.sensor_readings.count_documents({"status": SensorStatus.NORMAL})
    compliance = (normal_readings / total_readings * 100) if total_readings > 0 else 100.0
    
    return {
        "total_dispatched_quantity_kg": round(total_dispatched_kg, 2),
        "accepted_quantity_kg": round(accepted_qty, 2),
        "damaged_quantity_kg": round(damaged_qty, 2),
        "rejected_quantity_kg": round(rejected_qty, 2),
        "damage_rate_percentage": round(damage_rate, 2),
        "rejection_rate_percentage": round(rejection_rate, 2),
        "cold_chain_compliance_percentage": round(compliance, 2),
        "temperature_excursion_count": total_alerts,
        "total_excursion_duration_hours": 0.0,
    }


@router.get("/cold-chain")
async def get_cold_chain_analytics(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    total_readings = await db.sensor_readings.count_documents({})
    normal_readings = await db.sensor_readings.count_documents({"status": SensorStatus.NORMAL})
    warning_readings = await db.sensor_readings.count_documents({"status": SensorStatus.WARNING})
    critical_readings = await db.sensor_readings.count_documents({"status": SensorStatus.CRITICAL})
    
    compliance = (normal_readings / total_readings * 100) if total_readings > 0 else 100
    
    return {
        "total_readings": total_readings,
        "normal_readings": normal_readings,
        "warning_readings": warning_readings,
        "critical_readings": critical_readings,
        "compliance_percentage": round(compliance, 2),
        "active_alerts": await db.sensor_alerts.count_documents({"status": AlertStatus.ACTIVE}),
        "resolved_alerts": await db.sensor_alerts.count_documents({"status": AlertStatus.RESOLVED}),
    }
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from app.db.mongodb import get_database
from app.core.access import shipment_scope, shipment_reference_scope
from app.core.permissions import get_current_user, Role
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError
from app.core.constants import (
    UserRole, ShipmentStatus, DeliveryStatus, VehicleStatus,
    DriverStatus, AlertStatus, SensorStatus
)

router = APIRouter()


class DashboardMetrics(BaseModel):
    total_shipments: int
    active_shipments: int
    completed_shipments: int
    delayed_shipments: int
    cancelled_shipments: int
    average_transit_hours: Optional[float]
    on_time_delivery_percentage: Optional[float]


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
    cold_chain_compliance_percentage: Optional[float] = None
    temperature_excursion_count: int
    total_excursion_duration_hours: float


class WorkspaceMetric(BaseModel):
    key: str
    label: str
    value: float
    unit: Optional[str] = None


class WorkspaceMetrics(BaseModel):
    role: UserRole
    metrics: List[WorkspaceMetric]


@router.get('/workspace', response_model=WorkspaceMetrics)
async def get_workspace_metrics(current_user: dict = Depends(get_current_user),
                                db: AsyncIOMotorDatabase = Depends(get_database)):
    """Current role's operational counts; no page-size-limited client totals."""
    role, uid = current_user['role'], current_user['sub']
    metrics = []
    def add(key, label, value, unit=None):
        metrics.append(WorkspaceMetric(key=key, label=label, value=value, unit=unit))
    if role == UserRole.ADMIN:
        add('farms', 'Registered farms', await db.farms.count_documents({}))
        add('batches', 'Harvest batches', await db.produce_batches.count_documents({}))
        add('pending_users', 'Accounts awaiting approval', await db.users.count_documents({'is_approved': False}))
        add('alerts', 'Active shipment alerts', await db.sensor_alerts.count_documents({'status': 'ACTIVE'}))
    elif role == UserRole.FARMER:
        add('farms', 'My farms', await db.farms.count_documents({'farmer_id': uid}))
        add('batches', 'My batches', await db.produce_batches.count_documents({'farmer_id': uid}))
        add('pending_orders', 'Orders awaiting my decision', await db.purchase_orders.count_documents({'seller_id': uid, 'status': 'PLACED'}))
        add('accepted_orders', 'Accepted orders', await db.purchase_orders.count_documents({'seller_id': uid, 'status': 'ACCEPTED'}))
    elif role == UserRole.BUYER:
        add('orders', 'My orders', await db.purchase_orders.count_documents({'buyer_id': uid}))
        add('pending_orders', 'Orders awaiting seller', await db.purchase_orders.count_documents({'buyer_id': uid, 'status': 'PLACED'}))
        add('accepted_orders', 'Accepted orders', await db.purchase_orders.count_documents({'buyer_id': uid, 'status': 'ACCEPTED'}))
        add('pending_deliveries', 'Awaiting my delivery decision', await db.shipments.count_documents({'buyer_id': uid, 'status': 'OUT_FOR_DELIVERY'}))
    elif role == UserRole.WAREHOUSE_MANAGER:
        warehouses = await db.warehouses.find({'manager_id': uid}, {'_id': 1}).to_list(None)
        ids = [str(warehouse['_id']) for warehouse in warehouses]
        scope = {'warehouse_id': {'$in': ids}}
        add('warehouses', 'Assigned warehouses', len(ids))
        add('stock_rows', 'Inventory lots', await db.inventory_items.count_documents(scope))
        totals = await db.inventory_items.aggregate([{'$match': scope},
            {'$group': {'_id': None, 'available': {'$sum': '$available_kg'}}}]).to_list(1)
        add('available_stock', 'Available stock', totals[0]['available'] if totals else 0, 'kg')
        add('receipts', 'Recorded receipts', await db.warehouse_receipts.count_documents(scope))
    elif role == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({'user_id': uid}, {'_id': 1})
        scope = {'transporter_id': str(transporter['_id'])} if transporter else {'_id': {'$in': []}}
        add('available_vehicles', 'Available vehicles', await db.vehicles.count_documents({**scope, 'status': 'AVAILABLE'}))
        add('assigned_vehicles', 'Assigned vehicles', await db.vehicles.count_documents({**scope, 'status': 'ASSIGNED'}))
        add('available_drivers', 'Available drivers', await db.drivers.count_documents({**scope, 'status': 'AVAILABLE'}))
        add('quotes', 'My submitted quotations', await db.freight_quotations.count_documents({**scope, 'status': 'SUBMITTED'}))
    elif role == UserRole.DRIVER:
        scope = await shipment_scope(db, current_user)
        add('assigned', 'My assigned shipments', await db.shipments.count_documents(scope))
        add('awaiting_load', 'Awaiting loading', await db.shipments.count_documents({**scope, 'status': 'DRIVER_ASSIGNED'}))
        add('in_transit', 'In transit', await db.shipments.count_documents({**scope, 'status': 'IN_TRANSIT'}))
        related = await shipment_reference_scope(db, current_user)
        add('alerts', 'Active shipment alerts', await db.sensor_alerts.count_documents({**related, 'status': 'ACTIVE'}))
    else:
        raise ForbiddenError('No workspace available for this role')
    return WorkspaceMetrics(role=role, metrics=metrics)


@router.get("/dashboard", response_model=DashboardMetrics)
async def get_dashboard_metrics(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = await shipment_scope(db, current_user)

    total = await db.shipments.count_documents(query)
    active_states = [ShipmentStatus.DRIVER_ASSIGNED, ShipmentStatus.LOADED, ShipmentStatus.DISPATCHED,
                     ShipmentStatus.IN_TRANSIT, ShipmentStatus.ARRIVED_AT_DESTINATION, ShipmentStatus.OUT_FOR_DELIVERY]
    completed_states = [ShipmentStatus.DELIVERED, ShipmentStatus.PARTIALLY_DELIVERED, ShipmentStatus.DELIVERY_REJECTED]
    active = await db.shipments.count_documents({**query, "status": {"$in": active_states}})
    completed = await db.shipments.count_documents({**query, "status": {"$in": completed_states}})
    delayed = await db.shipments.count_documents({**query, "status": {"$in": active_states},
        "actual_arrival_time": None, "expected_arrival_time": {"$type": "date", "$lt": datetime.now(timezone.utc)}})
    cancelled = await db.shipments.count_documents({**query, "status": ShipmentStatus.CANCELLED})
    
    pipeline = [
        {"$match": {**query, "actual_dispatch_time": {"$type": "date"}, "actual_arrival_time": {"$type": "date"}}},
        {"$group": {"_id": None, "avg_transit": {"$avg": {"$divide": [
            {"$subtract": ["$actual_arrival_time", "$actual_dispatch_time"]}, 3600000]}}}}
    ]
    transit_result = await db.shipments.aggregate(pipeline).to_list(1)
    avg_transit = transit_result[0].get("avg_transit") if transit_result else None
    
    pipeline = [
        {"$match": {**query, "status": ShipmentStatus.DELIVERED,
                    "actual_arrival_time": {"$type": "date"}, "expected_arrival_time": {"$type": "date"}}},
        {"$group": {
            "_id": None,
            "on_time": {"$sum": {"$cond": [{"$and": [
                {"$ne": [{"$ifNull": ["$actual_arrival_time", None]}, None]},
                {"$ne": [{"$ifNull": ["$expected_arrival_time", None]}, None]},
                {"$lte": ["$actual_arrival_time", "$expected_arrival_time"]}]}, 1, 0]}},
            "total": {"$sum": 1}
        }}
    ]
    ontime_result = await db.shipments.aggregate(pipeline).to_list(1)
    on_time_pct = None
    if ontime_result and ontime_result[0]["total"] > 0:
        on_time_pct = (ontime_result[0]["on_time"] / ontime_result[0]["total"]) * 100
    
    return DashboardMetrics(
        total_shipments=total,
        active_shipments=active,
        completed_shipments=completed,
        delayed_shipments=delayed,
        cancelled_shipments=cancelled,
        average_transit_hours=round(avg_transit, 2) if avg_transit is not None else None,
        on_time_delivery_percentage=round(on_time_pct, 2) if on_time_pct is not None else None,
    )


@router.get("/shipments")
async def get_shipment_analytics(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = await shipment_scope(db, current_user)

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
    role = current_user["role"]
    if role == UserRole.ADMIN:
        query = {}
    elif role == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
        query = {"transporter_id": str(transporter["_id"])} if transporter else {"_id": {"$in": []}}
    elif role in (UserRole.BUYER, UserRole.FARMER):
        field = "buyer_id" if role == UserRole.BUYER else "seller_id"
        bookings = await db.freight_bookings.find({field: current_user["sub"]}, {"_id": 1}).to_list(None)
        query = {"booking_id": {"$in": [str(booking["_id"]) for booking in bookings]}}
    else:
        raise ForbiddenError("Not authorized to view freight analytics")
    shipment_query = await shipment_scope(db, current_user)
    related_query = await shipment_reference_scope(db, current_user)

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
        {"$match": shipment_query},
        {"$group": {
            "_id": {"origin": "$pickup_city", "dest": "$destination_city"},
            "count": {"$sum": 1},
            "total_weight": {"$sum": "$cargo_quantity_kg"}
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
        {"$match": related_query},
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
    if current_user["role"] not in [UserRole.ADMIN, UserRole.TRANSPORTER]:
        raise ForbiddenError("Not authorized to view fleet analytics")
    query = {}
    if current_user["role"] == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
        if transporter:
            query["transporter_id"] = str(transporter["_id"])
        else:
            query["transporter_id"] = {"$in": []}
    
    total_vehicles = await db.vehicles.count_documents(query)
    available = await db.vehicles.count_documents({**query, "status": VehicleStatus.AVAILABLE})
    assigned = await db.vehicles.count_documents({**query, "status": VehicleStatus.ASSIGNED})
    maintenance = await db.vehicles.count_documents({**query, "status": VehicleStatus.MAINTENANCE})
    
    driver_query = dict(query)
    
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
    query = await shipment_scope(db, current_user)
    related_query = await shipment_reference_scope(db, current_user)

    # Calculate actual dispatched weight from shipments
    shipment_weight_pipeline = [
        {"$match": {**query, "status": {"$in": [ShipmentStatus.DELIVERED, ShipmentStatus.PARTIALLY_DELIVERED]}}},
        {"$group": {"_id": None, "total_weight": {"$sum": {"$ifNull": ["$loaded_weight_kg", 0]}}}}
    ]
    weight_res = await db.shipments.aggregate(shipment_weight_pipeline).to_list(1)
    total_dispatched_kg = float(weight_res[0]["total_weight"]) if weight_res and weight_res[0].get("total_weight") else 0.0
    
    # Calculate delivery breakdown
    delivery_pipeline = [
        {"$match": related_query},
        {"$group": {
            "_id": None,
            "delivered": {"$sum": "$delivered_quantity_kg"},
            "damaged": {"$sum": "$damaged_quantity_kg"},
            "missing": {"$sum": {"$cond": [{"$eq": ["$status", "REJECTED"]}, 0, "$missing_quantity_kg"]}},
            "rejected": {"$sum": {"$cond": [{"$eq": ["$status", "REJECTED"]}, "$missing_quantity_kg", 0]}},
        }}
    ]
    delivery_result = await db.delivery_reports.aggregate(delivery_pipeline).to_list(1)
    
    if delivery_result:
        delivered_qty = float(delivery_result[0]["delivered"])
        damaged_qty = float(delivery_result[0]["damaged"])
        missing_qty = float(delivery_result[0]["missing"])
        rejected_qty = float(delivery_result[0].get("rejected", 0))
        if total_dispatched_kg == 0.0:
            total_dispatched_kg = delivered_qty + damaged_qty + missing_qty + rejected_qty
        accepted_qty = delivered_qty
    else:
        damaged_qty = 0.0
        missing_qty = 0.0
        rejected_qty = 0.0
        accepted_qty = 0.0
    
    damage_rate = (damaged_qty / total_dispatched_kg * 100) if total_dispatched_kg > 0 else 0.0
    rejection_rate = (rejected_qty / total_dispatched_kg * 100) if total_dispatched_kg > 0 else 0.0
    
    total_alerts = await db.sensor_alerts.count_documents({**related_query, "status": AlertStatus.ACTIVE})
    total_readings = await db.sensor_readings.count_documents(related_query)
    normal_readings = await db.sensor_readings.count_documents({**related_query, "status": SensorStatus.NORMAL})
    compliance = (normal_readings / total_readings * 100) if total_readings > 0 else None
    
    duration_result = await db.sensor_alerts.aggregate([
        {"$match": {**related_query, "alert_type": "TEMPERATURE", "created_at": {"$type": "date"}}},
        {"$group": {"_id": None, "milliseconds": {"$sum": {"$max": [0, {"$subtract": [
            {"$ifNull": ["$resolved_at", datetime.now(timezone.utc)]}, "$created_at"]}]}}}}
    ]).to_list(1)
    duration_hours = (duration_result[0].get("milliseconds", 0) / 3_600_000) if duration_result else 0.0
    return {
        "total_dispatched_quantity_kg": round(total_dispatched_kg, 2),
        "accepted_quantity_kg": round(accepted_qty, 2),
        "damaged_quantity_kg": round(damaged_qty, 2),
        "rejected_quantity_kg": round(rejected_qty, 2),
        "missing_quantity_kg": round(missing_qty, 2),
        "damage_rate_percentage": round(damage_rate, 2),
        "rejection_rate_percentage": round(rejection_rate, 2),
        "cold_chain_compliance_percentage": round(compliance, 2) if compliance is not None else None,
        "temperature_excursion_count": total_alerts,
        "total_excursion_duration_hours": round(duration_hours, 2),
    }


@router.get("/cold-chain")
async def get_cold_chain_analytics(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    related_query = await shipment_reference_scope(db, current_user)
    total_readings = await db.sensor_readings.count_documents(related_query)
    normal_readings = await db.sensor_readings.count_documents({**related_query, "status": SensorStatus.NORMAL})
    critical_readings = await db.sensor_readings.count_documents({**related_query, "status": SensorStatus.CRITICAL})
    
    compliance = (normal_readings / total_readings * 100) if total_readings > 0 else None
    
    return {
        "total_readings": total_readings,
        "normal_readings": normal_readings,
        "critical_readings": critical_readings,
        "compliance_percentage": round(compliance, 2) if compliance is not None else None,
        "active_alerts": await db.sensor_alerts.count_documents({**related_query, "status": AlertStatus.ACTIVE}),
        "resolved_alerts": await db.sensor_alerts.count_documents({**related_query, "status": AlertStatus.RESOLVED}),
    }

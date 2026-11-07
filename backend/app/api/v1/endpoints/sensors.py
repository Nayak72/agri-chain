from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
from app.db.mongodb import get_database
from app.core.permissions import get_current_user, Role
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError
from app.core.constants import (
    UserRole, SensorStatus, AlertSeverity, AlertStatus,
    SensorScenario, PRODUCE_HANDLING_PROFILES
)
from app.services.ledger_service import append_ledger_block
from app.core.constants import LedgerEventType
from app.db.transaction import transaction_session
from app.services.sensor_simulator import simulator_manager
import uuid

router = APIRouter()


class SensorSessionCreate(BaseModel):
    shipment_id: Optional[str] = None
    scenario: SensorScenario = SensorScenario.NORMAL
    interval_seconds: int = Field(30, ge=5, le=3600)


class SensorSessionResponse(BaseModel):
    id: str
    session_id: str
    shipment_id: str
    scenario: SensorScenario
    interval_seconds: int
    status: str
    reading_count: int
    latest_reading: Optional[dict]
    created_at: datetime
    updated_at: datetime


@router.post("/shipments/{shipment_id}/simulation/start", response_model=SensorSessionResponse)
async def start_simulation_endpoint(
    shipment_id: str,
    session_data: SensorSessionCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.TRANSPORTER, UserRole.ADMIN, UserRole.DRIVER]:
        raise ForbiddenError("Only transporter, admin, or driver can start simulation")
    
    if not ObjectId.is_valid(shipment_id):
        raise ValidationError("Invalid shipment ID")
    
    shipment = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
    if not shipment:
        raise NotFoundError("Shipment", shipment_id)
    
    if current_user["role"] == UserRole.DRIVER and shipment["driver_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized")
    if current_user["role"] == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
        if not transporter or shipment["transporter_id"] != str(transporter["_id"]):
            raise ForbiddenError("Not authorized")
    
    existing_session = await db.sensor_sessions.find_one({"shipment_id": shipment_id})
    if existing_session and existing_session.get("status") == "RUNNING":
        raise ValidationError("Simulation already running for this shipment")
    
    session_id = f"SS-{uuid.uuid4().hex[:8].upper()}"
    
    session_doc = {
        "session_id": session_id,
        "shipment_id": shipment_id,
        "scenario": session_data.scenario,
        "interval_seconds": session_data.interval_seconds,
        "status": "RUNNING",
        "reading_count": 0,
        "created_by": current_user["sub"],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    
    result = await db.sensor_sessions.insert_one(session_doc)
    session_doc["_id"] = result.inserted_id
    
    # Try resolving produce type from shipment
    produce_type = "TOMATO"
    if shipment.get("batch_ids") and len(shipment["batch_ids"]) > 0:
        first_b = shipment["batch_ids"][0]
        batch_q = {"_id": ObjectId(first_b)} if ObjectId.is_valid(first_b) else {"batch_id": first_b}
        batch = await db.produce_batches.find_one(batch_q)
        if batch and batch.get("produce_type"):
            produce_type = batch["produce_type"]
    
    await simulator_manager.start_simulation(
        session_id=session_id,
        shipment_id=shipment_id,
        scenario=session_data.scenario,
        interval_seconds=session_data.interval_seconds,
        db=db,
        produce_type=produce_type
    )
    
    return SensorSessionResponse(
        id=str(session_doc["_id"]),
        session_id=session_id,
        shipment_id=shipment_id,
        scenario=session_data.scenario,
        interval_seconds=session_data.interval_seconds,
        status="RUNNING",
        reading_count=0,
        latest_reading=None,
        created_at=session_doc["created_at"],
        updated_at=session_doc["updated_at"],
    )


@router.post("/shipments/{shipment_id}/simulation/pause")
async def pause_simulation_endpoint(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    result = simulator_manager.pause_simulation(shipment_id)
    if not result:
        raise NotFoundError("Simulation session", shipment_id)
    await db.sensor_sessions.update_one(
        {"shipment_id": shipment_id},
        {"$set": {"status": "PAUSED", "updated_at": datetime.now(timezone.utc)}}
    )
    return {"message": "Simulation paused"}


@router.post("/shipments/{shipment_id}/simulation/resume")
async def resume_simulation_endpoint(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    result = simulator_manager.resume_simulation(shipment_id)
    if not result:
        raise NotFoundError("Simulation session", shipment_id)
    await db.sensor_sessions.update_one(
        {"shipment_id": shipment_id},
        {"$set": {"status": "RUNNING", "updated_at": datetime.now(timezone.utc)}}
    )
    return {"message": "Simulation resumed"}


@router.post("/shipments/{shipment_id}/simulation/stop")
async def stop_simulation_endpoint(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    result = simulator_manager.stop_simulation(shipment_id)
    if not result:
        raise NotFoundError("Simulation session", shipment_id)
    await db.sensor_sessions.update_one(
        {"shipment_id": shipment_id},
        {"$set": {"status": "STOPPED", "updated_at": datetime.now(timezone.utc)}}
    )
    return {"message": "Simulation stopped"}


@router.post("/shipments/{shipment_id}/simulation/next-reading")
async def next_reading_endpoint(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    reading = simulator_manager.get_next_reading(shipment_id)
    if not reading:
        raise NotFoundError("Simulation session", shipment_id)
    
    reading_doc = {
        "reading_id": f"SR-{uuid.uuid4().hex[:8].upper()}",
        "session_id": reading["session_id"],
        "shipment_id": shipment_id,
        "simulated_device_id": reading["device_id"],
        "temperature": reading["temperature"],
        "humidity": reading["humidity"],
        "timestamp": reading["timestamp"],
        "source": "SIMULATOR",
        "is_simulated": True,
        "configured_temp_min": reading["configured_temp_min"],
        "configured_temp_max": reading["configured_temp_max"],
        "configured_humidity_min": reading["configured_humidity_min"],
        "configured_humidity_max": reading["configured_humidity_max"],
        "status": reading["status"],
        "created_at": datetime.now(timezone.utc),
    }
    
    await db.sensor_readings.insert_one(reading_doc)
    
    return {
        "reading_id": reading_doc["reading_id"],
        "temperature": reading["temperature"],
        "humidity": reading["humidity"],
        "status": reading["status"],
        "timestamp": reading["timestamp"],
        "is_simulated": True,
        "simulated": True,
    }


@router.post("/shipments/{shipment_id}/simulation/reset")
async def reset_simulation_endpoint(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    simulator_manager.stop_simulation(shipment_id)
    simulator_manager.remove_session(shipment_id)
    await db.sensor_readings.delete_many({"shipment_id": shipment_id})
    await db.sensor_sessions.delete_many({"shipment_id": shipment_id})
    return {"message": "Simulation reset"}


class SensorReadingResponse(BaseModel):
    id: str
    reading_id: str
    session_id: str
    shipment_id: str
    simulated_device_id: str
    temperature: float
    humidity: float
    timestamp: datetime
    source: str
    is_simulated: bool
    configured_temp_min: Optional[float]
    configured_temp_max: Optional[float]
    configured_humidity_min: Optional[float]
    configured_humidity_max: Optional[float]
    status: SensorStatus


@router.get("/shipments/{shipment_id}/sensor-readings", response_model=List[SensorReadingResponse])
async def get_sensor_readings(
    shipment_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(shipment_id):
        raise ValidationError("Invalid shipment ID")
    
    shipment = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
    if not shipment:
        raise NotFoundError("Shipment", shipment_id)
    
    if current_user["role"] == UserRole.FARMER and shipment["farmer_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized")
    if current_user["role"] == UserRole.BUYER and shipment["buyer_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized")
    if current_user["role"] == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
        if not transporter or shipment["transporter_id"] != str(transporter["_id"]):
            raise ForbiddenError("Not authorized")
    if current_user["role"] == UserRole.DRIVER and shipment["driver_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized")
    
    readings = await db.sensor_readings.find({"shipment_id": shipment_id}).sort("timestamp", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [SensorReadingResponse(id=str(r["_id"]), **r) for r in readings]


@router.get("/shipments/{shipment_id}/sensor-alerts")
async def get_sensor_alerts(
    shipment_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[AlertStatus] = None,
    severity: Optional[AlertSeverity] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(shipment_id):
        raise ValidationError("Invalid shipment ID")
    
    shipment = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
    if not shipment:
        raise NotFoundError("Shipment", shipment_id)
    
    if current_user["role"] == UserRole.FARMER and shipment["farmer_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized")
    if current_user["role"] == UserRole.BUYER and shipment["buyer_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized")
    if current_user["role"] == UserRole.TRANSPORTER:
        transporter = await db.transporters.find_one({"user_id": current_user["sub"]})
        if not transporter or shipment["transporter_id"] != str(transporter["_id"]):
            raise ForbiddenError("Not authorized")
    if current_user["role"] == UserRole.DRIVER and shipment["driver_id"] != current_user["sub"]:
        raise ForbiddenError("Not authorized")
    
    query = {"shipment_id": shipment_id}
    if status:
        query["status"] = status
    if severity:
        query["severity"] = severity
    
    alerts = await db.sensor_alerts.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return alerts


class AlertAcknowledge(BaseModel):
    corrective_action: Optional[str] = None


class AlertResolve(BaseModel):
    corrective_action: Optional[str] = None


@router.post("/sensor-alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    alert_data: AlertAcknowledge,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(alert_id):
        raise ValidationError("Invalid alert ID")
    
    alert = await db.sensor_alerts.find_one({"_id": ObjectId(alert_id)})
    if not alert:
        raise NotFoundError("Alert", alert_id)
    
    if alert["status"] != AlertStatus.ACTIVE:
        raise ValidationError(f"Alert is already {alert['status']}")
    
    await db.sensor_alerts.update_one(
        {"_id": ObjectId(alert_id)},
        {"$set": {
            "status": AlertStatus.ACKNOWLEDGED,
            "acknowledged_by": current_user["sub"],
            "acknowledged_at": datetime.now(timezone.utc),
            "corrective_action": alert_data.corrective_action,
            "updated_at": datetime.now(timezone.utc),
        }}
    )
    
    return {"message": "Alert acknowledged"}


@router.post("/sensor-alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    alert_data: AlertResolve,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(alert_id):
        raise ValidationError("Invalid alert ID")
    
    alert = await db.sensor_alerts.find_one({"_id": ObjectId(alert_id)})
    if not alert:
        raise NotFoundError("Alert", alert_id)
    
    if alert["status"] == AlertStatus.RESOLVED:
        raise ValidationError("Alert is already resolved")
    
    await db.sensor_alerts.update_one(
        {"_id": ObjectId(alert_id)},
        {"$set": {
            "status": AlertStatus.RESOLVED,
            "resolved_by": current_user["sub"],
            "resolved_at": datetime.now(timezone.utc),
            "corrective_action": alert_data.corrective_action or alert.get("corrective_action"),
            "updated_at": datetime.now(timezone.utc),
        }}
    )
    
    return {"message": "Alert resolved"}
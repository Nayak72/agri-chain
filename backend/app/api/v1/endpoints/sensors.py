import uuid
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, ConfigDict
from bson import ObjectId

from app.db.mongodb import get_database
from app.core.permissions import get_current_user, get_current_admin_user
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError, ConflictError
from app.core.constants import (
    UserRole, SensorStatus, AlertSeverity, AlertStatus,
    SensorScenario, PRODUCE_HANDLING_PROFILES, ShipmentStatus
)
from app.services.ledger_service import append_ledger_block
from app.core.constants import LedgerEventType
from app.db.unit_of_work import uow
from app.services.sensor_simulator import simulator_manager
from app.utils.serialization import to_response
from app.utils.mongo import to_mongo, resolve_doc
from app.core.access import assert_can_view_shipment

router = APIRouter()


class SensorSessionCreate(BaseModel):
    shipment_id: Optional[str] = None
    scenario: SensorScenario = SensorScenario.NORMAL
    interval_seconds: int = Field(30, ge=5, le=3600)
    model_config = ConfigDict(extra="forbid")


class SensorSessionResponse(BaseModel):
    id: str
    session_id: str
    shipment_id: str
    scenario: SensorScenario
    interval_seconds: int
    status: str
    reading_count: int = 0
    latest_reading: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SensorReadingResponse(BaseModel):
    id: str
    reading_id: str
    session_id: str
    shipment_id: str
    simulated_device_id: Optional[str] = None
    temperature: float
    humidity: float
    timestamp: datetime
    source: str = "SIMULATOR"
    is_simulated: bool = True
    configured_temp_min: Optional[float] = None
    configured_temp_max: Optional[float] = None
    configured_humidity_min: Optional[float] = None
    configured_humidity_max: Optional[float] = None
    status: str


class SensorAlertResponse(BaseModel):
    id: str
    alert_id: str
    shipment_id: str
    reading_id: Optional[str] = None
    alert_type: str
    severity: str
    observed_value: float
    configured_min: Optional[float] = None
    configured_max: Optional[float] = None
    status: str
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    corrective_action: Optional[str] = None
    created_at: Optional[datetime] = None


class AlertAcknowledge(BaseModel):
    corrective_action: Optional[str] = Field(None, max_length=1000)
    model_config = ConfigDict(extra="forbid")


class AlertResolve(BaseModel):
    corrective_action: Optional[str] = Field(None, max_length=1000)
    model_config = ConfigDict(extra="forbid")


@router.post("/shipments/{shipment_id}/simulation/start", response_model=SensorSessionResponse)
async def start_simulation_endpoint(
    shipment_id: str,
    session_data: SensorSessionCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.TRANSPORTER, UserRole.ADMIN, UserRole.DRIVER]:
        raise ForbiddenError("Only transporter, admin, or driver can start simulation")
    
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)
    
    cur_status = shipment.get("status")
    if hasattr(cur_status, "value"):
        cur_status = cur_status.value

    # SN-07: Restrict simulation to active shipments only
    terminal_statuses = ["DELIVERED", "PARTIALLY_DELIVERED", "DELIVERY_FAILED", "DELIVERY_REJECTED", "CANCELLED"]
    if cur_status in terminal_statuses:
        raise ValidationError(f"Cannot start sensor simulation on shipment in terminal status {cur_status}")
    
    canonical_shipment_id = str(shipment["_id"])
    now = datetime.now(timezone.utc)

    # SN-04: Upsert/reuse existing sensor session instead of inserting duplicate
    existing_session = await db.sensor_sessions.find_one({"shipment_id": canonical_shipment_id})
    if existing_session and existing_session.get("status") == "RUNNING":
        # Already running: return existing session
        return to_response(SensorSessionResponse, existing_session)
    
    session_id = existing_session.get("session_id") if existing_session else f"SS-{uuid.uuid4().hex[:8].upper()}"
    scenario_val = session_data.scenario.value if hasattr(session_data.scenario, "value") else str(session_data.scenario)

    session_doc = {
        "session_id": session_id,
        "shipment_id": canonical_shipment_id,
        "scenario": scenario_val,
        "interval_seconds": session_data.interval_seconds,
        "status": "RUNNING",
        "reading_count": existing_session.get("reading_count", 0) if existing_session else 0,
        "created_by": current_user["sub"],
        "updated_at": now,
    }
    if not existing_session:
        session_doc["created_at"] = now
        res = await db.sensor_sessions.insert_one(to_mongo(session_doc))
        session_doc["_id"] = res.inserted_id
    else:
        session_doc["_id"] = existing_session["_id"]
        session_doc["created_at"] = existing_session.get("created_at", now)
        await db.sensor_sessions.update_one({"_id": existing_session["_id"]}, {"$set": to_mongo(session_doc)})
    
    # Try resolving produce type from shipment batches
    produce_type = "TOMATO"
    if shipment.get("batch_ids") and len(shipment["batch_ids"]) > 0:
        first_b = shipment["batch_ids"][0]
        batch = await resolve_doc(db.produce_batches, first_b, "Batch", business_key="batch_id")
        if batch and batch.get("produce_type"):
            produce_type = batch["produce_type"]
    
    await simulator_manager.start_simulation(
        session_id=session_id,
        shipment_id=canonical_shipment_id,
        scenario=session_data.scenario,
        interval_seconds=session_data.interval_seconds,
        db=db,
        produce_type=produce_type
    )
    
    return to_response(SensorSessionResponse, session_doc)


@router.post("/shipments/{shipment_id}/simulation/pause")
async def pause_simulation_endpoint(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)
    
    canonical_id = str(shipment["_id"])
    result = simulator_manager.pause_simulation(canonical_id)
    now = datetime.now(timezone.utc)
    await db.sensor_sessions.update_one(
        {"shipment_id": canonical_id},
        {"$set": {"status": "PAUSED", "updated_at": now}}
    )
    return {"message": "Simulation paused"}


@router.post("/shipments/{shipment_id}/simulation/resume")
async def resume_simulation_endpoint(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)
    
    canonical_id = str(shipment["_id"])
    result = simulator_manager.resume_simulation(canonical_id)
    now = datetime.now(timezone.utc)
    await db.sensor_sessions.update_one(
        {"shipment_id": canonical_id},
        {"$set": {"status": "RUNNING", "updated_at": now}}
    )
    return {"message": "Simulation resumed"}


@router.post("/shipments/{shipment_id}/simulation/stop")
async def stop_simulation_endpoint(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)
    
    canonical_id = str(shipment["_id"])
    simulator_manager.stop_simulation(canonical_id)
    now = datetime.now(timezone.utc)
    await db.sensor_sessions.update_one(
        {"shipment_id": canonical_id},
        {"$set": {"status": "STOPPED", "ended_at": now, "updated_at": now}}
    )
    return {"message": "Simulation stopped"}


@router.post("/shipments/{shipment_id}/simulation/next-reading")
async def next_reading_endpoint(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)
    
    canonical_id = str(shipment["_id"])
    reading = simulator_manager.get_next_reading(canonical_id)
    if not reading:
        raise NotFoundError("Active simulation session for shipment", shipment_id)
    
    reading_doc = {
        "reading_id": f"SR-{uuid.uuid4().hex[:8].upper()}",
        "session_id": reading["session_id"],
        "shipment_id": canonical_id,
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
    current_user: dict = Depends(get_current_admin_user),  # A-08: Admin only
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    canonical_id = str(shipment["_id"])
    
    simulator_manager.stop_simulation(canonical_id)
    simulator_manager.remove_session(canonical_id)
    await db.sensor_readings.delete_many({"shipment_id": canonical_id})
    await db.sensor_sessions.delete_many({"shipment_id": canonical_id})
    await db.sensor_alerts.delete_many({"shipment_id": canonical_id})
    return {"message": "Simulation reset"}


@router.get("/shipments/{shipment_id}/sensor-readings", response_model=List[SensorReadingResponse])
async def get_sensor_readings(
    shipment_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)
    
    canonical_id = str(shipment["_id"])
    readings = await db.sensor_readings.find(
        {"$or": [{"shipment_id": canonical_id}, {"shipment_id": shipment.get("shipment_id")}]}
    ).sort("timestamp", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    
    return [to_response(SensorReadingResponse, r) for r in readings]


@router.get("/shipments/{shipment_id}/sensor-alerts", response_model=List[SensorAlertResponse])
async def get_sensor_alerts(
    shipment_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[AlertStatus] = None,
    severity: Optional[AlertSeverity] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)
    
    canonical_id = str(shipment["_id"])
    query = {"$or": [{"shipment_id": canonical_id}, {"shipment_id": shipment.get("shipment_id")}]}
    if status:
        query["status"] = status.value if hasattr(status, "value") else str(status)
    if severity:
        query["severity"] = severity.value if hasattr(severity, "value") else str(severity)
    
    alerts = await db.sensor_alerts.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [to_response(SensorAlertResponse, a) for a in alerts]


@router.post("/sensor-alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    alert_data: AlertAcknowledge,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    alert = await resolve_doc(db.sensor_alerts, alert_id, "Alert", business_key="alert_id")
    
    if alert.get("status") != AlertStatus.ACTIVE.value and alert.get("status") != "ACTIVE":
        raise ValidationError(f"Alert is already {alert.get('status')}")
    
    now = datetime.now(timezone.utc)
    await db.sensor_alerts.update_one(
        {"_id": alert["_id"]},
        {"$set": {
            "status": AlertStatus.ACKNOWLEDGED.value,
            "acknowledged_by": current_user["sub"],
            "acknowledged_at": now,
            "corrective_action": alert_data.corrective_action,
            "updated_at": now,
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
    alert = await resolve_doc(db.sensor_alerts, alert_id, "Alert", business_key="alert_id")
    
    if alert.get("status") == AlertStatus.RESOLVED.value or alert.get("status") == "RESOLVED":
        raise ValidationError("Alert is already resolved")
    
    now = datetime.now(timezone.utc)
    await db.sensor_alerts.update_one(
        {"_id": alert["_id"]},
        {"$set": {
            "status": AlertStatus.RESOLVED.value,
            "resolved_by": current_user["sub"],
            "resolved_at": now,
            "corrective_action": alert_data.corrective_action or alert.get("corrective_action"),
            "updated_at": now,
        }}
    )
    
    return {"message": "Alert resolved"}

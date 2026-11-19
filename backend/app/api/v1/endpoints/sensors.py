import uuid
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, ConfigDict
from bson import ObjectId

from app.db.mongodb import get_database
from app.core.permissions import get_current_user, enforce_permission
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError, ConflictError
from app.core.constants import (
    UserRole, AlertSeverity, AlertStatus,
    SensorScenario, PRODUCE_HANDLING_PROFILES, ShipmentStatus
)
from app.services.ledger_service import append_ledger_block
from app.core.constants import LedgerEventType
from app.db.unit_of_work import run_in_txn
from app.services.sensor_simulator import generate_stateless_reading, classify_reading
from app.utils.serialization import to_response
from app.utils.mongo import to_mongo, resolve_doc
from app.core.access import assert_can_view_shipment

router = APIRouter()


class SensorReadingResponse(BaseModel):
    id: str
    reading_id: str
    shipment_id: str
    simulation_id: Optional[str] = None
    scenario: Optional[str] = None
    sequence: Optional[int] = None
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
    simulation_id: Optional[str] = None
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


class AlertResolve(BaseModel):
    corrective_action: str
    model_config = ConfigDict(extra="forbid")


class ReadingRequest(BaseModel):
    scenario: SensorScenario = SensorScenario.NORMAL
    session_id: Optional[str] = None
    model_config = ConfigDict(extra="forbid")


class SimulationStart(BaseModel):
    scenario: SensorScenario = SensorScenario.NORMAL
    seed: str = Field(default="agrichain", min_length=1, max_length=100)
    interval_seconds: int = Field(default=60, ge=1, le=3600)
    playback_speed: float = Field(default=1.0, ge=0.1, le=60, allow_inf_nan=False)
    model_config = ConfigDict(extra="forbid")


async def _simulation_shipment(db, shipment_id, user):
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, user, shipment)
    enforce_permission(user, "sensors:simulate")
    return shipment


@router.post("/shipments/{shipment_id}/simulation/sessions")
async def start_simulation(shipment_id: str, data: SimulationStart,
                           current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_database)):
    shipment = await _simulation_shipment(db, shipment_id, current_user)
    now = datetime.now(timezone.utc)
    async def transaction(session):
        # A shared shipment write serializes creation with other sessions and state changes.
        claimed = await db.shipments.update_one({"_id": shipment["_id"], "status": "IN_TRANSIT"},
                                                 {"$set": {"updated_at": now}}, session=session)
        if not claimed.matched_count:
            raise ConflictError("Simulations can only run in transit")
        active = await db.simulation_sessions.find_one({"shipment_id": str(shipment["_id"]),
                                                          "state": {"$in": ["RUNNING", "PAUSED"]}}, session=session)
        if active:
            raise ConflictError("Stop the existing simulation before starting another")
        doc = {"simulation_id": f"SIM-{uuid.uuid4().hex.upper()}", "shipment_id": str(shipment["_id"]),
               "scenario": data.scenario.value, "seed": data.seed, "sequence": 0, "state": "RUNNING",
               "interval_seconds": data.interval_seconds, "simulated_elapsed_seconds": 0,
               "playback_speed": data.playback_speed, "auto_play": False,
               "created_by": current_user["sub"], "started_at": now, "created_at": now, "updated_at": now}
        await db.simulation_sessions.insert_one(doc, session=session)
        return {key: value for key, value in doc.items() if key != "_id"}
    return await run_in_txn(transaction)


@router.get("/shipments/{shipment_id}/simulation/sessions")
async def list_simulation_sessions(shipment_id: str, current_user: dict = Depends(get_current_user),
                                   db: AsyncIOMotorDatabase = Depends(get_database)):
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)
    sessions = await db.simulation_sessions.find({"shipment_id": str(shipment["_id"])}).sort("created_at", -1).limit(50).to_list(50)
    return [{key: value for key, value in item.items() if key != "_id"} for item in sessions]


@router.post("/shipments/{shipment_id}/simulation/sessions/{simulation_id}/{action}")
async def control_simulation(shipment_id: str, simulation_id: str, action: str,
                             current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_database)):
    shipment = await _simulation_shipment(db, shipment_id, current_user)
    transitions = {"pause": ("RUNNING", "PAUSED"), "resume": ("PAUSED", "RUNNING"),
                   "stop": (("RUNNING", "PAUSED"), "STOPPED"),
                   "auto-start": ("RUNNING", "RUNNING"), "auto-stop": (("RUNNING", "PAUSED"), None)}
    if action not in transitions:
        raise ValidationError("Unknown simulation control")
    expected, target = transitions[action]
    expected_states = list(expected) if isinstance(expected, tuple) else [expected]
    now = datetime.now(timezone.utc)
    async def transaction(session):
        claimed = await db.shipments.update_one({"_id": shipment["_id"], "status": "IN_TRANSIT"},
                                                 {"$set": {"updated_at": now}}, session=session)
        if not claimed.matched_count:
            raise ConflictError("Simulation controls require an in-transit shipment")
        fields = {"updated_at": now}
        if target is not None:
            fields["state"] = target
        if action == "auto-start":
            fields.update(auto_play=True, auto_next_at=now, auto_lease_owner=None, auto_lease_until=None, auto_error=None)
        elif action in ("auto-stop", "stop"):
            fields.update(auto_play=False, auto_lease_owner=None, auto_lease_until=None)
        elif action == "resume":
            fields.update(auto_next_at=now, auto_lease_owner=None, auto_lease_until=None)
        elif action == "pause":
            fields.update(auto_lease_owner=None, auto_lease_until=None)
        result = await db.simulation_sessions.update_one(
            {"shipment_id": str(shipment["_id"]), "simulation_id": simulation_id, "state": {"$in": expected_states}},
            {"$set": fields}, session=session)
        if not result.matched_count:
            raise ConflictError("Simulation not found or state has changed")
        return {"simulation_id": simulation_id, **fields}
    return await run_in_txn(transaction)


@router.post("/shipments/{shipment_id}/simulation/next-reading")
async def next_reading_endpoint(
    shipment_id: str,
    data: ReadingRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await _generate_reading(shipment_id, data, current_user, db)


async def _generate_reading(shipment_id, data, current_user, db, auto_owner=None):
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)
    
    enforce_permission(current_user, "sensors:simulate")
    canonical_id = str(shipment["_id"])
    batch_ids = shipment.get("batch_ids", [])
    batch = await resolve_doc(db.produce_batches, batch_ids[0], "Batch", business_key="batch_id") if batch_ids else None
    produce = batch.get("produce_type", "TOMATO") if batch else "TOMATO"

    async def record(session):
        now = datetime.now(timezone.utc)
        claimed = await db.shipments.update_one({"_id": shipment["_id"], "status": "IN_TRANSIT"},
                                                {"$set": {"updated_at": now}}, session=session)
        if not claimed.matched_count:
            raise ConflictError("Readings can only be simulated in transit")
        if data.session_id:
            run = await db.simulation_sessions.find_one({"simulation_id": data.session_id, "shipment_id": canonical_id}, session=session)
            if not run or run.get("state") != "RUNNING":
                raise ConflictError("Simulation session is not running")
            step, scenario = run["sequence"], run["scenario"]
            run_query = {"_id": run["_id"], "state": "RUNNING", "sequence": step}
            changes = {"updated_at": now}
            if auto_owner is not None:
                run_query.update(auto_play=True, auto_lease_owner=auto_owner, auto_lease_until={"$gt": now}, auto_next_at={"$lte": now})
                delay = max(1.0, run["interval_seconds"] / run.get("playback_speed", 1.0))
                changes.update(auto_next_at=now + timedelta(seconds=delay), auto_lease_owner=None, auto_lease_until=None)
            updated = await db.simulation_sessions.update_one(
                run_query, {"$inc": {"sequence": 1, "simulated_elapsed_seconds": run["interval_seconds"]},
                            "$set": changes}, session=session)
            if not updated.matched_count:
                raise ConflictError("Simulation changed; retry")
            seed = run["seed"]
        else:
            active = await db.simulation_sessions.find_one({"shipment_id": canonical_id,
                "state": {"$in": ["RUNNING", "PAUSED"]}}, session=session)
            if active:
                raise ConflictError("Use the active simulation session for readings")
            scenario = data.scenario.value
            step = await db.sensor_readings.count_documents({"shipment_id": canonical_id, "scenario": scenario, "simulation_id": None}, session=session)
            seed = canonical_id
        reading = generate_stateless_reading(seed, produce, scenario, step)
        previous_cursor = db.sensor_readings.find({"shipment_id": canonical_id, "simulation_id": data.session_id,
                                                   "scenario": scenario}, session=session).sort("timestamp", -1).limit(1)
        previous_readings = await previous_cursor.to_list(1)
        reading["status"] = classify_reading(reading, previous_readings[0] if previous_readings else None)
        document = {**reading, "reading_id": f"SR-{uuid.uuid4().hex[:12].upper()}",
                    "shipment_id": canonical_id, "timestamp": now, "created_at": now,
                    "simulation_id": data.session_id, "scenario": scenario, "sequence": step,
                    "source": "SIMULATOR", "is_simulated": True}
        await db.sensor_readings.insert_one(document, session=session)
        ranges = (("TEMPERATURE", reading["temperature"], reading["configured_temp_min"], reading["configured_temp_max"]),
                  ("HUMIDITY", reading["humidity"], reading["configured_humidity_min"], reading["configured_humidity_max"]))
        for kind, value, low, high in ranges:
            if low <= value <= high:
                continue
            existing = await db.sensor_alerts.find_one({"shipment_id": canonical_id, "alert_type": kind, "status": "ACTIVE"}, session=session)
            if existing:
                if reading["status"] == "CRITICAL" and existing.get("severity") != "CRITICAL":
                    await db.sensor_alerts.update_one({"_id": existing["_id"], "status": "ACTIVE"},
                        {"$set": {"severity": "CRITICAL", "updated_at": now}}, session=session)
                continue
            alert = {"alert_id": f"ALERT-{uuid.uuid4().hex[:12].upper()}", "shipment_id": canonical_id,
                     "simulation_id": data.session_id,
                     "reading_id": document["reading_id"], "alert_type": kind, "severity": reading["status"],
                     "observed_value": value, "configured_min": low, "configured_max": high,
                     "status": "ACTIVE", "created_at": now}
            result = await db.sensor_alerts.insert_one(alert, session=session)
            await append_ledger_block(db, event_type=LedgerEventType.SENSOR_ALERT_RAISED, entity_type="SENSOR_ALERT",
                                      entity_id=str(result.inserted_id), actor_id=current_user["sub"], actor_role=current_user["role"],
                                      event_summary="Simulated sensor alert raised", payload={"shipment_id": canonical_id, "alert_type": kind}, session=session)
        return {key: value for key, value in document.items() if key != "_id"}

    return await run_in_txn(record)


@router.get("/shipments/{shipment_id}/sensor-readings", response_model=List[SensorReadingResponse])
async def get_sensor_readings(
    shipment_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1),
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
    page_size: int = Query(20, ge=1),
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
async def acknowledge_alert(alert_id: str, current_user: dict = Depends(get_current_user),
                            db: AsyncIOMotorDatabase = Depends(get_database)):
    alert = await resolve_doc(db.sensor_alerts, alert_id, "Alert", business_key="alert_id")
    enforce_permission(current_user, "alerts:acknowledge")
    shipment = await resolve_doc(db.shipments, alert["shipment_id"], "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)
    now = datetime.now(timezone.utc)
    async def transaction(session):
        result = await db.sensor_alerts.update_one(
            {"_id": alert["_id"], "status": "ACTIVE", "acknowledged_at": None},
            {"$set": {"acknowledged_by": current_user["sub"], "acknowledged_at": now, "updated_at": now}}, session=session)
        if not result.matched_count:
            raise ConflictError("Alert is resolved or already acknowledged")
        await append_ledger_block(db, event_type=LedgerEventType.SENSOR_ALERT_ACKNOWLEDGED,
            entity_type="SENSOR_ALERT", entity_id=str(alert["_id"]), actor_id=current_user["sub"],
            actor_role=current_user["role"], event_summary="Sensor alert acknowledged",
            payload={"shipment_id": str(shipment["_id"])}, session=session)
        return {"message": "Alert acknowledged"}
    return await run_in_txn(transaction)


@router.post("/sensor-alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    alert_data: AlertResolve,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    alert = await resolve_doc(db.sensor_alerts, alert_id, "Alert", business_key="alert_id")
    enforce_permission(current_user, "alerts:resolve")
    shipment = await resolve_doc(db.shipments, alert["shipment_id"], "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)
    action = alert_data.corrective_action.strip()
    if not action:
        raise ValidationError("Corrective action is required")
    
    if alert.get("status") == AlertStatus.RESOLVED.value or alert.get("status") == "RESOLVED":
        raise ValidationError("Alert is already resolved")
    
    now = datetime.now(timezone.utc)
    async def _transaction(session):
        result = await db.sensor_alerts.update_one(
            {"_id": alert["_id"], "status": {"$ne": AlertStatus.RESOLVED.value}},
            {"$set": {"status": AlertStatus.RESOLVED.value, "resolved_by": current_user["sub"],
                      "resolved_at": now, "corrective_action": action, "updated_at": now}}, session=session,
        )
        if result.matched_count == 0:
            raise ConflictError("Alert is already resolved")
        await append_ledger_block(
            db, event_type=LedgerEventType.SENSOR_ALERT_RESOLVED, entity_type="SENSOR_ALERT",
            entity_id=str(alert["_id"]), actor_id=current_user["sub"], actor_role=current_user["role"],
            event_summary="Sensor alert resolved", payload={"shipment_id": str(shipment["_id"]),
                                                            "corrective_action": action}, session=session,
        )
    await run_in_txn(_transaction)
    
    return {"message": "Alert resolved"}

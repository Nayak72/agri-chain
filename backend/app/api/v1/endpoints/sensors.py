import uuid
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, ConfigDict
from bson import ObjectId

from app.db.mongodb import get_database
from app.core.permissions import get_current_user
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError, ConflictError
from app.core.constants import (
    UserRole, AlertSeverity, AlertStatus,
    SensorScenario, PRODUCE_HANDLING_PROFILES, ShipmentStatus
)
from app.services.ledger_service import append_ledger_block
from app.core.constants import LedgerEventType
from app.db.unit_of_work import run_in_txn
from app.services.sensor_simulator import generate_stateless_reading
from app.utils.serialization import to_response
from app.utils.mongo import to_mongo, resolve_doc
from app.core.access import assert_can_view_shipment

router = APIRouter()


class SensorReadingResponse(BaseModel):
    id: str
    reading_id: str
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
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    corrective_action: Optional[str] = None
    created_at: Optional[datetime] = None


class AlertResolve(BaseModel):
    corrective_action: str
    model_config = ConfigDict(extra="forbid")


class ReadingRequest(BaseModel):
    scenario: SensorScenario = SensorScenario.NORMAL
    model_config = ConfigDict(extra="forbid")


@router.post("/shipments/{shipment_id}/simulation/next-reading")
async def next_reading_endpoint(
    shipment_id: str,
    data: ReadingRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    shipment = await resolve_doc(db.shipments, shipment_id, "Shipment", business_key="shipment_id")
    await assert_can_view_shipment(db, current_user, shipment)
    
    if current_user["role"] not in (UserRole.ADMIN, UserRole.DRIVER, UserRole.TRANSPORTER):
        raise ForbiddenError("Only the assigned driver, transporter, or admin can simulate readings")
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
        step = await db.sensor_readings.count_documents({"shipment_id": canonical_id}, session=session)
        reading = generate_stateless_reading(canonical_id, produce, data.scenario.value, step)
        document = {**reading, "reading_id": f"SR-{uuid.uuid4().hex[:12].upper()}",
                    "shipment_id": canonical_id, "timestamp": now, "created_at": now,
                    "source": "SIMULATOR", "is_simulated": True}
        await db.sensor_readings.insert_one(document, session=session)
        ranges = (("TEMPERATURE", reading["temperature"], reading["configured_temp_min"], reading["configured_temp_max"]),
                  ("HUMIDITY", reading["humidity"], reading["configured_humidity_min"], reading["configured_humidity_max"]))
        for kind, value, low, high in ranges:
            if low <= value <= high:
                continue
            existing = await db.sensor_alerts.find_one({"shipment_id": canonical_id, "alert_type": kind, "status": "ACTIVE"}, session=session)
            if existing:
                continue
            alert = {"alert_id": f"ALERT-{uuid.uuid4().hex[:12].upper()}", "shipment_id": canonical_id,
                     "reading_id": document["reading_id"], "alert_type": kind, "severity": "CRITICAL",
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


@router.post("/sensor-alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    alert_data: AlertResolve,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    alert = await resolve_doc(db.sensor_alerts, alert_id, "Alert", business_key="alert_id")
    if current_user["role"] not in (UserRole.ADMIN, UserRole.DRIVER, UserRole.TRANSPORTER):
        raise ForbiddenError("Only the assigned driver, transporter, or admin can resolve alerts")
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

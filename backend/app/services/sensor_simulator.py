import asyncio
import random
import math
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional, Any
from app.core.constants import (
    SensorScenario, SensorStatus, PRODUCE_HANDLING_PROFILES, ProduceType
)
import logging

logger = logging.getLogger(__name__)


class SensorSimulationSession:
    def __init__(self, session_id: str, shipment_id: str, scenario: SensorScenario, interval_seconds: int, produce_type: Optional[str] = "TOMATO"):
        self.session_id = session_id
        self.shipment_id = shipment_id
        self.scenario = scenario
        self.interval_seconds = interval_seconds
        self.produce_type = produce_type or "TOMATO"
        self.status = "RUNNING"
        self.reading_count = 0
        self.task: Optional[asyncio.Task] = None
        self._stop_event = asyncio.Event()
        self._pause_event = asyncio.Event()
        self._pause_event.set()
        self._base_temp = None
        self._base_humidity = None
        self._time_start = datetime.now(timezone.utc)
        self.last_reading = None
        self.rng = random.Random(session_id)


class SensorSimulatorManager:
    def __init__(self):
        self.sessions: Dict[str, SensorSimulationSession] = {}
        self._lock = asyncio.Lock()
    
    async def start_simulation(
        self,
        session_id: str,
        shipment_id: str,
        scenario: SensorScenario,
        interval_seconds: int,
        db: Any,
        produce_type: Optional[str] = "TOMATO"
    ) -> bool:
        from app.core.config import get_settings
        if not get_settings().simulator_enabled:
            logger.info("Simulator is disabled by configuration")
            return False
        async with self._lock:
            if shipment_id in self.sessions:
                existing = self.sessions[shipment_id]
                if existing.status == "RUNNING":
                    return False
                existing.stop()
            
            session = SensorSimulationSession(
                session_id=session_id,
                shipment_id=shipment_id,
                scenario=scenario,
                interval_seconds=interval_seconds,
                produce_type=produce_type,
            )
            self.sessions[shipment_id] = session
            session.task = asyncio.create_task(self._simulation_loop(session, db))
            return True
    
    def pause_simulation(self, shipment_id: str) -> bool:
        session = self.sessions.get(shipment_id)
        if not session or session.status != "RUNNING":
            return False
        session._pause_event.clear()
        session.status = "PAUSED"
        return True
    
    def resume_simulation(self, shipment_id: str) -> bool:
        session = self.sessions.get(shipment_id)
        if not session or session.status != "PAUSED":
            return False
        session._pause_event.set()
        session.status = "RUNNING"
        return True
    
    def stop_simulation(self, shipment_id: str) -> bool:
        session = self.sessions.get(shipment_id)
        if not session:
            return False
        session.stop()
        session.status = "STOPPED"
        return True
    
    def remove_session(self, shipment_id: str):
        self.sessions.pop(shipment_id, None)
    
    def get_next_reading(self, shipment_id: str) -> Optional[dict]:
        session = self.sessions.get(shipment_id)
        if not session:
            return None
        
        reading = self._generate_reading(session)
        session.last_reading = reading
        session.reading_count += 1
        return reading
    
    def get_session_status(self, shipment_id: str) -> Optional[dict]:
        session = self.sessions.get(shipment_id)
        if not session:
            return None
        return {
            "session_id": session.session_id,
            "shipment_id": session.shipment_id,
            "scenario": session.scenario,
            "interval_seconds": session.interval_seconds,
            "status": session.status,
            "reading_count": session.reading_count,
        }
    
    def _generate_reading(self, session: SensorSimulationSession) -> dict:
        elapsed = (datetime.now(timezone.utc) - session._time_start).total_seconds()
        
        # Resolve handling profile based on session produce type
        try:
            produce_type_enum = ProduceType(session.produce_type)
            profile = PRODUCE_HANDLING_PROFILES.get(produce_type_enum, PRODUCE_HANDLING_PROFILES.get(ProduceType.TOMATO, {}))
        except (ValueError, KeyError):
            profile = PRODUCE_HANDLING_PROFILES.get(ProduceType.TOMATO, {})
            
        temp_min = profile.get("min_temp_c", 7)
        temp_max = profile.get("max_temp_c", 13)
        hum_min = profile.get("min_humidity_pct", 85)
        hum_max = profile.get("max_humidity_pct", 95)
        
        base_temp = (temp_min + temp_max) / 2
        base_hum = (hum_min + hum_max) / 2
        
        scenario = session.scenario
        
        if scenario == SensorScenario.NORMAL:
            temp = base_temp + session.rng.uniform(-0.5, 0.5)
            humidity = base_hum + session.rng.uniform(-2, 2)
            status = SensorStatus.NORMAL
        
        elif scenario == SensorScenario.TEMP_EXCURSION:
            temp = base_temp + session.rng.uniform(3, 8)
            humidity = base_hum + session.rng.uniform(-2, 2)
            status = SensorStatus.CRITICAL if temp > temp_max else SensorStatus.WARNING
        
        elif scenario == SensorScenario.HUMIDITY_EXCURSION:
            temp = base_temp + session.rng.uniform(-0.5, 0.5)
            humidity = base_hum + session.rng.uniform(5, 15)
            status = SensorStatus.CRITICAL if humidity > hum_max else SensorStatus.WARNING
        
        elif scenario == SensorScenario.BOTH_EXCURSION:
            temp = base_temp + session.rng.uniform(3, 8)
            humidity = base_hum + session.rng.uniform(5, 15)
            status = SensorStatus.CRITICAL
        
        elif scenario == SensorScenario.FLUCTUATION:
            temp = base_temp + 5 * math.sin(elapsed / 100) + session.rng.uniform(-1, 1)
            humidity = base_hum + 5 * math.cos(elapsed / 100) + session.rng.uniform(-2, 2)
            status = SensorStatus.WARNING if abs(temp - base_temp) > 3 else SensorStatus.NORMAL
        
        elif scenario == SensorScenario.RECOVERY:
            recovery_progress = min(elapsed / 300, 1.0)
            temp = base_temp + (5 * (1 - recovery_progress)) + session.rng.uniform(-0.5, 0.5)
            humidity = base_hum + (8 * (1 - recovery_progress)) + session.rng.uniform(-2, 2)
            status = SensorStatus.NORMAL if recovery_progress > 0.7 else SensorStatus.WARNING
        
        else:
            temp = base_temp
            humidity = base_hum
            status = SensorStatus.NORMAL
        
        temp = round(temp, 1)
        humidity = round(humidity, 1)
        
        if temp < temp_min or temp > temp_max:
            status = SensorStatus.CRITICAL
        elif humidity < hum_min or humidity > hum_max:
            status = SensorStatus.CRITICAL
        
        return {
            "session_id": session.session_id,
            "shipment_id": session.shipment_id,
            "device_id": f"SIM-DEV-{session.session_id[-8:]}",
            "temperature": temp,
            "humidity": humidity,
            "timestamp": datetime.now(timezone.utc),
            "configured_temp_min": temp_min,
            "configured_temp_max": temp_max,
            "configured_humidity_min": hum_min,
            "configured_humidity_max": hum_max,
            "status": status,
            "simulated": True,
        }

    async def resume_running(self, db: Any) -> int:
        """Resume persisted RUNNING sessions after a process restart."""
        from app.core.config import get_settings
        if not get_settings().simulator_enabled:
            return 0
        resumed = 0
        async for document in db.sensor_sessions.find({"status": "RUNNING"}):
            started = await self.start_simulation(
                document["session_id"], document["shipment_id"],
                SensorScenario(document.get("scenario", SensorScenario.NORMAL)),
                int(document.get("interval_seconds", get_settings().simulator_default_interval_seconds)),
                db, document.get("produce_type", "TOMATO"),
            )
            resumed += int(started)
        return resumed

    async def shutdown(self) -> None:
        sessions = list(self.sessions.values())
        for session in sessions:
            session.stop()
        tasks = [session.task for session in sessions if session.task and not session.task.done()]
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        self.sessions.clear()
    
    async def _simulation_loop(self, session: SensorSimulationSession, db: Any):
        while not session._stop_event.is_set():
            await session._pause_event.wait()
            if session._stop_event.is_set():
                break
            
            reading = self._generate_reading(session)
            session.last_reading = reading
            session.reading_count += 1
            
            try:
                reading_doc = {
                    "reading_id": f"SR-{session.session_id}-{session.reading_count:06d}",
                    "session_id": session.session_id,
                    "shipment_id": session.shipment_id,
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
                
                if reading["status"] in [SensorStatus.WARNING, SensorStatus.CRITICAL]:
                    await self._create_alert(db, session, reading)
            except Exception as e:
                logger.error(f"Error persisting sensor reading: {e}")
            
            try:
                await asyncio.wait_for(session._stop_event.wait(), timeout=session.interval_seconds)
            except asyncio.TimeoutError:
                pass
    
    async def _create_alert(self, db: Any, session: SensorSimulationSession, reading: dict):
        alert_type = "TEMPERATURE" if (
            reading["temperature"] < reading["configured_temp_min"] or
            reading["temperature"] > reading["configured_temp_max"]
        ) else "HUMIDITY"
        
        severity = SensorStatus.CRITICAL if reading["status"] == SensorStatus.CRITICAL else SensorStatus.WARNING
        
        alert_doc = {
            "alert_id": f"ALERT-{session.session_id}-{session.reading_count:06d}",
            "shipment_id": session.shipment_id,
            "reading_id": reading["reading_id"],
            "alert_type": alert_type,
            "severity": severity,
            "observed_value": reading["temperature"] if alert_type == "TEMPERATURE" else reading["humidity"],
            "configured_min": reading["configured_temp_min"] if alert_type == "TEMPERATURE" else reading["configured_humidity_min"],
            "configured_max": reading["configured_temp_max"] if alert_type == "TEMPERATURE" else reading["configured_humidity_max"],
            "status": "ACTIVE",
            "created_at": datetime.now(timezone.utc),
            "created_by": "SYSTEM",
        }
        
        await db.sensor_alerts.insert_one(alert_doc)


simulator_manager = SensorSimulatorManager()

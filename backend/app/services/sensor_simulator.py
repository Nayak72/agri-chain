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

    def stop(self) -> None:
        """Gracefully stop simulation session and cancel background task (SN-01)."""
        self._stop_event.set()
        self.status = "STOPPED"
        if self.task and not self.task.done():
            self.task.cancel()


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
        return self._generate_reading(session)
    
    def _get_handling_profile(self, produce_type: str) -> dict:
        return PRODUCE_HANDLING_PROFILES.get(
            produce_type,
            PRODUCE_HANDLING_PROFILES.get("TOMATO", {
                "optimum_temp_min": 10.0,
                "optimum_temp_max": 15.0,
                "optimum_humidity_min": 85.0,
                "optimum_humidity_max": 95.0,
            })
        )
    
    def _generate_reading(self, session: SensorSimulationSession) -> dict:
        profile = self._get_handling_profile(session.produce_type)
        temp_min = profile.get("optimum_temp_min", 10.0)
        temp_max = profile.get("optimum_temp_max", 15.0)
        hum_min = profile.get("optimum_humidity_min", 85.0)
        hum_max = profile.get("optimum_humidity_max", 95.0)
        
        target_temp = (temp_min + temp_max) / 2
        target_hum = (hum_min + hum_max) / 2
        
        if session._base_temp is None:
            session._base_temp = target_temp
            session._base_humidity = target_hum
        
        base_temp = session._base_temp
        base_hum = session._base_humidity
        step = session.reading_count
        
        scenario_val = session.scenario.value if hasattr(session.scenario, "value") else str(session.scenario)
        if scenario_val == SensorScenario.NORMAL or scenario_val == "NORMAL":
            noise_t = session.rng.gauss(0, 0.3)
            noise_h = session.rng.gauss(0, 1.0)
            temp = base_temp + noise_t
            humidity = base_hum + noise_h
            status = SensorStatus.NORMAL
        
        elif scenario_val == SensorScenario.COOLING_FAILURE or scenario_val == "COOLING_FAILURE":
            drift = min(step * 0.8, 20.0)
            noise = session.rng.gauss(0, 0.4)
            temp = base_temp + drift + noise
            humidity = base_hum - min(step * 0.5, 30.0) + session.rng.gauss(0, 1.0)
            status = SensorStatus.CRITICAL if temp > temp_max + 3 else SensorStatus.WARNING
        
        elif scenario_val == SensorScenario.HIGH_HUMIDITY or scenario_val == "HIGH_HUMIDITY":
            drift = min(step * 1.0, 15.0)
            temp = base_temp + session.rng.gauss(0, 0.3)
            humidity = min(base_hum + drift, 99.5)
            status = SensorStatus.CRITICAL if humidity > hum_max else SensorStatus.NORMAL
        
        elif scenario_val == SensorScenario.FREEZING_EVENT or scenario_val == "FREEZING_EVENT":
            drop = min(step * 1.5, 18.0)
            temp = base_temp - drop + session.rng.gauss(0, 0.3)
            humidity = base_hum + session.rng.gauss(0, 1.0)
            status = SensorStatus.CRITICAL if temp < 0 else SensorStatus.WARNING
        
        elif scenario_val == SensorScenario.HEAT_SPIKE or scenario_val == "HEAT_SPIKE":
            if 3 <= step <= 8:
                spike = 15.0 * math.sin((step - 3) / 5.0 * math.pi)
            else:
                spike = 0.0
            temp = base_temp + spike + session.rng.gauss(0, 0.4)
            humidity = base_hum - (spike * 0.5) + session.rng.gauss(0, 1.0)
            status = SensorStatus.CRITICAL if spike > 5 else SensorStatus.NORMAL
        
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
        
        status_val = status.value if hasattr(status, "value") else str(status)
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
            "status": status_val,
            "simulated": True,
        }

    async def resume_running(self, db: Any) -> int:
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
            try:
                await session._pause_event.wait()
                if session._stop_event.is_set():
                    break
                
                reading = self._generate_reading(session)
                session.last_reading = reading
                session.reading_count += 1
                
                reading_id = f"SR-{session.session_id}-{session.reading_count:06d}"
                reading["reading_id"] = reading_id  # Fix SN-02
                
                reading_doc = {
                    "reading_id": reading_id,
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
                
                if reading["status"] in ["WARNING", "CRITICAL", SensorStatus.WARNING, SensorStatus.CRITICAL]:
                    await self._create_alert(db, session, reading)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error persisting sensor reading in simulation loop: {e}")
            
            try:
                await asyncio.wait_for(session._stop_event.wait(), timeout=session.interval_seconds)
            except asyncio.TimeoutError:
                pass
            except asyncio.CancelledError:
                break
    
    async def _create_alert(self, db: Any, session: SensorSimulationSession, reading: dict):
        alert_type = "TEMPERATURE" if (
            reading["temperature"] < reading["configured_temp_min"] or
            reading["temperature"] > reading["configured_temp_max"]
        ) else "HUMIDITY"
        
        severity = "CRITICAL" if reading["status"] in ["CRITICAL", SensorStatus.CRITICAL] else "WARNING"
        
        alert_id = f"ALERT-{session.session_id}-{session.reading_count:06d}"
        alert_doc = {
            "alert_id": alert_id,
            "shipment_id": session.shipment_id,
            "reading_id": reading.get("reading_id", f"SR-{session.session_id}-{session.reading_count:06d}"),
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

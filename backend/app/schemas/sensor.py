from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.schemas.common import BaseSchema


class SensorReadingBase(BaseModel):
    shipment_id: str
    simulated_device_id: str
    temperature: float
    humidity: float
    timestamp: datetime
    source: str = "SIMULATOR"
    is_simulated: bool = True
    configured_temp_min: Optional[float] = None
    configured_temp_max: Optional[float] = None
    configured_humidity_min: Optional[float] = None
    configured_humidity_max: Optional[float] = None
    status: str = "NORMAL"


class SensorReadingResponse(BaseSchema, SensorReadingBase):
    reading_id: str
    created_at: datetime


class SensorAlertBase(BaseModel):
    shipment_id: str
    reading_id: str
    alert_type: str
    severity: str
    observed_value: float
    configured_min: Optional[float] = None
    configured_max: Optional[float] = None
    status: str = "ACTIVE"
    corrective_action: Optional[str] = None


class SensorAlertResponse(BaseSchema, SensorAlertBase):
    alert_id: str
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
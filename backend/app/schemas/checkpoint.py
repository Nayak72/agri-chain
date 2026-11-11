from pydantic import BaseModel
from datetime import datetime
from app.schemas.common import BaseSchema

class CheckpointBase(BaseModel):
    shipment_id: str
    name: str
    city: str

class CheckpointCreate(CheckpointBase):
    pass

class CheckpointResponse(BaseSchema, CheckpointBase):
    checkpoint_id: str
    recorded_at: datetime
    recorded_by: str

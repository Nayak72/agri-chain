from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.schemas.common import BaseSchema


class LedgerBlockBase(BaseModel):
    chain_id: str
    index: int
    block_id: str
    timestamp: datetime
    event_type: str
    entity_type: str
    entity_id: str
    actor_id: str
    actor_role: str
    event_summary: str
    payload_hash: str
    previous_hash: str
    hash: str
    hash_algorithm: str = "SHA-256"
    schema_version: str = "1.0"


class LedgerBlockResponse(BaseSchema, LedgerBlockBase):
    pass


class LedgerVerifyResponse(BaseModel):
    valid: bool
    chain_id: str
    total_blocks: int
    verified_blocks: int
    invalid_blocks: int
    first_invalid_block: Optional[dict] = None
    message: str

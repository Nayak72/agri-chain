"""Retrying MongoDB transaction boundary for multi-document workflows."""
import logging
from app.db.mongodb import get_client, supports_transactions
from app.core.config import get_settings
from pymongo.read_concern import ReadConcern
from pymongo.write_concern import WriteConcern

logger = logging.getLogger(__name__)


async def run_in_txn(callback):
    """Run a replayable callback in a snapshot/majority transaction."""
    if not supports_transactions():
        if not get_settings().allow_standalone_dev:
            raise RuntimeError("MongoDB transactions required: run a replica set")
        logger.warning("ALLOW_STANDALONE_DEV enabled: writes are not transactional")
        return await callback(None)
    async with await get_client().start_session() as session:
        return await session.with_transaction(
            callback, read_concern=ReadConcern("snapshot"),
            write_concern=WriteConcern("majority"),
        )

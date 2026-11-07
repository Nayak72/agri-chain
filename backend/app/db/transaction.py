from contextlib import asynccontextmanager
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorClientSession
from app.db.mongodb import get_client
from app.core.exceptions import LedgerError
from app.core.config import get_settings
import logging

logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def transaction_session():
    """Context manager for MongoDB transactions.
    
    If MongoDB is a standalone instance (not a replica set), transactions
    are not supported. In that case, this context manager yields a dummy
    session object that does nothing, allowing operations to proceed
    without transactional guarantees.
    """
    client = get_client()
    
    # Check if we're connected to a replica set
    try:
        repl_set_status = await client.admin.command("replSetGetStatus")
        is_replica_set = repl_set_status.get("ok") == 1
    except Exception:
        is_replica_set = False
    
    if not is_replica_set:
        logger.warning(
            "MongoDB is not a replica set. Multi-document transactions "
            "are not supported. Operations will proceed without transactional "
            "guarantees. For production, configure MongoDB as a replica set."
        )
        # Yield a dummy session - operations will just run without session
        yield None
        return
    
    async with await client.start_session() as session:
        async with session.start_transaction():
            try:
                yield session
            except Exception as e:
                logger.error(f"Transaction failed: {e}")
                await session.abort_transaction()
                raise


async def execute_with_retry(operation, max_retries: int = 3, session: AsyncIOMotorClientSession = None):
    last_exception = None
    for attempt in range(max_retries):
        try:
            if session:
                return await operation(session=session)
            else:
                return await operation()
        except Exception as e:
            last_exception = e
            if attempt < max_retries - 1:
                logger.warning(f"Operation failed (attempt {attempt + 1}/{max_retries}): {e}. Retrying...")
            else:
                logger.error(f"Operation failed after {max_retries} attempts: {e}")
                raise
    raise last_exception


class TransactionManager:
    def __init__(self):
        self._session: AsyncIOMotorClientSession = None
    
    async def __aenter__(self):
        client = get_client()
        
        try:
            repl_set_status = await client.admin.command("replSetGetStatus")
            is_replica_set = repl_set_status.get("ok") == 1
        except Exception:
            is_replica_set = False
        
        if not is_replica_set:
            self._session = None
            return self._session
        
        self._session = await client.start_session()
        await self._session.start_transaction()
        return self._session
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._session:
            if exc_type is not None:
                await self._session.abort_transaction()
            else:
                await self._session.commit_transaction()
            await self._session.end_session()
            self._session = None


async def with_transaction(operations, max_retries: int = 3):
    for attempt in range(max_retries):
        async with TransactionManager() as session:
            try:
                results = []
                for op in operations:
                    if callable(op):
                        results.append(await op(session))
                return results
            except Exception as e:
                if "WriteConflict" in str(type(e)) or "TransientTransactionError" in str(e):
                    if attempt < max_retries - 1:
                        logger.warning(f"Transaction conflict (attempt {attempt + 1}/{max_retries}): {e}. Retrying...")
                        continue
                raise
    raise LedgerError("Transaction failed after maximum retries")
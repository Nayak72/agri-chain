"""Transaction boundary shared by services and repositories."""

from contextlib import asynccontextmanager
import logging
from collections.abc import AsyncIterator

from motor.motor_asyncio import AsyncIOMotorClientSession

from app.db.mongodb import get_client, supports_transactions

logger = logging.getLogger(__name__)


class UnitOfWork:
    def __init__(self) -> None:
        self.session: AsyncIOMotorClientSession | None = None

    async def __aenter__(self) -> AsyncIOMotorClientSession | None:
        if not supports_transactions():
            logger.warning("UnitOfWork running without a Mongo transaction")
            return None
        self.session = await get_client().start_session()
        await self.session.start_transaction()
        return self.session

    async def __aexit__(self, exc_type, exc_value, traceback) -> None:
        if self.session is None:
            return
        try:
            if exc_type is None:
                await self.session.commit_transaction()
            else:
                await self.session.abort_transaction()
        finally:
            await self.session.end_session()
            self.session = None


@asynccontextmanager
async def uow() -> AsyncIterator[AsyncIOMotorClientSession | None]:
    """Yield a Mongo session, or ``None`` for development standalone Mongo."""
    async with UnitOfWork() as session:
        yield session

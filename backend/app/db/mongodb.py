from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import get_settings
import logging

logger = logging.getLogger(__name__)

settings = get_settings()

_client: AsyncIOMotorClient = None
_database: AsyncIOMotorDatabase = None


async def connect_to_mongo() -> None:
    global _client, _database
    logger.info(f"Connecting to MongoDB at {settings.mongodb_uri}")
    _client = AsyncIOMotorClient(settings.mongodb_uri)
    _database = _client[settings.database_name]
    
    try:
        await _client.admin.command("ping")
        logger.info("MongoDB connection successful")
        
        replica_set_status = await _client.admin.command("replSetGetStatus")
        if replica_set_status.get("ok") == 1:
            logger.info(f"Connected to replica set: {replica_set_status.get('set')}")
        else:
            logger.warning("Not connected to a replica set - transactions will not work")
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}")
        raise


async def close_mongo_connection() -> None:
    global _client
    if _client:
        _client.close()
        logger.info("MongoDB connection closed")


def get_database() -> AsyncIOMotorDatabase:
    if _database is None:
        raise RuntimeError("Database not initialized. Call connect_to_mongo() first.")
    return _database


def get_client() -> AsyncIOMotorClient:
    if _client is None:
        raise RuntimeError("MongoDB client not initialized. Call connect_to_mongo() first.")
    return _client
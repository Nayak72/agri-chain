from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import get_settings
from pymongo.uri_parser import parse_uri
import logging

logger = logging.getLogger(__name__)

settings = get_settings()

_client: AsyncIOMotorClient = None
_database: AsyncIOMotorDatabase = None
_supports_transactions = False


def get_sanitized_uri(uri: str) -> str:
    """Return MongoDB URI with credentials stripped."""
    try:
        parsed = parse_uri(uri)
        nodelist = ",".join(f"{host}:{port}" for host, port in parsed["nodelist"])
        database = parsed.get("database") or settings.database_name
        return f"mongodb://[REDACTED]@{nodelist}/{database}"
    except Exception:
        return "mongodb://[REDACTED]"


async def connect_to_mongo() -> bool:
    global _client, _database, _supports_transactions
    sanitized_uri = get_sanitized_uri(settings.mongodb_uri)
    logger.info(f"Connecting to MongoDB at {sanitized_uri}")
    _client = AsyncIOMotorClient(settings.mongodb_uri, tz_aware=True, w="majority", readConcernLevel="majority")
    _database = _client[settings.database_name]
    
    try:
        await _client.admin.command("ping")
        logger.info("MongoDB connection successful")
        
        hello = await _client.admin.command("hello")
        _supports_transactions = bool(hello.get("setName"))
        if _supports_transactions:
            logger.info("Connected to replica set: %s", hello.get("setName"))
        else:
            logger.warning("MongoDB is standalone; transactions are disabled")
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}")
        raise
    return _supports_transactions


def supports_transactions() -> bool:
    return _supports_transactions


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

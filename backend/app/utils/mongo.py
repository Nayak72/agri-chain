from datetime import date, datetime, timezone
from enum import Enum
from typing import Any, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection, AsyncIOMotorClientSession
from app.core.exceptions import NotFoundError, ValidationError


def to_mongo(data: Any) -> Any:
    """
    Recursively normalize data for MongoDB persistence:
    - datetime.date -> datetime at UTC midnight (BSON cannot encode date).
    - Enum -> enum.value.
    - dict -> recursively processed dict.
    - list/tuple/set -> recursively processed list.
    """
    if isinstance(data, dict):
        return {k: to_mongo(v) for k, v in data.items()}
    elif isinstance(data, (list, tuple, set)):
        return [to_mongo(item) for item in data]
    elif isinstance(data, datetime):
        if data.tzinfo is None:
            return data.replace(tzinfo=timezone.utc)
        return data
    elif isinstance(data, date):
        return datetime.combine(data, datetime.min.time(), tzinfo=timezone.utc)
    elif isinstance(data, Enum):
        return data.value
    elif hasattr(data, "model_dump"):
        return to_mongo(data.model_dump(exclude_unset=True))
    return data


async def resolve_doc(
    collection: AsyncIOMotorCollection,
    identifier: str,
    resource_name: str = "Resource",
    business_key: Optional[str] = None,
    session: Optional[AsyncIOMotorClientSession] = None,
) -> dict:
    """
    Safely resolve a document by ObjectId or business ID without throwing InvalidId 500.
    Raises NotFoundError (404) if not found or identifier is malformed.
    """
    if not identifier:
        raise NotFoundError(resource_name, "empty_id")

    doc = None
    if ObjectId.is_valid(identifier):
        query = {"_id": ObjectId(identifier)}
        if session:
            doc = await collection.find_one(query, session=session)
        else:
            doc = await collection.find_one(query)

    if not doc and business_key:
        query = {business_key: identifier}
        if session:
            doc = await collection.find_one(query, session=session)
        else:
            doc = await collection.find_one(query)

    if not doc:
        raise NotFoundError(resource_name, identifier)

    return doc


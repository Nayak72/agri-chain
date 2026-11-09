from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from bson import ObjectId

from app.db.mongodb import get_database


class BaseRepository:
    collection: str
    business_key: str | None = None

    def __init__(self, database=None) -> None:
        self.db = database

    def _collection(self):
        database = self.db if self.db is not None else get_database()
        return database[self.collection]

    async def get_by_any_id(self, id_or_business_id: str, session=None) -> dict[str, Any] | None:
        filters: list[dict[str, Any]] = []
        if ObjectId.is_valid(id_or_business_id):
            filters.append({"_id": ObjectId(id_or_business_id)})
        if self.business_key:
            filters.append({self.business_key: id_or_business_id})
        if not filters:
            return None
        return await self._collection().find_one({"$or": filters}, session=session)

    async def find_one(self, filters: dict[str, Any], session=None) -> dict[str, Any] | None:
        return await self._collection().find_one(filters, session=session)

    async def find_many(self, filters=None, *, skip=0, limit=20, sort=None, session=None) -> list[dict[str, Any]]:
        cursor = self._collection().find(filters or {}, session=session)
        if sort:
            cursor = cursor.sort(sort)
        return await cursor.skip(skip).limit(limit).to_list(length=limit)

    async def count(self, filters=None, session=None) -> int:
        return await self._collection().count_documents(filters or {}, session=session)

    async def create(self, data: dict[str, Any], session=None) -> str:
        now = datetime.now(timezone.utc)
        data.setdefault("created_at", now)
        data.setdefault("updated_at", now)
        result = await self._collection().insert_one(data, session=session)
        return str(result.inserted_id)

    async def update_one(self, filters: dict[str, Any], update: dict[str, Any], session=None):
        update = {**update, "updated_at": datetime.now(timezone.utc)}
        return await self._collection().update_one(filters, {"$set": update}, session=session)

import pytest
from datetime import datetime, date, timezone, timedelta
from bson import ObjectId
from unittest.mock import AsyncMock, MagicMock, patch

from app.utils.mongo import to_mongo
from app.utils.mongo import to_mongo


class TestMongoSerialization:
    def test_datetime_handled_before_date_preserves_time_and_tz(self):
        """to_mongo must preserve datetime hours/minutes/seconds and not truncate to midnight."""
        dt = datetime(2026, 11, 10, 15, 30, 45, 123456, tzinfo=timezone.utc)
        serialized = to_mongo(dt)
        assert isinstance(serialized, datetime)
        assert serialized.hour == 15
        assert serialized.minute == 30
        assert serialized.second == 45
        assert serialized.microsecond == 123456
        assert serialized.tzinfo == timezone.utc

    def test_pure_date_converts_to_utc_midnight(self):
        """to_mongo converts bare date to datetime at UTC midnight."""
        d = date(2026, 12, 1)
        serialized = to_mongo(d)
        assert isinstance(serialized, datetime)
        assert serialized.hour == 0
        assert serialized.minute == 0
        assert serialized.tzinfo == timezone.utc

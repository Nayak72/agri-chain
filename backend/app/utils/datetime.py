from datetime import datetime, timezone
from typing import Optional


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def utc_isoformat(dt: Optional[datetime] = None) -> str:
    if dt is None:
        dt = utc_now()
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_iso_datetime(date_string: str) -> datetime:
    from datetime import datetime
    if date_string.endswith("Z"):
        date_string = date_string[:-1] + "+00:00"
    return datetime.fromisoformat(date_string)


def add_days(dt: datetime, days: int) -> datetime:
    from datetime import timedelta
    return dt + timedelta(days=days)


def format_timestamp(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d %H:%M:%S UTC")


def format_date_only(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d")


def is_same_day(dt1: datetime, dt2: datetime) -> bool:
    return dt1.date() == dt2.date()


def is_expired(dt: datetime, reference: Optional[datetime] = None) -> bool:
    if reference is None:
        reference = utc_now()
    return dt < reference
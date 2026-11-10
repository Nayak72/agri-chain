import re
from datetime import date, datetime, timezone
from typing import Optional
from app.core.exceptions import ValidationError

GSTIN_REGEX = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")
IFSC_REGEX = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")
PHONE_REGEX = re.compile(r"^\+?[1-9]\d{1,14}$")
PINCODE_REGEX = re.compile(r"^\d{6}$")


def strip_string(v: Optional[str], field_name: str = "field", min_length: int = 1, max_length: int = 500) -> Optional[str]:
    if v is None:
        return None
    val = v.strip()
    if len(val) < min_length:
        raise ValidationError(f"{field_name} must contain at least {min_length} non-whitespace characters")
    if len(val) > max_length:
        raise ValidationError(f"{field_name} exceeds maximum length of {max_length}")
    return val


def escape_search(query: Optional[str], max_length: int = 100) -> Optional[str]:
    if not query:
        return None
    trimmed = query.strip()
    if len(trimmed) > max_length:
        trimmed = trimmed[:max_length]
    return re.escape(trimmed)


def normalize_email(v: Optional[str]) -> Optional[str]:
    if not v:
        return None
    val = v.strip().lower()
    if "@" not in val or "." not in val:
        raise ValidationError("Invalid email format")
    return val


def normalize_identifier(v: Optional[str]) -> Optional[str]:
    if not v:
        return None
    return v.strip().upper()


def validate_shelf_life(days: int) -> int:
    if days is None or days <= 0:
        raise ValidationError("Shelf life must be a positive integer")
    if days > 3650:
        raise ValidationError("Shelf life cannot exceed 3650 days (10 years)")
    return days


def validate_temperature_range(temp_min: Optional[float], temp_max: Optional[float]) -> None:
    if temp_min is not None and temp_max is not None:
        if temp_min >= temp_max:
            raise ValidationError(f"Minimum temperature ({temp_min}°C) must be less than maximum temperature ({temp_max}°C)")


def validate_date_not_future(d: date, field_name: str = "date") -> date:
    today = datetime.now(timezone.utc).date()
    if d > today:
        raise ValidationError(f"{field_name} cannot be in the future")
    return d


def validate_date_order(start_d: date, end_d: date, start_name: str = "start", end_name: str = "end") -> None:
    if end_d < start_d:
        raise ValidationError(f"{end_name} ({end_d}) cannot be earlier than {start_name} ({start_d})")


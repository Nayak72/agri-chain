import json
from datetime import datetime
from bson import ObjectId
from decimal import Decimal
from typing import Any


def serialize_doc(doc: dict) -> dict:
    if doc is None:
        return None
    result = {}
    for key, value in doc.items():
        result[key] = serialize_value(value)
    return result


def serialize_value(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    elif isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    elif isinstance(value, Decimal):
        return float(value)
    elif isinstance(value, dict):
        return serialize_doc(value)
    elif isinstance(value, list):
        return [serialize_value(item) for item in value]
    else:
        return value


def to_json(data: Any) -> str:
    return json.dumps(data, default=serialize_value, sort_keys=True)


def exclude_fields(doc: dict, fields: list) -> dict:
    return {k: v for k, v in doc.items() if k not in fields}


def pick_fields(doc: dict, fields: list) -> dict:
    return {k: v for k, v in doc.items() if k in fields}


def convert_objectids_to_strings(doc: dict) -> dict:
    if doc is None:
        return None
    result = {}
    for key, value in doc.items():
        if key == "_id":
            result["id"] = str(value)
        elif isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, dict):
            result[key] = convert_objectids_to_strings(value)
        elif isinstance(value, list):
            result[key] = [convert_objectids_to_strings(item) if isinstance(item, dict) else item for item in value]
        else:
            result[key] = value
    return result
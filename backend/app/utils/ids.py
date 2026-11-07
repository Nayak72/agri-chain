import uuid
from typing import Optional


def generate_batch_id(produce_type: str, location: str) -> str:
    prefix = produce_type[:3].upper()
    location_code = location[:3].upper()
    unique = uuid.uuid4().hex[:6].upper()
    return f"{prefix}-{location_code}-{unique}"


def generate_shipment_id(pickup_state: str, destination_state: str) -> str:
    pickup_code = pickup_state[:3].upper()
    dest_code = destination_state[:3].upper()
    unique = uuid.uuid4().hex[:6].upper()
    return f"SHIP-{pickup_code}-{dest_code}-{unique}"


def generate_order_id() -> str:
    return f"PO-{uuid.uuid4().hex[:10].upper()}"


def generate_booking_id() -> str:
    return f"FB-{uuid.uuid4().hex[:10].upper()}"


def generate_quotation_id() -> str:
    return f"FQ-{uuid.uuid4().hex[:10].upper()}"


def generate_receipt_id(warehouse_id: str) -> str:
    return f"WR-{warehouse_id[:8]}-{uuid.uuid4().hex[:8].upper()}"


def generate_checkpoint_id() -> str:
    return f"CP-{uuid.uuid4().hex[:8].upper()}"


def generate_delivery_report_id() -> str:
    return f"DR-{uuid.uuid4().hex[:8].upper()}"


def generate_movement_id() -> str:
    return f"IM-{uuid.uuid4().hex[:8].upper()}"


def generate_alert_id(session_id: str, reading_count: int) -> str:
    return f"ALERT-{session_id}-{reading_count:06d}"


def generate_reading_id(session_id: str, reading_count: int) -> str:
    return f"SR-{session_id}-{reading_count:06d}"


def generate_event_id() -> str:
    return f"EV-{uuid.uuid4().hex[:10].upper()}"


def generate_item_id() -> str:
    return f"SI-{uuid.uuid4().hex[:8].upper()}"


def generate_claim_id() -> str:
    return f"DC-{uuid.uuid4().hex[:8].upper()}"


def generate_session_id() -> str:
    return f"SS-{uuid.uuid4().hex[:8].upper()}"


def generate_transporter_id() -> str:
    return f"TRN-{uuid.uuid4().hex[:8].upper()}"


def generate_vehicle_id() -> str:
    return f"VEH-{uuid.uuid4().hex[:8].upper()}"


def generate_driver_id() -> str:
    return f"DRV-{uuid.uuid4().hex[:8].upper()}"
from datetime import datetime, timezone

import pytest

from app.core.constants import ShipmentStatus
from app.domain.inventory import fefo_allocate
from app.domain.shipment import ShipmentStateMachine


def test_shipment_state_machine_exposes_allowed_actions():
    assert ShipmentStateMachine.can_transition(ShipmentStatus.LOADED, ShipmentStatus.DISPATCHED)
    assert not ShipmentStateMachine.can_transition(ShipmentStatus.LOADED, ShipmentStatus.DELIVERED)


def test_fefo_allocator_uses_earliest_expiry_first():
    batches = [
        {"id": "late", "available_quantity_kg": 100, "shelf_life_end": datetime(2026, 3, 1, tzinfo=timezone.utc)},
        {"id": "early", "available_quantity_kg": 40, "shelf_life_end": datetime(2026, 1, 1, tzinfo=timezone.utc)},
    ]
    assert fefo_allocate(batches, 60) == [{"batch_id": "early", "quantity_kg": 40}, {"batch_id": "late", "quantity_kg": 20}]


def test_fefo_allocator_rejects_shortfall():
    with pytest.raises(ValueError, match="insufficient stock"):
        fefo_allocate([], 1)

from collections.abc import Iterable
from datetime import datetime
from typing import TypedDict


class AllocatableBatch(TypedDict, total=False):
    id: str
    available_quantity_kg: float
    shelf_life_end: datetime


def fefo_allocate(batches: Iterable[AllocatableBatch], requested_quantity_kg: float) -> list[dict[str, float | str]]:
    """Allocate from the earliest-expiring batches, returning an immutable plan."""
    if requested_quantity_kg < 0:
        raise ValueError("requested quantity cannot be negative")
    remaining = requested_quantity_kg
    allocation: list[dict[str, float | str]] = []
    for batch in sorted(batches, key=lambda item: item["shelf_life_end"]):
        available = max(0.0, float(batch.get("available_quantity_kg", 0)))
        quantity = min(available, remaining)
        if quantity:
            allocation.append({"batch_id": batch["id"], "quantity_kg": quantity})
            remaining -= quantity
        if remaining <= 0:
            break
    if remaining > 0:
        raise ValueError(f"insufficient stock: {remaining:g} kg remaining")
    return allocation

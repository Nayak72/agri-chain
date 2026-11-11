from dataclasses import dataclass
from app.core.constants import ShipmentStatus, UserRole
from app.services.shipment_workflow import ALLOWED_TRANSITIONS


@dataclass(frozen=True)
class ShipmentStateMachine:
    """Validate shipment transitions without depending on FastAPI or MongoDB."""

    transitions = {ShipmentStatus(k): frozenset(ShipmentStatus(v) for v in values) for k, values in ALLOWED_TRANSITIONS.items()}

    @classmethod
    def can_transition(cls, current: ShipmentStatus, target: ShipmentStatus) -> bool:
        return target in cls.transitions.get(current, set())

    @classmethod
    def allowed_transitions(cls, current: ShipmentStatus) -> tuple[ShipmentStatus, ...]:
        return tuple(sorted(cls.transitions.get(current, set()), key=lambda state: state.value))

    @classmethod
    def assert_transition(cls, current: ShipmentStatus, target: ShipmentStatus) -> None:
        if not cls.can_transition(current, target):
            raise ValueError(f"Invalid shipment transition: {current.value} -> {target.value}")


@dataclass(frozen=True)
class TransitionPolicy:
    role: UserRole
    states: frozenset[ShipmentStatus]


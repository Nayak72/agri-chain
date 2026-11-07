from dataclasses import dataclass
from app.core.constants import SHIPMENT_STATUS_TRANSITIONS, ShipmentStatus, UserRole


@dataclass(frozen=True)
class ShipmentStateMachine:
    """Validate shipment transitions without depending on FastAPI or MongoDB."""

    transitions = SHIPMENT_STATUS_TRANSITIONS

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


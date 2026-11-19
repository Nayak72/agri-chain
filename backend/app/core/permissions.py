from enum import Enum
from typing import Set, List, Optional
from fastapi import Depends, HTTPException
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.security import decode_token
from app.db.mongodb import get_database
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.exceptions import UnauthorizedError, ForbiddenError, AccountPendingApprovalError, AccountDisabledError

security = HTTPBearer(auto_error=False)


class Role(str, Enum):
    ADMIN = "ADMIN"
    FARMER = "FARMER"
    WAREHOUSE_MANAGER = "WAREHOUSE_MANAGER"
    TRANSPORTER = "TRANSPORTER"
    DRIVER = "DRIVER"
    BUYER = "BUYER"


ROLE_PERMISSIONS: dict[Role, Set[str]] = {
    Role.ADMIN: {
        "users:read", "users:write", "users:delete",
        "farms:read", "farms:write", "farms:delete",
        "produce:read", "produce:write", "produce:delete",
        "batches:read", "batches:write", "batches:delete",
        "warehouses:read", "warehouses:write", "warehouses:delete",
        "inventory:read", "inventory:write",
        "purchase_orders:read", "purchase_orders:write",
        "freight_bookings:read", "freight_bookings:write",
        "transporters:read", "transporters:write", "transporters:approve",
        "vehicles:read", "vehicles:write", "vehicles:delete",
        "drivers:read", "drivers:write", "drivers:delete",
        "shipments:read", "shipments:write",
        "checkpoints:read", "checkpoints:write",
        "sensors:read", "sensors:write", "sensors:control",
        "alerts:read", "alerts:write", "alerts:acknowledge", "alerts:resolve",
        "deliveries:read", "deliveries:write",
        "ledger:read", "ledger:verify",
        "analytics:read",
        "settings:read", "settings:write",
    },
    Role.FARMER: {
        "farms:read", "farms:write",
        "produce:read",
        "batches:read", "batches:write",
        "inventory:read",
        "purchase_orders:read", "purchase_orders:write",
        "freight_bookings:read", "freight_bookings:write",
        "shipments:read",
        "checkpoints:read",
        "sensors:read",
        "alerts:read",
        "deliveries:read",
        "ledger:read",
    },
    Role.WAREHOUSE_MANAGER: {
        "warehouses:read", "warehouses:write",
        "produce:read",
        "batches:read",
        "inventory:read", "inventory:write",
        "purchase_orders:read",
        "freight_bookings:read",
        "shipments:read", "shipments:write",
        "checkpoints:read", "checkpoints:write",
        "sensors:read",
        "alerts:read", "alerts:acknowledge",
        "deliveries:read", "deliveries:write",
        "ledger:read",
    },
    Role.TRANSPORTER: {
        "transporters:read", "transporters:write",
        "vehicles:read", "vehicles:write",
        "drivers:read", "drivers:write",
        "freight_bookings:read", "freight_bookings:write",
        "shipments:read", "shipments:write",
        "checkpoints:read", "checkpoints:write",
        "sensors:read",
        "alerts:read", "alerts:acknowledge", "alerts:resolve",
        "deliveries:read",
        "ledger:read",
        "analytics:read",
    },
    Role.DRIVER: {
        "shipments:read",
        "checkpoints:read", "checkpoints:write",
        "sensors:read",
        "alerts:read", "alerts:acknowledge",
        "deliveries:read", "deliveries:write",
        "ledger:read",
    },
    Role.BUYER: {
        "produce:read",
        "batches:read",
        "purchase_orders:read", "purchase_orders:write",
        "freight_bookings:read",
        "shipments:read",
        "checkpoints:read",
        "sensors:read",
        "alerts:read",
        "deliveries:read", "deliveries:write",
        "ledger:read",
    },
}

# Action-level policies for the operations migrated to centralized checks.
_ACTION_PERMISSIONS = {
    Role.ADMIN: {"inventory:receive", "returns:receive", "sensors:simulate", "alerts:acknowledge", "alerts:resolve"},
    Role.WAREHOUSE_MANAGER: {"inventory:receive", "returns:receive"},
    Role.TRANSPORTER: {"sensors:simulate", "alerts:acknowledge", "alerts:resolve"},
    Role.DRIVER: {"sensors:simulate", "alerts:acknowledge", "alerts:resolve"},
}
for _role, _actions in _ACTION_PERMISSIONS.items():
    ROLE_PERMISSIONS[_role].update(_actions)

# Workspace capabilities describe navigation only. Endpoint authorization and
# ownership checks remain independently authoritative on the server.
_WORKSPACE_PERMISSIONS = {
    Role.ADMIN: {"farms", "farm-create", "farm-detail", "produce", "produce-create", "batches", "batch-create", "warehouses", "warehouse-create", "inventory", "orders", "bookings", "booking-create", "quotes", "transporters", "fleet", "drivers", "deliveries", "analytics", "users", "settings"},
    Role.FARMER: {"farms", "farm-create", "farm-detail", "produce", "batches", "batch-create", "orders", "bookings", "booking-create", "quotes", "deliveries", "analytics"},
    Role.WAREHOUSE_MANAGER: {"produce", "batches", "warehouses", "warehouse-create", "inventory", "deliveries", "analytics"},
    Role.BUYER: {"farm-detail", "produce", "batches", "orders", "order-create", "bookings", "booking-create", "quotes", "deliveries", "analytics"},
    Role.TRANSPORTER: {"bookings", "quotes", "transporters", "fleet", "drivers", "shipment-create", "deliveries", "analytics"},
    Role.DRIVER: {"deliveries"},
}
for _role, _pages in _WORKSPACE_PERMISSIONS.items():
    ROLE_PERMISSIONS[_role].update({f"page:{page}" for page in _pages | {"dashboard", "shipments", "cold-chain", "ledger"}})


def enforce_permission(user: dict, permission: str) -> None:
    """Deny unknown roles or missing action capabilities before resource checks."""
    try:
        raw_role = user.get("role", "")
        role = Role(str(getattr(raw_role, "value", raw_role)).strip().upper())
    except ValueError as exc:
        raise ForbiddenError("Invalid user role") from exc
    if not has_permission(role, permission):
        raise ForbiddenError(f"Permission denied: {permission}")


def has_permission(role: Role, permission: str) -> bool:
    return permission in ROLE_PERMISSIONS.get(role, set())


def require_permission(permission: str):
    async def permission_dependency(current_user: dict = Depends(get_current_user)) -> dict:
        try:
            role = Role(current_user["role"])
        except (KeyError, ValueError):
            raise ForbiddenError("Invalid user role")
        if not has_permission(role, permission):
            raise ForbiddenError(f"Permission denied: {permission} required for role {role.value}")
        return current_user
    return permission_dependency


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> dict:
    if not credentials or not credentials.credentials:
        raise UnauthorizedError("Authentication required")
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise UnauthorizedError("Invalid access token")
    
    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedError("Invalid token payload")
        
    if db is not None:
        try:
            object_id = ObjectId(user_id)
        except Exception as exc:
            raise UnauthorizedError("Invalid token subject") from exc
        try:
            user = await db.users.find_one({"_id": object_id})
        except Exception as exc:
            raise HTTPException(status_code=503, detail="User service unavailable") from exc
        if not user:
            raise UnauthorizedError("User not found")
        if not user.get("is_active", True):
            raise AccountDisabledError()
        if not user.get("is_approved", True):
            raise AccountPendingApprovalError()

    if db is not None:
        try:
            payload["role"] = Role(str(user.get("role", "")).strip().upper()).value
        except ValueError as exc:
            raise ForbiddenError("Invalid user role") from exc
    return payload


async def get_current_admin_user(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

from enum import Enum
from typing import Set, List
from functools import wraps
from fastapi import HTTPException, Depends
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.security import decode_token
from app.db.mongodb import get_database
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()


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


def has_permission(role: Role, permission: str) -> bool:
    return permission in ROLE_PERMISSIONS.get(role, set())


def require_permission(permission: str):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get("current_user")
            if current_user:
                role = current_user.get("role")
                try:
                    if role and not has_permission(Role(role), permission):
                        raise HTTPException(
                            status_code=403,
                            detail=f"Permission denied: {permission} required for role {role}"
                        )
                except ValueError:
                    raise HTTPException(status_code=403, detail="Invalid user role")
            return await func(*args, **kwargs)
        return wrapper
    return decorator


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> dict:
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
        
    if db is not None:
        try:
            user = await db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                raise HTTPException(status_code=401, detail="User not found")
            if not user.get("is_active", True):
                raise HTTPException(status_code=401, detail="Account is deactivated")
            if not user.get("is_approved", True):
                raise HTTPException(status_code=403, detail="Account pending approval")
        except HTTPException:
            raise
        except Exception:
            pass
            
    return payload


async def get_current_admin_user(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from typing import Any, Dict
from pymongo.errors import DuplicateKeyError
import logging

logger = logging.getLogger(__name__)


class AgriChainException(Exception):
    code = "AGRICHAIN_ERROR"

    def __init__(self, message: str, status_code: int = 400, details: Dict[str, Any] = None, code: str | None = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        self.code = code or getattr(self.__class__, "code", "AGRICHAIN_ERROR")
        super().__init__(message)


class NotFoundError(AgriChainException):
    code = "NOT_FOUND"
    def __init__(self, resource: str, identifier: str):
        super().__init__(f"{resource} not found: {identifier}", 404, {"resource": resource, "identifier": identifier})


class ConflictError(AgriChainException):
    code = "CONFLICT"
    def __init__(self, message: str, details: Dict[str, Any] = None):
        super().__init__(message, 409, details)


class ValidationError(AgriChainException):
    code = "VALIDATION_ERROR"
    def __init__(self, message: str, details: Dict[str, Any] = None):
        super().__init__(message, 422, details)


class UnauthorizedError(AgriChainException):
    code = "UNAUTHORIZED"
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, 401)


class ForbiddenError(AgriChainException):
    code = "FORBIDDEN"
    def __init__(self, message: str = "Forbidden"):
        super().__init__(message, 403)


class AccountPendingApprovalError(AgriChainException):
    code = "ACCOUNT_PENDING_APPROVAL"

    def __init__(self):
        super().__init__("Account pending approval", 403)


class AccountDisabledError(AgriChainException):
    code = "ACCOUNT_DISABLED"

    def __init__(self):
        super().__init__("Account is deactivated", 403)


class RateLimitError(AgriChainException):
    code = "RATE_LIMITED"

    def __init__(self):
        super().__init__("Too many login attempts. Try again shortly.", 429, {"retry_after_seconds": 60})


class InsufficientStockError(AgriChainException):
    code = "INSUFFICIENT_STOCK"
    def __init__(self, available: float, requested: float):
        super().__init__(
            f"Insufficient stock: available {available}, requested {requested}",
            409,
            {"available": available, "requested": requested}
        )


class VehicleNotAvailableError(AgriChainException):
    code = "VEHICLE_NOT_AVAILABLE"
    def __init__(self, vehicle_id: str):
        super().__init__(f"Vehicle {vehicle_id} is not available", 409, {"vehicle_id": vehicle_id})


class DriverNotAvailableError(AgriChainException):
    code = "DRIVER_NOT_AVAILABLE"
    def __init__(self, driver_id: str):
        super().__init__(f"Driver {driver_id} is not available", 409, {"driver_id": driver_id})


class InvalidStateTransitionError(AgriChainException):
    code = "INVALID_STATE_TRANSITION"
    def __init__(self, current_state: str, target_state: str):
        super().__init__(
            f"Invalid state transition from {current_state} to {target_state}",
            400,
            {"current_state": current_state, "target_state": target_state}
        )


class LedgerError(AgriChainException):
    code = "LEDGER_ERROR"
    def __init__(self, message: str):
        super().__init__(message, 500)


async def agri_chain_exception_handler(request: Request, exc: AgriChainException) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    logger.warning(f"AgriChainException: {exc.message}", extra={"details": exc.details})
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message, "details": exc.details,
                            "field_errors": [], "request_id": request_id}}
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    logger.warning(f"ValidationError: {exc.errors()}")
    field_errors = [{"field": ".".join(str(part) for part in error["loc"]), "message": error["msg"]}
                    for error in exc.errors()]
    return JSONResponse(
        status_code=422,
        content={"error": {"code": "VALIDATION_ERROR", "message": "Validation failed", "details": {},
                            "field_errors": field_errors, "request_id": request_id}}
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    logger.warning(f"HTTPException: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": f"HTTP_{exc.status_code}", "message": str(exc.detail), "details": {},
                            "field_errors": [], "request_id": request_id}}
    )


async def duplicate_key_exception_handler(request: Request, exc: DuplicateKeyError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    logger.warning(f"DuplicateKeyError: {exc}")
    return JSONResponse(
        status_code=409,
        content={"error": {"code": "DUPLICATE_KEY_CONFLICT",
                            "message": "A resource with this key or identifier already exists.",
                            "details": {"details": str(exc)},
                            "field_errors": [],
                            "request_id": request_id}}
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_SERVER_ERROR", "message": "Internal server error", "details": {},
                            "field_errors": [], "request_id": request_id}}
    )

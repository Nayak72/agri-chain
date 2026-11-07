from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from typing import Any, Dict
import logging

logger = logging.getLogger(__name__)


class AgriChainException(Exception):
    def __init__(self, message: str, status_code: int = 400, details: Dict[str, Any] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class NotFoundError(AgriChainException):
    def __init__(self, resource: str, identifier: str):
        super().__init__(f"{resource} not found: {identifier}", 404, {"resource": resource, "identifier": identifier})


class ConflictError(AgriChainException):
    def __init__(self, message: str, details: Dict[str, Any] = None):
        super().__init__(message, 409, details)


class ValidationError(AgriChainException):
    def __init__(self, message: str, details: Dict[str, Any] = None):
        super().__init__(message, 422, details)


class UnauthorizedError(AgriChainException):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, 401)


class ForbiddenError(AgriChainException):
    def __init__(self, message: str = "Forbidden"):
        super().__init__(message, 403)


class InsufficientStockError(AgriChainException):
    def __init__(self, available: float, requested: float):
        super().__init__(
            f"Insufficient stock: available {available}, requested {requested}",
            409,
            {"available": available, "requested": requested}
        )


class VehicleNotAvailableError(AgriChainException):
    def __init__(self, vehicle_id: str):
        super().__init__(f"Vehicle {vehicle_id} is not available", 409, {"vehicle_id": vehicle_id})


class DriverNotAvailableError(AgriChainException):
    def __init__(self, driver_id: str):
        super().__init__(f"Driver {driver_id} is not available", 409, {"driver_id": driver_id})


class InvalidStateTransitionError(AgriChainException):
    def __init__(self, current_state: str, target_state: str):
        super().__init__(
            f"Invalid state transition from {current_state} to {target_state}",
            400,
            {"current_state": current_state, "target_state": target_state}
        )


class LedgerError(AgriChainException):
    def __init__(self, message: str):
        super().__init__(message, 500)


async def agri_chain_exception_handler(request: Request, exc: AgriChainException) -> JSONResponse:
    logger.warning(f"AgriChainException: {exc.message}", extra={"details": exc.details})
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.message, "details": exc.details}
    )


async def validation_exception_handler(request: Request, exc: ValidationError) -> JSONResponse:
    logger.warning(f"ValidationError: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"error": "Validation failed", "details": exc.errors()}
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    logger.warning(f"HTTPException: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"}
    )
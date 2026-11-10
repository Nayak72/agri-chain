from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.core.config import get_settings
from app.core.exceptions import (
    AgriChainException, agri_chain_exception_handler,
    validation_exception_handler, http_exception_handler, generic_exception_handler,
    duplicate_key_exception_handler
)
from pymongo.errors import DuplicateKeyError
from app.db.mongodb import connect_to_mongo, close_mongo_connection, supports_transactions
from app.db.indexes import create_indexes, seed_initial_data
from app.api.v1.router import api_router
import logging
import os

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting AgriChain backend...")
    
    os.makedirs(settings.upload_directory, exist_ok=True)
    
    app.state.supports_transactions = await connect_to_mongo()
    if settings.app_env == "production" and not app.state.supports_transactions:
        raise RuntimeError("Production requires a MongoDB replica set")
    
    from app.db.mongodb import get_database
    db = get_database()
    await create_indexes(db)
    await seed_initial_data(db)
    from app.services.sensor_simulator import simulator_manager
    await simulator_manager.resume_running(db)
    
    logger.info("AgriChain backend started successfully")
    yield
    
    logger.info("Shutting down AgriChain backend...")
    from app.services.sensor_simulator import simulator_manager
    await simulator_manager.shutdown()
    await close_mongo_connection()
    logger.info("AgriChain backend shut down complete")


def create_app() -> FastAPI:
    os.makedirs(settings.upload_directory, exist_ok=True)
    application = FastAPI(
        title=settings.app_name,
        description="Blockchain-Inspired Agricultural Supply Chain and Freight Transportation Management System",
        version="1.0.0",
        redoc_url="/redoc",
        lifespan=lifespan,
        docs_url="/docs",
    )

    @application.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        import uuid
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.mount("/uploads", StaticFiles(directory=settings.upload_directory), name="uploads")
    application.add_exception_handler(AgriChainException, agri_chain_exception_handler)
    application.add_exception_handler(HTTPException, http_exception_handler)
    application.add_exception_handler(RequestValidationError, validation_exception_handler)
    application.add_exception_handler(DuplicateKeyError, duplicate_key_exception_handler)
    application.add_exception_handler(Exception, generic_exception_handler)
    application.include_router(api_router, prefix="/api/v1")

    @application.get("/")
    async def root():
        return {"name": settings.app_name, "version": "1.0.0", "docs": "/docs", "health": "/health/live"}

    @application.get("/health/live")
    async def health_live():
        return {"status": "ok"}

    @application.get("/health/ready")
    async def health_ready():
        from app.db.mongodb import get_client, get_database
        await get_client().admin.command("ping")
        await get_database().command("ping")
        return {"status": "ready", "database": "connected", "transactions": application.state.supports_transactions}

    return application

app = create_app()

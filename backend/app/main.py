from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import get_settings
from app.core.exceptions import (
    AgriChainException, agri_chain_exception_handler,
    validation_exception_handler, http_exception_handler, generic_exception_handler
)
from app.db.mongodb import connect_to_mongo, close_mongo_connection
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
    
    await connect_to_mongo()
    
    from app.db.mongodb import get_database
    db = get_database()
    await create_indexes(db)
    await seed_initial_data(db)
    
    logger.info("AgriChain backend started successfully")
    yield
    
    logger.info("Shutting down AgriChain backend...")
    await close_mongo_connection()
    logger.info("AgriChain backend shut down complete")


app = FastAPI(
    title=settings.app_name,
    description="Blockchain-Inspired Agricultural Supply Chain and Freight Transportation Management System",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=settings.upload_directory), name="uploads")

app.add_exception_handler(AgriChainException, agri_chain_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "description": "Agricultural Supply Chain and Freight Transportation Management System",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health_check():
    from app.db.mongodb import get_client
    try:
        client = get_client()
        await client.admin.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}
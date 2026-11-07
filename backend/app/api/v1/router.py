from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, users, farms, produce, batches,
    warehouses, inventory, purchase_orders,
    transporters, vehicles, drivers,
    freight_bookings, freight_quotes, shipments,
    checkpoints, sensors, delivery, ledger, analytics
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(farms.router, prefix="/farms", tags=["Farms"])
api_router.include_router(produce.router, prefix="/produce", tags=["Produce Catalogue"])
api_router.include_router(batches.router, prefix="/batches", tags=["Produce Batches"])
api_router.include_router(warehouses.router, prefix="/warehouses", tags=["Warehouses"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["Inventory"])
api_router.include_router(purchase_orders.router, prefix="/purchase-orders", tags=["Purchase Orders"])
api_router.include_router(transporters.router, prefix="/transporters", tags=["Transporters"])
api_router.include_router(vehicles.router, prefix="/vehicles", tags=["Vehicles"])
api_router.include_router(drivers.router, prefix="/drivers", tags=["Drivers"])
api_router.include_router(freight_bookings.router, prefix="/freight-bookings", tags=["Freight Bookings"])
api_router.include_router(freight_quotes.router, prefix="/freight-quotes", tags=["Freight Quotations"])
api_router.include_router(shipments.router, prefix="/shipments", tags=["Shipments"])
api_router.include_router(checkpoints.router, prefix="/checkpoints", tags=["Checkpoints"])
api_router.include_router(sensors.router, prefix="/sensors", tags=["Sensors"])
api_router.include_router(delivery.router, prefix="/delivery", tags=["Delivery"])
api_router.include_router(ledger.router, prefix="/ledger", tags=["Ledger"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
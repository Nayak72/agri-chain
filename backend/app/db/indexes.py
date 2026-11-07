from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.constants import (
    UserRole, ProduceCategory, ProduceType, QualityGrade, BatchStatus,
    WarehouseReceiptStatus, InspectionResult, InventoryStatus,
    PurchaseOrderStatus, FreightBookingStatus, VehicleCategory, VehicleType,
    VehicleStatus, DriverStatus, ShipmentStatus, SensorScenario, SensorStatus,
    AlertSeverity, AlertStatus, DeliveryStatus, DamageClaimStatus,
    LedgerEventType
)
import logging

logger = logging.getLogger(__name__)


async def _create_index_safe(collection, keys, **kwargs) -> None:
    """Create an index safely, skipping if it already exists with different specs."""
    try:
        await collection.create_index(keys, **kwargs)
    except Exception as e:
        errmsg = str(e)
        if "IndexKeySpecsConflict" in errmsg or "already exists" in errmsg:
            logger.debug(f"Index {keys} already exists, skipping: {errmsg}")
        else:
            logger.warning(f"Index creation warning for {keys}: {errmsg}")


async def create_indexes(db: AsyncIOMotorDatabase) -> None:
    logger.info("Creating database indexes...")
    
    # Users collection
    await _create_index_safe(db.users, "email", unique=True)
    await _create_index_safe(db.users, "role")
    await _create_index_safe(db.users, "is_active")
    await _create_index_safe(db.users, "created_at")

    await _create_index_safe(db.refresh_tokens, "jti_hash", unique=True)
    await _create_index_safe(db.refresh_tokens, "user_id")
    await _create_index_safe(db.refresh_tokens, "family_id")
    await _create_index_safe(db.refresh_tokens, "expires_at", expireAfterSeconds=0)
    
    # Farms collection
    await _create_index_safe(db.farms, "farmer_id")
    await _create_index_safe(db.farms, "name")
    await _create_index_safe(db.farms, [("farmer_id", 1), ("name", 1)], unique=True, sparse=True)
    
    # Produce catalogue
    await _create_index_safe(db.produce_catalogue, "produce_type", unique=True)
    await _create_index_safe(db.produce_catalogue, "category")
    await _create_index_safe(db.produce_catalogue, "is_active")
    
    # Handling profiles
    await _create_index_safe(db.handling_profiles, "produce_type", unique=True)
    
    # Produce batches
    await _create_index_safe(db.produce_batches, "batch_id", unique=True)
    await _create_index_safe(db.produce_batches, "farmer_id")
    await _create_index_safe(db.produce_batches, "farm_id")
    await _create_index_safe(db.produce_batches, "produce_type")
    await _create_index_safe(db.produce_batches, "harvest_date")
    await _create_index_safe(db.produce_batches, "status")
    await _create_index_safe(db.produce_batches, [("farmer_id", 1), ("status", 1)])
    await _create_index_safe(db.produce_batches, [("produce_type", 1), ("status", 1)])
    
    # Warehouses
    await _create_index_safe(db.warehouses, "manager_id")
    await _create_index_safe(db.warehouses, "name", unique=True)
    await _create_index_safe(db.warehouses, "location.city")
    await _create_index_safe(db.warehouses, "is_active")
    
    # Warehouse receipts
    await _create_index_safe(db.warehouse_receipts, "receipt_id", unique=True)
    await _create_index_safe(db.warehouse_receipts, "warehouse_id")
    await _create_index_safe(db.warehouse_receipts, "batch_id")
    await _create_index_safe(db.warehouse_receipts, "farmer_id")
    await _create_index_safe(db.warehouse_receipts, "receiving_date")
    await _create_index_safe(db.warehouse_receipts, "status")
    
    # Quality inspections
    await _create_index_safe(db.quality_inspections, "inspection_id", unique=True)
    await _create_index_safe(db.quality_inspections, "receipt_id")
    await _create_index_safe(db.quality_inspections, "batch_id")
    await _create_index_safe(db.quality_inspections, "inspection_date")
    await _create_index_safe(db.quality_inspections, "result")
    
    # Inventory items
    await _create_index_safe(db.inventory_items, "inventory_id", unique=True)
    await _create_index_safe(db.inventory_items, "warehouse_id")
    await _create_index_safe(db.inventory_items, "batch_id")
    await _create_index_safe(db.inventory_items, "produce_type")
    await _create_index_safe(db.inventory_items, "status")
    await _create_index_safe(db.inventory_items, [("warehouse_id", 1), ("batch_id", 1)], unique=True, sparse=True)
    await _create_index_safe(db.inventory_items, [("batch_id", 1), ("status", 1)])
    await _create_index_safe(db.inventory_items, "estimated_shelf_life_end")
    
    # Inventory movements
    await _create_index_safe(db.inventory_movements, "movement_id", unique=True)
    await _create_index_safe(db.inventory_movements, "inventory_id")
    await _create_index_safe(db.inventory_movements, "batch_id")
    await _create_index_safe(db.inventory_movements, "movement_type")
    await _create_index_safe(db.inventory_movements, "created_at")
    await _create_index_safe(db.inventory_movements, [("batch_id", 1), ("created_at", 1)])
    
    # Purchase orders
    await _create_index_safe(db.purchase_orders, "order_id", unique=True)
    await _create_index_safe(db.purchase_orders, "buyer_id")
    await _create_index_safe(db.purchase_orders, "seller_id")
    await _create_index_safe(db.purchase_orders, "produce_type")
    await _create_index_safe(db.purchase_orders, "batch_id")
    await _create_index_safe(db.purchase_orders, "status")
    await _create_index_safe(db.purchase_orders, "order_date")
    await _create_index_safe(db.purchase_orders, [("buyer_id", 1), ("status", 1)])
    await _create_index_safe(db.purchase_orders, [("seller_id", 1), ("status", 1)])
    
    # Transporters
    await _create_index_safe(db.transporters, "transporter_id", unique=True, sparse=True)
    await _create_index_safe(db.transporters, "company_name", unique=True, sparse=True)
    await _create_index_safe(db.transporters, "user_id", unique=True, sparse=True)
    await _create_index_safe(db.transporters, "approval_status")
    await _create_index_safe(db.transporters, "is_active")
    
    # Vehicles
    await _create_index_safe(db.vehicles, "vehicle_id", unique=True, sparse=True)
    await _create_index_safe(db.vehicles, "registration_number", unique=True, sparse=True)
    await _create_index_safe(db.vehicles, "transporter_id")
    await _create_index_safe(db.vehicles, "category")
    await _create_index_safe(db.vehicles, "status")
    await _create_index_safe(db.vehicles, [("transporter_id", 1), ("status", 1)])
    await _create_index_safe(db.vehicles, "registration_expiry")
    await _create_index_safe(db.vehicles, "insurance_expiry")
    await _create_index_safe(db.vehicles, "fitness_expiry")
    
    # Drivers
    await _create_index_safe(db.drivers, "driver_id", unique=True, sparse=True)
    await _create_index_safe(db.drivers, "license_number", unique=True, sparse=True)
    await _create_index_safe(db.drivers, "transporter_id")
    await _create_index_safe(db.drivers, "status")
    await _create_index_safe(db.drivers, [("transporter_id", 1), ("status", 1)])
    await _create_index_safe(db.drivers, "license_expiry")
    
    # Freight bookings
    await _create_index_safe(db.freight_bookings, "booking_id", unique=True)
    await _create_index_safe(db.freight_bookings, "purchase_order_id")
    await _create_index_safe(db.freight_bookings, "buyer_id")
    await _create_index_safe(db.freight_bookings, "seller_id")
    await _create_index_safe(db.freight_bookings, "status")
    await _create_index_safe(db.freight_bookings, "requested_pickup_date")
    await _create_index_safe(db.freight_bookings, [("status", 1), ("requested_pickup_date", 1)])
    
    # Freight quotations
    await _create_index_safe(db.freight_quotations, "quotation_id", unique=True)
    await _create_index_safe(db.freight_quotations, "booking_id")
    await _create_index_safe(db.freight_quotations, "transporter_id")
    await _create_index_safe(db.freight_quotations, "status")
    await _create_index_safe(db.freight_quotations, "validity_date")
    await _create_index_safe(db.freight_quotations, [("booking_id", 1), ("transporter_id", 1)], unique=True, sparse=True)
    
    # Shipments
    await _create_index_safe(db.shipments, "shipment_id", unique=True)
    await _create_index_safe(db.shipments, "booking_id")
    await _create_index_safe(db.shipments, "purchase_order_id")
    await _create_index_safe(db.shipments, "farmer_id")
    await _create_index_safe(db.shipments, "buyer_id")
    await _create_index_safe(db.shipments, "transporter_id")
    await _create_index_safe(db.shipments, "vehicle_id")
    await _create_index_safe(db.shipments, "driver_id")
    await _create_index_safe(db.shipments, "status")
    await _create_index_safe(db.shipments, "dispatch_date")
    await _create_index_safe(db.shipments, "expected_arrival_date")
    await _create_index_safe(db.shipments, [("transporter_id", 1), ("status", 1)])
    await _create_index_safe(db.shipments, [("driver_id", 1), ("status", 1)])
    await _create_index_safe(db.shipments, [("vehicle_id", 1), ("status", 1)])
    
    # Shipment items
    await _create_index_safe(db.shipment_items, "item_id", unique=True)
    await _create_index_safe(db.shipment_items, "shipment_id")
    await _create_index_safe(db.shipment_items, "batch_id")
    await _create_index_safe(db.shipment_items, [("shipment_id", 1), ("batch_id", 1)], unique=True, sparse=True)
    
    # Route checkpoints
    await _create_index_safe(db.route_checkpoints, "checkpoint_id", unique=True)
    await _create_index_safe(db.route_checkpoints, "shipment_id")
    await _create_index_safe(db.route_checkpoints, "sequence")
    await _create_index_safe(db.route_checkpoints, [("shipment_id", 1), ("sequence", 1)], unique=True, sparse=True)
    await _create_index_safe(db.route_checkpoints, "status")
    
    # Shipment events
    await _create_index_safe(db.shipment_events, "event_id", unique=True)
    await _create_index_safe(db.shipment_events, "shipment_id")
    await _create_index_safe(db.shipment_events, "event_type")
    await _create_index_safe(db.shipment_events, "created_at")
    await _create_index_safe(db.shipment_events, [("shipment_id", 1), ("created_at", 1)])
    
    # Sensor sessions
    await _create_index_safe(db.sensor_sessions, "session_id", unique=True)
    await _create_index_safe(db.sensor_sessions, "shipment_id", unique=True)
    await _create_index_safe(db.sensor_sessions, "status")
    
    # Sensor readings
    await _create_index_safe(db.sensor_readings, "reading_id", unique=True)
    await _create_index_safe(db.sensor_readings, "session_id")
    await _create_index_safe(db.sensor_readings, "shipment_id")
    await _create_index_safe(db.sensor_readings, "timestamp")
    await _create_index_safe(db.sensor_readings, [("shipment_id", 1), ("timestamp", 1)])
    await _create_index_safe(db.sensor_readings, "status")
    
    # Sensor alerts
    await _create_index_safe(db.sensor_alerts, "alert_id", unique=True)
    await _create_index_safe(db.sensor_alerts, "shipment_id")
    await _create_index_safe(db.sensor_alerts, "reading_id")
    await _create_index_safe(db.sensor_alerts, "alert_type")
    await _create_index_safe(db.sensor_alerts, "severity")
    await _create_index_safe(db.sensor_alerts, "status")
    await _create_index_safe(db.sensor_alerts, "created_at")
    await _create_index_safe(db.sensor_alerts, [("shipment_id", 1), ("status", 1)])
    
    # Delivery reports
    await _create_index_safe(db.delivery_reports, "report_id", unique=True)
    await _create_index_safe(db.delivery_reports, "shipment_id", unique=True)
    await _create_index_safe(db.delivery_reports, "status")
    await _create_index_safe(db.delivery_reports, "delivery_date")
    
    # Damage claims
    await _create_index_safe(db.damage_claims, "claim_id", unique=True)
    await _create_index_safe(db.damage_claims, "shipment_id")
    await _create_index_safe(db.damage_claims, "batch_id")
    await _create_index_safe(db.damage_claims, "reported_by")
    await _create_index_safe(db.damage_claims, "status")
    await _create_index_safe(db.damage_claims, "created_at")
    
    # Ledger blocks
    await _create_index_safe(db.ledger_blocks, [("chain_id", 1), ("index", 1)], unique=True)
    await _create_index_safe(db.ledger_blocks, "block_id", unique=True)
    await _create_index_safe(db.ledger_blocks, "previous_hash")
    await _create_index_safe(db.ledger_blocks, "event_type")
    await _create_index_safe(db.ledger_blocks, "entity_type")
    await _create_index_safe(db.ledger_blocks, "entity_id")
    await _create_index_safe(db.ledger_blocks, "actor_id")
    await _create_index_safe(db.ledger_blocks, "timestamp")
    await _create_index_safe(db.ledger_blocks, [("entity_type", 1), ("entity_id", 1), ("timestamp", 1)])
    
    # Ledger heads
    await _create_index_safe(db.ledger_heads, "chain_id", unique=True)
    
    # Notifications
    await _create_index_safe(db.notifications, "notification_id", unique=True)
    await _create_index_safe(db.notifications, "user_id")
    await _create_index_safe(db.notifications, "is_read")
    await _create_index_safe(db.notifications, "created_at")
    await _create_index_safe(db.notifications, [("user_id", 1), ("is_read", 1), ("created_at", -1)])
    
    # System settings
    await _create_index_safe(db.system_settings, "key", unique=True)
    
    logger.info("Database indexes created successfully")


async def seed_initial_data(db: AsyncIOMotorDatabase) -> None:
    logger.info("Seeding initial data...")
    
    # Seed produce catalogue
    await seed_produce_catalogue(db)
    
    # Seed handling profiles
    await seed_handling_profiles(db)
    
    # Seed system settings
    await seed_system_settings(db)

    from app.core.config import get_settings
    from app.core.security import get_password_hash
    settings = get_settings()
    if settings.app_env == "development" and settings.admin_email and settings.admin_password:
        from datetime import datetime, timezone
        await db.users.update_one(
            {"email": settings.admin_email},
            {"$setOnInsert": {
                "email": settings.admin_email,
                "password_hash": get_password_hash(settings.admin_password),
                "full_name": "AgriChain Administrator",
                "phone": None,
                "role": UserRole.ADMIN.value,
                "is_active": True,
                "is_approved": True,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }},
            upsert=True,
        )
    
    logger.info("Initial data seeded successfully")


async def seed_produce_catalogue(db: AsyncIOMotorDatabase) -> None:
    vegetables = [
        {"produce_type": "TOMATO", "name": "Tomato", "category": "VEGETABLE", "unit": "kg", "description": "Fresh tomatoes for table and processing"},
        {"produce_type": "POTATO", "name": "Potato", "category": "VEGETABLE", "unit": "kg", "description": "Table and processing potatoes"},
        {"produce_type": "ONION", "name": "Onion", "category": "VEGETABLE", "unit": "kg", "description": "Red and white onions"},
        {"produce_type": "CARROT", "name": "Carrot", "category": "VEGETABLE", "unit": "kg", "description": "Fresh carrots"},
        {"produce_type": "CABBAGE", "name": "Cabbage", "category": "VEGETABLE", "unit": "kg", "description": "Green and red cabbage"},
        {"produce_type": "CAULIFLOWER", "name": "Cauliflower", "category": "VEGETABLE", "unit": "kg", "description": "Fresh cauliflower heads"},
        {"produce_type": "SPINACH", "name": "Spinach", "category": "VEGETABLE", "unit": "kg", "description": "Fresh leafy spinach"},
        {"produce_type": "CUCUMBER", "name": "Cucumber", "category": "VEGETABLE", "unit": "kg", "description": "Fresh cucumbers"},
        {"produce_type": "CAPSICUM", "name": "Capsicum", "category": "VEGETABLE", "unit": "kg", "description": "Bell peppers (green, red, yellow)"},
        {"produce_type": "BRINJAL", "name": "Brinjal", "category": "VEGETABLE", "unit": "kg", "description": "Eggplant/Aubergine"},
        {"produce_type": "GREEN_CHILLI", "name": "Green Chilli", "category": "VEGETABLE", "unit": "kg", "description": "Fresh green chillies"},
    ]
    
    fruits = [
        {"produce_type": "APPLE", "name": "Apple", "category": "FRUIT", "unit": "kg", "description": "Fresh apples (various varieties)"},
        {"produce_type": "BANANA", "name": "Banana", "category": "FRUIT", "unit": "kg", "description": "Fresh bananas"},
        {"produce_type": "MANGO", "name": "Mango", "category": "FRUIT", "unit": "kg", "description": "Fresh mangoes (alphonso, kesar, etc.)"},
        {"produce_type": "GRAPES", "name": "Grapes", "category": "FRUIT", "unit": "kg", "description": "Table grapes (green, black, red)"},
        {"produce_type": "ORANGE", "name": "Orange", "category": "FRUIT", "unit": "kg", "description": "Fresh oranges"},
        {"produce_type": "POMEGRANATE", "name": "Pomegranate", "category": "FRUIT", "unit": "kg", "description": "Fresh pomegranates"},
        {"produce_type": "PAPAYA", "name": "Papaya", "category": "FRUIT", "unit": "kg", "description": "Fresh papaya"},
        {"produce_type": "GUAVA", "name": "Guava", "category": "FRUIT", "unit": "kg", "description": "Fresh guava"},
        {"produce_type": "WATERMELON", "name": "Watermelon", "category": "FRUIT", "unit": "kg", "description": "Fresh watermelon"},
        {"produce_type": "PINEAPPLE", "name": "Pineapple", "category": "FRUIT", "unit": "kg", "description": "Fresh pineapple"},
    ]
    
    for produce in vegetables + fruits:
        produce["is_active"] = True
        await db.produce_catalogue.update_one(
            {"produce_type": produce["produce_type"]},
            {"$setOnInsert": produce},
            upsert=True
        )


async def seed_handling_profiles(db: AsyncIOMotorDatabase) -> None:
    from app.core.constants import PRODUCE_HANDLING_PROFILES
    
    for produce_type, profile in PRODUCE_HANDLING_PROFILES.items():
        await db.handling_profiles.update_one(
            {"produce_type": produce_type},
            {"$setOnInsert": {
                "produce_type": produce_type,
                **profile,
                "is_active": True
            }},
            upsert=True
        )


async def seed_system_settings(db: AsyncIOMotorDatabase) -> None:
    settings = [
        {"key": "app_name", "value": "AgriChain", "description": "Application name"},
        {"key": "ledger_chain_id", "value": "AGRCHAIN-GLOBAL-001", "description": "Global ledger chain ID"},
        {"key": "default_currency", "value": "INR", "description": "Default currency code"},
        {"key": "simulator_default_interval", "value": "30", "description": "Default sensor simulation interval in seconds"},
    ]
    
    for setting in settings:
        await db.system_settings.update_one(
            {"key": setting["key"]},
            {"$setOnInsert": setting},
            upsert=True
        )

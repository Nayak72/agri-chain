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


async def create_indexes(db: AsyncIOMotorDatabase) -> None:
    logger.info("Creating database indexes...")
    
    # Users collection
    await db.users.create_index("email", unique=True)
    await db.users.create_index("role")
    await db.users.create_index("is_active")
    await db.users.create_index("created_at")
    
    # Farms collection
    await db.farms.create_index("farmer_id")
    await db.farms.create_index("name")
    await db.farms.create_index([("farmer_id", 1), ("name", 1)], unique=True)
    
    # Produce catalogue
    await db.produce_catalogue.create_index("produce_type", unique=True)
    await db.produce_catalogue.create_index("category")
    await db.produce_catalogue.create_index("is_active")
    
    # Handling profiles
    await db.handling_profiles.create_index("produce_type", unique=True)
    
    # Produce batches
    await db.produce_batches.create_index("batch_id", unique=True)
    await db.produce_batches.create_index("farmer_id")
    await db.produce_batches.create_index("farm_id")
    await db.produce_batches.create_index("produce_type")
    await db.produce_batches.create_index("harvest_date")
    await db.produce_batches.create_index("status")
    await db.produce_batches.create_index([("farmer_id", 1), ("status", 1)])
    await db.produce_batches.create_index([("produce_type", 1), ("status", 1)])
    
    # Warehouses
    await db.warehouses.create_index("manager_id")
    await db.warehouses.create_index("name", unique=True)
    await db.warehouses.create_index("location.city")
    await db.warehouses.create_index("is_active")
    
    # Warehouse receipts
    await db.warehouse_receipts.create_index("receipt_id", unique=True)
    await db.warehouse_receipts.create_index("warehouse_id")
    await db.warehouse_receipts.create_index("batch_id")
    await db.warehouse_receipts.create_index("farmer_id")
    await db.warehouse_receipts.create_index("receiving_date")
    await db.warehouse_receipts.create_index("status")
    
    # Quality inspections
    await db.quality_inspections.create_index("inspection_id", unique=True)
    await db.quality_inspections.create_index("receipt_id")
    await db.quality_inspections.create_index("batch_id")
    await db.quality_inspections.create_index("inspection_date")
    await db.quality_inspections.create_index("result")
    
    # Inventory items
    await db.inventory_items.create_index("inventory_id", unique=True)
    await db.inventory_items.create_index("warehouse_id")
    await db.inventory_items.create_index("batch_id")
    await db.inventory_items.create_index("produce_type")
    await db.inventory_items.create_index("status")
    await db.inventory_items.create_index([("warehouse_id", 1), ("batch_id", 1)], unique=True)
    await db.inventory_items.create_index([("batch_id", 1), ("status", 1)])
    await db.inventory_items.create_index("estimated_shelf_life_end")
    
    # Inventory movements
    await db.inventory_movements.create_index("movement_id", unique=True)
    await db.inventory_movements.create_index("inventory_id")
    await db.inventory_movements.create_index("batch_id")
    await db.inventory_movements.create_index("movement_type")
    await db.inventory_movements.create_index("created_at")
    await db.inventory_movements.create_index([("batch_id", 1), ("created_at", 1)])
    
    # Purchase orders
    await db.purchase_orders.create_index("order_id", unique=True)
    await db.purchase_orders.create_index("buyer_id")
    await db.purchase_orders.create_index("seller_id")
    await db.purchase_orders.create_index("produce_type")
    await db.purchase_orders.create_index("batch_id")
    await db.purchase_orders.create_index("status")
    await db.purchase_orders.create_index("order_date")
    await db.purchase_orders.create_index([("buyer_id", 1), ("status", 1)])
    await db.purchase_orders.create_index([("seller_id", 1), ("status", 1)])
    
    # Transporters
    await db.transporters.create_index("transporter_id", unique=True)
    await db.transporters.create_index("company_name", unique=True)
    await db.transporters.create_index("user_id", unique=True)
    await db.transporters.create_index("approval_status")
    await db.transporters.create_index("is_active")
    
    # Vehicles
    await db.vehicles.create_index("vehicle_id", unique=True)
    await db.vehicles.create_index("registration_number", unique=True)
    await db.vehicles.create_index("transporter_id")
    await db.vehicles.create_index("category")
    await db.vehicles.create_index("status")
    await db.vehicles.create_index([("transporter_id", 1), ("status", 1)])
    await db.vehicles.create_index("registration_expiry")
    await db.vehicles.create_index("insurance_expiry")
    await db.vehicles.create_index("fitness_expiry")
    
    # Drivers
    await db.drivers.create_index("driver_id", unique=True)
    await db.drivers.create_index("license_number", unique=True)
    await db.drivers.create_index("transporter_id")
    await db.drivers.create_index("status")
    await db.drivers.create_index([("transporter_id", 1), ("status", 1)])
    await db.drivers.create_index("license_expiry")
    
    # Freight bookings
    await db.freight_bookings.create_index("booking_id", unique=True)
    await db.freight_bookings.create_index("purchase_order_id")
    await db.freight_bookings.create_index("buyer_id")
    await db.freight_bookings.create_index("seller_id")
    await db.freight_bookings.create_index("status")
    await db.freight_bookings.create_index("requested_pickup_date")
    await db.freight_bookings.create_index([("status", 1), ("requested_pickup_date", 1)])
    
    # Freight quotations
    await db.freight_quotations.create_index("quotation_id", unique=True)
    await db.freight_quotations.create_index("booking_id")
    await db.freight_quotations.create_index("transporter_id")
    await db.freight_quotations.create_index("status")
    await db.freight_quotations.create_index("validity_date")
    await db.freight_quotations.create_index([("booking_id", 1), ("transporter_id", 1)], unique=True)
    
    # Shipments
    await db.shipments.create_index("shipment_id", unique=True)
    await db.shipments.create_index("booking_id")
    await db.shipments.create_index("purchase_order_id")
    await db.shipments.create_index("farmer_id")
    await db.shipments.create_index("buyer_id")
    await db.shipments.create_index("transporter_id")
    await db.shipments.create_index("vehicle_id")
    await db.shipments.create_index("driver_id")
    await db.shipments.create_index("status")
    await db.shipments.create_index("dispatch_date")
    await db.shipments.create_index("expected_arrival_date")
    await db.shipments.create_index([("transporter_id", 1), ("status", 1)])
    await db.shipments.create_index([("driver_id", 1), ("status", 1)])
    await db.shipments.create_index([("vehicle_id", 1), ("status", 1)])
    
    # Shipment items
    await db.shipment_items.create_index("item_id", unique=True)
    await db.shipment_items.create_index("shipment_id")
    await db.shipment_items.create_index("batch_id")
    await db.shipment_items.create_index([("shipment_id", 1), ("batch_id", 1)], unique=True)
    
    # Route checkpoints
    await db.route_checkpoints.create_index("checkpoint_id", unique=True)
    await db.route_checkpoints.create_index("shipment_id")
    await db.route_checkpoints.create_index("sequence")
    await db.route_checkpoints.create_index([("shipment_id", 1), ("sequence", 1)], unique=True)
    await db.route_checkpoints.create_index("status")
    
    # Shipment events
    await db.shipment_events.create_index("event_id", unique=True)
    await db.shipment_events.create_index("shipment_id")
    await db.shipment_events.create_index("event_type")
    await db.shipment_events.create_index("created_at")
    await db.shipment_events.create_index([("shipment_id", 1), ("created_at", 1)])
    
    # Sensor sessions
    await db.sensor_sessions.create_index("session_id", unique=True)
    await db.sensor_sessions.create_index("shipment_id", unique=True)
    await db.sensor_sessions.create_index("status")
    
    # Sensor readings
    await db.sensor_readings.create_index("reading_id", unique=True)
    await db.sensor_readings.create_index("session_id")
    await db.sensor_readings.create_index("shipment_id")
    await db.sensor_readings.create_index("timestamp")
    await db.sensor_readings.create_index([("shipment_id", 1), ("timestamp", 1)])
    await db.sensor_readings.create_index("status")
    
    # Sensor alerts
    await db.sensor_alerts.create_index("alert_id", unique=True)
    await db.sensor_alerts.create_index("shipment_id")
    await db.sensor_alerts.create_index("reading_id")
    await db.sensor_alerts.create_index("alert_type")
    await db.sensor_alerts.create_index("severity")
    await db.sensor_alerts.create_index("status")
    await db.sensor_alerts.create_index("created_at")
    await db.sensor_alerts.create_index([("shipment_id", 1), ("status", 1)])
    
    # Delivery reports
    await db.delivery_reports.create_index("report_id", unique=True)
    await db.delivery_reports.create_index("shipment_id", unique=True)
    await db.delivery_reports.create_index("status")
    await db.delivery_reports.create_index("delivery_date")
    
    # Damage claims
    await db.damage_claims.create_index("claim_id", unique=True)
    await db.damage_claims.create_index("shipment_id")
    await db.damage_claims.create_index("batch_id")
    await db.damage_claims.create_index("reported_by")
    await db.damage_claims.create_index("status")
    await db.damage_claims.create_index("created_at")
    
    # Ledger blocks
    await db.ledger_blocks.create_index([("chain_id", 1), ("index", 1)], unique=True)
    await db.ledger_blocks.create_index("block_id", unique=True)
    await db.ledger_blocks.create_index("previous_hash")
    await db.ledger_blocks.create_index("event_type")
    await db.ledger_blocks.create_index("entity_type")
    await db.ledger_blocks.create_index("entity_id")
    await db.ledger_blocks.create_index("actor_id")
    await db.ledger_blocks.create_index("timestamp")
    await db.ledger_blocks.create_index([("entity_type", 1), ("entity_id", 1), ("timestamp", 1)])
    
    # Ledger heads
    await db.ledger_heads.create_index("chain_id", unique=True)
    
    # Notifications
    await db.notifications.create_index("notification_id", unique=True)
    await db.notifications.create_index("user_id")
    await db.notifications.create_index("is_read")
    await db.notifications.create_index("created_at")
    await db.notifications.create_index([("user_id", 1), ("is_read", 1), ("created_at", -1)])
    
    # System settings
    await db.system_settings.create_index("key", unique=True)
    
    logger.info("Database indexes created successfully")


async def seed_initial_data(db: AsyncIOMotorDatabase) -> None:
    logger.info("Seeding initial data...")
    
    # Seed produce catalogue
    await seed_produce_catalogue(db)
    
    # Seed handling profiles
    await seed_handling_profiles(db)
    
    # Seed system settings
    await seed_system_settings(db)
    
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
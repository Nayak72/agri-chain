"""
One-off idempotent database migration script to backfill missing fields
in legacy documents without modifying user-managed fields like is_active.
"""
import asyncio
from datetime import datetime, timezone
import logging
from app.db.mongodb import connect_to_mongo, close_mongo_connection, get_database

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migrate_backfill")


async def run_migration():
    logger.info("Starting legacy data backfill migration...")
    await connect_to_mongo()
    db = get_database()
    now = datetime.now(timezone.utc)

    # 1. Backfill produce_catalogue timestamps where missing
    res1 = await db.produce_catalogue.update_many(
        {"created_at": {"$exists": False}},
        {"$set": {"created_at": now}}
    )
    res2 = await db.produce_catalogue.update_many(
        {"updated_at": {"$exists": False}},
        {"$set": {"updated_at": now}}
    )
    logger.info(f"Produce catalogue backfilled: {res1.modified_count} created_at, {res2.modified_count} updated_at")

    # 2. Backfill farms optional fields if missing
    res3 = await db.farms.update_many(
        {"certifications": {"$exists": False}},
        {"$set": {"certifications": []}}
    )
    logger.info(f"Farms certifications backfilled: {res3.modified_count}")

    # 3. Ensure all existing inventory_items have an inventory_id
    cursor = db.inventory_items.find({"inventory_id": {"$exists": False}})
    import uuid
    count = 0
    async for item in cursor:
        inv_id = f"INV-{item.get('warehouse_id', 'WH')[:6]}-{uuid.uuid4().hex[:6].upper()}"
        await db.inventory_items.update_one({"_id": item["_id"]}, {"$set": {"inventory_id": inv_id}})
        count += 1
    logger.info(f"Inventory items inventory_id backfilled: {count}")

    await close_mongo_connection()
    logger.info("Migration completed successfully.")


if __name__ == "__main__":
    asyncio.run(run_migration())


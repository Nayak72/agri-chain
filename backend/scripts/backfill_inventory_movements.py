"""Create truthful opening-balance movements for legacy inventory.

Dry run by default. With --apply, each inventory row is locked and checked again
inside a transaction. Existing histories are never changed or reconstructed.
"""
import argparse
import asyncio
import os
import sys
import math
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.db.mongodb import connect_to_mongo, close_mongo_connection, get_database
from app.db.unit_of_work import run_in_txn


async def backfill(db, apply=False):
    counts = {'eligible': 0, 'created': 0, 'existing': 0, 'invalid': 0}
    async for item in db.inventory_items.find({}, {'_id': 1}):
        inv_id = item['_id']
        async def check(session):
            if await db.inventory_movements.find_one({'inventory_id': str(inv_id)}, session=session):
                return 'existing'
            # A write to the balance document serializes against reservations.
            if apply:
                result = await db.inventory_items.update_one({'_id': inv_id}, {'$inc': {'movement_backfill_revision': 1}}, session=session)
                if not result.matched_count:
                    return 'invalid'
            current = await db.inventory_items.find_one({'_id': inv_id}, session=session)
            if not current:
                return 'invalid'
            if await db.inventory_movements.find_one({'inventory_id': str(inv_id)}, session=session):
                return 'existing'
            try:
                accepted, available = float(current['accepted_kg']), float(current['available_kg'])
                if not math.isfinite(accepted) or not math.isfinite(available) or not 0 <= available <= accepted:
                    return 'invalid'
            except (ValueError, TypeError, KeyError):
                return 'invalid'
            if not apply:
                return 'eligible'
            await db.inventory_movements.insert_one({
                'type': 'OPENING_BALANCE', 'inventory_id': str(inv_id),
                'batch_id': current.get('batch_id'), 'warehouse_id': current.get('warehouse_id'),
                'accepted_kg': accepted, 'new_available_kg': available,
                'reason': 'Legacy snapshot; prior movements cannot be reconstructed',
                'reference_type': 'MIGRATION', 'reference_id': str(inv_id),
                'actor_id': 'system:migration', 'actor_role': 'SYSTEM',
                'created_at': datetime.now(timezone.utc),
            }, session=session)
            return 'created'
        outcome = await run_in_txn(check) if apply else await check(None)
        counts[outcome] += 1
    return counts


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='write opening balances; default is dry run')
    args = parser.parse_args()
    await connect_to_mongo()
    try:
        print(await backfill(get_database(), apply=args.apply))
    finally:
        await close_mongo_connection()


if __name__ == '__main__':
    asyncio.run(main())

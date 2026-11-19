"""Migrate inventory balances to whole grams (dry run unless --apply).

Back up the database and quiesce old application workers before applying. Old
workers do not update gram balances and are incompatible with this migration.
Rows with fractional grams, invalid values or partial migrations are reported
and left untouched for manual reconciliation; no rounding is performed.
"""
import argparse
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.db.mongodb import connect_to_mongo, close_mongo_connection, get_database
from app.db.unit_of_work import run_in_txn
from app.services.inventory_service import ensure_gram_balance, kilograms_to_grams
from app.core.exceptions import ConflictError


async def migrate(db, apply=False):
    summary = {'eligible': 0, 'migrated': 0, 'already_migrated': 0, 'invalid': 0}
    async for item in db.inventory_items.find({}):
        try:
            if 'accepted_g' in item or 'available_g' in item:
                if not (isinstance(item.get('accepted_g'), int) and isinstance(item.get('available_g'), int)
                        and 0 <= item['available_g'] <= item['accepted_g']):
                    raise ValueError('Incomplete or invalid gram balance')
                if (kilograms_to_grams(item['accepted_kg']) != item['accepted_g'] or
                        kilograms_to_grams(item['available_kg']) != item['available_g']):
                    raise ValueError('Kilogram cache differs from gram balance')
                summary['already_migrated'] += 1
                continue
            accepted = kilograms_to_grams(item['accepted_kg'])
            available = kilograms_to_grams(item['available_kg'])
            if available > accepted:
                raise ValueError('Available balance exceeds accepted balance')
            if apply:
                async def convert(session):
                    return await ensure_gram_balance(db, str(item['_id']), session)
                await run_in_txn(convert)
                summary['migrated'] += 1
            else:
                summary['eligible'] += 1
        except (KeyError, ValueError, ConflictError) as exc:
            summary['invalid'] += 1
            print(f"Inventory {item['_id']}: {exc}", file=sys.stderr)
    return summary


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    await connect_to_mongo()
    try:
        result = await migrate(get_database(), args.apply)
        print(result)
        return 1 if result['invalid'] else 0
    finally:
        await close_mongo_connection()


if __name__ == '__main__':
    raise SystemExit(asyncio.run(main()))

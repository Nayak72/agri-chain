"""Transaction-serialized warehouse capacity accounting.

Occupancy is accepted stock less recorded dispatches plus recorded returns.
Legacy records with no dispatch movement remain counted conservatively. Unknown
cold-storage classification is counted as cold in refrigerated warehouses.
"""
from datetime import datetime, timezone
from bson import ObjectId
from app.core.exceptions import ConflictError, ValidationError


async def lock_warehouse(db, warehouse_id, session):
    if not warehouse_id or not ObjectId.is_valid(warehouse_id):
        raise ConflictError('Warehouse allocation is missing or invalid')
    result = await db.warehouses.update_one({'_id': ObjectId(warehouse_id)},
        {'$inc': {'capacity_revision': 1}, '$set': {'capacity_checked_at': datetime.now(timezone.utc)}}, session=session)
    if not result.matched_count:
        raise ConflictError('Warehouse allocation no longer exists')
    return await db.warehouses.find_one({'_id': ObjectId(warehouse_id)}, session=session)


async def occupancy(db, warehouse_id, warehouse, session):
    # Transaction snapshot + common warehouse write serializes receipts,
    # dispatches, returns and capacity changes across application workers.
    pipeline = [
        {'$match': {'warehouse_id': str(warehouse_id)}},
        {'$lookup': {'from': 'inventory_movements', 'let': {'inv': {'$toString': '$_id'}}, 'pipeline': [
            {'$match': {'$expr': {'$and': [{'$eq': ['$inventory_id', '$$inv']},
                                           {'$in': ['$type', ['DISPATCH', 'RETURN_RECEIPT_RESERVED']]}]}}},
            {'$group': {'_id': None, 'net_out': {'$sum': {'$cond': [
                {'$eq': ['$type', 'DISPATCH']}, '$quantity_kg', {'$multiply': [-1, '$quantity_kg']}]}}}}
        ], 'as': 'custody'}},
        {'$set': {'net_out': {'$ifNull': [{'$arrayElemAt': ['$custody.net_out', 0]}, 0]}}},
        {'$set': {'stored': {'$max': [0, {'$subtract': [{'$ifNull': ['$accepted_kg', 0]}, '$net_out']}]}}},
        {'$group': {'_id': None, 'total': {'$sum': '$stored'}, 'cold': {'$sum': {'$cond': [
            {'$ifNull': ['$cold_storage', bool(warehouse.get('has_refrigeration'))]}, '$stored', 0]}}}},
    ]
    result = await db.inventory_items.aggregate(pipeline, session=session).to_list(1)
    return (result[0]['total'], result[0]['cold']) if result else (0.0, 0.0)


async def check_capacity(db, warehouse_id, added_kg, cold_storage, session):
    warehouse = await lock_warehouse(db, warehouse_id, session)
    if warehouse.get('is_active') is False:
        raise ConflictError('Warehouse is inactive')
    capacity = warehouse.get('capacity_kg')
    if capacity is None:
        raise ConflictError('Warehouse capacity must be configured before receiving stock')
    total, cold = await occupancy(db, warehouse_id, warehouse, session)
    if total + added_kg > capacity + 1e-9:
        raise ConflictError('Warehouse capacity would be exceeded')
    if cold_storage:
        if not warehouse.get('has_refrigeration'):
            raise ValidationError('Selected warehouse has no refrigeration')
        if cold + added_kg > float(warehouse.get('cold_storage_capacity_kg') or 0) + 1e-9:
            raise ConflictError('Warehouse cold-storage capacity would be exceeded')
    return warehouse

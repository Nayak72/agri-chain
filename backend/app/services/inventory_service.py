"""Transactional whole-gram stock balances, with kilogram API compatibility."""
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from bson import ObjectId
from app.core.exceptions import InsufficientStockError, ConflictError


def kilograms_to_grams(value):
    try:
        quantity = Decimal(str(value))
        grams = quantity * 1000
        if not quantity.is_finite() or grams != grams.to_integral_value() or grams < 0:
            raise ValueError('Quantity must be a non-negative whole number of grams')
        return int(grams)
    except (InvalidOperation, TypeError) as exc:
        raise ValueError('Invalid quantity') from exc


async def ensure_gram_balance(db, inv_id, session):
    """Convert legacy stock under transaction; never silently round a balance."""
    document = await db.inventory_items.find_one({'_id': ObjectId(inv_id)}, session=session)
    if not document:
        raise ConflictError('Inventory allocation no longer exists')
    if 'accepted_g' in document and 'available_g' in document:
        if not (isinstance(document['accepted_g'], int) and isinstance(document['available_g'], int)
                and 0 <= document['available_g'] <= document['accepted_g']):
            raise ConflictError('Invalid inventory gram balance; reconcile before use')
        try:
            if (kilograms_to_grams(document['accepted_kg']) != document['accepted_g'] or
                    kilograms_to_grams(document['available_kg']) != document['available_g']):
                raise ValueError('Kilogram cache differs from gram balance')
        except (KeyError, ValueError) as exc:
            raise ConflictError('Inventory gram balance and kilogram cache disagree; reconcile before use') from exc
        return document
    if 'accepted_g' in document or 'available_g' in document:
        raise ConflictError('Incomplete gram migration; reconcile before use')
    try:
        accepted = kilograms_to_grams(document['accepted_kg'])
        available = kilograms_to_grams(document['available_kg'])
    except (KeyError, ValueError) as exc:
        raise ConflictError('Legacy inventory is not representable in whole grams; reconcile before use') from exc
    if available > accepted:
        raise ConflictError('Legacy available stock exceeds accepted stock')
    result = await db.inventory_items.update_one(
        {'_id': document['_id'], 'accepted_g': {'$exists': False}, 'available_g': {'$exists': False},
         'accepted_kg': document['accepted_kg'], 'available_kg': document['available_kg']},
        {'$set': {'accepted_g': accepted, 'available_g': available,
                  'accepted_kg': accepted / 1000, 'available_kg': available / 1000,
                  'balance_unit': 'g', 'updated_at': datetime.now(timezone.utc)}}, session=session)
    if result.matched_count != 1:
        raise ConflictError('Inventory changed during balance migration; retry')
    document.update(accepted_g=accepted, available_g=available,
                    accepted_kg=accepted / 1000, available_kg=available / 1000)
    return document


async def reserve_stock(db, inv_id: str, qty: float, session):
    grams = kilograms_to_grams(qty)
    if grams <= 0:
        raise ValueError('Quantity must be positive')
    await ensure_gram_balance(db, inv_id, session)
    result = await db.inventory_items.update_one(
        {'_id': ObjectId(inv_id), 'available_g': {'$gte': grams}},
        [{'$set': {'available_kg': {'$divide': [{'$subtract': ['$available_g', grams]}, 1000]},
                   'available_g': {'$subtract': ['$available_g', grams]}, 'updated_at': datetime.now(timezone.utc)}}],
        session=session)
    if result.modified_count != 1:
        current = await db.inventory_items.find_one({'_id': ObjectId(inv_id)}, session=session)
        raise InsufficientStockError((current.get('available_g', 0) / 1000) if current else 0, qty)


async def release_stock(db, inv_id: str, qty: float, session):
    grams = kilograms_to_grams(qty)
    if grams <= 0:
        raise ValueError('Quantity must be positive')
    await ensure_gram_balance(db, inv_id, session)
    result = await db.inventory_items.update_one(
        {'_id': ObjectId(inv_id), '$expr': {'$lte': [{'$add': ['$available_g', grams]}, '$accepted_g']}},
        [{'$set': {'available_kg': {'$divide': [{'$add': ['$available_g', grams]}, 1000]},
                   'available_g': {'$add': ['$available_g', grams]}, 'updated_at': datetime.now(timezone.utc)}}],
        session=session)
    if result.modified_count != 1:
        raise ConflictError('Stock release would exceed accepted quantity')

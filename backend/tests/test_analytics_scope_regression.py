from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.access import shipment_reference_scope, shipment_scope
from app.core.constants import UserRole
from app.core.exceptions import ForbiddenError


@pytest.mark.asyncio
async def test_unlinked_driver_and_transporter_have_empty_shipment_scope():
    db = MagicMock()
    db.drivers.find_one = AsyncMock(return_value=None)
    db.transporters.find_one = AsyncMock(return_value=None)
    for role in (UserRole.DRIVER, UserRole.TRANSPORTER):
        assert await shipment_scope(db, {'role': role, 'sub': 'user'}) == {'_id': {'$in': []}}


@pytest.mark.asyncio
async def test_warehouse_scope_uses_only_assigned_inventory():
    db = MagicMock()
    db.warehouses.find.return_value.to_list = AsyncMock(return_value=[{'_id': 'warehouse'}])
    db.inventory_items.find.return_value.to_list = AsyncMock(return_value=[{'batch_id': 'batch'}])
    assert await shipment_scope(db, {'role': UserRole.WAREHOUSE_MANAGER, 'sub': 'manager'}) == {'batch_ids': {'$in': ['batch']}}
    assert db.inventory_items.find.call_args.args[0] == {'warehouse_id': {'$in': ['warehouse']}}


@pytest.mark.asyncio
async def test_related_records_are_filtered_to_owned_shipment_ids():
    db = MagicMock()
    db.shipments.find.return_value.to_list = AsyncMock(return_value=[{'_id': 'internal', 'shipment_id': 'public'}])
    assert await shipment_reference_scope(db, {'role': UserRole.BUYER, 'sub': 'buyer'}) == {'shipment_id': {'$in': ['internal', 'public']}}
    assert db.shipments.find.call_args.args[0] == {'buyer_id': 'buyer'}
    with pytest.raises(ForbiddenError):
        await shipment_scope(db, {'role': 'unknown', 'sub': 'user'})

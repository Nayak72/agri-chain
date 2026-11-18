from unittest.mock import MagicMock, AsyncMock

import pytest

from app.api.v1.endpoints.inventory import list_inventory, list_warehouse_receipts
from app.core.constants import UserRole


@pytest.mark.asyncio
@pytest.mark.parametrize('endpoint,collection', [(list_inventory, 'inventory_items'), (list_warehouse_receipts, 'warehouse_receipts')])
@pytest.mark.parametrize('requested,expected', [('owned', ['owned']), ('other', []), (None, ['owned'])])
async def test_manager_warehouse_filter_never_expands_scope(endpoint, collection, requested, expected):
    db = MagicMock()
    db.warehouses.find.return_value.to_list = AsyncMock(return_value=[{'_id': 'owned'}])
    cursor = getattr(db, collection).find.return_value
    cursor.sort.return_value.skip.return_value.limit.return_value.to_list = AsyncMock(return_value=[])
    kwargs = dict(page=1, page_size=20, warehouse_id=requested, batch_id=None, status=None,
                  current_user={'role': UserRole.WAREHOUSE_MANAGER, 'sub': 'manager'}, db=db)
    if endpoint is list_inventory:
        kwargs['produce_type'] = None
    await endpoint(**kwargs)
    assert getattr(db, collection).find.call_args.args[0]['warehouse_id'] == {'$in': expected}

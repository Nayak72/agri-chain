from unittest.mock import AsyncMock, MagicMock
import pytest
from app.core.access import assert_can_view_shipment
from app.core.exceptions import ForbiddenError


@pytest.mark.asyncio
async def test_manager_shipment_access_uses_inventory_ownership():
    db = MagicMock()
    db.warehouses.find.return_value.to_list = AsyncMock(return_value=[{"_id": "warehouse-1"}])
    db.inventory_items.find_one = AsyncMock(return_value={"batch_id": "batch-1"})
    user = {"role": "WAREHOUSE_MANAGER", "sub": "manager-1"}
    shipment = {"batch_ids": ["batch-1"]}
    await assert_can_view_shipment(db, user, shipment)
    query = db.inventory_items.find_one.await_args.args[0]
    assert query == {"warehouse_id": {"$in": ["warehouse-1"]}, "batch_id": {"$in": ["batch-1"]}}
    db.inventory_items.find_one = AsyncMock(return_value=None)
    with pytest.raises(ForbiddenError):
        await assert_can_view_shipment(db, user, shipment)

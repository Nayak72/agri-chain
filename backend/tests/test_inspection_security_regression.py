from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.api.v1.endpoints.auth import _user_payload
from app.api.v1.endpoints.inventory import WarehouseReceiptCreate, create_warehouse_receipt
from app.core.constants import InspectionResult, UserRole
from app.core.exceptions import ForbiddenError, ValidationError


def test_unknown_role_is_not_coerced_to_farmer():
    with pytest.raises(ForbiddenError):
        _user_payload({'_id': 'u', 'role': 'UNKNOWN'})


@pytest.mark.asyncio
async def test_failed_inspection_cannot_create_accepted_stock():
    data = WarehouseReceiptCreate(warehouse_id='wh', batch_id='batch', received_weight_kg=10,
        accepted_weight_kg=10, damaged_weight_kg=0, rejected_weight_kg=0,
        inspection_result=InspectionResult.FAILED, storage_location='A')
    warehouse = {'_id': 'wh', 'manager_id': 'manager'}
    batch = {'_id': 'batch', 'status': 'CREATED', 'initial_quantity_kg': 10, 'farmer_id': 'farmer'}
    with patch('app.api.v1.endpoints.inventory.resolve_doc', new=AsyncMock(side_effect=[warehouse, batch])):
        with pytest.raises(ValidationError):
            await create_warehouse_receipt('wh', data, {'sub': 'manager', 'role': UserRole.WAREHOUSE_MANAGER}, MagicMock())

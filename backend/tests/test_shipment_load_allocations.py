from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from bson import ObjectId
from app.api.v1.endpoints.shipments import ShipmentLoad, load_shipment
from app.core.exceptions import ValidationError

@pytest.mark.asyncio
@pytest.mark.parametrize('items', [
    [{'batch_id': 'other', 'quantity_kg': 10}],
    [{'batch_id': 'batch', 'quantity_kg': -10}, {'batch_id': 'batch', 'quantity_kg': 20}],
    [{'batch_id': 'batch', 'quantity_kg': float('nan')}],
    [{'batch_id': 'batch', 'quantity_kg': 9.999}],
])
async def test_load_rejects_invalid_allocation_before_writes(items):
    shipment = {'_id': ObjectId(), 'status': 'DRIVER_ASSIGNED', 'cargo_quantity_kg': 10,
                'batch_ids': ['batch'], 'buyer_id': 'buyer'}
    db = MagicMock()
    with patch('app.api.v1.endpoints.shipments.resolve_doc', new=AsyncMock(return_value=shipment)), \
         patch('app.api.v1.endpoints.shipments.assert_can_view_shipment', new=AsyncMock()):
        with pytest.raises(ValidationError):
            await load_shipment('shipment', ShipmentLoad(actual_weight_kg=10, actual_package_count=1, batch_quantities=items),
                                {'role': 'ADMIN', 'sub': 'admin'}, db)
    db.shipment_items.update_one.assert_not_called()

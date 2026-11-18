from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from bson import ObjectId
from app.api.v1.endpoints import purchase_orders, freight_bookings
from app.core.exceptions import ForbiddenError

@pytest.mark.asyncio
@pytest.mark.parametrize('role', ['DRIVER', 'TRANSPORTER'])
async def test_unrelated_roles_cannot_list_or_view_purchase_orders(role):
    db = MagicMock()
    with pytest.raises(ForbiddenError):
        await purchase_orders.list_purchase_orders(page=1, page_size=20, status=None, current_user={'role': role, 'sub': 'u'}, db=db)
    order = {'_id': ObjectId(), 'seller_id': 'farmer', 'buyer_id': 'buyer'}
    with patch.object(purchase_orders, 'resolve_doc', new=AsyncMock(return_value=order)):
        with pytest.raises(ForbiddenError):
            await purchase_orders.get_purchase_order('order', {'role': role, 'sub': 'u'}, db)

@pytest.mark.asyncio
async def test_transporter_cannot_read_other_company_confirmed_booking():
    db = MagicMock()
    db.transporters.find_one = AsyncMock(return_value={'_id': ObjectId()})
    db.freight_quotations.find_one = AsyncMock(return_value=None)
    booking = {'_id': ObjectId(), 'status': 'CONFIRMED', 'accepted_quotation_id': str(ObjectId())}
    with patch.object(freight_bookings, 'resolve_doc', new=AsyncMock(return_value=booking)):
        with pytest.raises(ForbiddenError):
            await freight_bookings.get_freight_booking('booking', {'role': 'TRANSPORTER', 'sub': 'u'}, db)

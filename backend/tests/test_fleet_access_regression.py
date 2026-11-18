from unittest.mock import AsyncMock, MagicMock

import pytest

from app.api.v1.endpoints import analytics, drivers, vehicles
from app.core.constants import UserRole
from app.core.exceptions import ForbiddenError


@pytest.mark.asyncio
@pytest.mark.parametrize('role', [UserRole.FARMER, UserRole.BUYER, UserRole.WAREHOUSE_MANAGER])
@pytest.mark.parametrize('endpoint,kwargs', [
    (vehicles.list_vehicles, {'page': 1, 'page_size': 20, 'transporter_id': None, 'category': None, 'status': None}),
    (vehicles.get_vehicle, {'vehicle_id': 'any'}),
    (drivers.list_drivers, {'page': 1, 'page_size': 20, 'transporter_id': None, 'status': None}),
    (drivers.get_driver, {'driver_id': 'any'}),
    (analytics.get_fleet_analytics, {}),
])
async def test_unrelated_roles_cannot_read_fleet(endpoint, kwargs, role):
    with pytest.raises(ForbiddenError):
        await endpoint(current_user={'role': role, 'sub': 'user'}, db=MagicMock(), **kwargs)


@pytest.mark.asyncio
async def test_missing_transporter_does_not_expose_global_fleet_metrics():
    db = MagicMock()
    db.transporters.find_one = AsyncMock(return_value=None)
    db.vehicles.count_documents = AsyncMock(return_value=0)
    db.drivers.count_documents = AsyncMock(return_value=0)
    await analytics.get_fleet_analytics(current_user={'role': UserRole.TRANSPORTER, 'sub': 'user'}, db=db)
    assert all(call.args[0]['transporter_id'] == {'$in': []} for call in db.vehicles.count_documents.call_args_list)
    assert all(call.args[0]['transporter_id'] == {'$in': []} for call in db.drivers.count_documents.call_args_list)

from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from pathlib import Path
import re
import pytest
from bson import ObjectId
from pydantic import ValidationError as SchemaError
from app.api.v1.endpoints import farms, drivers, produce, freight_quotes, purchase_orders
from app.core.constants import ProduceType, VehicleCategory
from app.core.exceptions import ValidationError, ForbiddenError
from scripts.seed_demo import ensure, validate_demo_target

@pytest.mark.asyncio
async def test_farmer_cannot_assign_farm_to_another_user():
    db = MagicMock()
    db.farms.find_one = AsyncMock(return_value=None)
    db.farms.insert_one = AsyncMock(return_value=SimpleNamespace(inserted_id=ObjectId()))
    result = await farms.create_farm(farms.FarmCreate(name='Demo', city='Nashik', state='MH', pincode='422001', farmer_id=str(ObjectId())), {'sub': 'owner', 'role': 'FARMER'}, db)
    assert result.farmer_id == 'owner'

@pytest.mark.asyncio
@pytest.mark.parametrize('eligible', [True, False])
async def test_admin_farm_owner_must_be_active(eligible):
    db = MagicMock()
    owner = ObjectId()
    db.users.find_one = AsyncMock(return_value={'_id': owner, 'role': 'FARMER', 'is_active': eligible, 'is_approved': True})
    db.farms.find_one = AsyncMock(return_value=None)
    db.farms.insert_one = AsyncMock(return_value=SimpleNamespace(inserted_id=ObjectId()))
    data = farms.FarmCreate(name='Demo', city='Nashik', state='MH', pincode='422001', farmer_id=str(owner))
    if eligible:
        assert (await farms.create_farm(data, {'sub': 'admin', 'role': 'ADMIN'}, db)).farmer_id == str(owner)
    else:
        with pytest.raises(ValidationError):
            await farms.create_farm(data, {'sub': 'admin', 'role': 'ADMIN'}, db)
        db.farms.insert_one.assert_not_called()

@pytest.mark.asyncio
async def test_driver_retains_resolved_transporter():
    db = MagicMock()
    carrier = {'_id': ObjectId(), 'user_id': 'carrier-user'}
    db.transporters.find_one = AsyncMock(return_value=carrier)
    db.drivers.find_one = AsyncMock(return_value=None)
    db.drivers.insert_one = AsyncMock(return_value=SimpleNamespace(inserted_id=ObjectId()))
    result = await drivers.create_driver(drivers.DriverCreate(name='Driver', phone='123', city='Nashik', state='MH'), {'sub': 'carrier-user', 'role': 'TRANSPORTER'}, db)
    assert result.transporter_id == str(carrier['_id'])

@pytest.mark.parametrize('field,value', [('produce_type', 'UNKNOWN'), ('category', 'VEGETABLES')])
def test_catalogue_rejects_unsupported_values(field, value):
    values = dict(produce_type='TOMATO', name='Tomato', category='VEGETABLE', unit='KG')
    values[field] = value
    with pytest.raises(SchemaError):
        produce.ProduceCreate(**values)

def test_frontend_enum_parity():
    source = (Path(__file__).parents[2] / 'frontend/src/constants/domain.js').read_text()
    for name, enum in [('PRODUCE_TYPES', ProduceType), ('VEHICLE_CATEGORIES', VehicleCategory)]:
        values = re.findall(r"'([^']+)'", source.split(f'export const {name} = ')[1].split('\n')[0])
        assert set(values) == {item.value for item in enum}

@pytest.mark.asyncio
async def test_seed_ensure_does_not_overwrite_existing_assignments():
    collection = MagicMock()
    existing = {'_id': ObjectId(), 'status': 'ASSIGNED', 'current_assignment': 'shipment'}
    collection.find_one = AsyncMock(return_value=existing)
    assert await ensure({'vehicles': collection}, 'vehicles', {'vehicle_id': 'demo'}, {'status': 'AVAILABLE'}) == existing
    collection.insert_one.assert_not_called()

@pytest.mark.parametrize('env,name', [('production', 'agri_chain_demo'), ('development', 'agri_chain'), ('test', 'production')])
def test_seed_refuses_non_demo_target(env, name):
    with pytest.raises(RuntimeError):
        validate_demo_target(SimpleNamespace(app_env=env, database_name=name))

@pytest.mark.asyncio
async def test_unapproved_transporter_cannot_quote():
    db = MagicMock()
    db.transporters.find_one = AsyncMock(return_value={'_id': ObjectId(), 'approval_status': 'PENDING'})
    with pytest.raises(ForbiddenError):
        await freight_quotes.create_freight_quotation(freight_quotes.FreightQuotationCreate(booking_id='b', proposed_vehicle_category='REFRIGERATED_TRUCK', freight_base_charge_paise=100, planned_distance_km=100, estimated_transit_hours=2), {'sub': 'carrier', 'role': 'TRANSPORTER'}, db)
    db.freight_quotations.insert_one.assert_not_called()

@pytest.mark.asyncio
async def test_order_rejects_unreceived_batch_and_seller_spoofing():
    batch = {'_id': ObjectId(), 'produce_type': 'TOMATO', 'farmer_id': str(ObjectId()), 'status': 'CREATED'}
    db = MagicMock()
    db.produce_batches.find_one = AsyncMock(return_value=batch)
    db.users.find_one = AsyncMock(return_value={'role': 'FARMER'})
    for seller, message in [(batch['farmer_id'], 'warehouse'), ('other', 'does not own')]:
        with pytest.raises(ValidationError, match=message):
            await purchase_orders.create_purchase_order(purchase_orders.PurchaseOrderCreate(batch_id=str(batch['_id']), seller_id=seller, produce_type='TOMATO', requested_quantity_kg=500, unit_price_paise=3000, preferred_delivery_date=date.today()), {'sub': 'buyer', 'role': 'BUYER'}, db)
    db.purchase_orders.insert_one.assert_not_called()

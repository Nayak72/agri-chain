import pytest
from pydantic import ValidationError as PydanticValidationError
from app.api.v1.endpoints.inventory import WarehouseReceiptCreate
from app.api.v1.endpoints.delivery import ConfirmDeliveryRequest
from app.api.v1.endpoints.shipments import ShipmentLoad

@pytest.mark.parametrize('quantity', [float('nan'), float('inf'), 0.0001])
def test_delivery_rejects_nonfinite_or_subgram_values(quantity):
    with pytest.raises(PydanticValidationError):
        ConfirmDeliveryRequest(delivered_quantity_kg=quantity, received_by='Buyer')

@pytest.mark.parametrize('quantity', [float('nan'), float('inf'), 0.0001])
def test_receipt_rejects_nonfinite_or_subgram_values(quantity):
    with pytest.raises(PydanticValidationError):
        WarehouseReceiptCreate(warehouse_id='w', batch_id='b', received_weight_kg=quantity, accepted_weight_kg=0, storage_location='A')

@pytest.mark.parametrize('quantity', [float('nan'), float('inf'), 0.0001])
def test_load_rejects_nonfinite_or_subgram_values(quantity):
    with pytest.raises(PydanticValidationError):
        ShipmentLoad(actual_weight_kg=quantity, actual_package_count=1)

"""Boundary conditions, invariant validation, and error scenarios.

Verifies:
- Warehouse intake exact weight reconciliation (accepted + damaged + rejected == received).
- Rejection of invalid ObjectIds vs public human business identifiers.
- Telemetry cold chain compliance returns None on 0 readings.
- Negative quantities and invalid boundary values.
"""

import pytest
from bson import ObjectId
from pydantic import ValidationError as PydanticValidationError
from app.core.exceptions import ValidationError, NotFoundError
from app.api.v1.endpoints.inventory import WarehouseReceiptCreate, create_warehouse_receipt
from app.api.v1.endpoints.purchase_orders import PurchaseOrderCreate
from app.api.v1.endpoints.freight_bookings import FreightBookingCreate
from app.api.v1.endpoints.delivery import DeliveryReportCreate
from app.core.constants import UserRole, InspectionResult, QualityGrade
from unittest.mock import AsyncMock, MagicMock
from datetime import date, datetime, timezone


class TestWarehouseWeightReconciliation:
    """Tests exact quantity reconciliation for warehouse receipts."""

    def test_reconciliation_exact_equality(self):
        """Valid when received equals exact sum of accepted + damaged + rejected."""
        receipt = WarehouseReceiptCreate(
            warehouse_id=str(ObjectId()),
            batch_id=str(ObjectId()),
            farmer_id=str(ObjectId()),
            received_weight_kg=5000.0,
            accepted_weight_kg=4800.0,
            damaged_weight_kg=150.0,
            rejected_weight_kg=50.0,
            inspection_result=InspectionResult.PASSED,
            quality_grade=QualityGrade.GRADE_A,
            packaging_condition="GOOD",
            storage_location="Bay 1",
        )
        assert receipt.received_weight_kg == 5000.0
        assert receipt.accepted_weight_kg + receipt.damaged_weight_kg + receipt.rejected_weight_kg == 5000.0

    @pytest.mark.asyncio
    async def test_reconciliation_discrepancy_rejected(self):
        """Backend endpoint rejects intake when weights do not sum up."""
        mock_db = MagicMock()
        mock_db.warehouses.find_one = AsyncMock(return_value={"_id": ObjectId(), "manager_id": "mgr1"})
        mock_db.produce_batches.find_one = AsyncMock(return_value={"_id": ObjectId(), "produce_type": "TOMATO"})

        wh_id = str(ObjectId())
        batch_id = str(ObjectId())

        receipt_data = WarehouseReceiptCreate(
            warehouse_id=wh_id,
            batch_id=batch_id,
            farmer_id=str(ObjectId()),
            received_weight_kg=5000.0,
            accepted_weight_kg=4800.0,
            damaged_weight_kg=100.0,
            rejected_weight_kg=50.0,  # Sum = 4950 != 5000
            inspection_result=InspectionResult.PASSED,
            quality_grade=QualityGrade.GRADE_A,
            packaging_condition="GOOD",
            storage_location="Bay 1",
        )

        user = {"sub": "mgr1", "role": UserRole.WAREHOUSE_MANAGER}
        with pytest.raises(ValidationError) as exc_info:
            await create_warehouse_receipt(
                warehouse_id=wh_id,
                receipt_data=receipt_data,
                current_user=user,
                db=mock_db,
            )
        assert "Received weight must exactly equal sum" in str(exc_info.value)


class TestInputValidationAndObjectIds:
    """Tests format constraints and ObjectId boundaries."""

    def test_negative_weight_rejected(self):
        """Pydantic rejects negative cargo weights."""
        with pytest.raises(PydanticValidationError):
            DeliveryReportCreate(
                shipment_id=str(ObjectId()),
                delivered_quantity_kg=-500.0,  # Negative weight invalid
                received_by="Receiver",
                received_at=datetime.now(timezone.utc),
            )

    def test_invalid_object_id_detection(self):
        """Business identifiers like PO-DEMO-001 or BATCH-01 must not pass as ObjectIds."""
        assert ObjectId.is_valid("PO-DEMO-001") is False
        assert ObjectId.is_valid("BATCH-DEMO-01") is False
        assert ObjectId.is_valid("SHIP-MAH-DEL-123456") is False
        assert ObjectId.is_valid("507f1f77bcf86cd799439011") is True
        assert ObjectId.is_valid(str(ObjectId())) is True


class TestColdChainComplianceZeroReadings:
    """Verifies that cold-chain compliance percentage returns None on zero readings."""

    @pytest.mark.asyncio
    async def test_cold_chain_compliance_returns_none_when_empty(self):
        from app.services.analytics_service import AnalyticsService

        mock_db = MagicMock()
        mock_db.sensor_readings.count_documents = AsyncMock(return_value=0)
        mock_db.sensor_alerts.count_documents = AsyncMock(return_value=0)

        # Mock the db getter
        import app.services.analytics_service as as_module
        orig_db = as_module.get_database
        as_module.get_database = lambda: mock_db

        try:
            res = await AnalyticsService.get_cold_chain_analytics()
            assert res["total_readings"] == 0
            assert res["compliance_percentage"] is None
        finally:
            as_module.get_database = orig_db


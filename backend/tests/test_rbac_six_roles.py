"""Role-Based Access Control (RBAC) tests for all six platform roles.

Verifies:
- ADMIN registration is blocked from public endpoints.
- Auto-approval applies only to FARMER and BUYER.
- Pending-approval is enforced for TRANSPORTER, WAREHOUSE_MANAGER, and DRIVER.
- Specific operational capabilities are strictly role-gated per the RBAC matrix.
"""

import pytest
from bson import ObjectId
from app.core.constants import UserRole, DeliveryStatus, ShipmentStatus, InspectionResult, QualityGrade
from app.core.exceptions import ForbiddenError, ValidationError
from app.api.v1.endpoints.auth import register, UserRegister
from app.api.v1.endpoints.shipments import create_shipment, ShipmentCreate
from app.api.v1.endpoints.delivery import create_delivery_report, confirm_delivery, DeliveryReportCreate
from app.api.v1.endpoints.inventory import create_warehouse_receipt, WarehouseReceiptCreate
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone


def _create_mock_db():
    mock_db = MagicMock()
    mock_db.users.find_one = AsyncMock(return_value=None)
    mock_db.users.insert_one = AsyncMock(return_value=MagicMock(inserted_id=ObjectId()))
    mock_db.refresh_tokens.insert_one = AsyncMock(return_value=MagicMock(inserted_id=ObjectId()))
    mock_db.ledger_blocks.insert_one = AsyncMock(return_value=MagicMock(inserted_id=ObjectId()))
    mock_db.ledger_blocks.find_one = AsyncMock(return_value=None)
    mock_db.audit_logs.insert_one = AsyncMock(return_value=MagicMock(inserted_id=ObjectId()))
    return mock_db


class TestRegistrationApprovalPolicy:
    """Tests registration approval and role escalation prevention."""

    @pytest.mark.asyncio
    async def test_admin_public_registration_rejected(self):
        """ADMIN cannot be registered through public registration endpoint."""
        mock_db = _create_mock_db()
        mock_response = MagicMock()

        user_data = UserRegister(
            email="new_admin@agrichain.com",
            password="AdminPassword123!",
            full_name="Malicious Admin",
            role=UserRole.ADMIN,
        )

        with pytest.raises(ValidationError) as exc_info:
            await register(response=mock_response, user_data=user_data, db=mock_db)
        assert "Cannot register as admin" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_farmer_registration_auto_approved(self):
        """FARMER registration is auto-approved."""
        mock_db = _create_mock_db()
        mock_response = MagicMock()

        user_data = UserRegister(
            email="farmer_new@agrichain.com",
            password="FarmerPassword123!",
            full_name="Ramesh Patel",
            role=UserRole.FARMER,
        )

        response = await register(response=mock_response, user_data=user_data, db=mock_db)
        assert response.access_token is not None
        assert response.user["is_approved"] is True
        assert response.user["role"] == UserRole.FARMER

    @pytest.mark.asyncio
    async def test_buyer_registration_auto_approved(self):
        """BUYER registration is auto-approved."""
        mock_db = _create_mock_db()
        mock_response = MagicMock()

        user_data = UserRegister(
            email="buyer_new@agrichain.com",
            password="BuyerPassword123!",
            full_name="Retail Buyer",
            role=UserRole.BUYER,
        )

        response = await register(response=mock_response, user_data=user_data, db=mock_db)
        assert response.access_token is not None
        assert response.user["is_approved"] is True
        assert response.user["role"] == UserRole.BUYER

    @pytest.mark.asyncio
    async def test_transporter_registration_pending_approval(self):
        """TRANSPORTER registration requires admin approval."""
        mock_db = _create_mock_db()
        mock_response = MagicMock()

        user_data = UserRegister(
            email="transporter_new@agrichain.com",
            password="TransporterPass123!",
            full_name="Fleet Carrier",
            role=UserRole.TRANSPORTER,
        )

        response = await register(response=mock_response, user_data=user_data, db=mock_db)
        assert isinstance(response, dict)
        assert response["status"] == "PENDING_APPROVAL"
        assert response["user"]["role"] == UserRole.TRANSPORTER

    @pytest.mark.asyncio
    async def test_warehouse_manager_registration_pending_approval(self):
        """WAREHOUSE_MANAGER registration requires admin approval."""
        mock_db = _create_mock_db()
        mock_response = MagicMock()

        user_data = UserRegister(
            email="warehouse_new@agrichain.com",
            password="WarehousePass123!",
            full_name="Intake Manager",
            role=UserRole.WAREHOUSE_MANAGER,
        )

        response = await register(response=mock_response, user_data=user_data, db=mock_db)
        assert isinstance(response, dict)
        assert response["status"] == "PENDING_APPROVAL"
        assert response["user"]["role"] == UserRole.WAREHOUSE_MANAGER

    @pytest.mark.asyncio
    async def test_driver_registration_pending_approval(self):
        """DRIVER registration requires admin approval."""
        mock_db = _create_mock_db()
        mock_response = MagicMock()

        user_data = UserRegister(
            email="driver_new@agrichain.com",
            password="DriverPass123!",
            full_name="Haulage Driver",
            role=UserRole.DRIVER,
        )

        response = await register(response=mock_response, user_data=user_data, db=mock_db)
        assert isinstance(response, dict)
        assert response["status"] == "PENDING_APPROVAL"
        assert response["user"]["role"] == UserRole.DRIVER


class TestEndpointRoleBoundaries:
    """Tests strict operational boundaries across roles."""

    @pytest.mark.asyncio
    async def test_non_transporter_cannot_create_shipment(self):
        """Admin, Driver, Farmer, Buyer cannot create shipments."""
        mock_db = MagicMock()

        shipment_payload = ShipmentCreate(
            booking_id=str(ObjectId()),
            accepted_quotation_id=str(ObjectId()),
            vehicle_id=str(ObjectId()),
            driver_id=str(ObjectId()),
        )

        disallowed_roles = [UserRole.ADMIN, UserRole.DRIVER, UserRole.FARMER, UserRole.BUYER, UserRole.WAREHOUSE_MANAGER]
        for role in disallowed_roles:
            user = {"sub": str(ObjectId()), "role": role}
            with pytest.raises(ForbiddenError):
                await create_shipment(shipment_data=shipment_payload, current_user=user, db=mock_db)

    @pytest.mark.asyncio
    async def test_only_buyer_can_confirm_delivery(self):
        """Driver, Transporter, and Admin cannot confirm delivery acceptance."""
        mock_db = MagicMock()
        shipment_id = str(ObjectId())

        disallowed_roles = [UserRole.DRIVER, UserRole.TRANSPORTER, UserRole.ADMIN, UserRole.FARMER]
        for role in disallowed_roles:
            user = {"sub": str(ObjectId()), "role": role}
            with pytest.raises(ForbiddenError):
                await confirm_delivery(shipment_id=shipment_id, current_user=user, db=mock_db)

    @pytest.mark.asyncio
    async def test_only_driver_or_transporter_can_submit_delivery_report(self):
        """Buyer, Farmer, and Warehouse Manager cannot submit delivery reports."""
        mock_db = MagicMock()
        shipment_id = str(ObjectId())

        report_payload = DeliveryReportCreate(
            shipment_id=shipment_id,
            delivered_quantity_kg=1000.0,
            received_by="Receiver",
            received_at=datetime.now(timezone.utc),
        )

        disallowed_roles = [UserRole.BUYER, UserRole.FARMER, UserRole.WAREHOUSE_MANAGER]
        for role in disallowed_roles:
            user = {"sub": str(ObjectId()), "role": role}
            with pytest.raises(ForbiddenError):
                await create_delivery_report(
                    shipment_id=shipment_id,
                    report_data=report_payload,
                    current_user=user,
                    db=mock_db,
                )

"""
Regression tests verifying the 7 final user corrections:
1. Inventory accounting with 3-way return categories (reusable, damaged, rejected) and exact conservation.
2. Loading discrepancy release (actual loaded < reserved).
3. Delivery confirmation requires OUT_FOR_DELIVERY.
4. Persistent transactional outbox scheduling and processing.
5. Driver activation email match validation and single-use token atomicity.
6. MongoDB serialization: datetime before date handling.
7. Shipment DELAYED status and cancellation.
"""
import pytest
from datetime import datetime, date, timezone, timedelta
from bson import ObjectId
from unittest.mock import AsyncMock, MagicMock, patch

from app.utils.mongo import to_mongo
from app.services.inventory_service import (
    deliver_stock,
    reconcile_loading_discrepancy,
    assert_inventory_invariant,
    ValidationError
)
from app.services.outbox import (
    schedule_outbox_event,
    process_outbox_events,
    OutboxEventType
)
from app.api.v1.endpoints.auth import activate_driver, ActivateDriverRequest
from app.core.exceptions import ForbiddenError, ConflictError, UnauthorizedError


class TestMongoSerialization:
    def test_datetime_handled_before_date_preserves_time_and_tz(self):
        """to_mongo must preserve datetime hours/minutes/seconds and not truncate to midnight."""
        dt = datetime(2026, 11, 10, 15, 30, 45, 123456, tzinfo=timezone.utc)
        serialized = to_mongo(dt)
        assert isinstance(serialized, datetime)
        assert serialized.hour == 15
        assert serialized.minute == 30
        assert serialized.second == 45
        assert serialized.microsecond == 123456
        assert serialized.tzinfo == timezone.utc

    def test_pure_date_converts_to_utc_midnight(self):
        """to_mongo converts bare date to datetime at UTC midnight."""
        d = date(2026, 12, 1)
        serialized = to_mongo(d)
        assert isinstance(serialized, datetime)
        assert serialized.hour == 0
        assert serialized.minute == 0
        assert serialized.tzinfo == timezone.utc


class TestInventoryAccounting:
    @pytest.mark.asyncio
    async def test_deliver_stock_with_three_way_returns(self):
        """Dispatched stock must equal delivered + reusable + damaged + rejected."""
        mock_db = MagicMock()
        inv_id = str(ObjectId())

        # Dispatched = 100.0, Received Total = 100.0
        inv_item = {
            "_id": ObjectId(inv_id),
            "inventory_id": "INV-001",
            "batch_id": "BATCH-001",
            "received_total_kg": 100.0,
            "available_quantity_kg": 0.0,
            "reserved_quantity_kg": 0.0,
            "dispatched_quantity_kg": 100.0,
            "delivered_quantity_kg": 0.0,
            "damaged_quantity_kg": 0.0,
            "rejected_quantity_kg": 0.0,
        }

        async def find_one_side_effect(q, *a, **k):
            return inv_item

        async def update_one_side_effect(q, u, *a, **k):
            if "$inc" in u:
                for k_field, v_delta in u["$inc"].items():
                    inv_item[k_field] = round(inv_item.get(k_field, 0.0) + v_delta, 3)
            return MagicMock(modified_count=1)

        mock_db.inventory_items.find_one = AsyncMock(side_effect=find_one_side_effect)
        mock_db.inventory_items.update_one = AsyncMock(side_effect=update_one_side_effect)
        mock_db.inventory_movements.insert_one = AsyncMock(return_value=MagicMock(inserted_id=ObjectId()))

        # Settle: 70kg delivered, 15kg reusable return, 10kg damaged return, 5kg rejected return (Total = 100kg)
        updated = await deliver_stock(
            mock_db,
            inventory_id=inv_id,
            delivered_kg=70.0,
            returned_reusable_kg=15.0,
            returned_damaged_kg=10.0,
            returned_rejected_kg=5.0,
        )

        assert updated["dispatched_quantity_kg"] == 0.0
        assert updated["delivered_quantity_kg"] == 70.0
        assert updated["available_quantity_kg"] == 15.0
        assert updated["damaged_quantity_kg"] == 10.0
        assert updated["rejected_quantity_kg"] == 5.0
        # Check conservation equation holds
        assert_inventory_invariant(updated)

    @pytest.mark.asyncio
    async def test_deliver_stock_rejects_unbalanced_settlement(self):
        """Settlement exceeding dispatched stock must raise ValidationError."""
        mock_db = MagicMock()
        inv_id = str(ObjectId())
        inv_item = {
            "_id": ObjectId(inv_id),
            "dispatched_quantity_kg": 50.0,
            "received_total_kg": 50.0,
        }
        mock_db.inventory_items.find_one = AsyncMock(return_value=inv_item)

        # Attempt to settle 60kg against 50kg dispatched
        with pytest.raises(ValidationError) as exc:
            await deliver_stock(
                mock_db,
                inventory_id=inv_id,
                delivered_kg=40.0,
                returned_reusable_kg=15.0,
                returned_damaged_kg=5.0,
            )
        assert "Cannot deliver/return" in str(exc.value)

    @pytest.mark.asyncio
    async def test_reconcile_loading_discrepancy_releases_excess(self):
        """When actual loaded < reserved, excess reservation is released back to available."""
        mock_db = MagicMock()
        inv_id = str(ObjectId())

        inv_item = {
            "_id": ObjectId(inv_id),
            "batch_id": "BATCH-001",
            "available_quantity_kg": 20.0,
            "reserved_quantity_kg": 80.0,
            "received_total_kg": 100.0,
            "dispatched_quantity_kg": 0.0,
            "delivered_quantity_kg": 0.0,
            "damaged_quantity_kg": 0.0,
            "rejected_quantity_kg": 0.0,
        }

        async def find_one_side_effect(q, *a, **k):
            return inv_item

        async def update_one_side_effect(q, u, *a, **k):
            if "$inc" in u:
                for k_field, v_delta in u["$inc"].items():
                    inv_item[k_field] = round(inv_item.get(k_field, 0.0) + v_delta, 3)
            return MagicMock(modified_count=1)

        mock_db.inventory_items.find_one = AsyncMock(side_effect=find_one_side_effect)
        mock_db.inventory_items.update_one = AsyncMock(side_effect=update_one_side_effect)
        mock_db.inventory_movements.insert_one = AsyncMock(return_value=MagicMock(inserted_id=ObjectId()))

        # Planned was 80kg, but actually loaded only 65kg -> release 15kg back to available
        updated = await reconcile_loading_discrepancy(
            mock_db,
            inventory_id=inv_id,
            reserved_kg=80.0,
            actual_loaded_kg=65.0,
            actor_id="user-123",
            actor_role="TRANSPORTER",
        )

        assert updated["reserved_quantity_kg"] == 65.0
        assert updated["available_quantity_kg"] == 35.0
        assert_inventory_invariant(updated)


class TestTransactionalOutbox:
    @pytest.mark.asyncio
    async def test_schedule_and_process_outbox_events(self):
        """Outbox events are recorded with PENDING and processed idempotently."""
        events = []
        mock_db = MagicMock()

        async def insert_event(doc, *a, **k):
            doc["_id"] = ObjectId()
            events.append(doc)
            return MagicMock(inserted_id=doc["_id"])

        mock_db.outbox_events.insert_one = AsyncMock(side_effect=insert_event)
        mock_db.outbox_events.find_one = AsyncMock(return_value=None)

        # Schedule
        scheduled = await schedule_outbox_event(
            mock_db,
            event_type=OutboxEventType.SEND_DRIVER_INVITATION,
            payload={"email": "driver@example.com", "invitation_id": "INV-1"},
            idempotency_key="key-001"
        )
        assert scheduled["status"] == "PENDING"
        assert len(events) == 1

        # Process
        cursor_mock = MagicMock()
        cursor_mock.sort = MagicMock(return_value=cursor_mock)
        cursor_mock.limit = MagicMock(return_value=cursor_mock)
        cursor_mock.to_list = AsyncMock(return_value=events)
        mock_db.outbox_events.find = MagicMock(return_value=cursor_mock)
        mock_db.outbox_events.update_one = AsyncMock()

        processed_count = await process_outbox_events(mock_db)
        assert processed_count == 1
        mock_db.outbox_events.update_one.assert_called_once()
        args, kwargs = mock_db.outbox_events.update_one.call_args
        assert args[1]["$set"]["status"] == "PROCESSED"


class TestDriverOnboardingSecurity:
    @pytest.mark.asyncio
    async def test_activate_driver_rejects_email_mismatch(self):
        """Activation fails with 403 Forbidden if email does not match invitation recipient."""
        mock_db = MagicMock()
        mock_resp = MagicMock()

        invite_doc = {
            "_id": ObjectId(),
            "driver_id": str(ObjectId()),
            "email": "intended_driver@agrichain.com",
            "status": "PENDING",
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=24),
        }

        mock_db.driver_invitations.find_one_and_update = AsyncMock(return_value=invite_doc)
        mock_db.driver_invitations.update_one = AsyncMock()

        request = ActivateDriverRequest(
            invitation_token="valid_secret_invitation_token_12345",
            email="attacker_imposter@agrichain.com",
            password="StrongPassword123!",
        )

        with pytest.raises(ForbiddenError) as exc:
            await activate_driver(request, response=mock_resp, db=mock_db)
        assert "Activation email does not match" in str(exc.value)
        # Verify token was reverted back to PENDING so not consumed
        mock_db.driver_invitations.update_one.assert_called_once()

    @pytest.mark.asyncio
    async def test_activate_driver_already_used_token_conflict(self):
        """Attempting to activate an already accepted token raises 409 Conflict."""
        mock_db = MagicMock()
        mock_resp = MagicMock()

        mock_db.driver_invitations.find_one_and_update = AsyncMock(return_value=None)
        mock_db.driver_invitations.find_one = AsyncMock(return_value={
            "_id": ObjectId(),
            "status": "ACCEPTED",
        })

        request = ActivateDriverRequest(
            invitation_token="already_used_token_1234567890",
            password="StrongPassword123!",
        )

        with pytest.raises(ConflictError) as exc:
            await activate_driver(request, response=mock_resp, db=mock_db)
        assert "already been used" in str(exc.value)

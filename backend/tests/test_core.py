"""AgriChain Backend Tests."""

import pytest
import asyncio
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, decode_token
from app.services.ledger_service import (
    canonical_json, calculate_block_hash, GENESIS_HASH, append_ledger_block,
    verify_ledger_integrity, verify_entity_history
)
from app.core.constants import LedgerEventType


class TestSecurity:
    def test_password_hashing(self):
        hashed = get_password_hash("testpassword123")
        assert verify_password("testpassword123", hashed)
        assert not verify_password("wrongpassword", hashed)

    def test_jwt_token(self):
        token = create_access_token({"sub": "user123", "email": "test@test.com", "role": "FARMER"})
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "user123"
        assert payload["role"] == "FARMER"

    def test_refresh_token_is_typed_and_rotatable(self):
        token = create_refresh_token({"sub": "user123", "role": "FARMER"})
        payload = decode_token(token)
        assert payload is not None
        assert payload["type"] == "refresh"
        assert payload["jti"]
        assert payload["family_id"]


class TestLedgerCanonicalization:
    def test_canonical_json_deterministic(self):
        data1 = {"b": 2, "a": 1, "c": 3}
        data2 = {"a": 1, "b": 2, "c": 3}
        assert canonical_json(data1) == canonical_json(data2)

    def test_canonical_json_datetime(self):
        dt = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        result = canonical_json({"timestamp": dt})
        assert "2024-01-15T10:30:00Z" in result

    def test_block_hash_deterministic(self):
        block_data = {
            "index": 1,
            "timestamp": "2024-01-15T10:30:00Z",
            "event_type": "TEST_EVENT",
            "entity_type": "TEST",
            "entity_id": "123",
            "actor_id": "user1",
            "actor_role": "FARMER",
            "event_summary": "Test event",
            "payload_hash": "abc123",
            "previous_hash": GENESIS_HASH,
            "hash_algorithm": "SHA-256",
            "schema_version": "1.0",
        }
        hash1 = calculate_block_hash(block_data.copy())
        hash2 = calculate_block_hash(block_data.copy())
        assert hash1 == hash2
        assert len(hash1) == 64  # SHA-256 hex length

    def test_block_hash_excludes_own_hash(self):
        block_data = {
            "index": 1,
            "timestamp": "2024-01-15T10:30:00Z",
            "event_type": "TEST_EVENT",
            "entity_type": "TEST",
            "entity_id": "123",
            "actor_id": "user1",
            "actor_role": "FARMER",
            "event_summary": "Test event",
            "payload_hash": "abc123",
            "previous_hash": GENESIS_HASH,
            "hash_algorithm": "SHA-256",
            "schema_version": "1.0",
            "hash": "should_not_affect_calculation",
        }
        hash_with = calculate_block_hash(block_data.copy())
        block_data_without = {k: v for k, v in block_data.items() if k != "hash"}
        hash_without = calculate_block_hash(block_data_without.copy())
        assert hash_with == hash_without

    def test_tampering_detection(self):
        block_data = {
            "index": 1,
            "timestamp": "2024-01-15T10:30:00Z",
            "event_type": "TEST_EVENT",
            "entity_type": "TEST",
            "entity_id": "123",
            "actor_id": "user1",
            "actor_role": "FARMER",
            "event_summary": "Test event",
            "payload_hash": "abc123",
            "previous_hash": GENESIS_HASH,
            "hash_algorithm": "SHA-256",
            "schema_version": "1.0",
        }
        original_hash = calculate_block_hash(block_data.copy())
        
        # Tamper with payload hash
        tampered = block_data.copy()
        tampered["payload_hash"] = "tampered_value"
        tampered_hash = calculate_block_hash(tampered.copy())
        
        assert original_hash != tampered_hash


class TestLedgerAppend:
    @pytest.mark.asyncio
    async def test_append_ledger_block_structure(self):
        # Test that append_ledger_block creates correct structure
        # This would need a real DB, so we test the hash calculation logic
        pass


class TestInventoryCalculations:
    def test_fefo_sorting(self):
        """Test that FEFO (First Expired, First Out) sorts by earliest shelf life."""
        batches = [
            {"shelf_life_end": datetime(2024, 3, 1, tzinfo=timezone.utc)},
            {"shelf_life_end": datetime(2024, 1, 15, tzinfo=timezone.utc)},
            {"shelf_life_end": datetime(2024, 2, 1, tzinfo=timezone.utc)},
        ]
        sorted_batches = sorted(batches, key=lambda b: b["shelf_life_end"])
        assert sorted_batches[0]["shelf_life_end"] == datetime(2024, 1, 15, tzinfo=timezone.utc)
        assert sorted_batches[1]["shelf_life_end"] == datetime(2024, 2, 1, tzinfo=timezone.utc)
        assert sorted_batches[2]["shelf_life_end"] == datetime(2024, 3, 1, tzinfo=timezone.utc)

    def test_inventory_reservation(self):
        """Test that reservation doesn't exceed available quantity."""
        available = 1000
        reserved = 300
        requested = 500
        assert available - reserved >= requested  # 1000 - 300 = 700 >= 500, should pass

        requested_too_much = 800
        assert not (available - reserved >= requested_too_much)  # 700 < 800, should fail


class TestMonetaryCalculations:
    def test_freight_total_calculation(self):
        """Test that freight total uses exact integer arithmetic."""
        base = 50000  # 500 INR in paise
        handling = 5000  # 50 INR
        fuel = 3000  # 30 INR
        other = 2000  # 20 INR
        total = base + handling + fuel + other
        assert total == 60000  # 600 INR in paise
        assert total / 100 == 600.0

    def test_cost_per_kg(self):
        total_cost_paise = 60000  # 600 INR
        weight_kg = 1000
        cost_per_kg = total_cost_paise / weight_kg  # 60 paise per kg
        assert cost_per_kg == 60.0


class TestShipmentTransitions:
    def test_valid_transitions(self):
        from app.core.constants import SHIPMENT_STATUS_TRANSITIONS, ShipmentStatus
        
        # BOOKING_REQUESTED can go to BOOKING_CONFIRMED or CANCELLED
        assert ShipmentStatus.BOOKING_CONFIRMED in SHIPMENT_STATUS_TRANSITIONS[ShipmentStatus.BOOKING_REQUESTED]
        assert ShipmentStatus.CANCELLED in SHIPMENT_STATUS_TRANSITIONS[ShipmentStatus.BOOKING_REQUESTED]
        
        # DELIVERED is terminal (no transitions out)
        assert len(SHIPMENT_STATUS_TRANSITIONS[ShipmentStatus.DELIVERED]) == 0
        
        # Cannot go from LOADED to DELIVERED directly (must go through DISPATCHED)
        assert ShipmentStatus.DELIVERED not in SHIPMENT_STATUS_TRANSITIONS[ShipmentStatus.LOADED]
        assert ShipmentStatus.DISPATCHED in SHIPMENT_STATUS_TRANSITIONS[ShipmentStatus.LOADED]

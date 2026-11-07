# AgriChain Hash-Chain Ledger Design

## Overview

The ledger is a simulated blockchain-style, hash-chained audit trail implemented using Python's `hashlib` SHA-256 and MongoDB.

**Important**: This is NOT a decentralized blockchain. It is a tamper-evident audit ledger where historical changes are detectable through hash verification.

## Block Structure

```json
{
  "index": 1,
  "block_id": "AGRCHAIN-GLOBAL-001-000001",
  "timestamp": "2024-01-15T10:30:00Z",
  "event_type": "PRODUCE_BATCH_CREATED",
  "entity_type": "PRODUCE_BATCH",
  "entity_id": "507f1f77bcf86cd799439011",
  "actor_id": "507f1f77bcf86cd799439012",
  "actor_role": "FARMER",
  "event_summary": "Harvest batch TOM-NAS-001 created",
  "payload_hash": "a81f...d3e2",
  "previous_hash": "0000000000000000000000000000000000000000000000000000000000000000",
  "hash": "b42c...f1a9",
  "hash_algorithm": "SHA-256",
  "schema_version": "1.0"
}
```

## Hash Calculation

```python
import hashlib
import json

def calculate_block_hash(block_data: dict) -> str:
    # Exclude the block's own hash field
    hashable_data = {k: v for k, v in block_data.items() if k != "hash"}
    
    # Canonical JSON: sorted keys, compact separators, UTF-8
    canonical = json.dumps(
        hashable_data,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        default=datetime_serializer
    )
    
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()
```

### Canonicalization Rules
1. **Sorted keys**: JSON keys are alphabetically sorted
2. **Compact separators**: No whitespace between keys/values
3. **UTC timestamps**: ISO 8601 format with `Z` suffix
4. **ObjectId normalization**: MongoDB ObjectIds converted to strings
5. **Decimal handling**: Non-native types serialized safely
6. **Excludes own hash**: The `hash` field is excluded from calculation
7. **Includes previous_hash**: Chain link is part of hash input

## Genesis Block

- Chain ID: `AGRCHAIN-GLOBAL-001`
- Genesis hash: `"0" * 64` (64 zero characters)
- First block's `previous_hash` = genesis hash

## Chain Integrity

### Verification Process
1. Check block sequence continuity (index must be 1, 2, 3, ...)
2. Confirm genesis reference (first block's previous_hash = genesis)
3. Confirm previous block hash matches current block's previous_hash
4. Recalculate current block hash
5. Compare recalculated with stored hash
6. Report first invalid block
7. Identify all subsequent affected blocks

### Tamper Detection
- Modifying any block's data changes its hash
- The next block's `previous_hash` no longer matches
- Chain breaks at the modified block
- All subsequent blocks are affected

## Ledger Design Decisions

| Decision | Rationale |
|----------|-----------|
| Single global chain | Simpler verification, total ordering |
| MongoDB transactions | Atomic ledger + business state updates |
| Replica set required | Transactions need replica set |
| Minimal payload in blocks | No sensitive data, only hashes |
| No update/delete on blocks | Append-only by design |

## Event Types Recorded

28+ event types including: USER_REGISTERED, FARM_REGISTERED, PRODUCE_BATCH_CREATED, WAREHOUSE_RECEIVED, PURCHASE_ORDER_CREATED, FREIGHT_QUOTATION_SUBMITTED, SHIPMENT_DISPATCHED, CHECKPOINT_RECORDED, TEMPERATURE_ALERT_RAISED, DELIVERY_CONFIRMED, DAMAGE_CLAIM_RESOLVED, etc.

## Data Not Stored in Ledger

- Passwords or password hashes
- JWT tokens
- Complete user profiles
- Private phone numbers or addresses
- Large images
- Every individual sensor reading
- GPS coordinates

## Tampering Demonstration

The Ledger Explorer includes a non-destructive tampering simulation:
1. Select a block
2. Create a temporary copy with modified payload
3. Recalculate hash (mismatch detected)
4. Show broken chain link
5. Warning: simulation only, real ledger unchanged

## Limitations

- Not decentralized (single MongoDB instance)
- No consensus mechanism
- Database administrator could rewrite the entire chain
- Hash chaining provides detectability, not prevention
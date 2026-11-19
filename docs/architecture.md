# AgriChain Architecture & System Design

AgriChain is an end-to-end cold-chain logistics and agricultural provenance platform connecting Farmers, Warehouse Managers, Transporters, Drivers, Buyers, and Platform Administrators.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React / Vite Frontend                           │
│  - Role-based glass UI & layout routing                                │
│  - TanStack Query cache scoped by authenticated user ID               │
│  - Real-time Cold Chain, Inventory, Deliveries, and Analytics portals   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON (Bearer JWT)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FastAPI Backend Engine                          │
│  - Two-tier Defense-in-Depth Authorization (RBAC + Action Capabilities)│
│  - Default-Deny Resource Ownership & IDOR Scoping                      │
│  - Integer-Gram Authoritative Inventory Service                        │
│  - Warehouse Capacity Concurrency Controller                           │
│  - Stateless & Lease-Coordinated Sensor Simulator Engine               │
│  - SHA-256 Hash-Chained Audit Ledger                                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Motor Async Sessions
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        MongoDB Replica Set                             │
│  - Primary system of record (Snapshot reads / Majority writes)         │
│  - Multi-document transactions (`run_in_txn`)                          │
│  - Compound unique constraints on movements & ledger idempotency       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Concurrency Control & Database Transactions

All state-altering business operations in AgriChain execute within MongoDB multi-document transactions using `run_in_txn(callback)` (`backend/app/db/unit_of_work.py`):

1. **Snapshot Read & Majority Write**: Motor's `with_transaction` handles transient network/election errors with automatic retry under snapshot isolation.
2. **Single Atomic Unit of Work**: Every physical balance change, status update, vehicle/driver assignment, and corresponding immutable ledger block or inventory movement execute in the **exact same transaction session**. If any validation, capacity check, or write fails, the entire transaction aborts.
3. **Optimistic Locking & Concurrency Guards**:
   - Warehouse capacity updates atomically increment `capacity_revision` on the warehouse document.
   - Shipments check conditional status filters before transitions (e.g. `{"_id": shipment_id, "status": "OUT_FOR_DELIVERY"}`).
   - Returns enforce uniqueness via `return_received_at: None` conditional updates and database compound unique indexes.
4. **Environment Deployment Requirement**: Production deployments **strictly require a MongoDB replica set**. In local development environments without a replica set, setting `ALLOW_STANDALONE_DEV=true` bypasses multi-document transactions for standalone testing only.

---

## 2. Integer-Gram Precision & Conservation Law

To eliminate floating-point representation anomalies in physical commerce, AgriChain enforces an **authoritative integer-gram quantity model**:

- **Authoritative Balance Storage**: Balances in `inventory_items` are maintained in whole integer grams (`accepted_g`, `available_g`, `reserved_g`, `damaged_g`, `rejected_g`).
- **Input Validation**: All incoming API requests (receipts, orders, shipment loads, delivery confirmations, returns) validate that quantities are non-negative, finite numbers with precision restricted to whole grams (`multiple_of=0.001` kg = 1 gram). Non-finite (`NaN`, `Infinity`), negative, or sub-gram fractional values are strictly rejected at the schema level rather than silently rounded.
- **Conversion Function**: Conversions use strict decimal conversion (`kilograms_to_grams(kg) = int(round(Decimal(str(kg)) * 1000))`).
- **Compatibility Projection**: Kilogram fields (`accepted_kg`, `available_kg`, etc.) are computed as `g / 1000` solely for presentation and legacy API compatibility; they are never used as independent writable sources of truth.

---

## 3. Physical Inventory & Warehouse Capacity

### 3.1 Immutable Inventory Movement Ledger
Every operation that affects inventory records an immutable movement document in `inventory_movements`:
- `RECEIPT`: Intake of harvested batch into warehouse stock.
- `DISPATCH`: Physical exit of cargo loaded onto transport vehicles.
- `SHORT_LOAD_RELEASE`: Automatic restoration of unshipped order shortfall to available stock.
- `RETURN_RECEIPT_USABLE`: Usable returned stock received back into warehouse inventory.
- `RETURN_RECEIPT_RESERVED`: Usable returned stock where order remains active.
- `RETURN_RECEIPT_DAMAGED`: Stock received damaged, tracked in `damaged_g`.
- `RETURN_RECEIPT_REJECTED`: Stock rejected upon delivery, tracked in `rejected_g`.
- `OPENING_BALANCE`: Truthful snapshot created during historical migration.

To guarantee idempotency during network retries and concurrent requests, a compound unique index `[("reference_type", 1), ("reference_id", 1), ("type", 1)]` (sparse=True) is enforced at the database level.

### 3.2 Warehouse Capacity & Cold Storage Classification
Warehouse occupancy is calculated transactionally as:
$$\text{Occupancy} = \sum \text{accepted\_kg} - \sum (\text{DISPATCH} - \text{ALL\_RETURNS})$$
- All return receipts (`RETURN_RECEIPT_USABLE`, `RETURN_RECEIPT_RESERVED`, `RETURN_RECEIPT_DAMAGED`, `RETURN_RECEIPT_REJECTED`) occupy physical warehouse space and increase occupancy.
- Mandatory cold storage classification is strictly enforced: batches marked `requires_cold_storage` or produce types with handling profiles where `max_temp_c <= 10` are rejected if received into an ambient warehouse.
- Legacy inventory records without explicit cold classification are conservatively treated as cold storage in refrigerated facilities to prevent capacity over-allocation.
- Capacity reductions below currently recorded occupancy are blocked.

---

## 4. End-to-End Shipment & Graded Return Lifecycle

```
[Booking & Quotation] ──► [DRIVER_ASSIGNED] ──► [LOADED] ──► [DISPATCHED]
                                │                 │              │
                                ├─ Short Load ────┤              │
                                │  (Release PO)   │              │
                                │                 │              ▼
                                │                 │         [IN_TRANSIT]
                                │                 │              │
                                ▼                 ▼              ▼
                           [CANCELLED]       [CANCELLED]    [ARRIVED_AT_DESTINATION]
                                │                                │
                                │                                ▼
                                │                        [OUT_FOR_DELIVERY]
                                │                           │    │    │
                                │           ┌───────────────┘    │    └───────────────┐
                                │           ▼                    ▼                    ▼
                                │      [DELIVERED]     [PARTIALLY_DELIVERED]  [DELIVERY_REJECTED]
                                │           │                    │                    │
                                └───────────┼────────────────────┴────────────────────┘
                                            ▼
                             [POST .../partial-return]
                           Warehouse Physical Inspection
                            ├── Usable Quantity (Restocked / Released)
                            ├── Damaged Quantity (Tracked in damaged_g)
                            └── Rejected Quantity (Tracked in rejected_g)
```

1. **Short Loading**: When actual loaded weight is less than the allocated order quantity, the difference is immediately released back to available stock in the loading transaction, recording a `SHORT_LOAD_RELEASE` movement.
2. **Graded Returns**: Returns can be received for shipments that physical departed and terminated in `CANCELLED`, `DELIVERY_REJECTED`, or `PARTIALLY_DELIVERED`:
   - Enforces physical inspection signoff before usable stock is admitted.
   - Categorizes cargo into Usable, Damaged, and Rejected quantities.
   - Non-resellable portions (Damaged + Rejected) automatically reduce purchase order reservations.
   - Creates discrete movement records and appends a `SHIPMENT_RETURN_RECEIVED` block to the audit ledger.

---

## 5. Cold-Chain Simulation & Alert Engine

1. **Stateless Generator**: Generates deterministic, reproducible telemetry from shipment ID, scenario, and step index across 7 scenarios:
   - `NORMAL`: produce-safe baseline readings.
   - `TEMP_EXCURSION`: progressive temperature overheating.
   - `HUMIDITY_EXCURSION`: excessive humidity spike.
   - `DOOR_OPEN_EVENT`: transient warm air ingress.
   - `REFRIGERATION_FAILURE`: steady cooling system loss.
   - `RECOVERY_AFTER_EXCURSION`: cooling restoration.
   - `TRANSIT_DELAY`: in-range sensor data flagged with `simulated_delay: True` without mutating shipment business timestamps or state machine status.
2. **Hysteresis Classification**: Employs a 0.2°C temperature and 1% humidity recovery margin. Once in WARNING or CRITICAL state, readings remain flagged until telemetry is safely within the margin.
3. **Alert Lifecycle**: Alerts are distinctively **Acknowledged** (`alerts:acknowledge` records operator notes without closing the alert) and **Resolved** (`alerts:resolve` requires a non-empty corrective action and writes a ledger event). Alert durations are computed from open and resolved timestamps.
4. **Lease-Coordinated Playback**: Background simulation workers run bounded loops coordinated via expiring MongoDB leases, preventing duplicate ticks across multiple worker processes.

---

## 6. Cryptographic Audit Ledger

AgriChain implements an append-only, SHA-256 hash-chained audit trail:
- Each block records `index`, `block_id`, `timestamp` (millisecond UTC), `event_type`, `entity_type`, `entity_id`, `actor_id`, `actor_role`, `event_summary`, `payload_hash`, `payload_snapshot`, and `previous_hash`.
- Genesis block hash is anchored to 64 zeroes.
- Chain integrity is cryptographically verifiable on-demand via `GET /api/v1/ledger/verify`.

---

## 7. Migration & Deployment Runbook

### 7.1 Pre-Migration Requirements
1. **Full Database Backup**: Perform a complete `mongodump` of the production database before applying any schema or balance updates:
   ```bash
   mongodump --uri="mongodb://<user>:<password>@<host>:27017/agrichain?replicaSet=rs0" --out=/backups/$(date +%Y%m%d_%H%M%S)
   ```
2. **Worker Quiescence**: Stop all older application worker processes before executing migrations. Older workers lack integer-gram logic and will write inconsistent balances if left active.

### 7.2 Dry-Run Inspection & Application
1. **Inventory Movements Backfill**:
   ```bash
   # 1. Run dry-run to identify unbacked legacy inventory items
   python backend/scripts/backfill_inventory_movements.py
   # 2. Review output summary: {'eligible': X, 'created': 0, 'existing': Y, 'invalid': Z}
   # 3. Apply opening balance snapshots inside transactions
   python backend/scripts/backfill_inventory_movements.py --apply
   ```
2. **Integer-Gram Stored Quantity Migration**:
   ```bash
   # 1. Run dry-run to verify whole-gram eligibility
   python backend/scripts/migrate_inventory_grams.py
   # 2. Inspect stderr for invalid, negative, or fractional-gram items
   # 3. Apply migration
   python backend/scripts/migrate_inventory_grams.py --apply
   ```
3. **Database Reconciliation & Sanity Check**:
   ```bash
   python backend/scripts/reconcile.py
   ```
   Validates conservation equations, whole-gram equality (`accepted_g == accepted_kg * 1000`), and capacity boundaries.

### 7.3 Recovery & Rollback Procedures
- **Partial Migration Failure**: The migration scripts are fully idempotent and resumable. Re-running them after resolving an invalid row safely skips already-migrated documents without double-incrementing balances.
- **Rollback**: In the event of an operational blocker, restore the point-in-time `mongorestore`:
   ```bash
   mongorestore --uri="mongodb://<user>:<password>@<host>:27017/agrichain?replicaSet=rs0" --drop /backups/<backup_timestamp>
   ```

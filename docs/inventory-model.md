# AgriChain Inventory Conservation & Stock Model

## 1. Core Conservation Law

Every gram of produce received into AgriChain is strictly accounted for across mutually exclusive inventory buckets. At all times and after every state transition or stock movement, the inventory conservation equation holds:

$$\text{Received Total} = \text{Available} + \text{Reserved} + \text{Dispatched} + \text{Delivered} + \text{Damaged} + \text{Rejected}$$

### 1.1 Authoritative Integer-Gram Representation
AgriChain uses an **authoritative integer-gram quantity model** (`_g` fields) across all balance calculations and ledger records:
- Authoritative fields: `accepted_g`, `available_g`, `reserved_g`, `damaged_g`, `rejected_g`.
- Base unit: **Whole grams** ($1\text{ g} = 0.001\text{ kg}$).
- Input validation: All API inputs require finite, non-negative numbers with precision up to whole grams (`multiple_of=0.001`). Sub-gram fractional quantities, negative numbers, `NaN`, and `Infinity` are strictly rejected by the schema layer rather than silently rounded.
- Kilogram compatibility: Kilogram values (`accepted_kg`, `available_kg`, etc.) are computed on-demand or as derived read-only fields (`g / 1000.0`). Kilogram fields are never maintained as independently writable sources of truth.

---

## 2. Bucket Definitions

| Bucket | Authoritative Field | Definition |
|---|---|---|
| **Available** | `available_g` | Produce physically in the warehouse, QC inspected and passed, uncommitted and available for purchase order allocation. |
| **Reserved** | `reserved_g` | Produce committed to an accepted purchase order, sequestered to prevent double-selling. |
| **Dispatched** | `loaded_weight_g` (shipment) | Produce physically loaded onto an active transport vehicle and in transit. |
| **Delivered** | `delivered_quantity_kg` (report) | Produce accepted and signed off by the buyer at destination. |
| **Damaged** | `damaged_g` | Produce spoiled or deteriorated at intake, during storage, or returned damaged from transit. |
| **Rejected** | `rejected_g` | Produce failing quality inspection or rejected by the buyer on delivery and returned to the warehouse. |

---

## 3. Stock Movement Ledger & Allowed Bucket Transitions

All physical stock changes execute within an atomic MongoDB transaction (`run_in_txn`) and record an immutable entry in `inventory_movements`.

```
                    ┌──────────────────────────────────────────────┐
                    │              Warehouse Intake                │
                    └──────────────────────┬───────────────────────┘
                                           │ QC Inspection
                       ┌───────────────────┼───────────────────┐
                       ▼ (Passed QC)       ▼ (Intake Damage)   ▼ (Failed QC)
                ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  ┌────────────►│  AVAILABLE   │    │   DAMAGED    │    │   REJECTED   │
  │             └──────┬───────┘    └──────▲───────┘    └──────▲───────┘
  │                    │                   │                   │
  │ Short Load Release │ Order Accept      │                   │
  ├────────────────────┤                   │                   │
  │                    ▼                   │                   │
  │             ┌──────────────┐           │                   │
  │             │   RESERVED   │           │                   │
  │             └──────┬───────┘           │                   │
  │                    │ Dispatch          │                   │
  │                    ▼                   │                   │
  │             ┌──────────────┐           │                   │
  │             │  DISPATCHED  │           │                   │
  │             └──────┬───────┘           │                   │
  │                    │                   │                   │
  │ Return Usable      ├─ Return Damaged ──┘                   │
  └────────────────────┼─ Return Rejected ─────────────────────┘
                       │ Delivery Signoff
                       ▼
                ┌──────────────┐
                │  DELIVERED   │
                └──────────────┘
```

### 3.1 Movement Types
| Movement Type | Event Source | Physical Balance Effect | Concurrency Reference |
|---|---|---|---|
| `RECEIPT` | Warehouse intake | `+available_g` (or `+damaged_g`, `+rejected_g`) | Warehouse Receipt ID |
| `SHORT_LOAD_RELEASE` | Shipment load | `+available_g`, `-reserved_g` (shortfall) | Shipment ID |
| `DISPATCH` | Shipment depart | Decouples custody; decrements warehouse occupancy | Shipment ID |
| `RETURN_RECEIPT_USABLE` | Cancelled / rejected return | `+available_g`, restores stock if order cancelled | Shipment ID |
| `RETURN_RECEIPT_RESERVED`| Active order return | Restores stock to reservation for redelivery | Shipment ID |
| `RETURN_RECEIPT_DAMAGED`| Damaged return | `+damaged_g`, reduces order reservation | Shipment ID |
| `RETURN_RECEIPT_REJECTED`| Rejected delivery return | `+rejected_g`, reduces order reservation | Shipment ID |
| `OPENING_BALANCE` | Historical migration | Establishes immutable baseline for legacy rows | Inventory Item ID |

### 3.2 Duplicate Prevention & Concurrency Control
To prevent duplicate movements during network retries or concurrent requests:
1. Compound unique index: `[("reference_type", 1), ("reference_id", 1), ("type", 1)]` (sparse=True).
2. Optimistic concurrency control: updates check state invariants (`return_received_at: None`, `capacity_revision`).

---

## 4. Warehouse & Cold-Storage Capacity Enforcement

Warehouse physical occupancy is calculated transactionally as:

$$\text{Occupancy} = \sum \text{accepted\_kg} - \sum (\text{DISPATCH} - \text{ALL\_RETURNS})$$

Where $\text{ALL\_RETURNS}$ includes:
- `RETURN_RECEIPT_USABLE`
- `RETURN_RECEIPT_RESERVED`
- `RETURN_RECEIPT_DAMAGED`
- `RETURN_RECEIPT_REJECTED`

### 4.1 Cold-Storage Classification Rules
- **Mandatory Cold Storage**: If a batch has `requires_cold_storage: true` OR the produce handling profile specifies `max_temp_c <= 10.0`, the warehouse operator cannot bypass cold storage. Intake into a non-refrigerated warehouse or selection of ambient storage is strictly blocked.
- **Legacy Safety Rule**: Inventory items without explicit cold storage classifications default to refrigerated accounting in cold-storage warehouses, guaranteeing capacity is never understated.
- **Capacity Floors**: Decreasing configured warehouse capacity below currently recorded physical occupancy is prevented transactionally.

---

## 5. Migration & Reconciliation Tools

| Script | Purpose | Execution Mode | Safety Guarantee |
|---|---|---|---|
| `scripts/backfill_inventory_movements.py` | Creates truthful `OPENING_BALANCE` movements for legacy inventory without movement histories. | Dry-run first (`--apply` required) | Idempotent, locks item in transaction, does not invent historical dispatches. |
| `scripts/migrate_inventory_grams.py` | Migrates kilogram inventory balances to authoritative integer grams (`_g`). | Dry-run first (`--apply` required) | Fails closed on fractional-gram rows; skips already migrated items; never rounds silently. |
| `scripts/reconcile.py` | Full database reconciliation auditor. | Read-only verification | Audits whole-gram parity, bucket balance conservation, movement ledger integrity, and warehouse capacity. |

# AgriChain Shipment & Returns Workflow

## 1. Shipment State Machine

A confirmed freight booking and accepted quotation allow the awarded transporter to create a shipment. Creation conditionally claims an available vehicle and driver, creates shipment allocation items, and appends `SHIPMENT_CREATED` to the ledger in a single retrying transaction.

```
                    ┌──────────────────┐
                    │ DRIVER_ASSIGNED  │
                    └────────┬─────────┘
                             │ Load Cargo & Verify Batch Weights
                             ▼
                        ┌──────────┐
                        │  LOADED  │
                        └────┬─────┘
                             │ Dispatch from Warehouse
                             ▼
                      ┌──────────────┐
                      │  DISPATCHED  │
                      └──────┬───────┘
                             │ Start Journey
                             ▼
                      ┌──────────────┐
                      │  IN_TRANSIT  │
                      └──────┬───────┘
                             │ Arrival at Destination Hub
                             ▼
                 ┌────────────────────────┐
                 │ ARRIVED_AT_DESTINATION │
                 └───────────┬────────────┘
                             │ Driver departs for Buyer Delivery
                             ▼
                    ┌──────────────────┐
                    │ OUT_FOR_DELIVERY │
                    └────────┬─────────┘
                             │ Buyer Delivery Signoff
           ┌─────────────────┼─────────────────┐
           ▼                 ▼                 ▼
     ┌───────────┐ ┌───────────────────┐ ┌───────────────────┐
     │ DELIVERED │ │PARTIALLY_DELIVERED│ │ DELIVERY_REJECTED │
     └───────────┘ └─────────┬─────────┘ └─────────┬─────────┘
                             │                     │
                             ▼                     ▼
               ┌─────────────────────────────────────────┐
               │    Warehouse Return Receipt Workflow    │
               │        (Full or Graded Return)          │
               └─────────────────────────────────────────┘
```

---

## 2. Operational Stages

### 2.1 Vehicle & Driver Claims
- Recheck that the assigned vehicle's reefer capability covers the booking's required temperature range.
- Atomically transition vehicle and driver to `ASSIGNED` / `ON_DUTY`.

### 2.2 Cargo Loading & Short Load Reconciliation
- **Batch Allocation Equation**: The loader must provide itemized batch allocations. The sum of allocation weights must equal the actual loaded weight to whole-gram precision ($0.001\text{ kg}$).
- **Short-Load Release**: If the actual loaded weight is less than the planned order reservation, the shortfall is immediately released back to available warehouse stock in the loading transaction. An immutable `SHORT_LOAD_RELEASE` movement is recorded.

### 2.3 Dispatch
- Physical exit from the warehouse is recorded.
- Decrements warehouse occupancy.
- Inserts an immutable `DISPATCH` movement referencing the shipment.

### 2.4 Transit & In-Route Checkpoints
- Only the assigned driver can append checkpoint locations and timestamps while `IN_TRANSIT`.
- Checkpoints are immutable and appended to the ledger.

### 2.5 Buyer Delivery Decision
From `OUT_FOR_DELIVERY`, the buyer confirms or rejects delivery:
- **Confirmation**: Requires exact balance conservation:
  $$\text{delivered\_quantity\_kg} + \text{damaged\_quantity\_kg} + \text{missing\_quantity\_kg} == \text{loaded\_weight\_kg}$$
  - Full delivery sets status `DELIVERED`, PO `FULFILLED`.
  - Partial delivery sets status `PARTIALLY_DELIVERED`, PO `FULFILLED` for the delivered quantity.
- **Rejection**: Sets shipment status `DELIVERY_REJECTED`, PO `FAILED`, and records reason. Vehicle and driver are released.

---

## 3. Warehouse Returns Workflow

Returned cargo must be physically received back into the origin warehouse before any stock can be restocked, written off, or reallocated.

### 3.1 Eligibility Criteria
Returns can only be received for shipments that physically departed and terminated in one of the following statuses:
1. `CANCELLED` (departed prior to cancellation)
2. `DELIVERY_REJECTED` (rejected by buyer upon delivery)
3. `PARTIALLY_DELIVERED` (undelivered balance returned)

### 3.2 Graded Return Endpoints (`POST /api/v1/shipments/{id}/partial-return`)
Allows the warehouse manager to categorize returning cargo into distinct physical lots:
- **Usable Quantity (`usable_quantity_kg`)**: Passed physical QC inspection; safe for resale.
  - If order is terminated (`CANCELLED` or `FAILED`), stock is restored to `available_g` via `release_stock()`.
  - If order remains active, stock is retained as `reserved_g` for re-shipment.
- **Damaged Quantity (`damaged_quantity_kg`)**: Deteriorated or damaged during transit. Increments `damaged_g` on the inventory item.
- **Rejected Quantity (`rejected_quantity_kg`)**: Substandard grade or rejected by buyer. Increments `rejected_g` on the inventory item.

### 3.3 Strict Return Guardrails
1. **Quantity Ceiling**: Total returned quantity cannot exceed the dispatched quantity ($loaded - delivered$).
2. **Double-Return Prevention**: Atomically checks that `return_received_at is None` before writing receipt timestamps and user ID.
3. **Warehouse Capacity Enforcement**: Return intake cannot exceed warehouse or cold storage capacity.
4. **PO Reservation Adjustment**: Non-resellable portions (Damaged + Rejected) automatically decrement the purchase order's accepted quantity.
5. **Discrete Movement Accounting**: Creates individual movement records (`RETURN_RECEIPT_USABLE`, `RETURN_RECEIPT_DAMAGED`, `RETURN_RECEIPT_REJECTED`).
6. **Cryptographic Audit**: Appends a `SHIPMENT_RETURN_RECEIVED` block to the audit ledger containing the full graded breakdown.

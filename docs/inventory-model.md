# AgriChain Inventory Conservation & Stock Model

## 1. Core Conservation Law

Every kilogram of produce received into AgriChain is strictly accounted for across mutually exclusive inventory buckets. At all times and after every state transition or stock movement, the inventory conservation equation holds:

$$\text{Received Total} = \text{Available} + \text{Reserved} + \text{Dispatched} + \text{Delivered} + \text{Damaged} + \text{Rejected}$$

Each quantity is a non-negative real number ($\ge 0.0$ kg) rounded to 2 decimal places.

## 2. Bucket Definitions

| Bucket | Definition |
|---|---|
| **Available** | Produce physically in the warehouse, quality inspected and passed, available for new purchase orders or allocations. |
| **Reserved** | Produce committed to an active purchase order / shipment booking, sequestered to prevent overselling. |
| **Dispatched** | Produce loaded onto an assigned transport vehicle and currently in transit. |
| **Delivered** | Produce successfully received and signed off by the buyer at destination. |
| **Damaged** | Produce spoiled, deteriorated, or physically damaged (either at intake, in storage, or during transit). |
| **Rejected** | Produce failing quality inspection criteria (substandard grade, foreign matter, pesticide residue) or rejected by the buyer on delivery. |

## 3. Allowed Bucket Transitions

All stock movements are atomic and strictly conserve total mass:

```
                  +----------------------------------------------+
                  |               Intake / Receipt               |
                  +----------------------------------------------+
                               /          |          \
                 (Passed QC)  /      (Damaged) \      \ (Failed QC)
                             v                  v      v
+-------------------> [AVAILABLE] --------> [DAMAGED] [REJECTED]
|                         |       (Spoilage)    ^          ^
|           (Reserve PO)  |                     |          |
|                         v                     |          |
|                    [RESERVED]                 |          |
|                         |                     |          |
|             (Dispatch)  |                     |          |
|                         v                     |          |
|                   [DISPATCHED]                |          |
|                    /    |    \                |          |
|     (Return Usable)     |     \ (Return Bad)  |          |
+-------------------------+      +--------------+----------+
                          |
             (Delivery)   |
                          v
                     [DELIVERED]
```

### Transition Matrix

1. **Intake / Receipt**:
   - `received_total += input_kg`
   - `available += accepted_kg`
   - `damaged += damaged_kg`
   - `rejected += rejected_kg`
   - Requirement: `input_kg == accepted_kg + damaged_kg + rejected_kg`.

2. **Reservation (`RESERVE`)**:
   - Precondition: `available >= quantity_kg`
   - `available -= quantity_kg`
   - `reserved += quantity_kg`

3. **Release (`RELEASE`)**:
   - Precondition: `reserved >= quantity_kg`
   - `reserved -= quantity_kg`
   - `available += quantity_kg`

4. **Dispatch (`DISPATCH`)**:
   - Precondition: `reserved >= quantity_kg` (or `available >= quantity_kg` if unreserved)
   - `reserved -= quantity_kg`
   - `dispatched += quantity_kg`

5. **Delivery (`DELIVER`)**:
   - Precondition: `dispatched >= quantity_kg`
   - `dispatched -= quantity_kg`
   - `delivered += quantity_kg`

6. **Return - Reusable (`RETURN_REUSABLE`)**:
   - Precondition: `dispatched >= quantity_kg` (or `delivered >= quantity_kg`)
   - `dispatched -= quantity_kg`
   - `available += quantity_kg`

7. **Return - Damaged (`RETURN_DAMAGED`)**:
   - Precondition: `dispatched >= quantity_kg`
   - `dispatched -= quantity_kg`
   - `damaged += quantity_kg`

8. **Return - Rejected (`RETURN_REJECTED`)**:
   - Precondition: `dispatched >= quantity_kg`
   - `dispatched -= quantity_kg`
   - `rejected += quantity_kg`

9. **Storage Spoilage (`STORAGE_DAMAGE`)**:
   - Precondition: `available >= quantity_kg`
   - `available -= quantity_kg`
   - `damaged += quantity_kg`

10. **Storage Rejection (`STORAGE_REJECT`)**:
    - Precondition: `available >= quantity_kg`
    - `available -= quantity_kg`
    - `rejected += quantity_kg`

## 4. Invariant Assertion Function

```python
def assert_inventory_invariant(item: dict) -> None:
    received = round(float(item.get("received_total_kg", item.get("quantity_kg", 0.0))), 2)
    available = round(float(item.get("available_quantity_kg", item.get("quantity_kg", 0.0))), 2)
    reserved = round(float(item.get("reserved_quantity_kg", 0.0)), 2)
    dispatched = round(float(item.get("dispatched_quantity_kg", 0.0)), 2)
    delivered = round(float(item.get("delivered_quantity_kg", 0.0)), 2)
    damaged = round(float(item.get("damaged_quantity_kg", 0.0)), 2)
    rejected = round(float(item.get("rejected_quantity_kg", 0.0)), 2)

    total_buckets = round(available + reserved + dispatched + delivered + damaged + rejected, 2)
    if abs(received - total_buckets) > 0.01:
        raise AssertionError(
            f"Inventory invariant violation: received={received} != buckets_sum={total_buckets} "
            f"(avail={available}, res={reserved}, disp={dispatched}, deliv={delivered}, dam={damaged}, rej={rejected})"
        )
```


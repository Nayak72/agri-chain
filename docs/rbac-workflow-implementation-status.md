# RBAC and workflow implementation status

This document records implemented changes and known gaps; it is not a complete security certification.

## Implemented in this work

- Warehouse inventory and receipt lists restrict managers to assigned warehouses and reject unrelated roles.
- Vehicle/driver lists and details restrict roles, with transporter ownership and linked-driver checks. Fleet analytics uses an empty scope for an unlinked transporter.
- Shipment, delivery-report, dashboard, shipment, quality and cold-chain analytics use shared role/ownership shipment filters. Freight quotes and shipment references are scoped to the authenticated role.
- Farmer batch visibility is owner-scoped; buyers may inspect warehouse batches and batches attached to their orders; warehouse managers see pre-receipt batches and stock held at assigned warehouses. Other operational roles use their shipment view instead.
- Catalogue creation is administrator-only in the UI, matching its API. Buyers can navigate batch lists and detail pages.
- Failed inspections cannot create accepted stock. Unknown user roles are rejected rather than defaulting to farmer.
- Dashboard active and completed shipment counts include all current states; active lateness and on-time calculations use recorded ETA and arrival.
- Manual simulation sessions are persisted and have independent sequence counters and seeds. The API supports start, pause, resume, stop, and manual stepping; session creation and stepping contend on the shipment transactionally. NORMAL readings are clamped to the produce range. The UI labels the current session and exposes these controls.

## Known limitations — not implemented

- Receipt, reservation and cancellation release append inventory movement records with before/after balances, actor and reference in the same transaction. Existing records have not been backfilled, and dispatch, returns and short loads are not yet represented.

- The role/action permission registry is not consistently applied to all endpoints and UI actions. A complete endpoint authorization/IDOR audit remains required.
- All six role-specific dashboards and operational workspaces are not complete. Analytics remain incomplete: several metrics and financial semantics need validation and efficient aggregation; cold-chain severity and duration are not fully modeled.
- Warehouse capacity and cold-storage capacity are not transactionally enforced. The available/accepted stock accounting does not provide a complete immutable movement ledger, gram/Decimal128 precision, or comprehensive short-load/returns treatment.
- Simulation is manual only; it supports normal, temperature and humidity excursion, door disturbance, refrigeration failure and recovery scenarios, but not automatic playback, transit delay, hysteresis or sustained-excursion severity classification. Alert acknowledgement is recorded separately from resolution with an audit entry; quality analytics estimates alert duration from recorded open and resolve times. Do not describe it as a hardware connection.
- The full requested architectural and permission-matrix documentation and complete six-role end-to-end authorization/concurrency test matrix are not finished.

## Verification

Existing replica-set integration tests use disposable randomly named databases and include duplicate receipt, concurrent reservation, ledger and independent simulation session checks. The reconciliation script was also run against the local `agri_chain_test` database; its passing result on an empty database does not validate any deployment's data. Frontend/browser/backend coverage is not a substitute for a complete security review.

## Inventory backfill and input precision

`scripts/backfill_inventory_movements.py` defaults to a dry run; `--apply` creates a single `OPENING_BALANCE` snapshot for each legacy inventory row with no movement history. It locks the inventory document in a transaction and is safe to rerun. The snapshot explicitly does not reconstruct previous transactions. Run only after backing up and verifying the target database; the script has not been applied to existing user data.

New receipt, purchase-order, loaded-weight and delivery inputs reject sub-gram quantities; receipt and delivery reconciliation uses decimal string conversion and exact equality. MongoDB balances are still stored and incremented as floating-point kilograms, so this is not a complete precision migration. Historical quantities should be audited before converting to integer grams or Decimal128.

## Additional order and freight isolation

Purchase-order lists deny drivers and transporters, and detail access is limited to the buyer, seller, administrator, or a warehouse manager assigned to stock from the order's batch. Transporters can view open freight tenders and their own confirmed bookings; unrelated roles and other transporters' confirmed bookings are denied. These fixes cover these endpoints only and do not constitute a full IDOR audit.

## Shipment validation follow-up

Loading now validates that supplied batch allocations identify exactly the shipment's batches, contain non-negative finite whole-gram quantities, and sum exactly to loaded weight; missing allocation rows abort the transaction. Refrigerated bookings require a vehicle whose configured temperature range covers the booking range. These checks do not release short-load reservations or implement return/capacity accounting.

Latest verification: 105 backend tests passed without a database URI; 12 replica-set tests skipped in that run. A separate full replica-set run passed the six-role refrigerated lifecycle after its test vehicle was given temperature limits, but the MongoDB container then stopped with a WiredTiger fatal assertion; the full run ended with a failure and two connection errors. Investigate the local MongoDB storage failure before relying on that run.

## Short-load accounting follow-up

For a single-batch order with a valid inventory allocation, loading less than the planned shipment quantity now releases the difference in the loading transaction, updates the order's accepted/reserved amount, and records a `SHORT_LOAD_RELEASE` movement. Cancelling the order releases its remaining accepted quantity. A shipment cannot be created from an older confirmed booking whose cargo quantity no longer matches the order reservation. Older incomplete allocations are rejected rather than guessed. This is not a return workflow, and the floating-point storage migration and broader capacity accounting are still pending. These changes were not tested in this turn at the user's request.

## Further read isolation

Freight quotation endpoints deny unrelated roles; buyer/seller detail access fails closed if the booking is missing. Farm listing is limited to administrators and the owning farmer; a buyer may inspect a farm associated with an available batch or their order. Other roles cannot fetch arbitrary farms. Non-administrator ledger block and generic entity-history access is restricted to entries they authored, preventing cross-user disclosure but not yet providing the complete related-record provenance view requested by the product. These changes were not tested in this turn at the user's request.

## Dispatch accounting follow-up

Dispatch now writes a `DISPATCH` movement for shipments with a valid linked order inventory allocation, in the same transaction as the shipment transition. It records the actual loaded quantity while leaving available stock unchanged because the order reservation already reduced availability. A single-batch shipment item is updated to actual loaded weight even if the driver omits explicit batch quantities. Legacy orders without an inventory allocation cannot produce a reliable dispatch movement and are not fabricated. Cancelling an order after a cancelled shipment has departed is blocked because the application has no recorded-return workflow; this prevents falsely returning goods in transit to available stock. These changes were not tested in this turn at the user's request.

# RBAC and workflow implementation status

This document records implemented changes and known gaps; it is not a complete security certification.
The dated follow-up sections below supersede earlier descriptions where they differ.

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

- Receipt, reservation, cancellation, dispatch, short-load release and eligible full usable returns write movement records. Existing records have not been backfilled, and historical dispatches and partial or damaged returns are not reconstructed.

- The role/action permission registry is not consistently applied to all endpoints and UI actions. A complete endpoint authorization/IDOR audit remains required.
- All six role-specific dashboards and operational workspaces are not complete. Analytics remain incomplete: several metrics and financial semantics need validation and efficient aggregation; cold-chain severity and duration are not fully modeled.
- Receipt, dispatch, full-return and warehouse-capacity changes serialize on the warehouse document. Capacity is derived from accepted inventory, recorded dispatches and recorded full returns. New inventory balances use integer grams; historical migration, a complete movement history and comprehensive returns treatment remain outstanding. Legacy inventory without cold classification is conservatively counted as cold in refrigerated warehouses; dispatches without movement records remain counted as stored stock.
- Simulation supports manual and automatic playback for normal, temperature and humidity excursion, door disturbance, refrigeration failure and recovery scenarios. Transit-delay simulation is not implemented. Alert acknowledgement is recorded separately from resolution with an audit entry; quality analytics estimates alert duration from recorded open and resolve times. Do not describe it as a hardware connection.
- The full requested architectural and permission-matrix documentation and complete six-role end-to-end authorization/concurrency test matrix are not finished.

## Verification

Existing replica-set integration tests use disposable randomly named databases and include duplicate receipt, concurrent reservation, ledger and independent simulation session checks. The reconciliation script was also run against the local `agri_chain_test` database; its passing result on an empty database does not validate any deployment's data. Frontend/browser/backend coverage is not a substitute for a complete security review.

## Inventory backfill and input precision

`scripts/backfill_inventory_movements.py` defaults to a dry run; `--apply` creates a single `OPENING_BALANCE` snapshot for each legacy inventory row with no movement history. It locks the inventory document in a transaction and is safe to rerun. The snapshot explicitly does not reconstruct previous transactions. Run only after backing up and verifying the target database; the script has not been applied to existing user data.

New receipt, purchase-order, loaded-weight and delivery inputs reject sub-gram quantities; receipt and delivery reconciliation uses decimal string conversion and exact equality. New inventory uses authoritative integer-gram balances. Reservations and releases lazily migrate valid legacy rows in the same transaction and update kilogram compatibility fields from grams. The explicit `scripts/migrate_inventory_grams.py` defaults to dry run and reports invalid or sub-gram historical balances without rounding. Existing data has not been bulk migrated. Older application workers must be stopped before applying this change because they update kilogram fields without gram fields.

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

## Return receipt and action capabilities

A cancelled shipment that physically departed can receive a full usable return. The assigned warehouse manager (or administrator) records the inspected quantity and condition. The transaction checks that the quantity equals the loaded weight and remaining reservation, marks the return once, and records a custody movement plus a ledger event. Goods remain reserved until the buyer cancels the order; partial, damaged, and rejected-delivery returns are not implemented. Legacy records without a matching allocation are rejected for manual reconciliation. This work has not been tested in this turn, per the user's request.

The backend's existing permission registry now also issues action capabilities for warehouse receiving, full returns, sensor simulation, alert acknowledgement and resolution. Those operations enforce the action capability before ownership checks, and corresponding frontend controls use the authenticated user's capabilities. Other operations and navigation remain on their previous role checks; the centralized rollout and complete IDOR audit are not finished.

## Reading severity and hysteresis

New simulated readings use WARNING for an initial minor breach and CRITICAL for a two-sample breach or a deviation of at least 2°C/10 humidity percentage points. After an excursion the reading remains WARNING until temperature is 0.2°C and humidity is 1 percentage point inside the configured ranges. Open alerts are escalated but remain open until an operator resolves them. Previous samples with incomplete legacy range data are ignored for classification. This is sample-based, not a real-time duration model, and automatic playback is now available through the lease-coordinated worker described below. These changes were not tested in this turn at the user's request.

## Warehouse capacity implementation

Receipts choose whether accepted goods use cold storage; a batch explicitly marked `requires_cold_storage` cannot bypass it. Total and cold capacity are checked against inventory accepted, less recorded DISPATCH movements, plus RETURN_RECEIPT_RESERVED movements. Receipts, dispatches, full usable returns, and capacity edits write the same warehouse lock inside their transaction. Capacity reductions below recorded occupancy are rejected. Old inventory with no cold classification counts as cold in refrigerated warehouses. Missing historical dispatch movements cause conservative over-counting; this must be reconciled from trustworthy source records and must not be fabricated. Legacy warehouses without configured total capacity cannot receive stock until configured. Produce handling profiles do not themselves currently encode a mandatory storage classification, so the warehouse operator must select cold storage where required. These changes have not been tested in this turn at the user's request.


## Inventory gram rollout constraints

The on-demand and bulk conversions preserve stored balances without inventing stock movements. A mismatch between kilogram cache and gram fields, a partial conversion, an invalid or fractional-gram legacy value, or available stock above accepted stock blocks that row until it is reconciled manually. `--apply` writes to the configured database and must only be used after checking the target, backing up, and stopping older application workers. The bulk migration has not been run against user data. Existing stock movements, purchase orders and shipments remain kilogram-valued; this is not a complete whole-gram migration of every historical business quantity. No tests were run in this turn at the user's request.


## Automatic simulated telemetry playback

The application starts one bounded polling loop per backend process only when MongoDB transactions are available. Each loop claims due sessions using an expiring MongoDB lease. The reading transaction checks the lease owner, lease expiry, session state, due time, and sequence before committing a reading and scheduling the next one. Pause and stop invalidate the lease; shutdown releases owned leases, and expired leases can be recovered by another worker. The creator's current account state, role and shipment ownership are rechecked for each scheduled reading. Playback stops on authorization or operational errors, and it is disabled in standalone development mode. Playback speed is set when a session starts; simulated time advances by the configured interval per reading, with a minimum real interval of one second. This is synthetic telemetry, not hardware integration. These changes were not tested in this turn at the user's request.

## Workspace capability rollout

`/auth/me` now exposes `page:*` capabilities generated from the backend role registry. Recognized application routes, desktop/mobile navigation and dashboard quick actions consume those capabilities. Transporters can reach freight tenders; farmers can reach their scoped delivery reports; buyers can reach permitted farm provenance; warehouse managers can reach relevant delivery reports. Unknown roles receive no workspace capabilities. User role normalization trims whitespace and normalizes case.

Page capabilities control presentation only; they do not grant API access. Existing endpoint role and resource-ownership checks remain in force. Action-level capabilities are still only implemented for the subset documented above, and a complete endpoint/IDOR audit and six role-specific dashboards are still required. These changes were not tested in this turn at the user's request.

## Role-scoped dashboard metrics

`GET /analytics/workspace` provides database counts for each role: administrator governance totals; farmer farms, batches and seller-order status; buyer order and delivery-decision counts; assigned warehouse inventory and receipt totals; transporter fleet/driver/quotation counts; and assigned-driver shipment/alert counts. The frontend displays these separately from shared shipment metrics. These are an initial operational overview, not the full financial, inventory-ageing, driver-instruction or alert-duration dashboards requested in the original brief.

Transit averages use recorded dispatch/arrival timestamps; on-time percentages exclude records without both timestamps. Missing metrics display as unavailable instead of fabricated zeroes. Dashboard request failures display an error. Query caches are cleared when the authenticated account changes and dashboard keys include the user ID. These changes were not tested in this turn at the user's request.

## Administrative changes and further isolation

Delivery report detail resolves and authorizes its shipment before returning a report, including when legacy records use a public shipment identifier. Transporter profile reads are restricted to administrators or the profile owner. This is a targeted fix, not a completed IDOR audit.

Administrators can update non-administrator roles and profiles with a reason. Profile updates, suspensions and reactivations write the user change, a before/after audit record and a ledger event together in a transaction. Administrator roles cannot be assigned or changed through this operation, and administrator accounts cannot be suspended. The user detail page displays recorded changes. Earlier changes have not been backfilled. The user directory uses server-side filtered counts and pagination. Suspension and activation clients must send a JSON reason.

These changes have not been tested in this turn at the user's request.

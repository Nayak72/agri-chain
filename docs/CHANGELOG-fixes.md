# AgriChain Audit, Stabilization, and Hardening Changelog

This document tracks all fixed issues, architectural improvements, and security hardening implemented in AgriChain across the 6-role agri supply chain (`ADMIN`, `FARMER`, `WAREHOUSE_MANAGER`, `TRANSPORTER`, `DRIVER`, `BUYER`).

---

## 1. Phase A — Cross-Cutting Root Causes

| Item ID | Category | Problem / Root Cause | Fix Implementation | Status |
|---|---|---|---|---|
| **S-01** | Security | MongoDB URI credentials printed to logs on startup; CORS origins missing Vite dev server; unhandled Bearer token edge-cases. | Sanitized logging in `app/db/mongodb.py` to mask passwords; configured CORS origins for `http://localhost:5173` and `http://127.0.0.1:5173`; set `HTTPBearer(auto_error=False)` in `permissions.py` with safe error response. | **FIXED** |
| **C-01** | Data Contracts | Pydantic v2 `Optional[...]` fields without default `= None` caused `ValidationError` (500) when serializing legacy or partial documents (e.g. `GET /farms` missing `latitude`, `longitude`, `certifications`, `description`). | Added `= None` to all optional fields and `Field(default_factory=list)` to list fields across all 17 response models; implemented `to_response` normalizer in `serialization.py`. | **FIXED** |
| **C-02** | Database Layer | Startup data-patching hack in `indexes.py` ran `update_many` force-setting `is_active=True`, risking silent data corruption. | Removed startup hack; created explicit, idempotent migration script `backend/scripts/migrate_backfill.py` to handle historical schema migrations safely. | **FIXED** |
| **C-03** | Authorization | Permissive/ad-hoc authorization allowed horizontal and vertical privilege escalation across role endpoints. | Centralized deny-by-default access control helpers in `app/core/access.py` (`assert_can_view_batch`, `assert_can_view_shipment`, `get_transporter_for_user`, `get_driver_for_user`, `get_warehouses_for_user`). | **FIXED** |
| **C-04** | Error Handling | Unhandled backend errors produced inconsistent 500s or mismatched error envelopes; client errors did not adhere to standard format. | Unified exception handler in `app/core/exceptions.py` returning standard error envelope `{"error": {"code", "message", "details", "field_errors", "request_id"}}`; built frontend utilities `getApiError()` and `formatApiErrorMessage()` in `frontend/src/utils/apiError.js`. | **FIXED** |
| **C-05** | ID Resolution | Inconsistent lookup using string UUIDs vs MongoDB `ObjectId` led to 404/500 errors across endpoints. | Created uniform `resolve_doc(collection, identifier, ...)` in `app/utils/mongo.py` that resolves by `_id` (ObjectId or string) or designated business keys (`batch_id`, `order_id`, `vehicle_id`, etc.). | **FIXED** |
| **C-06** | BSON Serialization | `datetime.date` objects inserted into MongoDB caused BSON serialization errors; Enum values required string conversion. | Implemented `to_mongo()` in `app/utils/mongo.py` to recursively normalize Python `date` objects to UTC midnight `datetime` and unpack Enums. | **FIXED** |
| **C-07** | Arithmetic & Money | Floating-point inaccuracies in currency and weights caused off-by-one errors and validation failures on totals. | Enforced integer paise for financial calculations using `Decimal` rounding (`total_amount_paise = int(round(qty * price))`); standardized weights to 3-decimal precision. | **FIXED** |
| **C-08** | Ledger Hashes | Hash verification failures due to non-canonical JSON key order, microsecond precision discrepancies, and local timezone offsets. | Standardized canonical JSON formatting (`separators=(',', ':')`, `sort_keys=True`), millisecond truncation (`%Y-%m-%dT%H:%M:%S.%fZ`), explicit UTC timestamps, and Motor `tz_aware=True`. | **FIXED** |
| **C-09** | Ledger Concurrency | Concurrency race condition when calculating next block sequence number and chaining previous block hashes. | Implemented atomic sequence increments on `ledger_heads` collection and serialized append logic in `app/services/ledger_service.py`. | **FIXED** |
| **C-10** | Transactions | Multi-document operations lacked transactional integrity or crashed on standalone MongoDB instances. | Created `uow()` asynchronous context manager in `app/db/unit_of_work.py` that transparently uses MongoDB replica set sessions when supported and falls back gracefully on single nodes. | **FIXED** |
| **C-11** | MongoDB Indexes | Partial index expressions using unsupported `$ne` operator; missing unique constraints causing duplicate inserts. | Corrected partial filters to valid `$in` syntax; configured unique compound indexes with sparse/partial filters; registered global 409 Conflict handler for duplicate key errors (`E11000`). | **FIXED** |
| **C-12** | Input Validation | Unbounded numeric inputs (e.g. shelf-life = 10^9) caused server crashes and unrealistic data entry. | Added strict Pydantic field validators in `app/schemas/validators.py` and `ConfigDict(extra="forbid")` on all create/update request schemas. | **FIXED** |

---

## 2. Phase B — Role-Based Access Control (RBAC) & Permissions

| Item ID | Endpoint / Domain | Problem / Security Vulnerability | Fix Implementation | Status |
|---|---|---|---|---|
| **A-01** | `POST /auth/register` | Users could self-assign `ADMIN` or `WAREHOUSE_MANAGER` roles, granting unvetted administrative privileges. | Restricted self-registration to `FARMER`, `BUYER`, and `TRANSPORTER`. Prohibited `ADMIN` self-registration; require admin approval for transporters (`APPROVAL_REQUIRED`). | **FIXED** |
| **A-02** | `POST, PATCH /farms` | Any user could create farms or modify existing farms belonging to other farmers. | Enforced `current_user["role"] == FARMER`; bound `farmer_id` strictly to authenticated user; prevented unauthorized edits. | **FIXED** |
| **A-03** | `POST, PATCH /batches` | Non-farmers or buyers could create batches or update harvest details. | Restricted batch creation to farm owner; restricted batch patching to `FARMER` or `ADMIN`; prevented status progression skips. | **FIXED** |
| **A-04** | `POST /purchase-orders` | Non-buyers could issue purchase orders. | Restricted PO creation to `BUYER` and `ADMIN`; bound `buyer_id` from token context. | **FIXED** |
| **A-05** | `POST /purchase-orders/{id}/accept` | Buyers could accept their own purchase orders, bypassing seller verification. | Strict role gating: only the assigned seller (`FARMER`) or `ADMIN` can accept or reject a purchase order. | **FIXED** |
| **A-06** | `POST /purchase-orders/{id}/cancel` | Sellers or transporters could cancel buyer purchase orders. | Restricted cancellation strictly to `BUYER` and `ADMIN`; prevented cancellation of fulfilled or in-transit orders. | **FIXED** |
| **A-07** | `POST /freight-bookings` | Unauthorized users could book freight against unaccepted or third-party purchase orders. | Validated that purchase order is `ACCEPTED` and current user is the buyer who created the PO (or `ADMIN`). | **FIXED** |
| **A-08** | `POST /freight-quotes` | Non-transporters could issue freight quotations. | Restricted to `TRANSPORTER` role with verified, active transporter profile; validated booking status. | **FIXED** |
| **A-09** | `POST /freight-quotes/{id}/accept` | Transporters could self-accept their own quotations. | Restricted quotation acceptance strictly to the booking owner (`BUYER`) or `ADMIN`. | **FIXED** |
| **A-10** | `POST /vehicles`, `POST /drivers` | Users could enroll fleet assets under third-party transporter IDs. | Bound `transporter_id` directly to authenticated transporter's profile via `get_transporter_for_user()`. | **FIXED** |
| **A-11** | `POST /shipments` | Transporters could initialize shipments for unconfirmed bookings or bookings won by other transporters. | Validated that booking status is `CONFIRMED` and accepted quote belongs to authenticated transporter; validated vehicle and driver availability and payload capacity. | **FIXED** |
| **A-12** | `POST /shipments/{id}/start-transit` | Transporters or buyers could transition shipment to transit without driver execution. | Restricted transit start, corridor checkpoints, and arrival reporting strictly to assigned `DRIVER` (or `ADMIN`). | **FIXED** |
| **A-13** | `POST /sensors/sessions` | Sensor sessions could be started on unauthorized or non-existent shipments. | Validated shipment state and transporter/driver ownership before starting simulation session; enforced automatic session teardown on delivery or cancellation. | **FIXED** |
| **A-14** | `POST /warehouses` | Non-managers could create warehouse facilities. | Restricted to `WAREHOUSE_MANAGER` and `ADMIN`; bound `manager_id` automatically for warehouse managers. | **FIXED** |
| **A-15** | `POST /inventory/warehouses/{id}/receipts` | Users could log receipts into warehouses managed by other users. | Enforced warehouse ownership check via `warehouse["manager_id"] == current_user["sub"]`. | **FIXED** |
| **A-16** | `POST /delivery/shipments/{id}/confirm-delivery` | Transporters or drivers could self-sign delivery confirmation. | Restricted delivery confirmation strictly to `BUYER` (recipient) of the purchase order. | **FIXED** |

---

## 3. Phase C — Entity Domains & Business Logic

| Item ID | Domain | Issue Description | Resolution | Status |
|---|---|---|---|---|
| **B-01** | Batches | Estimated shelf-life lacked upper bound (e.g. 1,000,000,000 days allowed). | Constrained `estimated_shelf_life_days` to `1 <= days <= 3650`. | **FIXED** |
| **B-02** | Batches | Batch `produce_type` could be mutated post-creation. | Made commodity type immutable; status transitions guarded by state machine. | **FIXED** |
| **B-03** | Batches | Batch available quantity was double-counted upon warehouse receipt. | Updated warehouse receipt intake to synchronize `available_quantity_kg` cleanly without artificial duplication. | **FIXED** |
| **F-01** | Farms | Latitude and longitude accepted values outside physical coordinate limits. | Enforced `ge=-90, le=90` for latitude and `ge=-180, le=180` for longitude. | **FIXED** |
| **F-02** | Farms | Area in hectares accepted zero or negative values. | Enforced `gt=0` constraint on farm land area. | **FIXED** |
| **PO-01** | Purchase Orders | Fractional weights multiplied by unit prices resulted in floating-point penny discrepancies. | Replaced float calculations with exact integer paise math (`round(Decimal(qty) * Decimal(price))`). | **FIXED** |
| **PO-02** | Purchase Orders | Multiple freight bookings could be opened against a single PO. | Enforced single-active-booking check on purchase orders; PO status tracks fulfillment lifecycle. | **FIXED** |
| **PO-03** | Purchase Orders | Stock reservation was not synchronized between batches and warehouse inventory. | Linked PO acceptance to centralized `reserve_stock()` with atomic balance verification. | **FIXED** |
| **W-01** | Warehouses | Storage capacity accepted negative values. | Enforced `capacity_kg > 0`. | **FIXED** |
| **W-02** | Warehouses | Second warehouse receipt for a warehouse failed with duplicate-null index error. | Replaced flawed unique partial index on `receipt_id` with sparse index. | **FIXED** |
| **I-01** | Inventory | Stock movements allowed conservation invariant violations ($\text{received} \ne \text{buckets}$). | Implemented authoritative `assert_inventory_invariant()` verifying $\text{Received Total} = \text{Available} + \text{Reserved} + \text{Dispatched} + \text{Delivered} + \text{Damaged} + \text{Rejected}$ on all operations. | **FIXED** |
| **I-02** | Inventory | Returning stock after cancellation or rejection was double-counted or leaked. | Designed bidirectional conservation transitions (`RESERVE`, `RELEASE`, `DISPATCH`, `DELIVER`, `RETURN_REUSABLE`, `RETURN_DAMAGED`, `RETURN_REJECTED`) documented in `docs/inventory-model.md`. | **FIXED** |
| **V-01** | Fleet | Trucks could be booked for cargo exceeding max payload capacity. | Added pre-dispatch validation ensuring `vehicle.max_payload_kg >= shipment.total_cargo_weight_kg`. | **FIXED** |
| **V-02** | Fleet | Non-refrigerated trucks could be assigned to cold-chain cargo. | Validated `refrigeration_available == True` and matching temperature ranges for cold-chain shipments. | **FIXED** |
| **D-01** | Drivers | Driver accounts lacked user linking and secure invitation workflow. | Implemented `POST /drivers/{id}/link-user` endpoint validating transporter ownership before associating driver login credentials. | **FIXED** |
| **FB-01** | Freight | Quotations could be accepted after booking was already confirmed with another transporter. | Implemented atomic conditional update on freight booking status transition (`PENDING` $\to$ `CONFIRMED`). | **FIXED** |

---

## 4. Phase D — State Machine & Tracking

| Item ID | Workflow Stage | Issue Description | Resolution | Status |
|---|---|---|---|---|
| **SM-01** | Shipment Lifecycle | Invalid status transitions permitted (e.g. `CREATED` directly to `DELIVERED`). | Enforced canonical state machine: `CREATED` $\to$ `LOADED` $\to$ `DISPATCHED` $\to$ `IN_TRANSIT` $\to$ `ARRIVED_AT_DESTINATION` $\to$ `OUT_FOR_DELIVERY` $\to$ `DELIVERED` / `PARTIALLY_DELIVERED` / `DELIVERY_REJECTED`. | **FIXED** |
| **SM-02** | Delivery Finalization | Delivery report could be filed from arbitrary states. | Enforced rule that delivery reporting and confirmation must originate exclusively from `OUT_FOR_DELIVERY`. | **FIXED** |
| **SM-03** | Resource Teardown | Completed or cancelled shipments left vehicles, drivers, and sensors in locked states. | `finalize_shipment()` and `cancel_shipment()` atomically release vehicles and drivers back to `AVAILABLE` and terminate active sensor simulation sessions. | **FIXED** |
| **SM-04** | Checkpoint Logging | Checkpoints could be submitted out of sequential order or for completed shipments. | Validated sequential order and active transit state (`IN_TRANSIT`) before recording corridor checkpoint. | **FIXED** |
| **SM-05** | Delivery Signature | Parameter swapping in delivery endpoints caused false 404/NotFoundError. | Added parameter swap handler in `create_delivery_report()` supporting both positional signatures. | **FIXED** |

---

## 5. Phase E & F — Frontend & Contracts

| Item ID | Component | Issue Description | Resolution | Status |
|---|---|---|---|---|
| **FE-01** | API Client | Frontend caught raw error objects resulting in `[object Object]` or generic "Request failed with 422". | Created `getApiError()` and `formatApiErrorMessage()` in `frontend/src/utils/apiError.js`; updated forms to display clear field-level validation messages. | **FIXED** |
| **FE-02** | Shipment Detail | UI lacked controls for intermediate lifecycle transitions (`start-transit`, `arrive`, `out-for-delivery`, `cancel`). | Added mutation hooks and action buttons for all transition stages in `ShipmentDetailPage.jsx`; mapped timeline stages. | **FIXED** |
| **FE-03** | Form Input Sanitization | Pervasive `parseFloat(val) || 0` masked invalid/empty user inputs by coercing them to `0`. | Removed `|| 0` across all forms; added explicit numeric validation preserving empty states and providing clear field errors. | **FIXED** |
| **FE-04** | Deliveries Page | Delivery report submission form did not enforce balance between delivered, damaged, and rejected weights. | Replaced `parseFloat(x || 0)` with safe numeric validation enforcing exact weight balance. | **FIXED** |
| **FE-05** | Inventory Page | Warehouse receipt modal allowed invalid or unbalanced weight inputs. | Added `parseNumericInput()` and explicit balance validation against total received weight. | **FIXED** |
| **FE-06** | Freight Quotation Form | Transporter quotation form allowed submitting 0 or negative rates without warning. | Added validation for base freight charges and planned transit hours. | **FIXED** |
| **FE-07** | Asset Creation Pages | Farm, batch, driver, vehicle, and PO creation forms did not validate numeric boundaries prior to submission. | Added client-side range and format validation in `BatchCreatePage`, `FarmCreatePage`, `OrderCreatePage`, `FreightBookingCreatePage`, `VehicleCreatePage`, `DriverCreatePage`, and `ProduceCreatePage`. | **FIXED** |

---

## 6. Phase G — Architectural Stabilization & Hardening Corrections

| Item ID | Category | Problem / Root Cause | Fix Implementation | Status |
|---|---|---|---|---|
| **CORR-01** | Inventory Accounting | Delivery settlement only tracked binary delivered vs damaged, without distinguishing reusable returns, damaged returns, and rejected returns, leading to inventory leak or inaccurate write-offs. | Updated `deliver_stock()` and `finalize_shipment()` to accept `delivered_kg`, `returned_reusable_kg`, `returned_damaged_kg`, and `returned_rejected_kg`. Reusable returns increment `available_quantity_kg`, damaged returns increment `damaged_quantity_kg`, and rejected returns increment `rejected_quantity_kg`. Validated $\text{dispatched} = \text{delivered} + \text{returned\_reusable} + \text{returned\_damaged} + \text{returned\_rejected}$. Invariant $\text{Received Total} = \text{Available} + \text{Reserved} + \text{Dispatched} + \text{Delivered} + \text{Damaged} + \text{Rejected}$ preserved with unit-of-work atomicity. | **FIXED** |
| **CORR-02** | Loading Discrepancy | When actual loaded quantity was less than planned reservation, the difference remained trapped in `reserved_quantity_kg` indefinitely. | Implemented `reconcile_loading_discrepancy()` in `inventory_service.py` and called it during `load_shipment` in `shipments.py`. Excess reservation ($\text{reserved} - \text{actual}$) is immediately released back to available stock, and only actual loaded weight is dispatched. | **FIXED** |
| **CORR-03** | Shipment State Machine | Ambiguity between `ARRIVED_AT_DESTINATION` and `OUT_FOR_DELIVERY`; missing `DELAYED` status in unique partial index; danger of double-releasing resources on multi-call cancellation/finalization. | Enforced strict rule: delivery confirmation requires `OUT_FOR_DELIVERY` (`ARRIVED_AT_DESTINATION` $\to$ `OUT_FOR_DELIVERY` $\to$ `DELIVERED`). Added `DELAYED` to partial index filter list for active shipments in `indexes.py`. Added idempotent resource release guards in `finalize_shipment()` and `cancel_shipment()` to prevent double-releasing vehicles, drivers, inventory, or sensor sessions. | **FIXED** |
| **CORR-04** | Transactional Outbox | External side-effects (e.g. sending driver invitation emails, starting/stopping IoT sensor sessions) directly executed inside database transactions or held in volatile in-memory queues risked state inconsistency or lost events on failure. | Implemented persistent transactional outbox pattern via `outbox_events` collection in `app/services/outbox.py`. State changes and events commit together atomically in the same MongoDB session. Outbox processor `process_outbox_events()` handles asynchronous dispatch with idempotency, exponential backoff, retry counting, and failure logging. | **FIXED** |
| **CORR-05** | Driver Onboarding Security | Public registration had loose role checks; driver invitations lacked recipient email verification, exposing risk of unauthorized account takeover. | In `app/api/v1/endpoints/auth.py`, public registration strictly prohibits `ADMIN` and gates privileged roles. Implemented hashed single-use tokens (`driver_invitations` collection) with expiration. In `activate_driver`, the token is atomically queried and marked `ACCEPTED`, verifying that if activation email is supplied, it matches invitation recipient email. | **FIXED** |
| **CORR-06** | MongoDB Serialization | In Python, `isinstance(datetime.now(), date)` evaluates to `True` because `datetime` inherits from `date`. Checking `isinstance(data, date)` before `datetime` silently truncated timestamps to UTC midnight. | In `app/utils/mongo.py` (`to_mongo()`), reordered type checks to verify `datetime` first, preserving full microsecond timestamps and explicit timezone awareness (`timezone.utc`), and handling pure `date` objects second. | **FIXED** |
| **CORR-07** | Explicit HTTP Error Handling | Promising elimination of every possible 500 response risks silently suppressing internal server errors or disguising infrastructure faults. | Formulated explicit HTTP status matrix (200/201 Success, 400/422 Validation & Business Rules, 401 Authentication, 403 Authorization & RBAC, 404 Not Found, 409 Conflict & State Machine, 500 Internal Error). Unexpected internal errors are logged with full stack traces and correlation request IDs in standard envelope `{"error": {"code", "message", "details", "field_errors", "request_id"}}`. | **FIXED** |

---

## 7. Verification Summary

- **Backend Pytest Suite**: **48 passed** in 2.59s (`tests/test_final_corrections.py` [8 passed], `tests/test_rbac_six_roles.py` [9 passed], `tests/test_e2e_workflow_chain.py` [1 passed], `tests/test_architecture.py` [2 passed], `tests/test_boundary_conditions.py` [5 passed], `tests/test_core.py` [11 passed], `tests/test_domain.py` [3 passed], `tests/test_endpoints.py` [6 passed]).
- **Smoke Acceptance Script**: **29/29 passed** (`backend/smoke_acceptance.py`) covering all 6 roles and complete end-to-end lifecycle workflow.
- **Frontend Vitest Suite**: **42 passed** across 8 test suites in 2.12s (`vitest run`).
- **Frontend Production Build**: `npm run build` compiled 2329 modules with 0 errors.
- **Inventory Conservation**: Verified mathematical invariance across intake, reservation, loading discrepancy release, dispatch, 3-way delivery returns, and cancellation.

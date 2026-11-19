# AgriChain Endpoint Permission & IDOR Authorization Matrix

This document provides a comprehensive, endpoint-by-endpoint security audit and authorization matrix for all API routes across AgriChain.

## 1. Centralized Authorization Architecture

AgriChain employs a strict **two-tier defense-in-depth authorization model**:

```
                         Incoming HTTP Request
                                  │
                                  ▼
               ┌─────────────────────────────────────┐
               │    Authentication & Token Decode    │  (Bearer JWT, active check,
               │          get_current_user           │   approval check, strict role)
               └──────────────────┬──────────────────┘
                                  │
                                  ▼
               ┌─────────────────────────────────────┐
               │    Tier 1: Role & Action RBAC       │  (enforce_permission /
               │    Capability Authorization         │   require_permission)
               └──────────────────┬──────────────────┘
                                  │
                                  ▼
               ┌─────────────────────────────────────┐
               │    Tier 2: Resource Ownership       │  (assert_can_view_*,
               │       & IDOR Scoping (Default-Deny) │   shipment_scope, warehouse_id)
               └──────────────────┬──────────────────┘
                                  │
                                  ▼
               ┌─────────────────────────────────────┐
               │    Transaction Execution & Audit    │  (run_in_txn snapshot/majority,
               │    with Append-Only Hash-Chain Log  │   immutable ledger block)
               └─────────────────────────────────────┘
```

### 1.1 Tier 1: Role & Action RBAC Capabilities
Every authenticated request is mapped to one of the six authoritative roles:
- `ADMIN`: Platform administrator with governance and audit privileges.
- `FARMER`: Primary producer creating batches and fulfilling orders.
- `WAREHOUSE_MANAGER`: Physical facility custodian managing receipts, inventory, and returns.
- `TRANSPORTER`: Logistics provider managing fleet, quotations, and shipment execution.
- `DRIVER`: Vehicle operator executing transit and recording delivery checkpoints.
- `BUYER`: Commercial purchaser placing orders and accepting/rejecting deliveries.

Action-level capabilities (`inventory:receive`, `returns:receive`, `sensors:simulate`, `alerts:acknowledge`, `alerts:resolve`) are enforced before executing physical stock mutations or telemetry updates.

### 1.2 Tier 2: Resource-Level Scoping (IDOR Prevention)
No authenticated user can access arbitrary resources simply by knowing an `_id` or public identifier. All queries use default-deny filters:
- **Shipments**: `shipment_scope()` enforces:
  - Farmer: `farmer_id == user.sub`
  - Buyer: `buyer_id == user.sub`
  - Transporter: `transporter_id == user's transporter._id`
  - Driver: `driver_id == user's driver._id`
  - Warehouse Manager: `batch_ids` matching inventory lots stored in warehouses managed by `user.sub`
- **Related Records (Alerts, Telemetry, Checkpoints, Reports)**: `shipment_reference_scope()` projects `shipment_scope` IDs, ensuring telemetry or delivery reports cannot be accessed across organizational boundaries.
- **Warehouses & Inventory**: Restricted to `manager_id == user.sub`.
- **Farms & Batches**: Restricted to `farmer_id == user.sub` (with buyer read access granted only for batches available for sale or tied to active orders).
- **Vehicles & Drivers**: Transporter profile owner scoping (`transporter_id`).

---

## 2. Exhaustive API Endpoint Matrix

| Method | Endpoint Path | Operation | Action / Role Requirement | Permitted Roles | Resource Ownership & IDOR Enforcement | Preconditions / Exceptions |
|---|---|---|---|---|---|---|
| **AUTH** | | | | | | |
| `POST` | `/api/v1/auth/register` | Register User | Public | Any (New) | N/A (creates inactive/unapproved user for operational roles; default approved for Buyer/Farmer) | Rejects duplicate email/phone. |
| `POST` | `/api/v1/auth/login` | Login | Public | All registered | Password verification, checks `is_active` and `is_approved`. | Returns signed JWT bearer token. |
| `GET` | `/api/v1/auth/me` | Current User Info | `get_current_user` | All roles | Scoped to token `sub`. | Returns user document, role, and UI `page:*` workspace capabilities. |
| **USERS** | | | | | | |
| `GET` | `/api/v1/users` | List Users | `Role.ADMIN` | Admin | System-wide server-side filtered pagination. | Supports role/status filters. |
| `GET` | `/api/v1/users/{user_id}` | Get User | `Role.ADMIN` or Self | Admin, Owner | Denies access to other users' private profiles. | 404 on malformed ObjectId. |
| `PATCH` | `/api/v1/users/{user_id}` | Update User Profile | `Role.ADMIN` | Admin | Admin modifies non-admin roles and approval status with reason. | Logs transactional before/after audit and ledger event. Admin role immutable. |
| `POST` | `/api/v1/users/{user_id}/approve` | Approve User | `Role.ADMIN` | Admin | Validates user exists and is pending approval. | Sets `is_approved=True`. |
| `POST` | `/api/v1/users/{user_id}/suspend` | Suspend User | `Role.ADMIN` | Admin | Target cannot be an administrator. Requires JSON reason. | Sets `is_active=False`. Closes active sessions. |
| `POST` | `/api/v1/users/{user_id}/activate` | Activate User | `Role.ADMIN` | Admin | Target user. Requires JSON reason. | Sets `is_active=True`. |
| `GET` | `/api/v1/users/{user_id}/audit-history` | User Audit History | `Role.ADMIN` or Self | Admin, Owner | Audit log filtered strictly to target user ID. | Returns before/after changes and ledger timestamps. |
| **FARMS** | | | | | | |
| `GET` | `/api/v1/farms` | List Farms | `farms:read` | Admin, Farmer | Farmer sees only `farmer_id == user.sub`; Admin sees all. | Denies other roles. |
| `POST` | `/api/v1/farms` | Create Farm | `farms:write` | Farmer, Admin | Farmer forced to own farm (`farmer_id = user.sub`). | Validates geo-coordinates and state/district. |
| `GET` | `/api/v1/farms/{farm_id}` | Get Farm | `farms:read` | Admin, Farmer, Buyer | Farmer must own farm; Buyer must have order/batch provenance link. | Prevents random farm scraping by competitor farmers or drivers. |
| `PATCH` | `/api/v1/farms/{farm_id}` | Update Farm | `farms:write` | Farmer (Owner), Admin | Must be owner `farmer_id == user.sub` or Admin. | Partial updates permitted. |
| **PRODUCE CATALOGUE** | | | | | | |
| `GET` | `/api/v1/produce` | List Produce | `produce:read` | All roles | Global reference catalogue (varieties, handling profiles). | Read-only public reference. |
| `POST` | `/api/v1/produce` | Create Produce | `produce:write` | Admin | Administrator only. | Enforces handling profile (min/max temp and humidity). |
| `GET` | `/api/v1/produce/{produce_id}` | Get Produce Item | `produce:read` | All roles | Global reference lookup by ID. | 404 if not found. |
| `PATCH` | `/api/v1/produce/{produce_id}` | Update Produce | `produce:write` | Admin | Administrator only. | Updates shelf life and handling rules. |
| **BATCHES** | | | | | | |
| `GET` | `/api/v1/batches` | List Batches | `batches:read` | Admin, Farmer, Buyer, Warehouse Manager | Farmer: `farmer_id == user.sub`. Warehouse Manager: assigned warehouses & unreceived intake. Buyer: available/ordered stock. | Unrelated roles denied. |
| `POST` | `/api/v1/batches` | Create Batch | `batches:write` | Farmer | Farmer forced to own batch (`farmer_id = user.sub`). Verifies farm ownership. | Sets status `CREATED`. Rejects non-finite/negative quantities. |
| `GET` | `/api/v1/batches/{batch_id}` | Get Batch | `batches:read` | Admin, Farmer, Buyer, Warehouse Manager | Owner farmer; Buyer with linked order or warehouse stock; Manager at holding warehouse. | Fails closed on unauthorized access. |
| `PATCH` | `/api/v1/batches/{batch_id}` | Update Batch | `batches:write` | Farmer (Owner), Admin | Only creator farmer or Admin. | Status transitions validated (e.g. `HARVESTED`). |
| `GET` | `/api/v1/batches/{batch_id}/history` | Batch History | `batches:read` | Admin, Farmer, Buyer, Warehouse Manager | Same scoping as batch detail. | Returns immutable ledger trail. |
| **WAREHOUSES** | | | | | | |
| `GET` | `/api/v1/warehouses` | List Warehouses | `warehouses:read` | Admin, Warehouse Manager | Manager sees only `manager_id == user.sub`; Admin sees all. | Denies drivers, farmers, transporters. |
| `POST` | `/api/v1/warehouses` | Create Warehouse | `warehouses:write` | Admin, Warehouse Manager | Manager assigned as creator; Admin can assign any manager. | Validates capacity kg and cold storage parameters. |
| `GET` | `/api/v1/warehouses/{warehouse_id}` | Get Warehouse | `warehouses:read` | Admin, Warehouse Manager | Manager must manage warehouse (`manager_id == user.sub`). | 404 on malformed ObjectId. |
| `PATCH` | `/api/v1/warehouses/{warehouse_id}` | Update Warehouse | `warehouses:write` | Admin, Warehouse Manager | Manager or Admin. Validates capacity cannot drop below occupancy. | Concurrency locked on warehouse doc. |
| **INVENTORY** | | | | | | |
| `GET` | `/api/v1/inventory` | List Inventory | `inventory:read` | Admin, Warehouse Manager, Farmer, Buyer | Manager: scoped to assigned warehouses. Farmer: scoped to owned batches. Buyer: available lots. | Integer-gram balances exposed alongside kg. |
| `GET` | `/api/v1/inventory/receipts` | List Receipts | `inventory:read` | Admin, Warehouse Manager | Filtered strictly to assigned warehouse IDs. | Prevents cross-warehouse inventory spying. |
| `POST` | `/api/v1/inventory/warehouses/{warehouse_id}/receipts` | Intake Receipt | `inventory:receive` | Warehouse Manager, Admin | Manager must manage `warehouse_id`. Batch must be unreceived. | Validates capacity, enforces produce cold handling profile, creates `RECEIPT` movement. |
| **PURCHASE ORDERS** | | | | | | |
| `GET` | `/api/v1/purchase-orders` | List Orders | `purchase_orders:read` | Admin, Buyer, Farmer, Warehouse Manager | Buyer: `buyer_id`. Farmer: `seller_id`. Manager: batches held in warehouse. | Transporters and Drivers denied. |
| `POST` | `/api/v1/purchase-orders` | Create Order | `purchase_orders:write` | Buyer | Buyer forced as `buyer_id = user.sub`. Validates inventory availability. | Status starts as `PLACED`. Whole-gram precision enforced. |
| `GET` | `/api/v1/purchase-orders/{order_id}` | Get Order | `purchase_orders:read` | Admin, Buyer, Farmer, Warehouse Manager | Must be buyer, seller farmer, warehouse custodian, or admin. | 403 Forbidden for unauthorized parties. |
| `POST` | `/api/v1/purchase-orders/{order_id}/accept` | Accept Order | `purchase_orders:write` | Farmer (Seller) | Seller must match `seller_id == user.sub`. Order must be `PLACED`. | Atomically reserves stock from inventory (`RESERVE` balance update). |
| `POST` | `/api/v1/purchase-orders/{order_id}/reject` | Reject Order | `purchase_orders:write` | Farmer (Seller) | Seller must match `seller_id == user.sub`. Order must be `PLACED`. | Order status -> `REJECTED`. |
| `POST` | `/api/v1/purchase-orders/{order_id}/cancel` | Cancel Order | `purchase_orders:write` | Buyer, Admin | Buyer must match `buyer_id == user.sub`. No active dispatched shipments allowed. | Releases reserved stock back to available; updates movements. |
| **TRANSPORTERS & FLEET** | | | | | | |
| `GET` | `/api/v1/transporters` | List Transporters | `transporters:read` | Admin | Administrator only. | Returns company credentials, GSTIN, fleet counts. |
| `POST` | `/api/v1/transporters` | Create Transporter Profile | `transporters:write` | Transporter | Transporter binds profile to `user_id = user.sub`. Starts `PENDING_APPROVAL`. | Rejects duplicate profile for same user. |
| `GET` | `/api/v1/transporters/{transporter_id}`| Get Transporter Profile | `transporters:read` | Admin, Transporter (Owner) | Must be owning transporter or Admin. | 403 Forbidden for unrelated transporters. |
| `PATCH` | `/api/v1/transporters/{transporter_id}`| Update Transporter | `transporters:write` | Transporter (Owner), Admin | Owner or Admin. | Cannot self-approve. |
| `POST` | `/api/v1/transporters/{transporter_id}/approve` | Approve Transporter | `transporters:approve` | Admin | Admin only. | Sets `approval_status=APPROVED`. |
| `POST` | `/api/v1/transporters/{transporter_id}/reject` | Reject Transporter | `transporters:write` | Admin | Admin only. | Sets `approval_status=REJECTED`. |
| `POST` | `/api/v1/transporters/{transporter_id}/suspend` | Suspend Transporter | `transporters:write` | Admin | Admin only. | Sets `approval_status=SUSPENDED`. |
| `GET` | `/api/v1/vehicles` | List Vehicles | `vehicles:read` | Admin, Transporter | Transporter scoped strictly to `transporter_id == user's transporter._id`. | Drivers and Farmers denied. |
| `POST` | `/api/v1/vehicles` | Register Vehicle | `vehicles:write` | Transporter | Transporter must be approved. Binds `transporter_id`. | Validates registration number, capacity, reefer temp limits. |
| `GET` | `/api/v1/vehicles/{vehicle_id}` | Get Vehicle | `vehicles:read` | Admin, Transporter (Owner) | Must own vehicle or be Admin. | Fails closed on foreign vehicle. |
| `PATCH` | `/api/v1/vehicles/{vehicle_id}` | Update Vehicle | `vehicles:write` | Transporter (Owner), Admin | Owner or Admin. | Cannot alter vehicle while assigned to active shipment. |
| `GET` | `/api/v1/drivers` | List Drivers | `drivers:read` | Admin, Transporter | Transporter sees own drivers; Driver sees self. | Other roles denied. |
| `POST` | `/api/v1/drivers` | Register Driver | `drivers:write` | Transporter | Transporter binds driver to `transporter_id`. | Validates license number and phone. |
| `GET` | `/api/v1/drivers/{driver_id}` | Get Driver | `drivers:read` | Admin, Transporter (Employer), Driver (Self) | Transporter must employ driver; Driver must match linked user. | 403 Forbidden for unauthorized parties. |
| `PATCH` | `/api/v1/drivers/{driver_id}` | Update Driver | `drivers:write` | Transporter (Employer), Admin | Transporter employer or Admin. | Updates status (e.g. `AVAILABLE`, `ON_DUTY`). |
| `POST` | `/api/v1/drivers/{driver_id}/link-user` | Link Driver Account | `drivers:write` | Transporter (Employer), Admin | Binds registered driver to a user login account (`user_id`). | Enables driver mobile application access. |
| **FREIGHT BOOKINGS & QUOTES** | | | | | | |
| `GET` | `/api/v1/freight-bookings` | List Freight Tenders | `freight_bookings:read` | Admin, Transporter, Buyer, Farmer | Buyer/Farmer: own bookings. Transporter: `OPEN` tenders or confirmed bookings. | Prevents viewing other transporters' private bookings. |
| `POST` | `/api/v1/freight-bookings` | Create Freight Tender | `freight_bookings:write` | Buyer, Farmer | Creator bound as `buyer_id` or `seller_id`. Must link accepted order. | Cargo weight validated against order accepted weight. |
| `GET` | `/api/v1/freight-bookings/{booking_id}`| Get Booking | `freight_bookings:read` | Admin, Buyer, Farmer, Transporter | Transporter allowed if booking is open for quotes or awarded to them. | 403 if unauthorized. |
| `PATCH` | `/api/v1/freight-bookings/{booking_id}`| Update Booking | `freight_bookings:write` | Creator (Buyer/Farmer), Admin | Booking must be `DRAFT` or `OPEN`. | Cannot modify confirmed tenders. |
| `POST` | `/api/v1/freight-bookings/{booking_id}/cancel` | Cancel Booking | `freight_bookings:write` | Creator, Admin | Booking must not have an active shipment in transit. | Cancels open tender. |
| `GET` | `/api/v1/freight-quotes` | List Quotations | `freight_bookings:read` | Admin, Transporter, Buyer, Farmer | Transporter: own quotes. Buyer/Farmer: quotes for own bookings. | Competitor pricing protected. |
| `POST` | `/api/v1/freight-quotes` | Submit Quotation | `freight_bookings:write` | Transporter | Transporter must be approved. Quotation bound to transporter. | Booking must be `OPEN`. Monetary rate in paise. |
| `GET` | `/api/v1/freight-quotes/{quotation_id}`| Get Quotation | `freight_bookings:read` | Admin, Transporter (Owner), Tender Creator | Must be quoting transporter, tender owner, or admin. | 403 Forbidden for unauthorized parties. |
| `POST` | `/api/v1/freight-quotes/{quotation_id}/accept` | Award Quotation | `freight_bookings:write` | Booking Creator (Buyer/Farmer) | Must be creator of linked booking. Booking must be `OPEN`. | Sets quote `ACCEPTED`, booking `CONFIRMED`. Rejects other bids. |
| **SHIPMENTS & LOGISTICS** | | | | | | |
| `GET` | `/api/v1/shipments` | List Shipments | `shipments:read` | All roles (Scoped) | Scoped via `shipment_scope()`. Default-deny for unauthorized roles. | Returns enriched status, arrival delay flag. |
| `POST` | `/api/v1/shipments` | Create Shipment | `shipments:write` | Transporter | Transporter must own accepted quotation and booking. | Claims available vehicle and driver atomically in transaction. |
| `GET` | `/api/v1/shipments/{shipment_id}` | Get Shipment Detail | `shipments:read` | All roles (Scoped) | Authorized via `assert_can_view_shipment()`. | 403 Forbidden for unrelated parties. |
| `POST` | `/api/v1/shipments/{shipment_id}/load` | Load & Verify Weight | `shipments:write` | Transporter, Driver | Transporter must own shipment; Driver must be assigned. Status `DRIVER_ASSIGNED`. | Enforces batch allocation equation, releases short load, logs `SHORT_LOAD_RELEASE`. |
| `POST` | `/api/v1/shipments/{shipment_id}/dispatch` | Dispatch Shipment | `shipments:write` | Transporter, Driver, Warehouse Manager | Transporter/Driver or Warehouse Manager holding stock. Status `LOADED`. | Checks warehouse capacity, decrements occupancy, logs `DISPATCH` movement. |
| `POST` | `/api/v1/shipments/{shipment_id}/start-transit` | Start Transit | `shipments:write` | Assigned Driver, Transporter | Driver must be assigned; Transporter must own shipment. Status `DISPATCHED`. | Sets status `IN_TRANSIT`. |
| `POST` | `/api/v1/shipments/{shipment_id}/arrive` | Destination Arrival | `shipments:write` | Assigned Driver, Transporter | Driver or Transporter. Status `IN_TRANSIT`. | Sets status `ARRIVED_AT_DESTINATION`, records actual arrival. |
| `POST` | `/api/v1/shipments/{shipment_id}/out-for-delivery` | Out for Delivery | `shipments:write` | Assigned Driver, Transporter | Driver or Transporter. Status `ARRIVED_AT_DESTINATION`. | Sets status `OUT_FOR_DELIVERY`. Ready for buyer signoff. |
| `POST` | `/api/v1/shipments/{shipment_id}/cancel` | Cancel Shipment | `shipments:write` | Transporter, Buyer, Admin | Allowed from `DRIVER_ASSIGNED`, `LOADED`, `DISPATCHED`, `IN_TRANSIT`. | Releases vehicle/driver; stock remains reserved until order cancelled. |
| `POST` | `/api/v1/shipments/{shipment_id}/return-receipt` | Full Usable Return | `returns:receive` | Warehouse Manager, Admin | Assigned warehouse manager (`manager_id == user.sub`). Status `CANCELLED`. | Requires return qty == loaded weight. Re-checks capacity, logs `RETURN_RECEIPT_USABLE`. |
| `POST` | `/api/v1/shipments/{shipment_id}/partial-return` | Graded Return | `returns:receive` | Warehouse Manager, Admin | Assigned warehouse manager (`manager_id == user.sub`). Status `CANCELLED`, `DELIVERY_REJECTED`, or `PARTIALLY_DELIVERED`. | Accepts Usable, Damaged, and Rejected quantities. Decrements non-resellable PO reservations, logs discrete movements. |
| `GET` | `/api/v1/shipments/{shipment_id}/timeline` | Shipment Timeline | `shipments:read` | All roles (Scoped) | Enforces `assert_can_view_shipment()`. | Returns chronological events and checkpoint ledger trail. |
| **CHECKPOINTS** | | | | | | |
| `GET` | `/api/v1/checkpoints` | List Checkpoints | `checkpoints:read` | All roles (Scoped) | Filtered via `shipment_reference_scope()`. | Prevents viewing checkpoints of other shipments. |
| `POST` | `/api/v1/checkpoints` | Record Checkpoint | `checkpoints:write` | Assigned Driver | Must be assigned driver for the shipment. Shipment must be `IN_TRANSIT`. | Immutable entry, appended to ledger block. |
| `GET` | `/api/v1/checkpoints/{checkpoint_id}` | Get Checkpoint | `checkpoints:read` | All roles (Scoped) | Shipment authorization verified before returning. | 404 if not found or unauthorized. |
| **SENSORS & MONITORING** | | | | | | |
| `GET` | `/api/v1/sensors/shipments/{shipment_id}/sensor-readings` | Get Telemetry | `sensors:read` | All roles (Scoped) | Authorized via `assert_can_view_shipment()`. | Returns simulated sensor readings and timestamps. |
| `GET` | `/api/v1/sensors/shipments/{shipment_id}/sensor-alerts` | Get Sensor Alerts | `alerts:read` | All roles (Scoped) | Authorized via `assert_can_view_shipment()`. | Returns active/acknowledged/resolved alerts with audit trail. |
| `POST` | `/api/v1/sensors/shipments/{shipment_id}/simulation/next-reading` | Step Telemetry | `sensors:simulate` | Driver, Transporter, Admin | Driver/Transporter on shipment or Admin. Shipment `IN_TRANSIT`. | Stateless reproducible telemetry. Supports all 7 scenarios including `TRANSIT_DELAY`. |
| `POST` | `/api/v1/sensors/shipments/{shipment_id}/simulation/sessions` | Start Simulation | `sensors:simulate` | Driver, Transporter, Admin | Driver/Transporter on shipment or Admin. Shipment `IN_TRANSIT`. | Persists session with sequence counter and playback rate. |
| `GET` | `/api/v1/sensors/shipments/{shipment_id}/simulation/sessions` | List Sessions | `sensors:read` | All roles (Scoped) | Authorized via `assert_can_view_shipment()`. | Returns session state and current step. |
| `POST` | `/api/v1/sensors/shipments/{shipment_id}/simulation/sessions/{simulation_id}/{action}` | Session Control | `sensors:simulate` | Driver, Transporter, Admin | Action in `pause`, `resume`, `stop`. Driver/Transporter on shipment or Admin. | Atomically updates session state and releases background worker lease. |
| `POST` | `/api/v1/sensors/sensor-alerts/{alert_id}/acknowledge` | Acknowledge Alert | `alerts:acknowledge` | Driver, Transporter, Warehouse Manager, Admin | Authorized via `assert_can_view_shipment` on alert's shipment. | Sets status `ACKNOWLEDGED` with operator notes. Does not close alert. |
| `POST` | `/api/v1/sensors/sensor-alerts/{alert_id}/resolve` | Resolve Alert | `alerts:resolve` | Transporter, Admin | Transporter on shipment or Admin. Requires non-empty corrective action. | Sets status `RESOLVED`, logs ledger event `SENSOR_ALERT_RESOLVED`. |
| **DELIVERY & ACCEPTANCE** | | | | | | |
| `GET` | `/api/v1/delivery/reports` | List Delivery Reports | `deliveries:read` | All roles (Scoped) | Filtered via `shipment_reference_scope()`. | Prevents viewing competitor or foreign buyer reports. |
| `GET` | `/api/v1/delivery/reports/{report_id}` | Get Delivery Report | `deliveries:read` | All roles (Scoped) | Resolves linked shipment and checks `assert_can_view_shipment()`. | Fails closed on unauthorized report lookup. |
| `GET` | `/api/v1/delivery/shipments/{shipment_id}/delivery-report` | Shipment Report | `deliveries:read` | All roles (Scoped) | Authorized via `assert_can_view_shipment()`. | 404 if delivery not yet recorded. |
| `POST` | `/api/v1/delivery/shipments/{shipment_id}/confirm-delivery` | Confirm Delivery | `deliveries:write` | Buyer | Buyer must match `buyer_id == user.sub`. Shipment must be `OUT_FOR_DELIVERY`. | Strict weight equation: `delivered + damaged + missing == loaded`. Releases fleet/driver. |
| `POST` | `/api/v1/delivery/shipments/{shipment_id}/reject-delivery` | Reject Delivery | `deliveries:write` | Buyer | Buyer must match `buyer_id == user.sub`. Shipment must be `OUT_FOR_DELIVERY`. | Sets shipment `DELIVERY_REJECTED`, PO `FAILED`, releases fleet/driver. |
| **ANALYTICS** | | | | | | |
| `GET` | `/api/v1/analytics/workspace` | Workspace KPIs | Authenticated | All roles | Scoped to `current_user.sub` and role. | Returns targeted operational metrics for all 6 roles. |
| `GET` | `/api/v1/analytics/dashboard` | Dashboard Metrics | Authenticated | All roles | Scoped via `shipment_scope()`. | Active/completed shipment counts, ETA lateness, alerts. |
| `GET` | `/api/v1/analytics/shipments` | Shipment Analytics | Authenticated | All roles | Scoped via `shipment_scope()`. | Transit duration, on-time percentage, status breakdowns. |
| `GET` | `/api/v1/analytics/freight` | Freight Financials | `analytics:read` | Admin, Transporter, Buyer, Farmer | Admin: all. Transporter: own quotes. Buyer/Farmer: own bookings. | Returns settled vs committed expenditure in paise (INR). |
| `GET` | `/api/v1/analytics/fleet` | Fleet Utilization | `analytics:read` | Admin, Transporter | Transporter scoped strictly to own vehicles. | Other roles denied. |
| `GET` | `/api/v1/analytics/quality` | Quality Metrics | Authenticated | All roles | Scoped via `shipment_scope()`. | Inspection pass rates, cold-chain excursion percentages. |
| `GET` | `/api/v1/analytics/cold-chain` | Cold Chain Analytics | Authenticated | All roles | Scoped via `shipment_scope()`. | Compliance percentage, excursion counts, alert durations. |
| **LEDGER & AUDIT** | | | | | | |
| `GET` | `/api/v1/ledger/blocks` | List Ledger Blocks | `ledger:read` | All roles (Scoped) | Admin sees all blocks; other roles see only blocks where `actor_id == user.sub`. | Prevents cross-tenant intelligence gathering. |
| `GET` | `/api/v1/ledger/entities/{entity_type}/{entity_id}` | Entity Audit Trail | `ledger:read` | All roles (Scoped) | Admin sees all; other roles restricted to authored blocks for entity. | Full cryptographic provenance. |
| `GET` | `/api/v1/ledger/verify` | Verify Hash-Chain | `ledger:verify` | Admin | Administrator only. | Recomputes SHA-256 chain from genesis block. Detects any database tampering. |
| **SYSTEM & HEALTH** | | | | | | |
| `GET` | `/` | API Root | Public | Anyone | Root discovery endpoint. | Returns version and health links. |
| `GET` | `/health/live` | Liveness Probe | Public | Anyone | Returns `{"status": "ok"}`. | Kubernetes/Container liveness. |
| `GET` | `/health/ready` | Readiness Probe | Public | Anyone | Pings MongoDB database. | Returns 200 when MongoDB is connected. |

# AgriChain — Full Codebase Audit
**Audit Date:** 2026-11-07  
**Auditor:** Principal Architect / AI Agent  
**Status:** Phase 0 — Complete Audit

---

## Executive Summary

The AgriChain codebase has a solid structural foundation: FastAPI backend with well-organized routers, Next.js 14 App Router frontend with TypeScript, and a MongoDB-backed SHA-256 hash-chain ledger. However, numerous critical defects prevent the application from working as a coherent system. The most severe issues are:

1. **Authentication contract mismatch** — `GET /auth/me` returns `UserResponse` directly but `auth.ts` reads `data.user`
2. **Sensor insertion bug** — `start_simulation_endpoint` calls `result.inserted_id` before `result` is defined
3. **Hardcoded demo shipment ID** — Cold-chain page uses `"demo-shipment"` but backend validates MongoDB ObjectIds
4. **No shared auth state** — Every component independently calls `useAuth()` which independently calls `/auth/me`
5. **Silent transaction bypass** — `transaction_session()` yields `None` on non-replica-set MongoDB without failing
6. **Broken ledger entity verification** — `verify_entity_history` starts hash-checking from GENESIS_HASH on a subset of global blocks
7. **Hardcoded analytics values** — `freight_cost_per_kg: 0.0`, `route_wise_cost: []`, quality metrics using count of shipments as kg
8. **Missing delivery list endpoint** — Frontend calls `GET /delivery/reports` which does not exist
9. **Missing detail pages** — Dozens of create/detail route pages are absent
10. **Fabricated fallback data** — Cold-chain page sets fake sensor readings when API fails

---

## A. Frontend Audit

### Routes Inventory

| Route | File | Status | Issues |
|---|---|---|---|
| `/` | `app/(public)/page.tsx` | Exists | Needs luxury redesign |
| `/login` | `app/(public)/login/page.tsx` | Exists | Auth contract mismatch |
| `/register` | `app/(public)/register/page.tsx` | Exists | Auth contract mismatch |
| `/dashboard` | `app/(dashboard)/dashboard/page.tsx` | Exists | Hardcoded trends `+12%`, `+8%`, snake_case mismatch |
| `/farms` | `app/(dashboard)/farms/page.tsx` | Exists | No create/detail pages |
| `/produce` | `app/(dashboard)/produce/page.tsx` | Exists | No create/detail pages |
| `/batches` | `app/(dashboard)/batches/page.tsx` | Exists | No create/detail pages |
| `/warehouses` | `app/(dashboard)/warehouses/page.tsx` | Exists | No create/detail pages |
| `/inventory` | `app/(dashboard)/inventory/page.tsx` | Exists | — |
| `/purchase-orders` | `app/(dashboard)/purchase-orders/page.tsx` | Exists | No create/detail pages |
| `/freight-bookings` | `app/(dashboard)/freight-bookings/page.tsx` | Exists | No create/detail pages |
| `/transporters` | `app/(dashboard)/transporters/page.tsx` | Exists | — |
| `/fleet` | `app/(dashboard)/fleet/page.tsx` | Exists | — |
| `/drivers` | `app/(dashboard)/drivers/page.tsx` | Exists | No create/detail pages |
| `/shipments` | `app/(dashboard)/shipments/page.tsx` | Exists | No create/detail pages |
| `/deliveries` | `app/(dashboard)/deliveries/page.tsx` | Exists | Calls non-existent endpoint |
| `/cold-chain` | `app/(dashboard)/cold-chain/page.tsx` | **BROKEN** | Hardcoded `demo-shipment`, fabricated fallback data, wrong error handling |
| `/ledger` | `app/(dashboard)/ledger/page.tsx` | Exists | — |
| `/analytics` | `app/(dashboard)/analytics/page.tsx` | Exists | Receives broken analytics data |
| `/settings` | `app/(dashboard)/settings/page.tsx` | Exists | — |
| `/users` | `app/(dashboard)/users/page.tsx` | Exists | — |
| `/farms/new` | — | **MISSING** | Linked from dashboard |
| `/farms/[id]` | — | **MISSING** | — |
| `/produce/new` | — | **MISSING** | — |
| `/produce/[id]` | — | **MISSING** | — |
| `/batches/new` | — | **MISSING** | Linked from dashboard `Quick Actions` |
| `/batches/[id]` | — | **MISSING** | — |
| `/warehouses/new` | — | **MISSING** | — |
| `/warehouses/[id]` | — | **MISSING** | — |
| `/purchase-orders/new` | — | **MISSING** | — |
| `/purchase-orders/[id]` | — | **MISSING** | — |
| `/freight-bookings/new` | — | **MISSING** | — |
| `/freight-bookings/[id]` | — | **MISSING** | — |
| `/shipments/new` | — | **MISSING** | Linked from dashboard |
| `/shipments/[id]` | — | **MISSING** | — |
| `/drivers/new` | — | **MISSING** | — |
| `/drivers/[id]` | — | **MISSING** | — |
| `/deliveries/[id]` | — | **MISSING** | — |
| `/users/[id]` | — | **MISSING** | — |

### Authentication Issues

**BUG-FE-001 (Critical):** `auth.ts` line 29:
```typescript
const { data } = await apiClient.get("/auth/me");
return data.user;  // ← Backend returns UserResponse directly, not {user: UserResponse}
```
`GET /auth/me` returns a `UserResponse` model directly. `data.user` will be `undefined`. Every component that depends on the authenticated user will render with `null`.

**BUG-FE-002 (Critical):** `useAuth()` is not a shared context provider. It is called independently by `Sidebar`, `TopNav`, `DashboardPage`, and other components. Each call creates its own state and independently fires `GET /auth/me`. This results in:
- Multiple concurrent identical requests on every page load
- Each component has an independent loading state
- Sidebar may show user data while dashboard shows `null` user if one request resolves slightly later
- State does not survive page refresh through React state; must re-fetch

**BUG-FE-003 (Moderate):** `lib/auth.ts` has `setToken()` which only sets `access_token` cookie. `auth.ts` calls `setToken(data.access_token)` but never sets `refresh_token`. The refresh-token interceptor in `api-client.ts` correctly reads `refresh_token` from cookies, but it will never exist because the registration/login paths do not store it.

**BUG-FE-004 (Moderate):** `Sidebar` logout button uses `<a href="/login?logout=true">` — this is not calling the `logout` action from `useAuth()`. It navigates without clearing server-side session. The `TopNav` correctly calls `logout()` from `useAuth()`, creating two inconsistent logout paths.

**BUG-FE-005 (Moderate):** No route protection. Unauthenticated users can access `/dashboard` without being redirected to `/login`. The layout does not check authentication.

### Dashboard Metrics Mismatch

**BUG-FE-006 (Critical):** Backend returns snake_case:
```json
{ "total_shipments": 248, "active_shipments": 36, ... }
```
Frontend `DashboardMetrics` interface expects camelCase:
```typescript
interface DashboardMetrics {
  totalShipments: number;
  activeShipments: number;
  ...
}
```
`setMetrics(data)` directly assigns the snake_case backend object to the camelCase interface. All metric values will be `undefined` → displayed as `0`.

**BUG-FE-007 (Low — Data Integrity):** Dashboard `statCards` hardcodes trend values:
```typescript
{ trend: "+12%", ... }
{ trend: "+3%", ... }
{ trend: "+8%", ... }
{ trend: "-2%", ... }
```
Backend does not calculate or return trend data. These are fabricated statistics.

### Cold-Chain Page Issues

**BUG-FE-008 (Critical):** Cold-chain page hardcodes:
```typescript
apiClient.get("/sensors/shipments/demo-shipment/sensor-readings?page_size=50")
```
Backend `GET /sensors/shipments/{shipment_id}/sensor-readings` validates:
```python
if not ObjectId.is_valid(shipment_id):
    raise ValidationError("Invalid shipment ID")
```
`"demo-shipment"` is not a valid ObjectId. The API call will always return 422 Validation Error.

**BUG-FE-009 (Critical):** On error, the cold-chain page sets fabricated fallback sensor readings:
```typescript
catch (e) {
  setError("Failed to load sensor data. Using demo data.");
  setCurrentTemp(8.2);
  setCurrentHumidity(84);
  setReadings([...fake readings...]);
}
```
This violates the requirement: do not display fabricated data after API failure.

**BUG-FE-010 (Critical):** Simulation control error handling:
```typescript
const startSimulation = async () => {
  try {
    await apiClient.post("...", { ... });
    setSimStatus("RUNNING");
  } catch (e) {
    setSimStatus("RUNNING");  // ← Sets RUNNING even on failure
  }
};
```
A failed start request incorrectly sets status to RUNNING. Same pattern for `pauseSimulation` and `stopSimulation`.

**BUG-FE-011 (Moderate):** Simulation start payload:
```typescript
await apiClient.post("/sensors/shipments/demo-shipment/simulation/start", {
  scenario: "NORMAL",
  interval_seconds: 30,
});
```
Backend `SensorSessionCreate` schema requires `shipment_id` in the body:
```python
class SensorSessionCreate(BaseModel):
    shipment_id: str
    scenario: SensorScenario
    interval_seconds: int
```
Frontend does not send `shipment_id` in body. Backend will return 422.

**BUG-FE-012 (Low):** Cold-chain page has no shipment selector. It hardcodes one shipment for all users of all roles.

### Deliveries Page

**BUG-FE-013 (Critical):** The deliveries feature calls `GET /delivery/reports`. This endpoint does not exist in the backend. The backend only implements:
- `POST /delivery/shipments/{shipment_id}/delivery-report`
- `GET /delivery/shipments/{shipment_id}/delivery-report`
- `POST /delivery/shipments/{shipment_id}/confirm-delivery`
- `POST /delivery/shipments/{shipment_id}/reject-delivery`
- `POST /delivery/shipments/{shipment_id}/partial-delivery`

No list endpoint exists.

### Application Shell Issues

**BUG-FE-014 (Moderate):** Dashboard layout hardcodes:
```tsx
<main style={{ marginLeft: "var(--sidebar-width, 252px)" }}>
```
When the sidebar collapses (width changes from 288px `w-72` to 64px `w-16`), the CSS variable `--sidebar-width` is never updated. Main content does not reflow when sidebar collapses.

**BUG-FE-015 (Low):** `TopNav` has hardcoded `left-[252px]` and also `style={{ left: "var(--sidebar-width, 252px)" }}`. Same problem as above — the top nav does not shift when sidebar collapses.

**BUG-FE-016 (Moderate):** Mobile navigation in `TopNav` uses plain `<button>` elements without `href` attributes. They do not navigate anywhere:
```tsx
<button className="...">Dashboard</button>
<button className="...">Farms</button>
```

### StaggerContainer Layout

**BUG-FE-017 (Moderate):** `StaggerContainer` renders a `<motion.div>` with no layout class. Dashboard uses it to hold KPI metric cards but the container has no grid/flex layout, so cards stack vertically without structure.

### Type Safety

**BUG-FE-018 (Low):** `register` and `login` callbacks in `useAuth` assign `data.user` from the response:
```typescript
const login = useCallback(async (email, password) => {
  const data = await authService.login(email, password);
  setUser(data.user);  // ← login returns TokenResponse which has {user: ...}
  return data;
}, []);
```
The `authService.login()` returns `data` from axios which is the full `TokenResponse`. `data.user` is correct here. However `authService.me()` returns `data.user` which will be `undefined` as noted in BUG-FE-001. So `useAuth` will have `user=null` on page refresh even if cookies are valid.

---

## B. Backend Audit

### Authentication Endpoints

| Method | URL | Auth | Status | Issues |
|---|---|---|---|---|
| POST | `/auth/register` | None | ✅ Works | Issues token for TRANSPORTER requiring approval |
| POST | `/auth/login` | None | ✅ Works | Correct status checks |
| POST | `/auth/refresh` | None | ✅ Works | Re-checks `is_active` |
| POST | `/auth/logout` | Bearer | ✅ Works | No server-side token revocation |
| GET | `/auth/me` | Bearer | ✅ Works | Returns `UserResponse` directly — frontend reads `data.user` |

**BUG-BE-001 (Critical):** `/auth/register` for TRANSPORTER role:
- Sets `is_approved=False`
- Still issues a token pair
- Frontend stores token and treats user as logged in
- Next page load calls `/auth/me` → user has valid token → displays pending UI
- But the pending state is only visible if the frontend correctly handles `is_approved=False`
- Currently `useAuth` does not check `is_approved`

**BUG-BE-002 (Critical):** `get_current_user()` in `permissions.py` only decodes the JWT:
```python
async def get_current_user(credentials) -> dict:
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload  # Does NOT check DB for active/approved status
```
A suspended or deleted user with a valid unexpired token can access all protected endpoints.

### Sensors Endpoint

**BUG-BE-003 (Critical):** `start_simulation_endpoint` in `sensors.py` line 84–85:
```python
await db.sensor_sessions.insert_one(session_doc)
session_doc["_id"] = result.inserted_id  # ← 'result' is undefined
```
`insert_one()` result is not stored. `result.inserted_id` will raise `NameError: name 'result' is not defined`. Every call to start a simulation will return HTTP 500.

**BUG-BE-004 (Moderate):** `SensorSessionCreate` requires `shipment_id` in body redundantly with the path parameter:
```python
class SensorSessionCreate(BaseModel):
    shipment_id: str  # ← Redundant with path parameter
    scenario: SensorScenario
    interval_seconds: int
```
Two sources of truth for shipment identity create ambiguity.

**BUG-BE-005 (Low):** `sensor_simulator.py` always uses the TOMATO produce handling profile regardless of what the actual shipment contains:
```python
profile = PRODUCE_HANDLING_PROFILES.get(ProduceType.TOMATO, {})
```

### Analytics Service

**BUG-BE-006 (Critical):** `get_quality_analytics`:
```python
total_dispatched = await db.shipments.count_documents({...})
# Returns: count of shipments, NOT weight in kg
return {
    "total_dispatched_quantity_kg": total_dispatched,  # ← count not weight
    "accepted_quantity_kg": total_dispatched,  # ← same wrong value
    ...
}
```
Labelling shipment count as `_kg` is semantically wrong.

**BUG-BE-007 (Critical):** `get_quality_analytics` cold-chain compliance:
```python
compliance = ((total_readings - total_alerts) / total_readings * 100) if total_readings > 0 else 100
```
- Uses `total_alerts` (count of active alerts, not readings that exceeded thresholds)
- If there are no readings, returns 100% — zero data reported as perfect compliance

**BUG-BE-008 (Critical):** `get_freight_analytics`:
```python
return {
    "total_freight_expenditure_paise": total_cost,  # ← Sum of quotations, not actual paid
    "freight_cost_per_kg": 0.0,  # ← Hardcoded zero
    "route_wise_cost": [],  # ← Hardcoded empty
}
```
Quotation totals are incorrectly labelled as expenditure. `freight_cost_per_kg` is always zero.

**BUG-BE-009 (Moderate):** `get_fleet_analytics`:
```python
utilization = (assigned / total_vehicles * 100) if total_vehicles > 0 else 0.0
return {
    "vehicle_utilization_percentage": round(utilization, 2),  # ← Assignment rate, not payload utilisation
}
```
This is vehicle assignment rate, not payload-capacity utilisation.

### Transaction Safety

**BUG-BE-010 (Critical):** `transaction_session()` silently degrades:
```python
if not is_replica_set:
    logger.warning("MongoDB is not a replica set...")
    yield None  # ← Silently proceeds without transactions
    return
```
The ledger append and delivery report creation are documented as transactional but silently run without transactions on standalone MongoDB.

### Ledger Service

**BUG-BE-011 (Critical):** `verify_entity_history`:
```python
prev_hash = GENESIS_HASH
for block in blocks:  # ← Only entity-specific subset of blocks
    if block["previous_hash"] != prev_hash:
        return {"valid": False, ...}
    ...
    prev_hash = block["hash"]
```
This verifies a subset of blocks starting from GENESIS_HASH. Entity blocks are not at position 1 in the global chain. Block at global index 50 has `previous_hash` = hash of block 49, not GENESIS_HASH. This check will always fail for any entity that is not the first entry in the entire chain, incorrectly reporting `{"valid": False}`.

**BUG-BE-012 (Moderate):** `get_ledger_head()` is called outside any transaction in `append_ledger_block`. Under concurrent writes, two concurrent calls could both read the same `last_index`, generating blocks with duplicate indices and conflicting previous hashes.

### Permission Enforcement

**BUG-BE-013 (Critical):** `require_permission()` decorator is a no-op:
```python
def require_permission(permission: str):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Permission is checked via get_current_user dependency in routes
            # This decorator is a placeholder for future use
            return await func(*args, **kwargs)  # ← Does nothing
        return wrapper
    return decorator
```
Any route using `@require_permission(...)` has no actual permission check.

---

## C. Integration Audit — API Contract Matrix

| Frontend Action | Endpoint | Frontend Request | Backend Response | Contract Status |
|---|---|---|---|---|
| Login | POST `/auth/login` | `{email, password}` | `{access_token, refresh_token, token_type, user}` | ✅ Match (but refresh_token not stored by setToken) |
| Current user | GET `/auth/me` | Bearer | `UserResponse` directly | ❌ Frontend reads `data.user` → undefined |
| Register | POST `/auth/register` | user fields | `TokenResponse` with user | ✅ Match |
| Dashboard metrics | GET `/analytics/dashboard` | Bearer | snake_case fields | ❌ Frontend expects camelCase |
| List deliveries | GET `/delivery/reports` | Bearer | — | ❌ Endpoint does not exist |
| Start simulation | POST `/sensors/shipments/{id}/simulation/start` | `{scenario, interval_seconds}` (missing `shipment_id`) | 422 (missing field) + 500 (NameError) | ❌ Double broken |
| Get sensor readings | GET `/sensors/shipments/demo-shipment/...` | Bearer | 422 (invalid ObjectId) | ❌ Hardcoded invalid ID |
| Verify ledger | GET `/ledger/verify` | Bearer | Integrity result | ✅ Exists |
| Entity history | GET `/ledger/entity/{type}/{id}` | Bearer | Incorrect subset verification | ⚠️ Logic broken |
| List batches | GET `/batches` | Bearer | PaginatedResponse | ✅ |
| Create batch | POST `/batches` | — | — | Need to verify |
| List shipments | GET `/shipments` | Bearer | PaginatedResponse | ✅ |
| Create shipment | POST `/shipments` | — | — | Need to verify |
| Freight analytics | GET `/analytics/freight` | Bearer | Quotation totals mislabelled | ⚠️ Wrong data |
| Fleet analytics | GET `/analytics/fleet` | Bearer | Assignment rate mislabelled | ⚠️ Wrong metric |
| Quality analytics | GET `/analytics/quality` | Bearer | Count mislabelled as kg | ⚠️ Wrong units |

---

## D. State Management Audit

| Issue | Severity | Description |
|---|---|---|
| No shared auth context | Critical | `useAuth()` creates independent state per component |
| No AuthProvider | Critical | No global auth lifecycle management |
| `useAuth` on page refresh | Critical | Returns `null` user until async `/auth/me` resolves, causing flash |
| Independent loading states | High | Sidebar and TopNav each call `/auth/me` separately |
| No server state manager | High | All data fetching via manual `useEffect`+`useState` |
| No query cache | High | Same data fetched multiple times on same page |
| No cache invalidation | High | After mutation, stale data persists until page refresh |
| Error states swallowed | High | Multiple `catch {}` blocks that do nothing |
| Fabricated fallback data | Critical | Cold-chain replaces API errors with fake readings |
| State not from backend | High | Simulation status set locally without confirming server state |

---

## E. Business Logic Audit

### Identified Calculation Errors

| Metric | Actual Calculation | Correct Calculation | Severity |
|---|---|---|---|
| `total_dispatched_quantity_kg` | `count_documents(shipments)` | Sum of `cargo_quantity_kg` from delivery records | Critical |
| `cold_chain_compliance_percentage` | `(readings - active_alerts) / readings × 100` | `normal_readings / total_readings × 100` | Critical |
| `freight_cost_per_kg` | Hardcoded `0.0` | Total accepted quotation value / total dispatched weight | Critical |
| `vehicle_utilization_percentage` | `assigned_count / total_count × 100` | Actual payload used / available payload × 100 OR renamed to assignment_rate | Moderate |
| `total_excursion_duration_hours` | Hardcoded `0.0` | Sum of durations between first excursion reading and resolution per alert | Moderate |

### State Transition Issues

- Transporter PENDING state not enforced post-registration
- No check in `get_current_user` for `is_approved` or `is_active`
- No inventory reservation logic confirmed working

---

## Priority-Ranked Issue Register

| Priority | ID | Issue | Phase |
|---|---|---|---|
| P0 | BUG-BE-003 | Sensor insertion `NameError` — backend 500 | Phase 1 |
| P0 | BUG-FE-001 | `auth.me` returns `data.user` → undefined | Phase 1 |
| P0 | BUG-FE-010 | Simulation sets status RUNNING even on failure | Phase 1 |
| P0 | BUG-FE-008 | Cold-chain hardcoded `demo-shipment` | Phase 1 |
| P0 | BUG-FE-009 | Cold-chain fabricated fallback data | Phase 1 |
| P0 | BUG-FE-006 | Dashboard metrics snake_case/camelCase mismatch | Phase 1 |
| P0 | BUG-FE-013 | Deliveries calls non-existent endpoint | Phase 1 |
| P1 | BUG-BE-001 | TRANSPORTER gets token before approval | Phase 1 |
| P1 | BUG-BE-002 | `get_current_user` does not check DB status | Phase 1 |
| P1 | BUG-FE-002 | No shared auth context provider | Phase 3 |
| P1 | BUG-FE-003 | `refresh_token` never stored in cookie | Phase 1 |
| P1 | BUG-FE-004 | Sidebar logout bypasses auth service | Phase 1 |
| P1 | BUG-FE-005 | No route protection on dashboard routes | Phase 3 |
| P1 | BUG-BE-004 | `shipment_id` redundant in request body | Phase 1 |
| P1 | BUG-BE-011 | Entity verification uses wrong hash chain | Phase 2 |
| P1 | BUG-BE-010 | Transactions silently bypassed | Phase 2 |
| P2 | BUG-BE-006 | Quality analytics wrong units | Phase 2 |
| P2 | BUG-BE-007 | Cold-chain compliance formula wrong | Phase 2 |
| P2 | BUG-BE-008 | Freight analytics mislabelled | Phase 2 |
| P2 | BUG-BE-009 | Fleet utilisation wrong metric | Phase 2 |
| P2 | BUG-BE-012 | Ledger concurrent write race condition | Phase 2 |
| P2 | BUG-BE-013 | `require_permission` is a no-op | Phase 2 |
| P3 | BUG-FE-007 | Hardcoded trend percentages | Phase 3 |
| P3 | BUG-FE-011 | Simulation missing `shipment_id` in body | Phase 1 |
| P3 | BUG-FE-012 | No shipment selector on cold-chain | Phase 4 |
| P3 | BUG-FE-014 | Sidebar collapse does not reflow content | Phase 6 |
| P3 | BUG-FE-015 | TopNav does not shift on sidebar collapse | Phase 6 |
| P3 | BUG-FE-016 | Mobile nav buttons non-functional | Phase 6 |
| P3 | BUG-FE-017 | StaggerContainer has no layout class | Phase 5 |
| P3 | BUG-BE-005 | Simulator always uses TOMATO profile | Phase 2 |
| P4 | Missing routes | 15+ create/detail pages absent | Phase 4 |

---

## Security Summary

| Area | Issue | Severity |
|---|---|---|
| Account status | `get_current_user` never checks MongoDB for active/approved | Critical |
| Token storage | `js-cookie` without HttpOnly — JS-readable, XSS risk | Moderate |
| Refresh token | Never stored (bug in `setToken` only storing access_token) | High |
| Logout | Sidebar logout is navigate-only, no token clearing | High |
| Permission decorator | `require_permission` is a placeholder, enforces nothing | Critical |
| Resource ownership | Consistently checked per-route for key operations | Moderate |
| CORS | `allow_origins=settings.cors_origins` — needs verification | Low |
| Input validation | Pydantic handles most cases | Good |

---

## Dependency Issues

| Package | Current | Conflict |
|---|---|---|
| `eslint` | `^8.57.0` | Installed but `eslint-config-next@^16.4.5` requires ESLint 9+ |
| `jest` | `^25.1.0` | Incompatible with `jest-environment-jsdom@^29.7.0` |
| `eslint-config-next` | `^16.4.5` | Mismatch with Next.js 14 (`eslint-config-next` should match Next version) |

---

## Implementation Plan

### Phase 1 — P0 Backend and Integration Fixes (Priority Zero)
1. Fix `result.inserted_id` NameError in `sensors.py`
2. Fix `auth.ts` to return `data` not `data.user` from `/auth/me`
3. Fix `setToken` to also store `refresh_token`
4. Remove `shipment_id` from `SensorSessionCreate` body OR validate equality
5. Fix dashboard metrics field mapping (snake_case → camelCase normalization)
6. Add `GET /delivery/reports` list endpoint to backend
7. Fix cold-chain: load shipments, add selector, remove hardcoded ID
8. Fix cold-chain: remove fabricated fallback data
9. Fix simulation control: only update status on success
10. Add `is_approved` check to `get_current_user` dependency
11. Issue separate "pending approval" response for TRANSPORTER registration

### Phase 2 — Business Logic and Data Accuracy
1. Fix analytics: correct quality metrics to use actual weight from delivery records
2. Fix analytics: correct cold-chain compliance to use reading status counts
3. Fix analytics: separate quotation values from actual freight expenditure
4. Fix analytics: rename vehicle utilisation or calculate correctly
5. Fix entity ledger verification: verify within global chain context
6. Add unique index on ledger block index to prevent concurrent duplicates
7. Fix `sensor_simulator.py` to load produce profile from shipment data

### Phase 3 — Frontend Data Architecture
1. Create `AuthProvider` context
2. Implement TanStack Query
3. Build typed API service layer
4. Implement query key structure
5. Implement cache invalidation on mutations
6. Remove individual `useEffect` data fetching
7. Add global error handling

### Phase 4 — Functional Completion
1. Create all missing route pages (25+ routes)
2. Implement all create forms
3. Implement all detail views
4. Fix mobile navigation in `TopNav`
5. Add shipment selector to cold-chain
6. Fix all non-functional buttons

### Phase 5 — Design System
1. Build complete component library
2. Apply luxury colour tokens
3. Implement typography system
4. Build reusable table, form, badge components
5. Fix `StaggerContainer` layout

### Phase 6 — Application Shell
1. Implement shared sidebar state via context
2. Fix sidebar ↔ content layout synchronization
3. Fix `TopNav` responsive positioning
4. Build mobile navigation drawer

### Phase 7-10 — Page Redesign, Motion, Testing, Final Review
(Per master prompt sections 13–22)


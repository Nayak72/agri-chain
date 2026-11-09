# AgriChain Frontend Migration Analysis

> Migration from Next.js 14 (TypeScript) → Vite + React 18 (JavaScript SPA)

---

## Why Migrate?

| Factor | Next.js (Before) | Vite React SPA (After) |
|--------|-----------------|------------------------|
| Framework | Next.js 14 SSR | React Router 6 SPA |
| Language | TypeScript | JavaScript (JSX) |
| Auth model | Server-side session | In-memory token + HttpOnly refresh cookie |
| Build tool | Webpack (Next) | Vite 5 (esbuild/Rollup) |
| Routing | File-system routes | Declarative `<Routes>` |
| API calls | Server components + fetch | TanStack Query + Axios client |
| Deployment | Node.js server | Nginx static + reverse proxy |
| Visual style | Mixed | WarehouseOS dark console aesthetic |

---

## Architecture Overview

```
Browser
  │
  ├── Vite Dev Server (port 5173, dev only)
  │     └── Proxy: /api  → localhost:8000/api
  │           Proxy: /health → localhost:8000/health
  │
  └── Nginx (port 3000, production)
        ├── Static: /assets/* (immutable cache)
        ├── Proxy: /api/ → backend:8000/api/
        ├── Proxy: /health/ → backend:8000/health/
        └── Fallback: /* → /index.html (React Router)
```

---

## Authentication Flow

1. **Login**: `POST /api/v1/auth/login` → returns `{ access_token }` + sets `HttpOnly refresh_token` cookie
2. **In-memory**: Access token stored in `tokenStore` (module-level variable, never localStorage)
3. **Silent restore**: On app mount, `AuthProvider` calls `POST /api/v1/auth/refresh` with cookie → gets new access token
4. **Proactive refresh**: Timer fires at 25-minute mark (before 30-min expiry) to refresh silently
5. **Interceptor**: Axios 401 interceptor queues failing requests and refreshes token automatically
6. **Logout**: `POST /api/v1/auth/logout` → clears server cookie + in-memory token

---

## Implementation Status

### ✅ Milestone 1 — Core Foundation (COMPLETE)

| Item | Status |
|------|--------|
| Backup existing Next.js frontend | ✅ `frontend_next_backup/` created |
| Vite + React SPA foundation | ✅ |
| Pinned package.json (exact versions) | ✅ |
| Tailwind with WarehouseOS design tokens | ✅ |
| Vite dev proxy (/api, /health) | ✅ |
| AmbientBackground (radial glow + grid) | ✅ |
| Navbar (health ping, role nav, logout) | ✅ |
| AuthContext (in-memory token, refresh, restore) | ✅ |
| ProtectedRoute (role-gated) | ✅ |
| LoginPage (WarehouseOS split-screen style) | ✅ |
| DashboardPage (8 KPI cards + shipments table) | ✅ |
| Dev-only demo account quick-fill | ✅ |
| Nginx reverse proxy config | ✅ |
| Multi-stage Dockerfile | ✅ |
| Vitest unit tests | ✅ |

### ✅ Milestone 2 — Agricultural Modules (COMPLETE)

| Item | Status |
|------|--------|
| Farms List, Create, Detail | ✅ `FarmsListPage.jsx`, `FarmCreatePage.jsx`, `FarmDetailPage.jsx` |
| Produce Catalog & Specifications | ✅ `ProduceListPage.jsx`, `ProduceCreatePage.jsx`, `ProduceDetailPage.jsx` |
| Harvest Batches & QR/Lot Tracking | ✅ `BatchesListPage.jsx`, `BatchCreatePage.jsx`, `BatchDetailPage.jsx` |
| Warehouse Capacity & Occupancy | ✅ `WarehousesListPage.jsx`, `WarehouseCreatePage.jsx`, `WarehouseDetailPage.jsx` |
| Inventory & FEFO Stock Movements | ✅ `InventoryPage.jsx` (Intake/Dispatch/Relocation modal + FEFO highlights) |

### ✅ Milestone 3 — Commercial, Freight & Transport (COMPLETE)

| Item | Status |
|------|--------|
| Purchase Orders (B2B Trade) | ✅ `OrdersListPage.jsx`, `OrderCreatePage.jsx`, `OrderDetailPage.jsx` |
| Freight Bookings & Bidding | ✅ `FreightBookingsListPage.jsx`, `FreightBookingCreatePage.jsx`, `FreightBookingDetailPage.jsx` |
| Carrier Freight Quotations | ✅ `FreightQuotesPage.jsx` (Base charge, fuel surcharge, handling in INR) |
| Transporters Directory & KYC | ✅ `TransportersListPage.jsx` (Carrier onboarding + admin approve action) |
| Fleet & Drivers Management | ✅ `FleetListPage.jsx`, `VehicleCreatePage.jsx`, `DriversListPage.jsx`, `DriverCreatePage.jsx`, `DriverDetailPage.jsx` |
| Shipment Dossiers & Timeline | ✅ `ShipmentsListPage.jsx`, `ShipmentCreatePage.jsx`, `ShipmentDetailPage.jsx` (8-stage timeline + Load/Dispatch) |
| Inbound Delivery Inspections | ✅ `DeliveriesListPage.jsx` (Delivery report modal + damage logging) |

### ✅ Milestone 4 — Specialist Modules & Analytics (COMPLETE)

| Item | Status |
|------|--------|
| Cold-Chain Monitoring & Simulation | ✅ `ColdChainPage.jsx` (Recharts dual-axis, simulation start/pause/tick/reset, SLA excursion alarms) |
| Cryptographic Ledger Explorer | ✅ `LedgerPage.jsx` (SHA-256 block chain, integrity verification, client-side tampering sandbox) |
| Supply Chain Analytics Intelligence | ✅ `AnalyticsPage.jsx` (4-tab intelligence dashboard: Overview, Freight Spend, Quality/SLA, Fleet Capacity) |
| Role-Tailored Action Decks | ✅ `DashboardPage.jsx` (Adaptive Quick Actions tailored for each of the 6 user personas) |

### ✅ Milestone 5 — Administration & Production Verification (COMPLETE)

| Item | Status |
|------|--------|
| User Access & RBAC Administration | ✅ `UsersPage.jsx` (User directory, role filters, approve/suspend/activate actions) |
| Architecture Diagnostics & Settings | ✅ `SettingsPage.jsx` (Live /health probes, session dossier, cryptographic standards, cold-chain envelopes) |
| Rollup Code-Splitting & Manual Chunks | ✅ Optimized in `vite.config.js` (< 450 kB per chunk, zero bundle size warnings) |
| Automated Unit Test Suite | ✅ 16 vitest tests passing in `frontend/src/test/` |
| Backend Verification | ✅ 24 pytest tests passing in `backend/tests/` |

---

## Design Tokens (from WarehouseOS)

| Token | Value | Usage |
|-------|-------|-------|
| Canvas background | `#030712` | `body`, page backgrounds |
| Panel background | `#0b1121` | Cards, modals |
| Secondary surface | `rgba(15, 23, 42, 0.5)` | Overlays |
| Input background | `rgba(2, 6, 23, 0.5)` | Form inputs |
| Border default | `border-slate-800` | All cards |
| Border hover | `border-cyan-500/50` | Card hover states |
| Gradient start | `from-cyan-400` | Logo, buttons, accents |
| Gradient end | `to-emerald-400` | Logo, buttons, accents |

---

## Verified API Endpoints

All endpoints verified against `backend/app/api/v1/router.py` and `backend/app/main.py`:

- Health: `/health/live`, `/health/ready` (root-level, no `/api/v1` prefix)
- Auth: `/api/v1/auth/{login,refresh,logout,me}`
- Freight quotes: `POST /api/v1/freight-quotes` (body has `booking_id`, NOT `/freight-bookings/{id}/quotes`)
- Sensor simulation reset: `POST /api/v1/sensors/shipments/{id}/simulation/reset` ✓
- Delivery reports: `GET /api/v1/delivery/reports` ✓


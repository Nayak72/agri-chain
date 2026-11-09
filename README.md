# AgriChain

**Agricultural Supply Chain and Freight Transportation Management System**

AgriChain is an agricultural logistics management platform connecting farmers, agricultural aggregators, warehouse managers, transporters, drivers, and buyers through a unified dark-themed operations cockpit.

The system manages the end-to-end lifecycle of perishable agricultural produce: crop registration, harvest batch creation, warehouse intake with weight reconciliation, quality grading, inventory tracking, purchase orders, freight quotations, consignment dispatch, simulated cold-chain telemetry, corridor checkpoint logging, and delivery verification backed by a simulated SHA-256 hash-chained audit ledger.

---

## Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 18 SPA + Vite 5 | Fast, modular single-page application |
| **Theme / UI** | Tailwind CSS + WarehouseOS | Dark cockpit palette (`#030712` canvas, cyan/emerald accents) |
| **Icons & Charts** | Lucide React + Recharts | Responsive SVG iconography and real-time metric charts |
| **State & Data** | TanStack React Query + Axios | Client caching, automatic background invalidation, JWT interceptor |
| **Backend** | FastAPI (Python 3.12+) | High-performance asynchronous REST API |
| **Validation** | Pydantic v2 | Strict request/response schema serialization |
| **Database** | MongoDB (Replica Set) | Document store with multi-document ACID transaction support |
| **Driver** | Motor (asyncio) | High-throughput asynchronous MongoDB driver |
| **Authentication** | JWT (Access + Refresh tokens) | Stateless token authorization with strict role-based access control |
| **Audit Ledger** | Python `hashlib.sha256` | Tamper-evident simulated hash-chained ledger in MongoDB |
| **Test Suites** | Vitest + Pytest | 100% passing automated unit, RBAC, and lifecycle test suites |

---

## User Roles & Operational Boundaries

AgriChain strictly enforces operational boundaries across six discrete roles:

1. **Administrator (`ADMIN`)** — System governance, user account management (approve, suspend, activate), ledger audit verification, and global analytics.
2. **Farmer / Producer (`FARMER`)** — Farm profile management, crop catalogue, harvest batch creation, and purchase order acceptance.
3. **Warehouse Manager (`WAREHOUSE_MANAGER`)** — Physical produce intake with exact weight reconciliation formula (`abs(received - (accepted + damaged + rejected)) <= 0.01`), quality grading inspections, and FEFO inventory tracking.
4. **Transporter / Fleet Manager (`TRANSPORTER`)** — Vehicle and driver fleet allocation, freight booking quotations, and shipment consignment loading and dispatch.
5. **Driver (`DRIVER`)** — Corridor milestone and route checkpoint logging (no live GPS tracking), cold-chain environmental monitoring (`SIMULATED DATA`), and delivery report submission.
6. **Buyer / Retailer (`BUYER`)** — Produce browsing, purchase order placement, freight booking creation, quote acceptance, and delivery confirmation / rejection / partial receipt.

---

## Key Modules & Workflows

### 1. Public Website & Registration Flow
- **Landing Page (`/`)**: 8-section public showcase featuring system capabilities, end-to-end workflow walkthroughs, live simulated telemetry widget, and cryptographic SHA-256 ledger demo.
- **Registration (`/register`)**:
  - `FARMER` and `BUYER` accounts are automatically approved upon registration.
  - `TRANSPORTER`, `WAREHOUSE_MANAGER`, and `DRIVER` accounts require administrative review and are routed to `/pending-approval`.
  - Administrative accounts cannot be registered publicly.
- **Security Cleansing**: Zero hardcoded passwords exist in frontend source code. Dev-mode quick-fill buttons populate emails only.

### 2. Warehouse Receiving & Quality Grading
- Physical intake enforces exact weight balancing:
  $$\text{received} = \text{accepted} + \text{damaged} + \text{rejected} \quad (\pm 0.01\text{ kg})$$
- Quality grading inspections evaluate visual score, size uniformity, ripeness, defect percentages, and foreign matter presence to assign Grade A, B, C, or Rejection.
- Inventory is tracked dynamically under First Expired, First Out (FEFO) rules.

### 3. Freight Quotes & Shipment Consignments
- Buyers or farmers create freight bookings from accepted purchase orders.
- Transporters submit formal rate quotations with transit time estimates.
- Confirmed bookings transition to shipments upon vehicle and driver allocation (`DRIVER_ASSIGNED`).
- Transporters execute physical loading (`LOADED`) and departure dispatch (`DISPATCHED`).

### 4. Route Checkpoints & Delivery Verification
- Route progress is tracked via milestone checkpoints (city, state, arrival/departure timestamps, inspection notes).
- Drivers submit delivery reports detailing delivered, damaged, and missing quantities with photographic evidence.
- Consignee buyers inspect and confirm, reject, or partially accept consignments directly from dedicated delivery detail views (`/deliveries/:id`).

### 5. Cryptographic Audit Ledger
- SHA-256 hash chaining records every key business event from genesis to head.
- Provides immediate detection of data tampering or out-of-sequence database alterations.
- Note: Pure simulated hash-chained audit log within MongoDB; no Web3 or gas fees.

### 6. Cold-Chain Simulation
- Cold-chain temperature and humidity readings are generated by a deterministic Python engine.
- All telemetry and dashboard visualisations are prominently labeled **`SIMULATED DATA`**.

---

## Directory Structure

```
agri-chain/
├── frontend/                     # React 18 + Vite SPA
│   ├── src/
│   │   ├── api/                  # Axios service clients (agriculture, commerce, monitoring, auth)
│   │   ├── components/           # UI components, layout, Navigation, ProtectedRoute
│   │   ├── constants/            # Canonical ROLES and role matrix definitions
│   │   ├── context/              # AuthContext (token storage, zero demo passwords)
│   │   ├── pages/                # Public pages, dashboards, orders, freight, shipments, inventory
│   │   ├── test/                 # Vitest test suites (roles, reconciliation, ledger, monitoring)
│   │   └── utils/                # Formatting, date, and status color helpers
│   ├── package.json
│   └── vite.config.js
├── backend/                      # FastAPI Python Application
│   ├── app/
│   │   ├── api/v1/endpoints/     # REST controllers (auth, inventory, shipments, delivery, ledger)
│   │   ├── core/                 # Configuration, security, constants, exceptions
│   │   ├── db/                   # MongoDB client, session transactions, unit of work
│   │   ├── models/               # Database domain models
│   │   ├── schemas/              # Pydantic v2 schemas
│   │   └── services/             # Business logic (ledger, analytics, sensor simulation)
│   ├── scripts/
│   │   └── seed_demo.py          # Development demo database seeder
│   ├── tests/                    # Pytest test suites (architecture, RBAC, domain, e2e lifecycle)
│   └── requirements.txt
├── docs/                         # Architecture, API documentation, and audit guides
├── docker-compose.yml            # Multi-container orchestration
└── README.md
```

---

## Development Setup

### Prerequisites
- Python 3.12+
- Node.js 20+
- MongoDB 6.0+ (replica set recommended for transactions)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run backend test suite
pytest tests/ -v

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Backend API will be accessible at: `http://localhost:8000`
Swagger API documentation: `http://localhost:8000/docs`

### 2. Frontend Setup
```bash
cd frontend
npm install

# Run frontend test suite
npm test -- --run

# Build production bundle
npm run build

# Start development server
npm run dev
```
Frontend application will be accessible at: `http://localhost:5173`

---

## Verification & Testing Commands

Both frontend and backend test suites run completely green:

```bash
# Run backend tests (39 passed)
backend/venv/bin/pytest backend/tests

# Run frontend tests (39 passed across 7 suites)
npm --prefix frontend test -- --run

# Run production build
npm --prefix frontend run build
```

---

## License
Proprietary — AgriChain Agricultural Supply Chain & Freight Transportation Platform.

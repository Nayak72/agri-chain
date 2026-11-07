# AgriChain

**Blockchain-Inspired Agricultural Supply Chain and Freight Transportation Management System**

AgriChain is a web-based agricultural logistics management platform that connects farmers, agricultural aggregators, warehouse managers, transporters, drivers, and buyers through a single integrated application.

The system manages the lifecycle of perishable agricultural products, beginning with produce registration and harvest-batch creation, followed by quality inspection, warehousing, inventory management, freight booking, vehicle allocation, shipment execution, cold-chain condition monitoring, delivery verification, and shipment-history auditing.

## Project Identity

| Property | Value |
|----------|-------|
| Project Name | AgriChain |
| Full Title | Blockchain-Inspired Agricultural Supply Chain and Freight Transportation Management System |
| Focus | Fruits and Vegetables |
| Audit Mechanism | Simulated SHA-256 hash-chained ledger |

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router) |
| Frontend Language | TypeScript |
| UI Styling | Tailwind CSS |
| UI Components | shadcn/ui + Radix UI |
| Icons | Lucide React |
| Animation | Framer Motion |
| Charts | Recharts |
| Backend | FastAPI (Python) |
| Backend Validation | Pydantic v2 |
| Database | MongoDB (replica set) |
| MongoDB Driver | Motor (async) |
| Authentication | JWT (access + refresh tokens) |
| Password Security | bcrypt |
| Ledger Hashing | Python hashlib SHA-256 |
| API Communication | REST |
| Sensor Simulation | Python-based simulated service |
| File Storage | Local (cloud-ready abstraction) |
| Testing | Pytest + Playwright |

## Key Features

### Six User Roles
1. **Administrator** - System-wide access, user management, ledger verification, analytics
2. **Farmer / Producer** - Farm registration, harvest batches, inventory, purchase orders
3. **Aggregator / Warehouse Manager** - Goods receiving, quality inspection, grading, inventory
4. **Transporter / Fleet Manager** - Fleet management, quotations, vehicle/driver assignment
5. **Driver** - Trip management, checkpoint recording, exception reporting, delivery
6. **Buyer / Retailer** - Product browsing, purchase orders, delivery confirmation

### Core Workflows
- Farm and produce registration (21 produce types: 11 vegetables + 10 fruits)
- Harvest batch creation with unique batch IDs (e.g., `TOM-NAS-001`)
- Warehouse receiving and quality inspection with grading
- Inventory management with FEFO (First Expired, First Out) allocation
- Purchase orders (separate from freight and shipments)
- Freight booking with transporter quotations
- Vehicle and driver management with availability checks
- Shipment execution through 15 lifecycle states
- Manual checkpoint recording (no GPS)
- Simulated cold-chain monitoring with 6 scenarios
- SHA-256 hash-chained audit ledger with integrity verification
- Freight and quality analytics from real database data

### Simulated Blockchain-Style Ledger
- SHA-256 hash chaining with genesis block
- Single global chain: `AGRCHAIN-GLOBAL-001`
- Transaction-safe appending using MongoDB transactions
- Full chain integrity verification
- Entity-specific audit history
- Non-destructive tampering demonstration
- 28+ event types recorded

### Cold-Chain Monitoring
- Commodity-specific handling profiles (temp/humidity ranges)
- Backend simulation engine (deterministic scenarios)
- 6 simulation scenarios: Normal, Temp Excursion, Humidity Excursion, Both, Fluctuation, Recovery
- Threshold-based alerts with severity levels
- Alert acknowledgement and corrective actions
- All readings explicitly labeled as `SIMULATED DATA`

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js Frontend                    │
│              (App Router, TypeScript, Tailwind)         │
└─────────────────────────────────────────────────────────┘
                            │ REST API
┌─────────────────────────────────────────────────────────┐
│                    FastAPI Backend                      │
│  Auth → Services → Repositories → MongoDB               │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                  MongoDB Replica Set                    │
│        (Required for multi-document transactions)       │
└─────────────────────────────────────────────────────────┘
```

## Directory Structure

```
agri-chain/
├── frontend/                 # Next.js 14 App Router
├── backend/                  # FastAPI
│   ├── app/
│   ├── scripts/
│   │   └── seed_demo.py      # Demo data seeding
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
├── docs/                     # Documentation
├── legacy_reference/         # Original Solidity/JS files
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Setup Instructions

### Prerequisites
- Docker and Docker Compose
- Node.js 20+
- Python 3.12+

### 1. Clone and Configure

```bash
cd agri-chain

# Backend environment
cp backend/.env.example backend/.env
# Edit backend/.env with your settings

# Frontend environment
cp frontend/.env.example frontend/.env.local
```

### 2. Start MongoDB

```bash
docker-compose up mongodb -d
```

The development compose setup uses a standalone MongoDB connection. Configure a
MongoDB replica set in `backend/.env` when running transaction-backed workflows.

### 3. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Seed demo data
python scripts/seed_demo.py

# Start backend
uvicorn app.main:app --reload
```

Backend API: http://localhost:8000
API Docs: http://localhost:8000/docs

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:3000

### 5. Using Docker Compose (All Services)

```bash
docker-compose up -d
```

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Administrator | admin@agrichain.com | Admin123! |
| Farmer | farmer1@agrichain.com | Farmer123! |
| Warehouse Manager | warehouse1@agrichain.com | Warehouse123! |
| Transporter | transporter1@agrichain.com | Transporter123! |
| Driver | driver1@agrichain.com | Driver123! |
| Buyer | buyer1@agrichain.com | Buyer123! |

**These are development-only accounts. Do not use in production.**

## Testing

### Backend Tests
```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

### Frontend Tests
```bash
cd frontend
npm test
```

### End-to-End Tests
```bash
cd frontend
npm run test:e2e
```

## API Endpoints

Base URL: `/api/v1`

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout
- `GET /auth/me` - Current user

### Users
- `GET /users` - List users (admin)
- `GET /users/{id}` - Get user
- `PATCH /users/{id}` - Update user
- `POST /users/{id}/approve` - Approve user (admin)
- `POST /users/{id}/suspend` - Suspend user (admin)

### Farms
- `POST /farms` - Create farm
- `GET /farms` - List farms
- `GET /farms/{id}` - Get farm
- `PATCH /farms/{id}` - Update farm

### Produce
- `GET /produce` - List produce catalogue
- `POST /produce` - Create produce (admin)
- `GET /produce/{id}` - Get produce
- `PATCH /produce/{id}` - Update produce (admin)

### Batches
- `POST /batches` - Create harvest batch
- `GET /batches` - List batches
- `GET /batches/{id}` - Get batch
- `PATCH /batches/{id}` - Update batch
- `GET /batches/{id}/history` - Batch ledger history

### Warehouses
- `POST /warehouses` - Create warehouse
- `GET /warehouses` - List warehouses
- `GET /warehouses/{id}` - Get warehouse
- `PATCH /warehouses/{id}` - Update warehouse

### Inventory
- `POST /warehouses/{id}/receipts` - Create warehouse receipt
- `POST /quality-inspections` - Create quality inspection
- `GET /inventory` - List inventory
- `GET /inventory/movements` - List movements
- `POST /inventory/movements` - Create movement

### Purchase Orders
- `POST /purchase-orders` - Create order
- `GET /purchase-orders` - List orders
- `GET /purchase-orders/{id}` - Get order
- `POST /purchase-orders/{id}/accept` - Accept order
- `POST /purchase-orders/{id}/reject` - Reject order
- `POST /purchase-orders/{id}/cancel` - Cancel order

### Freight
- `POST /freight-bookings` - Create booking
- `GET /freight-bookings` - List bookings
- `GET /freight-bookings/{id}` - Get booking
- `POST /freight-quotes` - Create quotation
- `GET /freight-quotes` - List quotations
- `POST /freight-quotes/{id}/accept` - Accept quotation

### Shipments
- `POST /shipments` - Create shipment
- `GET /shipments` - List shipments
- `GET /shipments/{id}` - Get shipment
- `POST /shipments/{id}/assign-vehicle` - Assign vehicle
- `POST /shipments/{id}/assign-driver` - Assign driver
- `POST /shipments/{id}/load` - Load shipment
- `POST /shipments/{id}/dispatch` - Dispatch shipment
- `POST /shipments/{id}/checkpoints` - Record checkpoint
- `POST /shipments/{id}/report-exception` - Report exception
- `GET /shipments/{id}/timeline` - Get timeline

### Sensors
- `POST /sensors/shipments/{id}/simulation/start` - Start simulation
- `POST /sensors/shipments/{id}/simulation/pause` - Pause simulation
- `POST /sensors/shipments/{id}/simulation/resume` - Resume simulation
- `POST /sensors/shipments/{id}/simulation/stop` - Stop simulation
- `POST /sensors/shipments/{id}/simulation/next-reading` - Next reading
- `GET /sensors/shipments/{id}/sensor-readings` - List readings
- `GET /sensors/shipments/{id}/sensor-alerts` - List alerts
- `POST /sensors/sensor-alerts/{id}/acknowledge` - Acknowledge alert
- `POST /sensors/sensor-alerts/{id}/resolve` - Resolve alert

### Delivery
- `POST /delivery/shipments/{id}/delivery-report` - Create report
- `GET /delivery/shipments/{id}/delivery-report` - Get report
- `POST /delivery/shipments/{id}/confirm-delivery` - Confirm delivery
- `POST /delivery/shipments/{id}/reject-delivery` - Reject delivery
- `POST /delivery/shipments/{id}/partial-delivery` - Partial delivery

### Ledger
- `GET /ledger/blocks` - List blocks
- `GET /ledger/blocks/{index}` - Get block
- `GET /ledger/verify` - Verify full chain
- `GET /ledger/verify/{entity_type}/{entity_id}` - Verify entity history
- `GET /ledger/entities/{entity_type}/{entity_id}` - Entity history
- `GET /ledger/statistics` - Ledger stats

### Analytics
- `GET /analytics/dashboard` - Dashboard metrics
- `GET /analytics/shipments` - Shipment analytics
- `GET /analytics/freight` - Freight analytics
- `GET /analytics/fleet` - Fleet analytics
- `GET /analytics/quality` - Quality analytics
- `GET /analytics/cold-chain` - Cold-chain analytics

## Hash-Chain Ledger Design

The ledger uses SHA-256 hash chaining:

1. **Genesis block**: Previous hash = `"0" * 64`
2. **Each block**: Contains `previous_hash` referencing the prior block's hash
3. **Hash calculation**: SHA-256 of canonical JSON (sorted keys, UTC timestamps)
4. **Verification**: Recalculate each block's hash and verify chain links

**Important**: This is a simulated blockchain-style audit ledger, NOT a decentralized blockchain. It provides tamper-evidence through hash verification but does not provide decentralized consensus or absolute immutability against a database administrator.

See `docs/hash-chain-design.md` for details.

## Cold-Chain Simulation

All temperature and humidity readings are **simulated**. No physical IoT devices or sensors are connected.

- Simulation runs through the FastAPI backend
- 6 deterministic scenarios for consistent demos
- All UI readings labeled `SIMULATED DATA`
- Threshold-based alerts with severity levels

See `docs/sensor-simulation.md` for details.

## Known Limitations

1. **Not a real blockchain**: The ledger is simulated hash chaining, not decentralized
2. **No GPS tracking**: Shipment progress uses manual checkpoints only
3. **No real IoT**: All sensor data is simulated
4. **Single-node MongoDB**: Production should use a proper replica set
5. **Local file storage**: Uploads stored locally; cloud abstraction ready

## Future Enhancements

- Multi-region MongoDB deployment
- Email notifications for alerts
- Mobile app for drivers
- Barcode/QR code scanning for batch tracking
- Advanced route optimization
- Integration with accounting systems

## License

Internal project - AgriChain Agricultural Supply Chain Platform.

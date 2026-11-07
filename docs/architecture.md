# AgriChain System Architecture

## High-Level Architecture

```mermaid
graph TD
    A[Next.js Frontend] -->|REST API/JSON| B[FastAPI Backend]
    B -->|Motor/Async| C[MongoDB Replica Set]
    B -->|SHA-256| D[Hash-Chained Ledger]
    B -->|Python| E[Sensor Simulator]
    
    subgraph Frontend Layer
    A1[App Router]
    A2[Tailwind CSS]
    A3[shadcn/ui]
    A4[Framer Motion]
    A5[Recharts]
    end
    
    subgraph Backend Layer
    B1[Auth Service]
    B2[Business Services]
    B3[Repositories]
    B4[Ledger Service]
    B5[Sensor Simulator]
    end
    
    subgraph Database Layer
    C1[users]
    C2[produce_batches]
    C3[purchase_orders]
    C4[freight_bookings]
    C5[shipments]
    C6[sensor_readings]
    C7[sensor_alerts]
    C8[ledger_blocks]
    C9[ledger_heads]
    end
    
    A --> A1 & A2 & A3 & A4 & A5
    B --> B1 & B2 & B3 & B4 & B5
    C --> C1 & C2 & C3 & C4 & C5 & C6 & C7 & C8 & C9
```

## Module Descriptions

### Authentication Module
- JWT-based authentication with access and refresh tokens
- bcrypt password hashing
- Role-based access control (6 roles)
- Token refresh and revocation

### Supply Chain Module
- Farm and produce catalogue management
- Harvest batch creation with unique IDs
- Quality inspection and grading
- Inventory management with FEFO allocation

### Freight Module
- Purchase orders (commercial)
- Freight bookings (logistics)
- Transporter quotations
- Vehicle and driver management
- Shipment execution

### Cold-Chain Module
- Backend sensor simulation
- Commodity-specific handling profiles
- Threshold-based alerts
- Alert acknowledgement and resolution

### Ledger Module
- SHA-256 hash-chained audit trail
- Transaction-safe appending
- Full chain integrity verification
- Entity-specific audit history

### Analytics Module
- Dashboard metrics from real database
- Shipment, fleet, freight, quality analytics
- Chart data via Recharts

## Data Flow

```
User Action → Frontend → API Endpoint → Service → Repository → MongoDB
                                                   ↓
                                           Ledger Service
                                                   ↓
                                           MongoDB (ledger_blocks)
```

## Security Architecture

- All secrets in environment variables
- JWT tokens stored in httpOnly cookies
- Role-based endpoint permissions
- Resource ownership checks
- CORS configuration
- Input validation with Pydantic
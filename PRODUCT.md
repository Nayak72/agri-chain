# AgriChain Product Specification & Architecture

AgriChain is an agricultural supply chain orchestration platform that unifies agricultural commerce, multi-temperature warehousing, road freight logistics, cold-chain telemetry, and cryptographic auditability.

---

### 1. Platform Personas & RBAC Governance

AgriChain enforces strict Role-Based Access Control (RBAC) across six platform personas:

1. **Farmer**:
   - Manages farm profiles, soil health records, produce catalog listings, and harvest yield batches.
   - Monitors crop market pricing and sales order fulfillment.

2. **Buyer (Consignee)**:
   - Discovers certified agricultural produce, executes commercial orders, requests freight quotations, and conducts destination delivery inspections with weight reconciliation.

3. **Warehouse Manager**:
   - Manages multi-zone storage facilities, oversees inbound intake with strict weight reconciliation (`received = accepted + damaged + rejected`), conducts inventory adjustments, and tracks stock valuations.

4. **Transporter (Carrier)**:
   - Registers fleet vehicles (reefer, flatbed, dry van), manages commercial driver rosters, submits competitive freight quotations, and initializes shipment consignments.

5. **Driver**:
   - Operates active shipment dispatches, records corridor route checkpoints (tollways and transit hubs), and logs destination arrival.

6. **System Administrator**:
   - Manages platform user access (KYC approval, activation, suspension), monitors runtime diagnostics, and conducts cryptographic ledger audits.

---

### 2. Core Operational Modules

1. **Agriculture & Harvest Traceability**:
   - Full provenance from farm acreage to batch yield grading and lot certification.

2. **Commerce & Freight Marketplace**:
   - Produce checkout, carrier freight bidding, quotation acceptance, and consignment booking.

3. **Warehousing & Inventory Balance**:
   - Multi-warehouse inventory ledger with mathematical tolerance checks preventing stock inflation or negative balances.

4. **Shipment Lifecycle State Machine**:
   - 9-stage progression: `BOOKING_CONFIRMED` &rarr; `DRIVER_ASSIGNED` &rarr; `LOADING` &rarr; `LOADED` &rarr; `DISPATCHED` &rarr; `IN_TRANSIT` &rarr; `ARRIVED_AT_DESTINATION` &rarr; `OUT_FOR_DELIVERY` &rarr; `DELIVERED`.

5. **Cold-Chain Telemetry & SLA Enforcement**:
   - Real-time IoT sensor telemetry (temperature and humidity) with automated excursion alerts and corrective action resolution logs.

6. **Cryptographic Audit Ledger**:
   - SHA-256 hash-chained immutable event journal guaranteeing data non-repudiation.

---

### 3. Frontend Architecture

- **Framework**: React 18.3.1 with Vite 5.4.11
- **Styling**: Tailwind CSS 3.4.15 with custom design tokens
- **Data Fetching**: TanStack Query 5.60.5
- **Visualizations**: Recharts 2.13.3
- **Design System**: "Nature Meets Precision" (45% Quiet Luxury Agritech, 25% Warm Organic Commerce, 30% Industrial Precision Logistics)


# AgriChain Database Design

## Collections

### Identity & Master Data
- **users** - User accounts with roles (ADMIN, FARMER, WAREHOUSE_MANAGER, TRANSPORTER, DRIVER, BUYER)
- **farms** - Farmer-owned farm profiles
- **produce_catalogue** - 21 produce types (vegetables + fruits)
- **handling_profiles** - Temperature/humidity ranges per produce
- **transporters** - Transportation company profiles
- **drivers** - Driver records with license info
- **vehicles** - Vehicle records with capacity and refrigeration
- **warehouses** - Warehouse facilities with capacity

### Supply Chain Data
- **produce_batches** - Harvest batches with unique IDs
- **purchase_orders** - Commercial purchase orders
- **warehouse_receipts** - Goods receiving records
- **quality_inspections** - Quality inspection results
- **inventory_items** - Warehouse stock items
- **inventory_movements** - Stock movement history

### Freight Data
- **freight_bookings** - Transportation requests
- **freight_quotations** - Transporter quotes
- **shipments** - Physical cargo movements
- **shipment_items** - Batch items in shipments
- **route_checkpoints** - Manual checkpoints
- **shipment_events** - Exception events
- **freight_charges** - Cost breakdowns

### Monitoring & Delivery
- **simulated_sensor_sessions** - Simulation sessions
- **simulated_sensor_readings** - Sensor readings (SIMULATED)
- **sensor_alerts** - Threshold violation alerts
- **delivery_reports** - Delivery confirmations
- **damage_claims** - Damage claims
- **uploaded_documents** - File metadata

### Ledger & Supporting
- **ledger_blocks** - Hash-chained audit blocks
- **ledger_heads** - Chain head tracking
- **notifications** - User notifications
- **system_settings** - Configuration

## Key Indexes

| Collection | Index Fields | Type |
|------------|-------------|------|
| users | email | unique |
| produce_batches | batch_id | unique |
| produce_batches | farmer_id | regular |
| inventory_items | (warehouse_id, batch_id) | unique |
| purchase_orders | order_id | unique |
| freight_bookings | booking_id | unique |
| shipments | shipment_id | unique |
| vehicles | registration_number | unique |
| drivers | license_number | unique |
| ledger_blocks | (chain_id, index) | unique |
| ledger_blocks | block_id | unique |
| sensor_readings | (shipment_id, timestamp) | compound |
| sensor_alerts | (shipment_id, status) | compound |

## Relationships

```
users 1:N farms (farmer_id)
users 1:N produce_batches (farmer_id)
farms 1:N produce_batches (farm_id)
produce_batches 1:N warehouse_receipts (batch_id)
warehouses 1:N warehouse_receipts (warehouse_id)
warehouse_receipts 1:N quality_inspections (receipt_id)
produce_batches 1:N inventory_items (batch_id)
warehouses 1:N inventory_items (warehouse_id)
users 1:N purchase_orders (buyer_id, seller_id)
purchase_orders 1:N purchase_orders (batch_id)
purchase_orders 1:N freight_bookings (purchase_order_id)
freight_bookings 1:N freight_quotations (booking_id)
freight_bookings 1:N shipments (booking_id)
transporters 1:N vehicles (transporter_id)
transporters 1:N drivers (transporter_id)
shipments 1:N route_checkpoints (shipment_id)
shipments 1:N shipment_items (shipment_id)
shipments 1:N simulated_sensor_readings (shipment_id)
shipments 1:N sensor_alerts (shipment_id)
shipments 1:N delivery_reports (shipment_id)
```

## Monetary Representation

All monetary values stored as integer paise (1 INR = 100 paise) to avoid floating-point errors.

Example: ₹600.50 stored as 60050 paise.
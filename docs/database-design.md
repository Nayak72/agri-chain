# Database design

MongoDB collections are separated by domain and linked with string forms of document IDs. Unique indexes enforce business IDs; the application also uses conditional writes inside replica-set transactions.

| Collection | Key fields and invariant |
| --- | --- |
| `users` | Email, bcrypt password hash, role, approval and active flags. No refresh-token collection. |
| `produce_batches` | Farmer, farm, produce type, initial quantity, shelf-life end, status. No duplicated stock balance. |
| `warehouse_receipts` | One receipt per batch; `received_weight_kg = accepted_weight_kg + damaged_weight_kg + rejected_weight_kg` within 0.01 kg. |
| `inventory_items` | One item for the receipt with `accepted_kg` and `available_kg`; `0 ≤ available_kg ≤ accepted_kg`. |
| `purchase_orders` | Buyer, seller, batch, requested and accepted quantity, status. Accepted, fulfilled and failed orders consume accepted stock. |
| `freight_bookings`, `freight_quotations` | Booking from one accepted order and its accepted quotation. |
| `shipments`, `shipment_items` | One shipment per confirmed booking; reduced status and append-only `status_history`; vehicle and driver assignment. |
| `route_checkpoints` | Append-only driver records with name, city, recorded time, and actor. |
| `sensor_readings`, `sensor_alerts` | On-demand simulated readings and active/resolved alerts. A partial unique index permits one active alert of each type per shipment. |
| `delivery_reports` | One buyer decision per shipment with delivered, damaged, missing, and report hash in the ledger event. |
| `ledger_blocks`, `ledger_heads` | Ordered hash-chained event log and head pointer, updated in the business transaction. |

`backend/scripts/reconcile.py` recomputes accepted minus consuming order quantities, checks each active shipment's vehicle and driver assignment, and verifies the ledger chain. It exits with status 1 for violations.

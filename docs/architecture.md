# Architecture

The React/Vite frontend calls a FastAPI backend using an in-memory bearer token. FastAPI enforces six roles. MongoDB is the system of record and must be a replica set for business transactions. The API fails fast without transaction support unless `ALLOW_STANDALONE_DEV` is explicitly set for local experimentation.

`run_in_txn(callback)` in `backend/app/db/unit_of_work.py` passes a Motor session into each write callback. Motor's `with_transaction` replays callbacks after transient transaction errors with snapshot reads and majority writes. Every business state change and its ledger block use the same session. Conditional updates guard stock reservation, shipment status changes, and vehicle/driver claims.

The data path is: farmer batch → warehouse receipt and inventory item → buyer order → freight booking and quotation → shipment and checkpoints → buyer delivery report. The accepted inventory quantity is fixed at receipt; available quantity is reduced on order acceptance and restored on order rejection/cancellation. Shipment delivery consumes the accepted order reservation.

Sensor readings are generated only when an authorized user requests `POST /sensors/shipments/{id}/simulation/next-reading` while the shipment is in transit. They are labeled simulated. Temperature excursions create one active alert per shipment and alert type. Resolving an alert requires corrective action.

The ledger is a simulated hash-chained audit ledger (no Web3). It stores event payload snapshots and SHA-256 hashes in MongoDB. `GET /ledger/blocks` lists blocks, `GET /ledger/entities/{type}/{id}` returns entity history, and admin-only `GET /ledger/verify` verifies the full chain. The ledger has no independent consensus or external anchoring.

# AgriChain

AgriChain is a scaled-down agricultural freight workflow for six roles: admin, farmer, warehouse manager, buyer, transporter, and driver. It tracks one produce batch from warehouse receipt through order reservation, freight booking, shipment, and buyer delivery decision. It includes on-demand simulated sensor readings and a **simulated hash-chained audit ledger (no Web3)**.

## Run locally

MongoDB must run as a replica set because business writes and ledger records commit in the same transaction. The supplied `docker-compose.yml` starts MongoDB with replica-set initialization.

```bash
docker compose up -d mongodb
cd backend
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

In another shell:

```bash
cd frontend
npm install
npm run dev
```

The API is at `http://localhost:8000/api/v1`, Swagger at `http://localhost:8000/docs`, and the Vite UI at `http://localhost:5173`.

For a fresh demo database, run `python backend/scripts/seed_demo.py` from the repository root. The seed creates one account per role, a 2,000 kg Nashik tomato batch, a Bengaluru warehouse, and two refrigerated vehicles and drivers. The seeded accounts use `DemoPass123!` and their email addresses are `<role>@agrichain.com` (the named farmer, warehouse, transporter, driver, and buyer accounts use the `1` suffix). The second driver is a fleet record without a separate login.

## Workflow

1. The farmer creates a batch. A warehouse manager records one receipt with `received = accepted + damaged + rejected`. The batch's inventory item holds `accepted_kg` and `available_kg`.
2. The buyer creates an order. The farmer accepts it, atomically reducing `available_kg`. Rejecting or cancelling an accepted order releases the reservation. Delivery does not change the reserved balance.
3. The buyer creates a freight booking. A transporter quotes; the buyer or farmer accepts. The transporter creates a shipment and claims an available vehicle and driver in one transaction.
4. Loading, dispatch, transit, arrival, and out-for-delivery follow the reduced state machine. The assigned driver can append checkpoints only in transit. Delay is computed from actual and expected arrival timestamps.
5. The buyer makes one confirm or reject decision. Confirmation records delivered, damaged, and missing quantities whose sum equals loaded weight. Either decision writes the report, finalizes the shipment and order, releases vehicle and driver, and appends a ledger block in one transaction.

Access JWTs live in browser memory and expire after 480 minutes. Reloading the page requires another login. A 401 clears the token and returns the user to login. There are no refresh sessions or outbox workers.

## Verification

```bash
cd backend
pytest -q
TEST_MONGODB_URI='mongodb://localhost:27017/?replicaSet=rs0&directConnection=true' pytest -q tests/test_replica_integration.py
TEST_MONGODB_URI='mongodb://localhost:27017/?replicaSet=rs0&directConnection=true' python scripts/reconcile.py
cd ../frontend
npm test -- --run
npm run build
```

The integration suite skips clearly when `TEST_MONGODB_URI` is unset. `reconcile.py` exits nonzero if inventory balances, active vehicle and driver assignments, or the ledger chain are inconsistent.

## Design notes

- [Architecture](docs/architecture.md)
- [Database model](docs/database-design.md)
- [Shipment workflow](docs/shipment-workflow.md)
- [Hash-chain ledger](docs/hash-chain-design.md)
- [Sensor simulation](docs/sensor-simulation.md)

# AgriChain Testing

## Test Categories

### 1. Backend Tests (Pytest)
Location: `backend/tests/`

Test modules:
- `test_core.py` - Security, ledger hashing, inventory, monetary, shipment transitions

Test coverage:
- Password hashing and verification
- JWT token creation and decoding
- Canonical JSON determinism
- Block hash calculation
- Tampering detection
- FEFO sorting
- Inventory reservation limits
- Freight monetary calculations
- Shipment state transitions

### 2. Frontend Tests (Jest + React Testing Library)
Location: `frontend/`

Test coverage:
- Login form validation
- Registration form validation
- Role-based redirects
- Protected routes
- Dashboard navigation
- Produce creation
- Freight booking submission
- Vehicle assignment
- Shipment status controls
- Sensor simulation controls
- Ledger verification
- Error and empty states

### 3. End-to-End Tests (Playwright)
Location: `frontend/tests/e2e/`

Complete workflow test:
1. Login as farmer → create batch
2. Login as warehouse manager → receive/inspect produce
3. Login as buyer → create purchase order
4. Login as farmer → accept order
5. Create freight request
6. Login as transporter → submit quotation + assign vehicle/driver
7. Login as driver → confirm loading → dispatch
8. Record checkpoints
9. Start sensor simulator → generate temperature excursion
10. Verify alert creation
11. Record corrective action
12. Complete delivery
13. Login as buyer → verify delivery
14. Open shipment ledger history
15. Run full-chain integrity verification
16. Run tampering demonstration
17. Confirm real ledger unchanged

## Running Tests

### Backend
```bash
cd backend
pytest tests/ -v
pytest tests/ --cov=app --cov-report=html
```

### Frontend
```bash
cd frontend
npm test
npm run test:e2e
```

### All Tests
```bash
# From project root
cd backend && pytest tests/ -v
cd ../frontend && npm test && npm run test:e2e
```

## Test Data

Tests use the seeded demo data. Run `python scripts/seed_demo.py` before running tests that depend on demo data.

## Continuous Integration

All tests should pass before declaring a feature complete. No feature is considered done without:
- Backend unit tests
- Frontend component tests (where applicable)
- End-to-end workflow verification
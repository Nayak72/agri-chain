# Simulated hash-chained audit ledger

This is a **simulated hash-chained audit ledger (no Web3)**. It is a MongoDB event log with SHA-256 links, not a decentralized blockchain. It detects edits to persisted block contents and gaps in the indexed chain when verification runs. A database administrator with full write access can rewrite the whole chain and head, so the ledger is tamper-evident within the application trust boundary, not immutable against that administrator.

Each block contains a chain ID, one-based index, timestamp, event type, entity reference, actor, summary, payload snapshot and SHA-256 payload hash, previous block hash, and its own SHA-256 hash. The first block points to 64 zeroes. Canonical JSON fixes key ordering and timestamp precision before hashing. `ledger_heads` stores the latest index and hash.

`append_ledger_block` runs in the same transaction as the business operation. A ledger insertion failure rolls back the business write. `verify_ledger_integrity` checks index continuity, previous hashes, block hashes, and payload snapshots. The API exposes block listing, entity history, and admin-only full verification. Only the 18 events in `LedgerEventType` are emitted.

The replica-set integration suite checks rollback after a forced ledger failure and detects a tampered persisted block. `backend/scripts/reconcile.py` also runs ledger verification while checking stock and assignments.

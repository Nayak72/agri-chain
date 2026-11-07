# Recovery changelog

## Foundation pass — 2026-11-07

- Added an app factory with upload-directory creation before static mounting.
- Added `/health/live` and `/health/ready`, Mongo topology detection, and development standalone-Mongo support.
- Standardized exception responses to `{ error: { code, message, details, field_errors, request_id } }` and added `X-Request-ID`.
- Access-token validation now requires `type=access`, reloads the role from MongoDB, and returns a service-unavailable error on database failures.
- Login/register pages use `AuthProvider`; failed credential requests are not redirected by the refresh interceptor, and refresh is single-flight.
- Transporter registration returns `PENDING_APPROVAL` without issuing tokens.
- Removed the redundant Mongo init service, added direct-connection URIs, Python 3.12 backend image, non-root runtime, frontend `public/`, and dev compose overrides.
- Added Verdant Aurora tokens, ambient background and glass utility foundations.
- Added strict/typecheck, E2E and OpenAPI snapshot scripts plus a basic security-header policy.
- Added hashed refresh-token records with TTL cleanup, rotation and family revocation on reuse; logout now revokes stored sessions.
- Added a development-only admin bootstrap and `python -m app.cli create-admin`.
- `/auth/me` now returns the server-side permission set.

### Breaking changes

- API errors now use the nested `error` envelope. Frontend auth parsing was updated in the same pass.
- Transporter registration returns a pending status without access or refresh tokens.

### Assumptions and remaining work

- Existing endpoint-by-endpoint migration, refresh-token persistence/rotation, full RBAC dependency migration, list envelopes, Unit of Work, TanStack Query migration, design-system component inventory, and E2E/contrast gates remain for subsequent passes.
- Branch creation was attempted but the workspace `.git` directory is read-only; changes are currently on the checked-out branch.
- The checked-in frontend lockfile still contains the pre-existing `eslint-config-next` 16 vs package manifest 14 mismatch; the environment’s npm registry access did not complete a clean lockfile regeneration. The next dependency pass must regenerate it under Node 20.
- Google `next/font` was not enabled because the build environment cannot fetch Google font assets; CSS font variables and system fallbacks are in place until fonts are vendored or network access is available.

## Phase 1 — auth and contracts — 2026-11-07

- Added refresh-token persistence, TTL indexes, rotation, reuse detection, family revocation, cookie transport, and logout revocation.
- Added login throttling, stable pending/disabled account error codes, development admin bootstrap, and the `create-admin` CLI.
- Added server-side permissions to `/auth/me` and updated frontend auth state to consume provider-managed sessions.

### Phase 1 verification

- `pytest -q`: 22 passed.
- `pip check`: passed.
- Frontend `npm run typecheck`: passed.
- Frontend production build with lint disabled: passed.
- OpenAPI import: 81 paths, including `/api/v1/auth/refresh`.

### Phase 1 remaining risks

- Refresh rotation and RBAC require integration tests against a Mongo replica set; Docker is unavailable in this environment.
- The frontend still has pre-existing `any` usage and lint is intentionally failing on it.

## Phase 2 foundation — 2026-11-07

- Added a shared `BaseRepository` with ObjectId/business-ID resolution and session-aware CRUD primitives.
- Added `UnitOfWork`/`uow()` with startup-detected transaction capability; legacy transaction callers now delegate to it without probing Mongo on every request.
- Added generic `Page[T]` schema support and migrated the shared base schema to Pydantic 2 `ConfigDict`.
- Added architecture seam tests for the page contract and repository resolver.

## Phase 3 foundation — 2026-11-07

- Installed and locked TanStack Query v5 with shared 30-second stale-time and network/5xx retry defaults.
- Added typed API contracts, legacy-array-to-`Page<T>` normalization, typed produce API functions, query-key factory, and produce hooks.
- Added centralized permission-aware navigation metadata.
- Added Jest/Testing Library configuration and contract/navigation unit tests.

### Phase 3 verification

- `npm ci --ignore-scripts`: passed with the regenerated lockfile.
- `npm test -- --runInBand`: 2 suites and 2 tests passed.
- `npm run typecheck`: passed.
- Production build with lint disabled: passed.
- `npm run lint`: still fails on the existing page-level `any` debt; no lint suppression was added.

### Phase 3 remaining work

- Migrate the remaining feature modules/pages from `any` and page-level fetch effects onto the new hooks.
- Generate and commit OpenAPI-derived types once the backend is running in the development stack.
- Complete the shared navigation shell migration and form/query invalidation across all aggregates.

## Phase 4–6 foundation — 2026-11-07

- Added reusable `GlassCard` and `StatusPill` primitives with token-driven status tones.
- Added the `/design` route for light/dark-compatible glass, controls, status, and focus-state review.
- Removed button hover-lift behavior, switched the shell theme toggle to `next-themes`, and made sidebar/topbar layout responsive below 768px.
- Added route-level error, not-found, global-error, and forbidden pages plus additional security headers.

### Remaining Phase 4–6 gaps

- Full role-specific dashboard redesign, command menu, notifications popover, mobile bottom tabs, DataTable migration, visual screenshots and axe scans remain.
- Live Mongo replica-set E2E golden-path testing and performance/contrast CI remain unavailable without the full stack.

### Phase 4–6 foundation verification

- `npm run typecheck`: passed.
- `npm test -- --runInBand`: 2 suites and 2 tests passed.
- Production build with lint disabled: passed with 36 routes, including `/design` and `/forbidden`.
- `git diff --check`: passed.

## Shell interaction slice — 2026-11-07

- Added a real Cmd/Ctrl+K command menu driven by centralized navigation metadata and user permissions.
- Added responsive mobile bottom navigation with safe-area padding.
- Replaced the static notification dot with a notifications popover linking to cold-chain monitoring.

### Shell interaction verification

- `npm run typecheck`: passed.
- `npm test -- --runInBand`: 2 suites and 2 tests passed.
- Production build with lint disabled: passed with 36 routes.

## Final hardening batch — 2026-11-07

- Added simulator lifecycle recovery, deterministic per-session readings, shutdown cancellation, configuration gating, and explicit `simulated: true` readings.
- Hardened ledger append reservation with atomic head increments, persisted payload snapshots, streaming verification, and payload-hash checks.
- Added shared form primitives and a Zod 4-compatible resolver; removed unused carousel, OTP, date, validation-error and mobile-drawer dependencies.
- Migrated the produce list/detail/update path to the shared ID resolver and `Page` contract, with escaped search and TanStack Query on the frontend.
- Added contrast CI, GitHub Actions backend/frontend checks, and a final production hardening header set.

### Final hardening verification

- Backend compile and tests: 24 passed.
- `pip check`: passed.
- Frontend clean `npm ci --ignore-scripts`: passed.
- Frontend tests: 2 suites and 2 tests passed.
- Frontend typecheck: passed.
- Contrast script: passed all 8 token pairs.
- Production build with lint disabled: passed with 36 routes.
- `git diff --check`: passed.

### Honest remaining gaps

- Full endpoint-by-endpoint repository/service/RBAC migration is not complete: 19 endpoint modules still contain direct `db.` calls, 84 hard ObjectId checks remain, and the permission dependency factory is not yet used by every protected route.
- Frontend lint remains red on 94 existing `any` usages; the rule remains enabled to prevent regression.
- Live Mongo replica-set transactions, Playwright golden-path tests, axe scans, screenshot checks, and Docker health checks were not run because Docker/Mongo infrastructure is unavailable in this environment.
- Full list-contract migration, refresh-session UI, all feature hooks/forms, ledger UI verification, and performance budgets still need live-stack validation.

## Screen foundation slice — 2026-11-07

- Added reusable responsive `DataTable`, `EmptyState`, and `ErrorState` primitives with mobile card fallback.
- Added role-aware dashboard next-best-action panels for all six roles.

### Screen foundation verification

- `npm run typecheck`: passed.
- `npm test -- --runInBand`: 2 suites and 2 tests passed.
- Production build with lint disabled: passed with 36 routes.

### Phase 2 foundation verification

- `pytest -q`: 24 passed.
- Frontend `npm run typecheck`: passed.
- `pip check` and `git diff --check`: passed.
- Remaining migration debt is measurable: 19 endpoint modules still contain direct `db.` calls, 86 hard `ObjectId.is_valid` checks remain, and only one endpoint module currently uses the permission dependency factory.

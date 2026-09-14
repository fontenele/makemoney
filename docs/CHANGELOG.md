# Changelog

## 2026-09-14 — M7.18 bounded checkpoint-worker configuration completed

- Added startup-validated interval, batch-size, and lease-duration configuration for the future checkpoint worker.
- Added one injected worker-options contract with conservative defaults and strict upper/lower bounds.
- Updated `.env.example`; no timer, automatic claim, provider request, or market sample was activated.
- 484 unit tests and all 46 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-14 — M7.17 ownership-safe checkpoint completion completed

- Added durable terminal checkpoint completion constrained to the recorded active lease interval.
- Completion now requires matching provider, symbol, label, and claim token and is idempotently rejected after the first successful transition.
- Completed checkpoints are excluded from bounded due reads, new claims, and expired-lease recovery.
- Applied the migration locally; 476 unit tests and all 46 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-14 — M7.16 atomic checkpoint leases completed

- Added durable checkpoint claim token, claim time, and expiry fields with database consistency enforcement.
- Added bounded atomic claims using PostgreSQL `FOR UPDATE SKIP LOCKED`; active leases are excluded and expired work is reclaimable.
- Added application validation and deterministic claimed-batch ordering without introducing a worker or provider request.
- Applied the migration locally; 470 unit tests and all 46 isolated E2E tests passed together with build, lint, and formatting checks.

## 2026-09-14 — M7.15 validated due-checkpoint boundary completed

- Added an internal application service for due-checkpoint reads.
- Enforced a valid reference time and strict integer batch limit from 1 through 100 before database access.
- Added no route, worker, claim, retry, provider request, or market sample.
- 464 unit tests and all 45 isolated E2E tests passed; build, lint, formatting, Compose, and diff validation also passed.

## 2026-09-14 — M6 closure wording clarified

- Clarified that M6.1–M6.32 fully satisfy the accepted M6 scope.
- Reclassified the previously listed advanced capabilities as optional post-M6 enhancements requiring separately planned milestones, not unfinished M6 work.

## 2026-09-14 — M7.14 bounded due-checkpoint read completed

- Added a provider-neutral internal read for checkpoints due by an explicit instant.
- Bounded and deterministically ordered results using the target-time index.
- Added no claiming, worker, retry, provider request, market sample, or financial behavior.
- 457 unit tests and all 45 isolated E2E tests passed; build, lint, formatting, Compose, and diff validation also passed.

## 2026-09-14 — M7.13 durable observation checkpoints completed

- Added an indexed PostgreSQL checkpoint table related to durable detected symbols.
- Created all nine observation targets atomically and idempotently with each new detection.
- Backfilled only existing rows with legitimate detection timestamps; no worker or market sampling was introduced.
- 457 unit tests and all 45 isolated E2E tests passed; build, lint, formatting, Compose, and diff validation also passed.

## 2026-09-14 — M7.12 deterministic observation schedule completed

- Defined the nine planned detection-relative research checkpoints as a provider-neutral domain contract.
- Added a pure validated schedule builder with independent UTC target instants and no mutable-date aliasing.
- Added no persistence, scheduler, provider request, market tracking, alert, signal, or financial behavior.
- 457 unit tests and all 45 isolated E2E tests passed; build, lint, formatting, Compose, and diff validation also passed.

## 2026-09-14 — M7.11 current-state sample composition completed

- Extended the filtered detection summary with deterministic counts grouped by current provider status and Spot-trading availability.
- Read the aggregate and both breakdowns in one PostgreSQL transaction for a consistent snapshot during concurrent catalog refreshes.
- Kept the analysis limited to already persisted current state, without historical-state inference or market tracking.
- 454 unit tests and all 45 isolated E2E tests passed; build, lint, formatting, Compose, and diff validation also passed.

## 2026-09-14 — M7.10 filtered detection summary completed

- Added read-only `GET /new-listings/summary` over the complete matching durable detection sample.
- Reused strict time, provider, status, and Spot-availability filters without pagination semantics.
- Returned an exact count and explicit nullable earliest/latest application detection times without adding market tracking or financial behavior.
- 454 unit tests and all 45 isolated E2E tests passed; build, lint, formatting, Compose, and diff validation also passed.

## 2026-09-14 — M7.9 current provider-state filters completed

- Added strict optional provider, current status, and Spot-availability filters to `GET /new-listings`.
- Composed state filters with the existing limit, detection-time window, and stable cursor query.
- Rejected cursors that do not match the active filters rather than silently changing pagination semantics.
- Isolated all public market-data and symbol-catalog providers in the application E2E harness so controlled paper-market assertions cannot be overwritten by live Binance events.
- 451 unit tests and all 43 isolated E2E tests passed; build, lint, formatting, Compose, and diff validation also passed.

## 2026-09-14 — M7.8 stable detection cursor completed

- Added optional canonical `provider:symbol` cursor pagination to `GET /new-listings`.
- Resolved cursors server-side and continued after the complete immutable detection sort position without offset drift.
- Rejected malformed, missing, baseline-only, and time-filter-incompatible cursors explicitly.
- 445 unit tests and all 43 isolated E2E tests passed; build, lint, formatting, Compose, and diff validation also passed.

## 2026-09-14 — Risk decimal startup validation fixed

- Fixed startup validation so strictly positive fractional risk limits such as the default `RISK_MAX_BTC_POSITION_QUANTITY=0.01` are accepted.
- Kept zero, negative, non-canonical, over-precision, and over-scale values rejected.
- Added regression coverage for all affected positive decimal risk-limit settings.

## 2026-09-14 — M7.7 detection-time filters completed

- Added optional inclusive `detectedFrom` and `detectedTo` filters to `GET /new-listings`.
- Required canonical millisecond-precision UTC timestamps and rejected malformed or inverted ranges before database access.
- Applied the filters within the existing bounded deterministic detection query without a migration or mutation path.
- 429 unit tests and all 42 isolated E2E tests passed; build, lint, formatting, Compose, and diff validation also passed.

## 2026-09-14 — M7.6 bounded detection API completed

- Added local read-only `GET /new-listings` for durable post-baseline detections, newest first.
- Added strict optional `limit=1..100` validation with a default of 50 and deterministic provider/symbol tie-breaking.
- Excluded baseline rows and returned current provider state alongside immutable detection and latest-observation times.
- 425 unit tests and all 42 isolated E2E tests passed; build, lint, formatting, Compose, and diff validation also passed.

## 2026-09-14 — M7.5 durable detection marker completed

- Added nullable immutable `detectedAt` persistence and an index for post-baseline symbol discoveries.
- Kept baseline and pre-migration observations unclassified instead of fabricating historical detection events.
- Verified that later observations update current provider state without rewriting the original application detection time.
- 419 unit tests and all 42 isolated E2E tests passed; build, lint, formatting, Compose, and diff validation also passed.

## 2026-09-14 — M7.4 sequential catalog polling completed

- Added immediate startup loading followed by non-overlapping public catalog refreshes, defaulting to a 60-second completion-relative interval.
- Added validated `NEW_LISTINGS_POLL_INTERVAL_MS` configuration with a five-second minimum and a safe example value.
- Preserved the last successful state across refresh failures and canceled active work and pending timers during shutdown.
- 419 unit tests and all 42 isolated E2E tests passed; build, lint, formatting, Compose, and diff validation also passed.

## 2026-09-14 — M7.3 conservative newly observed detection completed

- Compared each non-empty Spot catalog with its durable provider baseline in the same serializable transaction used for observation upserts.
- Made the first provider population baseline-only and returned only later previously unseen symbols as newly observed.
- Retained the latest newly observed set in the startup catalog service and logged its count without adding polling, routes, alerts, signals, or trading.
- 413 unit tests and all 42 isolated E2E tests passed; build, lint, formatting, Compose, and diff validation also passed.

## 2026-09-14 — M7.2 durable symbol observations completed

- Added transactional PostgreSQL persistence for first/latest application observations and current Spot symbol state.
- Added the `observed_spot_symbols` migration and isolated database-backed idempotency coverage.
- Observation time is explicitly not represented as an official Binance listing time; no polling, route, signal, or trading was added.
- 413 unit tests and all 41 isolated E2E tests passed with build, lint, formatting, Compose, and diff validation.

## 2026-09-14 — M7.1 public Spot symbol catalog completed

- Added a provider-neutral Binance Spot/USDT catalog loaded from public exchange information without credentials.
- Added strict normalization, deterministic ordering, startup retention, timeout, shutdown cancellation, and non-blocking failure handling.
- No polling, persistence, listing claim, API route, signal, order, or financial mutation was introduced.
- 413 unit tests passed across 58 suites; all 40 isolated E2E tests and static checks passed.

## 2026-09-13 — M6.32 isolated E2E validation and M6 closure completed

- Added a disposable `crypto_trader_e2e` schema lifecycle for full E2E runs, with automatic migration and no access to local application records.
- Fixed PostgreSQL adapter schema propagation so generated Prisma operations and raw SQL transactions share the configured schema and validated search path.
- Closed M6 after 407 unit tests across 56 suites and all 40 E2E tests across 3 suites passed together; build, lint, formatting, Compose, and diff checks also passed.

## 2026-09-13 — M6.31 explicit simulation-run deletion completed

- Added `DELETE /backtesting/runs/:id` with validated UUID identity and explicit HTTP 204, 400, 404, and sanitized 503 outcomes.
- A single conditional PostgreSQL deletion removes only the selected simulation snapshot; historical candles and all financial state remain untouched.
- 404 unit tests passed across 55 suites. The focused HTTP deletion test and all 5 backtest-run persistence E2E tests passed; the full E2E run reached 35/40 but remains blocked by pre-existing `e2e-*` paper-trading residue in the shared local database.

## 2026-09-13 — M6.30 persisted-run temporal filtering completed

- Added inclusive canonical UTC `createdFrom` and `createdTo` filters to `GET /backtesting/runs`, composed with limit and cursor.
- Invalid, inverted, and cursor-incompatible ranges return HTTP 400; no response shape, schema, or financial behavior changed.
- 399 unit tests passed across 55 suites; 38 E2E tests passed across 3 suites.

## 2026-09-13 — M6.29 stable simulation-run cursor pagination completed

### Added

- Optional UUID `cursor` on `GET /backtesting/runs`, taken from the last item of the preceding page.
- Exclusive keyset boundary over immutable creation time and UUID with explicit malformed and unknown-cursor handling.
- Unit, HTTP E2E, and PostgreSQL-backed coverage for cursor resolution, boundary semantics, validation, and unchanged no-cursor behavior.

### Changed

- Extended recent-run reads with stable keyset pagination while preserving the existing array response and 1–100 limit contract.
- Updated the root README route table and synchronized backtesting documentation, project context, roadmap, plan, map, decisions, changelog, and current state.

### Verification

- 396 unit tests passed across 55 suites; 37 E2E tests passed across 3 suites.
- Lint, formatting check, TypeScript build, Compose validation, and diff whitespace validation passed.
- No response envelope, offset pagination, filtering, deletion, update, recalculation, Binance access, financial mutation, exchange authentication, order submission, or real trading was introduced.

## 2026-09-13 — M6.28 bounded recent simulation-run listing completed

### Added

- Read-only `GET /backtesting/runs` returning immutable simulation snapshots newest first.
- Strict optional `limit` validation from 1 through 100 with a default of 50 and sanitized operational failure handling.
- Unit, HTTP E2E, and PostgreSQL-backed coverage for projection, bounds, deterministic ordering, and strict limiting.

### Changed

- Extended the backtest-run repository and application service with bounded recent reads using the existing creation-time and UUID index.
- Added the route to the root README and synchronized backtesting documentation, project context, roadmap, plan, map, decisions, changelog, and current state.

### Verification

- 391 unit tests passed across 55 suites; 36 E2E tests passed across 3 suites.
- Lint, formatting check, TypeScript build, Compose validation, and diff whitespace validation passed.
- No cursor pagination, filtering, deletion, update, recalculation, Binance access, financial mutation, exchange authentication, order submission, or real trading was introduced.

## 2026-09-13 — M6.27 immutable simulation-run retrieval completed

### Added

- Read-only `GET /backtesting/runs/:id` returning one complete immutable simulation snapshot by UUID.
- Explicit HTTP 400 for malformed UUIDs, 404 for absent runs, and sanitized 503 for operational lookup failures.
- Unit, HTTP E2E, and PostgreSQL-backed repository coverage for exact retrieval, absence, validation, and failure mapping.

### Changed

- Extended the backtest-run repository and application service with direct primary-key lookup while keeping persistence metadata private.
- Added the route to the root README and synchronized backtesting documentation, project context, roadmap, plan, map, decisions, changelog, and current state.

### Verification

- 381 unit tests passed across 55 suites; 34 E2E tests passed across 3 suites.
- Lint, formatting check, TypeScript build, Compose validation, and diff whitespace validation passed.
- No recalculation, Binance access, listing, pagination, deletion, update, financial mutation, exchange authentication, order submission, or real trading was introduced.

## 2026-09-13 — M6.26 immutable simulation-run persistence completed

### Added

- `POST /backtesting/runs` with the same strict fictional simulation request as the ephemeral route and a required `Idempotency-Key` header.
- Immutable PostgreSQL snapshots containing a UUID, UTC creation time, normalized complete request, and complete JSON-safe simulation result with decimal strings preserved exactly.
- Canonical SHA-256 request fingerprints, replay without recalculation for identical requests, and HTTP 409 conflict detection for mismatched key reuse.
- Unit, HTTP E2E, and PostgreSQL-backed integration coverage for creation, exact replay, serialization, and conflicts.

### Changed

- Registered the backtest-run repository and application service while leaving `POST /backtesting/simulate` unchanged.
- Added the route to the root README and synchronized backtesting documentation, project context, roadmap, plan, map, decisions, changelog, and current state.

### Verification

- 375 unit tests passed across 55 suites; 32 E2E tests passed across 3 suites.
- Prisma generation and deployment of all eight migrations, lint, formatting check, TypeScript build, Compose validation, and diff whitespace validation passed.
- No run retrieval/list/delete route, operational wallet mutation, strategy execution, exchange authentication, order submission, or real trading was introduced.

## 2026-09-13 — M6.25 local historical simulation API completed

### Added

- Local `POST /backtesting/simulate` exposing the complete deterministic fictional simulation result.
- Strict pre-load validator for the full configuration and execution-rule snapshot, including semantic decimal, rate, range, impact, and step checks.
- Controller and E2E coverage for valid simulation mapping, pre-load rejection, sanitized operational failure, and response exposure.

### Changed

- Registered the simulation validator and documented every required configuration group in the root README API table.
- Synchronized backtesting documentation, project context, roadmap, plan, map, decisions, changelog, and current state.

### Verification

- 372 unit tests passed across 54 suites; 29 E2E tests passed across 2 suites.
- Lint, formatting check, TypeScript build, Compose validation, and diff whitespace validation passed.
- No result persistence, paper-wallet mutation, operational Risk Engine access, order submission, exchange authentication, or real trading was introduced.

## 2026-09-13 — M6.24 local historical replay API completed

### Added

- Local `POST /backtesting/replay` for bounded deterministic BTC/USDT one-minute signal replay.
- Strict canonical UTC timestamp, range, limit, shape, and unknown-field validation.
- Controller and E2E coverage for request mapping, response serialization, invalid input, and sanitized operational failure.

### Changed

- Registered the backtesting presentation controller and documented the route in the root README API table.
- Synchronized backtesting documentation, project context, roadmap, plan, map, decisions, changelog, and current state.

### Verification

- 359 unit tests passed across 53 suites; 28 E2E tests passed across 2 suites.
- Lint, formatting check, TypeScript build, Compose validation, and diff whitespace validation passed.
- No simulation API, result persistence, wallet access, signal execution, exchange authentication, or real trading was introduced.

## 2026-09-13 — M6.23 sequential historical gap filling completed

### Added

- Deterministic planner that groups missing expected minute identities into contiguous bounded historical requests.
- Focused coverage for multiple gaps, cache completeness, single-batch persistence, and incomplete provider recovery.

### Changed

- Cache misses now load only missing historical ranges sequentially instead of reloading the complete request.
- Stored and fetched candles are merged only when they form the exact complete request sequence; incomplete recovery and duplicate identities fail before persistence or replay.
- All fetched gaps persist through one existing transactional repository call.
- Synchronized backtesting documentation, project context, roadmap, plan, map, decisions, README, changelog, and current state.

### Verification

- 351 unit tests passed across 52 suites; 27 E2E tests passed across 2 suites.
- Lint, formatting check, TypeScript build, Compose validation, and diff whitespace validation passed.
- No refresh, overwrite, parallel loading, route, migration, wallet access, execution, or real trading was introduced.

## 2026-09-13 — M6.22 automatic complete-range cache reuse completed

### Added

- Pure minute-aligned historical coverage calculation bounded by the inclusive request range and limit.
- Focused tests for complete, limited, missing, displaced, and truncated stored sequences.

### Changed

- Standard historical replay and simulation now read PostgreSQL first, bypassing Binance and persistence on a proven complete cache hit.
- Incomplete coverage falls back to the existing full remote load and transactional write-through; explicit stored-only methods remain unchanged.
- Synchronized backtesting documentation, project context, roadmap, plan, map, decisions, README, changelog, and current state.

### Verification

- 347 unit tests passed across 51 suites; 27 E2E tests passed across 2 suites.
- Lint, formatting check, TypeScript build, Compose validation, and diff whitespace validation passed.
- No partial gap download, mixed-source merge, refresh policy, route, migration, wallet access, execution, or real trading was introduced.

## 2026-09-13 — M6.21 stored historical replay completed

### Added

- Bounded chronological `findRange` reads on the provider-neutral historical-candle repository.
- Strict reconstruction of persisted candles with identity, closed-state, timestamp, safe trade-count, decimal, volume, and OHLC validation.
- Explicit internal stored-only replay and simulation operations that never invoke Binance or repeat write-through persistence.
- Unit coverage for range queries, mapping, invalid requests, invalid rows, stored replay, and provider isolation.
- PostgreSQL integration coverage for chronological ordering and result limits over persisted candles.
- The full unit suite now contains 342 tests across 50 suites; 27 E2E tests pass across 2 suites with the documented safe process-only environment override.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No automatic cache selection, fallback, gap filling, completeness claim, route, migration, candle mutation/deletion, result persistence, wallet access, execution, or real trading was introduced.

## 2026-09-13 — M6.20 historical candle persistence completed

### Added

- PostgreSQL `historical_candles` storage keyed by symbol, interval, and open time, with closed-state, identity, time, and trade-count constraints.
- Exact textual persistence for validated OHLC and volume decimals without floating-point or fixed-scale loss.
- Provider-neutral historical-candle repository with serializable batch writes, duplicate skipping, complete post-write comparison, and explicit conflict rejection.
- Write-through orchestration that blocks replay and simulation until the complete freshly loaded batch persists successfully.
- Unit coverage for mapping, idempotency, conflicts, empty batches, and persistence-before-replay behavior.
- PostgreSQL integration coverage for exact idempotent storage and whole-batch rollback on identity conflict.
- The full unit suite now contains 338 tests across 50 suites; 26 E2E tests pass across 2 suites with the documented safe process-only environment override.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No stored-range reads, cache-first behavior, gap filling, candle deletion, result persistence, route, new market, wallet access, execution, or real trading was introduced.

## 2026-09-13 — M6.19 historical provider circuit breaker completed

### Added

- Process-local circuit state for exhausted transient Binance historical-page failures.
- Three-failure opening threshold, 30-second fail-fast interval, and one concurrent half-open recovery probe.
- Success-driven reset and probe-failure reopening without repeating already accepted historical pages.
- Explicit exclusion of caller cancellation, invalid requests, permanent HTTP responses, and invalid successful payloads from failure accounting.
- Deterministic tests for opening, fail-fast behavior, recovery, single-probe concurrency, reopening, and excluded failures.
- The full suite now contains 333 tests across 49 suites.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No Redis coordination, persistence, operator route, public configuration, metrics endpoint, parallel paging, cache, wallet access, execution, or real trading was introduced.

## 2026-09-13 — M6.18 resilient historical page loading completed

### Added

- At most three total attempts for each Binance historical page when network, HTTP 429, or HTTP 5xx failures occur.
- Bounded 500 ms and 1 s exponential retry waits plus valid `Retry-After` support capped at 30 seconds.
- Caller-cancelable waiting and a fresh ten-second timeout for every HTTP attempt.
- Immediate failure for permanent HTTP client responses and malformed successful payloads.
- Deterministic injected-wait tests covering recovery, exhaustion, rate-limit delay, permanent failure, and cancellation.
- The full suite now contains 329 tests across 49 suites.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No circuit breaker, parallel paging, persistence, cache, resumable job, route, public configuration, wallet access, execution, or real trading was introduced.

## 2026-09-13 — M6.17 bounded historical pagination completed

### Added

- Provider-neutral historical requests for up to 10,000 BTC/USDT one-minute candles and a matching 10,000-minute maximum span.
- Sequential Binance retrieval using pages of at most 1,000 candles and the remaining caller limit.
- Deterministic cursor advancement from the last validated open time, with terminal empty and partial-page handling.
- Focused coverage for multi-page aggregation, page limits, cursor construction, empty termination, and the expanded safety ceiling.
- The full suite now contains 325 tests across 49 suites.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No persistence, cache, retry/rate-limit policy, parallel requests, new symbol or interval, API route, wallet access, execution, or real trading was introduced.

## 2026-09-13 — M6.16 causal volume participation completed

### Added

- Required positive maximum volume-participation rate no greater than one for historical simulation.
- Causal all-or-none liquidity limit based exclusively on the fully closed signal candle's base volume, without reading execution-candle volume.
- Dedicated `liquidityUnfilledSignalCount` with cash and position preservation for rejected buys and sells.
- Auditable fill fields for the liquidity reference candle close, reference base volume, and calculated maximum fill quantity.
- Focused tests for inclusive limits, zero volume, arbitrary decimal precision, causal rejection, sell-state preservation, and configuration validation.
- The full suite now contains 323 tests across 49 suites.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No partial fills, variable sizing, order-book/depth model, route, persistence, wallet access, execution, or real trading was introduced.

## 2026-09-13 — M6.15 executable price range completed

### Added

- Mandatory positive minimum and maximum prices in the provider-neutral historical execution-rule snapshot.
- Early validation of coherent price ranges and inclusive exact-decimal boundary checks on final tick-aligned prices.
- Dedicated `priceRangeUnfilledSignalCount` with cash and position preservation for rejected buys and sells.
- Deterministic validation order placing price range before minimum notional, plus focused boundary and simulator-state tests.
- The full suite now contains 315 tests across 48 suites.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No live metadata dependency, liquidity, partial fill, variable sizing, route, persistence, wallet access, execution, or real trading was introduced.

## 2026-09-13 — M6.14 price precision completed

### Added

- Mandatory positive tick size in each provider-neutral historical execution-rule snapshot.
- Isolated side-aware fill-price calculator retaining reference, post-impact adjusted, and final executable prices.
- Conservative exact-decimal quantization: buys round upward and sells downward, with all downstream financial calculations using the final price.
- Explicit accounting for sells whose tick flooring reaches zero, preserving the open position without creating a fill.
- Focused tests for both sides, aligned prices, zero flooring, arbitrary precision, financial reconciliation, and rule validation.
- The full suite now contains 310 tests across 48 suites.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No price range filter, live metadata dependency, liquidity, partial fill, variable sizing, route, persistence, wallet access, execution, or real trading was introduced.

## 2026-09-13 — M6.13 quantity and minimum-order constraints completed

### Added

- Required provider-neutral historical execution-rule snapshot with minimum/maximum quantity, step size, and minimum notional.
- Early exact-decimal validation of the fixed quantity against range and step-size constraints without silent rounding.
- Per-potential-fill minimum-notional enforcement using effective post-cost price, with dedicated unfilled-signal accounting and no state mutation.
- Returned normalized rule snapshot for reproducible simulations and tests for boundary, precision, buy-rejection, and sell-rejection behavior.
- The full suite now contains 302 tests across 47 suites.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No price tick rounding, live metadata dependency, liquidity, partial fill, variable sizing, route, persistence, wallet access, execution, or real trading was introduced.

## 2026-09-13 — M6.12 time and exposure metrics completed

### Added

- Tested-period duration from the first historical candle open through the final candle close.
- Per-closed-trade holding durations, total time in market, decimal exposure rate, and average closed-trade holding duration.
- Ending open-position exposure measured through the final candle close and explicit null states for undefined ratios or absent samples.
- Isolated temporal calculator with four focused tests for empty, closed, open, and invalid intervals, plus simulator integration assertions.
- The full suite now contains 291 tests across 46 suites.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No annualization, Sharpe or Sortino ratio, liquidity, pair-rule enforcement, variable sizing, route, persistence, wallet access, execution, or real trading was introduced.

## 2026-09-13 — M6.11 deterministic spread and slippage completed

### Added

- Required explicit full-spread and slippage rates for historical simulation, validated as non-negative decimal inputs.
- Adverse effective execution pricing at the next candle open: half-spread plus slippage above reference for buys and below reference for sells.
- Auditable fill-level reference and effective prices, with effective prices feeding notionals, fees, affordability, cash, PnL, ROI, and equity.
- Focused tests for symmetric price impact, downstream reconciliation, configuration boundaries, and a buy made unaffordable by execution costs.
- The full suite now contains 287 tests across 45 suites.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No live spread lookup, stochastic or volume-dependent slippage, liquidity, pair-rule rounding, variable sizing, route, persistence, wallet access, execution, or real trading was introduced.

## 2026-09-13 — M6.10 candle-close equity and drawdown completed

### Added

- Ledger-derived equity point for every historical candle close with cash, BTC quantity, fee-adjusted position value, equity, peak, and drawdown.
- Causal application of opening fills before the same candle's closing valuation.
- Separate maximum absolute and percentage drawdown summaries with start, trough, and optional recovery timestamps.
- Exact reconciliation between the final curve point and the M6.9 final equity.
- Four focused tests for no-trade periods, open and closed positions, recovery, fees, and arbitrary precision.
- The full suite now contains 282 tests across 45 suites.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No intracandle path, variable sizing, reinvestment, Sharpe or Sortino ratio, annualization, route, persistence, spread, slippage, liquidity model, wallet access, execution, or real trading was introduced.

## 2026-09-13 — M6.9 simulated capital and total ROI completed

### Added

- Required positive initial USDT capital and deterministic non-negative cash accounting.
- Fee-inclusive buy debits, net sell credits, and explicit counting of buy signals rejected for insufficient capital.
- Final cash, ending position net value, final equity, total net return, and total ROI using precision-40 `decimal.js`.
- Tests for profitable and open-position outcomes, insufficient capital, invalid capital, fees, and deterministic precision.
- The full suite now contains 278 tests across 44 suites.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No borrowing, negative cash, reinvestment, variable sizing, percentage drawdown, intraperiod equity curve, route, persistence, wallet mutation, order execution, or real trading was introduced.

## 2026-09-13 — M6.8 realized PnL curve and drawdown completed

### Added

- Chronological trade-exit curve with trade net PnL, cumulative realized net PnL, running peak, and absolute drawdown.
- Maximum realized drawdown amount with start, trough, and optional recovery timestamps.
- Zero-baseline handling for an initial losing trade and explicit empty results without closed trades.
- Three focused tests covering empty, consecutive-loss, recovery, new-peak, break-even, and arbitrary-precision behavior.
- The full suite now contains 276 tests across 44 suites.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No intraperiod or unrealized equity curve, percentage drawdown, ROI, initial capital, route, persistence, spread, slippage, liquidity model, wallet access, order execution, or real trading was introduced.

## 2026-09-13 — M6.7 closed-trade quality statistics completed

### Added

- Average net PnL per closed trade, average profitable result, and absolute average losing result.
- Net expectancy per closed trade and profit factor based on fee-inclusive simulated outcomes.
- Explicit nullable results when the required sample or denominator does not exist.
- Coverage for empty, mixed, profitable-only, losing-only, break-even, and arbitrary-precision statistics.
- Two focused tests; the full suite now contains 273 tests across 43 suites.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No open-position inclusion in closed-trade statistics, ROI, equity curve, drawdown, Sharpe ratio, annualization, route, persistence, spread, slippage, liquidity model, wallet access, order execution, or real trading was introduced.

## 2026-09-13 — M6.6 ending open-position valuation completed

### Added

- Deterministic final-close valuation for an ending historical open position without creating a synthetic sell.
- Mark time and price, gross market value, estimated exit fee, net liquidation value, and unrealized net PnL.
- Combined total net PnL across realized and unrealized results, with explicit nullable unrealized state when flat.
- Precision-40 `decimal.js` coverage for profitable, losing, absent, and arbitrary-precision ending valuations.
- Four focused tests plus simulator integration coverage; the full suite now contains 271 tests across 43 suites.
- Synchronized backtesting documentation, project context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No synthetic exit, intraperiod equity curve, ROI, drawdown, profit factor, expectancy, route, persistence, spread, slippage, liquidity model, pair-rule enforcement, variable sizing, wallet access, order execution, or real trading was introduced.

## 2026-09-13 — M6.5 aggregate realized performance completed

### Added

- Deterministic performance calculator derived from hypothetical fills and closed trades.
- Fill and closed-trade totals, profitable/losing/break-even counts, and nullable realized win rate.
- Gross profit, absolute gross loss, realized net PnL, and total fees using precision-40 `decimal.js` arithmetic.
- Explicit fee accounting for an ending open entry without introducing unrealized valuation.
- Three focused calculator tests plus simulator integration coverage; the full suite now contains 267 tests across 42 suites.
- Synchronized backtesting documentation, project context, roadmap, plan, map, changelog, and current state.

### Scope boundaries

- No mark-to-market valuation, unrealized PnL, ROI, drawdown, profit factor, expectancy, route, persistence, spread, slippage, liquidity model, pair-rule enforcement, variable sizing, wallet access, order execution, or real trading was introduced.

## 2026-09-13 — M6.4 deterministic long-only simulation completed

### Added

- Historical-only simulator consuming candles and strategy signals through a separate application boundary.
- Causal next-candle-open hypothetical fills, including explicit handling of terminal signals with no future candle.
- Fixed BTC quantity, explicit taker fee rate, exact notionals, entry cost, net exit proceeds, and per-closed-trade net PnL through precision-40 `decimal.js` arithmetic.
- Ordered buy/sell fill ledger, one-position long state, ignored redundant signal counts, and explicit ending open position.
- Historical orchestration that loads candles once and returns replay and simulation results together.
- Eleven focused tests for causality, fee-inclusive PnL, open positions, redundant actions, terminal signals, arbitrary precision, invalid configuration, inconsistent timelines, and orchestration.
- Synchronized backtesting documentation, project context, README status, roadmap, plan, map, decisions, and current state.

### Scope boundaries

- No real or paper order, wallet mutation, executor call, operational Risk Engine call, exchange-account access, route, persistence, aggregate metric, spread, slippage, liquidity model, pair-rule enforcement, variable sizing, or real trading was introduced.

## 2026-09-12 — M6.3 complete historical candle model completed

### Added

- Provider-neutral `HistoricalCandle` model retaining exact OHLC prices, base and quote volumes, taker-buy volumes, trade count, close state, and UTC boundaries.
- Exact `decimal.js` validation for positive prices, non-negative volumes, coherent highs and lows, and arbitrary-precision preservation.
- Explicit full-candle-to-strategy projection so strategies receive only their existing close-price contract.
- Five additional focused tests for complete normalization, precision preservation, invalid price/volume, incoherent high/low data, and projection isolation.
- Synchronized backtesting documentation, project context, README status, roadmap, plan, map, decisions, and current state.

### Scope boundaries

- No trade simulation, next-candle execution, fee, spread, slippage, sizing, PnL, metric, route, persistence, credential, wallet access, or real trading was introduced.

## 2026-09-12 — M6.2 public historical candle loading completed

### Added

- Provider-neutral historical-candle request and provider contracts.
- Public Binance Spot `GET /api/v3/klines` adapter using the configured market-data-only REST host without authentication.
- Mandatory bounded BTC/USDT one-minute requests with a 1–1,000 result limit and maximum 1,000-minute range.
- Ten-second request timeout, caller cancellation, strict 12-field payload validation, range checks, response-size enforcement, and duplicate/out-of-order rejection.
- Open-candle exclusion based on close time and direct internal delegation from historical loading to deterministic M6.1 replay.
- Eleven focused tests across the provider adapter and orchestration service.
- Synchronized backtesting documentation, project context, README status, roadmap, plan, map, decisions, and current state.

### Scope boundaries

- No API route, database migration, historical persistence, pagination across requests, retries, trade/fill simulation, fees, spread, slippage, financial metrics, optimization, wallet access, execution, credentials, or real trading was introduced.

## 2026-09-12 — M6.1 deterministic strategy replay completed

### Added

- Provider-neutral backtesting module and internal replay service for supplied closed BTC/USDT one-minute candles.
- Strict symbol, interval, close-state, timestamp, ordering, and duplicate validation.
- Candle-by-candle evaluation with strategy-declared bounded history and no exposure to future candles.
- Deterministic ordered signal timeline with evaluated period and buy, sell, and hold counts.
- Six focused tests covering empty input, deterministic output, bounded no-lookahead behavior, open candles, out-of-order candles, and duplicates.
- `docs/backtesting.md` and synchronized project status, roadmap, plan, map, decisions, current state, and README.

### Scope boundaries

- No HTTP route, historical-data retrieval or persistence, trade/fill simulation, fees, spread, slippage, PnL, ROI, drawdown, profit factor, expectancy, optimization, wallet access, execution, authenticated exchange integration, or real trading was introduced.

All notable working-tree changes are recorded here. Dates use `YYYY-MM-DD`.

## 2026-09-12 — M5.6 strategy signal persistence completed

### Added

- Additive `strategy_signals` PostgreSQL migrations with precision-preserving decimal average fields, chronological index, and unique strategy/symbol/candle-close identity.
- Provider-neutral signal repository and Prisma adapter for idempotent writes plus recent/latest reads.
- Database-backed E2E coverage for duplicate suppression, ordering, decimal serialization, and both signal endpoints.

### Changed

- Live evaluation now persists every generated signal and logs structured persistence failures.
- Existing recent and latest signal routes now query PostgreSQL and survive restarts without changing their HTTP contracts.
- Exported the process-local candle feed from the market-data module, fixing full NestJS application dependency resolution discovered by E2E validation.
- Synchronized README routes, project context, roadmap, plan, map, strategy documentation, decisions, and current state.

### Scope confirmation

- No cursor pagination, filters, statistics, historical candle storage, backtesting, position sizing, risk assessment, execution integration, new strategy, or real trading was introduced.

## 2026-09-12 — M5.5 recent signal history completed

### Added

- Bounded process-local retention of the latest 100 generated strategy signals.
- Read-only `GET /strategies/signals` history, newest first, with a validated optional limit from 1 through 100 and a default of 50.
- Focused tests for empty history, ordering, latest consistency, requested limits, invalid limits, and oldest-entry eviction.

### Changed

- The existing latest-signal endpoint and live evaluator now share one signal read model, so each evaluation is stored only once.
- Added the recent-signals endpoint to the root README API route table and synchronized project context, roadmap, plan, map, strategy documentation, decisions, and current state.

### Scope confirmation

- No PostgreSQL signal persistence, cursor pagination, filters, statistics, position sizing, risk assessment, execution, backtesting, or real trading was introduced.

## 2026-09-12 — M5.4 configurable moving-average periods completed

### Added

- Validated `STRATEGY_MA_SHORT_PERIOD` and `STRATEGY_MA_LONG_PERIOD` startup configuration with 3/5 defaults, positive-integer constraints, a 1,000 maximum, and strict `short < long` validation.
- Strategy-declared required candle count used by live retention.
- Focused tests for defaults, custom values, invalid relationships, numeric bounds, declared history, and dynamic retention.

### Changed

- The NestJS strategy provider now constructs the moving-average crossover from validated configuration.
- Updated `.env.example`, project context, roadmap, plan, map, strategy documentation, decisions, and current state for M5.4.

### Scope confirmation

- No runtime configuration mutation, route, hot reload, optimization, persistence, position sizing, risk assessment, execution, or real trading was introduced.

## 2026-09-12 — M5.3 latest-signal API completed

### Added

- Process-local latest-strategy-signal read model updated by every successful live evaluation.
- Read-only `GET /strategies/signals/latest` endpoint with explicit HTTP 503 before a signal exists.
- Unit coverage for initial absence, latest-value replacement, live-evaluation integration, and controller responses.

### Changed

- Added the strategy signal endpoint to the root README API route table.
- Updated project context, roadmap, plan, map, strategy documentation, decisions, and current state for M5.3.

### Scope confirmation

- No signal history or persistence, mutation endpoint, position sizing, risk assessment, order execution, dashboard, exchange authentication, or real trading was introduced.

## 2026-09-12 — M5.2 live signal observation completed

### Added

- Process-local provider-neutral candle feed with subscriber isolation.
- Lifecycle-managed live strategy evaluator with a six-candle closed-history bound.
- Structured signal logs and diagnostics for duplicate or out-of-order closed candles.
- Focused tests for publication, subscriber failure, lifecycle, open-candle exclusion, bounded retention, ordering, deduplication, and live crossover generation.

### Changed

- Normalized public candles now enter the internal feed before their existing market-data log.
- Updated project context, roadmap, plan, map, strategy documentation, decisions, and current-state evidence for M5.2.

### Scope confirmation

- No persistence, API route, dashboard, position sizing, Risk Engine call, executor call, exchange authentication, or real trading was introduced.

## 2026-09-12 — API route index documented

### Changed

- Added every existing HTTP method and route to the root README, including parameters, availability conditions, and emergency-stop write requirements.
- Added a permanent project rule requiring the README route table to remain synchronized with controller changes.
- Added API and controller navigation keywords to the project map.

## 2026-09-12 — M5.1 moving-average crossover completed

### Added

- Provider-neutral strategy input, strategy, and signal contracts.
- Deterministic BTC/USDT moving-average crossover over ordered closed one-minute candles with exact decimal averages.
- Focused tests for buy, sell, hold, equality, incomplete candles, insufficient history, ordering, invalid prices, and invalid periods.
- Strategy documentation and project-map navigation.

### Changed

- Registered the isolated strategies module in the modular monolith.
- Marked M4 complete and M5.1 complete across project status and planning documents.

### Scope confirmation

- No strategy was connected to live data, position sizing, the Risk Engine, an executor, persistence, HTTP, dashboard, authenticated exchange access, or real trading.

## 2026-09-12 — M4.11 execution rate limit completed

### Added

- Validated `RISK_MAX_EXECUTIONS_PER_WINDOW` and `RISK_EXECUTION_WINDOW_MS` configuration, defaulting to 10 distinct approved execution keys per 60 seconds.
- Redis-backed atomic fixed-window permits with idempotency-aware duplicate handling and structured permit/rejection diagnostics.
- Unit and Redis-backed E2E coverage for the inclusive limit, concurrent excess, duplicate keys, expiration, replay bypass, and fail-closed errors.

### Changed

- Every newly approved paper buy or sell now obtains a rate-limit permit before PostgreSQL financial mutation.
- Updated project context, roadmap, plan, map, risk documentation, decisions, and current-state evidence for M4.11.

## 2026-09-12 — M4.10 unrealized loss limit completed

### Added

- Validated `RISK_MAX_UNREALIZED_LOSS_USDT` configuration with a default of `25` USDT.
- Provider-neutral risk rejection for new buys at or beyond the existing position's net unrealized-loss boundary.
- Focused tests for the inclusive boundary, smaller loss, profit, sell exemption, rule precedence, candidate integration, and unavailable market data.

### Changed

- New paper buys reuse the fresh best-bid, estimated-exit-fee position valuation before risk approval.
- Updated project context, roadmap, plan, map, risk documentation, decisions, and current-state evidence for M4.10.

## 2026-09-12 — M4.9 authenticated local risk control completed

### Added

- Optional validated `RISK_CONTROL_TOKEN_SHA256` configuration with no credential in examples.
- Fail-closed Bearer guard for emergency-stop writes using in-memory SHA-256 and constant-time comparison.
- Unit and E2E coverage for correct, missing, malformed, incorrect, and unconfigured credentials without token disclosure.

### Changed

- Docker Compose now publishes the API only on host loopback at `127.0.0.1:3000`.

### Scope confirmation

- No authentication dependency, account/session system, migration, order endpoint, dashboard, strategy, exchange credential, or real trading was introduced.

## 2026-09-12 — M4.8 top-of-book participation limit completed

### Added

- Validated `RISK_MAX_TOP_OF_BOOK_PARTICIPATION_RATE` configuration with a default of `0.10`.
- Best-side available quantity carried from each provider-neutral quote into risk assessment.
- Exact buy/sell participation calculation and structured rejection above the inclusive limit.
- Unit coverage for both sides, exact boundary, and precedence; E2E coverage verifies rejection without execution or balance mutation.

### Scope confirmation

- No migration, multi-level order book, partial-fill, market-impact, deeper-slippage, order endpoint, strategy, authenticated integration, or real trading was introduced.

## 2026-09-12 — M4.7 persistent emergency-stop control completed

### Added

- Append-only `risk_control_events` migration and Prisma model.
- Restart-safe emergency-stop state with configuration fallback when no event exists.
- Local `GET /risk/emergency-stop` and idempotent `PUT /risk/emergency-stop` endpoints.
- Required operational reasons, structured state/change logs, replay responses, and conflict detection for reused keys with different payloads.
- Unit and database-backed E2E coverage for fallback, reload, activation, deactivation, idempotency, conflict, precedence, and rejection without financial mutation.

### Scope confirmation

- The control is local and paper-only. No remote authentication, order endpoint, dashboard, strategy, authenticated market integration, or real trading was introduced.

## 2026-09-12 — M4.6 atomic daily-loss enforcement completed

### Added

- PostgreSQL transaction-scoped advisory-lock serialization for paper buys and sells.
- In-transaction reconstruction and enforcement of the current UTC daily realized-loss limit before buy mutation.
- Specific atomic daily-loss error with rollback before any execution or balance effect.
- Database-backed concurrency coverage proving a queued losing sell is visible to the following buy.

### Changed

- The E2E application bootstrap has an explicit 30-second hook timeout for reliable startup on the local resource-constrained environment.

### Scope confirmation

- No migration, persisted aggregate, external order endpoint, strategy, authenticated integration, or real trading was introduced.

## 2026-09-12 — M4.5 daily realized loss limit completed

### Added

- Validated `RISK_MAX_DAILY_REALIZED_LOSS_USDT` configuration with a safe default of `25` USDT.
- Exact current-UTC-day net realized PnL derived from the complete chronological execution history.
- Buy-only rejection at the inclusive daily-loss threshold, while sells and idempotent replays remain available.
- Unit coverage for threshold behavior, profit offsets, UTC rollover, sells, and rule precedence; database-backed E2E coverage verifies rejection without mutation.

### Scope confirmation

- No migration, atomic daily-loss aggregate, unrealized-loss/drawdown rule, stop-loss, order endpoint, strategy, authenticated integration, or real trading was introduced.

## 2026-09-11 — M4.4 atomic BTC exposure enforcement completed

### Added

- Transaction-level conditional BTC credit using the existing configured position limit.
- Specific atomic position-limit error that aborts and rolls back the entire buy transaction.
- Database-backed concurrency coverage proving that only one of two competing buys can consume the same remaining exposure capacity.

### Scope confirmation

- The Risk Engine remains mandatory before persistence. No migration, order endpoint, loss rule, strategy, authenticated integration, or real trading was introduced.

## 2026-09-11 — M4.3 cumulative BTC position limit completed

### Added

- Validated `RISK_MAX_BTC_POSITION_QUANTITY` configuration with a default of `0.01` BTC.
- Exact projected-position assessment for new paper buys using the persisted BTC balance.
- Structured approval/rejection details containing current, projected, and maximum BTC quantities.
- Unit and E2E coverage for the inclusive boundary, above-limit rejection, sell bypass, precedence, and rejection without mutation.

### Scope confirmation

- No external order route, concurrency-safe exposure transaction, loss limit, strategy, authenticated integration, or real trading was introduced.

## 2026-09-11 — M4.2 emergency stop completed

### Added

- Validated `RISK_EMERGENCY_STOP` configuration with a default of `false`.
- Highest-precedence rejection of every new buy or sell while the stop is active.
- Structured `emergency_stop` / `emergency_stop_active` risk decisions.
- Unit and E2E coverage for inactive behavior, buy/sell rejection, rule precedence, and rejection without mutation.

### Scope confirmation

- No control endpoint, persisted stop state, order route, strategy, authenticated integration, or real trading was introduced.

## 2026-09-11 — M4.1 maximum-order-notional risk rule completed

### Added

- Provider-neutral `RiskEngine`, risk candidate, and assessment contracts.
- Configurable `RISK_MAX_ORDER_NOTIONAL_USDT` with a safe default of `100`.
- Buy/sell maximum-notional assessment between quoting and paper repository mutation.
- Structured approval/rejection logs and explicit risk-rejection application error.
- Unit and E2E coverage for exact-boundary approval, above-limit buy/sell rejection, and no mutation on rejection.

### Scope confirmation

- M3 is formally complete at M3.8. No order HTTP route, cumulative exposure, loss limit, strategy, authenticated integration, or real trading was introduced.

## 2026-09-11 — M3.8 realized performance summary completed

### Added

- Shared execution-accounting fold for position and performance read models.
- Profitable, losing, and break-even sell classification using net realized PnL.
- Realized win rate excluding break-even outcomes, plus execution counts, realized PnL, and total fees.
- Read-only `GET /paper-trading/performance` endpoint with unit and E2E coverage.

### Scope confirmation

- No ROI, time-based metrics, drawdown, order mutation, strategy, Risk Engine, authenticated integration, or real trading was introduced.

## 2026-09-11 — M3.7 unrealized position valuation completed

### Added

- Fresh best-bid marking for open BTC paper positions.
- Gross market value, estimated exit fee, net liquidation value, unrealized PnL, total PnL, and market-data timestamp on the position response.
- HTTP 503 diagnostics for unavailable or stale top-of-book data when a position is open.
- Unit and E2E coverage for profitable, losing, empty, unavailable, and stale valuation paths.

### Scope confirmation

- No wallet mutation, order endpoint, deeper-book slippage, performance statistics, strategy, Risk Engine, authenticated integration, or real trading was introduced.

## 2026-09-11 — M3.6 position and realized PnL completed

### Added

- Deterministic BTC position calculator over chronological paper executions.
- Fee-inclusive weighted-average cost basis, average entry price, accumulated fees, and realized PnL.
- Explicit rejection of sells exceeding execution-tracked BTC quantity.
- Read-only `GET /paper-trading/position` endpoint.
- Financial unit coverage for empty and multiple-buy positions, partial profitable sales, full losing closes, fees, and inconsistent history; E2E coverage verifies the HTTP read model.

### Scope confirmation

- No wallet or execution mutation, unrealized PnL, market valuation, ROI, win rate, strategy, Risk Engine, authenticated integration, or real trading was introduced.

## 2026-09-11 — M3.5 read-only execution history completed

### Added

- Bounded repository query for recent paper executions ordered by execution time and ID descending.
- `GET /paper-trading/executions` with a default limit of 50 and validated maximum of 100.
- Buy/sell response discrimination, canonical decimal strings, and ISO UTC quote, market-data, and execution timestamps.
- Unit and E2E coverage for defaults, explicit limits, invalid limits, ordering, bounding, and serialization.

### Scope confirmation

- No order mutation endpoint, deletion, cursor pagination, position/PnL model, deeper slippage, strategy, Risk Engine, authenticated integration, or real trading was introduced.

## 2026-09-11 — M3.4 idempotent paper sell execution completed

### Added

- Sell intents and results in the shared trading-executor contract.
- Additive migration allowing side-specific buy `totalCost` or sell `netProceeds` settlement.
- Atomic sufficient-BTC debit, net-USDT credit, and sell-execution persistence.
- Unit and database-backed E2E coverage for sell execution, replay, balance changes, insufficient BTC, and rollback.
- Structured successful-sell execution logging.

### Changed

- The existing execution repository and mapper now support discriminated buy and sell records while preserving prior buys.

### Scope confirmation

- No HTTP order route, position/PnL model, history query, deeper slippage, strategy, Risk Engine, authenticated integration, or real trading was introduced.

## 2026-09-11 — M3.3 paper market sell quote completed

### Added

- Internal BTC/USDT market-sell quote at the fresh best bid.
- Exact gross notional, simulated taker fee, and net USDT proceeds with 18-decimal half-even rounding.
- Validation for pair status, quantity rules, minimum notional, freshness, and top-level bid liquidity.
- Focused financial, rounding, and rejection-path tests plus structured sell-quote logging.

### Changed

- Synchronized the mandatory project context with the already committed M3.2 implementation.

### Scope confirmation

- No balance inspection or mutation, sell execution, persistence change, HTTP route, position/PnL model, strategy, Risk Engine, authenticated integration, or real trading was introduced.

## 2026-09-11 — M3.2 idempotent paper buy execution completed

### Added

- Shared trading-executor contract and paper-only BTC/USDT buy executor.
- PostgreSQL paper-execution model and additive migration.
- Atomic USDT debit, BTC credit, and execution persistence with insufficient-funds rollback.
- Caller-supplied idempotency keys with safe replay and concurrent duplicate protection.
- Unit and database-backed E2E coverage for execution, replay, balance changes, rollback, and 18-decimal half-even rounding.
- Structured successful-execution and replay logging.

### Scope confirmation

- No HTTP mutation route, sell, position/PnL model, history query, deeper slippage, strategy, Risk Engine, authenticated integration, or real trading was introduced.

## 2026-09-11 — M3.1 paper market buy quote completed

### Added

- Provider-neutral retention of latest BTC/USDT top-of-book and pair metadata.
- Internal BTC market-buy quote at the best ask with exact notional, simulated taker fee, and total cost.
- Configurable fee assumption and market-data freshness limit.
- Validation for availability, freshness, pair status, quantity bounds, step size, minimum notional, and best-ask liquidity.
- Focused financial and rejection-path tests plus structured successful-quote logging.
- M3 paper-trading documentation.

### Scope confirmation

- No execution, balance mutation, HTTP order route, sell, order history, multi-level slippage, PnL, strategy, Risk Engine, authenticated integration, or real trading was introduced.

## 2026-09-11 — M2.5 paper-wallet persistence completed

### Added

- Additive Prisma migration for constrained BTC/USDT paper balances using `DECIMAL(38,18)`.
- Provider-neutral paper-balance repository contract and PostgreSQL/Prisma implementation.
- Idempotent startup seeding that preserves existing balances.
- Atomic SQL credit and sufficient-balance debit operations.
- E2E verification that a persisted balance survives wallet reinitialization, with test cleanup.

### Changed

- Paper-wallet and valuation services now read balances asynchronously from PostgreSQL.
- Supported balance precision is explicit and validated before persistence.
- M2 is now complete; project context, roadmap, current state, decisions, guide, keyword map, plan, and README reflect the boundary.

### Scope confirmation

- No transaction history, mutation endpoint, order, paper execution, BRL conversion, fee, slippage, PnL, strategy, authenticated integration, dashboard, or real trading was introduced.

## 2026-09-11 — M2.4 stale-price protection completed

### Added

- Validated `PAPER_VALUATION_MAX_PRICE_AGE_MS` configuration with a 10-second default.
- Injectable system-clock boundary for deterministic freshness checks.
- Dedicated stale-price error with observed age and configured limit.
- Structured missing/stale valuation warnings.
- Unit and E2E coverage for stale prices and exact freshness boundaries.

### Changed

- `GET /paper-wallet/valuation` now returns HTTP 503 for stale as well as missing prices.
- Project context, roadmap, current state, decisions, paper-wallet guide, keyword map, plan, and examples now reflect M2.4.

### Scope confirmation

- No order, paper execution, persistence, BRL conversion, fee, slippage, PnL, strategy, authenticated integration, dashboard, or real trading was introduced.

## 2026-09-11 — M2.3 read-only portfolio API completed

### Added

- `GET /paper-wallet/balances` for fictional BTC and USDT balances.
- `GET /paper-wallet/valuation` for the latest portfolio value in USDT.
- HTTP 503 mapping when valuation is requested before the first market price.
- Controller unit tests and deterministic E2E coverage for balances, unavailable valuation, and available valuation.

### Changed

- The missing-price state now uses a dedicated application error.
- Project context, roadmap, current state, decisions, paper-wallet guide, keyword map, and plan now reflect M2.3.

### Scope confirmation

- No HTTP mutation, authentication, dashboard, persistence, BRL conversion, order, execution, fee, slippage, PnL, strategy, authenticated integration, or real trading was introduced.

## 2026-09-11 — M2.2 portfolio valuation completed

### Added

- Process-local retention of the latest normalized BTC/USDT ticker.
- Exact BTC value and total portfolio value in USDT.
- Explicit unavailable-price behavior before the first ticker.
- Validation for malformed, zero, and negative market prices.
- Unit coverage for latest-price replacement, ticker integration, zero BTC, exact arithmetic, unavailable price, and invalid prices.

### Changed

- The market-data module exports its provider-neutral latest-price service to the paper-wallet module.
- Project context, roadmap, current state, decisions, paper-wallet guide, keyword map, plan, and README now reflect M2.2.

### Scope confirmation

- No HTTP endpoint, dashboard, BRL conversion, persistence, stale-price policy, order, execution, fee, slippage, PnL, strategy, authenticated integration, or real trading was introduced.

## 2026-09-11 — M2.1 paper wallet core completed

### Added

- Fictional in-memory wallet with BTC and USDT balances.
- Configurable initial USDT balance with a safe default of `1000`; BTC starts at zero.
- Exact decimal balance queries, credits, and debits with insufficient-funds protection.
- Structured initialization and balance-change logs.
- Unit coverage for exact arithmetic, validation, full debits, insufficient funds, and service delegation.
- M2.1 domain and operational documentation.

### Changed

- The application module now initializes the paper-wallet module.
- Project context, roadmap, current state, decisions, keyword map, and README now reflect completion of M1 and M2.1.

### Scope confirmation

- No persistence, HTTP endpoint, valuation, BRL conversion, order, execution, fee, spread/slippage simulation, PnL, strategy, authenticated integration, or real trading was introduced.

## 2026-09-11 — M1.8 Binance public pair metadata completed

### Added

- Public, unauthenticated Binance Spot BTC/USDT exchange-information request at module startup.
- Provider-neutral pair-metadata contract with status, assets, price filter, lot-size filter, and minimum notional.
- HTTPS-only `BINANCE_REST_BASE_URL` configuration with the Binance public-data endpoint as its safe default.
- Ten-second request timeout, strict payload validation, structured logging, and startup failure isolation.
- Unit coverage for both supported notional filters, invalid metadata, endpoint construction, HTTP failure, and lifecycle behavior.
- M1.8 operational and domain documentation.

### Changed

- The market-data module now loads one pair-metadata snapshot independently of the existing live streams.
- Corrected repository-state documentation after M1.7 was committed.

### Scope confirmation

- No dependency, metadata refresh, cache, persistence, order validation, authentication, wallet, strategy, or order execution was introduced.

## 2026-09-11 — M1.7 deterministic spread calculation completed

### Added

- `decimal.js` as the explicit arbitrary-precision strategy for financial arithmetic.
- Provider-neutral `MarketSpread` with absolute spread, midpoint, and spread basis points.
- Deterministic `SpreadCalculator` with precision 40 and half-even rounding to eight basis-point decimal places.
- Structured `market.spread.calculated` logs derived from live top-of-book updates.
- Unit coverage for exact decimal arithmetic, locked and crossed books, and zero midpoint rejection.

### Changed

- The top-of-book lifecycle service now calculates spread after logging each normalized update.
- Updated project context, roadmap, state, decision, operation, and keyword-map documentation for M1.7.

### Scope confirmation

- No new WebSocket, multi-level depth, snapshot, persistence, authentication, wallet, strategy, or order execution was introduced.

## 2026-09-11 — M1.6 Binance public top of book completed

### Added

- Public, unauthenticated Binance Spot `btcusdt@bookTicker` WebSocket client.
- Provider-neutral top-of-book stream contract and `MarketTopOfBook` domain type.
- Best bid and ask prices and quantities, provider update ID, and receipt time.
- Structured `market.top_of_book.received` and `market.top_of_book.reconnect_scheduled` logs.
- Unit coverage for normalization, invalid payloads, delivery, lifecycle, reconnection reset, and shutdown cancellation.
- M1.6 operational and domain documentation.

### Changed

- The market-data module now starts and stops an independent top-of-book stream.
- Corrected repository-state documentation after M1.5 was committed.

### Scope confirmation

- No dependency, spread calculation, multi-level depth, REST snapshot, persistence, authentication, wallet, strategy, or financial behavior was introduced.

## 2026-09-11 — M1.5 candle volume completed

### Added

- Base and quote volume on normalized one-minute candles.
- Taker-buy base and quote volume on normalized one-minute candles.
- Per-candle trade count.
- Normalization and structured logging coverage for all new fields.

### Changed

- `MarketCandle` now carries the already validated volume fields from the Binance kline payload.
- Corrected repository-state documentation after M1.4 was committed.

### Scope confirmation

- No connection, dependency, persistence, aggregation, arithmetic, indicator, order book, spread, authentication, or financial behavior was introduced.

## 2026-09-11 — M1.4 Binance public one-minute candles completed

### Added

- Public, unauthenticated Binance Spot `btcusdt@kline_1m` WebSocket client.
- Provider-neutral candle stream contract and normalized `MarketCandle` domain type.
- OHLC decimal strings, UTC candle boundaries, and candle close state.
- Structured `market.candle.received` and `market.candle.reconnect_scheduled` logs.
- Unit coverage for normalization, close state, invalid payloads, message delivery, lifecycle, reconnection reset, and shutdown cancellation.
- M1.4 operational and domain documentation.

### Changed

- The market-data module now starts and stops independent trade, mini ticker, and one-minute candle streams.
- Corrected repository-state documentation after M1.3 was committed.

### Scope confirmation

- Volume, taker volume, trade IDs, and trade count are validated but not exposed to the domain.
- No dependency, authentication, persistence, historical retrieval, order book, spread, dashboard, wallet, strategy, or financial behavior was introduced.

## 2026-09-11 — M1.3 Binance public mini ticker completed

### Added

- Public, unauthenticated Binance Spot `btcusdt@miniTicker` WebSocket client.
- Provider-neutral ticker stream contract and minimal `MarketTicker` domain type.
- Structured `market.ticker.received` and `market.ticker.reconnect_scheduled` logs.
- Unit coverage for normalization, invalid payloads, message delivery, lifecycle, reconnection reset, and shutdown cancellation.
- M1.3 operational and domain documentation.

### Changed

- The market-data module now starts and stops independent public trade and mini ticker streams.
- Corrected repository-state documentation after M1.2 was committed.

### Scope confirmation

- Binance volume and rolling-window fields are validated but not exposed to the domain.
- No dependency, authentication, persistence, candles, order book, spread, dashboard, wallet, strategy, or financial behavior was introduced.

## 2026-09-11 — M1.2 WebSocket reconnection completed

### Added

- Automatic reconnection after unexpected Binance trade-stream closes.
- Exponential retry delay starting at one second and capped at 30 seconds.
- Structured `market.trade.reconnect_scheduled` logs with attempt and delay.
- Tests for increasing delays, reset after connection, timer cancellation, and shutdown behavior.

### Changed

- Successful WebSocket connections reset the retry sequence.
- Intentional application shutdown cancels pending retries and never opens a replacement socket.
- Corrected stale repository-state documentation after M0 and M1.1 were committed.

### Scope confirmation

- No new dependency, market-data type, persistence, authentication, or financial behavior was introduced.

## 2026-09-11 — M1.1 Binance public trades completed

### Added

- Public, unauthenticated Binance Spot `btcusdt@trade` WebSocket client.
- Provider-neutral trade stream contract and normalized `MarketTrade` domain type.
- Validation of Binance payload shape before it reaches the domain.
- Structured logging for normalized BTC/USDT trades.
- WebSocket shutdown through the NestJS module lifecycle.
- Unit coverage for payload normalization, taker-side mapping, invalid messages, and service lifecycle.
- M1.1 operational and domain documentation.

### Verified

- Eight unit tests across three suites, lint, formatting, and TypeScript build.
- Docker Compose API, PostgreSQL, and Redis health.
- Live public trades received from Binance with price and quantity preserved as decimal strings.

### Scope confirmation

- No authentication, credentials, persistence, ticker, candles, order book, paper trading, strategy, wallet, or order execution was added.

## 2026-09-11 — Documentation baseline

### Added

- Mandatory root project context and documentation index.
- Current-state, roadmap, technical-decisions, and keyword-map documents.
- Documentation workflow rules in `AGENTS.md`.

## 2026-09-11 — M0 bootstrap completed

### Added

- NestJS application with strict TypeScript configuration.
- Validated environment configuration.
- Prisma/PostgreSQL and Redis infrastructure modules.
- Health endpoint with PostgreSQL and Redis checks.
- Redis shutdown lifecycle handling.
- Dockerfile and Docker Compose stack for API, PostgreSQL, and Redis.
- ESLint, Prettier, unit-test, E2E-test, and build configuration.
- Safe environment example, ignore files, and initial README.

### Fixed

- Reconciled an interrupted Prisma installation on version 7.10 and declared the PostgreSQL adapter/driver dependencies.
- Configured Jest for the ESM packages used by NestJS 12.
- Changed the PostgreSQL host mapping to `5433` to avoid conflict with another local project on `5432`.
- Prevented the Redis connection from keeping E2E test processes open after application shutdown.

### Verified

- Build, lint, unit tests, E2E test, Compose configuration, and live health response.

### Security notes

- No Binance API, credentials, wallet, or trading execution was introduced.
- Dependency audit findings were recorded for later review; no forced breaking upgrade was applied.

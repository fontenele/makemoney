# Changelog

All notable working-tree changes are recorded here. Dates use `YYYY-MM-DD`.

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

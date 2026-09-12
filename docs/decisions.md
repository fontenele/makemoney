# Technical Decisions

## Modular monolith

The project remains a single NestJS application. Feature modules and provider boundaries are introduced only when required by an approved milestone.

## PostgreSQL host port 5433

Container-to-container communication uses PostgreSQL's standard port `5432`. Host access uses `5433` because another local project already binds `5432`.

## Prisma 7.10 with PostgreSQL adapter

Prisma CLI, client, and adapter are aligned on version 7.10. PostgreSQL is accessed through `@prisma/adapter-pg` and `pg`.

## NestJS 12 and Jest ESM execution

NestJS 12 packages use ESM. Jest runs through Node with `--experimental-vm-modules`, and ts-jest emits ES modules for tests.

## Financial and provider boundaries

External market providers must be encapsulated. Domain objects must not expose provider payload shapes. Strategies will produce signals, the Risk Engine will assess them, and only an executor may eventually submit an order. No executor exists in M0 or M1.1.

## M3.2 atomic and idempotent paper execution

The provider-neutral `TradingExecutor` contract is implemented only by `PaperTradingExecutor`. M3.2 supports a fixed BTC/USDT buy intent and requires a caller-supplied idempotency key. No real executor or authenticated provider is present.

The PostgreSQL repository performs the sufficient-USDT debit, BTC credit, and execution insert in one transaction. The execution ID is the idempotency key. A uniqueness conflict from a concurrent duplicate rolls its transaction back and returns the already committed execution, so balances change at most once.

Paper balances and executions use `DECIMAL(38,18)`. Quote values are validated to at most 18 fractional digits and calculated values are rounded half-even to the same scale before the transaction, keeping the returned execution and persisted balance mutation consistent.

## M3.3 non-executing market-sell quote

M3.3 mirrors the established buy-quote boundary without widening the executor. A BTC quantity is priced against the fresh best bid and its available top-level quantity. The returned USDT proceeds are gross notional minus the configured simulated taker fee.

The service deliberately does not read the paper wallet or execute a sale. This keeps quote validity dependent only on current public market data and pair rules; sufficient BTC and atomic balance mutation belong to a separately approved sell-execution increment.

## M3.4 side-specific paper execution settlement

The shared executor uses discriminated buy and sell intents. The execution record retains common price, quantity, notional, and fee fields while enforcing exactly one settlement amount: `totalCost` for a buy or `netProceeds` for a sell. This additive migration preserves every existing buy.

Sell execution uses the same transaction and idempotency guarantees as buying. It conditionally debits sufficient BTC, credits net USDT proceeds, and inserts the sell record atomically. A duplicate key rolls its attempted transaction back before replaying the committed result.

## M3.5 bounded read-only execution history

The first execution-history API is intentionally bounded rather than cursor-paginated. It returns the newest 50 records by default, accepts 1 through 100, and uses execution time plus ID as deterministic descending order. Cursor pagination is deferred until history volume or a client requires it.

The read model exposes all three audit timestamps and side-specific settlement values. It never exposes a write operation; internal execution remains unavailable over HTTP.

## M3.6 derived weighted-average paper position

Position state is derived on demand from immutable executions instead of adding another mutable table. The personal/local workload is currently small enough to favor replayable correctness; incremental persistence can be introduced later with concrete scale evidence.

Buy fees are part of acquisition cost. A sell allocates the current weighted-average cost to its quantity, and realized PnL is net proceeds after sell fee minus that allocated cost. Wallet BTC without a corresponding buy execution has no defensible cost basis, so inconsistent sell history is rejected rather than assigned an invented value.

## M3.7 net best-bid position valuation

An open paper position is marked at the normalized best bid because that is the immediately relevant side for a hypothetical sale. Unrealized PnL uses estimated net liquidation proceeds after the configured taker fee, keeping both entry and hypothetical exit fees in the economic result.

The valuation reuses the quote freshness limit and rejects unavailable or stale top-of-book data for open positions. A zero position does not depend on market data. This level-one mark is explicit rather than pretending to model deeper-book liquidity or slippage.

## M3.8 sell-execution performance outcomes

The first performance summary reuses the position accounting fold so weighted cost allocation and realized PnL have one implementation. Each sell execution is classified by its net realized PnL as profitable, losing, or break-even; partial sells therefore remain separate outcomes.

Win rate excludes break-even outcomes and is null without a decided outcome. It is exposed as a decimal ratio rounded half-even to eight fractional places. ROI and time-series metrics are deferred because they require an explicit capital-flow and period model.

## M1.1 raw trade stream

M1.1 uses the Binance Spot raw stream `wss://stream.binance.com:9443/ws/btcusdt@trade`, as documented by the official Binance WebSocket Market Streams reference on 2026-09-11. It requires no authentication.

The provider payload is validated and translated at the infrastructure boundary. Price and quantity remain decimal strings to avoid premature floating-point arithmetic. Binance's buyer-maker flag maps to the internal taker side: buyer maker means `sell`; otherwise `buy`.

The `ws` package is the explicit WebSocket transport.

## M1.2 bounded WebSocket reconnection

Unexpected trade-stream closes use exponential backoff starting at one second and capped at 30 seconds. A successful connection resets the retry count. This handles ordinary network interruption and Binance's documented connection lifetime without creating rapid retry loops.

The client owns at most one socket and one reconnect timer. Shutdown marks the client as stopping before closing resources, so close/error events cannot create a new connection. Jitter, application-level heartbeat detection, and circuit breakers are deferred until operational evidence requires them.

## M1.3 public mini ticker

M1.3 uses the Binance Spot raw stream `wss://stream.binance.com:9443/ws/btcusdt@miniTicker`. It is public, requires no credentials, and publishes rolling 24-hour mini ticker updates approximately once per second.

The provider payload is fully validated at the infrastructure boundary, including fields not yet needed by the domain. The internal `MarketTicker` intentionally exposes only provider, symbol, latest price, event time, and receipt time. Volume and rolling-window price statistics remain deferred rather than expanding M1.3.

The ticker has its own provider-neutral stream contract and lifecycle service. Its WebSocket uses the same bounded reconnection policy established in M1.2. A separate socket keeps the existing trade contract stable; connection consolidation is deferred until the number of approved streams makes it concretely useful.

## M1.4 public one-minute candles

M1.4 uses the Binance Spot raw stream `wss://stream.binance.com:9443/ws/btcusdt@kline_1m`. It is public, requires no credentials, and updates the active UTC one-minute candle approximately every two seconds.

The internal `MarketCandle` exposes OHLC decimal strings, the fixed `1m` interval, open and close timestamps, the provider close-state indicator, event time, and receipt time. The provider's volume, taker volume, trade IDs, and trade count are validated at the boundary but remain outside the domain until an approved volume increment.

The candle stream uses its own provider-neutral contract, lifecycle service, socket, and the bounded reconnection policy established in M1.2. M1.4 provides live updates only; historical retrieval and persistence remain deferred.

## M1.5 candle volume

M1.5 enriches `MarketCandle` from the existing Binance kline payload instead of adding a connection or provider request. It exposes base volume, quote volume, taker-buy base volume, and taker-buy quote volume as decimal strings, preserving provider precision without native floating-point conversion. Trade count is a validated non-negative safe integer.

The fields represent the current state of the active candle and may change on each update until `isClosed` becomes true. No accumulation, conversion, ratio, indicator, or historical aggregation is performed in M1.5.

## M1.6 public top of book

M1.6 uses the Binance Spot raw stream `wss://stream.binance.com:9443/ws/btcusdt@bookTicker`. It is public, requires no credentials, and emits changes to the best bid or ask in real time.

The internal `MarketTopOfBook` contains the provider, normalized symbol, provider update ID, best bid price and quantity, best ask price and quantity, and receipt time. Update IDs are strings; all prices and quantities remain decimal strings.

This increment intentionally represents only level one of the book. It does not calculate spread, reconstruct depth, request REST snapshots, or persist updates. The stream has its own provider-neutral contract, lifecycle service, socket, and bounded reconnection policy.

## M1.7 deterministic spread calculation

M1.7 derives spread metrics from each M1.6 top-of-book update without opening another connection. Monetary arithmetic uses a local `decimal.js` constructor configured with precision 40 and half-even rounding; native JavaScript floating-point arithmetic is not used.

Absolute spread is `ask - bid`, midpoint is `(ask + bid) / 2`, and spread basis points are `(absolute spread / midpoint) * 10000`. Absolute spread and midpoint are canonical decimal strings. Basis points are rounded to exactly eight decimal places. Crossed books (`ask < bid`) and non-positive midpoints are rejected; a locked positive book produces zero spread.

## M1.8 public pair metadata

M1.8 uses the public Binance Spot `GET /api/v3/exchangeInfo?symbol=BTCUSDT` endpoint through the public-data base URL `https://data-api.binance.vision`. The application uses Node 24's native `fetch` with a ten-second timeout, so no HTTP dependency is added.

The provider boundary validates the BTC/USDT identity, status, `PRICE_FILTER`, `LOT_SIZE`, and minimum notional from either `MIN_NOTIONAL` or `NOTIONAL`. Financial values remain decimal strings. One snapshot starts loading during module initialization without blocking application startup; failure is logged, and shutdown aborts an in-flight request. Refresh, caching, persistence, and enforcement are deferred.

## M2.1 in-memory paper wallet

The first wallet increment is a fictional process-local domain object supporting only BTC and USDT. Its USDT opening balance comes from `PAPER_INITIAL_USDT_BALANCE` with a safe default of `1000`; BTC starts at zero. Restarting the application resets both balances, because persistence is deliberately deferred.

Balances and amounts are decimal strings. Arithmetic uses a cloned `decimal.js` constructor with precision 40 and half-even rounding, consistent with the project's financial-arithmetic rule. Credits and debits must be strictly positive, and insufficient debits fail before state changes. The application service adds structured audit-oriented logs for initialization and successful mutations.

There is no HTTP API, portfolio conversion, order model, fee, spread, slippage, PnL, exchange account, or real-fund access in M2.1.

## M2.2 latest-price portfolio valuation

The market-data module owns a process-local `LatestMarketPriceService`. `PublicTickerService` updates it only with normalized `MarketTicker` values, so paper-wallet code does not depend on Binance payloads or clients. The service is exported as the narrow cross-module dependency used by portfolio valuation.

The portfolio value is quoted only in USDT: `USDT balance + (BTC balance × latest BTC/USDT price)`. The same precision-40, half-even `decimal.js` strategy is used, and results remain canonical decimal strings. Before the first ticker, valuation fails explicitly rather than returning a misleading partial total. Price persistence, staleness rules, and BRL conversion are deferred; read-only HTTP exposure follows in M2.3.

## M2.3 read-only portfolio HTTP API

The local API exposes `GET /paper-wallet/balances` and `GET /paper-wallet/valuation`. The controller delegates to existing application services and exposes provider-neutral representations. Only the explicit missing-price domain condition maps to HTTP 503; unexpected errors are not hidden.

No balance mutation route exists. Authentication, persistence, dashboard concerns, and trading actions remain outside M2.3.

## M2.4 stale-price protection

Portfolio valuation accepts a ticker only while its receipt age is at most `PAPER_VALUATION_MAX_PRICE_AGE_MS`, defaulting to 10,000 milliseconds. Age is based on local `receivedAt`, avoiding dependence on provider clock skew. Future receipt timestamps clamp to age zero.

Time enters the valuation service through a small `Clock` port backed by `SystemClock`, allowing exact boundary tests. Missing and stale prices remain distinct application errors but both map to HTTP 503. Structured warnings record the reason and, for stale prices, the observed age and configured limit.

## M2.5 PostgreSQL paper balances

PostgreSQL is the source of truth for paper balances. `paper_balances` stores one constrained row per supported asset with `DECIMAL(38,18)` amounts. Startup uses insert-if-missing semantics, so configured defaults seed a new database without overwriting existing balances.

The domain exposes a `PaperBalanceRepository` contract; its Prisma implementation contains persistence details. Credit and debit use single atomic SQL updates. Debit includes the sufficient-balance condition in the update itself, preventing negative balances and lost-update races. The database also enforces supported assets and non-negative amounts. No transaction-history table is introduced in M2.5.

The local Compose API runs `prisma migrate deploy` before NestJS starts, ensuring a new PostgreSQL volume receives committed migrations without an interactive development migration command.

## M3.1 non-executing market-buy quote

Market data retains the latest normalized top of book and pair metadata in provider-neutral services. The paper-trading module consumes those views without depending on Binance transports or payloads.

A BTC quantity is quoted at the best ask only when the book is fresh, the pair status is `TRADING`, quantity satisfies minimum, maximum, and step-size rules, notional reaches the public minimum, and best-ask quantity is sufficient. `PAPER_TAKER_FEE_RATE` defaults to `0.001` as an explicit simulation assumption. Exact decimal calculation produces notional, fee, and total cost without wallet mutation. Multi-level fills, execution, and account-specific fees are deferred.

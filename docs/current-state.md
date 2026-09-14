# Current State

Last validated: 2026-09-14

## Milestone status

M7.1 is complete: the application loads one public provider-neutral Binance Spot/USDT symbol catalog at startup and retains it in memory as a future detection baseline. It does not yet claim that any observed symbol is newly listed.

M7.2 persists each successful catalog observation transactionally, preserving first observation time while updating latest observation time and current provider state.

M7.3 compares a current observation with the durable provider baseline in one serializable transaction. The first population is baseline-only; later previously unseen symbols are retained in memory as newly observed.

M0 through M6 are complete. M1 provides unauthenticated public BTC/USDT market data. M2 provides a fictional, PostgreSQL-backed wallet and valuation. M3 provides internal paper trading and performance measurement. M4 adds independent pre-execution safeguards. M5 provides a configurable deterministic moving-average crossover, live observation, PostgreSQL signal persistence, and read-only access to its latest and recent signals. M6 provides deterministic no-lookahead replay, resilient durable historical loading, explicit stored-only replay, gap-aware cache reuse, local replay and simulation APIs, idempotent simulation-run persistence, retrieval, cursor pagination, inclusive creation-time filtering, and explicit single-run deletion, capital-constrained simulation, explicit fill costs, precision, order and causal volume-participation constraints, candle-close equity, drawdown, ROI, trade statistics, and temporal exposure measurement. Its database-backed E2E suite is isolated from local application data. No dashboard, order mutation endpoint, strategy execution, authenticated exchange integration, or real order execution exists.

## Implemented application

- M7.1 loads a strictly validated, deterministically ordered public Binance Spot/USDT symbol catalog at startup and retains it in memory as a provider-neutral baseline.
- M7.2 persists immutable first-observation time and mutable latest provider state for each provider/symbol identity.
- M7.3 detects only symbols absent from an established durable baseline and retains the latest detection result in memory.

- NestJS 12 application using TypeScript strict mode.
- Startup configuration validation for `NODE_ENV`, `PORT`, `DATABASE_URL`, and `REDIS_URL`.
- PostgreSQL access through Prisma 7.10 and the PostgreSQL driver adapter.
- Redis client with explicit shutdown lifecycle handling.
- `GET /health` checks the API, PostgreSQL, and Redis.
- Docker Compose services for the API, PostgreSQL 17, and Redis 8.
- The Compose API applies pending Prisma migrations before starting.
- ESLint, Prettier, Jest unit tests, Jest E2E tests, and TypeScript build scripts.
- Safe `.env.example`; local `.env` files and generated/build artifacts are ignored by Git.
- Public Binance Spot `btcusdt@trade` WebSocket consumption through the `ws` transport.
- Provider-neutral `MarketTrade` normalization with decimal price and quantity preserved as strings.
- Structured trade logging and clean WebSocket shutdown through NestJS lifecycle hooks.
- Unexpected WebSocket closes trigger exponential retry delays from 1 second up to a 30-second cap; a successful connection resets the delay.
- Public Binance Spot `btcusdt@miniTicker` WebSocket consumption with provider-neutral latest-price normalization.
- Mini ticker volume and rolling-window fields are validated at the Binance boundary but are not exposed to the domain in M1.3.
- Public Binance Spot `btcusdt@kline_1m` WebSocket consumption with provider-neutral OHLC, candle boundaries, and close-state normalization.
- One-minute candles expose base, quote, taker-buy base, and taker-buy quote volumes as decimal strings, plus trade count. Trade IDs remain provider-boundary details.
- Public Binance Spot `btcusdt@bookTicker` WebSocket consumption with provider-neutral best bid and ask prices and quantities.
- Top-of-book update IDs are strings and financial values remain decimal strings.
- Each valid, non-crossed, positive-midpoint top of book produces absolute spread, midpoint, and spread in basis points through `decimal.js`; results remain decimal strings and basis points use eight decimal places with half-even rounding.
- Public Binance Spot exchange information supplies BTC/USDT status, assets, price filter, lot-size filter, and minimum notional once at startup through a provider-neutral metadata contract.
- Pair metadata requests use Node's native `fetch`, a ten-second timeout, strict boundary validation, non-blocking startup, and shutdown cancellation.
- In-memory paper wallet with `BTC` and `USDT` balances, configurable initial USDT (default `1000`), and initial BTC of `0`.
- Exact `decimal.js` credit and debit operations, positive-amount validation, and insufficient-funds rejection without partial mutation.
- Structured wallet initialization and successful balance-change logs.
- Process-local retention of the latest normalized BTC/USDT ticker for downstream read models.
- Exact USDT portfolio valuation from BTC and USDT balances, with explicit failure before a price is available.
- Read-only `GET /paper-wallet/balances` and `GET /paper-wallet/valuation` routes; valuation maps the unavailable-price state to HTTP 503.
- Configurable ten-second price-freshness limit; stale valuation returns HTTP 503 and emits structured age diagnostics.
- PostgreSQL-backed BTC/USDT balances with idempotent initial seeding and atomic decimal credit/debit operations behind a repository contract.
- Provider-neutral latest top-of-book and pair-metadata retention for downstream paper quotes.
- Internal BTC market-buy quote with exact notional, simulated taker fee, total cost, freshness, pair-rule, and best-ask-liquidity validation.
- Shared trading-executor contract with a paper-only BTC/USDT market-buy implementation.
- PostgreSQL paper-execution records and atomic USDT debit, BTC credit, and execution insertion.
- Caller-supplied idempotency keys replay the persisted result without a second balance mutation.
- Financial values are limited and half-even rounded to the database's 18-decimal scale before persistence.
- Internal BTC market-sell quote with exact gross notional, simulated taker fee, net proceeds, freshness, pair-rule, and best-bid-liquidity validation.
- Idempotent paper sells atomically debit BTC, credit net USDT proceeds, and persist the execution in PostgreSQL.
- Persisted executions use side-specific settlement fields: `totalCost` for buys and `netProceeds` for sells.
- Bounded `GET /paper-trading/executions` returns the newest 50 executions by default and accepts a `limit` from 1 through 100.
- Execution history exposes quote, market-data receipt, and execution timestamps in UTC, with financial values preserved as decimal strings.
- `GET /paper-trading/position` derives tracked BTC quantity, fee-inclusive cost basis, weighted-average entry price, realized PnL, and accumulated fees from all executions.
- Position accounting rejects an execution history that sells more BTC than prior tracked buys.
- Open BTC positions are valued at a fresh best bid with estimated exit fee, net liquidation value, unrealized PnL, and total PnL; unavailable or stale market data returns HTTP 503.
- Empty positions expose zero valuation fields without depending on live market data.
- `GET /paper-trading/performance` reports execution and net sell-outcome counts, realized win rate, realized PnL, and total execution fees from the shared accounting fold.
- Every new paper execution is independently assessed against `RISK_MAX_ORDER_NOTIONAL_USDT` after quoting and before repository mutation; the default maximum gross notional is `100` USDT.
- Risk approvals and rejections emit structured decisions, and rejection leaves balances and execution history unchanged.
- `RISK_EMERGENCY_STOP` defaults to false; when true it rejects every new paper execution before candidate validation and other risk rules.
- New paper buys read the persisted BTC balance and reject a projected position above `RISK_MAX_BTC_POSITION_QUANTITY`, which defaults to `0.01`; sells bypass this exposure-increasing rule.
- The buy transaction conditionally credits BTC only when the resulting persisted balance remains within the same limit, preventing concurrent buys from collectively exceeding it and rolling back all effects on failure.
- `RISK_MAX_DAILY_REALIZED_LOSS_USDT` defaults to `25`; new buys are rejected once net realized PnL from current-UTC-day sells reaches or exceeds that loss, while sells and idempotent replays remain available.
- Daily realized PnL replays the full chronological execution history for correct fee-inclusive cost basis and uses exact decimal arithmetic; profitable sells offset losing sells within the day.
- Paper buy and sell transactions share a PostgreSQL advisory lock; each buy repeats the daily-loss calculation inside the serialized transaction before any persistence or balance mutation.
- Append-only emergency-stop events persist active state, reason, idempotency key, and change time; the latest event is restored at startup and overrides the configuration fallback.
- Local `GET /risk/emergency-stop` and `PUT /risk/emergency-stop` expose status and idempotent paper-only control, including HTTP 409 for conflicting key reuse.
- Every quote carries its best-side available quantity; `RISK_MAX_TOP_OF_BOOK_PARTICIPATION_RATE` defaults to `0.10` and rejects larger buy or sell participation before persistence.
- Emergency-stop writes require a Bearer token matching optional `RISK_CONTROL_TOKEN_SHA256`; absent configuration disables writes, and the raw token is never stored or logged.
- Compose publishes API port 3000 only on host loopback.
- `RISK_MAX_UNREALIZED_LOSS_USDT` defaults to `25`; a new buy is rejected when the existing open position's net unrealized PnL reaches that negative boundary, while sells and replays remain available.
- Unrealized-loss assessment reuses the fresh best-bid position valuation, including estimated exit fees; missing or stale market data for an open position fails before execution mutation.
- Distinct approved paper execution keys share an atomic Redis fixed-window limit of 10 per 60 seconds by default; duplicates share a slot, persisted replays bypass it, and Redis failure blocks new mutation.
- A provider-neutral strategy contract accepts ordered one-minute candle projections and returns deterministic buy, sell, or hold signals without submitting orders.
- The M5.1 moving-average crossover uses only closed candles, exact decimal averages, explicit equality semantics, and defaults to 3/5 periods.
- Normalized candles are distributed through an in-process feed whose subscriber failures are isolated from the market-data stream.
- M5.2 retains six closed candles, evaluates once per new close, suppresses duplicate/out-of-order closes, and emits structured signals only to application logs.
- The latest generated strategy signal is retained in memory and exposed at `GET /strategies/signals/latest`; absence maps explicitly to HTTP 503.
- Moving-average periods are startup-configurable through validated positive integers with 3/5 defaults, a maximum of 1,000, and `short < long`; live retention follows the strategy's declared requirement.
- `GET /strategies/signals` returns persisted signals newest first with an optional `limit` from 1 through 100 and a default of 50.
- Generated signals persist idempotently in PostgreSQL by strategy, symbol, and candle close time; recent and latest reads survive application restarts.
- Strategy averages use database decimal columns and persistence failures produce structured errors without invoking any trading behavior.
- An internal provider-neutral replay service validates supplied closed BTC/USDT one-minute candles and evaluates the configured strategy once per candle.
- Replay uses only the current and prior bounded history, sets evaluation time to the candle close, and returns a deterministic ordered signal timeline with buy, sell, and hold counts.
- M6.1 does not retrieve or persist historical candles, expose an HTTP route, simulate trades or fills, calculate financial performance, or access an executor.
- A provider-neutral historical source loads one bounded public Binance Spot BTC/USDT one-minute range through `GET /api/v3/klines` without credentials.
- Historical requests are capped at 10,000 candles and 10,000 minutes; the Binance adapter loads sequential pages of at most 1,000 and stops on an empty or partial page.
- Every historical page retains strict payload, range, OHLCV, ordering, open-candle, timeout, and cancellation validation, and the accumulated result remains bounded by the caller's total limit.
- Each historical page has at most three attempts for network, HTTP 429, or HTTP 5xx failures, with cancelable bounded backoff or `Retry-After`; permanent HTTP 4xx and invalid successful payloads fail immediately.
- Three exhausted transient historical pages open a process-local 30-second circuit; open calls fail before HTTP and only one half-open recovery probe may run.
- Completely loaded closed-candle batches persist transactionally in PostgreSQL before replay or simulation, with exact textual decimals, idempotent composite identities, and rollback on conflicting content.
- Stored-only replay and simulation query validated PostgreSQL candles chronologically within bounded ranges and never call Binance, infer completeness, or fill gaps.
- Standard historical replay and simulation query PostgreSQL first and bypass Binance plus write-through when every expected minute-aligned candle identity is present.
- Incomplete cache coverage is now split into contiguous minute gaps loaded sequentially; stored and fetched candles reach replay only after complete merged coverage, and fetched gaps persist in one transaction.
- Local `POST /backtesting/replay` accepts a strict bounded UTC range and exposes deterministic signal replay while retaining fixed BTC/USDT one-minute identity and no financial execution access.
- Local `POST /backtesting/simulate` validates every explicit fictional financial assumption before historical loading and exposes the complete deterministic simulation result without mutating operational financial state.
- Local `POST /backtesting/runs` requires an idempotency key and persists the complete normalized request and serialized simulation result as an immutable PostgreSQL JSON snapshot. Identical replay returns the original UUID and creation time without recalculation; conflicting key reuse returns HTTP 409.
- Read-only `GET /backtesting/runs/:id` retrieves one immutable snapshot by UUID without recalculation or market-data access and exposes explicit invalid, absent, and unavailable states.
- Read-only `GET /backtesting/runs` returns immutable snapshots newest first with a validated limit from 1 through 100, a default of 50, optional UUID cursor pagination, and optional inclusive canonical UTC `createdFrom`/`createdTo` filters, without recalculation or market-data access.
- `DELETE /backtesting/runs/:id` explicitly removes one stored simulation snapshot by UUID while preserving historical candles and all paper or real financial state.
- Three exhausted transient historical-page failures open a process-local circuit for 30 seconds; it fails fast while open and permits one concurrent half-open recovery probe before closing or reopening.
- Candles whose close time has not passed are excluded, and the historical orchestration service delegates the remaining normalized projections directly to deterministic replay.
- M6.2 adds no route, persistence, pagination, retry policy, trade simulation, financial metric, wallet access, or execution.
- Historical candles retain exact OHLC prices, base and quote volumes, taker-buy volumes, trade count, close state, and UTC boundaries in a provider-neutral model.
- Historical price and volume coherence is validated through `decimal.js`; values are never converted to native floating point and arbitrary decimal precision is preserved.
- Historical replay explicitly projects only the strategy fields, while full candles remain available for a future separately approved execution model.
- Historical simulation consumes signals separately and creates hypothetical fills only at the following candle open, preserving an inspectable no-lookahead delay.
- The first simulator models one fixed-quantity long position, explicit taker fees, fee-inclusive entry cost, net exit proceeds, per-trade net PnL, ignored redundant signals, terminal unfilled signals, and an explicit ending position.
- Simulation arithmetic uses precision-40 `decimal.js`; the simulator creates no order and cannot reach a wallet, executor, operational Risk Engine, or exchange account.
- Every simulation now includes deterministic fill and closed-trade counts, profitable/losing/break-even counts, nullable realized win rate, gross profit, absolute gross loss, realized net PnL, and total fill fees.
- Performance metrics use precision-40 `decimal.js`, and fees from an ending open entry are counted.
- An ending open position is valued at the final historical candle close with an estimated exit fee, net liquidation value, unrealized net PnL, and combined total net PnL; no synthetic exit is recorded.
- Closed-trade performance includes average net PnL, average winning and losing results, expectancy, and profit factor with explicit null states for missing statistical samples.
- Closed trades produce a chronological cumulative realized PnL curve and maximum absolute realized drawdown with explicit start, trough, and observed recovery timestamps.
- Historical simulation requires positive initial USDT capital, maintains non-negative cash, rejects unaffordable buys, and exposes final equity, total net return, and ROI.
- Every historical candle close now has a fee-adjusted equity point reconstructed from the fill ledger, with separate maximum absolute and percentage drawdown summaries and final-equity reconciliation.
- Historical fills retain the next-candle open as their reference price and apply half the explicit full spread plus explicit slippage adversely to effective buy and sell prices; all downstream fees, capital, PnL, ROI, and equity use those effective prices.
- Historical simulations expose tested-period duration, each closed-trade holding duration, total time in market, exposure rate, and average closed-trade holding duration; an ending open position is measured through the final candle close.
- Historical simulations require explicit provider-neutral minimum/maximum quantity, step-size, and minimum-notional rules; invalid fixed quantity fails early and below-minimum potential fills remain unfilled with dedicated accounting.
- Historical execution rules now include tick size; post-impact buys round upward and sells downward, while fills retain reference, adjusted, and executable prices and every downstream financial calculation uses the executable value.
- Historical execution rules include an inclusive minimum/maximum executable-price range; out-of-range potential fills preserve financial state and are counted separately before minimum-notional evaluation.
- Historical simulation requires a positive maximum volume-participation rate no greater than one and limits each all-or-none fill using only the fully closed signal candle's base volume, never the following execution candle's volume.
- Liquidity-rejected signals preserve cash or the open position and increment `liquidityUnfilledSignalCount`; accepted fills expose the reference candle close, base volume, and calculated maximum quantity.

## Local endpoints and ports

- API: `http://localhost:3000` (Compose host-loopback only)
- Health: `http://localhost:3000/health`
- Paper balances: `http://localhost:3000/paper-wallet/balances`
- Paper valuation: `http://localhost:3000/paper-wallet/valuation`
- Paper execution history: `http://localhost:3000/paper-trading/executions`
- Paper position: `http://localhost:3000/paper-trading/position`
- Paper performance: `http://localhost:3000/paper-trading/performance`
- Emergency-stop status/control: `http://localhost:3000/risk/emergency-stop`
- Latest strategy signal: `http://localhost:3000/strategies/signals/latest`
- Recent strategy signals: `http://localhost:3000/strategies/signals`
- Historical signal replay: `POST http://localhost:3000/backtesting/replay`
- Historical fictional simulation: `POST http://localhost:3000/backtesting/simulate`
- Persisted historical simulation run: `POST http://localhost:3000/backtesting/runs`
- Stored historical simulation run: `GET http://localhost:3000/backtesting/runs/:id`
- Delete stored historical simulation run: `DELETE http://localhost:3000/backtesting/runs/:id`
- Recent stored historical simulation runs: `GET http://localhost:3000/backtesting/runs`
- PostgreSQL host port: `5433` mapped to container port `5432`
- Redis host port: `6379`

PostgreSQL uses `5433` because another local Docker project already occupies `5432`.

## Verification evidence

The following passed on 2026-09-14 after M7.3:

- `npm run build`
- `npm run lint`
- `npm run format:check`
- `npm test -- --runInBand` — 413 tests passed across 58 suites
- `docker compose config --quiet`
- `git diff --check`

The complete database-backed integration validation passed after E2E isolation:

- `$env:RISK_MAX_BTC_POSITION_QUANTITY='1'; npm run test:e2e -- --runInBand` — all 42 tests passed across 4 suites in the disposable `crypto_trader_e2e` schema.
- The E2E global setup recreates and migrates only its dedicated schema; local application balances, executions, controls, signals, candles, and runs are not read or changed.
- `npx prisma migrate deploy` — all nine migrations applied, including durable Spot symbol observations
- Live `GET /health` — API, PostgreSQL, and Redis reported `up`
- Live Binance integrations — received normalized BTC/USDT public trades, mini tickers, one-minute candles, top-of-book updates, calculated spreads, and pair metadata without credentials
- Live Binance historical-candle smoke test — the public market-data-only kline endpoint returned ordered BTCUSDT one-minute rows with the documented 12 fields and no credentials
- Live paper wallet initialization — reported BTC `0` and USDT `1000` from the default configuration
- Live read-only API — balances returned BTC `0`/USDT `1000`; valuation first returned 503 before a ticker and then 200 with the live BTC/USDT price
- Database-backed M3.2 integration — one buy mutated both balances once, replay preserved them, cleanup restored them, and an unaffordable buy left no execution or balance change
- Database-backed M3.4 integration — one sell mutated both balances once, replay preserved them, cleanup restored them, and a sell without BTC left no execution or balance change

## Repository state

M0 through M7.3 are committed milestone increments.

## Known issues and cautions

- The local `.env` currently sets `RISK_MAX_BTC_POSITION_QUANTITY=0.01`, which the existing canonical positive-decimal validator rejects. Complete E2E validation used a process-only value of `1`; the local file was not modified and application startup will require correcting that local setting.
- Jest requires Node's `--experimental-vm-modules` flag because NestJS 12 packages are ESM.
- The Docker build reported eight high-severity findings in the dependency audit. They have not been automatically changed because `npm audit fix --force` may introduce breaking upgrades; review them separately.
- A transitive Angular DevKit package recommends Node `24.15.0` or newer while the machine has Node `24.14.1`. Current build, lint, and tests pass, but a Node 24 LTS patch update is advisable.
- The advisory lock is global to the single local paper portfolio. Multiple portfolios may eventually require partitioned lock keys, but no such abstraction is needed yet.

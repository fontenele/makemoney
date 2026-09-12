# Current State

Last validated: 2026-09-12

## Milestone status

M0 through M3 are complete and M4.1–M4.10 are complete. M1 provides unauthenticated public BTC/USDT market data. M2 provides a fictional, PostgreSQL-backed wallet and valuation. M3 provides internal buy/sell quoting, idempotent paper execution, read-only history, position valuation, and realized performance measurement. M4 adds independent pre-execution limits, atomic exposure/daily-loss enforcement, persistent emergency-stop control, conservative liquidity participation, authenticated local control writes, and unrealized-loss protection for new buys. No dashboard, order mutation endpoint, strategy, authenticated exchange integration, or real order execution exists.

## Implemented application

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

## Local endpoints and ports

- API: `http://localhost:3000` (Compose host-loopback only)
- Health: `http://localhost:3000/health`
- Paper balances: `http://localhost:3000/paper-wallet/balances`
- Paper valuation: `http://localhost:3000/paper-wallet/valuation`
- Paper execution history: `http://localhost:3000/paper-trading/executions`
- Paper position: `http://localhost:3000/paper-trading/position`
- Paper performance: `http://localhost:3000/paper-trading/performance`
- Emergency-stop status/control: `http://localhost:3000/risk/emergency-stop`
- PostgreSQL host port: `5433` mapped to container port `5432`
- Redis host port: `6379`

PostgreSQL uses `5433` because another local Docker project already occupies `5432`.

## Verification evidence

The following passed on 2026-09-12 after M4.10:

- `npm run build`
- `npm run lint`
- `npm test -- --runInBand` — 187 tests passed across 30 suites
- `npm run test:e2e -- --runInBand` — 22 tests passed, including unrealized-loss rejection, authenticated/fail-closed emergency-stop control, and the prior liquidity, risk, history, performance, valuation, insufficient-funds, and concurrency scenarios
- `npx prisma migrate deploy` — all four migrations applied, including `risk_control_events`
- `docker compose config --quiet`
- Live `GET /health` — API, PostgreSQL, and Redis reported `up`
- Live Binance integrations — received normalized BTC/USDT public trades, mini tickers, one-minute candles, top-of-book updates, calculated spreads, and pair metadata without credentials
- Live paper wallet initialization — reported BTC `0` and USDT `1000` from the default configuration
- Live read-only API — balances returned BTC `0`/USDT `1000`; valuation first returned 503 before a ticker and then 200 with the live BTC/USDT price
- Database-backed M3.2 integration — one buy mutated both balances once, replay preserved them, cleanup restored them, and an unaffordable buy left no execution or balance change
- Database-backed M3.4 integration — one sell mutated both balances once, replay preserved them, cleanup restored them, and a sell without BTC left no execution or balance change

## Repository state

M0 through M4.9 are committed. M4.10 changes are currently in the working tree.

## Known issues and cautions

- Jest requires Node's `--experimental-vm-modules` flag because NestJS 12 packages are ESM.
- The Docker build reported eight high-severity findings in the dependency audit. They have not been automatically changed because `npm audit fix --force` may introduce breaking upgrades; review them separately.
- A transitive Angular DevKit package recommends Node `24.15.0` or newer while the machine has Node `24.14.1`. Current build, lint, and tests pass, but a Node 24 LTS patch update is advisable.
- The advisory lock is global to the single local paper portfolio. Multiple portfolios may eventually require partitioned lock keys, but no such abstraction is needed yet.

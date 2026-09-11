# Current State

Last validated: 2026-09-11

## Milestone status

M0 through M3.5 are complete in the working tree. M1 provides unauthenticated public BTC/USDT market data. M2 provides a fictional, PostgreSQL-backed wallet and valuation. M3 provides internal buy/sell quoting, idempotent paper execution, and read-only execution history. No dashboard, order mutation endpoint, position/PnL model, strategy, authenticated integration, or real order execution exists.

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

## Local endpoints and ports

- API: `http://localhost:3000`
- Health: `http://localhost:3000/health`
- Paper balances: `http://localhost:3000/paper-wallet/balances`
- Paper valuation: `http://localhost:3000/paper-wallet/valuation`
- Paper execution history: `http://localhost:3000/paper-trading/executions`
- PostgreSQL host port: `5433` mapped to container port `5432`
- Redis host port: `6379`

PostgreSQL uses `5433` because another local Docker project already occupies `5432`.

## Verification evidence

The following passed on 2026-09-11 after M3.5:

- `npm run build`
- `npm run lint`
- `npm test -- --runInBand` — 124 tests passed across 22 suites
- `npm run test:e2e -- --runInBand` — 12 tests passed, including bounded buy/sell history and invalid-limit rejection
- `npx prisma migrate deploy` — paper-sell execution migration applied successfully
- `docker compose config --quiet`
- Live `GET /health` — API, PostgreSQL, and Redis reported `up`
- Live Binance integrations — received normalized BTC/USDT public trades, mini tickers, one-minute candles, top-of-book updates, calculated spreads, and pair metadata without credentials
- Live paper wallet initialization — reported BTC `0` and USDT `1000` from the default configuration
- Live read-only API — balances returned BTC `0`/USDT `1000`; valuation first returned 503 before a ticker and then 200 with the live BTC/USDT price
- Database-backed M3.2 integration — one buy mutated both balances once, replay preserved them, cleanup restored them, and an unaffordable buy left no execution or balance change
- Database-backed M3.4 integration — one sell mutated both balances once, replay preserved them, cleanup restored them, and a sell without BTC left no execution or balance change

## Repository state

M0 through M3.4 are committed. M3.5 changes are currently in the working tree.

## Known issues and cautions

- Jest requires Node's `--experimental-vm-modules` flag because NestJS 12 packages are ESM.
- The Docker build reported eight high-severity findings in the dependency audit. They have not been automatically changed because `npm audit fix --force` may introduce breaking upgrades; review them separately.
- A transitive Angular DevKit package recommends Node `24.15.0` or newer while the machine has Node `24.14.1`. Current build, lint, and tests pass, but a Node 24 LTS patch update is advisable.

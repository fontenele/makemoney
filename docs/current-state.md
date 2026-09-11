# Current State

Last validated: 2026-09-11

## Milestone status

M0 through M1.7 are complete in the working tree. Binance integrations are limited to unauthenticated public BTC/USDT trade, mini ticker, one-minute candle, and top-of-book streams with bounded automatic reconnection. The application calculates deterministic spread metrics from each valid top-of-book update. No dashboard, market-data persistence, paper-trading logic, strategy, wallet integration, or order execution exists.

## Implemented application

- NestJS 12 application using TypeScript strict mode.
- Startup configuration validation for `NODE_ENV`, `PORT`, `DATABASE_URL`, and `REDIS_URL`.
- PostgreSQL access through Prisma 7.10 and the PostgreSQL driver adapter.
- Redis client with explicit shutdown lifecycle handling.
- `GET /health` checks the API, PostgreSQL, and Redis.
- Docker Compose services for the API, PostgreSQL 17, and Redis 8.
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

## Local endpoints and ports

- API: `http://localhost:3000`
- Health: `http://localhost:3000/health`
- PostgreSQL host port: `5433` mapped to container port `5432`
- Redis host port: `6379`

PostgreSQL uses `5433` because another local Docker project already occupies `5432`.

## Verification evidence

The following passed on 2026-09-11 after M1.7:

- `npm run build`
- `npm run lint`
- `npm test -- --runInBand` — 51 tests passed across 10 suites
- `npm run test:e2e -- --runInBand` — 1 test passed with local test environment variables
- `docker compose config --quiet`
- Live `GET /health` — API, PostgreSQL, and Redis reported `up`
- Live Binance connections — received normalized BTC/USDT public trades, mini tickers, one-minute candles, top-of-book updates, and calculated spreads without credentials

## Repository state

M0 through M1.6 are committed and synchronized with `origin/main`. M1.7 changes are currently in the working tree. The Compose stack is running locally.

## Known issues and cautions

- Jest requires Node's `--experimental-vm-modules` flag because NestJS 12 packages are ESM.
- The Docker build reported eight high-severity findings in the dependency audit. They have not been automatically changed because `npm audit fix --force` may introduce breaking upgrades; review them separately.
- A transitive Angular DevKit package recommends Node `24.15.0` or newer while the machine has Node `24.14.1`. Current build, lint, and tests pass, but a Node 24 LTS patch update is advisable.

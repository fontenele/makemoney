# Crypto Trader

Local, personal platform for crypto market research, realistic paper trading, and strategy validation. M0 through M5 and M6.1–M6.22 are complete. Market feeds and bounded historical candles are public and unauthenticated; historical candles, capital, fills, equity, statistics, and balances are fictional or research-only, with no exchange-account or real-fund access.

Project context, current state, roadmap, and change history are indexed in [`docs/README.md`](docs/README.md).

## Safety boundaries

- No futures, margin, leverage, or automated withdrawals.
- No secrets or wallet credentials belong in this repository.
- Real trading is out of scope until M10 and will require explicit confirmation plus independent safeguards.

## Requirements

- Node.js 24 LTS
- npm 11+
- Docker with Compose

On Windows PowerShell installations that block `npm.ps1`, use `npm.cmd` without changing the machine execution policy.

## Local development

```bash
cp .env.example .env
npm install
npm run prisma:generate
npx prisma migrate deploy
npm run start:dev
```

PostgreSQL and Redis must be reachable using the URLs in `.env`.

## Docker Compose

Start Docker Desktop (or another Docker daemon), then run. The API container applies pending Prisma migrations before starting:

```bash
docker compose up --build
```

Verify the complete stack at `http://localhost:3000/health`. A healthy response reports the API, PostgreSQL, and Redis as `up`.

The API connects to public Binance BTC/USDT trade, mini ticker, one-minute candle, and top-of-book streams, loads public pair metadata, and writes normalized events to its logs:

```bash
docker compose logs -f api
```

## API routes

Local base URL: `http://localhost:3000`. Docker Compose publishes it on host loopback only.

| Method | Route | Purpose | Access and parameters |
| --- | --- | --- | --- |
| `GET` | `/health` | API, PostgreSQL, and Redis health | Local, read-only |
| `GET` | `/paper-wallet/balances` | Current fictional BTC and USDT balances | Local, read-only |
| `GET` | `/paper-wallet/valuation` | Fictional portfolio valuation in USDT | Local, read-only; returns `503` without a fresh market price |
| `GET` | `/paper-trading/executions` | Recent fictional executions, newest first | Local, read-only; optional `limit=1..100`, default `50` |
| `GET` | `/paper-trading/position` | BTC position, cost basis, fees, and PnL | Local, read-only; an open position requires fresh top-of-book data |
| `GET` | `/paper-trading/performance` | Realized paper-trading performance summary | Local, read-only |
| `GET` | `/risk/emergency-stop` | Current emergency-stop state | Local, read-only |
| `PUT` | `/risk/emergency-stop` | Change the paper-trading emergency stop | Requires configured Bearer token, `Idempotency-Key`, and JSON `{ "active": boolean, "reason": string }` |
| `GET` | `/strategies/signals` | Recent persisted moving-average crossover signals, newest first | Local, read-only; optional `limit=1..100`, default `50` |
| `GET` | `/strategies/signals/latest` | Latest persisted moving-average crossover signal | Local, read-only; returns `503` before the first persisted evaluation |

There are no public balance-mutation, order-submission, strategy-mutation, dashboard, exchange-account, or real-trading routes.

## Quality checks

```bash
npm run format:check
npm run lint
npm test
npm run build
docker compose config
```

## Minimal structure

- `src/config`: validated runtime configuration
- `src/infrastructure`: PostgreSQL/Prisma and Redis adapters
- `src/modules`: feature modules introduced milestone by milestone
- `prisma`: database schema and future migrations
- `test`: end-to-end tests

Paper balances, strategy signals, and loaded historical candles persist across restarts; the latest live market data and valuation remain process-local.

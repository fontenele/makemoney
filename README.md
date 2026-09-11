# Crypto Trader

Local, personal platform for crypto market research, realistic paper trading, and strategy validation. The project has completed **M1 — Market Data**, **M2.1 — Paper Wallet Core**, and **M2.2 — Portfolio Valuation**. Market feeds are public and unauthenticated; the wallet and valuation are fictional and in memory, with no exchange-account or real-fund access.

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
npm run start:dev
```

PostgreSQL and Redis must be reachable using the URLs in `.env`.

## Docker Compose

Start Docker Desktop (or another Docker daemon), then run:

```bash
docker compose up --build
```

Verify the complete stack at `http://localhost:3000/health`. A healthy response reports the API, PostgreSQL, and Redis as `up`.

The API connects to public Binance BTC/USDT trade, mini ticker, one-minute candle, and top-of-book streams, loads public pair metadata, and writes normalized events to its logs:

```bash
docker compose logs -f api
```

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

The paper wallet, latest price, and USDT valuation are process-local and reset at startup. They do not expose an HTTP endpoint or submit orders.

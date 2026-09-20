# Crypto Trader

Local, personal platform for crypto market research, realistic paper trading, and strategy validation. M0 through M6 and M7.1–M7.27 are complete. Market feeds and bounded historical candles are public and unauthenticated; historical candles, capital, fills, equity, statistics, and balances are fictional or research-only, with no exchange-account or real-fund access.

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
| `GET` | `/new-listings` | Recently detected post-baseline Spot/USDT symbols, newest first | Local, read-only; optional `limit=1..100` (default `50`), `provider:symbol` cursor, canonical UTC `detectedFrom`/`detectedTo`, `provider=binance`, uppercase `status`, and `spotTradingAllowed=true\|false`; returns an empty array when none exist |
| `GET` | `/new-listings/summary` | Aggregate detected-symbol coverage and current-state composition | Local, read-only; accepts the same time, provider, status, and Spot-availability filters as `/new-listings`; returns count, first/last detection times, status counts, and Spot-availability counts |
| `GET` | `/new-listings/performance` | Aggregate checkpoint price performance for a recent durable detection cohort | Local, read-only; optional `limit=1..100` (default `50`) and `provider=binance`; includes only detections with completed `T+0` and reports independent checkpoint sample coverage |
| `GET` | `/new-listings/activity` | Average rolling-window market activity by checkpoint for a recent durable detection cohort | Local, read-only; optional `limit=1..100` (default `50`) and `provider=binance`; reports exact base-volume, quote-volume, and trade-count averages and does not represent executable liquidity |
| `GET` | `/new-listings/top-of-book` | Average top-of-book spread and displayed quote notional by checkpoint for a recent durable detection cohort | Local, read-only; optional `limit=1..100` (default `50`) and `provider=binance`; includes only detections with stored `T+0` books and reports independent checkpoint samples; displayed level-one notional is not depth or guaranteed executable liquidity |
| `GET` | `/new-listings/classification` | Aggregate pump/correction classification statistics for a recent durable detection cohort | Local, read-only; optional `limit=1..100` (default `50`) and `provider=binance`; requires positive decimal `pumpReturnRate` and `correctionFromPeakRate` (the latter at most `1`); includes only detections with completed `T+0` |
| `GET` | `/new-listings/classification/magnitudes` | Median observed pump-peak and correction magnitudes for a recent durable detection cohort | Local, read-only; optional `limit=1..100` (default `50`) and `provider=binance`; requires positive decimal `pumpReturnRate` and `correctionFromPeakRate` (the latter at most `1`); reports independent pump and correction sample sizes |
| `GET` | `/new-listings/classification/timing` | Median observed time to pump and peak-to-correction duration for a recent durable detection cohort | Local, read-only; optional `limit=1..100` (default `50`) and `provider=binance`; requires positive decimal `pumpReturnRate` and `correctionFromPeakRate` (the latter at most `1`); reports independent pump and correction sample sizes |
| `GET` | `/new-listings/:provider/:symbol/observations` | Completed checkpoint market observations for one detected symbol, oldest target first | Local, read-only; `provider` is `binance`, `symbol` is canonical uppercase alphanumeric with 1–30 characters; returns `400` for invalid identity, `404` for an unknown detection, and an empty array when no checkpoint is complete |
| `GET` | `/new-listings/:provider/:symbol/top-of-book` | Stored checkpoint top-of-book snapshots for one detected symbol, canonical schedule order | Local, read-only; validates the same identity as the observation timeline, returns `404` for an unknown detection and an empty array when no book snapshot is stored; does not trigger collection |
| `GET` | `/new-listings/:provider/:symbol/performance` | Exact checkpoint price performance relative to the detected symbol's `T+0` sample | Local, read-only; validates the same identity as the observation timeline, returns `404` for an unknown detection and `503` until `T+0` is complete |
| `GET` | `/new-listings/:provider/:symbol/classification` | Observed pump/correction classification for one durable detection | Local, read-only; requires positive decimal `pumpReturnRate` and `correctionFromPeakRate` (the latter at most `1`); returns `404` for an unknown detection and `503` until `T+0` is complete |
| `POST` | `/backtesting/replay` | Run deterministic BTC/USDT one-minute historical signal replay | Local, research-only; JSON body `{ "startTime": UTC ISO string, "endTime": UTC ISO string, "limit": 1..10000 }`; may cache public candles; returns `400` for invalid input and `503` when unavailable |
| `POST` | `/backtesting/simulate` | Run complete fictional BTC/USDT historical simulation | Local, research-only; replay fields plus mandatory `configuration` containing decimal-string `quantity`, `feeRate`, `spreadRate`, `slippageRate`, `maximumVolumeParticipationRate`, `initialCapitalUsdt`, and complete `executionRules`; returns `400` for invalid input and `503` when unavailable |
| `POST` | `/backtesting/runs` | Run and persist an immutable fictional simulation snapshot | Same body as `/backtesting/simulate`; requires `Idempotency-Key`; identical replay returns the stored run, conflicting reuse returns `409`, and operational failure returns `503` |
| `GET` | `/backtesting/runs` | Filtered, cursor-paginated immutable simulation snapshots | Local, read-only; optional `limit=1..100`, UUID `cursor`, and inclusive UTC `createdFrom`/`createdTo`; returns `400` for invalid parameters and `503` when unavailable |
| `GET` | `/backtesting/runs/:id` | Retrieve one immutable fictional simulation snapshot | Local, read-only; UUID path parameter; returns `400` for an invalid UUID, `404` when absent, and `503` when unavailable |
| `DELETE` | `/backtesting/runs/:id` | Delete one stored fictional simulation snapshot | Local, destructive; UUID path parameter; returns `204` when deleted, `400` for an invalid UUID, `404` when absent, and `503` when unavailable; historical candles are preserved |

There are no public balance-mutation, order-submission, strategy-mutation, dashboard, exchange-account, or real-trading routes.

## Quality checks

```bash
npm run format:check
npm run lint
npm test
npm run build
docker compose config
```

E2E tests recreate and migrate the dedicated PostgreSQL schema `crypto_trader_e2e`; they do not use or reset records in the application's configured schema.

## Minimal structure

- `src/config`: validated runtime configuration
- `src/infrastructure`: PostgreSQL/Prisma and Redis adapters
- `src/modules`: feature modules introduced milestone by milestone
- `prisma`: database schema and future migrations
- `test`: end-to-end tests

Paper balances, strategy signals, and loaded historical candles persist across restarts; the latest live market data and valuation remain process-local.

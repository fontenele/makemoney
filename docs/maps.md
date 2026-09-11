# Project Map

Use this keyword map to locate context before changing code. Read the listed documentation and files for the relevant keyword.

| Keywords | Start here | Current code |
| --- | --- | --- |
| context, scope, safety, rules | `../PROJECT_CONTEXT.md`, `../AGENTS.md` | — |
| current status, verification, known issues | `current-state.md`, `CHANGELOG.md` | — |
| milestones, next work, M1, M2, M2.1, M2.2, M2.3, original plan | `roadmap.md`, `plan.md`, `../PROJECT_CONTEXT.md` | — |
| decisions, ports, ESM, Prisma | `decisions.md` | `../package.json`, `../tsconfig.json`, `../compose.yaml` |
| bootstrap, NestJS, modules | `current-state.md` | `../src/main.ts`, `../src/app.module.ts` |
| configuration, environment, secrets | `../AGENTS.md`, `current-state.md` | `../src/config/environment.ts`, `../.env.example` |
| PostgreSQL, Prisma, database | `decisions.md` | `../prisma/schema.prisma`, `../prisma.config.ts`, `../src/infrastructure/database` |
| Redis, cache, lifecycle | `current-state.md` | `../src/infrastructure/redis` |
| health, readiness | `current-state.md` | `../src/modules/health`, `../test/app.e2e-spec.ts` |
| Docker, Compose, containers | `current-state.md`, `decisions.md` | `../Dockerfile`, `../compose.yaml` |
| tests, Jest, E2E, lint, formatting | `current-state.md`, `decisions.md` | `../package.json`, `../eslint.config.mjs`, `../test` |
| Binance, REST, exchange info, pair metadata, filters, tick size, step size, minimum notional, WebSocket, reconnect, backoff, public trades, mini ticker, candle, kline, OHLC, volume, trade count, book ticker, top of book, bid, ask, spread, midpoint, basis points, bps, decimal.js, latest price, BTC/USDT | `binance-public-trades.md`, `binance-public-ticker.md`, `binance-public-candles.md`, `binance-public-top-of-book.md`, `binance-pair-metadata.md`, `decisions.md`, `roadmap.md` | `../src/modules/market-data` |
| dashboard, Vue, frontend | `roadmap.md` | Not implemented; M8 |
| paper wallet, portfolio API, balances endpoint, valuation endpoint, portfolio valuation, latest market price, virtual balance, BTC balance, USDT balance, credit, debit, insufficient funds, decimal.js | `paper-wallet.md`, `decisions.md`, `roadmap.md` | `../src/modules/paper-wallet`, `../src/modules/market-data/application/latest-market-price.service.ts`, `../src/config/environment.ts` |
| paper trading, orders, portfolio valuation, PnL, fees, slippage | `roadmap.md`, `../AGENTS.md`, `paper-wallet.md` | Not implemented; later M2 increments and M3 |
| risk, limits, emergency stop | `roadmap.md`, `../AGENTS.md` | Not implemented; M4 and later safety increments |
| strategies, signals, backtest | `roadmap.md`, `../AGENTS.md` | Not implemented; M5–M6 |
| Polymarket | `roadmap.md`, `../AGENTS.md` | Not implemented; M9 |
| Agentic Wallet, real trading, orders | `roadmap.md`, `../AGENTS.md` | Not implemented; M10 |

## Before every task

1. Read `../AGENTS.md` and `../PROJECT_CONTEXT.md` completely.
2. Find the task keywords in this map.
3. Read the linked current-state, roadmap, and decision sections.
4. Inspect the real working tree; documentation may lag until the current task updates it.
5. Confirm the active milestone boundary before implementing.

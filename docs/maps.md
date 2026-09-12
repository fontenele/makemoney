# Project Map

Use this keyword map to locate context before changing code. Read the listed documentation and files for the relevant keyword.

| Keywords | Start here | Current code |
| --- | --- | --- |
| context, scope, safety, rules | `../PROJECT_CONTEXT.md`, `../AGENTS.md` | — |
| current status, verification, known issues | `current-state.md`, `CHANGELOG.md` | — |
| milestones, next work, M1, M2, M3, M3.1, M3.2, M3.3, M3.4, M3.5, M3.6, M3.7, M3.8, M4, M4.1, M4.2, M4.3, M4.4, original plan | `roadmap.md`, `plan.md`, `../PROJECT_CONTEXT.md` | — |
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
| paper wallet, paper balance repository, persistence, atomic balance, portfolio API, balances endpoint, valuation endpoint, portfolio valuation, stale price, freshness, max price age, clock, latest market price, virtual balance, BTC balance, USDT balance, credit, debit, insufficient funds, decimal.js | `paper-wallet.md`, `decisions.md`, `roadmap.md` | `../src/modules/paper-wallet`, `../prisma/schema.prisma`, `../src/modules/market-data/application/latest-market-price.service.ts`, `../src/config/environment.ts` |
| paper trading, buy quote, sell quote, buy execution, sell execution, execution history, position, performance, win rate, profitable sell, losing sell, break-even sell, cost basis, average entry price, realized PnL, unrealized PnL, total PnL, mark price, net liquidation value, estimated exit fee, total fees, executions endpoint, performance endpoint, best bid, net proceeds, paper execution, trading executor, idempotency, execution persistence, atomic balances, ask price, taker fee, minimum notional, step size, liquidity, quote rejection | `paper-trading.md`, `roadmap.md`, `decisions.md`, `../AGENTS.md` | `../src/modules/paper-trading`, `../prisma/schema.prisma`, `../src/modules/market-data/application/latest-top-of-book.service.ts`, `../src/modules/market-data/application/latest-pair-metadata.service.ts` |
| time-based performance, ROI, drawdown, profit factor, expectancy, order mutation API, cursor pagination, deeper slippage | `paper-trading.md`, `roadmap.md`, `../AGENTS.md` | Not implemented; later M3 increments |
| risk, Risk Engine, risk assessment, maximum order notional, max notional, emergency stop, kill switch, cumulative BTC position, atomic exposure, concurrency-safe exposure, position quantity, order candidate, approval, rejection, RISK_MAX_ORDER_NOTIONAL_USDT, RISK_EMERGENCY_STOP, RISK_MAX_BTC_POSITION_QUANTITY | `risk-engine.md`, `roadmap.md`, `decisions.md`, `../AGENTS.md` | `../src/modules/risk-engine`, `../src/modules/paper-trading/application/paper-trading.executor.ts`, `../src/modules/paper-trading/infrastructure/prisma-paper-execution.repository.ts`, `../src/config/environment.ts` |
| loss limit, daily loss, persistent stop, operator control | `risk-engine.md`, `roadmap.md`, `../AGENTS.md` | Not implemented; later M4 increments |
| strategies, signals, backtest | `roadmap.md`, `../AGENTS.md` | Not implemented; M5–M6 |
| Polymarket | `roadmap.md`, `../AGENTS.md` | Not implemented; M9 |
| Agentic Wallet, real trading, orders | `roadmap.md`, `../AGENTS.md` | Not implemented; M10 |

## Before every task

1. Read `../AGENTS.md` and `../PROJECT_CONTEXT.md` completely.
2. Find the task keywords in this map.
3. Read the linked current-state, roadmap, and decision sections.
4. Inspect the real working tree; documentation may lag until the current task updates it.
5. Confirm the active milestone boundary before implementing.

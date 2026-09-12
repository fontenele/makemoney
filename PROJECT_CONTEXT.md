# Project Context

This file is the mandatory starting point for work on Crypto Trader. Read it together with `AGENTS.md` and `docs/maps.md` before making changes.

## Purpose

Crypto Trader is a personal, local platform for collecting cryptocurrency market data, realistic paper trading, deterministic strategy research, backtesting, and risk-controlled experimentation. The initial goal is trustworthy data and simulation, not profit.

## Current position

- Completed milestones: **M0 — Bootstrap**, **M1 — Market Data**, **M2 — Paper Wallet**, **M3 — Paper Trading**, **M4 — Risk Engine**, and **M5.1 — deterministic moving-average crossover strategy**.
- No next increment is approved. Stop and present a minimal plan before further strategy work.
- The application is a modular NestJS monolith backed by PostgreSQL, Redis, and Prisma.
- The local API health endpoint is `http://localhost:3000/health`.
- PostgreSQL is exposed on host port `5433` because port `5432` is occupied by another local project.

## Immediate boundary

The current market-data scope receives BTC/USDT public trade, mini ticker, one-minute candle, and top-of-book events from Binance WebSocket and loads public pair metadata from Binance REST. It requires no authentication and normalizes provider data into internal domain representations.

M2.1 adds an in-memory fictional wallet for BTC and USDT with configurable initial USDT, exact decimal credit/debit operations, balance queries, and insufficient-funds protection.

M2.2 retains the latest normalized BTC/USDT ticker in memory and values the fictional BTC and USDT balances in USDT with exact decimal arithmetic.

M2.3 exposes balances and valuation through local read-only HTTP endpoints. No wallet mutation is exposed.

M2.4 rejects valuation when the latest ticker is older than the configured freshness limit, which defaults to ten seconds.

M2.5 persists BTC and USDT paper balances in PostgreSQL with idempotent initialization and atomic decimal mutations.

M3.1 calculates internal BTC market-buy quotes from fresh best-ask data, pair rules, liquidity, and a configurable simulated taker fee. It does not execute or mutate balances.

M3.2 persists idempotent internal paper buys and mutates BTC/USDT balances atomically. M3.3 calculates BTC sell quotes from the fresh best bid, including simulated fees and net proceeds. M3.4 persists idempotent paper sells and atomically debits BTC while crediting net USDT proceeds.

M3.5 exposes a bounded, read-only list of recent buy and sell executions at `GET /paper-trading/executions`.

M3.6 derives the BTC position, fee-inclusive weighted-average cost, total fees, and realized PnL from the complete execution history at `GET /paper-trading/position`.

M3.7 values an open position at the latest fresh best bid, subtracts the estimated taker fee, and exposes gross market value, net liquidation value, unrealized PnL, and total PnL through the same read-only endpoint.

M3.8 exposes execution counts, net profitable/losing/break-even sell counts, realized win rate, realized PnL, and total execution fees at `GET /paper-trading/performance`.

M4.1 routes every new internal paper execution through an independent risk assessment and rejects quoted gross notionals above the configured safe limit before persistence or balance mutation.

M4.2 adds a configuration-based emergency stop that takes precedence over other risk checks and rejects all new internal paper executions while active.

M4.3 rejects new paper buys whose current BTC balance plus quoted buy quantity would exceed the configured BTC position limit. Sells remain subject to the preceding rules but bypass this exposure-increasing check.

M4.4 enforces the same BTC position limit again in the PostgreSQL balance update, so concurrent buys cannot collectively exceed it and a losing transaction rolls back every financial effect.

M4.5 derives the current UTC day's net realized PnL from the complete execution history and rejects new paper buys once the configured realized-loss limit is reached. Sells and idempotent replays remain available.

M4.6 serializes paper buy and sell transactions with a PostgreSQL advisory lock and repeats the daily realized-loss check inside the buy transaction, closing the concurrent sell/buy snapshot gap without a schema change.

M4.7 persists idempotent, append-only emergency-stop changes and exposes local status/control endpoints. The latest event survives restarts and takes precedence over the configuration fallback.

M4.8 limits each new paper order to a configurable share of the best bid or ask quantity used by its quote, defaulting to ten percent and rejecting before financial mutation.

M4.9 restricts the Compose API port to host loopback and protects emergency-stop writes with a fail-closed Bearer-token guard configured only by a SHA-256 digest. The raw token is never stored or logged.

M4.10 rejects new paper buys when the existing open BTC position's net unrealized PnL reaches the configured loss limit. It reuses fresh best-bid valuation including the estimated exit fee; sells and idempotent replays remain available.

M4.11 atomically limits distinct approved paper-execution keys in an ephemeral Redis fixed window. Persisted replays and concurrent duplicate keys do not consume another slot, and Redis failure blocks new execution before financial mutation.

M5.1 defines a provider-neutral strategy contract and a deterministic BTC/USDT moving-average crossover. It evaluates only ordered closed one-minute candles with exact decimal arithmetic and returns buy, sell, or hold without submitting orders.

Historical market data, live strategy orchestration, signal persistence, position sizing, BRL conversion, order mutation APIs, deeper slippage, ROI and time-based performance statistics, authenticated APIs, and real execution remain unimplemented and require separately approved milestones.

## Non-negotiable safety

- Never request or store wallet recovery material, private keys, passwords, or API secrets.
- Never submit a real financial transaction without explicit confirmation immediately before the first real order.
- Futures, margin, leverage, and automated withdrawals remain disabled.
- Binance Agentic Wallet remains disconnected and at zero balance during early development.

## Documentation navigation

- `docs/maps.md`: keyword and subsystem navigation map.
- `docs/current-state.md`: evidence-based implementation and environment status.
- `docs/roadmap.md`: milestone scope and completion state.
- `docs/plan.md`: original product plan with a synchronized current-status summary.
- `docs/CHANGELOG.md`: chronological record of meaningful changes.
- `docs/decisions.md`: durable technical decisions and their reasons.
- `docs/binance-public-trades.md`: M1.1 stream contract and operation.
- `docs/binance-public-ticker.md`: M1.3 stream contract and operation.
- `docs/binance-public-candles.md`: M1.4–M1.5 candle and volume contract and operation.
- `docs/binance-public-top-of-book.md`: M1.6–M1.7 best bid/ask and spread contract and operation.
- `docs/binance-pair-metadata.md`: M1.8 public BTC/USDT trading-rule metadata.
- `docs/paper-wallet.md`: M2.1 fictional wallet configuration and domain behavior.
- `docs/paper-trading.md`: M3 paper quote and future execution boundaries.
- `docs/risk-engine.md`: M4 risk-assessment contract, rules, and execution boundary.
- `docs/strategies.md`: M5.1 strategy contract, crossover semantics, and isolation boundary.

# Project Context

This file is the mandatory starting point for work on Crypto Trader. Read it together with `AGENTS.md` and `docs/maps.md` before making changes.

## Purpose

Crypto Trader is a personal, local platform for collecting cryptocurrency market data, realistic paper trading, deterministic strategy research, backtesting, and risk-controlled experimentation. The initial goal is trustworthy data and simulation, not profit.

## Current position

- Completed milestones: **M0 — Bootstrap**, **M1 — Market Data (M1.1 through M1.8)**, **M2 — Paper Wallet (M2.1 through M2.5)**, **M3 — Paper Trading (M3.1 through M3.8)**, and **M4.1–M4.2 — maximum-order-notional and emergency-stop risk rules**.
- No next increment is approved. Stop and present a minimal plan before starting more wallet or trading work.
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

Historical market data, BRL conversion, order mutation APIs, deeper slippage, ROI and time-based performance statistics, strategies, authenticated APIs, and real execution remain unimplemented and require separately approved milestones.

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

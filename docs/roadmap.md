# Roadmap

Implementation is incremental. A milestone starts only after the preceding scope is verified and the user approves the next plan.

## M0 — Bootstrap — complete

NestJS bootstrap, validated configuration, lint/format tooling, tests, Docker Compose, PostgreSQL, Redis, Prisma, health checks, and initial documentation.

## M1 — Market Data — complete

- **M1.1 — complete:** Binance public BTC/USDT trades over WebSocket, normalized into the internal domain model. No authentication.
- **M1.2 — complete:** bounded exponential reconnection for unexpected WebSocket closes, with reset after connection and clean shutdown cancellation.
- **M1.3 — complete:** Binance public BTC/USDT mini ticker, normalized to the latest price and timestamps. No authentication.
- **M1.4 — complete:** Binance public BTC/USDT one-minute candle updates with normalized OHLC, time boundaries, and close state. No persistence.
- **M1.5 — complete:** base, quote, and taker-buy volume plus trade count exposed on normalized one-minute candles.
- **M1.6 — complete:** Binance public BTC/USDT top of book with normalized best bid and ask prices and quantities.
- **M1.7 — complete:** deterministic BTC/USDT absolute spread, midpoint, and basis-point calculation using decimal arithmetic.
- **M1.8 — complete:** public BTC/USDT pair status and price, quantity, and minimum-notional metadata from Binance exchange information.
- Further M1 increments require separate evidence and approval. Multi-level depth, historical retrieval, persistence, and metadata refresh or enforcement remain deferred.

## M2 — Paper Wallet — complete

- **M2.1 — complete:** in-memory fictional BTC/USDT balances, configurable initial USDT, exact decimal credit/debit operations, balance queries, and insufficient-funds protection.
- **M2.2 — complete:** in-memory latest BTC/USDT price and exact portfolio valuation in USDT, with an explicit unavailable-price state.
- **M2.3 — complete:** local read-only HTTP endpoints for paper balances and USDT valuation, returning 503 until a market price is available.
- **M2.4 — complete:** configurable latest-price freshness enforcement with HTTP 503 and structured diagnostics for stale valuation.
- **M2.5 — complete:** PostgreSQL persistence for BTC/USDT paper balances with idempotent seeding and atomic decimal credit/debit operations.

No real funds or exchange-account access.

## M3 — Paper Trading — complete

- **M3.1 — complete:** internal non-executing BTC market-buy quote using fresh best ask, public pair rules, top-level liquidity, and configurable simulated taker fee.
- **M3.2 — complete:** internal idempotent BTC market-buy execution through a shared executor contract, with atomic PostgreSQL balance mutation and execution persistence.
- **M3.3 — complete:** internal non-executing BTC market-sell quote using fresh best bid, public pair rules, top-level liquidity, simulated taker fee, and exact net proceeds.
- **M3.4 — complete:** internal idempotent BTC market-sell execution with atomic BTC debit, net USDT credit, and PostgreSQL execution persistence.
- **M3.5 — complete:** bounded read-only HTTP history of recent buy and sell executions, ordered newest first.
- **M3.6 — complete:** read-only BTC position with fee-inclusive weighted-average cost, accumulated fees, and realized PnL derived from execution history.
- **M3.7 — complete:** open-position valuation at the fresh best bid, including estimated exit fee, net liquidation value, unrealized PnL, and total PnL.
- **M3.8 — complete:** read-only realized performance summary with execution/outcome counts, win rate, realized PnL, and total fees.
- Later M3 increments require separate approval for ROI and time-based statistics, order mutation APIs, cursor pagination, and deeper slippage modeling.

## M4 — Risk Engine — in progress

All strategy signals pass through independent risk assessment before any executor. Position, exposure, loss, liquidity, and safety limits are introduced with focused tests.

- **M4.1 — complete:** provider-neutral risk assessment for every new paper execution with a configurable maximum gross order notional in USDT.
- Later M4 rules require separate approval for cumulative exposure, position size, loss limits, liquidity, emergency stop, and other safeguards.

## M5 — Strategies — planned

Deterministic, reproducible, measurable strategies that produce signals and never submit orders directly.

## M6 — Backtesting — planned

Historical simulation and metrics including net PnL, fees, ROI, drawdown, profit factor, and expectancy.

## M7 — New Listing Scanner — planned

Collect and statistically analyze newly listed assets without assuming the hypothesis is profitable.

## M8 — Dashboard — planned

Vue 3/Vite interface and market/portfolio visualizations. No dashboard exists yet.

## M9 — Polymarket — planned

Prediction-market support modeled separately from spot crypto semantics.

## M10 — Agentic Wallet / Real Trading — planned

Research current official Binance documentation before design. Real trading requires multiple independent safeguards and explicit user confirmation immediately before the first real order.

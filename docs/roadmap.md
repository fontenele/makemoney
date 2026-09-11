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

## M3 — Paper Trading — in progress

- **M3.1 — complete:** internal non-executing BTC market-buy quote using fresh best ask, public pair rules, top-level liquidity, and configurable simulated taker fee.
- **M3.2 — complete:** internal idempotent BTC market-buy execution through a shared executor contract, with atomic PostgreSQL balance mutation and execution persistence.
- Later M3 increments require separate approval for sells, public order APIs, position/PnL modeling, history queries, and deeper slippage modeling.

## M4 — Risk Engine — planned

All strategy signals pass through independent risk assessment before any executor. Position, exposure, loss, liquidity, and safety limits are introduced with focused tests.

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

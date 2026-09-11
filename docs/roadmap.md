# Roadmap

Implementation is incremental. A milestone starts only after the preceding scope is verified and the user approves the next plan.

## M0 — Bootstrap — complete

NestJS bootstrap, validated configuration, lint/format tooling, tests, Docker Compose, PostgreSQL, Redis, Prisma, health checks, and initial documentation.

## M1 — Market Data — planned

- **M1.1 — complete:** Binance public BTC/USDT trades over WebSocket, normalized into the internal domain model. No authentication.
- **M1.2 — complete:** bounded exponential reconnection for unexpected WebSocket closes, with reset after connection and clean shutdown cancellation.
- **M1.3 — complete:** Binance public BTC/USDT mini ticker, normalized to the latest price and timestamps. No authentication.
- **M1.4 — complete:** Binance public BTC/USDT one-minute candle updates with normalized OHLC, time boundaries, and close state. No persistence.
- **M1.5 — complete:** base, quote, and taker-buy volume plus trade count exposed on normalized one-minute candles.
- Later M1 increments: order book, spread, and pair metadata. These require separate approval.

## M2 — Paper Wallet — planned

Configurable virtual balances and portfolio valuation. No real funds.

## M3 — Paper Trading — planned

Paper execution behind a shared executor contract, using real market prices and realistic fees, spread, slippage, precision, minimum orders, and liquidity constraints.

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

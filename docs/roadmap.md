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

## M4 — Risk Engine — complete

All strategy signals pass through independent risk assessment before any executor. Position, exposure, loss, liquidity, and safety limits are introduced with focused tests.

- **M4.1 — complete:** provider-neutral risk assessment for every new paper execution with a configurable maximum gross order notional in USDT.
- **M4.2 — complete:** configuration-based emergency stop that rejects all new paper executions before other risk rules or mutation.
- **M4.3 — complete:** configurable cumulative BTC position-quantity limit for new paper buys using the persisted BTC balance and exact decimal arithmetic.
- **M4.4 — complete:** transaction-level enforcement of the BTC position limit so concurrent paper buys cannot collectively exceed it.
- **M4.5 — complete:** configurable daily realized-loss limit that blocks new paper buys at or beyond the threshold using net sell PnL for the current UTC day.
- **M4.6 — complete:** transaction-level daily-loss enforcement that serializes paper executions and recalculates realized PnL before a buy can mutate balances.
- **M4.7 — complete:** append-only persisted emergency-stop control with local read/write endpoints, idempotent changes, reasons, and restart-safe state.
- **M4.8 — complete:** configurable maximum share of displayed top-of-book liquidity for every new paper buy and sell.
- **M4.9 — complete:** fail-closed Bearer authentication for emergency-stop writes plus loopback-only Compose API exposure.
- **M4.10 — complete:** configurable net unrealized-loss limit for an existing open BTC position, blocking new buys while preserving sells and replays.
- **M4.11 — complete:** Redis-backed atomic fixed-window limit for distinct approved paper executions, with idempotency awareness and fail-closed behavior.
- Later M4 safeguards require separate evidence, a minimal plan, and approval.

## M5 — Strategies — complete

Deterministic, reproducible, measurable strategies that produce signals and never submit orders directly.

- **M5.1 — complete:** provider-neutral strategy contract and deterministic BTC/USDT moving-average crossover over ordered closed one-minute candles, using exact decimal arithmetic and producing buy, sell, or hold signals without execution.
- **M5.2 — complete:** process-local normalized candle feed and bounded live evaluation of the M5.1 strategy once per new closed candle, with duplicate/out-of-order suppression and structured signal logs.
- **M5.3 — complete:** process-local latest-signal read model exposed through a local read-only HTTP endpoint, with an explicit unavailable state before the first evaluation.
- **M5.4 — complete:** startup-validated moving-average periods with safe 3/5 defaults and bounded live history derived from the configured strategy requirement.
- **M5.5 — complete:** bounded process-local history of the latest 100 generated signals, exposed newest first through a read-only API with validated limits.
- **M5.6 — complete:** idempotent PostgreSQL persistence for live signals, with restart-safe recent and latest read APIs.
- Cursor-paginated history, filters, position sizing, execution integration, and additional strategies require separate approval.

## M6 — Backtesting — in progress

- **M6.1 — complete:** deterministic, provider-neutral replay of supplied ordered closed candles through the configured strategy, with strict input validation, bounded no-lookahead evaluation, and an ordered signal timeline plus action counts.
- **M6.2 — complete:** bounded public Binance Spot historical BTC/USDT one-minute candle loading behind a provider-neutral contract, strict payload validation, open-candle exclusion, cancellation, and direct internal replay integration.
- **M6.3 — complete:** provider-neutral complete historical OHLCV candles with exact decimal preservation, coherent high/low validation, and explicit strategy-input projection while retaining execution-ready fields.
- **M6.4 — complete:** deterministic historical-only long-position simulation with explicit fixed quantity and taker fee, next-candle-open hypothetical fills, an ordered ledger, per-trade net PnL, ignored-signal counts, and explicit open-position state.
- **M6.5 — complete:** deterministic aggregate realized performance with fill and outcome counts, nullable win rate, gross profit, absolute gross loss, realized net PnL, and all simulated fill fees.
- **M6.6 — complete:** deterministic final-close valuation of an ending open position with estimated exit fee, net liquidation value, unrealized net PnL, and combined total net PnL without a synthetic exit.
- **M6.7 — complete:** deterministic closed-trade average PnL, winning and losing averages, expectancy, and profit factor with explicit null states for absent samples or denominators.
- **M6.8 — complete:** chronological realized PnL curve and maximum absolute realized drawdown with explicit start, trough, and observed recovery timestamps.
- **M6.9 — complete:** explicit simulated initial capital, cash sufficiency, ending equity, net return, and total ROI without borrowing, negative cash, or variable quantity.
- **M6.10 — complete:** candle-close fee-adjusted equity curve with separately measured maximum absolute and percentage drawdowns, causal fill ordering, and final-equity reconciliation.
- **M6.11 — complete:** explicit deterministic spread and slippage applied adversely to hypothetical buy and sell prices, with auditable reference prices and downstream capital/performance reconciliation.
- **M6.12 — complete:** deterministic tested-period duration, closed-trade holding durations, total time in market, exposure rate, and average holding duration, including ending open exposure.
- **M6.13 — complete:** explicit provider-neutral quantity limits, exact step-size validation, and per-fill minimum-notional enforcement with rejected-signal accounting.
- **M6.14 — complete:** explicit tick-size precision with conservative side-aware rounding, auditable pre-rounding prices, final-price financial accounting, and non-positive sell rejection.
- Later M6 increments require separate approval for historical-data persistence or pagination, intracandle equity paths, variable sizing, price range filters, liquidity modeling, optimization, or API exposure.

## M7 — New Listing Scanner — planned

Collect and statistically analyze newly listed assets without assuming the hypothesis is profitable.

## M8 — Dashboard — planned

Vue 3/Vite interface and market/portfolio visualizations. No dashboard exists yet.

## M9 — Polymarket — planned

Prediction-market support modeled separately from spot crypto semantics.

## M10 — Agentic Wallet / Real Trading — planned

Research current official Binance documentation before design. Real trading requires multiple independent safeguards and explicit user confirmation immediately before the first real order.

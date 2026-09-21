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

## M6 — Backtesting — complete

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
- **M6.15 — complete:** explicit inclusive minimum/maximum executable-price filters with validated ranges, dedicated unfilled accounting, and state preservation.
- **M6.16 — complete:** causal all-or-none volume participation using only the fully closed signal candle, with explicit rate validation, auditable limits, dedicated unfilled accounting, and state preservation.
- **M6.17 — complete:** bounded multi-request historical loading up to 10,000 candles through sequential Binance pages of at most 1,000, with deterministic progress, cancellation, and page-level validation.
- **M6.18 — complete:** bounded per-page retry for network failures, rate limiting, and server errors, with cancelable exponential or provider-directed delay and no retry of permanent responses.
- **M6.19 — complete:** process-local historical-provider circuit breaker with a three-failure threshold, 30-second open interval, fail-fast behavior, and one concurrent half-open recovery probe.
- **M6.20 — complete:** serializable write-through PostgreSQL persistence for validated closed historical candles, with exact text decimals, idempotent identities, conflict detection, and replay blocked until durable storage succeeds.
- **M6.21 — complete:** explicit stored-only replay and simulation over bounded chronological PostgreSQL reads, with strict persisted-row validation and no Binance fallback or completeness claim.
- **M6.22 — complete:** deterministic all-or-nothing stored-range coverage lets standard replay and simulation bypass Binance on a complete cache hit; incomplete ranges use the existing full remote load and write-through.
- **M6.23 — complete:** contiguous missing one-minute ranges load sequentially from Binance, merge with validated stored candles only under complete coverage, and persist as one transactional fetched batch before replay.
- **M6.24 — complete:** local bounded `POST /backtesting/replay` exposes deterministic BTC/USDT one-minute signal replay with strict UTC input, explicit HTTP failures, and no financial execution path.
- **M6.25 — complete:** local bounded `POST /backtesting/simulate` exposes the complete research simulator only after strict pre-load validation of every explicit financial assumption and execution rule.
- **M6.26 — complete:** idempotent `POST /backtesting/runs` persists immutable complete request/result JSON snapshots with UUID identity, UTC creation time, fingerprint conflict detection, and exact decimal strings.
- **M6.27 — complete:** read-only `GET /backtesting/runs/:id` retrieves one immutable snapshot by validated UUID with explicit absent and unavailable states and no recalculation.
- **M6.28 — complete:** bounded read-only `GET /backtesting/runs` lists immutable snapshots newest first with deterministic ordering and strict limit validation.
- **M6.29 — complete:** optional UUID cursor pagination extends the recent-run array without offset drift or a response-format change and rejects malformed or unknown cursors explicitly.
- **M6.30 — complete:** inclusive UTC creation-time filters compose with limit and cursor and reject invalid ranges.
- **M6.31 — complete:** explicit UUID deletion removes one stored simulation snapshot while preserving historical candles and distinguishing absence from operational failure.
- **M6.32 — complete:** disposable-schema E2E isolation keeps local application data untouched and restores repeatable full-suite validation; M6 is closed.
- M6 satisfies its complete acceptance scope. Bulk deletion, automatic retention, additional run filtering, cache refresh or expiry, overwriting stored candles, parallel gap loading, shared/persisted circuit state, intracandle equity paths, variable sizing, order-book/depth modeling, partial fills, and optimization are optional post-M6 enhancements that require separately planned milestones and approval; they are not unfinished M6 work.

## M7 — New Listing Scanner — in progress

Collect and statistically analyze newly listed assets without assuming the hypothesis is profitable.

- **M7.1 — complete:** one public Binance Spot/USDT catalog snapshot is normalized behind a provider-neutral contract and retained as an in-memory baseline.
- **M7.2 — complete:** idempotent PostgreSQL observations preserve first-seen time and update latest-seen provider state transactionally.
- **M7.3 — complete:** serializable observation comparison treats the first population as baseline-only and identifies only later previously unseen symbols.
- **M7.4 — complete:** configurable sequential polling refreshes observations without overlap, preserves the last successful state after failure, and stops cleanly at shutdown.
- **M7.5 — complete:** an immutable nullable detection timestamp durably distinguishes post-baseline additions from baseline and migrated rows.
- **M7.6 — complete:** a bounded local read-only endpoint exposes recent durable detections newest first without exposing baseline rows.
- **M7.7 — complete:** optional inclusive canonical UTC detection-time filters support bounded research windows with strict input validation.
- **M7.8 — complete:** a canonical provider/symbol cursor provides stable keyset pagination over the immutable detection sort position and composes with time filters.
- **M7.9 — complete:** strict provider, current status, and Spot-availability filters compose with bounded time-filtered cursor pagination.
- **M7.10 — complete:** a filtered read-only summary reports the durable detection sample count and its earliest/latest application detection times.
- **M7.11 — complete:** the filtered summary reports deterministic current-status and Spot-availability group counts from one consistent database snapshot.
- **M7.12 — complete:** a pure provider-neutral domain contract defines the nine detection-relative observation checkpoints without scheduling or collecting market data.
- **M7.13 — complete:** all nine checkpoints are persisted atomically for each durable detection, with idempotent identity, target-time indexing, and safe detected-row backfill.
- **M7.14 — complete:** a bounded deterministic repository read exposes checkpoints due by an explicit instant without claiming or processing them.
- **M7.15 — complete:** an internal application boundary validates due time and a strict 1–100 limit before checkpoint repository access.
- **M7.16 — complete:** atomic PostgreSQL leases claim bounded due-checkpoint batches with `FOR UPDATE SKIP LOCKED`, exclude active claims, and make abandoned work eligible again after expiry.
- **M7.17 — complete:** ownership-safe terminal completion records a checkpoint only for its matching active lease and permanently excludes completed work from due reads and future claims.
- **M7.18 — complete:** startup-validated checkpoint-worker options define bounded interval, batch size, and lease duration without activating background processing.
- **M7.19 — complete:** a deterministic single-cycle orchestrator claims one bounded batch, processes checkpoints sequentially, completes successes, and leaves failures recoverable by lease expiry without activating a timer or production processor.
- **M7.20 — complete:** a provider-neutral checkpoint market-observation contract preserves exact decimal price and volumes and validates symbol, trade count, provider-window, and receive-time invariants without loading or persisting data.
- **M7.21 — complete:** an inactive public Binance Spot adapter loads one explicitly named symbol's rolling 24-hour ticker with timeout, cancellation, strict payload validation, and exact decimal normalization.
- **M7.22 — complete:** atomic checkpoint completion persists validated market observations (`lastPrice`, `baseVolume`, `quoteVolume`, `tradeCount`, `windowOpenTime`, `windowCloseTime`, `receivedAt`) in PostgreSQL with database consistency constraints.
- **M7.23 — complete:** an injected production checkpoint processor maps claimed provider/symbol identity to the public observation provider while preserving the cycle's failure isolation and without activating background work.
- **M7.24 — complete:** a disabled-by-default lifecycle worker schedules completion-relative non-overlapping cycles, continues after cycle-level failures, and clears pending work cleanly during shutdown.
- **M7.25 — complete:** a local read-only route exposes the completed checkpoint observation timeline for one durable detection with strict identity validation and exact decimal values.
- **M7.26 — complete:** a pure exact-decimal calculator derives chronological absolute price changes and return rates from the explicit `T+0` observation baseline.
- **M7.27 — complete:** a local read-only endpoint loads the durable timeline and exposes its T+0-relative price performance with explicit unavailable semantics.
- **M7.28 — complete:** a pure cross-detection cohort calculator groups available returns by checkpoint and reports sample size, outcome counts, and exact-decimal average return.
- **M7.29 — complete:** a bounded durable cohort query selects recent detections with a completed T+0 baseline and calculates aggregate checkpoint performance without exposing a route.
- **M7.30 — complete:** local read-only `GET /new-listings/performance` exposes the bounded durable cohort calculation with strict provider and limit validation.
- **M7.31 — complete:** a pure exact-decimal classifier detects an explicitly thresholded observed pump and subsequent correction from the running post-pump peak.
- **M7.32 — complete:** the internal read model loads one durable detection timeline and composes exact performance with explicit pump/correction classification.
- **M7.33 — complete:** local read-only classification HTTP access requires explicit valid pump/correction thresholds and preserves unknown/unavailable semantics.
- **M7.34 — complete:** a pure cohort calculator aggregates same-threshold classifications into observed pump/correction counts and exact rates with explicit denominators.
- **M7.35 — complete:** the internal read model loads a bounded durable T+0-eligible cohort, applies explicit pump/correction thresholds to every timeline, and returns aggregate pattern statistics without HTTP exposure.
- **M7.36 — complete:** local read-only `GET /new-listings/classification` exposes bounded durable pattern-cohort statistics with mandatory explicit pump and correction thresholds.
- **M7.37 — complete:** a pure exact-decimal cohort calculator reports median observed peak-return and correction-from-peak magnitudes with independent sample sizes.
- **M7.38 — complete:** the internal read model loads the bounded durable T+0-eligible cohort, classifies it under explicit thresholds, and returns exact pattern-magnitude medians without HTTP exposure.
- **M7.39 — complete:** local read-only `GET /new-listings/classification/magnitudes` exposes durable median pattern magnitudes with mandatory explicit thresholds and independent event samples.
- **M7.40 — complete:** a pure cohort calculator reports median T+0-to-pump and peak-to-correction durations with independent event samples and schedule validation.
- **M7.41 — complete:** the internal read model applies pattern timing medians to the bounded durable T+0-eligible cohort through the shared explicit-threshold classification pipeline.
- **M7.42 — complete:** local read-only `GET /new-listings/classification/timing` exposes durable median pattern timing with mandatory explicit thresholds and independent event samples.
- **M7.43 — complete:** a pure cohort calculator reports exact average rolling-window base volume, quote volume, and trade count per checkpoint as market activity rather than executable liquidity.
- **M7.44 — complete:** the internal read model applies checkpoint market-activity averages to the bounded durable T+0-eligible cohort without HTTP exposure.
- **M7.45 — complete:** local read-only `GET /new-listings/activity` exposes durable checkpoint market-activity averages without presenting rolling turnover as executable liquidity.
- **M7.46 — complete:** a provider-neutral listing top-of-book contract preserves exact bid/ask prices and quantities with strict identity, update, book-coherence, and receive-time validation without loading data.
- **M7.47 — complete:** a pure exact-decimal calculator derives listing top-of-book absolute spread, midpoint, and spread basis points while preserving displayed level-one quantities.
- **M7.48 — complete:** an inactive public Binance Spot depth adapter loads one explicit symbol, preserves `lastUpdateId`, and normalizes only the best bid/ask with timeout, cancellation, and strict validation.
- **M7.49 — complete:** the Binance listing top-of-book adapter is registered behind its provider-neutral dependency token while remaining without an active consumer or lifecycle behavior.
- **M7.50 — complete:** an explicitly invoked internal service composes provider-neutral top-of-book loading with exact spread derivation while adding no automatic collection, persistence, or route.
- **M7.51 — complete:** an immutable optional child record stores one exact-string top-of-book snapshot per existing checkpoint behind a provider-neutral repository, without worker integration.
- **M7.52 — complete:** the repository reloads an explicit detection's stored top-of-book checkpoints as an empty or canonically ordered validated timeline without HTTP exposure.
- **M7.53 — complete:** local read-only `GET /new-listings/:provider/:symbol/top-of-book` exposes the durable canonical book timeline without triggering collection.
- **M7.54 — complete:** a lease-safe PostgreSQL transaction can complete a checkpoint together with rolling-ticker and immutable top-of-book data, with no partial state and no worker activation.
- **M7.55 — complete:** the opt-in checkpoint processor loads ticker and top-of-book together, and the cycle persists successful pairs through the lease-safe atomic completion path while preserving failure recovery.
- **M7.56 — complete:** a pure exact-decimal cohort calculator reports average checkpoint spread basis points and displayed level-one bid/ask quote notionals without treating them as depth or executable liquidity.
- **M7.57 — complete:** the internal read model loads a bounded newest-first durable cohort with stored T+0 books and applies the exact top-of-book cohort calculator without HTTP exposure.
- **M7.58 — complete:** local read-only `GET /new-listings/top-of-book` exposes bounded durable checkpoint spread and displayed level-one quote-notional averages without triggering collection.
- **M7.59 — complete:** a pure exact-decimal calculator derives displayed bid/ask quote notionals and normalized level-one imbalance with explicit zero-book unavailability.
- **M7.60 — complete:** the internal read model applies exact imbalance to one detected symbol's canonical durable book timeline while preserving checkpoint metadata and empty/not-found semantics.
- **M7.61 — complete:** local read-only `GET /new-listings/:provider/:symbol/top-of-book/imbalance` exposes the exact derived durable timeline without collection or derived persistence.
- **M7.62 — complete:** a pure exact-decimal cohort calculator reports average checkpoint imbalance with explicit stored-book, calculable, and unavailable sample coverage.
- **M7.63 — complete:** the internal read model applies exact imbalance aggregation to the bounded durable T+0-book-eligible cohort without HTTP exposure.
- **M7.64 — complete:** local read-only `GET /new-listings/top-of-book/imbalance` exposes bounded durable imbalance averages with explicit availability denominators.
- **M7.65 — complete:** a pure exact-decimal calculator derives canonical checkpoint imbalance changes from an explicitly available T+0 baseline.
- **M7.66 — complete:** the internal read model derives exact imbalance evolution from one detected symbol's canonical durable stored-book timeline.
- **M7.67 — complete:** local read-only per-detection HTTP access exposes exact durable imbalance evolution with explicit T+0 unavailability.
- **M7.68 — complete:** a pure exact-decimal cohort calculator averages T+0-relative imbalance changes by checkpoint with explicit availability coverage.
- **M7.69 — complete:** the internal read model composes exact imbalance-evolution statistics over the bounded durable T+0-book cohort.
- **M7.70 — complete:** local read-only HTTP access exposes the bounded durable imbalance-evolution cohort with explicit coverage.
- **M7.71 — complete:** a pure exact-decimal calculator derives checkpoint spread-basis-point changes from the explicit T+0 book.
- **M7.72 — complete:** the internal read model derives exact spread evolution from one detected symbol's canonical durable stored-book timeline.
- **M7.73 — complete:** local read-only per-detection HTTP access exposes exact durable spread evolution with explicit T+0 unavailability.
- **M7.74 — complete:** a pure exact-decimal cohort calculator aggregates spread-basis-point evolution with independent checkpoint coverage.
- **M7.75 — complete:** the internal read model composes spread evolution over a bounded recent durable cohort with usable T+0 books.
- **M7.76 — complete:** local read-only HTTP access exposes the bounded durable spread-evolution cohort with explicit checkpoint coverage.
- **M7.77 — complete:** a pure exact-decimal classifier identifies explicitly thresholded observed spread widening and its maximum observed change.
- **M7.78 — complete:** the internal read model classifies one detection's canonical durable stored-book timeline on demand with an explicit widening threshold.
- **M7.79 — complete:** local read-only HTTP access exposes one durable detection's explicit-threshold spread-widening classification with validated input and explicit unavailable semantics.
- **M7.80 — complete:** a pure exact-decimal cohort calculator reports explicit spread-widening classification counts and observed rate under one caller-supplied threshold.
- **M7.81 — complete:** the internal read model composes explicit-threshold spread-widening statistics over the bounded recent durable T+0-book cohort.
- **M7.82 — complete:** local read-only HTTP access exposes bounded durable spread-widening classification statistics with a mandatory explicit threshold.
- **M7.83 — complete:** a pure exact-decimal cohort calculator reports the median maximum widening magnitude among threshold-qualified classifications.
- **M7.84 — complete:** the internal read model composes maximum-widening magnitude over the bounded recent durable classification cohort.
- **M7.85 — complete:** local read-only HTTP access exposes the bounded durable maximum-widening magnitude with a mandatory explicit threshold and independent sample size.
- **M7.86 — complete:** a pure cohort calculator reports median T+0-to-first-widening duration with an independent threshold-qualified sample and canonical schedule validation.
- **M7.87 — complete:** the internal read model composes first-widening timing over the shared bounded recent durable spread-classification cohort.
- **M7.88 — complete:** local read-only HTTP access exposes bounded durable first-widening timing with a mandatory explicit threshold and independent sample size.
- **M7.89 — complete:** a pure exact-decimal calculator derives observed checkpoint-price high, low, and maximum causal peak-to-trough drawdown without inventing a listing score.
- **M7.90 — complete:** the internal read model composes price-path statistics on demand from one detection's durable completed checkpoint timeline while preserving not-found and unavailable semantics.
- **M7.91 — complete:** local read-only HTTP access exposes one durable detection's observed checkpoint-price extrema and causal drawdown with validated identity and explicit unavailable semantics.
- **M7.92 — complete:** a pure exact-decimal cohort calculator reports median extrema timing and positive maximum-drawdown rate and duration without comparing absolute prices across assets.

## M8 — Dashboard — planned

Vue 3/Vite interface and market/portfolio visualizations. No dashboard exists yet.

## M9 — Polymarket — planned

Prediction-market support modeled separately from spot crypto semantics.

## M10 — Agentic Wallet / Real Trading — planned

Research current official Binance documentation before design. Real trading requires multiple independent safeguards and explicit user confirmation immediately before the first real order.

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
- **M7.93 — complete:** the internal read model composes price-path cohort statistics on demand over the bounded recent durable T+0-eligible observation sample.
- **M7.94 — complete:** local read-only HTTP access exposes bounded durable price-path timing and positive-drawdown cohort statistics.
- **M7.95 — complete:** a pure exact-decimal calculator describes consecutive checkpoint-price variability through average absolute return and the earliest maximum absolute transition.
- **M7.96 — complete:** the internal read model composes checkpoint-price variability on demand from one detection's durable completed timeline.
- **M7.97 — complete:** local read-only HTTP access exposes exact non-annualized checkpoint-price variability for one durable detection.
- **M7.98 — complete:** a pure exact-decimal cohort calculator reports median average and maximum absolute consecutive returns with explicit transition coverage.
- **M7.99 — complete:** the internal read model composes variability statistics on demand over the bounded recent durable T+0-eligible observation cohort.
- **M7.100 — complete:** local read-only HTTP access exposes bounded durable non-annualized price-variability cohort statistics.
- **M7.101 — complete:** a pure exact-decimal calculator evaluates an explicit stored-ask-to-later-stored-bid checkpoint round trip after observed spread, two-sided fees, and adverse slippage.
- **M7.102 — complete:** the internal read model composes an explicitly selected round trip from one known detection's durable top-of-book timeline, with pre-access input validation and explicit missing-checkpoint semantics.
- **M7.103 — complete:** local read-only HTTP access exposes one explicit durable checkpoint round trip with mandatory pair and cost inputs plus explicit `400`/`404`/`503` outcomes.
- **M7.104 — complete:** a pure exact-decimal cohort calculator aggregates one fixed explicit round-trip configuration with available/unavailable coverage, gross/net return summaries, and profitability-after-costs statistics.
- **M7.105 — complete:** the internal read model composes one fixed explicit round-trip configuration over a bounded durable top-of-book cohort while retaining every incomplete timeline as unavailable coverage.
- **M7.106 — complete:** local read-only HTTP access exposes the bounded durable round-trip cohort with mandatory explicit selection/cost inputs and established limit/provider validation.
- **M7.107 — complete:** a pure exact-decimal outcome cohort separates profitable, losing, break-even, and unavailable round trips and reports conditional average net gains and losses.
- **M7.108 — complete:** the internal read model composes the outcome cohort on demand over the bounded recent durable top-of-book cohort without adding an HTTP route or trading behavior.
- **M7.109 — complete:** local read-only HTTP access exposes the bounded durable round-trip outcome cohort with mandatory explicit selection/cost inputs and established limit/provider validation.

## M8 — Dashboard — complete

Vue 3/Vite interface and market/portfolio visualizations.

- **M8.1 — complete:** a separate loopback-only Vue 3/Vite dashboard reads local health, fictional portfolio valuation, BTC paper position, and realized paper performance with typed independent unavailable states and no mutation or execution path.
- **M8.2 — complete:** the overview refreshes immediately and then on a non-overlapping completion-relative 15-second cadence, pauses pending work while hidden, and refreshes when the tab becomes visible again.
- **M8.3 — complete:** a responsive read-only ledger displays the twelve most recent immutable fictional executions with side-specific settlement values and an independent unavailable state.
- **M8.4 — complete:** a responsive read-only view displays eight recent durable application-detected new listings with provider state, Spot availability, and an independent empty/unavailable state.
- **M8.5 — complete:** semantic responsive header navigation links the overview, recent executions, and new-listing sections with keyboard focus and native fragment behavior.
- **M8.6 — complete:** a responsive read-only timeline displays the twenty newest persisted moving-average signals and their exact current averages without connecting signals to execution.
- **M8.7 — complete:** a chronological read-only chart compares the persisted short and long moving averages on one scale and marks observed buy/sell signals without recalculating strategy decisions; M8.11 later migrates its original manual SVG implementation to ECharts.
- **M8.8 — complete:** selecting a recent detection loads its existing exact T+0 checkpoint performance and displays a zero-anchored return chart plus checkpoint facts without ranking or recommendation.
- **M8.9 — complete:** the newest immutable stored backtest is displayed with its backend-calculated fee-adjusted equity curve, ROI, drawdown, and closed-trade facts without simulation or mutation controls.
- **M8.10 — complete:** compiled Vite assets are served from the loopback-bound NestJS application at /dashboard/, with a build-only asset base and same-origin root API requests.
- **M8.11 — complete:** every existing dashboard plot uses Apache ECharts through one responsive accessible Vue lifecycle component; manual chart SVG paths are removed and Vite splits the application, ECharts, and ZRender into bounded chunks.
- Live price/portfolio-equity history and additional research views remain optional post-M8 enhancements.

## M9 — Polymarket — in progress

**Goal:** establish trustworthy, public prediction-market research while modeling markets, outcomes, probabilities, resolution, and liquidity separately from Spot crypto.

**Scope:** unauthenticated public discovery first, followed incrementally by selected-market details and observational market data only when each prior contract is verified.

**Non-goals:** authentication, accounts, positions, signing, order submission, wallet integration, automated execution, prediction-market strategies, or real capital.

**Architecture impact:** a dedicated `polymarket` module owns provider-neutral prediction-market contracts and a Gamma API adapter; it does not implement or reuse the Spot `TradingPair` model or any trading executor.

**Tests and acceptance:** each public provider payload is normalized and strictly validated behind an interface; local inputs are bounded; provider failure is explicit; builds, unit tests, lint, formatting, and route documentation must pass.

**Known limitations:** M9.1–M9.54 retain no market data. They load bounded public research observations and expose a dashboard subset plus process-local provider availability. The dashboard includes bounded active-event discovery and explicitly selected event identity/lifecycle details with direct taxonomy, a bounded descriptive market-reference sample, aggregate taker volume in shares, and at most eight provider-ordered condition-correlated volume rows, the public Data API freshness snapshot, platform-wide and selected-market open interest, the descriptive non-atomic binary midpoint relationship, direct selected-market taxonomy with an explicitly selected single related-tag level, only the latest reported trade per indexed outcome, and on-demand trailing 24-hour price comparisons with explicit boundary alignment and source-observation provenance plus bounded 30-minute charts, not individual trade records, historical books, pagination beyond the first page, or retained history. Data API freshness does not establish Gamma or CLOB freshness. They do not query or fully expand event market references, load holders, implicitly expand related tags, expose a recurrence catalog, fuzzy recurrence matching, recursive tag traversal, browser-ranked metrics, full depth, executable quotes, wallet positions, or redemption. Live provider validation is environment-dependent; provider access defaults to disabled, and its runtime override resets on restart.

- **M9.1 — complete:** `GET /polymarket/markets` loads one bounded cursor-aware page of active markets from the unauthenticated public Gamma API, normalizes it into a separate prediction-market domain, applies a request timeout, and fails closed on malformed or unavailable provider data.
- **M9.2 — complete:** `GET /polymarket/markets/:id` loads a selected public market by validated Gamma ID, strictly decodes its indexed outcome arrays into explicit YES and NO labels and nullable CLOB token identities, and distinguishes absence from provider unavailability without exposing prices or execution paths.
- **M9.3 — complete:** `GET /polymarket/outcomes/:tokenId/midpoint` loads one unauthenticated public CLOB midpoint, preserves its exact decimal string, exposes receipt-only freshness and missing upstream timestamp explicitly, and marks the observation non-executable without adding caching, persistence, liquidity claims, or order access.
- **M9.4 — complete:** `GET /polymarket/outcomes/:tokenId/top-of-book` loads one public CLOB snapshot, validates its identity and provider ordering (ascending bids and descending asks), exposes the final best bid/ask prices and quantities plus exact spread, and represents missing sides explicitly without adding execution behavior.
- **M9.5 — complete:** `GET /polymarket/outcomes/:tokenId/market-data` concurrently loads the independent midpoint and top of book, verifies their exact decimal coherence when both sides exist, fails closed on divergence, and reports missing-liquidity verification limits explicitly without adding persistence or execution.
- **M9.6 — complete:** `GET /polymarket/outcomes/:tokenId/last-trade` loads one unauthenticated public CLOB last-trade price and side, rejects the documented never-traded placeholder as unavailable, and exposes receipt-only freshness without claiming current liquidity, history, or execution.
- **M9.7 — complete:** `GET /polymarket/outcomes/:tokenId/last-trade/context` compares the independently loaded last trade and displayed top of book with exact signed distances and explicit spread-position classification while denying atomic-snapshot, freshness, signal, or execution claims.
- **M9.8 — complete:** `GET /polymarket/markets/:id/midpoint-complement` loads distinct indexed YES and NO midpoints, reports their exact sum and signed deviation from one, and classifies the non-atomic relationship descriptively without arbitrage, recommendation, probability-coherence, or execution claims.
- **M9.9 — complete:** `GET /polymarket/conditions/:conditionId/resolution` loads one public Data API condition-grain resolution row, validates exact requested identity, and preserves status, review/dispute/arbitration flags, nullable resolution time, and receipt time without inferring a winner or payout.
- **M9.10 — complete:** `GET /polymarket/markets/:id/resolution` reconciles one selected market's condition and indexed YES/NO identities with the exact terminal binary payout vectors `[1,0]`, `[0,1]`, or `[0.5,0.5]`, exposing winner/loser/split payout rates without positions, redemption, accounts, or execution.
- **M9.11 — complete:** `GET /polymarket/events/:id` loads one selected public Gamma event, strictly normalizes its identity, descriptive resolution context, lifecycle flags, and at most 1,000 market references, and exposes no event prices, volume, persistence, account, position, order, or execution behavior.
- **M9.12 — complete:** `GET /polymarket/events` loads one bounded cursor-aware page of non-closed public Gamma events, reduces relation-heavy records to validated identity, dates, and lifecycle summaries, and exposes no nested relations, financial metrics, persistence, account, position, order, or execution behavior.
- **M9.13 — complete:** `GET /polymarket/events/:id/tags` loads at most 100 public tags attached to one selected event, normalizes unique tag identities with nullable labels/slugs, and discards editorial and authoring metadata without adding catalog traversal, persistence, account, order, or execution behavior.
- **M9.14 — complete:** `GET /polymarket/markets/:id/tags` loads at most 100 public tags attached to one selected market behind its own provider contract, normalizes unique tag identities with nullable labels/slugs, and adds no global catalog, persistence, account, order, or execution behavior.
- **M9.15 — complete:** `GET /polymarket/tags` loads one bounded public global tag-catalog page in ascending provider-ID order, strictly normalizes unique identity-only records, and discloses that its convenient `nextOffset` is not stable snapshot pagination without adding relationships, filters, persistence, accounts, orders, or execution behavior.
- **M9.16 — complete:** `GET /polymarket/tags/:id` loads one selected public tag by validated positive numeric ID, verifies exact response identity, and preserves only ID, nullable label/slug, and receipt time without adding slug lookup, relationships, editorial metadata, persistence, accounts, orders, or execution behavior.
- **M9.17 — complete:** `GET /polymarket/tags/:id/related` loads at most 100 unique public tags related to one validated source tag, preserves only ID and nullable label/slug, and fails closed on malformed, duplicate, oversized, or self-referential sets without adding recursive traversal, filtering, persistence, accounts, orders, or execution behavior.
- **M9.18 — complete:** `GET /polymarket/events` accepts an optional positive numeric `tagId`, applies it to the existing bounded keyset discovery request, and verifies every provider result contains the exact requested tag before returning the unchanged event summary without implicit related-tag expansion, ranking, persistence, accounts, orders, or execution behavior.
- **M9.19 — complete:** `GET /polymarket/markets` accepts an optional positive numeric `tagId`, applies it to the existing bounded keyset discovery request, and verifies every provider result contains the exact requested tag before returning the unchanged market summary without implicit related-tag expansion, ranking, persistence, accounts, orders, or execution behavior.
- **M9.20 — complete:** `GET /polymarket/series/:id` loads one selected public Gamma series by validated positive numeric ID, verifies exact response identity, and preserves only nullable slug/title/recurrence, closed state, and receipt time without expanding events or markets or adding metrics, persistence, accounts, orders, or execution behavior.
- **M9.21 — complete:** `GET /polymarket/series` loads one bounded offset page of open public Gamma series in ascending provider-ID order, excludes nested events, validates unique open identities, and declares continuation unstable without adding recurrence filters, relation expansion, metrics, persistence, accounts, orders, or execution behavior.
- **M9.22 — complete:** `GET /polymarket/series` accepts an optional bounded trimmed `recurrence`, applies it to the existing open-series request, and verifies every provider result has the exact recurrence before returning the unchanged summary without fuzzy matching, relation expansion, persistence, accounts, orders, or execution behavior.
- **M9.23 — complete:** `GET /polymarket/series/:id/events` loads at most 1,000 unique event references from one identity-verified public Gamma series and preserves only identity, dates, and lifecycle flags without importing nested markets, prices, volume, liquidity, persistence, accounts, orders, or execution behavior.
- **M9.24 — complete:** `GET /polymarket/data-freshness` loads one parameter-free public Data API status snapshot, strictly validates bounded serving and ingestion lag metadata, and preserves not-yet-measured or malformed upstream state as explicit `503` without loading feeds, accounts, positions, persistence, orders, or execution behavior.
- **M9.25 — complete:** `GET /polymarket/markets/:id/open-interest` loads the selected market, requires its condition identity, requests exactly that public Data API open-interest row, and exposes a non-negative decimal USDC value only after identity reconciliation without adding holders, wallet positions, accounts, persistence, orders, or execution behavior.
- **M9.26 — complete:** `GET /polymarket/events/:id/live-volume` loads the selected event and its public Data API taker-volume breakdown in shares, bounds and reconciles the ordered condition rows and exact total, and rejects identified conditions outside that event without adding trades, holders, wallet positions, accounts, persistence, orders, or execution behavior.
- **M9.27 — complete:** `GET /polymarket/open-interest` loads the parameter-free public Data API platform total, requires exactly one null-condition row, and exposes its non-negative aggregate USDC value as a decimal string without adding market expansion, holders, wallet positions, accounts, persistence, orders, or execution behavior.
- **M9.28 — complete:** `GET /polymarket/outcomes/:tokenId/price-history` loads one cursor-aware public Data API page inside a required canonical UTC window of at most 31 days, supports explicit `1m`, `5m`, `30m`, `3h`, or `12h` resolution, validates at most 100 oldest-first exact price points, and exposes no trades, book depth, persistence, accounts, orders, or execution behavior.
- **M9.29 — complete:** `GET /polymarket/outcomes/:tokenId/price-at` requests the latest public Data API observation at or before one canonical UTC instant, requires exactly one terminal non-future point, and exposes its exact price, observed timestamp, actual resolution, and exact-match status without scanning pages, inferring a quote, or adding trades, persistence, accounts, orders, or execution behavior.
- **M9.30 — complete:** `GET /polymarket/markets/:id/price-complement-at` composes independently observed YES and NO M9.29 prices for one selected binary market, validates indexed token and requested-time coherence, and reports their exact sum, signed deviation from one, classification, observed-time alignment, and resolution alignment with explicit non-atomic and non-executable semantics.
- **M9.31 — complete:** `GET /polymarket/outcomes/:tokenId/price-change` composes two independently selected M9.29 prices across a positive canonical UTC interval of at most 31 days, validates token, requested-time, and observed-order coherence, and reports the exact signed price change, direction, observed-time alignment, and resolution alignment without percentage-return, quote, trade, or execution semantics.
- **M9.32 — complete:** `GET /polymarket/markets/:id/price-change` composes the indexed YES and NO M9.31 changes for one selected binary market, validates token and interval coherence, and reports each outcome movement plus their exact combined change/direction and cross-outcome timestamp/resolution alignment at both boundaries with explicit non-atomic and non-executable semantics.
- **M9.33 — complete:** `GET /polymarket/outcomes/:tokenId/market` resolves one canonical outcome token to its public CLOB condition and distinct primary/YES and secondary/NO token identities, verifies exact requested-token membership, and reports the requested outcome side without prices, positions, accounts, or execution behavior.
- **M9.34 — complete:** the local dashboard independently loads eight active public markets and lets the user select one to view its question, YES/NO identity labels, independent midpoint percentages, and open interest with isolated unavailable states, bounded sanitized backend diagnostics, and no recommendation, mutation, account, order, or execution behavior.
- **M9.35 — complete:** every `/polymarket` route is protected by a controller-wide fail-closed `POLYMARKET_ENABLED` guard. Application and Compose defaults are `false`; disabled access returns sanitized `503` before any provider call, while enablement requires explicit startup configuration and no automatic VPN detection or network-block bypass is added.
- **M9.36 — complete:** selected-market dashboard research loads the indexed YES and NO public top-of-book resources after token identity is available and displays each best bid/ask price and quantity plus spread with isolated unavailable states; live validation also corrected CLOB book ordering so valid snapshots no longer become false `503` responses. No full-depth, executable-quote, fill, recommendation, or execution claim is added.
- **M9.37 — complete:** always-available local settings routes and a dashboard control can override Polymarket provider availability for the current API process only. Enabling requires an explicit access/VPN confirmation, disabling is immediate, restart restores the safe startup configuration, and every provider-backed route remains guarded without automatic VPN detection, persistence, credentials, accounts, orders, or execution.
- **M9.38 — complete:** selected-market dashboard research independently loads the existing latest-reported-trade resource for indexed YES and NO outcomes and displays exact price, provider-reported side, local receipt time, and missing provider-time semantics with isolated unavailable states. No trade history, trade identity, quantity, freshness inference, quote, recommendation, signal, account, order, or execution behavior is added.
- **M9.39 — complete:** selected-market dashboard research loads the existing binary price-change resource over a trailing 24-hour UTC window truncated to whole seconds and displays exact YES and NO absolute changes in percentage points. Historical failure remains isolated from current midpoint, book, trade, and open-interest observations; no percentage return, chart, persistence, signal, recommendation, account, order, or execution behavior is added.
- **M9.40 — complete:** after selected-market outcome identity is available, the dashboard independently loads one bounded 30-minute price-history page for YES and NO over the same trailing 24-hour UTC window and plots whichever series are available on a fixed zero-to-one ECharts scale. Each request is capped at 100 points, failures remain isolated, and no pagination, synchronized-snapshot claim, persistence, signal, recommendation, account, order, or execution behavior is added.
- **M9.41 — complete:** the dashboard independently loads the existing parameter-free public Data API freshness snapshot and displays snapshot age, computation time, serving lag/worst mechanism, most-lagged ingestion cursor, network, and cursor count. Failure remains isolated from settings and discovery; the view stays separate from local health and makes no Gamma/CLOB freshness, threshold, alert, recommendation, account, order, or execution claim.
- **M9.42 — complete:** the dashboard independently loads the existing parameter-free platform-wide open-interest observation and displays its exact USDC aggregate plus local receipt time separately from selected-market open interest. Failure remains isolated from freshness and discovery; no backend route, market expansion, holders, positions, persistence, recommendation, account, order, or execution behavior is added.
- **M9.43 — complete:** selected-market dashboard research independently loads the existing bounded direct market-tag resource and displays provider labels with slug or identity fallbacks. Empty and unavailable taxonomy remain explicit and isolated; no related-tag expansion, discovery filtering, ranking, persistence, recommendation, account, order, or execution behavior is added.
- **M9.44 — complete:** an explicit browser-local selection of one direct market tag loads the existing bounded first-level related-tag resource and displays its label/slug/identity summaries with isolated loading, empty, and unavailable states. Related results are not selectable, so no recursive traversal, implicit expansion, discovery filtering, ranking, persistence, recommendation, account, order, or execution behavior is added.
- **M9.45 — complete:** selected-market research reuses the existing midpoint-complement response to display the exact midpoint sum, signed deviation from one, and descriptive relationship with explicit independent-receipt, non-atomic, and non-executable semantics. No provider request, backend route, arbitrage claim, recommendation, persistence, account, order, or execution behavior is added.
- **M9.46 — complete:** selected-market research reuses the existing binary price-change response to display the exact combined 24-hour movement and independent timestamp/resolution alignment at both requested boundaries. No provider request, backend route, percentage-return or atomic-snapshot claim, persistence, recommendation, account, order, or execution behavior is added.
- **M9.47 — complete:** selected-market research maps the existing binary price-change response into four provenance cards that retain outcome/boundary identity, exact price, actual observation time, resolution, and exact-requested-time status. No provider request, backend route, historical trade/quote claim, persistence, recommendation, account, order, or execution behavior is added.
- **M9.48 — complete:** the dashboard replaces its increasingly dense single-page anchor navigation with a responsive persistent side navigation and three browser-local hash routes for overview, Polymarket, and new-listing research. The visual system raises contrast, text size, spacing, and panel hierarchy without changing API requests, refresh behavior, financial semantics, provider controls, or execution boundaries.
- **M9.49 — complete:** the Polymarket dashboard independently loads one bounded page of six active public events and displays their identity, optional schedule, and restricted status separately from market discovery. Event failure does not hide active markets, and the view adds no event selection, nested-market expansion, volume request, pagination, ranking, persistence, account, order, or execution behavior.
- **M9.50 — complete:** explicit active-event selection loads the existing public detail contract and displays description, lifecycle, nullable resolution source, local receipt time, and referenced-market count with stale-response suppression and provider-disable cleanup. Returned market references remain unexpanded, and no tags, volume, prices, liquidity, outcomes, accounts, orders, or execution behavior are added.
- **M9.51 — complete:** selected-event research independently loads the existing bounded direct event-tag contract and displays label, slug, or identity fallbacks with isolated empty and unavailable states. It adds no related-tag traversal, discovery filtering, nested-market expansion, ranking, persistence, recommendation, account, order, or execution behavior.
- **M9.52 — complete:** selected-event research independently loads the existing public Data API live-volume aggregate and displays exact total taker volume in shares, reported market-row count, and local receipt time. It does not expose the condition breakdown, infer a measurement window or USDC turnover, or add trades, holders, positions, persistence, recommendations, accounts, orders, or execution behavior.
- **M9.53 — complete:** selected-event research displays an eight-item sample of already-normalized market references in provider order with identity, question/slug fallback, and open/closed state. It adds no provider request, market expansion, price, liquidity, volume, outcome, ranking, recommendation, account, order, or execution behavior.
- **M9.54 — complete:** selected-event research correlates at most eight provider-ordered live-volume rows to embedded event market references by condition identity and displays exact taker-volume shares with an explicit unidentified fallback. It adds no provider request, browser-side aggregation, time-window inference, USDC conversion, trade detail, ranking, recommendation, account, order, or execution behavior.

## M10 — Agentic Wallet / Real Trading — planned

Research current official Binance documentation before design. Real trading requires multiple independent safeguards and explicit user confirmation immediately before the first real order.

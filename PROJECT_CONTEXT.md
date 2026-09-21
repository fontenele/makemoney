# Project Context

This file is the mandatory starting point for work on Crypto Trader. Read it together with `AGENTS.md` and `docs/maps.md` before making changes.

## Purpose

Crypto Trader is a personal, local platform for collecting cryptocurrency market data, realistic paper trading, deterministic strategy research, backtesting, and risk-controlled experimentation. The initial goal is trustworthy data and simulation, not profit.

## Current position

- Completed milestones: **M0 — Bootstrap**, **M1 — Market Data**, **M2 — Paper Wallet**, **M3 — Paper Trading**, **M4 — Risk Engine**, **M5 — Strategies**, and **M6 — Backtesting (M6.1–M6.32)**.
- M6 is closed. M7.1–M7.81 load, persist, conservatively compare, periodically refresh, durably classify detections, expose filtered research reads, durably schedule/lease/complete observation checkpoints, load and persist public Binance rolling-ticker observations, provide a disabled-by-default lifecycle worker, expose completed timelines and exact performance, aggregate bounded cohorts, calculate and expose explicitly thresholded pump/correction classifications, aggregate their descriptive rates, compose those statistics over a bounded durable cohort, expose that aggregate through a local read-only API, calculate exact median observed pattern magnitudes, compose and expose those magnitudes over the durable cohort, calculate, compose, and expose median observed pattern timing, calculate, durably compose, and expose descriptive rolling-window market activity by checkpoint, and define, publicly load, dependency-register, internally compose, durably store, reload, expose, atomically checkpoint, opt-in collect, purely aggregate, durably compose, expose, derive, compose, locally expose, purely aggregate, durably compose, locally expose, derive, durably compose, locally expose, purely aggregate, durably compose, and locally expose exact T+0-relative evolution for listing top-of-book imbalance snapshots, then purely derive, durably compose, locally expose, purely aggregate, durably aggregate, locally expose, explicitly classify, durably classify, locally expose, purely aggregate, and durably aggregate T+0-relative spread widening.
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

M5.2 distributes normalized candles through a process-local feed and evaluates M5.1 once for each new closed candle. It retains six closed candles, suppresses duplicate or out-of-order close times, and logs signals without persistence or execution.

M5.3 retains the latest generated signal in memory and exposes it at `GET /strategies/signals/latest`. The route returns 503 before the first evaluation and cannot mutate or execute anything.

M5.4 configures the moving-average periods at startup with validated, bounded positive integers and a strict short-before-long relationship. The strategy declares its required history size, which bounds live in-memory retention.

M5.5 retains at most 100 generated signals in process memory and exposes them newest first at `GET /strategies/signals`, with an optional limit from 1 through 100 and a default of 50. The existing latest-signal route reads the same model.

M5.6 persists generated signals in PostgreSQL with idempotency by strategy, symbol, and candle close time. Recent and latest routes now read durable data and survive restarts; persistence failure is logged without creating any execution path.

M6.1 replays a caller-supplied sequence of normalized closed BTC/USDT one-minute candles through the configured strategy. It validates chronological uniqueness and evaluates candle by candle with bounded history, so future candles are never exposed. The deterministic result contains the ordered signal timeline and buy, sell, and hold counts; it performs no trade simulation, financial calculation, data retrieval, persistence, or execution.

M6.2 loads one bounded UTC range of public Binance Spot BTC/USDT one-minute klines behind a provider-neutral contract and passes normalized closed candles to M6.1. Requests and payloads are strictly validated, the limit and time span are capped at 1,000, and the current open candle is excluded. It adds no persistence, HTTP route, trade simulation, or execution.

M6.3 preserves the complete provider-neutral historical OHLCV candle, including taker-buy volumes and trade count. Positive-price, non-negative-volume, and high/low coherence rules use exact decimal arithmetic. Historical replay projects only the required close-price view into the strategy, leaving the complete candle available for a future separately approved execution model.

M6.4 separately consumes replayed signals and complete candles to create research-only hypothetical fills at the following candle's open. It models one fixed-quantity long position, explicit taker fees, fee-inclusive entry cost, net exit proceeds, and net PnL per closed trade with exact decimal arithmetic. It exposes ignored redundant signals, terminal signals without a future candle, and an open ending position. It creates no order and cannot reach a wallet, executor, operational Risk Engine, or exchange account.

M6.5 derives aggregate realized performance directly from the M6.4 ledger and closed trades. It reports fill and outcome counts, nullable realized win rate, gross profit, absolute gross loss, realized net PnL, and all simulated fill fees, including the entry fee of an ending open position. It deliberately excludes unrealized valuation and mark-to-market assumptions.

M6.6 values an ending open position at the final historical candle close without creating a synthetic sell. It estimates the exit fee and exposes gross market value, net liquidation value, unrealized net PnL, and total net PnL with exact decimal arithmetic. A simulation ending flat has no ending valuation.

M6.7 measures closed-trade quality with average net PnL, average profitable and losing results, expectancy, and profit factor. Statistics are nullable when their required sample or denominator is absent, and an ending open position never enters the sample.

M6.8 builds a chronological realized PnL curve at trade exits and measures maximum absolute realized drawdown from the zero baseline or a prior peak. It exposes drawdown start, trough, and recovery when observed. Open-position valuation does not enter this realized-only curve.

M6.9 requires explicit positive initial USDT capital, maintains a cash ledger, rejects hypothetical buys whose fee-inclusive cost exceeds available cash, and exposes final cash, ending position net value, final equity, net return, and ROI. Quantity remains fixed and no borrowing or negative cash is allowed.

M6.10 reconstructs cash and position from the fill ledger at every historical candle, applies opening fills before that candle's closing mark, and exposes a fee-adjusted equity curve. It measures maximum absolute and percentage equity drawdowns with start, trough, and observed recovery, and reconciles the last point with final equity.

M6.11 applies explicit deterministic spread and slippage rates adversely to hypothetical fills. Half the configured full spread plus the complete slippage rate raises buy prices and lowers sell prices, while each fill retains the unadjusted next-candle open as its reference price. Capital checks, fees, PnL, ROI, and equity consume the effective fill prices.

M6.12 derives the tested-period duration, closed-trade holding durations, total time in market, exposure rate, and average closed-trade holding duration from historical candle and fill timestamps. An ending open position remains exposed through the final candle close; empty or zero-duration samples expose explicit nullable ratios.

M6.13 requires an explicit provider-neutral historical execution-rule snapshot with minimum and maximum quantity, step size, and minimum notional. Fixed quantity is validated before simulation, while potential buy and sell fills below minimum notional remain unfilled and are counted without mutating capital or position state.

M6.14 extends that snapshot with tick size and rounds post-spread/slippage prices conservatively: buys upward and sells downward. Fills retain reference, pre-rounding adjusted, and final executable prices; all financial results use the final price, and a sell rounded to zero remains unfilled.

M6.15 adds explicit positive minimum and maximum prices to the historical rule snapshot. A tick-aligned potential fill outside the inclusive range remains unfilled with dedicated accounting and no capital, position, or ledger mutation; minimum notional is evaluated only after the price range passes.

M6.16 requires an explicit positive maximum volume-participation rate and caps each all-or-none hypothetical fill against the fully closed signal candle's base volume. It never reads the following execution candle's volume, preserving causal replay. Liquidity rejection has dedicated accounting, preserves state, and accepted fills retain the reference volume and calculated maximum quantity for audit.

M6.17 raises the provider-neutral historical request ceiling to 10,000 BTC/USDT one-minute candles while the Binance adapter performs sequential pages of at most 1,000. Pagination advances from the last accepted open time, stops on an empty or partial page, validates every page, preserves cancellation, and returns only the globally bounded ordered result to replay.

M6.18 gives each historical Binance page at most three total attempts for network failures, HTTP 429, and HTTP 5xx. Retry waits use bounded exponential backoff or a valid provider `Retry-After` capped at 30 seconds, remain caller-cancelable, and never retry permanent HTTP 4xx responses or malformed successful payloads.

M6.19 adds a process-local historical Binance circuit breaker. Three page failures that exhaust M6.18 retries open it for 30 seconds; calls fail before HTTP while open, and only one half-open probe may run after cooldown. Probe success closes and resets the circuit, while probe failure reopens it. Cancellation, permanent HTTP responses, invalid requests, and invalid successful payloads do not count.

M6.20 persists each completely loaded, normalized closed-candle batch in PostgreSQL before replay or simulation begins. The composite symbol/interval/open-time identity is idempotent only for exact content; conflicting content aborts the serializable transaction. Decimal fields remain exact validated text, and the freshly loaded batch still drives replay without cache reads.

M6.21 adds explicit internal stored-only replay and simulation paths. The repository reads BTC/USDT one-minute rows chronologically within the same bounded request contract and validates every persisted field before mapping it back to the domain. Stored paths never call Binance, never fall back silently, and operate only on the records actually found without claiming range completeness.

M6.22 makes the existing remote replay and simulation paths cache-first. A pure coverage check derives the exact minute-aligned sequence implied by the bounded request; complete stored ranges bypass Binance and persistence, while any missing or displaced minute falls back to the existing full remote load and write-through. Stored-only operations remain unchanged.

M6.23 replaces full-range cache misses with sequential loading of only contiguous missing minute ranges. Fetched gaps are combined with stored candles only after exact complete coverage is proven, and all fetched candles persist through one existing transactional batch before replay. Incomplete recovery fails explicitly.

M6.24 exposes deterministic historical signal replay through local `POST /backtesting/replay`. The strict body supplies UTC start/end timestamps and a 1–10,000 limit while symbol and interval remain fixed to BTC/USDT one minute. It may populate the public-candle cache but has no wallet, order, or execution access.

M6.25 exposes the complete research-only simulator through local `POST /backtesting/simulate`. Its strict explicit configuration is validated before historical loading and includes fixed quantity, fees, spread, slippage, volume participation, initial fictional capital, and a provider-neutral execution-rule snapshot. It cannot mutate the paper wallet or submit an order.

M6.26 adds immutable PostgreSQL simulation-run snapshots through `POST /backtesting/runs`. A required idempotency key and canonical request fingerprint replay identical requests without recalculation, reject conflicting reuse, and preserve the complete serialized request and result with exact decimal strings and UTC dates.

M6.27 exposes one stored simulation snapshot by UUID through read-only `GET /backtesting/runs/:id`. Retrieval returns only the immutable public artifact, never recalculates or contacts Binance, and distinguishes invalid identity, absence, and operational failure.

M6.28 exposes recent stored simulation snapshots through read-only `GET /backtesting/runs`, ordered deterministically by newest creation time and UUID with a validated 1–100 limit and default of 50. It returns stored artifacts only and does not recalculate or contact Binance.

M6.29 extends the same array response with an optional UUID cursor taken from the last received run. The cursor resolves to its immutable creation time and ID, and the next query returns only older sort pairs; malformed or missing cursor identities fail explicitly without offset pagination.

M6.30 adds inclusive canonical UTC `createdFrom` and `createdTo` filters to the persisted-run list. Filters compose with limit and cursor, and cursors outside the selected interval are rejected.

M6.31 adds explicit deletion of one stored simulation snapshot by UUID through `DELETE /backtesting/runs/:id`. Absence remains distinct from operational failure, and historical candles are preserved.

M6.32 isolates E2E persistence in a disposable `crypto_trader_e2e` PostgreSQL schema, propagates configured schemas consistently to generated Prisma queries and raw transactional SQL, and closes M6 with the complete 40-test E2E suite green without touching local application data.

M7.1 loads one public Binance exchange-information snapshot at startup, strictly normalizes USDT symbols and Spot availability, and retains the ordered catalog in memory. It does not yet compare snapshots, persist observations, expose a route, score assets, or trade.

M7.2 transactionally persists catalog observations by provider and symbol. It preserves the first application observation and updates the latest observation and current provider state without claiming an official listing timestamp.

M7.3 compares each successful observation with the durable provider baseline in the same serializable transaction. The first population is baseline-only; later symbols absent from that baseline are retained in memory as newly observed. It adds no polling, route, alert, score, signal, or trading behavior.

M7.4 refreshes the public catalog sequentially on a validated configurable interval, defaulting to one minute. Refresh failure leaves the last successful state intact and schedules another attempt; shutdown cancels both the active request and pending timer. It adds no route, alert, score, signal, or trading behavior.

M7.5 stores an immutable nullable `detectedAt` on each observed symbol. Baseline rows and pre-existing migrated rows remain null; only symbols first seen after a provider baseline exists receive the current observation time. This is an application detection time, not an official exchange listing time.

M7.6 exposes recent durable detections newest first at `GET /new-listings`, with optional `limit` from 1 through 100 and a default of 50. It is local and read-only and exposes no baseline rows or mutation path.

M7.7 adds optional inclusive canonical UTC `detectedFrom` and `detectedTo` filters to the same bounded route. Inverted or malformed ranges fail validation before database access.

M7.8 adds stable keyset pagination using a canonical provider/symbol cursor resolved to the immutable detection sort position. Invalid, missing, baseline-only, or filter-incompatible cursors fail explicitly.

M7.9 adds strict optional filters for provider, current provider status, and current Spot-trading availability. Filters compose with the existing time window and cursor contract.

M7.10 exposes a read-only filtered summary containing the matching durable application-detection count and nullable earliest/latest detection times. It does not collect or infer market performance.

M7.11 extends that summary with deterministic counts grouped by current provider status and current Spot-trading availability, read consistently in one database transaction.

M7.12 defines pure detection-relative targets at T+0, 5s, 10s, 30s, 1m, 5m, 15m, 1h, and 24h. It does not schedule work or collect market samples.

M7.13 persists all nine targets atomically with each new detection and safely backfills already detected rows. It does not process checkpoints.

M7.14 provides a bounded deterministic internal read of checkpoints due by an explicit time. It does not claim or process work.

M7.15 validates due-read time and a strict 1–100 batch limit before repository access.

M7.16 atomically leases bounded due-checkpoint batches in PostgreSQL, excludes active claims, and permits abandoned work to be reclaimed after lease expiry. It does not run a worker or request market data.

M7.17 records terminal completion only for a matching active lease and excludes completed checkpoints from all future due work. It does not run a worker or request market data.

M7.18 validates bounded checkpoint-worker interval, batch, and lease settings at startup and injects one options contract. It does not activate a worker or request market data.

M7.19 deterministically orchestrates one claimed batch through a caller-supplied processor and ownership-safe completion. No timer or production processor invokes it, and it requests no market data.

M7.20 defines and validates the provider-neutral market snapshot required by a checkpoint: canonical provider symbol, positive last price, non-negative base and quote volumes, safe trade count, provider window times, and local receive time. Decimal values remain strings and no provider adapter, persistence, processor, or timer is active.

M7.21 implements that boundary with the unauthenticated public Binance Spot 24-hour ticker endpoint for one explicitly validated symbol. Responses are normalized and domain-validated with a ten-second timeout and caller cancellation; no checkpoint invokes the client automatically and no observation is persisted.

M7.22 stores a validated market observation in the same ownership-checked update that completes its checkpoint. Database constraints require an all-or-none observation payload on completion, while legacy lifecycle-only completions are reopened for future real collection. No production processor or timer invokes this flow automatically.

M7.23 provides the production processor that maps a claimed checkpoint to the provider-neutral observation request and returns the validated public snapshot to the cycle. It propagates provider failure to the cycle's existing lease-expiry recovery policy, but no timer invokes the processor automatically.

M7.24 adds a completion-relative, non-overlapping lifecycle worker with clean timer shutdown and cycle-failure recovery. `NEW_LISTINGS_CHECKPOINT_WORKER_ENABLED` defaults to `false`, so upgrades do not begin external collection until the operator opts in explicitly.

M7.25 exposes completed checkpoint observations oldest target first at `GET /new-listings/:provider/:symbol/observations`. It validates the durable detection identity, preserves exact decimal strings, distinguishes invalid and unknown identities, and returns an empty array when the detected symbol has no completed checkpoint.

M7.26 defines a pure deterministic price-performance calculator over one completed observation timeline. It uses only the explicit `T+0` checkpoint as baseline, returns unavailable until that checkpoint exists, and derives exact absolute price change and return rate for each collected point without persistence or HTTP exposure.

M7.27 exposes that calculation at `GET /new-listings/:provider/:symbol/performance`. The local read-only route returns `503` until `T+0` is complete, preserves `404` for an unknown durable detection, and performs no derived persistence or classification.

M7.28 defines a pure cross-detection cohort calculator. It groups available T+0-relative returns by checkpoint and reports each sample size, positive/negative/flat counts, and exact-decimal average while keeping unequal checkpoint coverage explicit.

M7.29 loads at most 100 recent durable detections with completed T+0 baselines and composes their validated timelines through the per-detection and cohort calculators. It remains internal and exposes no new route.

M7.30 exposes that durable aggregate through local read-only `GET /new-listings/performance`, with an optional 1–100 limit and Binance-only provider validation.

M7.31 defines a pure exact-decimal classification of observed pump and post-pump correction patterns. Both thresholds are explicit inputs, so the project does not silently encode an unverified universal market hypothesis.

M7.32 composes one durable detected-symbol timeline through exact performance and explicit pattern classification internally. Missing T+0 remains unavailable and no derived classification is persisted or exposed over HTTP.

M7.33 exposes that classification at local read-only `GET /new-listings/:provider/:symbol/classification`. Both thresholds are required per request; invalid input returns 400, unknown detections return 404, and missing T+0 returns 503.

M7.34 aggregates same-threshold pattern classifications into explicit counts and exact pump/correction rates. Empty samples and correction-within-pump denominators remain explicit rather than being fabricated.

M7.35 loads the bounded durable T+0-eligible cohort, applies one explicit valid threshold pair to each timeline, and aggregates the resulting classifications on demand without a route or derived persistence.

M7.36 exposes that bounded aggregate at `GET /new-listings/classification`. Thresholds remain mandatory and explicit; the endpoint adds no default hypothesis or derived persistence.

M7.37 calculates exact median peak-return and correction-from-peak magnitudes over independently sampled observed events as a pure internal research rule.

M7.38 applies the M7.37 magnitude calculation to the bounded durable T+0-eligible cohort through the internal read model without exposing another route.

M7.39 exposes those median magnitudes at `GET /new-listings/classification/magnitudes`, retaining mandatory explicit thresholds and independent event sample sizes.

M7.40 calculates median time from T+0 to the first observed pump and from the post-pump peak to correction as a pure internal research rule.

M7.41 applies the M7.40 timing calculation to the bounded durable T+0-eligible cohort through the shared internal classification pipeline without exposing another route.

M7.42 exposes those timing medians at `GET /new-listings/classification/timing` with the same explicit thresholds and bounded cohort inputs.

M7.43 calculates exact average rolling-24-hour base volume, quote volume, and trade count by observation checkpoint as a pure market-activity cohort rule. It does not claim order-book liquidity.

M7.44 applies the M7.43 activity calculation to the bounded durable T+0-eligible cohort internally without exposing another route.

M7.45 exposes that descriptive activity cohort at `GET /new-listings/activity` with optional bounded limit and Binance provider inputs.

M7.46 defines a validated provider-neutral top-of-book observation and loader boundary for arbitrary canonical listing symbols without activating a provider adapter or collection lifecycle.

M7.47 derives exact absolute spread, midpoint, and spread basis points from one validated listing top-of-book observation without loading or persisting data.

M7.48 implements the inactive public Binance Spot depth-snapshot adapter for one explicit listing symbol, normalizing only its best level with timeout and cancellation.

M7.49 registers that adapter behind its provider-neutral dependency token while leaving it without any active consumer or lifecycle behavior.

M7.50 composes the provider and exact spread calculator behind an explicit internal service call, still without automatic collection, persistence, or HTTP exposure.

M7.51 adds immutable exact-text top-of-book storage keyed to an existing listing checkpoint, behind a provider-neutral repository that is not yet invoked by the worker.

M7.52 reloads a detection's stored top-of-book checkpoint timeline in canonical schedule order with strict persisted-data validation and no HTTP exposure.

M7.53 exposes that durable timeline through local read-only `GET /new-listings/:provider/:symbol/top-of-book` without triggering collection.

M7.60 composes the exact imbalance rule over one detected symbol's canonical durable top-of-book timeline while preserving checkpoint metadata. HTTP exposure remains separate.

M7.61 exposes that derived durable imbalance timeline through local read-only `GET /new-listings/:provider/:symbol/top-of-book/imbalance` without triggering collection or persisting derived values.

M7.62 purely aggregates exact imbalance by checkpoint with separate observed, available, and unavailable sample counts. Durable loading and HTTP exposure remain separate.

M7.63 composes that exact cohort rule over the bounded durable T+0-book-eligible selection. HTTP exposure remains separate.

M7.64 exposes the bounded durable imbalance cohort through local read-only `GET /new-listings/top-of-book/imbalance` with no collection or derived persistence.

M7.65 purely derives exact imbalance changes relative to an available T+0 book baseline. Durable composition and HTTP exposure remain separate.

M7.66 composes that exact evolution over one detected symbol's durable stored-book timeline. HTTP exposure remains separate.

M7.67 exposes durable T+0-relative imbalance evolution through a local read-only per-detection route with explicit unavailable semantics.

M7.68 purely aggregates validated per-detection imbalance evolutions into exact checkpoint averages with explicit available and unavailable sample coverage.

M7.69 composes imbalance-evolution statistics over the bounded durable T+0-book cohort while excluding members without a usable T+0 imbalance baseline.

M7.70 exposes that bounded durable imbalance-evolution cohort through a local read-only route with shared provider and limit validation.

M7.71 purely derives exact checkpoint spread-basis-point changes from an explicitly present T+0 top-of-book baseline.

M7.72 composes that exact spread evolution over one detected symbol's canonical durable stored-book timeline.

M7.73 exposes durable T+0-relative spread evolution through a local read-only per-detection route with explicit unavailable semantics.

M7.74 purely aggregates exact spread-evolution changes by checkpoint with explicit independent sample coverage.

M7.75 composes that spread-evolution aggregate over a bounded recent durable cohort with usable stored T+0 books.

M7.76 exposes the bounded durable spread-evolution cohort through a local read-only route.

M7.77 purely classifies observed spread widening against an explicit positive basis-point threshold without choosing a market hypothesis.

M7.78 composes that explicit-threshold classification over one detected symbol's canonical durable stored-book timeline.

M7.79 exposes that on-demand classification through a validated local read-only route requiring the widening threshold on every request.

M7.80 purely aggregates explicit-threshold spread-widening classifications into exact observed/not-observed counts and an exact observed rate.

M7.81 composes those statistics over the bounded recent durable T+0-book cohort after validating the limit and explicit threshold before repository access.

M6 satisfies its complete acceptance scope. Bulk run deletion, automatic retention, additional filtering, cache refresh or expiry, overwriting stored candles, parallel gap loading, cursor-paginated signal history, variable position sizing, BRL conversion, order mutation APIs, order-book/depth liquidity, partial fills, persisted circuit state, risk-adjusted or annualized performance statistics, authenticated APIs, and real execution are optional post-milestone enhancements. They require separately planned milestones and approval and are not unfinished M6 work.

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
- `docs/backtesting.md`: M6.1 deterministic replay contract, no-lookahead boundary, result, and deferred scope.
- `docs/new-listings.md`: M7 public catalog baseline and deferred detection scope.

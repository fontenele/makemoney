# Technical Decisions

## 2026-09-20 — Derive durable spread classification on demand

M7.78 validates the caller's positive widening threshold before repository access and composes the existing durable book timeline, exact spread evolution, and pure classifier. Unknown detection remains distinct from missing T+0, and no mutable classification projection is stored.

## 2026-09-20 — Require an explicit threshold for spread widening

M7.77 treats widening as an observed descriptive condition, not a score or prediction. The caller must provide a positive basis-point threshold; the classifier records the first qualifying checkpoint and the maximum observed T+0-relative change. A timeline that has not crossed the threshold remains explicitly `no-widening-observed` rather than implying future behavior.

## 2026-09-20 — Expose bounded spread evolution without derived storage

M7.76 follows the established aggregate API contract: provider defaults to Binance, limit defaults to 50 and is bounded at 100, and invalid input fails before repository access. The result is calculated from stored books on every request so checkpoint coverage remains current without a projection table or cache lifecycle.

## 2026-09-20 — Reuse the bounded durable book cohort for spread evolution

M7.75 composes existing repository selection, per-detection spread evolution, and pure cohort aggregation instead of adding a query or projection table. The limit is validated before persistence access, the repository bounds recent T+0-eligible detections, and any timeline that still cannot produce a T+0 evolution is omitted defensively.

## 2026-09-20 — Aggregate spread evolution with independent checkpoint coverage

M7.74 averages exact basis-point changes only where each detection has a stored checkpoint. Every aggregate checkpoint exposes its own sample size, missing later checkpoints are not filled, and each input evolution must have a coherent explicit T+0 baseline and a unique symbol. The calculation remains pure and uses isolated 40-digit decimal arithmetic.

## 2026-09-20 — Expose spread evolution with baseline availability semantics

M7.73 mirrors the per-detection imbalance-evolution API: malformed identity is 400, unknown detection is 404, and an existing detection without a stored T+0 book is 503. The route derives from stored books on demand and cannot trigger collection or persist results.

## 2026-09-20 — Derive durable spread evolution on demand

M7.72 reuses the canonical stored-book timeline and the M7.71 pure calculator rather than persisting another projection. Unknown detection remains distinct from a known detection without a T+0 book, and newly stored checkpoints affect the next calculation immediately.

## 2026-09-20 — Express spread evolution as a basis-point difference

M7.71 subtracts the T+0 spread in basis points from each later checkpoint rather than calculating a proportional return on spread. This preserves the already normalized cross-asset unit, makes tightening negative and widening positive, and remains defined when the T+0 book is locked at zero spread. Missing T+0 makes the evolution unavailable.

## 2026-09-20 — Expose evolution cohorts with analytical eligibility

M7.70 exposes the M7.69 on-demand result through the same optional `provider=binance` and `limit=1..100` contract as other listing cohorts. The response detection count represents only members with a usable T+0 imbalance baseline, while checkpoint fields retain available and unavailable change coverage; the route cannot trigger collection or persist derived values.

## 2026-09-20 — Reuse the bounded T+0-book cohort for evolution research

M7.69 reuses the existing newest-first durable selection, so PostgreSQL applies the requested 1–100 limit before derived calculation. A stored T+0 book with zero displayed notional has no imbalance baseline and is excluded from the analytical detection count rather than converted to zero; later unavailable checkpoints remain explicit within otherwise eligible evolutions.

## 2026-09-20 — Preserve availability in imbalance-evolution cohorts

M7.68 averages only validated available T+0-relative imbalance changes at each checkpoint. Every checkpoint independently reports total evolution coverage, available-change coverage, and unavailable changes; missing values never become neutral zero. Inputs must prove that each available change exactly equals its rate minus the declared T+0 baseline before aggregation.

## 2026-09-20 — Expose imbalance evolution with baseline availability semantics

M7.67 mirrors the existing per-detection performance API: malformed identity is 400, unknown detection is 404, and an existing detection without an available T+0 analytical baseline is 503. The route derives from stored books on demand and cannot trigger collection or persist results.

## 2026-09-20 — Derive durable imbalance evolution on demand

M7.66 reuses the canonical stored-book timeline and the M7.65 pure calculator rather than persisting another projection. Unknown detection remains distinct from a known detection whose T+0 imbalance is unavailable, and newly stored checkpoints affect the next calculation immediately.

## 2026-09-20 — Anchor imbalance evolution only to available T+0

M7.65 uses the scheduled T+0 imbalance as the sole baseline and subtracts it from each available checkpoint rate with isolated exact-decimal arithmetic. Missing or zero-notional T+0 makes the evolution unavailable; unavailable later books remain explicit `null` points and are never forward-filled.

## 2026-09-20 — Expose imbalance cohorts with their denominators

M7.64 publishes the bounded on-demand aggregate without hiding availability. The route retains total stored-book, calculable imbalance, and zero-denominator counts per checkpoint, reads PostgreSQL only, and cannot activate provider collection or convert the descriptive metric into a score or signal.

## 2026-09-20 — Reuse T+0-book eligibility for imbalance cohorts

M7.63 uses the same bounded newest-first durable cohort selected for top-of-book statistics. Requiring a stored T+0 book gives every selected detection an explicit baseline checkpoint while later books remain independently optional; no second repository query or derived storage lifecycle is introduced.

## 2026-09-20 — Keep imbalance cohort availability explicit

M7.62 averages only defined level-one imbalance rates. Every checkpoint separately reports stored-book coverage, calculable imbalance coverage, and unavailable zero-denominator books, so missing information cannot be silently converted into a neutral value or hidden in the average denominator.

## 2026-09-20 — Expose stored-book imbalance without activating collection

M7.61 exposes the existing on-demand imbalance composition through a local read-only route. It mirrors the raw stored-book timeline's identity, not-found, and empty-result semantics, while retaining `null` for a zero displayed book and never invoking Binance or storing derived metrics.

## 2026-09-20 — Derive imbalance from canonical durable books on demand

M7.60 reuses the stored top-of-book timeline rather than persisting duplicate derived values. Each result keeps its schedule metadata and applies the M7.59 calculator independently, so absent checkpoints remain absent and a zero displayed book remains explicitly unavailable.

## 2026-09-20 — Treat zero displayed book as unavailable imbalance

M7.59 defines level-one imbalance as `(bid quote notional - ask quote notional) / total displayed quote notional`. A one-sided book produces the exact boundary `-1` or `1`; when both displayed quantities are zero, the denominator has no information and the result is `null` rather than a fabricated neutral zero.

## 2026-09-20 — Expose durable book aggregates without triggering collection

M7.58 exposes only the on-demand aggregate of already stored snapshots. `GET /new-listings/top-of-book` cannot invoke Binance or activate the worker, uses the same bounded cohort parameters as the other research endpoints, and preserves independent checkpoint sample sizes.

## 2026-09-20 — Require durable T+0 book eligibility before cohort selection

M7.57 selects and limits recent detections in PostgreSQL only when a stored T+0 top-of-book record exists. Later checkpoint books remain independently optional, so their sample sizes may decrease honestly rather than inheriting or fabricating observations. Calculation remains on demand and is not persisted.

## 2026-09-20 — Compare displayed book value in quote-asset units

M7.56 aggregates bid and ask `price × quantity` in quote-asset units rather than averaging raw base-asset quantities across different listed assets. Spread is normalized in basis points. Both remain descriptive level-one snapshots: they are not depth, fill capacity, or guaranteed executable liquidity.

## 2026-09-20 — Collect ticker and top-of-book as one checkpoint result

The production processor loads the two independent public snapshots concurrently and returns no partial result if either fails. The cycle always sends that combined result to the M7.54 transaction, so durable checkpoint completion cannot omit its corresponding top-of-book record. This changes only the already opt-in worker path; collection remains disabled by default.

## 2026-09-20 — Checkpoint completion and book insertion share one transaction

M7.54 adds a separate atomic completion primitive rather than storing the top-of-book before or after the existing completion call. The transaction first applies the ownership-safe checkpoint update; only a successful active-lease update inserts the immutable child book. A lost lease returns without insertion, while any child constraint or insertion failure rolls back the parent completion.

The existing completion path remains available and unchanged until the provider-backed processor can return both observations. This increment establishes the safe persistence boundary without activating another public request.

## 2026-09-20 — Top-of-book HTTP access is durable and read-only

M7.53 exposes only records already stored for a durable detection. The route shares the established provider/symbol validation and unknown-detection semantics, returns canonical checkpoint order, and represents absent collection as an empty array rather than provider unavailability.

Reading the route cannot call Binance or start collection. Symbols are capped at the database and domain limit of 30 canonical uppercase alphanumeric characters across detection timeline routes.

## 2026-09-20 — Durable top-of-book reads follow checkpoint schedule order

M7.52 reads all stored book rows for one validated provider/symbol identity and orders them by their canonical checkpoint offset, independent of database return order. Each child observation and its joined checkpoint metadata are revalidated at the persistence boundary; malformed durable state fails instead of being partially returned.

The timeline is bounded naturally by the nine checkpoint identities and returns an explicit empty array when nothing has been collected. HTTP exposure and worker collection remain separate increments.

## 2026-09-20 — Checkpoint top-of-book storage is separate and immutable

M7.51 stores top-of-book observations in an optional child table keyed by the existing checkpoint identity instead of expanding the checkpoint's completion invariant. This lets historical completed ticker observations remain valid and prevents top-of-book collection from silently redefining completion.

Update IDs, prices, and quantities are stored as validated text so persistence does not truncate the provider-neutral decimal contract. PostgreSQL enforces the decimal shapes, positive prices, non-negative quantities, and non-crossed books. Create-only repository behavior makes a checkpoint snapshot immutable; worker integration remains separate.

## 2026-09-20 — Top-of-book loading and spread calculation compose internally

M7.50 introduces one small application service that delegates snapshot loading to the provider-neutral boundary and exact arithmetic to the existing spread calculator. The service passes caller cancellation unchanged, propagates provider failure, and cannot calculate when no observation was loaded.

The composition is registered but has no lifecycle hook or presentation adapter. Automatic sampling, durable storage, HTTP exposure, and any use in scoring or execution remain separate decisions.

## 2026-09-20 — Listing top-of-book provider is registered but inert

M7.49 registers the M7.48 Binance adapter behind `LISTING_TOP_OF_BOOK_OBSERVATION_PROVIDER` and constructs it from the already validated public REST base URL. The token preserves the provider-neutral application boundary without exposing the concrete client to future consumers.

Registration alone starts no request and creates no lifecycle behavior. Selecting a consumer, persistence model, collection schedule, or public route remains a separate increment.

## 2026-09-20 — Public listing top-of-book uses the depth snapshot

M7.48 uses Binance Spot `GET /api/v3/depth?limit=5` instead of `bookTicker` because the depth response includes `lastUpdateId`, preserving the M7.46 snapshot identity. The adapter intentionally keeps only the first bid and ask; consuming the remaining levels would silently introduce a depth model outside this increment.

One explicit symbol bounds response size and provider weight. The request is public, timeout-bound, caller-cancelable, and strict about both transport shape and domain invariants. No provider body is included in status errors; M7.49 registers the adapter but leaves it without an active consumer.

## 2026-09-20 — Listing spread is derived from one validated snapshot

M7.47 calculates absolute spread, midpoint, and basis points only after the M7.46 contract validates identity, prices, quantities, update ID, and receive time. An isolated 40-digit half-even `decimal.js` context avoids native floating-point arithmetic, and the result retains the complete level-one provenance required to interpret the metric.

Zero spread is valid for a locked positive book. The calculation makes no claim about deeper levels, price impact, slippage, or actual fillability; provider loading and durable sampling remain separate concerns.

## 2026-09-20 — Listing liquidity starts with a separate top-of-book boundary

M7.46 does not generalize the existing BTC/USDT streaming model because that contract is intentionally fixed to M1's live pair. New-listing research instead receives a provider-neutral request/observation boundary for arbitrary canonical symbols. It preserves exact public bid/ask values and displayed quantities, rejects crossed books, and allows locked books or zero quantities without pretending they guarantee execution.

Provider transport, snapshot loading, spread derivation, depth, persistence, and checkpoint integration remain separate increments. This keeps an eventual Binance adapter replaceable and prevents rolling ticker volume from being conflated with actual displayed top-of-book state.

## 2026-09-20 — Market activity has a descriptive endpoint

M7.45 exposes the durable aggregate at `GET /new-listings/activity`, separate from price performance and pattern-classification endpoints. The route accepts only the shared bounded cohort inputs because the persisted rolling-ticker values require no research threshold. Its public description explicitly distinguishes rolling turnover from spread, depth, price impact, or executable liquidity.

## 2026-09-19 — Durable activity reuses the T+0-eligible cohort

M7.44 uses the existing bounded repository selection for recent detections with completed `T+0`, then passes their raw completed timelines directly to the M7.43 activity calculator. This preserves one durable population across checkpoint research while allowing incomplete later checkpoints to retain independent sample sizes. The aggregate is calculated on demand, remains unpersisted, and is still not an order-book liquidity measure.

## 2026-09-19 — Rolling ticker volume is market activity, not liquidity

M7.43 aggregates the exact rolling-24-hour base volume, quote volume, and trade count already captured at each checkpoint. These values describe turnover and activity but cannot establish executable size, spread, depth, or price impact, so the domain deliberately calls the result market activity rather than liquidity. Checkpoints retain independent sample sizes, arithmetic remains decimal-exact, and no missing observation is forward-filled.

## 2026-09-19 — Pattern timing has a separate research endpoint

M7.42 exposes timing medians at `GET /new-listings/classification/timing` instead of expanding the frequency or magnitude responses. The separate route keeps duration units and event-specific sample denominators explicit while reusing the same mandatory thresholds, provider, and bounded cohort limit. Results remain calculated on demand and unpersisted.

## 2026-09-19 — Durable timing reuses the shared classified cohort

M7.41 applies timing aggregation only after the same limit validation, threshold validation, durable T+0 eligibility, exact performance calculation, and classification used by frequency and magnitude research. This keeps all three views on the same population and threshold semantics while preserving one bounded repository read per call. Timing remains calculated on demand and unpersisted.

## 2026-09-19 — Pattern timing uses scheduled offsets and causal event anchors

M7.40 measures time to pump from T+0 to the first threshold-reaching checkpoint, while correction time starts at the post-pump peak rather than the initial pump checkpoint. This separates discovery latency from reversal latency. Only canonical scheduled offsets are accepted, corrections must occur after their peak, and absent events are excluded with independent sample sizes instead of being converted to zero durations.

## 2026-09-19 — Pattern magnitudes have a separate research endpoint

M7.39 exposes medians at `GET /new-listings/classification/magnitudes` instead of silently expanding the M7.36 frequency response. The separate route keeps event-specific sample denominators visible and lets clients request magnitude research explicitly under the same mandatory thresholds, provider, and bounded cohort limit. Results remain calculated on demand and unpersisted.

## 2026-09-19 — Durable frequency and magnitude cohorts share classification composition

M7.38 centralizes the internal sequence of cohort limit validation, explicit-threshold validation, durable T+0-eligible timeline loading, exact performance calculation, and classification. Both frequency and magnitude aggregation consume that same classification result shape, preventing their eligible populations or threshold semantics from drifting. Each API call still performs one bounded repository read, and no derived state is persisted.

## 2026-09-19 — Pattern magnitude medians use event-specific samples

M7.37 measures peak-return magnitude only among classifications with an observed pump and correction magnitude only among classifications with an observed correction. Missing events are excluded rather than converted to zero, and each median therefore publishes its own sample size. Even samples average the two middle exact-decimal values; no floating-point arithmetic, interpolation, persistence, or default hypothesis is introduced.

## 2026-09-19 — Aggregate pattern classification has no implicit thresholds

M7.36 mirrors the durable cohort-performance route at `GET /new-listings/classification`, but requires both research thresholds on every request. The API validates provider, limit, and thresholds before durable loading and returns the explicit empty aggregate when no detection has a completed T+0 observation. It does not persist results or establish a recommended market hypothesis.

## 2026-09-19 — Durable pattern cohorts reuse the existing T+0-eligible sample

M7.35 reuses the M7.29 repository selection instead of creating a second cohort query: recent detections qualify only when their `T+0` observation is complete, and the 1–100 limit is applied before timelines are loaded. The read model validates the explicit shared thresholds before database access, classifies every eligible timeline on demand, and delegates rate denominators to the pure M7.34 calculator. No derived classifications or aggregates are persisted.

## Modular monolith

The project remains a single NestJS application. Feature modules and provider boundaries are introduced only when required by an approved milestone.

## PostgreSQL host port 5433

Container-to-container communication uses PostgreSQL's standard port `5432`. Host access uses `5433` because another local project already binds `5432`.

## Prisma 7.10 with PostgreSQL adapter

Prisma CLI, client, and adapter are aligned on version 7.10. PostgreSQL is accessed through `@prisma/adapter-pg` and `pg`.

## NestJS 12 and Jest ESM execution

NestJS 12 packages use ESM. Jest runs through Node with `--experimental-vm-modules`, and ts-jest emits ES modules for tests.

## Financial and provider boundaries

External market providers must be encapsulated. Domain objects must not expose provider payload shapes. Strategies will produce signals, the Risk Engine will assess them, and only an executor may eventually submit an order. No executor exists in M0 or M1.1.

## M3.2 atomic and idempotent paper execution

The provider-neutral `TradingExecutor` contract is implemented only by `PaperTradingExecutor`. M3.2 supports a fixed BTC/USDT buy intent and requires a caller-supplied idempotency key. No real executor or authenticated provider is present.

The PostgreSQL repository performs the sufficient-USDT debit, BTC credit, and execution insert in one transaction. The execution ID is the idempotency key. A uniqueness conflict from a concurrent duplicate rolls its transaction back and returns the already committed execution, so balances change at most once.

Paper balances and executions use `DECIMAL(38,18)`. Quote values are validated to at most 18 fractional digits and calculated values are rounded half-even to the same scale before the transaction, keeping the returned execution and persisted balance mutation consistent.

## M3.3 non-executing market-sell quote

M3.3 mirrors the established buy-quote boundary without widening the executor. A BTC quantity is priced against the fresh best bid and its available top-level quantity. The returned USDT proceeds are gross notional minus the configured simulated taker fee.

The service deliberately does not read the paper wallet or execute a sale. This keeps quote validity dependent only on current public market data and pair rules; sufficient BTC and atomic balance mutation belong to a separately approved sell-execution increment.

## M3.4 side-specific paper execution settlement

The shared executor uses discriminated buy and sell intents. The execution record retains common price, quantity, notional, and fee fields while enforcing exactly one settlement amount: `totalCost` for a buy or `netProceeds` for a sell. This additive migration preserves every existing buy.

Sell execution uses the same transaction and idempotency guarantees as buying. It conditionally debits sufficient BTC, credits net USDT proceeds, and inserts the sell record atomically. A duplicate key rolls its attempted transaction back before replaying the committed result.

## M3.5 bounded read-only execution history

The first execution-history API is intentionally bounded rather than cursor-paginated. It returns the newest 50 records by default, accepts 1 through 100, and uses execution time plus ID as deterministic descending order. Cursor pagination is deferred until history volume or a client requires it.

The read model exposes all three audit timestamps and side-specific settlement values. It never exposes a write operation; internal execution remains unavailable over HTTP.

## M3.6 derived weighted-average paper position

Position state is derived on demand from immutable executions instead of adding another mutable table. The personal/local workload is currently small enough to favor replayable correctness; incremental persistence can be introduced later with concrete scale evidence.

Buy fees are part of acquisition cost. A sell allocates the current weighted-average cost to its quantity, and realized PnL is net proceeds after sell fee minus that allocated cost. Wallet BTC without a corresponding buy execution has no defensible cost basis, so inconsistent sell history is rejected rather than assigned an invented value.

## M3.7 net best-bid position valuation

An open paper position is marked at the normalized best bid because that is the immediately relevant side for a hypothetical sale. Unrealized PnL uses estimated net liquidation proceeds after the configured taker fee, keeping both entry and hypothetical exit fees in the economic result.

The valuation reuses the quote freshness limit and rejects unavailable or stale top-of-book data for open positions. A zero position does not depend on market data. This level-one mark is explicit rather than pretending to model deeper-book liquidity or slippage.

## M3.8 sell-execution performance outcomes

The first performance summary reuses the position accounting fold so weighted cost allocation and realized PnL have one implementation. Each sell execution is classified by its net realized PnL as profitable, losing, or break-even; partial sells therefore remain separate outcomes.

Win rate excludes break-even outcomes and is null without a decided outcome. It is exposed as a decimal ratio rounded half-even to eight fractional places. ROI and time-series metrics are deferred because they require an explicit capital-flow and period model.

## M4.1 independent maximum-notional assessment

The paper executor depends on a provider-neutral `RiskEngine` contract. New orders are quoted before assessment because the first rule needs the current gross notional, but repository mutation is impossible until the assessment approves. Persisted idempotent replays bypass reassessment because they do not create a new financial effect.

The initial `RISK_MAX_ORDER_NOTIONAL_USDT` limit defaults to `100`, accepts exact decimal strings, applies equally to buys and sells, and treats the boundary as inclusive. This is one independent guard, not a complete risk system and not sufficient to enable real trading.

## M4.2 emergency-stop precedence

The emergency stop is evaluated before candidate decimal validation and maximum-notional assessment. When active, it returns one deterministic rejection without depending on market-derived order details. This makes the operational intent unambiguous and keeps mutation unreachable.

The initial stop is a validated configuration boolean defaulting to false. A persistent, authenticated operator control is deferred; this configuration switch protects paper execution only and is not one of the multiple safeguards eventually required for real trading.

## M4.3 cumulative BTC position limit

The first cumulative exposure rule limits BTC quantity rather than mark-to-market value, avoiding a moving price-dependent boundary. New buys are assessed against the persisted BTC paper balance plus quoted quantity; the configured positive decimal limit defaults to `0.01` BTC and includes the exact boundary. Sells do not increase BTC exposure and therefore bypass this rule after the preceding emergency-stop and maximum-notional checks.

The executor supplies the provider-neutral balance snapshot to the risk candidate, keeping persistence concerns outside the Risk Engine. M4.4 supplements that early assessment with an atomic persistence guard.

## M4.4 transaction-level exposure defense

The buy transaction repeats the configured BTC quantity limit as a conditional PostgreSQL update. This is intentional defense in depth: the Risk Engine owns the explainable pre-execution decision, while the repository owns the final concurrency guarantee at the mutation boundary. PostgreSQL row locking ensures that competing balance updates cannot both approve against the same prior amount.

A failed conditional credit throws a specific position-limit error from inside the transaction, rolling back the already-created execution row and USDT debit. No database constraint or migration is needed because the limit remains runtime configuration rather than persisted policy.

## M4.5 derived UTC daily realized-loss guard

The first loss guard uses net realized PnL from sell executions in the current UTC calendar day. It replays the complete execution history so sells made today retain the correct fee-inclusive cost basis even when their buys occurred earlier. Profit offsets loss within the same day, and the inclusive configured threshold defaults to `25` USDT.

Only new buys are blocked because they increase exposure; sells remain available to reduce exposure and realize outcomes. The check follows emergency stop and maximum order notional but precedes the BTC position limit. Persisted idempotent replays bypass it because they add no financial effect.

Derived state avoids a schema change at the current local scale. M4.6 addresses concurrent execution ordering without introducing a persisted aggregate.

## M4.6 advisory-lock serialization for paper financial effects

Paper buy and sell transactions acquire one fixed PostgreSQL transaction-scoped advisory lock. The lock is released automatically on commit or rollback and works across application processes. A buy then derives daily realized PnL from executions visible inside its transaction, so a preceding serialized sell cannot be missed.

This preserves immutable execution history as the accounting source of truth and avoids a speculative daily-aggregate table. One global paper-execution lock is acceptable for the current single-portfolio local workload; partitioned lock keys can be introduced only if multiple portfolios or measured throughput require them.

The application Risk Engine still performs the explainable early check. The repository repeats only the invariant needed at the mutation boundary, following the same defense-in-depth split used by M4.4.

## M4.7 append-only emergency-stop control

Emergency-stop persistence uses events rather than one mutable row. This preserves an audit trail naturally and makes idempotency explicit through the event's caller-supplied primary key. The most recent database timestamp and ID determine current state.

The application loads that state into memory during module initialization so the existing synchronous Risk Engine contract remains small and deterministic. A control change updates memory only after database persistence succeeds. Persisted state overrides the configuration fallback, including an explicit persisted deactivation after a configuration-based initial stop.

The first control API is intentionally local and paper-only. It requires a reason and idempotency key but adds no remote authentication or claim that this single control is sufficient for real trading.

## M4.8 conservative level-one liquidity participation

The Risk Engine limits order quantity as a share of the exact best bid or ask quantity used to produce the quote. This is distinct from the quote service's feasibility check: feasibility allows up to all displayed quantity, while the risk rule defaults to a conservative ten percent.

The participation rate is configurable, positive, and at most one. Exact decimal division avoids native floating-point behavior, and equality is permitted. The rule applies symmetrically to buys and sells after maximum-notional assessment and before side-specific loss or exposure checks.

Only top-of-book data is available in the current market-data milestone, so this is an explicit level-one guard rather than an estimate of full-book impact or slippage.

## M4.9 digest-only local control authentication

Emergency-stop writes use a dedicated Bearer token without introducing accounts, sessions, or an authentication dependency. Configuration stores only its SHA-256 digest; the raw token exists only in the request and is compared in constant time using Node's native crypto implementation.

Missing digest configuration disables the write endpoint instead of creating an insecure default. Read-only status remains available. Docker Compose also binds the API to host loopback, providing an independent network boundary for the current local deployment.

This narrow mechanism is appropriate only for the paper-control surface. It must not be reused as sufficient authorization for financial accounts or real execution.

## M4.10 reuse net position valuation for unrealized-loss risk

The unrealized-loss guard reuses `PaperPositionService` instead of introducing a second PnL formula. The assessed value therefore matches the read-only position endpoint and includes the existing fresh best-bid check, estimated taker exit fee, and fee-inclusive cost basis.

The rule blocks only exposure-increasing buys at an inclusive configurable USDT loss boundary. Sells remain available. This is deliberately a pre-execution snapshot: market prices are external and cannot be locked transactionally, while the existing database rules continue to protect persistent balance, exposure, and realized-loss invariants.

## M4.11 Redis fixed-window execution permits

Approved new paper executions use a Redis hash and one Lua script to atomically enforce a shared buy/sell fixed-window limit. Hash fields are caller idempotency keys, so concurrent duplicates share one slot; the key TTL bounds memory and starts when the first permit is issued.

The permit occurs after deterministic risk assessment and before PostgreSQL mutation. Redis is intentionally fail-closed and ephemeral: losing a counter may begin a fresh window, but it cannot alter financial history, while Redis unavailability cannot silently bypass the safeguard. A consumed permit is not refunded after a later execution failure, favoring bounded activity over throughput.

## M1.1 raw trade stream

M1.1 uses the Binance Spot raw stream `wss://stream.binance.com:9443/ws/btcusdt@trade`, as documented by the official Binance WebSocket Market Streams reference on 2026-09-11. It requires no authentication.

The provider payload is validated and translated at the infrastructure boundary. Price and quantity remain decimal strings to avoid premature floating-point arithmetic. Binance's buyer-maker flag maps to the internal taker side: buyer maker means `sell`; otherwise `buy`.

The `ws` package is the explicit WebSocket transport.

## M1.2 bounded WebSocket reconnection

Unexpected trade-stream closes use exponential backoff starting at one second and capped at 30 seconds. A successful connection resets the retry count. This handles ordinary network interruption and Binance's documented connection lifetime without creating rapid retry loops.

The client owns at most one socket and one reconnect timer. Shutdown marks the client as stopping before closing resources, so close/error events cannot create a new connection. Jitter, application-level heartbeat detection, and circuit breakers are deferred until operational evidence requires them.

## M1.3 public mini ticker

M1.3 uses the Binance Spot raw stream `wss://stream.binance.com:9443/ws/btcusdt@miniTicker`. It is public, requires no credentials, and publishes rolling 24-hour mini ticker updates approximately once per second.

The provider payload is fully validated at the infrastructure boundary, including fields not yet needed by the domain. The internal `MarketTicker` intentionally exposes only provider, symbol, latest price, event time, and receipt time. Volume and rolling-window price statistics remain deferred rather than expanding M1.3.

The ticker has its own provider-neutral stream contract and lifecycle service. Its WebSocket uses the same bounded reconnection policy established in M1.2. A separate socket keeps the existing trade contract stable; connection consolidation is deferred until the number of approved streams makes it concretely useful.

## M1.4 public one-minute candles

M1.4 uses the Binance Spot raw stream `wss://stream.binance.com:9443/ws/btcusdt@kline_1m`. It is public, requires no credentials, and updates the active UTC one-minute candle approximately every two seconds.

The internal `MarketCandle` exposes OHLC decimal strings, the fixed `1m` interval, open and close timestamps, the provider close-state indicator, event time, and receipt time. The provider's volume, taker volume, trade IDs, and trade count are validated at the boundary but remain outside the domain until an approved volume increment.

The candle stream uses its own provider-neutral contract, lifecycle service, socket, and the bounded reconnection policy established in M1.2. M1.4 provides live updates only; historical retrieval and persistence remain deferred.

## M1.5 candle volume

M1.5 enriches `MarketCandle` from the existing Binance kline payload instead of adding a connection or provider request. It exposes base volume, quote volume, taker-buy base volume, and taker-buy quote volume as decimal strings, preserving provider precision without native floating-point conversion. Trade count is a validated non-negative safe integer.

The fields represent the current state of the active candle and may change on each update until `isClosed` becomes true. No accumulation, conversion, ratio, indicator, or historical aggregation is performed in M1.5.

## M1.6 public top of book

M1.6 uses the Binance Spot raw stream `wss://stream.binance.com:9443/ws/btcusdt@bookTicker`. It is public, requires no credentials, and emits changes to the best bid or ask in real time.

The internal `MarketTopOfBook` contains the provider, normalized symbol, provider update ID, best bid price and quantity, best ask price and quantity, and receipt time. Update IDs are strings; all prices and quantities remain decimal strings.

This increment intentionally represents only level one of the book. It does not calculate spread, reconstruct depth, request REST snapshots, or persist updates. The stream has its own provider-neutral contract, lifecycle service, socket, and bounded reconnection policy.

## M1.7 deterministic spread calculation

M1.7 derives spread metrics from each M1.6 top-of-book update without opening another connection. Monetary arithmetic uses a local `decimal.js` constructor configured with precision 40 and half-even rounding; native JavaScript floating-point arithmetic is not used.

Absolute spread is `ask - bid`, midpoint is `(ask + bid) / 2`, and spread basis points are `(absolute spread / midpoint) * 10000`. Absolute spread and midpoint are canonical decimal strings. Basis points are rounded to exactly eight decimal places. Crossed books (`ask < bid`) and non-positive midpoints are rejected; a locked positive book produces zero spread.

## M1.8 public pair metadata

M1.8 uses the public Binance Spot `GET /api/v3/exchangeInfo?symbol=BTCUSDT` endpoint through the public-data base URL `https://data-api.binance.vision`. The application uses Node 24's native `fetch` with a ten-second timeout, so no HTTP dependency is added.

The provider boundary validates the BTC/USDT identity, status, `PRICE_FILTER`, `LOT_SIZE`, and minimum notional from either `MIN_NOTIONAL` or `NOTIONAL`. Financial values remain decimal strings. One snapshot starts loading during module initialization without blocking application startup; failure is logged, and shutdown aborts an in-flight request. Refresh, caching, persistence, and enforcement are deferred.

## M2.1 in-memory paper wallet

The first wallet increment is a fictional process-local domain object supporting only BTC and USDT. Its USDT opening balance comes from `PAPER_INITIAL_USDT_BALANCE` with a safe default of `1000`; BTC starts at zero. Restarting the application resets both balances, because persistence is deliberately deferred.

Balances and amounts are decimal strings. Arithmetic uses a cloned `decimal.js` constructor with precision 40 and half-even rounding, consistent with the project's financial-arithmetic rule. Credits and debits must be strictly positive, and insufficient debits fail before state changes. The application service adds structured audit-oriented logs for initialization and successful mutations.

There is no HTTP API, portfolio conversion, order model, fee, spread, slippage, PnL, exchange account, or real-fund access in M2.1.

## M2.2 latest-price portfolio valuation

The market-data module owns a process-local `LatestMarketPriceService`. `PublicTickerService` updates it only with normalized `MarketTicker` values, so paper-wallet code does not depend on Binance payloads or clients. The service is exported as the narrow cross-module dependency used by portfolio valuation.

The portfolio value is quoted only in USDT: `USDT balance + (BTC balance × latest BTC/USDT price)`. The same precision-40, half-even `decimal.js` strategy is used, and results remain canonical decimal strings. Before the first ticker, valuation fails explicitly rather than returning a misleading partial total. Price persistence, staleness rules, and BRL conversion are deferred; read-only HTTP exposure follows in M2.3.

## M2.3 read-only portfolio HTTP API

The local API exposes `GET /paper-wallet/balances` and `GET /paper-wallet/valuation`. The controller delegates to existing application services and exposes provider-neutral representations. Only the explicit missing-price domain condition maps to HTTP 503; unexpected errors are not hidden.

No balance mutation route exists. Authentication, persistence, dashboard concerns, and trading actions remain outside M2.3.

## M2.4 stale-price protection

Portfolio valuation accepts a ticker only while its receipt age is at most `PAPER_VALUATION_MAX_PRICE_AGE_MS`, defaulting to 10,000 milliseconds. Age is based on local `receivedAt`, avoiding dependence on provider clock skew. Future receipt timestamps clamp to age zero.

Time enters the valuation service through a small `Clock` port backed by `SystemClock`, allowing exact boundary tests. Missing and stale prices remain distinct application errors but both map to HTTP 503. Structured warnings record the reason and, for stale prices, the observed age and configured limit.

## M2.5 PostgreSQL paper balances

PostgreSQL is the source of truth for paper balances. `paper_balances` stores one constrained row per supported asset with `DECIMAL(38,18)` amounts. Startup uses insert-if-missing semantics, so configured defaults seed a new database without overwriting existing balances.

The domain exposes a `PaperBalanceRepository` contract; its Prisma implementation contains persistence details. Credit and debit use single atomic SQL updates. Debit includes the sufficient-balance condition in the update itself, preventing negative balances and lost-update races. The database also enforces supported assets and non-negative amounts. No transaction-history table is introduced in M2.5.

The local Compose API runs `prisma migrate deploy` before NestJS starts, ensuring a new PostgreSQL volume receives committed migrations without an interactive development migration command.

## M3.1 non-executing market-buy quote

Market data retains the latest normalized top of book and pair metadata in provider-neutral services. The paper-trading module consumes those views without depending on Binance transports or payloads.

A BTC quantity is quoted at the best ask only when the book is fresh, the pair status is `TRADING`, quantity satisfies minimum, maximum, and step-size rules, notional reaches the public minimum, and best-ask quantity is sufficient. `PAPER_TAKER_FEE_RATE` defaults to `0.001` as an explicit simulation assumption. Exact decimal calculation produces notional, fee, and total cost without wallet mutation. Multi-level fills, execution, and account-specific fees are deferred.

## M5.1 deterministic strategy boundary

Strategies are pure signal producers behind a provider-neutral contract. Their candle input contains only normalized domain fields and deliberately excludes provider payloads. A strategy has no dependency on a wallet, the Risk Engine, or an executor, preserving the rule that signals cannot submit orders.

The first strategy compares previous and current simple moving averages over closed candles. Equality belongs to the pre-cross side, so equality followed by divergence produces exactly one deterministic crossover. Decimal prices never pass through native floating-point arithmetic. The 3/5 defaults are construction policy, while the implementation validates any explicitly supplied positive integer periods with `shortPeriod < longPeriod`.

## M5.2 process-local candle feed

Live strategy observation reuses normalized M1 candle events through a small in-process subscription service instead of coupling strategies to Binance or opening another connection. Subscriber errors are logged and isolated from the publisher.

The evaluator keeps only six closed candles, matching the default M5.1 lookback plus its prior comparison point. It ignores open, duplicate, and out-of-order candles and writes signals to structured logs. Process-local observation is intentional for this increment; durable history and execution remain separate future decisions.

## M5.3 latest-signal availability

The live evaluator writes each successful result to a single process-local latest-signal read model. The HTTP layer reads that model without triggering calculation, and returns 503 rather than fabricating a default signal before data arrives. This gives operators and a future dashboard an honest observational surface without introducing persistence or execution coupling.

## M5.4 bounded startup parameters

Moving-average periods are validated with the rest of the environment and injected when the strategy provider is created. Defaults remain 3/5. Both values are capped at 1,000 and must satisfy `short < long`, preventing invalid calculations and unbounded live history.

The strategy contract declares its required candle count. This keeps the evaluator independent of concrete period values and ensures its process-local buffer changes consistently with configuration. Runtime mutation and automatic optimization remain outside this decision.

## M5.5 unified bounded signal read model

Live evaluations are recorded once in a shared process-local read model used by both recent-history and latest-signal queries. A fixed capacity of 100 prevents unbounded memory growth; reads return newest first, default to 50, and accept no more than the retained capacity. Empty history is a valid list response, while the existing latest route keeps its explicit unavailable response.

This is an operational observation surface, not durable strategy research data. PostgreSQL persistence, cursor pagination, filters, aggregates, sizing, risk assessment, and execution remain deferred.

## M5.6 idempotent durable signals

Strategy signals are persisted behind a provider-neutral repository. The database identity is the combination of strategy, symbol, and latest closed-candle time, preventing duplicate rows when a candle is processed again after delivery duplication or restart. A conflict returns the original row and never overwrites historical parameters or calculations.

Recent and latest queries read PostgreSQL directly rather than rebuilding an in-memory cache. Decimal averages use `DECIMAL(65,40)` to preserve the strategy's precision and map back to canonical strings. Persistence errors are logged and isolated from the market-data subscriber; signals still have no path to an executor.

## M6.1 deterministic no-lookahead replay

Backtesting begins with an internal provider-neutral runner over caller-supplied normalized candles. The runner validates closed BTC/USDT one-minute input with strictly increasing unique close times, then evaluates the configured strategy once per candle using only the bounded history available at that point. Setting evaluation time to the candle close makes identical input deterministic and prevents wall-clock variance.

The output is deliberately a signal timeline with period and action counts, not a trading-performance claim. Historical retrieval and storage, fills, fees, spread, slippage, financial metrics, optimization, HTTP exposure, and any execution path remain separate decisions.

## M6.2 bounded public historical source

Historical input is obtained through a provider-neutral contract whose first adapter uses Binance Spot's public `GET /api/v3/klines` on the market-data-only REST host. The request is deliberately one bounded BTC/USDT one-minute range: limit 1–1,000 and maximum span 1,000 minutes. This avoids implicit pagination, unbounded downloads, credentials, and persistence in the first retrieval increment.

The adapter strictly validates every kline and response ordering, rejects provider drift rather than guessing, and removes any candle whose close time has not passed. Only the strategy candle projection enters replay. At M6.2, provider retries, multi-request pagination, caching, storage, API exposure, and financial simulation remained deferred; M6.17 later introduced bounded pagination only.

## M6.3 complete provider-neutral historical candles

The historical provider returns a backtesting-owned full candle rather than the narrower strategy input. OHLC, volumes, taker-buy volumes, and trade count are preserved exactly, while positive prices, non-negative volumes, and high/low coherence are enforced with `decimal.js`. This prevents native floating-point loss and makes invalid market history fail before research calculations.

The orchestration service explicitly projects the full candle into the existing strategy contract, maintaining strategy isolation. Retaining open price and the remaining market fields prepares an evidence-based boundary for a future next-candle execution model without implementing trades or financial claims in M6.3.

## M6.4 causal historical fill model

Historical simulation is a separate consumer of strategy output. A signal evaluated at a candle close may fill only at the following candle's open, preventing same-close execution and making the causal delay explicit in the ledger. A final non-hold signal is reported as unfilled because no future price exists.

The first model is deliberately one fixed-quantity long position. It applies an explicit taker fee to entry and exit notionals and computes fee-inclusive cost, net proceeds, and per-trade net PnL with precision-40 decimal arithmetic. Redundant actions are counted rather than inventing pyramiding or short selling, and an ending position remains open. These objects are hypothetical research records, not orders; no wallet, executor, operational risk state, or exchange integration is invoked.

## M6.5 realized-only performance boundary

Backtest performance is derived from the simulator's immutable fill ledger and closed trades rather than being accumulated independently during signal handling. This keeps execution semantics as the source of truth and makes the summary reproducible.

Win rate includes every closed trade in its denominator and is `null` when none exist. Gross loss is exposed as a positive magnitude, while realized net PnL retains its sign. Total fees include all fills, including an ending open entry, but no value or PnL is assigned to that open position without a separately approved mark-to-market rule.

## M6.6 final-close valuation without synthetic execution

An ending open position is marked using the final supplied candle's close, which is known at the backtest boundary and requires no external price lookup. The configured taker fee estimates liquidation cost, so unrealized PnL is net of both the actual simulated entry fee and the hypothetical exit fee.

Valuation remains separate from execution: no sell fill or closed trade is invented. A flat ending state has a `null` valuation and unrealized PnL, while total net PnL remains equal to realized net PnL.

## M6.7 explicit statistical nullability

Closed-trade statistics use net PnL after simulated fees and never include an ending open position. Expectancy is the arithmetic mean of all closed-trade outcomes, including break-even results. Losing averages are positive magnitudes to align with gross loss and make ratios readable.

Undefined samples are represented as `null`: no closed trades means no average or expectancy, no winners means no winning average, and no losers means neither a losing average nor a finite profit factor. This avoids presenting zero or infinity as measured evidence.

## M6.8 realized-only absolute drawdown

The first backtest drawdown measure follows cumulative net PnL only at closed-trade exits. Its initial peak is zero, allowing an initial losing trade to create drawdown without inventing capital. Each point retains the running peak and absolute USDT distance below it.

Maximum drawdown records when the decline first appeared, its deepest observed exit, and when the relevant prior peak was regained. Open-position valuation and intraperiod candle movement remain excluded, so this metric is explicitly realized-only and not a full equity drawdown.

## M6.9 explicit capital before ROI

ROI is introduced only with an explicit positive initial USDT capital. The simulator owns a research-only cash ledger: fee-inclusive buys debit cash, net sell proceeds credit it, and unaffordable buys remain unfilled and separately counted. Negative cash and borrowing are impossible.

Final equity combines remaining cash with the fee-adjusted final-close liquidation value of an open position. Total return and ROI therefore reconcile with the existing total net PnL while leaving quantity fixed and avoiding implicit reinvestment.

## M6.10 ledger-derived candle-close equity

The equity curve is reconstructed from immutable fills rather than maintained as a second execution state. Fills at a candle open are applied before marking that candle's close, preserving the simulator's causal ordering. Open BTC is valued net of the estimated exit fee.

Absolute and percentage maxima are reported independently because changing equity peaks can make their deepest points differ. Initial capital is the baseline peak, and the final curve value must reconcile with the capital summary's final equity.

## M6.11 explicit adverse spread and slippage

The simulator accepts a full spread rate and a separate slippage rate instead of inferring either from historical OHLCV candles. Each side pays half the spread plus the full adverse slippage: buys execute above and sells below the next candle's opening reference price. Keeping both the reference and effective price in every fill makes the assumption auditable.

The effective price remains the single source for notionals, fees, affordability, cash, PnL, ROI, and equity. This avoids a parallel cost deduction that could diverge from the ledger. Rates are explicit, deterministic decimal strings; combined impact must keep the sell price positive.

## M6.12 ledger-derived temporal exposure

Time metrics are derived from candle and fill timestamps rather than accumulated inside signal processing. The tested interval runs from the first candle open through the final candle close. Closed exposure runs from each entry fill to its corresponding exit fill, while an ending open position remains exposed through the tested-period end.

Durations are exact safe integer milliseconds. Ratios and averages use precision-40 decimal arithmetic; undefined ratios and samples are represented as `null` instead of a misleading zero. This measurement does not introduce annualization, risk-adjusted return, or a new execution assumption.

## M6.13 explicit historical execution-rule snapshot

Backtests carry their own provider-neutral minimum/maximum quantity, step size, and minimum-notional snapshot. They do not query current Binance metadata, because doing so would make an old replay depend on mutable present-day rules. The complete normalized snapshot is returned with the result for reproducibility.

Fixed quantity must satisfy range and exact step-size constraints before simulation. Minimum notional is assessed per potential fill using its effective post-spread/slippage price. Failed buys preserve cash; failed sells preserve the open position; neither enters downstream ledgers. Quantity is rejected rather than silently rounded.

## M6.14 conservative side-aware price quantization

The historical rule snapshot now includes tick size. After adverse spread and slippage, buy prices round upward and sell prices round downward. This prevents precision normalization from accidentally improving a simulated execution. Reference, adjusted, and executable prices remain separately inspectable in each fill.

The executable price is the sole source for notional and every downstream financial result. Minimum notional is deliberately checked afterward. A sell floored to zero is not executable and preserves the open position instead of manufacturing an invalid fill.

## M6.15 inclusive historical price limits

Minimum and maximum prices belong to the explicit historical rule snapshot and are evaluated against the final tick-aligned executable price. Both boundaries are inclusive, matching filter semantics without coupling replay to a current provider response.

Out-of-range candidates remain unfilled and preserve state. Range validation precedes minimum-notional validation so each potential fill has a stable primary rejection category, while valid fills continue to use the same immutable-ledger accounting.

## M6.16 causal closed-candle volume proxy

Historical liquidity uses the fully closed signal candle's base volume rather than the following execution candle's volume. The next candle is known only as the execution-time price source, so consuming its completed volume would introduce future information. A required positive rate no greater than one converts the causal volume proxy into a maximum executable quantity.

The fixed quantity remains all-or-none: exceeding the limit rejects the candidate without mutating state. Accepted fills retain the reference candle close, reference base volume, and calculated maximum quantity so the assumption is reproducible. Order-book depth, partial fills, and variable sizing remain separate future concerns.

## M6.17 bounded adapter-owned historical pagination

The provider-neutral request retains one total limit while the Binance adapter owns its provider-specific 1,000-row paging restriction. The total is capped at 10,000 candles and 10,000 minutes so callers gain useful research depth without enabling unbounded network or memory consumption.

Pages are sequential because each cursor depends on the last validated open time. An empty or partial page is terminal; a full page advances by exactly one interval. Existing per-page normalization remains the trust boundary, and the complete bounded collection is returned only after loading finishes. Persistence, retries, rate-limit backoff, and concurrency are deliberately separate decisions.

## M6.18 page-local transient retry

Historical retries belong inside the Binance adapter because HTTP status semantics and `Retry-After` are provider-transport concerns. Each page gets no more than three total attempts. Network failures, rate limiting, and server failures retry; permanent client responses and invalid successful payloads do not.

The default backoff is 500 milliseconds before the second attempt and one second before the third. A valid provider delay takes precedence but cannot exceed 30 seconds. Waiting is injected for deterministic tests and receives the caller's abort signal. Retry state resets for each page and never restarts previously accepted pagination work.

## M6.19 process-local provider circuit

The historical circuit counts only page failures that remain transient after all bounded retries. Three such failures open it for 30 seconds. This separates provider availability from invalid requests, permanent client errors, malformed data, and user cancellation, none of which indicate a transient outage suitable for circuit state.

After cooldown, one in-process half-open probe owns provider access so concurrent callers cannot create a recovery stampede. Success resets the circuit; failure starts a fresh open interval. State intentionally remains local to the adapter instance: distributed coordination, persistence, operator controls, and public configuration require separate evidence.

## M6.20 exact immutable historical candle persistence

Validated closed candles are written through to PostgreSQL before replay. Symbol, interval, and open time form the natural composite primary key. Decimal values use text columns because the provider boundary deliberately preserves arbitrary valid decimal precision; choosing a fixed database scale would silently weaken that contract. Database checks constrain the supported identity, closed state, time ordering, and non-negative trade count.

The repository uses a serializable transaction: insert missing identities without overwriting, reload the complete batch, and compare every persisted market field. Identical replays are idempotent, while any content drift on an existing identity aborts the whole transaction. Replay continues from the freshly fetched batch so persistence does not yet imply cache completeness, gap detection, or offline availability.

## M6.21 explicit stored source without completeness inference

Stored replay is a separate application operation rather than an automatic fallback. Its repository query uses inclusive open-time bounds, deterministic ascending order, and the existing 10,000-candle limit. Persisted rows cross the domain boundary only after the same identity, time, OHLCV, decimal, and safe-integer invariants are re-established.

The stored operation returns exactly the valid rows found. It neither treats absence as proof of market inactivity nor silently contacts Binance, so callers cannot mistake a partial cache for a complete requested market interval. Automatic source selection requires separately designed gap and completeness semantics.

## M6.22 all-or-nothing historical cache selection

Automatic reuse is limited to ranges whose expected one-minute identities can be proven from the request. The coverage calculation aligns the first expected open upward to the next epoch minute, enumerates through the inclusive end, applies the request limit, and requires an exact chronological identity match.

Incomplete coverage reloads the entire bounded request through the existing resilient Binance adapter and write-through path. This deliberately avoids mixed-source reconciliation and partial gap fetching until their conflict, refresh, and audit semantics are separately designed. Corrupt persisted rows remain visible errors rather than being masked as cache misses.

## M6.23 complete-only stored and remote gap merge

Expected minute identities are compared with validated stored identities, and consecutive absences become the smallest deterministic set of bounded remote requests. Requests remain sequential so they reuse the adapter's established circuit and cancellation behavior without introducing concurrency policy.

Fetched gaps are held in memory until their union with stored candles proves the original request's exact coverage. Only then are all fetched candles passed to one serializable repository batch and the merged sequence replayed. Missing provider data, duplicate cross-source identities, and persistence failure all stop before replay; refresh and overwrite semantics remain deliberately absent.

## M6.24 strict local replay command endpoint

Historical replay is exposed as POST because it initiates bounded computation and may populate the public-candle cache, even though it cannot mutate financial state. The public contract fixes BTC/USDT and one minute and accepts only canonical UTC boundaries plus the existing bounded limit, avoiding provider-specific or speculative options.

Input contract failures are client errors. Loading, persistence, completeness, and replay failures map to one sanitized unavailable response so provider or database details do not cross the HTTP boundary. Financial simulation remains internal until its larger configuration contract receives separate approval.

## M6.25 validate simulation assumptions before market-data loading

The simulation endpoint accepts no server defaults for financial assumptions. Every cost, capital, liquidity, quantity, precision, and price constraint is explicit in the request, keeping results reproducible and preventing current live exchange metadata from silently changing historical research.

A dedicated application validator reuses the execution-rule validator and checks the remaining configuration before historical orchestration begins. This avoids network and cache work for invalid experiments and lets the HTTP layer distinguish client configuration errors from sanitized operational unavailability. The endpoint invokes only the existing hypothetical simulator and has no operational trading dependency.

## M6.26 immutable JSON simulation snapshots with idempotency

Durable runs use a separate endpoint so ephemeral simulation semantics remain stable. The normalized request and complete result are stored as PostgreSQL JSONB: this preserves the evolving nested research artifact without converting decimal strings to floating point, while a UUID and creation timestamp provide stable identity.

The caller-supplied idempotency key is unique and paired with a SHA-256 request fingerprint. A pre-read avoids repeat computation in the normal replay path; the database constraint resolves races after concurrent computation. Matching races return the winner, conflicting content raises an explicit conflict, and stored runs are never overwritten.

## M6.27 direct immutable run lookup

The first read operation is deliberately a primary-key lookup rather than a list. UUID validation occurs at the HTTP boundary, while absence remains distinct from database unavailability. The public response excludes idempotency keys and request fingerprints because those fields support persistence coordination rather than interpretation of the research result.

Retrieval returns the stored JSON snapshot exactly and cannot invoke simulation or market-data loading. This creates the smallest useful read contract for later local tooling without introducing pagination, retention, deletion, or mutable run lifecycle semantics.

## M6.28 bounded recent run listing

The first collection read uses a strict bounded limit with a conservative default rather than unbounded history. PostgreSQL orders by creation time and then UUID descending, matching the existing composite index and making ties deterministic. Public list items reuse the direct-lookup projection so persistence coordination fields remain private.

This increment deliberately stops before cursor pagination and filtering. The local dataset can now support a simple recent-runs view while pagination identity, query semantics, retention, and deletion remain separate decisions.

## M6.29 UUID cursor over the immutable sort pair

The public cursor is an existing run UUID rather than an encoded client-controlled timestamp. The application resolves it to the immutable `(createdAt, id)` pair, then applies an exclusive lexicographic boundary matching the indexed descending order. This avoids offset drift and prevents callers from supplying an arbitrary sort timestamp.

The collection response remains an array for compatibility with M6.28. A caller continues while a full page is returned by passing the final item's UUID; an additional empty request can occur when the total is an exact multiple of the limit. Unknown cursors are invalid input. After M6.31, deleting a cursor run intentionally makes subsequent use of that cursor invalid rather than reconstructing its removed sort boundary.

## M6.30 inclusive temporal run filtering

Creation filters use canonical UTC instants and inclusive comparisons. A cursor must belong to the requested interval, preventing ambiguous continuation when filters change; the existing index serves the query without migration.

## M6.31 explicit single-run deletion

Deletion is an explicit UUID-addressed command rather than retention policy or bulk cleanup. The repository uses one conditional database delete and reports whether a row existed, allowing HTTP to distinguish `204` from `404` without a read-before-delete race. Historical candles have no dependency on stored runs and remain untouched.

## M6.32 disposable PostgreSQL schema for E2E isolation

The E2E suite recreates and migrates only the dedicated `crypto_trader_e2e` schema before each complete run. The application schema remains untouched. `PrismaService` passes the validated URL schema both to Prisma's generated-query namespace and PostgreSQL's connection `search_path`, ensuring raw transactional SQL and generated queries cannot diverge across schemas.

## M7.1 provider-neutral catalog before listing detection

A listing cannot be inferred from one exchange snapshot. M7 therefore begins with a strict provider-neutral Spot/USDT catalog baseline. Detection, observation timestamps, persistence, and polling remain separate decisions so the first observation is never mislabeled as the actual exchange listing time.

## M7.2 immutable first observation with mutable current state

Provider and symbol form the durable identity. An upsert preserves `firstObservedAt` while updating `lastObservedAt` and current catalog fields in one transaction, enabling later comparisons without rewriting observation history or implying knowledge of the exchange's actual listing time.

## M7.3 first population is not a listing event

The repository compares a non-empty catalog against all existing rows for that provider before writing the current observation, within one serializable transaction. With no existing provider rows, it establishes a baseline and returns no additions. With an established baseline, only previously absent current symbols are newly observed. This conservative rule avoids presenting every symbol from a fresh installation as a new listing and keeps detection atomic with persistence.

## M7.4 completion-relative polling without overlap

Catalog polling uses recursive one-shot timers scheduled only after each complete load attempt rather than a fixed interval that could overlap slow requests. The configured interval therefore measures the quiet delay between attempts. A failed attempt retains the last successful in-memory state and does not permanently stop observation. Shutdown aborts the provider request and removes a pending timer.

## M7.5 nullable immutable application detection time

Detection classification belongs on the durable provider/symbol observation because there can be at most one transition from unseen to first seen. A nullable `detectedAt` avoids inventing events for baseline and migrated rows. It is assigned only on a post-baseline insert and omitted from all update paths, preserving the original application detection time without claiming an official listing timestamp.

## M7.6 bounded read before research enrichment

The first detection API is a simple bounded recent list rather than pagination or filtering. It reads only non-null detection markers and applies deterministic ordering by detection time, provider, and symbol. Current provider state is included for interpretation, while first-observation internals and baseline rows remain outside the public contract. Further filtering, cursors, alerts, scoring, and market tracking remain separate increments.

## M7.7 canonical inclusive detection windows

Detection-time filters use exact canonical millisecond UTC strings and inclusive PostgreSQL comparisons. Strict canonical input avoids timezone ambiguity and equivalent alternate encodings, while rejecting inverted ranges at the HTTP boundary prevents unnecessary repository work. The existing detection index serves the filtered newest-first query without a schema change.

## M7.8 composite detection cursor

Detection rows have a durable composite provider/symbol identity rather than a synthetic UUID. The public cursor therefore uses canonical `provider:symbol` text and is resolved server-side to the immutable detection timestamp before applying an exclusive keyset boundary over the complete indexed sort order. This avoids offset drift and client-controlled timestamps without requiring a schema migration.

A cursor outside the selected time interval is invalid, ensuring pagination cannot silently continue with changed filters. The existing array response is preserved; clients continue while a full page is returned by passing the final item's provider and symbol.

## M7.9 strict filters over current provider state

Detection research can now narrow results by the provider, its current status string, and current Spot-trading availability. Inputs remain deliberately strict: only the implemented `binance` provider is accepted, status uses the normalized uppercase provider form, and booleans have only literal `true` and `false` encodings.

Filters apply inside the existing PostgreSQL query and form part of cursor compatibility. They describe the most recently observed mutable state; no historical state is inferred or stored by this read feature.

## M7.10 aggregate the existing sample before market enrichment

The first statistical new-listing read aggregates only facts already stored for durable detections: sample count and minimum/maximum application detection time. It reuses the list's filters but excludes pagination because the aggregation covers the full matching set. Null temporal bounds make an empty sample explicit without inventing observations or introducing market tracking prematurely.

## M7.11 consistent current-state breakdowns

Status and Spot-availability counts extend the existing summary rather than creating independent endpoints. The aggregate and both grouped queries run in one PostgreSQL transaction and return deterministically ordered arrays. This prevents internally mismatched summary sections during a concurrent catalog refresh while keeping the distinction between current provider state and immutable detection time explicit.

## M7.12 fix checkpoint semantics before scheduling

The research checkpoints are defined as explicit millisecond offsets from the immutable application detection time, not wall-clock rounding or elapsed timers. A pure schedule builder produces independent UTC instants for all nine planned horizons and rejects invalid or out-of-range dates. Persistence, due-work recovery, provider data, and sampling remain separate decisions.

## M7.13 checkpoints are durable detection children

Checkpoint identity is provider, symbol, and schedule label. Rows retain offset and target time and are inserted in the detection transaction, preventing a committed detection without its research plan. The foreign key cascades only if the parent observation is explicitly removed. No processing state is added before a worker contract exists.

## M7.14 explicit-time bounded due reads

Due-checkpoint selection receives its clock instant and limit from the caller and uses the target-time composite index with a complete deterministic order. The repository only reads candidates; claim ownership, retries, completion state, provider sampling, and scheduling lifecycle remain separate increments.

## M7.15 validate bounded work before persistence access

The application service owns due-read input validation: time must be valid and limit must be a safe integer from 1 through 100. Keeping this policy above the repository prevents accidental unbounded worker batches while leaving clock acquisition and processing lifecycle for later increments.

## M7.16 lease due work atomically before processing

Checkpoint ownership uses a durable caller-generated token with explicit claim and expiry instants. Candidate selection and lease mutation are one PostgreSQL statement using `FOR UPDATE SKIP LOCKED`, so concurrent consumers cannot receive the same actively leased row. Expiry deliberately restores abandoned work without requiring a recovery job.

The database requires the three lease fields to be either all absent or internally consistent. Completion, retry attempts, worker cadence, and the market observation payload remain separate decisions because this increment establishes ownership only.

## M7.17 terminal completion belongs to the active owner

Completion is a conditional atomic update rather than an unconditional timestamp write. Provider, symbol, label, and token must identify the row, the completion instant must fall at or after claim time and strictly before expiry, and `completedAt` must still be null. Returning a boolean keeps stale ownership and duplicate completion explicit without introducing an exception-driven worker policy.

A database check preserves the same temporal invariant independently of the application. Completed rows remain immutable terminal work and are excluded at both read and claim boundaries. Observation payload persistence and failure/retry lifecycle remain separate because completion currently certifies lifecycle ownership only.

## M7.18 validate worker limits before activating lifecycle

Worker cadence, batch size, and lease duration are startup configuration rather than hidden constants. Defaults favor small local batches and short recovery, while explicit maximums prevent accidentally unbounded queries, excessively tight loops, or abandoned claims that remain unavailable for too long.

The module receives one immutable-shaped options object, keeping operational wiring separate from environment access. Activation is intentionally deferred: scheduling before a processing contract exists would only claim rows until their leases expire and create noisy, purposeless database work.

## M7.19 one deterministic cycle before background scheduling

Claiming, per-item processing, and completion are composed in a manually invoked cycle before any timer is introduced. Checkpoints are processed sequentially to keep provider pressure and completion ordering predictable. A processor exception affects only its item; the lease is left intact so the existing expiry mechanism owns recovery rather than an implicit immediate retry.

Completion returning false is counted separately as lost ownership, because treating it as processor failure would hide lease timing or competing-worker behavior. The cycle is wired for dependency injection but deliberately has no production processor or lifecycle hook, preventing real rows from being claimed before observation persistence exists.

## M7.20 preserve provider market values before deriving performance

Checkpoint market input is modeled as one provider-neutral snapshot rather than provider JSON. Price and volume fields remain canonical decimal strings so the boundary never introduces native floating-point arithmetic. Trade count is a non-negative safe integer, and the provider's window timestamps remain distinct from the local receive timestamp.

Only the provider window is ordered. The local receive clock is intentionally not required to follow the provider close clock because ordinary clock skew could otherwise reject valid observations. Derived detection-relative returns and volume changes require durable snapshots and therefore remain outside this contract-only increment.

## M7.21 use the single-symbol public rolling ticker first

The first observation adapter requests Binance Spot `GET /api/v3/ticker/24hr` with an explicit symbol. A single-symbol request bounds both response size and provider weight and supplies the exact price, aggregate volumes, trade count, and provider-window timestamps already fixed by M7.20. The public market-data host requires no credentials.

The adapter applies the same ten-second request ceiling as the catalog client and composes caller cancellation. It validates response identity before domain normalization and never includes provider response bodies in HTTP-status errors. Retries, circuit state, persistence, and production processing remain separate lifecycle decisions.

## M7.22 observation and completion are one owned transition

A checkpoint is meaningful for research only when its market sample exists. Completion therefore writes the validated observation and `completedAt` in one conditional PostgreSQL update under the existing active-lease token. A stale owner cannot store data, and a completed checkpoint cannot contain a partial sample.

PostgreSQL independently requires all observation fields to be absent while incomplete or fully present and internally coherent when complete. Lifecycle-only completions created before this schema existed cannot be honestly backfilled, so the migration reopens them and clears their expired ownership fields for future collection rather than fabricating market data.

## M7.23 keep provider loading behind the cycle processor boundary

The production checkpoint processor performs only one translation: claimed provider/symbol identity becomes a provider-neutral market-observation request. It returns the observation without completing the checkpoint itself, preserving the cycle as the sole coordinator of processing and ownership-safe completion.

Provider errors are not swallowed or retried by the processor. They flow to the cycle's per-item isolation, and the durable lease remains the recovery clock. Automatic cadence and shutdown cancellation remain separate from this wiring increment.

## M7.24 opt in before starting durable external collection

The lifecycle worker uses completion-relative recursive timers rather than a fixed interval, so slow cycles cannot overlap within one process. Shutdown prevents another timer and waits for the current bounded cycle, while cycle-level failure is logged and does not permanently stop scheduling.

Activation is an explicit startup setting that defaults to disabled. Although collection is public and read-only at Binance, it claims and completes durable local work; an upgrade must not begin that behavior silently. Enabling the worker does not grant any trading capability.

## M7.25 expose completed samples by durable detection identity

The first observation read is a naturally bounded per-detection timeline rather than a global feed: each detection has exactly nine scheduled checkpoints. PostgreSQL returns only completed rows in chronological target order, and persisted decimals are mapped back to exact strings and revalidated at the repository boundary.

The route distinguishes malformed identity from an unknown durable detection, while a known detection with no completed checkpoint is a valid empty research result. Claim tokens and incomplete work remain internal, and no derived performance claim is introduced.

## M7.26 anchor price performance only to T+0

Detection-relative price performance must have one stable, interpretable denominator. The calculator therefore accepts only the scheduled `T+0` price as its baseline and reports unavailable when that observation is missing; it never silently promotes the first later sample.

Absolute price changes and fractional return rates use an isolated 40-digit decimal context and remain decimal strings. The calculator validates observation identity, uniqueness, schedule offsets, and checkpoint timing before calculation, but does not classify, score, persist, or expose the result yet.

## M7.27 expose performance on demand without derived persistence

The first performance API reuses the durable observation timeline and calculates M7.26 results per request. This avoids duplicating derivable state and ensures newly completed checkpoints are visible immediately without a refresh job or cache invalidation policy.

Missing `T+0` is represented as HTTP 503 because the detection exists but its required analytical baseline is not yet available. Unknown detection remains 404, malformed identity remains 400, and the response makes no claim that price return implies profitability or tradeability.

## M7.28 keep cohort sample coverage explicit per checkpoint

Observation completion can differ between detections, so the cohort calculator groups only actually available performance points. Every checkpoint carries its own sample size and outcome counts; a missing later observation is never forward-filled or treated as a flat return.

Each detection contributes at most once, each checkpoint label at most once per detection, and averages use the same 40-digit half-even decimal context. This is descriptive price research only and does not classify an asset or infer executable profit.

## M7.29 bound durable cohorts by eligible T+0 detections

The durable cohort query selects only detected symbols with a completed `T+0`, because that explicit baseline is required by the existing performance contract. PostgreSQL applies newest-detection ordering and the 1–100 limit before loading completed timelines, keeping memory and query work bounded.

Incomplete later checkpoints remain valid and contribute only where present. Loading, per-detection calculation, and cohort aggregation stay separate from HTTP exposure and derived persistence.

## M7.30 expose one bounded aggregate without derived storage

The first cohort endpoint calculates directly from bounded durable timelines so newly completed checkpoints are reflected immediately and no cache invalidation or derived-table lifecycle is needed. It defaults to the 50 most recent eligible detections and allows at most 100.

The response keeps each checkpoint's independent sample size visible and returns a valid empty aggregate when no completed T+0 baseline exists. This remains descriptive public-market research, not a profitability or trading signal.

## M7.31 require explicit pattern thresholds

“Pump” and “correction” have no trustworthy universal percentage in the project hypothesis. The classifier therefore accepts both thresholds explicitly instead of embedding defaults. A pump is first observed when a T+0-relative return reaches its threshold; correction is measured only afterward against the highest observed post-pump price.

Statuses use “observed” deliberately: an incomplete timeline with no qualifying event is not proof that the event will never happen. Classification remains pure, exact-decimal research output and cannot create a score, signal, alert, or order.

## M7.32 derive classification from durable observations on demand

Pattern classification reuses the existing durable timeline and price-performance calculation instead of storing another mutable projection. This keeps one source of truth and lets newly completed checkpoints affect the next calculation immediately.

A known detection without T+0 has no valid classification baseline and remains explicitly unavailable. Thresholds stay caller-supplied; this internal composition does not choose a market hypothesis or expose it publicly.

## M7.33 require thresholds on every classification request

The classification route has no implicit market hypothesis: clients must supply both positive decimal thresholds on every request. Shared validation rejects malformed criteria before database access, and a correction threshold above one is invalid because a positive price cannot fall by more than its entire peak value.

The route mirrors existing detection semantics: malformed input is 400, unknown identity is 404, and missing T+0 is 503. Results remain calculated on demand and read-only.

## M7.34 keep classification cohort denominators explicit

Pump rate and correction rate use the full classified sample, while correction-among-pumps rate uses only classifications where a pump was observed. Publishing both denominators avoids making correction prevalence appear larger or smaller through an implicit population choice.

Only unique symbols classified under numerically equal thresholds may share a cohort. Empty samples and samples without pumps return null for undefined rates instead of zero, and all defined ratios use isolated 40-digit decimal arithmetic.

# New Listing Research

## M7.1 public Spot symbol catalog

M7.1 loads one unauthenticated Binance `GET /api/v3/exchangeInfo` snapshot at startup and normalizes USDT-quoted symbols behind a provider-neutral contract. Each entry retains provider symbol, base and quote assets, status, and explicit Spot-trading availability. Results are sorted and retained in memory as the baseline for a future separately approved comparison.

Invalid USDT entries reject the snapshot; non-USDT entries are ignored. Loading uses a ten-second timeout, supports shutdown cancellation, and failure does not prevent application startup. This increment adds no polling, persistence, listing detection, HTTP route, scoring, signals, orders, or financial mutation.

## M7.2 durable symbol observations

Each successfully loaded catalog is transactionally upserted in PostgreSQL by provider and symbol. `firstObservedAt` is immutable after insertion, while `lastObservedAt`, status, assets, and Spot availability reflect the latest successful observation. These timestamps describe this application's observations and are not asserted to be Binance listing times. No polling, public route, alert, signal, or trading behavior is added.

## M7.3 conservative newly observed detection

Each successful observation compares the current catalog with the provider's durable rows inside the same serializable transaction that performs the upserts. The first non-empty observation establishes the baseline and deliberately reports no additions. Once a baseline exists, current symbols missing before that transaction are returned as newly observed and retained by the startup catalog service.

This is application-observation detection, not proof of an exchange listing time. Empty catalogs produce no database change or detection. M7.3 adds no polling, HTTP route, notification, scoring, strategy signal, order, or financial mutation.

## M7.4 sequential catalog polling

The catalog service loads immediately at startup and schedules the next refresh only after the current load and persistence attempt finishes. This prevents overlapping observations even when Binance or PostgreSQL is slow. Failures preserve the last successful catalog and detection result and still schedule a later retry.

`NEW_LISTINGS_POLL_INTERVAL_MS` controls the delay between completed attempts, defaults to 60,000 milliseconds, and has a validated minimum of 5,000 milliseconds. Application shutdown aborts the active public request and clears any pending timer. No route, alert, score, strategy signal, order, or financial mutation is introduced.

## M7.5 durable detection marker

`ObservedSpotSymbol.detectedAt` durably distinguishes additions found after an established provider baseline. Baseline rows receive null, including rows that predate this migration. A newly observed symbol receives the catalog's `receivedAt` value during its initial insert, and subsequent observations cannot change that value.

The marker records when this application detected the symbol, not when Binance officially listed it. The indexed nullable field prepares bounded research reads without adding an HTTP route, notification, scoring, market tracking, signal, order, or financial mutation.

## M7.6 bounded detection API

`GET /new-listings` reads only rows with a non-null `detectedAt`, ordered by detection time descending with provider and symbol tie-breakers. The optional `limit` accepts integers from 1 through 100 and defaults to 50. No detections returns an empty array.

Each response item contains provider, symbol, base and quote assets, current provider status and Spot availability, immutable application detection time, and latest observation time. The route is local and read-only; it cannot trigger refreshes, alerts, scoring, signals, orders, or financial mutation.

## M7.7 inclusive detection-time filters

`GET /new-listings` accepts optional `detectedFrom` and `detectedTo` parameters as canonical millisecond-precision UTC timestamps such as `2026-09-14T02:00:00.000Z`. Both boundaries are inclusive and combine with the existing bounded newest-first query. A malformed timestamp or a range whose start is after its end returns `400` before database access.

Filtering does not alter ordering or expose baseline rows. Cursor pagination, provider/status filters, alerts, scoring, market tracking, signals, and trading remain outside this increment.

## M7.8 stable detection cursor

`GET /new-listings` accepts an optional cursor in canonical `provider:symbol` form, for example `binance:NEWUSDT`. A client obtains the next page by using the provider and symbol of the final item from the preceding page. The repository resolves that durable identity to its immutable detection time and continues exclusively after the complete `(detectedAt DESC, provider ASC, symbol ASC)` sort position.

The cursor must identify a detected row and must belong to the requested detection-time interval. Malformed, missing, baseline-only, and filter-incompatible cursors return `400`. The response remains a bounded array; provider/status filters, alerts, scoring, market tracking, signals, and trading remain outside this increment.

## M7.9 current provider-state filters

`GET /new-listings` accepts optional `provider=binance`, an uppercase provider `status` of up to 30 characters, and strict `spotTradingAllowed=true|false`. These filters compose with limit, detection-time bounds, and cursor pagination and are applied by PostgreSQL before the bounded result is returned.

A cursor must itself match every active filter so changing filters between pages fails explicitly with `400` instead of creating an ambiguous continuation. The fields describe the latest observed provider state, not state at detection time. Historical state transitions, alerts, scoring, market tracking, signals, and trading remain outside this increment.

## M7.10 filtered detection summary

`GET /new-listings/summary` aggregates the durable detection set after applying the same optional detection-time, provider, current-status, and current Spot-availability filters as the list route. It returns `count`, `firstDetectedAt`, and `lastDetectedAt`; both timestamps are null when no detection matches.

The summary answers only how many application detections are represented and the bounds of that sample. It does not infer official listing times or introduce price tracking, pump/correction classification, alerts, scoring, signals, or trading.

## M7.11 current-state sample composition

The same summary now includes `byStatus` and `bySpotTradingAllowed` arrays, each containing deterministic ascending groups and exact counts. Total, temporal bounds, and both breakdowns are read in one PostgreSQL transaction so they describe one consistent matching sample.

These groups describe the latest observed mutable provider state and remain subject to all active filters. They do not reconstruct historical state at detection time or add market-performance tracking.

## M7.12 deterministic observation schedule

The domain defines an immutable ordered checkpoint specification at `T+0`, `T+5s`, `T+10s`, `T+30s`, `T+1m`, `T+5m`, `T+15m`, `T+1h`, and `T+24h`. A pure function projects these offsets from a valid application `detectedAt` into independent UTC instants.

This increment establishes timing semantics only. It creates no persistence, scheduler, timer, provider request, market sample, alert, score, signal, or trade.

## M7.13 durable observation checkpoints

Each post-baseline detection now creates all nine schedule rows in the same serializable transaction as the detected symbol. Composite provider/symbol/label identity prevents duplicates, while target-time indexing prepares later due-work reads. The migration backfills checkpoints only for rows with a legitimate non-null detection time.

No worker claims checkpoints and no market data is requested or stored in this increment.

## M7.14 bounded due-checkpoint read

The repository can now list checkpoints with `targetAt` at or before an explicit instant, bounded by a caller-supplied limit and ordered by target time, provider, symbol, and label. This internal read is deterministic and provider-neutral. It does not claim, complete, retry, or process checkpoints and performs no provider request.

## M7.15 validated due-checkpoint application boundary

An internal application service now accepts only a valid due instant and an integer limit from 1 through 100 before delegating to the M7.14 repository read. Invalid input fails before PostgreSQL access. No controller, worker, claim, retry, or market request is introduced.

## M7.16 atomic checkpoint leases

The internal application boundary can now claim a bounded due batch with a validated safe token, claim instant, and later expiry. PostgreSQL selects and updates candidates atomically with `FOR UPDATE SKIP LOCKED`; active leases are excluded and expired leases are reclaimable. Returned rows retain deterministic target/provider/symbol/label order.

The database enforces all-or-none lease fields and a strictly later expiry. This increment adds no scheduler, worker loop, checkpoint completion, retry policy, provider request, market sample, alert, score, signal, or trade.

## M7.17 ownership-safe checkpoint completion

An internal completion command now validates checkpoint identity, lease token, and completion time before persistence access. PostgreSQL records `completedAt` only when the token matches, the completion falls within the active lease interval, and the checkpoint is not already complete. A failed ownership condition returns `false` without mutation.

Completed checkpoints are terminal and excluded from both due reads and later claims. Database constraints bind completion time to the recorded lease interval. This increment adds no worker, retry policy, provider request, market sample, alert, score, signal, or trade.

## M7.18 bounded worker configuration

The future checkpoint worker now has one injected options contract populated by startup-validated environment configuration. Defaults are a 5-second completion-relative interval, a batch size of 25, and a 30-second lease. Interval is restricted to 1–60 seconds, batch size to 1–100, and lease duration to 5–300 seconds.

The values are documented in `.env.example` and available to the new-listings module, but no scheduler or timer consumes them yet. No checkpoint is automatically claimed or completed and no provider request, market sample, alert, score, signal, or trade is introduced.

## M7.19 deterministic single-cycle orchestration

An internal cycle service now creates a unique claim token, claims one configured batch at an explicit clock instant, and passes each claimed checkpoint to a provider-neutral processor sequentially. Successful processing attempts ownership-safe completion; processor failures are isolated per item and remain eligible after lease expiry. The result reports claimed, completed, failed, and lost-lease counts.

The cycle service is registered for later scheduling but has no production processor and is never invoked automatically. This increment therefore performs no live claim, timer, provider request, market sample, alert, score, signal, or trade.

## M7.20 exact checkpoint market-observation contract

The checkpoint processor now has a provider-neutral data boundary to target before any Binance adapter is introduced. Each observation carries the provider and canonical exchange symbol, exact-string last price, base and quote volumes, a non-negative safe-integer trade count, the provider's market-window open and close times, and the independent local receive time.

Validation requires a positive price, non-negative volumes, a canonical uppercase alphanumeric symbol, valid times, and a non-inverted provider window. It deliberately does not compare the provider clock with the local receive clock, because clock skew must not turn a valid public response into corrupt data. This increment adds no HTTP request, persistence, checkpoint processor, timer, score, signal, or trade.

## M7.21 public Binance rolling-ticker adapter

The provider contract is now implemented through Binance Spot `GET /api/v3/ticker/24hr` with one mandatory canonical symbol, using the public market-data base URL and no authentication. The adapter maps `lastPrice`, `volume`, `quoteVolume`, `count`, `openTime`, and `closeTime` into the M7.20 observation and records a separate local receive time.

Requests have a ten-second timeout and compose caller cancellation. Non-success responses, symbol mismatches, malformed payloads, unsafe timestamps or counts, and domain-invalid decimals are rejected. The adapter is available through dependency injection but no production checkpoint processor calls it, so this increment neither persists observations nor starts the worker cycle.

## M7.22 durable checkpoint market-observation persistence

`listing_observation_checkpoints` now stores `lastPrice`, `baseVolume`, `quoteVolume`, `tradeCount`, `windowOpenTime`, `windowCloseTime`, and `receivedAt` alongside `completedAt`. The application completion command validates the matching observation before persistence, and PostgreSQL enforces that all observation fields are either completely absent on uncompleted checkpoints or fully populated and consistent when completed. Lifecycle-only completions from before this schema are reopened without fabricated data so a future processor can collect them honestly.

The cycle service passes the observation returned by the checkpoint processor directly to ownership-safe completion. A production processor, background timer, retries, alerts, scoring, signals, and trading remain separate increments.

## M7.23 provider-backed checkpoint processor

The production processor now maps each claimed checkpoint's provider and symbol into the M7.20 observation-provider request and returns that snapshot to the existing cycle. The Binance implementation remains behind the provider-neutral interface, so orchestration contains no exchange-specific payload logic.

Provider failures are intentionally propagated to the cycle, which isolates the failed item and leaves its lease to expire under the existing recovery rule. The processor is registered for dependency injection but no lifecycle hook or timer calls the cycle yet.

## M7.24 opt-in checkpoint worker lifecycle

A NestJS lifecycle worker can now invoke the production cycle at the validated configured interval. It uses recursive one-shot timers after each cycle settles, preventing overlap even when provider or database work lasts longer than the configured quiet period. Cycle-level failures are logged and followed by the next scheduled attempt.

`NEW_LISTINGS_CHECKPOINT_WORKER_ENABLED` defaults to `false`. Existing installations therefore retain inactive behavior until an operator explicitly opts into public market collection. Shutdown clears a pending timer and waits for an in-flight bounded cycle before completing; retries, alerting, scoring, signals, and trading remain outside this increment.

## M7.25 completed observation timeline API

`GET /new-listings/:provider/:symbol/observations` exposes only completed checkpoint samples for one durable detected symbol, ordered by checkpoint target time from `T+0` through `T+24h`. Price and volume values remain exact decimal strings and each item includes its schedule identity, target and completion times, provider window, receive time, and trade count.

The path accepts only `binance` and a canonical uppercase alphanumeric symbol. Invalid identities return `400`, an identity that is not a durable detection returns `404`, and a known detection with no completed sample returns an empty array. Pending/leased checkpoints, claim metadata, alerts, scoring, derived returns, signals, and trading are not exposed.

## M7.26 exact T+0-relative price performance

A pure provider-neutral calculator validates one completed observation timeline and derives each checkpoint's absolute price change and price return rate relative to the explicit `T+0` last price. Inputs are normalized into deterministic schedule order, and all arithmetic uses a 40-digit `decimal.js` context with decimal-string outputs.

An empty timeline or one without `T+0` returns unavailable instead of substituting a later sample as the baseline. Mixed provider/symbol identities, duplicate labels, invalid schedule metadata, and incoherent checkpoint times fail explicitly. This calculation has no HTTP route, derived persistence, aggregate statistics, score, alert, signal, or trading behavior.

## M7.27 price-performance API

`GET /new-listings/:provider/:symbol/performance` loads the completed durable observation timeline and applies the M7.26 calculation on demand. The response identifies the provider, symbol, `T+0` baseline price, and chronological points containing last price, absolute change, and fractional return rate as decimal strings.

The route shares the timeline identity validation: malformed input returns `400` and an unknown durable detection returns `404`. A known detection without a completed `T+0` returns `503`, clearly separating temporary analytical unavailability from absence. No derived result is persisted, and aggregate statistics, classification, score, alert, signal, and trading remain outside this increment.

## M7.28 checkpoint cohort performance

A pure calculator aggregates already validated per-detection performance by scheduled checkpoint. For each available label it reports the independent sample size, positive, negative, and flat return counts, plus the average fractional price return using the same isolated 40-digit decimal policy.

Incomplete timelines contribute only the checkpoints they actually contain, so later labels may have smaller samples and never inherit values from earlier observations. Duplicate detection symbols and malformed points fail explicitly. This increment adds no database query, route, derived persistence, classification, score, alert, signal, or trading behavior.

## M7.29 durable cohort loading

The internal detection read model can now load a bounded cohort of 1 through 100 recent durable Binance detections that have a completed `T+0` checkpoint. PostgreSQL applies eligibility, newest-detection ordering, symbol tie-breaking, and the limit before loading each detection's completed observation timeline.

Each timeline is converted through the existing exact T+0-relative calculator and then aggregated by the M7.28 cohort calculator. Later incomplete checkpoints remain absent from their independent samples. This increment adds no HTTP route, derived persistence, classification, score, alert, signal, or trading behavior.

## M7.30 cohort performance API

`GET /new-listings/performance` exposes the M7.29 durable cohort calculation through a local read-only route. The optional `limit` accepts integers from 1 through 100 and defaults to 50; the optional provider is restricted to `binance` and defaults to it.

An empty eligible cohort returns the explicit empty aggregate rather than an error. The endpoint reads durable public-market observations and calculates on demand; it does not persist derived values, classify assets, emit alerts or signals, or reach any trading path.

## M7.31 explicit pump/correction classification

A pure classifier now consumes one validated T+0-relative price-performance timeline plus caller-supplied positive pump and correction thresholds. The first checkpoint at or above the pump return threshold marks the observed pump; subsequent prices update the running post-pump peak until a checkpoint reaches the required fractional drawdown from that peak.

The result explicitly distinguishes `no-pump-observed`, `pump-observed`, and `pump-and-correction-observed`, records the evaluated-through checkpoint, and preserves exact decimal strings. The correction threshold cannot exceed one. No default hypothesis, database query, route, persistence, score, alert, signal, or trade is introduced.

## M7.32 durable pattern classification

The internal detection read model now composes one durable completed observation timeline through the existing exact T+0 performance calculator and the M7.31 explicit-threshold pattern classifier. Unknown detections preserve the existing not-found behavior, while a known detection without completed `T+0` returns classification unavailable.

Classification remains calculated on demand and is not persisted. This increment adds no HTTP route, default thresholds, cohort classification statistics, score, alert, signal, or trading behavior.

## M7.33 pattern classification API

`GET /new-listings/:provider/:symbol/classification` exposes the M7.32 durable on-demand classification. Both `pumpReturnRate` and `correctionFromPeakRate` are required positive decimal query parameters, and the correction threshold cannot exceed one. Invalid identity or thresholds return `400` before durable observation loading.

An unknown detection returns `404`, while a known detection without completed `T+0` returns `503`. The endpoint introduces no default thresholds, derived persistence, cohort classification statistics, score, alert, signal, or trading behavior.

## M7.34 pattern cohort statistics

A pure calculator now aggregates classifications produced with numerically equal explicit thresholds. It reports the total classified sample, no-pump count, pump count (including corrected pumps), correction count, pump rate over the full sample, correction rate over the full sample, and correction rate among observed pumps.

All rates use isolated 40-digit decimal arithmetic. Empty cohorts expose zero counts and null rates, while duplicate symbols, mixed thresholds, or incoherent classification states fail explicitly. This increment adds no durable loading, route, persistence, score, alert, signal, or trading behavior.

## M7.35 durable pattern cohort loading

The internal detection read model now loads the same bounded cohort of 1 through 100 recent durable Binance detections with completed `T+0` observations introduced by M7.29. It converts each completed timeline to exact price performance, applies one caller-supplied valid threshold pair, and aggregates the classifications through the M7.34 calculator.

Limit and threshold validation run before repository access. An empty eligible sample preserves the explicit empty aggregate, and an incoherent repository result without `T+0` fails rather than silently changing eligibility. This increment adds no route, default thresholds, derived persistence, score, alert, signal, or trading behavior.

## M7.36 pattern cohort API

`GET /new-listings/classification` exposes the M7.35 durable pattern cohort through a local read-only route. The optional `limit` accepts integers from 1 through 100 and defaults to 50; the optional provider is restricted to `binance`. Both positive decimal `pumpReturnRate` and `correctionFromPeakRate` are required, and the correction threshold cannot exceed one.

Invalid query input returns `400` before durable loading, while an empty eligible cohort returns the explicit empty aggregate. The endpoint calculates on demand and adds no default thresholds, derived persistence, score, alert, signal, or trading behavior.

## M7.37 pattern magnitude medians

A pure calculator now reports the median observed peak return among pump classifications and the median observed drawdown from peak among corrected classifications. Each statistic exposes its own sample size, so uncorrected pumps contribute to peak magnitude without being treated as zero corrections.

Odd samples select the middle exact-decimal value and even samples average their two middle values under the isolated 40-digit decimal policy. Empty denominators remain null, and magnitudes below the thresholds that produced their classifications fail explicitly. This increment adds no durable loading, route, persistence, score, alert, signal, or trading behavior.

## M7.38 durable pattern magnitude loading

The internal detection read model now applies the M7.37 magnitude calculator to the same bounded cohort of 1 through 100 recent durable Binance detections with completed `T+0` observations. One shared internal composition validates limit and thresholds, loads timelines, derives exact performance, and classifies each detection before either frequency or magnitude aggregation.

An empty eligible cohort preserves explicit null medians and zero event samples. Incoherent repository results still fail rather than weakening T+0 eligibility. This increment adds no route, default thresholds, derived persistence, score, alert, signal, or trading behavior.

## M7.39 pattern magnitude API

`GET /new-listings/classification/magnitudes` exposes the M7.38 durable magnitude calculation through a separate local read-only route. The optional `limit` accepts integers from 1 through 100 and defaults to 50; the optional provider is restricted to `binance`. Both positive decimal pattern thresholds are mandatory, and the correction threshold cannot exceed one.

The response preserves independent pump and correction sample sizes with null medians for absent event samples. Invalid query input returns `400` before durable loading. No default thresholds, derived persistence, timing statistics, scoring, alert, signal, or trading behavior is introduced.

## M7.40 pattern timing medians

A pure calculator now reports the median scheduled duration from `T+0` to the first observed pump threshold and the median duration from the post-pump peak to the first observed correction. Pump and correction durations retain independent sample sizes; missing events are excluded rather than represented as zero.

Odd samples select the middle duration and even samples average their two middle durations. Every event label must match its canonical checkpoint offset, peaks cannot precede pumps, and corrections must follow their peak. Empty samples remain explicit nulls. This increment adds no durable loading, route, persistence, scoring, alert, signal, or trading behavior.

## M7.41 durable pattern timing loading

The internal detection read model now applies the M7.40 timing calculator to the bounded cohort of 1 through 100 recent durable Binance detections with completed `T+0`. It reuses the shared validation, timeline loading, exact performance, and explicit-threshold classification pipeline already consumed by frequency and magnitude statistics.

An empty eligible cohort returns zero event samples and null timing medians. Invalid limit or thresholds fail before repository access, and incoherent timelines remain explicit failures. This increment adds no route, persistence, scoring, alert, signal, or trading behavior.

## M7.42 pattern timing API

`GET /new-listings/classification/timing` exposes the M7.41 durable timing calculation through a separate local read-only route. The optional `limit` accepts integers from 1 through 100 and defaults to 50; the optional provider is restricted to `binance`. Both positive decimal pattern thresholds are mandatory, and the correction threshold cannot exceed one.

The response preserves independent pump and correction sample sizes with null medians for absent event samples. Invalid query input returns `400` before durable loading. No default thresholds, derived persistence, scoring, alert, signal, or trading behavior is introduced.

## M7.43 checkpoint market activity cohort

A pure cohort calculator groups completed listing observations by canonical checkpoint and reports the exact average rolling-24-hour base volume, quote volume, and trade count with an explicit sample size. Unequal timeline coverage is preserved rather than filled, and empty cohorts remain explicit.

Every timeline must be non-empty, provider-valid, internally single-symbol, unique within the cohort, and free of duplicate or non-canonical checkpoints. Decimal averages use exact arithmetic and trade-count averages remain decimal strings when non-integral. These provider rolling-window measures describe market activity only: they do not represent order-book depth, spread, price impact, or executable liquidity. This increment adds no durable loading, route, persistence, score, alert, signal, or trading behavior.

## M7.44 durable checkpoint market activity loading

The internal detection read model now applies the M7.43 activity calculator to the existing bounded cohort of 1 through 100 recent durable Binance detections with completed `T+0`. It performs one repository read and retains each checkpoint's independent coverage instead of requiring complete timelines.

An empty eligible cohort returns no checkpoints and a zero detection count. Invalid limits fail before repository access, and incoherent durable timelines remain explicit errors. The result continues to describe rolling-window market activity, not executable liquidity. This increment adds no route, derived persistence, score, alert, signal, or trading behavior.

## M7.45 checkpoint market activity API

`GET /new-listings/activity` exposes the M7.44 durable activity calculation through a local read-only route. The optional `limit` accepts integers from 1 through 100 and defaults to 50; the optional provider is restricted to `binance`. Invalid query input returns `400` before durable loading.

The response reports exact average rolling-window base volume, quote volume, and trade count with independent checkpoint sample sizes. Its naming and route deliberately avoid claiming order-book depth or executable liquidity. This increment adds no derived persistence, scoring, alert, signal, or trading behavior.

## M7.46 listing top-of-book observation contract

A provider-neutral contract now represents one public top-of-book observation for an arbitrary canonical listing symbol. It preserves the provider update ID, exact bid and ask prices, exact displayed quantities, and independent local receive time. A loader interface accepts an explicit provider/symbol request and optional cancellation signal without selecting a transport.

Validation requires Binance identity, canonical symbols, a non-negative integer update ID, positive prices, non-negative quantities, a non-crossed book, and a valid receive time. Locked books and zero displayed quantities remain valid observations. This increment adds no Binance request, stream, spread calculation, persistence, worker integration, route, score, alert, signal, or trading behavior.

## M7.47 listing top-of-book spread

A pure calculator validates one M7.46 observation and derives its absolute spread, midpoint, and spread in basis points with an isolated 40-digit half-even decimal context. The normalized result preserves provider, symbol, update ID, best prices, displayed quantities, and receive time so every metric remains traceable to one snapshot.

A locked positive book produces zero spread, while a crossed or otherwise invalid observation fails before calculation. The result describes only level-one displayed state and does not estimate depth, market impact, slippage, or executable fill size. This increment adds no Binance request, persistence, worker integration, route, score, alert, signal, or trading behavior.

## M7.48 Binance listing top-of-book snapshot

The M7.46 provider contract is now implemented with public Binance Spot `GET /api/v3/depth` for one mandatory canonical symbol and `limit=5`. The adapter uses the smallest supported depth snapshot that preserves `lastUpdateId`, normalizes only the first bid and ask, and discards the additional returned levels rather than introducing a depth model.

Requests require no credentials, have a ten-second timeout, compose caller cancellation, and validate input before network access. Non-success errors expose only the status code; successful payloads require a safe non-negative update ID, non-empty exact-string price levels, and all M7.46 domain invariants. This increment does not wire the adapter into the module, checkpoint worker, persistence, routes, scoring, alerts, signals, or trading.

## M7.49 listing top-of-book provider registration

The Binance depth-snapshot adapter is registered in the new-listings dependency container behind `LISTING_TOP_OF_BOOK_OBSERVATION_PROVIDER`. Its factory reuses the startup-validated `BINANCE_REST_BASE_URL`, keeping future application consumers independent from the concrete provider client.

The registration is inert by itself: no service injects the token, no request starts during application lifecycle, and no checkpoint, persistence, route, score, alert, signal, or trading behavior is introduced.

## M7.50 listing top-of-book snapshot composition

An internal application service now composes the provider-neutral top-of-book loader with the exact spread calculator. A caller must explicitly supply the provider and canonical symbol; the service forwards optional cancellation, loads exactly one snapshot, and returns spread, midpoint, and basis points tied to that same update ID and receive time.

Provider failure is propagated and prevents calculation. The service is available through dependency injection but nothing invokes it automatically, and it adds no persistence, checkpoint integration, route, scoring, alert, signal, or trading behavior.

## M7.51 durable checkpoint top-of-book storage

Each existing observation checkpoint can now own at most one optional top-of-book record. The child row uses the checkpoint's provider, symbol, and schedule label as its immutable primary and foreign key, and deletion of the parent detection/checkpoint cascades naturally.

Update ID, bid/ask prices, and displayed quantities remain their exact validated strings rather than being rounded to a database decimal scale. Database constraints independently enforce canonical numeric shapes, positive prices, non-negative quantities, and a non-crossed book. The create-only provider-neutral repository rejects observation/checkpoint identity mismatches before database access. It is registered for later use but the worker does not invoke it, so no automatic collection, HTTP route, scoring, alert, signal, or trading behavior is added.

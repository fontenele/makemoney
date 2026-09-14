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

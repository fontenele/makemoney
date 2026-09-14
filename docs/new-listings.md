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

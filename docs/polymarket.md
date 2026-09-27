# Polymarket

M9 adds prediction-market research as a separate domain from Binance Spot crypto. The first increment is intentionally public, read-only, and stateless.

## M9.1 — Public active-market discovery

The application exposes `GET /polymarket/markets` and loads one bounded keyset page from the public Polymarket Gamma API.

Supported query parameters:

- `limit`: integer from 1 through 100, default `20`;
- `cursor`: optional opaque cursor returned as `nextCursor` by the preceding page.

Each normalized market contains the provider, Polymarket market ID, nullable slug, nullable question, nullable condition ID, and explicit `closed: false`. The response also carries the provider cursor and local receipt time.

The adapter uses `POLYMARKET_GAMMA_BASE_URL`, requires HTTPS configuration, sends no credentials, applies a ten-second timeout, requests only `closed=false`, and rejects malformed pages instead of passing provider payloads into the application.

## M9.2 — Selected-market outcome identities

`GET /polymarket/markets/:id` loads one market from the public Gamma endpoint using a validated positive numeric market ID.

Gamma encodes outcome labels and CLOB token IDs as JSON arrays inside strings. The adapter parses both arrays strictly, requires exactly two indexed entries, and maps index `0` to `outcomes.yes` and index `1` to `outcomes.no`. Each outcome preserves its provider label and a nullable canonical decimal token ID. A market without assigned CLOB tokens returns both identities as `null` instead of inventing values.

Malformed arrays fail the complete request. A provider `404` becomes a local `404`; invalid IDs return `400`; other provider or normalization failures return `503`.

Although Gamma also returns `outcomePrices`, M9.2 deliberately ignores them. Price decimals, freshness, quote semantics, and market availability require a separate contract and tests.

## Boundaries

M9.1–M9.2 do not persist or poll markets. They do not load events, prices, books, trades, liquidity, resolution data, positions, or accounts. They have no authentication, signing, wallet, order, strategy, signal, paper execution, real execution, or dashboard path.

Provider failure is exposed locally as `503`. Runtime validation against a real Gamma response was attempted but the development environment could not resolve the provider hostname; the client contract is covered with the current official documented response shape and focused automated tests.

## Next safe increment

A later M9 increment may load a selected outcome's public observational price behind an explicit exact-decimal and freshness contract. It must remain separate from Spot pairs and every trading executor.

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

## M9.3 — Public outcome midpoint observation

`GET /polymarket/outcomes/:tokenId/midpoint` requests the public CLOB midpoint for one canonical decimal outcome-token ID. The adapter calls `GET /midpoint?token_id=...` without credentials and applies a ten-second timeout.

The response preserves the provider's canonical decimal string from zero through one and identifies its source as `clob-midpoint`. The midpoint is the provider-defined average of the best bid and best ask; it is marked `executable: false` because it is neither side of the book and makes no fill or liquidity claim.

Each request goes directly to the provider and is not cached. `receivedAt` records when this application accepted the response. Because the endpoint returns no market-data timestamp, `providerTimestamp` is explicitly `null`; local receipt time must not be misrepresented as the age of the upstream book.

Malformed token IDs return `400`. Provider `400` for an invalid token and `404` for a missing order book become local `404`; transport, other HTTP, JSON, or decimal-contract failures become `503`.

## Boundaries

M9.1–M9.3 do not persist or poll markets. M9.3 exposes only one current midpoint observation, not an order book, executable quote, historical series, liquidity measure, or probability guarantee. The increments do not load events, trades, resolution data, positions, or accounts. They have no authentication, signing, wallet, order, strategy, signal, paper execution, real execution, or dashboard path.

Provider failure is exposed locally as `503`. Runtime validation against a real Gamma response was attempted but the development environment could not resolve the provider hostname; the client contract is covered with the current official documented response shape and focused automated tests.

## Next safe increment

A later M9 increment may expose the selected market's public top-of-book bid and ask with strict price, quantity, spread, and missing-liquidity semantics. It must remain observational and separate from every trading executor.

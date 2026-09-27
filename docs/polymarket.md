# Polymarket

M9 adds prediction-market research as a separate domain from Binance Spot crypto. The first increment is intentionally public, read-only, and stateless.

## M9.1 — Public active-market discovery

The application exposes `GET /polymarket/markets` and loads one bounded keyset page from the public Polymarket Gamma API.

Supported query parameters:

- `limit`: integer from 1 through 100, default `20`;
- `cursor`: optional opaque cursor returned as `nextCursor` by the preceding page.

Each normalized market contains the provider, Polymarket market ID, nullable slug, nullable question, nullable condition ID, and explicit `closed: false`. The response also carries the provider cursor and local receipt time.

The adapter uses `POLYMARKET_GAMMA_BASE_URL`, requires HTTPS configuration, sends no credentials, applies a ten-second timeout, requests only `closed=false`, and rejects malformed pages instead of passing provider payloads into the application.

## Boundaries

M9.1 does not persist or poll markets. It does not load events, outcome token IDs, prices, books, trades, liquidity, resolution data, positions, or accounts. It has no authentication, signing, wallet, order, strategy, signal, paper execution, real execution, or dashboard path.

Provider failure is exposed locally as `503`. Runtime validation against a real Gamma response was attempted but the development environment could not resolve the provider hostname; the client contract is covered with the current official documented response shape and focused automated tests.

## Next safe increment

Before price or book research, a later M9 increment should load one selected market's public detail and normalize its YES/NO outcome token identities. That design must preserve prediction-market semantics and remain separate from Spot pairs and trading executors.

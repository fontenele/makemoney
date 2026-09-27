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

## M9.4 — Public outcome top of book

`GET /polymarket/outcomes/:tokenId/top-of-book` requests the public CLOB order-book snapshot for one canonical outcome-token ID and retains only its best bid and best ask.

The adapter verifies that `asset_id` matches the request, preserves the condition ID, snapshot hash, raw provider timestamp, and local receipt time, and validates every returned level. Bids must follow the documented descending-price order, asks must follow ascending-price order, quantities must be positive exact decimal strings, and the best bid cannot exceed the best ask.

Bid and ask expose exact `price` and `quantity` strings. The spread is calculated as exact ask minus bid using an isolated 40-digit decimal context. If either side is empty, that side is `null` and spread is `null`; the API does not invent liquidity. The complete observation is marked `executable: false` because displayed liquidity can change before any hypothetical fill.

The provider timestamp remains raw text because the official endpoint identifies it as the snapshot timestamp without defining its unit in the response contract. No timestamp conversion or freshness precision is invented.

## M9.5 — Coherent outcome market data

`GET /polymarket/outcomes/:tokenId/market-data` requests the M9.3 midpoint and M9.4 top of book concurrently through their existing provider-neutral services. The response retains both independently normalized observations and never claims that the two provider endpoints share one atomic snapshot.

When bid and ask both exist, the application calculates `(bid + ask) / 2` with an isolated 40-digit decimal context. The provider midpoint must be numerically equal to that calculated value, including when the provider uses a different trailing-zero representation. A mismatch or response-token identity mismatch fails closed with `503` instead of returning inconsistent market data.

If bid, ask, or both are missing, coherence is explicitly `unverifiable` with a precise reason. No price or liquidity is invented. A verified response exposes the exact normalized `bookMidpoint`; every response remains `executable: false`.

## M9.6 — Public outcome last trade

`GET /polymarket/outcomes/:tokenId/last-trade` requests the unauthenticated public CLOB `last-trade-price` endpoint for one canonical outcome-token ID. It preserves the exact price string, normalizes the documented provider side from `BUY` or `SELL` to `buy` or `sell`, and marks the observation non-executable.

The endpoint supplies no trade ID, quantity, or timestamp. The response therefore exposes `providerTimestamp: null` and a separate local `receivedAt`; it must not be treated as current book state, a fill guarantee, complete trade history, or evidence of available liquidity.

The provider documents `price: "0.5"` with an empty side as a placeholder when the token has never traded and its order book is empty. The adapter maps that sentinel to explicit unavailability, producing local `404`, rather than inventing a trade at `0.5`.

## M9.7 — Descriptive last-trade book context

`GET /polymarket/outcomes/:tokenId/last-trade/context` concurrently requests the independently normalized M9.6 last trade and M9.4 top of book. When both displayed sides exist, it classifies the trade price as `below_bid`, `at_bid`, `at_bid_and_ask`, `inside_spread`, `at_ask`, or `above_ask` and reports exact signed `priceMinusBid` and `askMinusPrice` distances.

This classification describes two independently timed observations. A last trade outside the current displayed spread is not treated as provider inconsistency because the book may have changed after that trade. The response therefore exposes `atomicSnapshot: false` and `executable: false` explicitly. It does not infer price freshness, direction, momentum, signal quality, or available liquidity.

If either displayed book side is absent, the relation is `unverifiable` with a precise missing-side reason and no distances. Component token-identity divergence fails closed with `503`; an unavailable trade or book produces `404`.

## M9.8 — Descriptive binary midpoint complement

`GET /polymarket/markets/:id/midpoint-complement` first loads the M9.2 selected binary market, requires present and distinct indexed YES and NO token IDs, and then requests both M9.3 midpoint observations concurrently. Response-token identity divergence fails closed.

The result calculates `midpointSum` and signed `deviationFromOne` with isolated 40-digit decimal arithmetic and classifies the sum as `balanced`, `below_one`, or `above_one`. It retains the market and both independently normalized midpoint observations for provenance.

The comparison does not imply that the two midpoint requests share one provider instant. A midpoint is not an executable price, so a deviation from one is not labeled arbitrage, profit, incoherence, or a recommendation. Every result exposes `atomicSnapshot: false` and `executable: false`. Missing outcome tokens, market absence, or unavailable midpoint observations produce `404`; malformed or incoherent upstream identity produces `503`.

## M9.9 — Public condition resolution state

`GET /polymarket/conditions/:conditionId/resolution` requests the public Data API `v2/resolutions` endpoint with exactly one condition selector. The identifier must be a `0x`-prefixed 32-byte hexadecimal value and the returned condition identity must match it exactly.

The normalized observation preserves the provider's status, extended-review, dispute, and arbitration flags, nullable raw resolution timestamp, and local receipt time. The provider documentation does not define the timestamp string format, so the application does not invent a conversion or precision. An empty documented result becomes local `404`; malformed, duplicate, mismatched, or unavailable provider data becomes `503`.

M9.9 deliberately does not interpret the provider payout array, infer YES or NO as the winner, or claim redemption value. Those semantics require a separate contract joining condition-grain resolution data to indexed outcomes.

## M9.10 — Indexed binary resolution result

`GET /polymarket/markets/:id/resolution` first loads the M9.2 selected market, requires its condition ID, and then loads the M9.9 condition-grain record. The canonical condition identities must match before the payout vector can be correlated by the documented outcome indexes: index `0` is YES and index `1` is NO.

Only three explicitly documented binary results are interpreted: `[1,0]` means YES winner/NO loser, `[0,1]` means NO winner/YES loser, and the rare `[0.5,0.5]` result marks both outcomes as split with an exact `0.5` payout rate. Missing, incomplete, non-binary, or unsupported vectors return `404` instead of inventing a result; identity divergence returns `503`.

The raw vector remains internal, so the condition-lifecycle response introduced in M9.9 does not change. M9.10 exposes a public read model only. It does not inspect a wallet or position, determine a user's entitlement, call a contract, or redeem tokens; `executable: false` makes that boundary explicit.

## M9.11 — Selected public event details

`GET /polymarket/events/:id` loads one public Gamma event using a validated positive numeric event ID. Events are modeled separately from markets: the normalized result preserves the event ID, nullable slug, title, nullable description and resolution source, nullable start/end timestamps, active/closed/archived/restricted flags, and local receipt time.

The nested market collection is bounded to at most 1,000 entries and reduced to references containing only market ID, nullable slug and question, nullable condition ID, and closed state. Every reference is validated as a complete unit; the route does not import nested prices, volume, liquidity, outcome arrays, or trading flags.

Provider `404` becomes local `404`, malformed IDs return `400`, and transport, other HTTP, identity, or normalization failures return `503`. M9.11 adds no event listing, persistence, polling, account, position, wallet, order, strategy, signal, or execution behavior.

## M9.12 — Bounded public event discovery

`GET /polymarket/events` loads one cursor-aware page from Gamma's public event keyset endpoint. The local API accepts an optional opaque `cursor` and a `limit` from 1 to 100, defaulting to 20, while the adapter always sends `closed=false` and verifies every returned event remains non-closed.

Gamma's keyset response includes relation-heavy records. The local discovery model intentionally retains only event ID, nullable slug, title, nullable start/end timestamps, active/closed/archived/restricted flags, next cursor, and receipt time. Nested markets, series, tags, event creators, chats, descriptions, resolution sources, prices, volume, liquidity, and trading flags are discarded from discovery; selected descriptive details and bounded market references remain available only through M9.11's ID route.

The documented final page may omit `next_cursor`; the adapter normalizes that case to `nextCursor: null`. Malformed pages, closed events, transport failures, and non-success provider responses fail closed and become local `503` responses.

## M9.13 — Selected public event taxonomy

`GET /polymarket/events/:id/tags` loads the public tags attached to one event using the same validated positive numeric Gamma event ID contract. The provider collection is bounded to at most 100 entries and each tag is reduced to its required ID plus nullable label and slug.

Duplicate IDs, malformed identities, oversized collections, transport failures, and invalid successful responses fail closed. Provider `404` becomes local `404`; other provider failures become `503`. An empty array is valid and means the provider returned no tags for the selected event.

Gamma editorial flags, publishing and update timestamps, and authoring fields are deliberately discarded. The route provides classification metadata only and adds no global tag catalog, related-tag traversal, filtering, polling, persistence, financial metric, position, account, or execution behavior.

## M9.14 — Selected public market taxonomy

`GET /polymarket/markets/:id/tags` loads the public tags attached to one market using the validated positive numeric Gamma market ID contract. The market provider owns a dedicated taxonomy read model with market identity, local receipt time, and at most 100 unique tag identities containing required ID plus nullable label and slug.

The adapter rejects duplicate IDs, malformed identity, and oversized collections. Provider `404` becomes local `404`; transport, other HTTP, and successful-response contract failures become `503`. An empty array remains a valid selected market with no attached tags.

The local market contract deliberately discards editorial visibility, publishing/update timestamps, and authoring metadata. It is separate from the event taxonomy model and adds no global catalog, tag relationships, filters, persistence, financial metric, position, account, or execution behavior.

## M9.15 — Bounded public global tag catalog

`GET /polymarket/tags` loads one public Gamma tag-catalog page. The local route accepts `limit=1..100`, defaulting to 20, and `offset=0..10000`, defaulting to 0. The adapter requests ascending provider-ID order and reduces every tag to required ID plus nullable label and slug.

The successful response preserves the requested offset, supplies `nextOffset` only when Gamma returned a full page and continuation remains within the local offset bound, and always sets `stablePagination: false`. Gamma exposes no snapshot token for this offset contract, so concurrent catalog changes can shift later pages and callers must not treat traversal as a stable snapshot.

Malformed identities, duplicate IDs, and pages larger than either the requested limit or the local maximum fail closed. Transport, non-success HTTP, and successful-response contract failures become local `503`. Editorial metadata, tag relationships, templates, carousel state, server-side filters, polling, and persistence remain outside this increment.

## M9.16 — Selected public tag details

`GET /polymarket/tags/:id` loads one tag from Gamma using a canonical positive numeric ID. The adapter normalizes the returned object through the same identity-only tag contract used by the catalog and then requires its ID to match the request exactly.

The response contains provider name, ID, nullable label and slug, and local receipt time. Invalid local IDs return `400`; provider `404` becomes local `404`; transport, other HTTP, malformed successful response, and identity divergence become `503`.

Gamma editorial flags, publishing and authoring fields, templates, carousel state, slug lookup, related-tag traversal, filtering, polling, and persistence remain excluded. The route adds no financial, position, account, order, wallet, or execution semantics.

## Boundaries

M9.1–M9.16 do not persist or poll markets, events, or tags. M9.3–M9.8 expose public observations, not executable quotes, fill guarantees, historical series, or probability guarantees. M9.4, M9.5, and M9.7 retain only level one and do not expose full depth. M9.6–M9.7 use only the latest reported trade price and side, not trade history. M9.8 compares only independently observed binary midpoints. M9.9 exposes resolution lifecycle state, while M9.10 separately interprets only recognized terminal binary payout vectors. M9.11 loads one selected event and bounded market references; M9.12 adds bounded event discovery summaries without nested relations or financial metrics; M9.13 and M9.14 expose only bounded selected-event and selected-market taxonomy identity; M9.15 adds identity-only global catalog traversal with explicitly unstable offset pagination; M9.16 adds one identity-checked selected tag. The increments do not load positions or accounts. They have no authentication, signing, wallet, order, redemption, strategy, signal, paper execution, real execution, or dashboard path.

Provider failure is exposed locally as `503`. Runtime validation against a real Gamma response was attempted but the development environment could not resolve the provider hostname; the client contract is covered with the current official documented response shape and focused automated tests.

## Next safe increment

A later M9 increment may add another narrowly bounded public research observation without introducing positions, redemption, trade history, persistence, authentication, accounts, or execution.

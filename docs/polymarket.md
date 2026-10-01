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

The response strictly reads the provider's `mid` field, preserves its canonical decimal string from zero through one, and identifies its source as `clob-midpoint`. The midpoint is the provider-defined average of the best bid and best ask; it is marked `executable: false` because it is neither side of the book and makes no fill or liquidity claim.

Each request goes directly to the provider and is not cached. `receivedAt` records when this application accepted the response. Because the endpoint returns no market-data timestamp, `providerTimestamp` is explicitly `null`; local receipt time must not be misrepresented as the age of the upstream book.

Malformed token IDs return `400`. Provider `400` for an invalid token and `404` for a missing order book become local `404`; transport, other HTTP, JSON, or decimal-contract failures become `503`.

## M9.4 — Public outcome top of book

`GET /polymarket/outcomes/:tokenId/top-of-book` requests the public CLOB order-book snapshot for one canonical outcome-token ID and retains only its best bid and best ask.

The adapter verifies that `asset_id` matches the request, preserves the condition ID, snapshot hash, raw provider timestamp, and local receipt time, and validates every returned level. The CLOB snapshot lists bids in ascending price order and asks in descending price order, so the adapter validates those provider orders and selects the final level of each side as the best price. Quantities must be positive exact decimal strings, and the best bid cannot exceed the best ask.

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

Gamma may encode absent optional description, resolution source, or a not-yet-assigned nested market condition identity as either an omitted value, `null`, or an empty string. The adapter canonicalizes all three absent forms to `null` while continuing to reject malformed non-string values and non-empty invalid condition identities.

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

## M9.17 — Selected public related tags

`GET /polymarket/tags/:id/related` loads the public Gamma `tags/{id}/related-tags/tags` collection for one canonical positive numeric source tag ID. The response identifies that source and contains at most 100 related tags reduced to required ID plus nullable label and slug.

The adapter rejects malformed identities, duplicate related IDs, oversized collections, and a source tag repeated inside its own related set. Provider `404` becomes local `404`; transport, other HTTP, JSON, and successful-response contract failures become `503`. An empty array is valid and means the provider returned no related tags.

The route performs one level of relationship lookup only. It adds no recursive graph traversal, relationship weights, slug lookup, event or market filtering, editorial metadata, polling, persistence, financial metric, position, account, order, wallet, or execution behavior.

## M9.18 — Exact-tag active-event discovery

`GET /polymarket/events` accepts an optional `tagId` alongside the existing `limit` and `cursor`. The value must be a canonical positive numeric Gamma tag ID. When present, the adapter sends `tag_id` and requests tag relations in the existing public keyset query.

The successful provider payload must include a bounded unique tag collection for every returned event, and each collection must contain the exact requested tag ID. Missing relations, duplicate or malformed tags, and events outside the requested taxonomy fail the complete page as `503` instead of silently trusting an ignored or incoherent filter. The public event summaries remain unchanged and do not expose the provider relation-heavy payload.

Filtering uses only the explicitly selected tag. Related tags from M9.17 are not expanded implicitly, and an empty page is valid; no tag-existence claim, ranking, recommendation, persistence, polling, position, account, order, wallet, or execution behavior is added.

## M9.19 — Exact-tag active-market discovery

`GET /polymarket/markets` accepts the same optional canonical positive numeric `tagId` alongside its existing `limit` and `cursor`. The adapter sends Gamma's `tag_id` and requests tag relations on the bounded keyset page.

Every returned market must include a bounded unique tag collection containing the exact requested identity. Missing relations, malformed or duplicate tags, and markets outside the selected taxonomy fail the complete request as `503`; the public market summary remains unchanged.

Related tags are never expanded implicitly. An empty page is valid and makes no tag-existence claim, and the filter adds no ranking, recommendation, persistence, polling, position, account, order, wallet, or execution behavior.

## M9.20 — Selected public series details

`GET /polymarket/series/:id` loads one public Gamma series using a canonical positive numeric ID. The adapter calls the unauthenticated `series/{id}` endpoint with the established ten-second timeout and requires the normalized response identity to match the request exactly.

The response preserves only provider, ID, nullable slug, nullable title, nullable recurrence, closed state, and local receipt time. Provider `404` becomes local `404`; malformed IDs return `400`; other HTTP, transport, JSON, identity, or field-contract failures return `503`.

Nested events and markets, financial metrics, rankings, filters, polling, persistence, accounts, positions, orders, wallets, and execution remain excluded.

## M9.21 — Bounded active-series discovery

`GET /polymarket/series` loads one public Gamma series page. The local route accepts `limit=1..100`, defaulting to 20, and `offset=0..10000`, defaulting to zero. The adapter fixes ascending provider-ID order, `closed=false`, and `exclude_events=true` so discovery does not import the provider's relation-heavy event graph.

Each result uses the M9.20 identity summary and must have a unique required ID, valid nullable slug/title/recurrence, and explicit `closed: false`. Malformed, duplicate, oversized, or closed results fail the complete request as `503`.

A full page exposes `nextOffset` only while continuation remains within the local offset bound. The response always declares `stablePagination: false` because Gamma provides no snapshot identity and concurrent catalog changes can shift later pages. Recurrence filtering, nested events or markets, metrics, polling, persistence, accounts, positions, orders, wallets, and execution remain excluded.

## M9.22 — Exact-recurrence active-series discovery

`GET /polymarket/series` accepts an optional `recurrence` alongside its existing `limit` and `offset`. The value must be non-empty, already trimmed, free of control characters, and no longer than 100 characters. It is sent unchanged through Gamma's documented recurrence query parameter.

When filtering, every normalized provider result must contain the exact requested recurrence. A missing or divergent recurrence fails the complete page as `503` rather than presenting a silently ignored or fuzzy provider filter as trustworthy. The public series summary and unstable offset pagination remain unchanged.

The application does not infer a recurrence vocabulary, normalize aliases, perform fuzzy matching, expand series relations, or add metrics, polling, persistence, accounts, positions, orders, wallets, or execution.

## M9.23 — Selected-series event references

`GET /polymarket/series/:id/events` loads the documented event relation from one selected Gamma series using the same canonical positive numeric series ID contract. The adapter requires the response series identity to match exactly and caps the relation at 1,000 unique events.

Each event reference preserves only required ID and title, nullable slug/start/end dates, and active/closed/archived/restricted lifecycle flags. Invalid timestamps, malformed flags, duplicate identities, oversized collections, and series identity divergence fail the complete request as `503`. Provider `404` remains local `404`, while malformed local IDs return `400`.

Nested markets, further series relations, descriptions, resolution sources, prices, volume, liquidity, open interest, editorial metadata, polling, persistence, accounts, positions, orders, wallets, and execution remain excluded.

## M9.24 — Public Data API freshness

`GET /polymarket/data-freshness` loads the unauthenticated Data API `v2/status` snapshot without parameters or pagination. It remains separate from local `/health`: local health reports this process and its PostgreSQL/Redis dependencies, while this observation reports how far behind the public Data API's serving projections and chain ingestion are.

The response preserves the provider's snapshot age and computation timestamp, chain/network and synchronized block range, at most 1,000 unique lagging cursor summaries, the most-lagged cursor, at most 100 unique serving mechanisms, the worst serving mechanism, and the provider's aggregate lag. Numeric values must be finite and non-negative, block values and counts must be safe integers, timestamps must be parseable, and collection identities and bounds must be coherent.

The provider documents `503` before its first background refresh. Local `503` therefore covers not-yet-measured state together with transport, other HTTP, JSON, oversized collection, and successful-response contract failures; missing measurement is never normalized to zero lag. The route does not load the affected feeds, profiles, positions, balances, PnL, activity, accounts, persistence, polling, orders, wallets, or execution.

## M9.25 — Selected-market open interest

`GET /polymarket/markets/:id/open-interest` first loads the existing selected-market detail, requires its canonical condition ID, and then calls the unauthenticated Data API `v2/oi` endpoint for exactly that condition. The provider row must match the requested identity exactly; an empty result is explicit unavailability and duplicate or mismatched rows fail closed.

The response preserves the open-interest value as a non-negative decimal string named `openInterestUsdc`, its Data API source and local receipt time, and the selected market for provenance. The value describes USDC currently held in outstanding positions across the market; it is not a balance, an executable quote, a wallet position, or available liquidity, and the result is marked `executable: false`.

M9.25 is stateless and loads no holder identities, per-wallet positions, PnL, accounts, credentials, orders, or execution behavior.

## M9.26 — Selected-event live volume

`GET /polymarket/events/:id/live-volume` first loads the existing selected-event detail and then calls the unauthenticated Data API `v2/live-volume` endpoint for exactly that event. The response preserves total taker volume and the per-market breakdown as non-negative decimal share quantities; these values are not USDC turnover.

The adapter accepts at most 1,000 unique condition rows, preserves one documented unidentified row as `conditionId: null`, requires descending volume order, and verifies with isolated decimal arithmetic that `takerVolumeTotalShares` equals the exact sum of every returned row. The composition service additionally requires every identified condition to belong to the selected Gamma event.

An absent event or live-volume observation returns `404`; malformed, oversized, duplicate, unordered, arithmetically inconsistent, identity-divergent, or unavailable provider data fails closed as `503`. The observation is stateless and non-executable and loads no individual trades, holders, wallet positions, PnL, accounts, credentials, orders, or execution behavior.

## M9.27 — Global open interest

`GET /polymarket/open-interest` calls the unauthenticated Data API `v2/oi` endpoint without condition filters. The response must contain exactly one row with `condition_id: null`, matching the provider's documented representation of platform-wide open interest. Empty, multiple, or condition-specific rows fail closed as `503`.

The result preserves the non-negative aggregate USDC value as `openInterestUsdc`, its Data API source, and local receipt time. It is explicitly non-executable and is not displayed liquidity, available collateral, platform reserves, a wallet balance, or any user's position.

M9.27 is parameter-free and stateless and performs no market expansion, polling, persistence, authentication, account access, order submission, or execution.

## M9.28 — Outcome price history

`GET /polymarket/outcomes/:tokenId/price-history` calls the unauthenticated Data API `v2/prices-history` endpoint for one canonical outcome token. The local request requires canonical whole-second UTC `start` and `end` values, a positive window no longer than 31 days, one explicit `resolution` (`1m`, `5m`, `30m`, `3h`, or `12h`), an optional `limit` from 1 through 100, and an optional opaque continuation cursor.

The adapter sends the corresponding bucket size in seconds and requires at most the requested number of unique, strictly increasing observations inside the selected window. Each provider timestamp is preserved as a UTC instant, each price is an exact decimal in the inclusive `[0,1]` range, and `resolutionSeconds` discloses the provider's actual observation grain. A documented `data: null` result returns `404`; malformed prices, times, ordering, pagination, JSON, or provider failure return `503`.

The series is descriptive and explicitly non-executable. It does not represent bid/ask quotes, depth, available liquidity, fill prices, individual trades, or a probability guarantee and adds no polling, persistence, authentication, account, position, order, strategy, or execution path.

## M9.29 — Point-in-time outcome price

`GET /polymarket/outcomes/:tokenId/price-at` calls the same unauthenticated Data API `v2/prices-history` endpoint with one canonical outcome token, a required canonical whole-second UTC `at` instant mapped to `as_of`, and `limit=1`. It deliberately uses the provider's point-in-time lookup instead of scanning M9.28 pages or selecting a point locally.

The response must contain exactly one terminal page observation whose timestamp is not later than the requested instant. It preserves `requestedAt`, `observedAt`, the exact decimal price in `[0,1]`, the provider's actual `resolutionSeconds`, and `exactTimestamp`, which is true only when the observed and requested instants are identical. Null or empty data returns `404`; multiple rows, continuation state, future-dated points, malformed values, or provider failure return `503`.

The observation is descriptive and non-executable. It is not a historical bid, ask, spread, depth snapshot, fill guarantee, trade identity, or proof of what a specific user could have executed, and it adds no persistence, polling, authentication, account, position, order, strategy, or execution path.

## M9.30 — Binary point-in-time price complement

`GET /polymarket/markets/:id/price-complement-at` first loads the existing selected binary market, requires present and distinct indexed YES and NO token IDs, and concurrently requests both M9.29 observations for the same canonical whole-second UTC `at` instant. Returned token identities and echoed requested instants must match the selected market and caller exactly.

Isolated 40-digit decimal arithmetic reports `priceSum`, signed `deviationFromOne`, and `balanced`, `below_one`, or `above_one`. Both complete observations remain visible. `sameObservedTimestamp` and `sameResolution` disclose whether the provider selected matching historical points and grains; neither flag upgrades the result into an atomic snapshot. `atomicSnapshot: false` and `executable: false` are invariant.

Missing market identity, outcome tokens, or either historical observation returns `404`; duplicate/divergent identities, divergent requested times, provider failure, or malformed data return `503`. The comparison is descriptive and makes no arbitrage, probability-coherence, recommendation, fill, book-history, strategy, or execution claim.

## M9.31 — Outcome point-in-time price change

`GET /polymarket/outcomes/:tokenId/price-change` requires one canonical outcome token plus canonical whole-second UTC `from` and `to` instants. The interval must be positive and no longer than 31 days. The application concurrently loads the two M9.29 observations instead of scanning a price-history page.

Both responses must preserve the requested token and corresponding requested instant, and the later lookup may not return an observation older than the earlier lookup. The complete `from` and `to` observations remain visible, including their independently selected provider timestamps and resolutions.

Isolated 40-digit decimal arithmetic subtracts the earlier price from the later price and reports the exact signed `priceChange` plus `up`, `down`, or `unchanged`. Alignment flags disclose equal observed timestamps and equal resolutions. Percentage change is deliberately omitted because the valid earlier price may be zero. The result is non-executable and makes no quote, spread, depth, trade, fill, return, recommendation, strategy, or execution claim.

Invalid identities or intervals return `400`; either unavailable observation returns `404`; identity, requested-time, or observed-order divergence and other provider failures return `503`.

## M9.32 — Binary point-in-time price change

`GET /polymarket/markets/:id/price-change` loads one selected binary market, requires present and distinct indexed YES and NO token identities, and concurrently composes one M9.31 price change for each outcome over the same positive canonical UTC interval of at most 31 days. Returned token identities and requested endpoints must match the selected market and caller.

The response preserves both complete outcome changes and therefore all four independently selected provider observations. Separate flags report whether YES and NO share observed timestamps and resolutions at the `from` boundary and at the `to` boundary. These flags never upgrade the observations into synchronized snapshots.

Isolated 40-digit decimal arithmetic adds the exact YES and NO changes into `combinedPriceChange` and classifies it as `up`, `down`, or `unchanged`. `atomicSnapshot: false` and `executable: false` are invariant. The combined movement is descriptive and makes no probability-coherence, arbitrage, return, recommendation, quote, trade, fill, strategy, or execution claim.

Invalid market identities or intervals return `400`; absent market, token identities, or either historical observation return `404`; duplicate/divergent identities, interval divergence, provider failure, or malformed data return `503`.

## M9.33 — Outcome parent-market identity

`GET /polymarket/outcomes/:tokenId/market` calls the public CLOB `markets-by-token/{token_id}` endpoint for one canonical decimal outcome-token identity. The response preserves the canonical condition ID, distinct primary/YES and secondary/NO token IDs, and explicitly identifies whether the requested token is the indexed `yes` or `no` outcome.

The adapter requires the requested token to match exactly one returned outcome and rejects malformed condition IDs, malformed tokens, duplicate outcome identities, or a response that omits the requested token. Provider `400` or `404` becomes local `404`; invalid local identity returns `400`; transport, other HTTP, JSON, or successful-response contract failures return `503`.

The result is stateless, identity-only, and explicitly non-executable. It does not load Gamma descriptive market metadata, prices, fees, tick size, liquidity, holders, positions, accounts, credentials, orders, or execution behavior.

## M9.37 — Process-local provider availability

`GET /polymarket/settings` remains available without provider access and reports the effective enabled state, the validated startup default, whether the effective choice comes from startup or runtime, and the nullable runtime-change time. `PUT /polymarket/settings` accepts exactly `enabled` and `accessConfirmed`; enabling is rejected unless confirmation is explicitly true, while disabling remains immediately available.

The override is held only in the current API process. Restarting restores `POLYMARKET_ENABLED`, which continues to default to `false`. The settings controller is the sole `/polymarket` exception to the provider guard so disabled operation can be inspected and changed locally; every route capable of reaching Gamma, CLOB, or the Data API still fails before provider access. No VPN detection or control, network bypass, persistence, authentication, credentials, account, wallet, order, or execution behavior is added.

## Boundaries

M9.1–M9.47 do not persist or poll markets, events, tags, series, or provider status. M9.3–M9.36 expose bounded public observations and dashboard research without executable quote, fill, recommendation, or probability-guarantee semantics. M9.37 stores only a process-local availability override and adds no market-data retention. M9.38 displays only the existing latest reported trade per indexed outcome, without trade history, identity, quantity, or provider time. M9.39 displays one on-demand trailing 24-hour M9.32 comparison as absolute percentage-point changes, not percentage returns or an atomic historical series. M9.40 independently loads the first bounded 30-minute history page for each outcome and charts available values without joining timestamps into atomic pairs or retaining data. M9.41 surfaces the existing Data API freshness snapshot without extending it to Gamma, CLOB, or local-health claims. M9.42 surfaces the existing platform-wide open-interest aggregate separately from selected-market open interest and retains its isolated unavailable state. M9.43 displays only the direct bounded tags of the selected market. M9.44 loads one bounded related-tag level only after explicit tag selection, without implicit or recursive expansion or discovery filtering. M9.45 displays the existing midpoint sum, signed deviation, and descriptive relationship without another provider request or an arbitrage claim. M9.46 exposes the existing combined historical movement and both boundary-alignment diagnostics without another provider request or synchronized-series claim. M9.47 displays the four underlying provider-selected observations without another provider request or historical quote/trade claim. The increments do not load user positions or accounts and have no authentication, signing, wallet, order, redemption, strategy, signal, paper execution, or real execution path.

## M9.42 — Dashboard platform-wide open interest

The dashboard independently requests the existing parameter-free `GET /polymarket/open-interest` route during its general refresh. It displays the exact aggregate USDC value and local receipt time in a dedicated platform context card, separate from the selected market's condition-level open interest.

Failure affects only this card and does not suppress Data API freshness, market discovery, or selected-market research. The observation remains public, descriptive, and explicitly non-executable. M9.42 adds no backend route, market expansion, holder or wallet-position data, persistence, account access, recommendation, signal, order, or execution behavior.

## M9.43 — Dashboard selected-market taxonomy

Selected-market research independently requests the existing `GET /polymarket/markets/:id/tags` resource. The dashboard displays the bounded direct tag set using the provider label, then slug, then identity as a presentation fallback. An empty set is distinct from an unavailable resource.

Taxonomy failure does not suppress market identity, prices, books, trades, history, or open interest. The dashboard does not request related tags, recursively traverse taxonomy, apply tag-based discovery filters, infer categories, rank markets, or add persistence, recommendation, account, order, or execution behavior.

## M9.44 — Dashboard explicit related taxonomy

Each direct selected-market tag is an explicit browser control. Choosing one calls the existing `GET /polymarket/tags/:id/related` route and displays its bounded first-level identities using label, slug, then ID fallbacks. Loading, empty, and unavailable states remain distinct, and switching market or disabling provider access clears the browser-local selection.

Related results are deliberately display-only and cannot be selected for another lookup. The client suppresses stale responses when selection changes and adds no recursive traversal, implicit expansion, relationship weight, discovery filtering, ranking, persistence, recommendation, account, order, or execution behavior.

## M9.45 — Dashboard binary midpoint relationship

The selected-market dashboard reuses the established M9.8 response to display the exact midpoint sum, signed deviation from one, and descriptive `balanced`, `below_one`, or `above_one` relationship. It adds no provider request or backend route and keeps unavailability isolated with the existing midpoint resource.

The UI preserves the raw decimal strings and adds percentage formatting only for presentation. It explicitly states that YES and NO were independently received and that the comparison is non-atomic and non-executable; no deviation is interpreted as arbitrage, incoherence, profit, recommendation, or an execution opportunity.

## M9.46 — Dashboard historical alignment context

The selected-market dashboard reuses the established M9.32 response to show the exact combined YES/NO price change, its direction, and independent timestamp/resolution alignment at the `from` and `to` boundaries. The requested boundary times remain visible and no additional provider request or backend route is introduced.

Alignment labels keep timestamp equality separate from resolution equality and never imply an atomic snapshot. The combined value remains the exact sum of absolute outcome-price changes rather than a percentage return, probability-coherence measure, arbitrage observation, recommendation, signal, quote, fill, or execution opportunity.

## M9.47 — Dashboard historical observation provenance

The selected-market dashboard maps the existing M9.32 response into four fixed provenance entries: earlier YES, earlier NO, later YES, and later NO. Each entry exposes its exact price, actual `observedAt`, `resolutionSeconds`, and `exactTimestamp` value while preserving the requested boundary and outcome identity.

No additional provider call, point selection, or browser-side financial calculation occurs. These are independently selected Data API observations at or before the requested instants, not trades, historical bid/ask books, synchronized snapshots, executable quotes, fill evidence, signals, recommendations, or execution opportunities.

## M9.35 operational availability

`POLYMARKET_ENABLED` defaults to `false` in both application validation and Compose. A controller-wide provider guard returns `503` with `Polymarket research is disabled by local settings` before any provider-backed route handler or adapter is reached. Set the startup flag or use the M9.37 process-local control only when local access is permitted and the required VPN is already active; there is no automatic VPN detection or network-block bypass.

Provider failure is exposed locally as `503`. Market discovery additionally classifies `ENOTFOUND` and `EAI_AGAIN` transport causes and returns a sanitized DNS-resolution diagnostic. Live Gamma, Data API, and CLOB requests were validated successfully while the development VPN supplied working provider DNS resolution.

## M9.49 — Dashboard active-event discovery

The dashboard reuses the existing bounded active-event route with `limit=6` and displays event identity, optional schedule, and restricted status in a dedicated non-interactive grid. Event discovery has its own unavailable and empty states, so it cannot hide active markets or selected-market research.

The browser does not request event detail, attached tags, nested markets, or live volume and does not follow the unstable discovery cursor. It adds no provider contract, backend route, implicit expansion, ranking, persistence, recommendation, account, order, or execution behavior.

## M9.50 — Dashboard selected-event details

An explicit event-card selection loads the existing public event-detail route and presents description, lifecycle state, nullable resolution source, local receipt time, and the number of normalized market references. Request identities suppress stale responses, and disabling provider access clears selection and invalidates pending detail loads.

The browser counts but does not expand the returned market references. It requests no event taxonomy, live volume, market prices, liquidity, outcome data, account state, order capability, or execution path.

## M9.55 — Bounded public active-event search

`GET /polymarket/search` accepts a required trimmed `q` from 2 through 100 characters and a bounded `limit`, then calls Gamma's unauthenticated `public-search` endpoint with `events_status=active` and `limit_per_type`. The local response retains only unique active, non-closed event identity, dates, lifecycle flags, the provider's `hasMore` and `totalResults` summary, and local receipt time.

Nested markets, tags, series, financial metrics, images, editorial fields, and provider ranking details are discarded. M9.55 initially exposes only the bounded first page. The route remains behind the established fail-closed availability guard and adds no persistence, recommendation, account, position, order, wallet, or execution behavior.

## M9.56 — Bounded active-event search pagination

The search route accepts an optional 1-based `page` from 1 through 100, defaults it to one, passes it directly to Gamma, and retains the requested page in the normalized response. Query, limit, and page validation all occur before provider access; malformed inputs are `400`, while transport or response-contract failures remain `503`.

The dashboard requests eight events per page and exposes Previous/Next controls without accumulating pages. A new search starts at page one, page changes continue the submitted query even if the input is subsequently edited, and the provider's `hasMore` controls forward navigation. The selected-event detail flow is unchanged, and pagination adds no ranking, persistence, recommendation, account, position, order, wallet, or execution behavior.

## M9.57 — Event-to-market research navigation

The bounded selected-event market-reference sample now allows an explicit open reference to enter the existing selected-market research flow. The browser maps only the already-normalized reference identity, slug, question, and nullable condition into the established market-summary shape, then lets the existing loader request details, taxonomy, midpoint context, open interest, books, latest trades, and bounded history under their independent resource states.

Closed references stay visible but disabled, and no reference is expanded until selected. The selected-market research panel is independent from the initial active-market discovery page, so an event-derived selection remains visible if that separate page is unavailable. This adds no backend route, bulk loading, ranking, recommendation, persistence, account, order, wallet, or execution behavior.

## M9.58 — Dashboard event-market pagination

The selected-event dashboard paginates the already-normalized bounded market-reference collection locally, displaying eight provider-ordered entries at a time. Previous and Next replace the visible page without accumulating rows, and selecting or clearing an event returns the browser to page one.

Page navigation performs no provider request and does not preload market detail or research. Open references still enter the established selected-market flow only after explicit selection; closed references remain visible and disabled. No backend route, ranking, recommendation, persistence, account, order, wallet, or execution behavior is added.

## M9.59 — Dashboard event live-volume pagination

The selected-event live-volume breakdown paginates the already-returned bounded Data API market rows locally, displaying eight entries at a time in provider order. Its page is independent from the Gamma market-reference page, replaces the visible rows without accumulation, and resets when event selection changes.

Existing condition-to-market correlation and explicit unidentified provider rows remain intact. Navigation makes no provider request and introduces no browser-side aggregation, measurement-window inference, USDC conversion, trade detail, persistence, account, position, order, wallet, or execution behavior.

## M9.60 — Event-volume-to-market research navigation

An explicitly selected live-volume row correlated by condition identity to an open event market now enters the established selected-market research flow. The browser retains only the already-normalized market identity, slug, question, condition, and open state needed by that existing loader.

Closed and unidentified provider rows remain visible but disabled, and no row triggers market loading until selected. Provider volume order is descriptive rather than a browser ranking or recommendation. No backend route, automatic expansion, persistence, account, position, order, wallet, or execution behavior is added.

## M9.61 — Dashboard binary resolution result

Selected-market research independently requests the existing `GET /polymarket/markets/:id/resolution` resource. When a recognized terminal payout exists, the dashboard displays the YES, NO, or 50/50 result, the exact indexed YES and NO payout rates and winner/loser/split classifications, and the provider lifecycle status.

Unavailable or unsupported resolution remains isolated from market identity, midpoint, books, latest trades, taxonomy, open interest, and bounded history. The display is explicitly non-executable and makes no claim about user entitlement, wallet holdings, positions, redemption, recommendation, order, or execution behavior.

## M9.62 — Dashboard resolution lifecycle context

The dashboard reuses the available M9.61 response to display the provider's nullable resolution time, local receipt time, and independent extended-review, dispute, and arbitration flags. Standard/inactive values remain explicit rather than disappearing, so the view does not imply that an omitted badge means unknown provider state.

No additional provider request or browser-side lifecycle calculation is introduced. The three flags are not collapsed into severity, confidence, validity, recommendation, payout entitlement, or redemption-readiness claims, and the display remains isolated from accounts, positions, wallets, orders, and execution.

## M9.63 — Dashboard market identity provenance

Selected-market research maps the existing market-detail response into three fixed provenance entries: the canonical condition identity and the indexed YES and NO CLOB token identities. Provider outcome labels and complete identifier strings are preserved, while nullable identities are shown explicitly as unavailable rather than inferred.

No provider request, reverse lookup, token metadata expansion, or identifier calculation is introduced. Public condition and token identities do not imply ownership, balance, position, wallet association, approval, order capability, payout entitlement, redemption, recommendation, or execution behavior.

## M9.64 — Dashboard reverse outcome identity verification

For each available indexed outcome token, selected-market research independently calls the existing `GET /polymarket/outcomes/:tokenId/market` route. The browser declares verification only when both CLOB responses preserve the expected YES/NO requested roles, reproduce both indexed tokens, and return the exact Gamma condition identity.

A missing token or reverse observation remains unavailable; any returned role, membership, or condition divergence becomes explicitly incoherent rather than partially verified. The cross-provider identity check adds no price, probability, ownership, balance, position, account, wallet, recommendation, order, or execution semantics.

## M9.65 — Dashboard resolution identity coherence

Before displaying an available binary-resolution result or its lifecycle context, the dashboard reconciles that response with the independently loaded selected-market detail. The embedded market ID, embedded market condition and indexed tokens, resolution condition, and both payout token identities must all match exactly.

Unavailable resolution remains unavailable, while any returned identity divergence becomes explicitly incoherent and suppresses the complete resolution presentation. Other market research remains independent. The check uses already-loaded resources and adds no provider request, payout entitlement, redemption, recommendation, account, position, wallet, order, or execution behavior.

## M9.66 — Disabled-provider dashboard request suppression

The visibility-aware dashboard refresh loads `GET /polymarket/settings` as an always-local control-plane resource before scheduling any provider-backed Polymarket observation. When the setting is disabled, or the local availability state cannot be read, the refresh does not request Data API freshness, global open interest, active events, active markets, or selected event/market research. Those resources expose an explicit disabled or unavailable state rather than generating repeated guarded `503` responses through the Vite proxy.

Disabling access clears selected provider-backed browser state and invalidates its pending response generations. Dashboard refresh generations also prevent a request that began under an older enabled state from overwriting a successful manual disable. The existing settings endpoint and control remain independent, so access can be enabled or disabled even when Gamma, CLOB, or Data API is unavailable. This changes no backend route, startup default, provider guard, persistence, account, order, wallet, or execution behavior.

## Next safe increment

A later M9 increment may add another narrowly bounded public research view without introducing positions, redemption, trade history, persistence, authentication, accounts, or execution. M10 real-trading design remains separate and requires current official Binance research plus explicit safeguards.

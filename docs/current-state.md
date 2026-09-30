# Current State

Last validated: 2026-09-30

M9.63 is complete: selected-market research now displays the exact condition identity and indexed YES/NO token identities already present in market details. Nullable identities remain explicitly unavailable, and the view does not associate token identifiers with an account, balance, position, wallet, or order capability.

M9.62 is complete: the available selected-market binary resolution now displays its nullable resolution time, local receipt time, and independent review, dispute, and arbitration states. The browser does not combine these flags into a severity or confidence judgment and makes no additional provider request.

M9.61 is complete: selected-market research now independently displays the existing recognized terminal binary resolution result, exact indexed YES/NO payout rates, payout classifications, and provider lifecycle status. Resolution absence is isolated and does not hide market identity, prices, books, history, taxonomy, or open interest.

M9.60 is complete: condition-correlated live-volume rows for open event markets can now be explicitly selected into the existing public market-research flow. Closed and unidentified rows remain visible and disabled, and no market research is loaded before deliberate selection.

M9.59 is complete: the selected event's provider-ordered live-volume breakdown now uses independent browser-local eight-item pagination over the already returned bounded response. Condition correlation and unidentified rows are preserved, event changes reset page one, and navigation introduces no provider call, aggregation, financial inference, or execution behavior.

M9.58 is complete: selected-event market references now have browser-local eight-item pagination over the already returned bounded detail payload. Provider order is preserved, changing events resets page one, and navigation adds no provider request, accumulation, market preload, backend route, or execution behavior.

M9.57 is complete: open market references in selected-event details can now be explicitly selected into the existing public market-research flow. Closed references remain visible and disabled, no market data is preloaded, and the selected-market panel no longer depends on the initial active-market discovery page being available.

M9.56 is complete: active-event search now accepts an explicit 1-based page from 1 through 100 and passes it directly to Gamma's documented search pagination. The dashboard keeps each request fixed at eight events and provides bounded Previous/Next navigation while preserving provider order, total/continuation context, stale-response suppression, selection reuse, and the existing non-persistent read-only boundary.

Live validation after M9.55 confirmed the bounded event search and all six current dashboard event selections. Gamma sometimes represents optional event text and not-yet-assigned nested market condition identities as empty strings; the selected-event adapter now normalizes those provider forms to `null`, so valid detail and live-volume observations no longer fail closed.

The startup validator accepts strictly positive canonical fractional values such as `0.01` for risk limits, matching the documented defaults and `.env.example`.

M9.55 is complete: `GET /polymarket/search` validates a trimmed 2–100 character term and loads at most eight active public Gamma event matches by default. The dashboard search queries the provider catalog rather than filtering the initial six events or eight markets, displays bounded result and total-match context, and reuses the established selected-event research flow without persistence, ranking, recommendation, accounts, orders, or execution behavior.

M9.54 is complete: selected-event research now displays at most eight provider-ordered live-volume rows correlated to the already-normalized event market references by condition identity. Each row preserves exact taker-volume shares and an explicit unidentified fallback, with no new provider request, browser-side aggregation, measurement-window inference, USDC conversion, trade detail, recommendation, account, order, or execution behavior.

M9.53 is complete: selected-event research now displays at most eight already-normalized market references in provider order, preserving only identity, question/slug fallback, and open/closed state. It makes no additional provider request and does not load market prices, liquidity, volume, outcomes, ranking, recommendations, accounts, orders, or execution behavior.

M9.52 is complete: selected-event research now independently displays the existing public Data API aggregate taker volume in shares, reported market-row count, and local receipt time. Live-volume failure does not hide event details or taxonomy, and the dashboard does not expose condition breakdowns, infer a time window or USDC turnover, or add trades, holders, positions, accounts, orders, or execution behavior.

M9.51 is complete: selected-event research now independently loads and displays the bounded tags directly attached to that event, with provider label, slug, and identity fallbacks plus distinct empty and unavailable states. Event taxonomy failure does not hide valid event details, and the view adds no related-tag traversal, discovery filtering, nested-market expansion, ranking, recommendation, account, order, or execution behavior.

M9.50 is complete: an explicit active-event selection now loads the existing public event-detail resource and displays its description, lifecycle, resolution source, local receipt time, and referenced-market count. Stale detail responses are suppressed, selection clears when provider access is disabled, and market references are not expanded into price, liquidity, volume, outcome, account, order, or execution data.

M9.49 is complete: the Polymarket page now independently displays a bounded six-event public discovery page with event identity, optional start/end schedule, and restricted status. Empty and unavailable event discovery remain distinct and isolated from active-market selection, with no nested-market expansion, event detail, volume, ranking, recommendation, account, order, or execution behavior.

M9.48 is complete: the dashboard now uses a responsive side-navigation shell with dedicated browser-local routes for overview (`#/`), Polymarket (`#/polymarket`), and new-listing research (`#/new-listings`). The redesign increases contrast, minimum text sizes, spacing, and page hierarchy while preserving the existing independent resource states, visibility-aware refresh, API contracts, and read-only safety boundary.

M9.47 is complete: selected-market research now displays the four provider-selected observations underlying its trailing 24-hour comparison, preserving outcome and boundary identity plus exact price, observed time, resolution, and exact-requested-time status. The browser adds no provider request and makes no historical quote, trade, synchronized-snapshot, recommendation, or execution claim.

M9.46 is complete: selected-market research now surfaces the existing exact combined 24-hour movement and separately describes timestamp and resolution alignment at the earlier and later comparison boundaries. The browser adds no provider request and preserves independent-observation, non-atomic, non-executable, and non-percentage-return semantics.

M9.45 is complete: selected-market research now surfaces the existing exact midpoint sum, signed deviation from one, and descriptive `balanced`, `below_one`, or `above_one` relationship. The browser adds no provider request and explicitly preserves independent receipt, non-atomic, and non-executable semantics without arbitrage, recommendation, account, order, or execution claims.

M9.44 is complete: an explicit selection of one direct market tag now loads and displays its bounded first-level related taxonomy. Related results are display-only, stale requests are suppressed, selection clears with market or provider state changes, and no recursive traversal, implicit expansion, discovery filtering, ranking, persistence, recommendation, account, order, or execution behavior is added.

M9.43 is complete: selected Polymarket market research now displays the bounded tags directly attached to that market, with provider label, slug, and identity fallbacks plus distinct empty and unavailable states. Taxonomy remains isolated from every other observation and adds no related-tag expansion, filtering, ranking, persistence, recommendation, account, order, or execution behavior.

M9.42 is complete: the dashboard now displays the existing platform-wide Polymarket open-interest aggregate with its exact USDC value and local receipt time, separately from selected-market open interest. Aggregate failure remains isolated from Data API freshness, discovery, and selected-market research, with no market expansion, holder or position access, persistence, recommendation, order, or execution behavior.

M9.41 is complete: the dashboard now displays the public Polymarket Data API freshness snapshot independently from local health and market discovery. Snapshot age, serving lag, worst ingestion cursor, network, and cursor count remain descriptive provider facts without invented thresholds, Gamma/CLOB freshness claims, alerts, recommendations, or execution behavior.

M9.40 is complete: selected Polymarket markets now plot independently loaded YES and NO price histories over the trailing 24-hour UTC window at 30-minute resolution. Each first page is bounded to 100 points, either outcome can render alone, and the fixed zero-to-one scale adds no synchronized-snapshot, probability-guarantee, signal, recommendation, or execution claim.

M9.39 is complete: selected Polymarket markets now display the existing binary historical comparison over a trailing 24-hour UTC window. YES and NO movements are shown as exact absolute percentage-point changes, historical unavailability remains isolated from current observations, and the view makes no percentage-return, atomic-snapshot, signal, recommendation, or execution claim.

## Milestone status

M9.38 is complete: selected Polymarket markets now display independently loaded YES and NO latest reported trades with exact price, provider-reported side, and local receipt time. Each outcome retains isolated unavailability, and the view explicitly states that the provider supplies neither trade quantity nor timestamp. These observations are not quotes, fill guarantees, signals, recommendations, or trade history.

M9.37 is complete: the local dashboard exposes current Polymarket provider availability and can apply a process-local runtime override. Enabling requires explicit confirmation that access is permitted and the required VPN is active; disabling is immediate, restart discards the override, and provider-backed routes remain fail-closed. The settings routes themselves stay reachable while disabled so local recovery does not require an API restart.

M9.36 is complete: selected Polymarket markets now display independently loaded YES and NO level-one books with best bid/ask prices and quantities plus spread. Token identity is loaded before the two concurrent book requests, failures remain isolated per outcome, and the view makes no full-depth, executable-quote, fill, recommendation, or execution claim. The CLOB adapter now follows the live provider ordering (ascending bids and descending asks) and selects the final level of each side.

M9.35 is complete: every provider-backed Polymarket route fails closed behind an availability guard whose application and Compose startup default is `false`. Disabled requests return a sanitized `503` before any provider call; M9.37 later added an always-local process override without weakening that provider boundary.

M9.34 is complete: the local dashboard now lists eight active Polymarket questions and lets the user select one to view its indexed outcome labels, independent YES/NO midpoint percentages, and aggregate open interest. Resource failures remain isolated, sanitized backend diagnostics are displayed for unavailable resources, and the surface has no recommendation, account, mutation, order, or execution controls.

M9.33 is complete: one public route resolves a canonical outcome token to its CLOB condition plus distinct indexed YES and NO token identities. It verifies exact requested-token membership, reports the requested outcome side, and remains stateless, identity-only, and non-executable without positions or accounts.

M9.32 is complete: one selected-binary-market route composes the indexed YES and NO historical price changes over the same bounded interval. It preserves all four independently selected observations, calculates their exact combined change and direction, exposes cross-outcome alignment at each boundary, and remains explicitly non-atomic and non-executable.

M9.31 is complete: one public outcome route composes two point-in-time price observations across a positive interval of at most 31 days. It reports the exact signed change and direction, preserves both independently selected observations, validates their identity and chronology, and exposes timestamp/resolution alignment without percentage-return, quote, trade, or execution semantics.

M9.30 is complete: one selected-binary-market route concurrently composes the indexed YES and NO point-in-time prices for the same requested UTC instant. It calculates their exact sum and deviation from one, preserves independent observed times and resolutions, and exposes alignment flags with explicit non-atomic, non-executable, non-arbitrage semantics.

M9.29 is complete: one public route loads the latest Data API outcome-price observation at or before an explicit canonical UTC instant. It validates one terminal non-future point and preserves the requested and observed timestamps, exact price, actual resolution, and exact-match status without scanning pages, inferring a quote, or exposing trades, persistence, accounts, positions, orders, or execution behavior.

M9.28 is complete: one public route loads a cursor-aware Data API price-history page for a canonical outcome token inside an explicit UTC window of at most 31 days. It validates at most 100 oldest-first exact price observations and preserves provider resolution without exposing bid/ask history, individual trades, persistence, accounts, positions, orders, or execution behavior.

M9.27 is complete: one parameter-free public route loads platform-wide Data API open interest and accepts only the documented single row with a null condition identity. It exposes the non-negative aggregate USDC value as a decimal string without market expansion, holders, wallet positions, accounts, persistence, polling, or execution behavior.

M9.26 is complete: one public route reconciles a selected Gamma event with its Data API live-volume breakdown, preserving total and per-market taker volume in shares. The adapter validates bounded unique conditions, descending volume order, and an exact total; the service rejects identified conditions outside the selected event. Individual trades, holders, wallet positions, accounts, persistence, polling, and execution behavior remain excluded.

M9.25 is complete: one public route reconciles a selected Gamma market with exactly one Data API open-interest row for its condition and exposes the non-negative USDC value as a decimal string. Holders, wallet positions, accounts, persistence, polling, and execution behavior remain excluded.

M9.24 is complete: one parameter-free public route loads the Data API status snapshot and strictly validates bounded serving and ingestion freshness metadata. It does not load the named feeds, positions, profiles, accounts, persistence, or execution behavior, and unavailable or not-yet-measured upstream state remains explicit `503`.

M9.23 is complete: one public route loads at most 1,000 event references attached to a selected Gamma series, verifies the series and unique event identities, and exposes only event slug/title, dates, and lifecycle flags. Nested markets, prices, volume, liquidity, persistence, accounts, and execution behavior are excluded.

M9.22 is complete: active-series discovery accepts an optional validated recurrence string, applies it to the Gamma request, and verifies every returned series has the exact requested recurrence. Fuzzy matching, a recurrence catalog, relation expansion, metrics, persistence, accounts, and execution behavior are excluded.

M9.21 is complete: one public route loads a bounded offset page of open Gamma series, requests deterministic ascending provider-ID order with nested events excluded, validates unique open identities, and declares continuation unstable. Recurrence filtering, relation expansion, metrics, persistence, accounts, and execution behavior are excluded.

M9.20 is complete: one public route loads a selected Gamma series by validated positive numeric ID, verifies exact response identity, and exposes only nullable slug/title/recurrence, closed state, and receipt time. Nested events and markets, metrics, persistence, accounts, and execution behavior are excluded.

M9.19 is complete: the public market-discovery route accepts an optional validated tag ID, applies it to the existing Gamma keyset request, and verifies each returned market contains the exact tag before exposing the unchanged summary. Related tags are not expanded implicitly; ranking, persistence, accounts, and execution behavior remain excluded.

M9.18 is complete: the public event-discovery route accepts an optional validated tag ID, applies it to the existing Gamma keyset request, and verifies each returned event contains the exact tag before exposing the unchanged summary. Related tags are not expanded implicitly; ranking, persistence, accounts, and execution behavior remain excluded.

M9.17 is complete: one public route loads at most 100 identity-only tags related to a selected Gamma tag, rejects malformed, duplicate, oversized, and self-referential collections, and distinguishes source absence from provider failure. Recursive traversal, filters, persistence, accounts, and execution behavior are excluded.

M9.16 is complete: one public route loads a selected Gamma tag by validated positive numeric ID, verifies exact response identity, and exposes only ID, nullable label/slug, and receipt time. Slug lookup, relationships, editorial metadata, persistence, accounts, and execution behavior are excluded.

M9.15 is complete: one public route loads a bounded global Gamma tag-catalog page in ascending provider-ID order, exposes only unique tag IDs with nullable labels/slugs, and declares its offset continuation unstable. Relationships, filters, editorial metadata, persistence, accounts, and execution behavior are excluded.

M9.14 is complete: one public route loads the tags attached to a selected Gamma market, bounds the collection to 100, and exposes only unique tag IDs with nullable labels and slugs behind the market provider contract. Editorial metadata, persistence, accounts, and execution behavior are excluded.

M9.13 is complete: one public route loads the tags attached to a selected Gamma event, bounds the collection to 100, and exposes only unique tag IDs with nullable labels and slugs. Provider editorial flags, authoring metadata, persistence, positions, and execution behavior are excluded.

M9.12 is complete: one public route loads a bounded cursor-aware page of non-closed Gamma events and reduces each relation-heavy provider object to validated identity, dates, and lifecycle flags. Nested markets, series, tags, prices, volume, liquidity, positions, and execution behavior are not exposed.

M9.11 is complete: one public route loads a selected Gamma event and strictly normalizes its identity, descriptive resolution context, lifecycle flags, and bounded market references. It does not import nested prices, volume, liquidity, positions, or execution behavior.

M9.10 is complete: one public market route reconciles its canonical condition and indexed YES/NO identities with a recognized terminal binary payout vector. It exposes exact payout rates and winner/loser/split classification for YES, NO, and rare 50/50 results without loading positions or executing redemption.

M9.9 is complete: one public condition route loads the Data API resolution lifecycle row, verifies its exact condition identity, and preserves status, extended-review, dispute, arbitration, nullable resolution time, and local receipt time. It does not infer a winning outcome or payout.

M9.8 is complete: one public market route loads its indexed YES and NO midpoints, calculates their exact sum and signed deviation from one, and classifies the independent observations descriptively as balanced, below one, or above one. The result is explicitly non-atomic and non-executable and makes no arbitrage or probability-coherence claim.

M9.7 is complete: one aggregate public route compares the independently loaded latest trade with the current displayed top of book, reports an exact descriptive spread position and signed bid/ask distances, and explicitly denies atomic-snapshot and execution semantics. Missing book sides remain unverifiable rather than inferred.

M9.6 is complete: one public route loads the latest CLOB trade price and provider-reported side for an outcome token, strictly rejects malformed data and the documented never-traded placeholder, and exposes receipt-only freshness without claiming executability, liquidity, or history.

M9.5 is complete: one aggregate public route loads midpoint and top of book concurrently, verifies their exact decimal relationship when both sides exist, fails closed on divergence, and reports absent-side coherence as explicitly unverifiable. The observations remain independently timed, stateless, and non-executable.

M9.4 is complete: one public CLOB snapshot can be loaded by outcome-token ID and strictly reduced to exact best bid/ask prices, displayed quantities, and spread. Snapshot identity, ordering, and book coherence are validated; absent sides remain explicit and the observation is non-executable.

M9.3 is complete: one public CLOB midpoint can be requested by canonical outcome-token ID, with its exact decimal string, non-executable provenance, local receipt time, and absent provider timestamp represented explicitly. No price is cached or persisted.

M9.2 is complete: one selected public Gamma market can be loaded by validated numeric ID, with its indexed outcome arrays strictly normalized into explicit YES and NO labels and nullable CLOB token identities. Provider prices remain outside that detail endpoint.

M9.1 is complete: a dedicated Polymarket module loads one bounded cursor-aware page of active public Gamma markets, strictly normalizes prediction-market identities, and exposes them through a local read-only route without credentials or persistence.

M7.1 is complete: the application loads one public provider-neutral Binance Spot/USDT symbol catalog at startup and retains it in memory as a future detection baseline. It does not yet claim that any observed symbol is newly listed.

M7.2 persists each successful catalog observation transactionally, preserving first observation time while updating latest observation time and current provider state.

M7.3 compares a current observation with the durable provider baseline in one serializable transaction. The first population is baseline-only; later previously unseen symbols are retained in memory as newly observed.

M7.4 refreshes observations sequentially at a validated configurable interval, preserving the last successful state after failures and canceling cleanly at shutdown.

M7.5 persists an immutable nullable application detection time for post-baseline symbols while leaving baseline and migrated rows unclassified.

M7.6 exposes recent durable detections through a bounded local read-only endpoint.

M7.7 supports optional inclusive canonical UTC detection-time filters on that endpoint.

M7.8 supports stable provider/symbol cursor pagination composed with those filters.

M7.9 supports strict filtering by provider, current status, and current Spot-trading availability.

M7.10 exposes a filtered aggregate count and earliest/latest application detection times.

M7.11 adds deterministic current-status and Spot-availability counts to that aggregate.

M7.12 defines the provider-neutral nine-checkpoint observation schedule as a pure domain contract without activating market tracking.

M7.13 persists those checkpoints atomically for each durable detection without processing them.

M7.14 reads bounded due checkpoints deterministically without claiming or processing them.

M7.15 validates the due time and strict 1–100 batch limit at the internal application boundary.

M7.16 atomically leases bounded due-checkpoint batches, excludes active leases, and makes expired leases reclaimable.

M7.17 records terminal completion only for the matching active lease; completed checkpoints never return to due reads or claims.

M7.18 validates and injects bounded future-worker interval, batch-size, and lease-duration options without starting background work.

M7.19 provides a deterministic manually invoked single-cycle orchestrator with sequential per-item processing and explicit claimed/completed/failed/lost-lease counts.

M7.20 defines a validated provider-neutral checkpoint market observation with exact-string price and volumes, safe trade counts, explicit provider-window times, and an independent local receive time.

M7.21 provides an inactive unauthenticated Binance Spot adapter that loads and strictly normalizes one symbol's public rolling 24-hour ticker.

M7.22 persists checkpoint market observations atomically on completion, enforces consistency through PostgreSQL check constraints, and passes observations through the cycle orchestrator.

M7.23 provides an injected provider-backed production checkpoint processor without activating the cycle automatically.

M7.24 adds a disabled-by-default non-overlapping lifecycle worker with completion-relative cadence and clean shutdown.

M7.25 exposes completed checkpoint observation timelines for individual durable detections through a local read-only endpoint.

M7.26 calculates exact T+0-relative price changes and return rates as a pure internal research rule.

M7.27 exposes the price-performance calculation on demand through a local read-only endpoint.

M7.28 calculates descriptive cross-detection checkpoint cohorts as a pure internal research rule.

M7.29 loads bounded recent durable cohorts with completed T+0 baselines and calculates aggregate checkpoint performance internally.

M7.30 exposes the bounded durable cohort through a local read-only aggregate-performance endpoint.

M7.31 classifies observed pump and post-pump correction patterns with explicit thresholds as a pure internal research rule.

M7.32 loads and classifies one durable detection internally without persisting derived state or exposing a route.

M7.33 exposes explicit-threshold durable classification through a local read-only endpoint.

M7.34 calculates descriptive pump/correction cohort counts and exact rates as a pure internal research rule. M7.35 composes that rule over the bounded durable T+0-eligible cohort, M7.36 exposes it through a local read-only route, M7.37–M7.39 calculate, durably compose, and expose median observed magnitudes, M7.40–M7.42 calculate, durably compose, and expose median observed pattern timing, M7.43–M7.45 calculate, durably compose, and expose descriptive rolling-window market activity, M7.46–M7.88 establish listing top-of-book collection and descriptive analysis through spread-widening timing exposure, M7.89–M7.100 establish descriptive price-path and variability calculations, durable composition, and local exposure, and M7.101–M7.109 establish explicit cost-adjusted checkpoint round-trip calculation, durable composition, local exposure, cohort calculation/composition/exposure, outcome cohort calculation/composition, and local exposure.

M0 through M8 are complete. The read-only local dashboard provides independent portfolio, execution, listing, persisted strategy-signal, selected-listing checkpoint research, and latest stored-backtest views, chronological charts, visibility-aware refresh, responsive navigation, and compiled same-origin serving. No dashboard mutation, order mutation endpoint, strategy execution, authenticated exchange integration, or real order execution exists.

## Implemented application

- M7.1 loads a strictly validated, deterministically ordered public Binance Spot/USDT symbol catalog at startup and retains it in memory as a provider-neutral baseline.
- M7.2 persists immutable first-observation time and mutable latest provider state for each provider/symbol identity.
- M7.3 detects only symbols absent from an established durable baseline and retains the latest detection result in memory.
- M7.4 polls without overlapping requests using `NEW_LISTINGS_POLL_INTERVAL_MS`, which defaults to 60 seconds and cannot be configured below five seconds.
- M7.5 records `detectedAt` only when a symbol is first observed after an established provider baseline; later refreshes cannot rewrite it.
- M7.6 exposes detected symbols newest first at `GET /new-listings`, with optional `limit=1..100` and a default of 50.
- M7.7 adds validated optional `detectedFrom` and `detectedTo` filters and rejects inverted ranges before querying PostgreSQL.
- M7.8 adds an optional canonical `provider:symbol` cursor resolved to the immutable detection sort position; invalid and filter-incompatible cursors return HTTP 400.
- M7.9 adds optional `provider`, `status`, and `spotTradingAllowed` filters applied within the bounded PostgreSQL query and cursor compatibility checks.
- M7.10 exposes `GET /new-listings/summary` with the same non-pagination filters, returning the matching detection count and nullable temporal bounds.
- M7.11 extends that summary with `byStatus` and `bySpotTradingAllowed` counts read from one consistent PostgreSQL transaction.
- M7.12 projects `T+0` through `T+24h` checkpoint targets deterministically from a valid detection time, with no scheduler or collection side effect.
- M7.13 stores the nine targets under an idempotent composite identity and target-time index in the detection transaction.
- M7.14 exposes an internal target-time-bounded repository read with deterministic identity tie-breakers.
- M7.15 prevents invalid or unbounded due reads before PostgreSQL access.
- M7.16 uses a durable token and expiry with PostgreSQL `FOR UPDATE SKIP LOCKED` to claim due work without overlapping active consumers.
- M7.17 validates completion identity and atomically requires matching ownership, an active lease interval, and incomplete state before recording `completedAt`.
- M7.18 defaults the inactive future worker to a 5-second interval, 25-row batch, and 30-second lease, with strict startup bounds.
- M7.19 isolates processor failures, completes only successful active claims, and has no timer or production processor, so it performs no live background work.
- M7.20 exposes only an internal observation/provider contract; no Binance market-snapshot client, persistence, production processor, or worker timer exists yet.
- M7.21 registers the public Binance observation adapter with a ten-second timeout and cancellation support, but nothing invokes it automatically and no observation persistence exists yet.
- M7.22 persists validated market observations (`lastPrice`, `baseVolume`, `quoteVolume`, `tradeCount`, `windowOpenTime`, `windowCloseTime`, `receivedAt`) atomically alongside `completedAt` under active lease ownership, with database check constraints enforcing observation completeness.
- M7.23 maps claimed provider/symbol identity to the public observation provider and deliberately propagates failures to cycle-level lease recovery; no scheduler invokes it yet.
- M7.24 schedules bounded cycles only when `NEW_LISTINGS_CHECKPOINT_WORKER_ENABLED=true`; the safe default remains inactive, cycle failures do not stop later attempts, and shutdown clears or awaits outstanding work.
- M7.25 exposes completed observations oldest target first at `GET /new-listings/:provider/:symbol/observations`, rejects invalid or unknown identities explicitly, and preserves exact persisted decimal strings.
- M7.26 validates and chronologically normalizes one completed timeline, then uses only `T+0` to derive exact decimal-string absolute price changes and return rates; missing `T+0` is explicitly unavailable.
- M7.27 exposes `GET /new-listings/:provider/:symbol/performance`, returning 503 until `T+0` exists and calculating directly from durable observations without derived persistence.
- M7.28 groups available per-detection returns by checkpoint with independent sample size, positive/negative/flat counts, and exact-decimal average; incomplete timelines are never forward-filled.
- M7.29 selects at most 100 recent detected symbols with completed T+0 observations in PostgreSQL, loads their completed timelines, and composes the existing exact calculators without an HTTP route.
- M7.30 exposes `GET /new-listings/performance` with optional `limit=1..100` and `provider=binance`, defaulting to 50 recent eligible detections and returning an explicit empty aggregate when none exist.
- M7.31 requires explicit positive pump-return and correction-from-peak thresholds, tracks the running post-pump peak, and reports only what the available timeline has observed without implying finality or profitability.
- M7.32 reuses the durable observation, T+0 performance, and pattern-classification boundaries in sequence; known detections without T+0 return unavailable and unknown detections remain explicit errors.
- M7.33 exposes `GET /new-listings/:provider/:symbol/classification`; both decimal thresholds are mandatory and validated before database access, with explicit `404` unknown and `503` missing-baseline responses.
- M7.34 aggregates unique same-threshold classifications into total, no-pump, pump, and correction counts plus exact full-sample and correction-among-pumps rates; empty denominators remain null.
- M7.35 loads 1–100 recent durable detections with completed T+0, validates one explicit threshold pair before repository access, classifies each timeline on demand, and returns the M7.34 aggregate without persistence or HTTP exposure.
- M7.36 exposes the bounded aggregate at `GET /new-listings/classification` with optional provider/limit, mandatory explicit thresholds, fail-fast `400` validation, and no derived persistence.
- M7.37 calculates median observed peak return and correction-from-peak rates with independent event sample sizes, exact even-sample averaging, explicit null empty samples, and threshold-coherence validation.
- M7.38 reuses one validated 1–100 durable T+0 cohort classification pipeline for both frequency and magnitude aggregation, returning exact median magnitudes internally without another route or persistence.
- M7.39 exposes `GET /new-listings/classification/magnitudes` with optional provider/limit, mandatory explicit thresholds, independent pump/correction samples, fail-fast `400` validation, and no derived persistence.
- M7.40 calculates median T+0-to-pump and peak-to-correction durations with independent samples, canonical checkpoint validation, causal event ordering, and explicit null empty samples.
- M7.41 reuses the shared validated 1–100 durable T+0 cohort classification pipeline to return timing medians internally, with explicit empty results and no additional persistence or route.
- M7.42 exposes `GET /new-listings/classification/timing` with optional provider/limit, mandatory explicit thresholds, independent pump/correction samples, fail-fast `400` validation, and no derived persistence.
- M7.43 calculates exact average rolling-24-hour base volume, quote volume, and trade count per canonical checkpoint with explicit sample sizes, while refusing to label those turnover measures as executable liquidity.
- M7.44 loads the validated 1–100 durable T+0-eligible cohort once and returns checkpoint market-activity averages internally, with explicit empty results and no additional persistence or route.
- M7.45 exposes `GET /new-listings/activity` with optional provider/limit, fail-fast `400` validation, exact rolling-window averages, and explicit non-liquidity semantics.
- M7.46 defines a provider-neutral arbitrary-symbol top-of-book observation and loader interface with exact prices/quantities, non-crossed-book validation, and no active provider or lifecycle behavior.
- M7.47 derives exact absolute spread, midpoint, and basis points from a validated top-of-book observation while preserving level-one snapshot provenance and making no depth or fill claim.
- M7.48 loads an explicit symbol through the public Binance depth snapshot with limit 5, retains only the best level and `lastUpdateId`, and remains unwired from all active lifecycle paths.
- M7.49 registers that snapshot adapter behind the provider-neutral dependency token, using the existing Binance REST base URL while retaining no active consumer.
- M7.50 provides an explicitly invoked internal composition that loads one top-of-book snapshot and derives exact spread metrics, with no automatic collection or storage.
- M7.51 stores at most one immutable exact-text top-of-book observation per existing checkpoint through a provider-neutral repository, without changing checkpoint completion or worker behavior.
- M7.52 reloads stored top-of-book records for one detection as an empty or canonically ordered validated checkpoint timeline, still without public exposure.
- M7.53 exposes the durable book timeline at `GET /new-listings/:provider/:symbol/top-of-book` with validated identity, unknown-detection `404`, and explicit empty results.
- M7.54 provides a validated lease-safe transaction that can persist checkpoint completion, rolling ticker data, and one immutable top-of-book together, but is not yet selected by the worker.
- M7.55 composes ticker and top-of-book loading in the production processor and makes the opt-in cycle select atomic combined completion; either provider failure remains recoverable after lease expiry.
- M7.56 purely aggregates exact checkpoint spread basis points and displayed best-level bid/ask quote notionals across validated top-of-book timelines, without claiming depth or executable liquidity.
- M7.57 selects a bounded newest-first durable cohort with stored T+0 books and composes its available timelines through the exact top-of-book cohort calculator without HTTP exposure.
- M7.58 exposes that durable book cohort at local read-only `GET /new-listings/top-of-book` with strict provider and bounded-limit validation.
- M7.59 purely derives exact displayed bid/ask quote notionals and normalized level-one imbalance, returning `null` when both displayed quantities are zero.
- M7.60 applies exact imbalance on demand across one detected symbol's canonical stored-book timeline while preserving checkpoint metadata and not persisting derived fields.
- M7.61 exposes that exact durable imbalance timeline through a validated local read-only route without activating collection.
- M7.62 purely averages available exact imbalance rates per checkpoint while reporting total, calculable, and unavailable sample coverage independently.
- M7.63 composes that exact rule over the bounded newest-first durable cohort selected by stored T+0-book eligibility.
- M7.64 exposes the bounded durable imbalance cohort through a validated local read-only route while preserving explicit availability denominators.
- M7.65 purely derives exact checkpoint imbalance changes from an available scheduled T+0 baseline, retaining unavailable later points as null.
- M7.66 composes that exact evolution on demand over one detected symbol's canonical durable stored-book timeline.
- M7.67 exposes exact durable imbalance evolution through a validated local read-only route with `404`/`503` distinction.
- M7.68 aggregates validated imbalance evolutions by checkpoint with exact averages and explicit available/unavailable change counts.
- M7.69 composes that aggregate over the bounded durable T+0-book cohort and excludes unusable zero-notional T+0 baselines.
- M7.70 exposes the bounded durable imbalance-evolution cohort through a validated local read-only API.
- M7.71 purely derives exact spread-basis-point changes from a stored timeline with an explicit T+0 baseline.
- M7.72 composes exact spread evolution on demand over one detected symbol's canonical durable stored-book timeline.
- M7.73 exposes exact durable spread evolution through a validated local read-only route with `404`/`503` distinction.
- M7.74 purely aggregates exact spread evolution with independent per-checkpoint coverage.
- M7.75 composes exact spread evolution over a bounded recent durable T+0-eligible cohort.
- M7.76 exposes that bounded durable spread-evolution cohort through a validated local read-only API.
- M7.77 purely classifies observed spread widening against an explicit positive basis-point threshold.
- M7.78 classifies one durable stored-book timeline on demand after validating the explicit threshold.
- M7.79 exposes that classification through a validated local read-only API requiring an explicit threshold.
- M7.80 purely aggregates explicit-threshold spread classifications into counts and an exact observed rate.
- M7.81 composes those statistics over the bounded recent durable T+0-book cohort.
- M7.82 exposes that bounded durable aggregate through a validated local read-only API.
- M7.83 purely calculates median maximum widening magnitude over the threshold-qualified classification sample.
- M7.84 composes that magnitude over the shared bounded recent durable classification sample.
- M7.85 exposes that magnitude through a validated local read-only API with an explicit threshold and independent sample size.
- M7.86 purely calculates median T+0-to-first-widening duration with an independent observed-widening sample and canonical schedule validation.
- M7.87 composes first-widening timing over the shared bounded recent durable classification sample.
- M7.88 exposes that timing through a validated local read-only API with an explicit threshold and independent sample size.
- M7.89 purely derives exact observed checkpoint-price high, low, and maximum causal peak-to-trough drawdown.
- M7.90 composes those statistics on demand from one known detection's durable completed checkpoint timeline.
- M7.91 exposes those durable statistics through a local read-only per-detection route.
- M7.92 purely aggregates median extrema timing and positive maximum-drawdown rate and duration across validated price paths.
- M7.93 composes that aggregate on demand over the bounded recent durable T+0-eligible observation cohort.
- M7.94 exposes that bounded durable aggregate through a local read-only route.
- M7.95 calculates exact consecutive checkpoint returns, average absolute movement, and the earliest maximum absolute transition without annualization or interpolation.
- M7.96 derives that variability on demand from one known detection's durable completed observation timeline.
- M7.97 exposes that durable per-detection variability through a local read-only route.
- M7.98 calculates exact cohort medians for average and maximum absolute consecutive returns while separating total and transition-bearing samples.
- M7.99 composes that variability aggregate on demand over the bounded recent durable T+0-eligible cohort.
- M7.100 exposes that bounded durable variability aggregate through a local read-only route.
- M7.101 calculates an explicit forward checkpoint round trip after observed spread, adverse slippage, and two-sided fees without simulating orders or fills.
- M7.102 composes an explicit selected round trip from one known detection's durable book timeline, validates input before repository access, and preserves explicit not-found and unavailable outcomes.
- M7.103 exposes that explicit round trip through a local read-only route with mandatory selection/cost inputs and no automatic strategy behavior.
- M7.104 purely aggregates one fixed round-trip configuration with explicit availability coverage and exact gross/net/profitability-after-costs statistics.
- M7.105 composes that fixed configuration over bounded durable book timelines and retains missing selected books as explicit unavailable coverage.
- M7.106 exposes the bounded durable round-trip cohort through a local read-only route with mandatory explicit financial assumptions.
- M7.107 purely separates fixed-configuration round trips into profitable, losing, break-even, and unavailable outcomes with exact conditional gain/loss averages.
- M7.108 composes that outcome decomposition on demand over the bounded recent durable top-of-book cohort.
- M7.109 exposes that bounded outcome cohort through a local read-only endpoint with explicit checkpoint and cost assumptions.
- M8.1 provides a separate loopback-only Vue 3/Vite dashboard that independently reads API health, fictional portfolio valuation, BTC paper position, and realized paper performance.
- M8.2 refreshes that overview immediately and then 15 seconds after each completed load, prevents overlapping manual or automatic refreshes, pauses pending work while hidden, and refreshes when visibility returns.
- M8.3 independently loads the twelve most recent immutable fictional executions and renders a responsive side-aware ledger with explicit empty and unavailable states.
- M8.4 independently loads eight recent durable application detections and renders provider state and Spot availability without claiming official listing time or recommendation.
- M8.5 adds semantic keyboard-accessible anchor navigation across overview, execution, and new-listing sections, retaining all links on narrow screens.
- M8.6 independently loads twenty persisted moving-average signals and renders their actions and exact current averages as an observational timeline.
- M8.7 derives a chronological shared-scale chart of the persisted short and long averages and marks observed buy/sell points without recalculating signals.
- M8.8 loads one explicitly selected detection's existing exact T+0-relative performance and displays its zero-anchored checkpoint return path with explicit pending/unavailable states.
- M8.9 independently loads only the newest immutable stored simulation and displays its backend-calculated fee-adjusted equity curve, capital, ROI, drawdown, closed-trade count, and win rate.
- M8.10 serves generated Vite assets under /dashboard/ from the existing loopback-bound NestJS Express application while production assets call the unchanged same-origin root API routes.
- M8.11 migrates the moving-average, backtest-equity, and selected-listing-return plots to Apache ECharts 6.1 through one reusable responsive and accessible Vue lifecycle component. No manual chart SVG implementation or second chart library remains.

- NestJS 12 application using TypeScript strict mode.
- Startup configuration validation for `NODE_ENV`, `PORT`, `DATABASE_URL`, and `REDIS_URL`.
- PostgreSQL access through Prisma 7.10 and the PostgreSQL driver adapter.
- Redis client with explicit shutdown lifecycle handling.
- `GET /health` checks the API, PostgreSQL, and Redis.
- Docker Compose services for the API, PostgreSQL 17, and Redis 8.
- The Compose API applies pending Prisma migrations before starting.
- ESLint, Prettier, Jest unit tests, Jest E2E tests, and TypeScript build scripts.
- Safe `.env.example`; local `.env` files and generated/build artifacts are ignored by Git.
- Public Binance Spot `btcusdt@trade` WebSocket consumption through the `ws` transport.
- Provider-neutral `MarketTrade` normalization with decimal price and quantity preserved as strings.
- Structured trade logging and clean WebSocket shutdown through NestJS lifecycle hooks.
- Unexpected WebSocket closes trigger exponential retry delays from 1 second up to a 30-second cap; a successful connection resets the delay.
- Public Binance Spot `btcusdt@miniTicker` WebSocket consumption with provider-neutral latest-price normalization.
- Mini ticker volume and rolling-window fields are validated at the Binance boundary but are not exposed to the domain in M1.3.
- Public Binance Spot `btcusdt@kline_1m` WebSocket consumption with provider-neutral OHLC, candle boundaries, and close-state normalization.
- One-minute candles expose base, quote, taker-buy base, and taker-buy quote volumes as decimal strings, plus trade count. Trade IDs remain provider-boundary details.
- Public Binance Spot `btcusdt@bookTicker` WebSocket consumption with provider-neutral best bid and ask prices and quantities.
- Top-of-book update IDs are strings and financial values remain decimal strings.
- Each valid, non-crossed, positive-midpoint top of book produces absolute spread, midpoint, and spread in basis points through `decimal.js`; results remain decimal strings and basis points use eight decimal places with half-even rounding.
- Public Binance Spot exchange information supplies BTC/USDT status, assets, price filter, lot-size filter, and minimum notional once at startup through a provider-neutral metadata contract.
- Pair metadata requests use Node's native `fetch`, a ten-second timeout, strict boundary validation, non-blocking startup, and shutdown cancellation.
- In-memory paper wallet with `BTC` and `USDT` balances, configurable initial USDT (default `1000`), and initial BTC of `0`.
- Exact `decimal.js` credit and debit operations, positive-amount validation, and insufficient-funds rejection without partial mutation.
- Structured wallet initialization and successful balance-change logs.
- Process-local retention of the latest normalized BTC/USDT ticker for downstream read models.
- Exact USDT portfolio valuation from BTC and USDT balances, with explicit failure before a price is available.
- Read-only `GET /paper-wallet/balances` and `GET /paper-wallet/valuation` routes; valuation maps the unavailable-price state to HTTP 503.
- Configurable ten-second price-freshness limit; stale valuation returns HTTP 503 and emits structured age diagnostics.
- PostgreSQL-backed BTC/USDT balances with idempotent initial seeding and atomic decimal credit/debit operations behind a repository contract.
- Provider-neutral latest top-of-book and pair-metadata retention for downstream paper quotes.
- Internal BTC market-buy quote with exact notional, simulated taker fee, total cost, freshness, pair-rule, and best-ask-liquidity validation.
- Shared trading-executor contract with a paper-only BTC/USDT market-buy implementation.
- PostgreSQL paper-execution records and atomic USDT debit, BTC credit, and execution insertion.
- Caller-supplied idempotency keys replay the persisted result without a second balance mutation.
- Financial values are limited and half-even rounded to the database's 18-decimal scale before persistence.
- Internal BTC market-sell quote with exact gross notional, simulated taker fee, net proceeds, freshness, pair-rule, and best-bid-liquidity validation.
- Idempotent paper sells atomically debit BTC, credit net USDT proceeds, and persist the execution in PostgreSQL.
- Persisted executions use side-specific settlement fields: `totalCost` for buys and `netProceeds` for sells.
- Bounded `GET /paper-trading/executions` returns the newest 50 executions by default and accepts a `limit` from 1 through 100.
- Execution history exposes quote, market-data receipt, and execution timestamps in UTC, with financial values preserved as decimal strings.
- `GET /paper-trading/position` derives tracked BTC quantity, fee-inclusive cost basis, weighted-average entry price, realized PnL, and accumulated fees from all executions.
- Position accounting rejects an execution history that sells more BTC than prior tracked buys.
- Open BTC positions are valued at a fresh best bid with estimated exit fee, net liquidation value, unrealized PnL, and total PnL; unavailable or stale market data returns HTTP 503.
- Empty positions expose zero valuation fields without depending on live market data.
- `GET /paper-trading/performance` reports execution and net sell-outcome counts, realized win rate, realized PnL, and total execution fees from the shared accounting fold.
- Every new paper execution is independently assessed against `RISK_MAX_ORDER_NOTIONAL_USDT` after quoting and before repository mutation; the default maximum gross notional is `100` USDT.
- Risk approvals and rejections emit structured decisions, and rejection leaves balances and execution history unchanged.
- `RISK_EMERGENCY_STOP` defaults to false; when true it rejects every new paper execution before candidate validation and other risk rules.
- New paper buys read the persisted BTC balance and reject a projected position above `RISK_MAX_BTC_POSITION_QUANTITY`, which defaults to `0.01`; sells bypass this exposure-increasing rule.
- The buy transaction conditionally credits BTC only when the resulting persisted balance remains within the same limit, preventing concurrent buys from collectively exceeding it and rolling back all effects on failure.
- `RISK_MAX_DAILY_REALIZED_LOSS_USDT` defaults to `25`; new buys are rejected once net realized PnL from current-UTC-day sells reaches or exceeds that loss, while sells and idempotent replays remain available.
- Daily realized PnL replays the full chronological execution history for correct fee-inclusive cost basis and uses exact decimal arithmetic; profitable sells offset losing sells within the day.
- Paper buy and sell transactions share a PostgreSQL advisory lock; each buy repeats the daily-loss calculation inside the serialized transaction before any persistence or balance mutation.
- Append-only emergency-stop events persist active state, reason, idempotency key, and change time; the latest event is restored at startup and overrides the configuration fallback.
- Local `GET /risk/emergency-stop` and `PUT /risk/emergency-stop` expose status and idempotent paper-only control, including HTTP 409 for conflicting key reuse.
- Every quote carries its best-side available quantity; `RISK_MAX_TOP_OF_BOOK_PARTICIPATION_RATE` defaults to `0.10` and rejects larger buy or sell participation before persistence.
- Emergency-stop writes require a Bearer token matching optional `RISK_CONTROL_TOKEN_SHA256`; absent configuration disables writes, and the raw token is never stored or logged.
- Compose publishes API port 3000 only on host loopback.
- `RISK_MAX_UNREALIZED_LOSS_USDT` defaults to `25`; a new buy is rejected when the existing open position's net unrealized PnL reaches that negative boundary, while sells and replays remain available.
- Unrealized-loss assessment reuses the fresh best-bid position valuation, including estimated exit fees; missing or stale market data for an open position fails before execution mutation.
- Distinct approved paper execution keys share an atomic Redis fixed-window limit of 10 per 60 seconds by default; duplicates share a slot, persisted replays bypass it, and Redis failure blocks new mutation.
- A provider-neutral strategy contract accepts ordered one-minute candle projections and returns deterministic buy, sell, or hold signals without submitting orders.
- The M5.1 moving-average crossover uses only closed candles, exact decimal averages, explicit equality semantics, and defaults to 3/5 periods.
- Normalized candles are distributed through an in-process feed whose subscriber failures are isolated from the market-data stream.
- M5.2 retains six closed candles, evaluates once per new close, suppresses duplicate/out-of-order closes, and emits structured signals only to application logs.
- The latest generated strategy signal is retained in memory and exposed at `GET /strategies/signals/latest`; absence maps explicitly to HTTP 503.
- Moving-average periods are startup-configurable through validated positive integers with 3/5 defaults, a maximum of 1,000, and `short < long`; live retention follows the strategy's declared requirement.
- `GET /strategies/signals` returns persisted signals newest first with an optional `limit` from 1 through 100 and a default of 50.
- Generated signals persist idempotently in PostgreSQL by strategy, symbol, and candle close time; recent and latest reads survive application restarts.
- Strategy averages use database decimal columns and persistence failures produce structured errors without invoking any trading behavior.
- An internal provider-neutral replay service validates supplied closed BTC/USDT one-minute candles and evaluates the configured strategy once per candle.
- Replay uses only the current and prior bounded history, sets evaluation time to the candle close, and returns a deterministic ordered signal timeline with buy, sell, and hold counts.
- M6.1 does not retrieve or persist historical candles, expose an HTTP route, simulate trades or fills, calculate financial performance, or access an executor.
- A provider-neutral historical source loads one bounded public Binance Spot BTC/USDT one-minute range through `GET /api/v3/klines` without credentials.
- Historical requests are capped at 10,000 candles and 10,000 minutes; the Binance adapter loads sequential pages of at most 1,000 and stops on an empty or partial page.
- Every historical page retains strict payload, range, OHLCV, ordering, open-candle, timeout, and cancellation validation, and the accumulated result remains bounded by the caller's total limit.
- Each historical page has at most three attempts for network, HTTP 429, or HTTP 5xx failures, with cancelable bounded backoff or `Retry-After`; permanent HTTP 4xx and invalid successful payloads fail immediately.
- Three exhausted transient historical pages open a process-local 30-second circuit; open calls fail before HTTP and only one half-open recovery probe may run.
- Completely loaded closed-candle batches persist transactionally in PostgreSQL before replay or simulation, with exact textual decimals, idempotent composite identities, and rollback on conflicting content.
- Stored-only replay and simulation query validated PostgreSQL candles chronologically within bounded ranges and never call Binance, infer completeness, or fill gaps.
- Standard historical replay and simulation query PostgreSQL first and bypass Binance plus write-through when every expected minute-aligned candle identity is present.
- Incomplete cache coverage is now split into contiguous minute gaps loaded sequentially; stored and fetched candles reach replay only after complete merged coverage, and fetched gaps persist in one transaction.
- Local `POST /backtesting/replay` accepts a strict bounded UTC range and exposes deterministic signal replay while retaining fixed BTC/USDT one-minute identity and no financial execution access.
- Local `POST /backtesting/simulate` validates every explicit fictional financial assumption before historical loading and exposes the complete deterministic simulation result without mutating operational financial state.
- Local `POST /backtesting/runs` requires an idempotency key and persists the complete normalized request and serialized simulation result as an immutable PostgreSQL JSON snapshot. Identical replay returns the original UUID and creation time without recalculation; conflicting key reuse returns HTTP 409.
- Read-only `GET /backtesting/runs/:id` retrieves one immutable snapshot by UUID without recalculation or market-data access and exposes explicit invalid, absent, and unavailable states.
- Read-only `GET /backtesting/runs` returns immutable snapshots newest first with a validated limit from 1 through 100, a default of 50, optional UUID cursor pagination, and optional inclusive canonical UTC `createdFrom`/`createdTo` filters, without recalculation or market-data access.
- `DELETE /backtesting/runs/:id` explicitly removes one stored simulation snapshot by UUID while preserving historical candles and all paper or real financial state.
- Three exhausted transient historical-page failures open a process-local circuit for 30 seconds; it fails fast while open and permits one concurrent half-open recovery probe before closing or reopening.
- Candles whose close time has not passed are excluded, and the historical orchestration service delegates the remaining normalized projections directly to deterministic replay.
- M6.2 adds no route, persistence, pagination, retry policy, trade simulation, financial metric, wallet access, or execution.
- Historical candles retain exact OHLC prices, base and quote volumes, taker-buy volumes, trade count, close state, and UTC boundaries in a provider-neutral model.
- Historical price and volume coherence is validated through `decimal.js`; values are never converted to native floating point and arbitrary decimal precision is preserved.
- Historical replay explicitly projects only the strategy fields, while full candles remain available for a future separately approved execution model.
- Historical simulation consumes signals separately and creates hypothetical fills only at the following candle open, preserving an inspectable no-lookahead delay.
- The first simulator models one fixed-quantity long position, explicit taker fees, fee-inclusive entry cost, net exit proceeds, per-trade net PnL, ignored redundant signals, terminal unfilled signals, and an explicit ending position.
- Simulation arithmetic uses precision-40 `decimal.js`; the simulator creates no order and cannot reach a wallet, executor, operational Risk Engine, or exchange account.
- Every simulation now includes deterministic fill and closed-trade counts, profitable/losing/break-even counts, nullable realized win rate, gross profit, absolute gross loss, realized net PnL, and total fill fees.
- Performance metrics use precision-40 `decimal.js`, and fees from an ending open entry are counted.
- An ending open position is valued at the final historical candle close with an estimated exit fee, net liquidation value, unrealized net PnL, and combined total net PnL; no synthetic exit is recorded.
- Closed-trade performance includes average net PnL, average winning and losing results, expectancy, and profit factor with explicit null states for missing statistical samples.
- Closed trades produce a chronological cumulative realized PnL curve and maximum absolute realized drawdown with explicit start, trough, and observed recovery timestamps.
- Historical simulation requires positive initial USDT capital, maintains non-negative cash, rejects unaffordable buys, and exposes final equity, total net return, and ROI.
- Every historical candle close now has a fee-adjusted equity point reconstructed from the fill ledger, with separate maximum absolute and percentage drawdown summaries and final-equity reconciliation.
- Historical fills retain the next-candle open as their reference price and apply half the explicit full spread plus explicit slippage adversely to effective buy and sell prices; all downstream fees, capital, PnL, ROI, and equity use those effective prices.
- Historical simulations expose tested-period duration, each closed-trade holding duration, total time in market, exposure rate, and average closed-trade holding duration; an ending open position is measured through the final candle close.
- Historical simulations require explicit provider-neutral minimum/maximum quantity, step-size, and minimum-notional rules; invalid fixed quantity fails early and below-minimum potential fills remain unfilled with dedicated accounting.
- Historical execution rules now include tick size; post-impact buys round upward and sells downward, while fills retain reference, adjusted, and executable prices and every downstream financial calculation uses the executable value.
- Historical execution rules include an inclusive minimum/maximum executable-price range; out-of-range potential fills preserve financial state and are counted separately before minimum-notional evaluation.
- Historical simulation requires a positive maximum volume-participation rate no greater than one and limits each all-or-none fill using only the fully closed signal candle's base volume, never the following execution candle's volume.
- Liquidity-rejected signals preserve cash or the open position and increment `liquidityUnfilledSignalCount`; accepted fills expose the reference candle close, base volume, and calculated maximum quantity.

## Local endpoints and ports

- API: `http://localhost:3000` (Compose host-loopback only)
- Compiled dashboard: `http://localhost:3000/dashboard/`
- Health: `http://localhost:3000/health`
- Paper balances: `http://localhost:3000/paper-wallet/balances`
- Paper valuation: `http://localhost:3000/paper-wallet/valuation`
- Paper execution history: `http://localhost:3000/paper-trading/executions`
- Paper position: `http://localhost:3000/paper-trading/position`
- Paper performance: `http://localhost:3000/paper-trading/performance`
- Emergency-stop status/control: `http://localhost:3000/risk/emergency-stop`
- Latest strategy signal: `http://localhost:3000/strategies/signals/latest`
- Recent strategy signals: `http://localhost:3000/strategies/signals`
- Historical signal replay: `POST http://localhost:3000/backtesting/replay`
- Historical fictional simulation: `POST http://localhost:3000/backtesting/simulate`
- Persisted historical simulation run: `POST http://localhost:3000/backtesting/runs`
- Stored historical simulation run: `GET http://localhost:3000/backtesting/runs/:id`
- Delete stored historical simulation run: `DELETE http://localhost:3000/backtesting/runs/:id`
- Recent stored historical simulation runs: `GET http://localhost:3000/backtesting/runs`
- New listings recent detections: `GET http://localhost:3000/new-listings`
- New listings summary: `GET http://localhost:3000/new-listings/summary`
- New listings cohort performance: `GET http://localhost:3000/new-listings/performance`
- New listings price path cohort: `GET http://localhost:3000/new-listings/price-path`
- New listings price variability cohort: `GET http://localhost:3000/new-listings/variability`
- New listings round trip cohort: `GET http://localhost:3000/new-listings/round-trip`
- New listings round trip outcome cohort: `GET http://localhost:3000/new-listings/round-trip/outcomes`
- New listings market activity cohort: `GET http://localhost:3000/new-listings/activity`
- New listings top of book cohort: `GET http://localhost:3000/new-listings/top-of-book`
- New listings top of book imbalance cohort: `GET http://localhost:3000/new-listings/top-of-book/imbalance`
- New listings top of book imbalance evolution cohort: `GET http://localhost:3000/new-listings/top-of-book/imbalance/evolution`
- New listings top of book spread evolution cohort: `GET http://localhost:3000/new-listings/top-of-book/spread/evolution`
- New listings top of book spread classification cohort: `GET http://localhost:3000/new-listings/top-of-book/spread/classification`
- New listings top of book spread classification magnitudes: `GET http://localhost:3000/new-listings/top-of-book/spread/classification/magnitudes`
- New listings top of book spread classification timing: `GET http://localhost:3000/new-listings/top-of-book/spread/classification/timing`
- New listings pattern classification cohort: `GET http://localhost:3000/new-listings/classification`
- New listings pattern classification magnitudes: `GET http://localhost:3000/new-listings/classification/magnitudes`
- New listings pattern classification timing: `GET http://localhost:3000/new-listings/classification/timing`
- Public active Polymarket events, optionally filtered by exact tag: `GET http://localhost:3000/polymarket/events`
- Public global Polymarket tag catalog: `GET http://localhost:3000/polymarket/tags`
- Public selected Polymarket tag: `GET http://localhost:3000/polymarket/tags/:id`
- Public related Polymarket tags: `GET http://localhost:3000/polymarket/tags/:id/related`
- Public active Polymarket series: `GET http://localhost:3000/polymarket/series`
- Public selected Polymarket series: `GET http://localhost:3000/polymarket/series/:id`
- Public selected Polymarket series events: `GET http://localhost:3000/polymarket/series/:id/events`
- Public Polymarket Data API freshness: `GET http://localhost:3000/polymarket/data-freshness`
- Public selected Polymarket event taxonomy: `GET http://localhost:3000/polymarket/events/:id/tags`
- Public active Polymarket markets: `GET http://localhost:3000/polymarket/markets`
- Public selected Polymarket market taxonomy: `GET http://localhost:3000/polymarket/markets/:id/tags`
- Public selected Polymarket event: `GET http://localhost:3000/polymarket/events/:id`
- Public selected Polymarket market: `GET http://localhost:3000/polymarket/markets/:id`
- Descriptive binary Polymarket midpoint complement: `GET http://localhost:3000/polymarket/markets/:id/midpoint-complement`
- Public Polymarket condition resolution state: `GET http://localhost:3000/polymarket/conditions/:conditionId/resolution`
- Indexed binary Polymarket resolution result: `GET http://localhost:3000/polymarket/markets/:id/resolution`
- Selected-market Polymarket open interest: `GET http://localhost:3000/polymarket/markets/:id/open-interest`
- Selected-event Polymarket live volume: `GET http://localhost:3000/polymarket/events/:id/live-volume`
- Global Polymarket open interest: `GET http://localhost:3000/polymarket/open-interest`
- Bounded Polymarket outcome price history: `GET http://localhost:3000/polymarket/outcomes/:tokenId/price-history?start=2026-09-27T00:00:00Z&end=2026-09-28T00:00:00Z&resolution=5m`
- Point-in-time Polymarket outcome price: `GET http://localhost:3000/polymarket/outcomes/:tokenId/price-at?at=2026-09-27T00:07:00Z`
- Binary Polymarket point-in-time price complement: `GET http://localhost:3000/polymarket/markets/:id/price-complement-at?at=2026-09-27T00:07:00Z`
- Public Polymarket outcome midpoint: `GET http://localhost:3000/polymarket/outcomes/:tokenId/midpoint`
- Public Polymarket outcome parent identity: `GET http://localhost:3000/polymarket/outcomes/:tokenId/market`
- Public Polymarket outcome top of book: `GET http://localhost:3000/polymarket/outcomes/:tokenId/top-of-book`
- Coherent public Polymarket outcome market data: `GET http://localhost:3000/polymarket/outcomes/:tokenId/market-data`
- Public Polymarket outcome last trade: `GET http://localhost:3000/polymarket/outcomes/:tokenId/last-trade`
- Descriptive Polymarket last-trade book context: `GET http://localhost:3000/polymarket/outcomes/:tokenId/last-trade/context`
- PostgreSQL host port: `5433` mapped to container port `5432`
- Redis host port: `6379`

PostgreSQL uses `5433` because another local Docker project already occupies `5432`.

## Verification evidence

The following passed on 2026-09-29 after M9.47:

- `npm run test:dashboard` — 44 tests passed across 9 files
- `npm test -- --runInBand` — 1,551 backend tests passed across 135 suites
- `npm run format:check`
- `npm run lint`
- `npm run build:all`
- `docker compose config --quiet` (the local Docker client emitted only its existing inaccessible user-config warning)
- `git diff --check`

The following passed on 2026-09-29 after M9.46:

- `npm run test:dashboard` — 43 tests passed across 8 files
- `npm test -- --runInBand` — 1,551 backend tests passed across 135 suites
- `npm run format:check`
- `npm run lint`
- `npm run build:all`
- `docker compose config --quiet` (the local Docker client emitted only its existing inaccessible user-config warning)
- `git diff --check`

The following passed on 2026-09-29 after M9.45:

- `npm run test:dashboard` — 39 tests passed across 7 files
- `npm test -- --runInBand` — 1,551 backend tests passed across 135 suites
- `npm run format:check`
- `npm run lint`
- `npm run build:all`
- `docker compose config --quiet` (the local Docker client emitted only its existing inaccessible user-config warning)
- `git diff --check`

The following passed on 2026-09-29 after M9.44:

- `npm run test:dashboard` — 36 tests passed across 6 files
- `npm test -- --runInBand` — 1,551 backend tests passed across 135 suites
- `npm run format:check`
- `npm run lint`
- `npm run build:all`
- `docker compose config --quiet` (the local Docker client emitted only its existing inaccessible user-config warning)
- `git diff --check`

The following passed on 2026-09-29 after M9.43:

- `npm run test:dashboard` — 34 tests passed across 6 files
- `npm test -- --runInBand` — 1,551 backend tests passed across 135 suites
- `npm run format:check`
- `npm run lint`
- `npm run build:all`
- `docker compose config --quiet` (the local Docker client emitted only its existing inaccessible user-config warning)
- `git diff --check`

The following passed on 2026-09-29 after M9.42:

- `npm run test:dashboard` — 33 tests passed across 6 files
- `npm test -- --runInBand` — 1,551 backend tests passed across 135 suites
- `npm run format:check`
- `npm run lint`
- `npm run build:all`
- `docker compose config --quiet` (the local Docker client emitted only its existing inaccessible user-config warning)
- `git diff --check`

The following passed on 2026-09-29 after M9.41:

- `npm run test:dashboard` — 32 tests passed across 6 files
- `npm test -- --runInBand` — 1,551 backend tests passed across 135 suites
- `npm run format:check`
- `npm run lint`
- `npm run build:all`
- `docker compose config --quiet` (the local Docker client emitted only its existing inaccessible user-config warning)
- `git diff --check`

The following passed on 2026-09-29 after M9.40:

- `npm run test:dashboard` — 31 tests passed across 6 files
- `npm test -- --runInBand` — 1,551 backend tests passed across 135 suites; M9.40 changes no backend code
- `npm run format:check`
- `npm run lint`
- `npm run build:all`
- `docker compose config --quiet` (the local Docker client emitted only its existing inaccessible user-config warning)
- `git diff --check`

The following passed on 2026-09-29 after M9.39:

- `npm run test:dashboard` — 27 tests passed across 5 files
- `npm test -- --runInBand` — 1,551 backend tests passed across 135 suites
- `npm run format:check`
- `npm run lint`
- `npm run build:all`
- `docker compose config --quiet` (the local Docker client emitted only its existing inaccessible user-config warning)
- `git diff --check`

The following passed on 2026-09-29 after M9.38:

- `npm run test:dashboard` — 26 tests passed across 5 files
- `npm run format:check`
- `npm run lint`
- `npm run build:all`
- `docker compose config --quiet` (the local Docker client emitted only its existing inaccessible user-config warning)
- `git diff --check`

The following passed on 2026-09-29 after M9.37:

- focused availability service, settings controller, and provider guard validation — 14 tests passed across 3 suites
- `npm run test:dashboard` — 25 tests passed across 5 files
- `npm test -- --runInBand` — 1,551 backend tests passed across 135 suites
- `npm run format:check`
- `npm run lint`
- `npm run build:all`
- `docker compose config --quiet` (the local Docker client emitted only its existing inaccessible user-config warning)
- `git diff --check`

The following passed on 2026-09-29 after M9.36:

- live VPN-enabled dashboard-proxy validation returned coherent two-sided YES and NO books for market `559651`, each with exact `0.001` spread; the final runtime was returned to `POLYMARKET_ENABLED=false`
- `npm run test:dashboard` — 23 tests passed across 5 files
- `npm test -- --runInBand` — 1,540 backend tests passed across 133 suites
- `npm run lint`
- `npm run format:check`
- `npm run build:all`
- `docker compose config --quiet` (the local Docker client emitted only its existing inaccessible user-config warning)
- `git diff --check`

The following passed on 2026-09-29 after M9.33:

- focused M9.33 Jest validation — 273 tests passed across 4 suites
- `npm test -- --runInBand` — 1,529 backend tests passed across 132 suites
- `npm run lint`
- `npm run format:check`
- `npm run build:all`
- `docker compose config --quiet` (the local Docker client emitted only its existing inaccessible user-config warning)
- `git diff --check`

The following passed on 2026-09-28 after M9.32:

- focused M9.31–M9.32 Jest validation — 262 tests passed across 4 suites
- `npm test -- --runInBand` — 1,500 backend tests passed across 130 suites
- `npm run lint`
- `npm run format:check`
- `npm run build:all`
- `docker compose config --quiet` (the local Docker client emitted only its existing inaccessible user-config warning)
- `git diff --check`

The following passed on 2026-09-28 after M9.31:

- focused M9.31 Jest validation — 247 tests passed across 3 suites
- `npm test -- --runInBand` — 1,485 backend tests passed across 129 suites
- `npm run lint`
- `npm run format:check`
- `npm run build:all`
- `docker compose config --quiet` (the local Docker client emitted only its existing inaccessible user-config warning)
- `git diff --check`

The following passed on 2026-09-28 after M9.30:

- focused M9.28–M9.30 Jest validation — 257 tests passed across 5 suites
- `npm test -- --runInBand` — 1,467 backend tests passed across 128 suites
- `npm run lint`
- `npm run format:check`
- `npm run build:all`
- `docker compose config --quiet` (the local Docker client emitted only its existing inaccessible user-config warning)
- `git diff --check`

The following passed on 2026-09-28 after M9.29:

- focused M9.28–M9.29 Jest validation — 245 tests passed across 4 suites
- `npm test -- --runInBand` — 1,455 backend tests passed across 127 suites
- `npm run lint`
- `npm run format:check`
- `npm run build:all`
- `docker compose config --quiet` (the local Docker client emitted only its existing inaccessible user-config warning)
- `git diff --check`

The following passed on 2026-09-28 after M9.28:

- focused M9.28 Jest validation — 229 tests passed across 4 suites
- `npm test -- --runInBand` — 1,439 backend tests passed across 127 suites
- `npm run lint`
- `npm run format:check`
- `npm run build:all`
- `docker compose config --quiet` (the local Docker client emitted only its existing inaccessible user-config warning)
- `git diff --check`

The following passed on 2026-09-27 after M8.11 and M9.24:

- `npm run build`
- focused M9.24 Jest validation — 207 tests passed across 4 suites
- `npm run lint`
- `npm run format:check`
- `npm test -- --runInBand` — 1366 backend tests passed across 120 suites
- `npm run test:dashboard` — 19 dashboard client, refresh-scheduler, API-path, API-isolation, and chart-transformation tests passed
- `npm run build:all`
- `docker compose config --quiet`
- `git diff --check`

The complete database-backed integration validation passed after E2E isolation:

- `npm run test:e2e -- --runInBand` — all 69 tests passed across 4 suites in the disposable `crypto_trader_e2e` schema.
- The E2E global setup recreates and migrates only its dedicated schema; local application balances, executions, controls, signals, candles, and runs are not read or changed.
- `npx prisma migrate deploy` — all fifteen migrations applied, including exact checkpoint top-of-book storage
- Live `GET /health` — API, PostgreSQL, and Redis reported `up`
- Live production entry point — `GET /dashboard/` returned HTML, its hashed asset returned 200 under `/dashboard/assets/`, production API paths omitted the development proxy prefix, and `GET /health` remained healthy.
- Public Polymarket live-contract check — with the development VPN active, Gamma returned eight real active-market summaries and selected-market identity, the Data API returned real open interest, and CLOB returned the documented `mid` response used by the corrected midpoint adapter.
- Polymarket operational guard live check — an explicitly enabled VPN-backed Compose API returned `200` from real market discovery; the API was then recreated with the default disabled state, where both the direct route and Vite proxy returned sanitized `503` before provider access while `/health` remained `ok`.
- Live Binance integrations — received normalized BTC/USDT public trades, mini tickers, one-minute candles, top-of-book updates, calculated spreads, and pair metadata without credentials
- Live Binance historical-candle smoke test — the public market-data-only kline endpoint returned ordered BTCUSDT one-minute rows with the documented 12 fields and no credentials
- Live paper wallet initialization — reported BTC `0` and USDT `1000` from the default configuration
- Live read-only API — balances returned BTC `0`/USDT `1000`; valuation first returned 503 before a ticker and then 200 with the live BTC/USDT price
- Database-backed M3.2 integration — one buy mutated both balances once, replay preserved them, cleanup restored them, and an unaffordable buy left no execution or balance change
- Database-backed M3.4 integration — one sell mutated both balances once, replay preserved them, cleanup restored them, and a sell without BTC left no execution or balance change

## Repository state

M0 through M8.11 are complete, and M9 is implemented through M9.63. Public Polymarket Data API freshness, selected-market and global open interest, selected-event live volume, bounded and point-in-time outcome prices, binary and same-outcome historical price comparisons and movements, forward and reverse market/outcome identities, event, market, active-series and bounded search discovery, exact-tag event and market filtering, exact-recurrence series filtering, selected event, tag, and series details, bounded selected-series event references, selected/global/related tag taxonomy, midpoint, binary midpoint complement, level-one book, coherent aggregate, last-trade, descriptive book-context, condition-resolution lifecycle, indexed binary payout-result observations, and the dashboard's event discovery and search, selected-event details, direct taxonomy, locally paginated bounded market references, event-reference and volume-row navigation into explicit market research, aggregate taker volume and locally paginated condition-correlated volume rows, Data API freshness, platform-wide and selected-market open interest, exact market/outcome identity provenance, isolated binary resolution results with lifecycle context, direct and explicitly selected first-level market taxonomy, selected-market midpoint, level-one liquidity, latest reported trades, trailing 24-hour price change and history chart, and process-local availability control are isolated from Spot crypto and every execution path. Live Gamma, Data API, and CLOB dashboard paths passed with the development VPN active; startup and post-restart behavior defaults to disabled.

## Known issues and cautions

- Without the development VPN, the configured host DNS resolver at `192.168.100.1` returns `NXDOMAIN` for Polymarket hostnames. Market discovery then fails closed with `503` and an explicit provider-DNS diagnostic; browser-only secure DNS does not fix the Node.js backend.
- Jest requires Node's `--experimental-vm-modules` flag because NestJS 12 packages are ESM.
- `npm audit --omit=dev` currently reports four high-severity findings in the Prisma toolchain dependency path (`prisma` through `@prisma/config`, `deepmerge-ts`, and `mysql2`). ECharts is not involved. The suggested fix is a breaking Prisma downgrade, so it was not applied automatically.
- A transitive Angular DevKit package recommends Node `24.15.0` or newer while the machine has Node `24.14.1`. Current build, lint, and tests pass, but a Node 24 LTS patch update is advisable.
- The advisory lock is global to the single local paper portfolio. Multiple portfolios may eventually require partitioned lock keys, but no such abstraction is needed yet.

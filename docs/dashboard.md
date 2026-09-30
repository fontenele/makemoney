# Dashboard

## Visualization standard

Apache ECharts is the dashboard's only chart library. New charts and material chart changes must use it instead of adding another charting package or hand-building SVG plots. Browser conversion of exact backend decimal strings remains presentational only.

## M8.1 read-only foundation

The first dashboard increment is a separate Vue 3/Vite browser application under `dashboard/`. It is an observational client of the existing NestJS API and does not share domain implementation code with the backend.

Run the API on `127.0.0.1:3000`, then start the dashboard with:

```bash
npm run dashboard:dev
```

Open `http://127.0.0.1:5173`. The development server binds only to loopback and proxies `/api` to the local backend. Production assets can be generated into ignored `dashboard-dist/` with `npm run build:dashboard`.

The overview reads four existing endpoints:

- `GET /health`
- `GET /paper-wallet/valuation`
- `GET /paper-trading/position`
- `GET /paper-trading/performance`

Requests are independent. An unavailable or stale valuation or position does not suppress healthy resources, and the dashboard displays no invented fallback amount. Amount formatting in the browser is presentational only; every financial calculation remains in the exact-decimal backend.

M8.1 adds no charts, new-listing views, backend route, API authentication, mutation control, signal generation, order simulation, wallet mutation, paper execution, authenticated exchange access, or real trading.

## M8.2 visibility-aware automatic refresh

The overview loads immediately and schedules its next refresh 15 seconds after the current refresh completes. Manual and automatic refreshes share the same non-overlapping execution guard.

The scheduler cancels pending work while the document is hidden. When the tab becomes visible, it refreshes immediately and starts a new completion-relative interval. Component teardown removes the visibility listener and pending timer.

M8.2 adds no backend route, persistent browser state, background work while hidden, mutation control, order path, authenticated exchange access, or real trading.

## M8.3 recent fictional execution ledger

The overview independently requests `GET /paper-trading/executions?limit=12` and displays the newest immutable paper executions as a responsive ledger. Each row identifies the buy or sell side, execution time, BTC quantity, execution price, and the side-appropriate total cost or net proceeds.

An empty history is distinct from an unavailable history. A history request failure affects only the ledger; health, valuation, position, and performance remain visible when their requests succeed. Decimal formatting is presentational and the backend remains the source of all stored financial values.

M8.3 adds no chart inference, pagination, mutation, execution control, browser persistence, backend route, authenticated exchange access, or real trading.

## M8.4 recent new-listing detections

The dashboard independently requests `GET /new-listings?limit=8` and presents recent application detections as responsive cards. Each card exposes provider, pair, application detection time, current provider status, and current Spot availability without implying an official exchange listing timestamp.

An empty result explicitly states that no post-baseline listing has been detected. Failure remains local to this view and does not suppress portfolio or execution resources.

M8.4 adds no symbol ranking, recommendation, alert, checkpoint analysis, mutation, provider request from the browser, execution behavior, authenticated exchange access, or real trading.

## M8.5 responsive section navigation

The header exposes semantic anchor navigation to Overview, Executions, and New listings. Each link targets a named page section, respects keyboard focus, uses native URL fragments, and applies scroll offsets so destinations remain visible.

On narrow screens the links move to a horizontally scrollable second header row rather than disappearing. Reduced-motion preferences continue to disable smooth scrolling through the existing global media rule.

M8.5 adds no router dependency, separate page, browser state, backend request, mutation, authentication, or trading behavior.

## M8.6 persisted strategy signal timeline

The dashboard independently requests the twenty newest persisted moving-average crossover signals and displays action, evaluation time, configured periods, and current short/long averages in a responsive timeline. Buy and sell markers are visual observations only; hold remains neutral.

Empty and unavailable signal histories are explicit and independent. M8.6 adds no strategy evaluation, parameter mutation, sizing, Risk Engine call, order submission, or real trading.

## M8.7 moving-average signal chart

The strategy section derives a chronological chart from the same bounded persisted signal response. Short and long averages share one visible scale, while buy and sell points are marked on the short-average line. The exact timeline remains available below the chart. M8.11 later migrates its original manual SVG implementation to ECharts.

Only signals containing finite short and long averages are charted. Decimal conversion is limited to browser coordinates and labels; the backend's exact decimal strings remain the source facts, and the chart performs no financial, strategy, sizing, or execution calculation.

M8.7 adds no backend route, price inference, signal generation, recommendation, mutation, Risk Engine call, order submission, or real trading.

## M8.8 selected-listing checkpoint research

Each recent detection card can explicitly load its existing T+0-relative price-performance resource. The selected research panel plots the durable checkpoint return path around a visible zero line and lists each exact checkpoint label, return, and observed price.

Selection is browser-local and read-only. The selected resource refreshes with the dashboard while remaining independent from the recent-detection list and all portfolio resources. HTTP 503 is presented as an expected wait for the durable T+0 observation rather than as a fabricated zero or missing detection.

Numeric conversion is limited to SVG coordinates and formatted labels. M8.8 adds no backend route, live provider request from the browser, ranking, score, recommendation, alert, signal, mutation, order submission, or real trading.

## M8.9 latest persisted backtest equity

The dashboard independently requests only the newest immutable simulation snapshot through the established bounded run-list route. When present, it plots the complete backend-calculated fee-adjusted equity curve and shows the stored initial capital, final equity, total ROI, maximum percentage drawdown, closed trades, and realized win rate.

An empty stored-run list and an unavailable run resource are explicit and do not suppress any other dashboard section. Browser numeric conversion is limited to chart coordinates and labels; the exact result strings remain authoritative.

M8.9 adds no backtest execution control, simulation request, run persistence or deletion, recalculation, market-data request, wallet effect, recommendation, order submission, or real trading.

## M8.10 compiled dashboard serving

The NestJS Express adapter serves generated dashboard assets under /dashboard/. Vite production builds use /dashboard/ as their asset base and call the existing same-origin root API routes directly, while the development server remains at 127.0.0.1:5173 with its /api proxy.

Run the complete build and production entry point:

    npm run build:all
    npm run start:prod

Then open http://127.0.0.1:3000/dashboard/. Static serving remains on the application's existing loopback-bound listener and does not create API aliases or change controller routes.

M8.10 adds no client-side router, external hosting, authentication change, mutation control, order submission, exchange credentials, or real trading.

## M8.11 Apache ECharts migration

The moving-average signal chart, latest backtest equity curve, and selected-listing checkpoint return chart now use Apache ECharts 6.1 through one reusable Vue component. The component registers only the required line, scatter, grid, tooltip, accessibility, and SVG-renderer modules; it updates reactively, resizes through `ResizeObserver`, falls back to the window resize event, and disposes its instance on unmount.

The three existing chart transformation modules now create ECharts options while preserving their prior chronological filtering, displayed ranges, signal markers, zero baseline, exact source strings, and empty-data behavior. Existing hand-built chart SVG paths and styles were removed.

Vite emits the application, ECharts, and ZRender as separate bounded chunks. M8.11 adds no backend route, financial calculation, signal generation, recommendation, mutation, order submission, provider credential, or real-trading behavior.

## M9.34 Polymarket market research

The dashboard independently requests `GET /polymarket/markets?limit=8` and displays the returned active market questions as a responsive, keyboard-accessible selection grid. This is the first visible Polymarket surface; it reuses the existing local APIs and adds no backend route.

Selecting one market concurrently loads its existing detail, open-interest, and midpoint-complement resources. The panel shows indexed YES/NO labels, independently observed midpoint percentages, and aggregate open interest in USDC. Each resource retains an isolated unavailable state, so an absent open-interest measurement does not hide valid identity or midpoint data.

Unavailable responses display a bounded, sanitized message returned by the local API when one exists. In particular, active-market discovery distinguishes provider DNS-resolution failure from an otherwise generic `503`; malformed or non-JSON errors retain the HTTP-status fallback.

M9.35 makes provider-backed Polymarket research fail closed by default. With effective availability disabled, the section displays `Polymarket research is disabled by local settings`, and no provider request is attempted. M9.37 later adds the explicit process-local control documented below.

## M9.36 selected-market level-one liquidity

After selected-market details provide indexed non-null outcome tokens, the dashboard concurrently requests the existing top-of-book route for YES and NO. Each outcome displays its best bid and ask price as a percentage, corresponding displayed share quantity, and provider-calculated spread. A missing side remains explicitly `No bid` or `No ask`, while an unavailable book is isolated to that outcome.

These are independent public level-one observations. The view does not expose full depth, aggregate available liquidity, executable quotes, fill guarantees, recommendation logic, account state, orders, or execution controls. M9.35 still prevents every request while Polymarket is disabled.

Selection remains browser-local and refreshes with the established visibility-aware dashboard cadence. Midpoints remain explicitly non-executable, are not atomic quotes, and are not recommendations or probability guarantees. The view does not yet display event-level volume, price history, full order-book depth, trade history, holders, positions, accounts, orders, or execution controls.

## M9.37 process-local Polymarket availability

The dashboard independently reads `GET /polymarket/settings` even while provider research is disabled. It shows whether the current state comes from the safe startup configuration or a runtime override. Enabling requires the operator to acknowledge that local access is permitted and the required VPN is active before `PUT /polymarket/settings` is sent; disabling needs no acknowledgement and immediately clears browser-local market selection.

The override exists only in the current API process and resets to `POLYMARKET_ENABLED` on restart. The dashboard does not detect or control a VPN, persist consent, bypass a network restriction, or gain credentials, accounts, positions, wallet, order, or execution access. All provider-backed resources remain behind the same fail-closed guard.

## M9.38 selected-market latest reported trades

After selected-market details provide indexed non-null outcome tokens, the dashboard requests the existing latest-trade resource independently for YES and NO alongside their level-one books. Each card displays the exact reported price as a percentage, the provider-reported buy or sell side, and the application's local receipt time. A never-traded or otherwise unavailable outcome remains isolated and does not hide its peer or either book.

The CLOB endpoint supplies neither trade quantity nor provider timestamp. The dashboard states those omissions and does not infer freshness, direction, momentum, current liquidity, execution price, or trade history. Latest trades and books remain independent non-atomic observations and provide no recommendation, signal, account, order, or execution control.

## M9.39 selected-market 24-hour price change

Each selected-market refresh now requests the existing binary price-change route over a trailing 24-hour UTC interval. The browser truncates the current instant to a whole second and derives the earlier boundary exactly 24 hours before it, matching the backend's canonical input contract.

The dashboard displays the backend-calculated exact YES and NO absolute changes as percentage points with their `up`, `down`, or `unchanged` direction. It does not divide by the earlier price or present a percentage return. If the historical comparison is unavailable, its diagnostic is isolated and current identity, midpoint, open-interest, level-one book, and latest-trade resources remain visible.

The four underlying historical observations are independently selected by the provider and do not form atomic snapshots. M9.39 adds no retained history, chart, polling beyond the existing dashboard refresh, signal, recommendation, account, order, or execution behavior.

## M9.40 selected-market 24-hour price history chart

After selected-market detail supplies indexed token identities, the dashboard requests one existing price-history page independently for YES and NO over the same trailing 24-hour UTC window. Both requests explicitly use 30-minute resolution and a 100-point limit; a complete window needs at most 49 observations, so the browser does not follow provider cursors.

The chart uses the shared ECharts component and a fixed zero-to-one vertical scale. This preserves the meaning of outcome prices and avoids visually amplifying small changes through a dynamically narrowed axis. A valid single outcome remains visible when its peer is unavailable, and each missing series retains its own diagnostic.

The histories are independent provider pages and are not joined into synchronized YES/NO snapshots. Browser number conversion is limited to plotting validated price strings. M9.40 adds no persistence, historical order book, trade history, percentage-return calculation, signal, recommendation, account, order, or execution behavior.

## M9.41 public Data API freshness context

The dashboard independently requests the existing parameter-free `GET /polymarket/data-freshness` resource during each general refresh. A compact provider-status grid shows snapshot age and computation time, serving lag and worst mechanism, the most-lagged ingestion cursor with its block distance and network, and total cursor coverage.

This observation describes the public Data API only. It remains separate from the application's `/health` resource and does not claim freshness for Gamma discovery, CLOB books, midpoints, or latest trades. The dashboard applies no warning threshold or traffic-light classification because the provider contract supplies measurements rather than a locally approved operational policy.

Freshness failure is isolated from provider settings, market discovery, and selected-market resources. M9.41 adds no persistence, alert, automated response, VPN action, recommendation, account, order, or execution behavior.

## M9.42 platform-wide open interest context

The dashboard independently requests the existing parameter-free `GET /polymarket/open-interest` resource during each general refresh. A separate platform context card displays the exact aggregate open interest in USDC and the application's local receipt time without conflating it with the selected market's condition-level measurement.

Unavailable global open interest remains isolated from Data API freshness, discovery, and selected-market research. The value is descriptive and explicitly non-executable. M9.42 adds no backend route, market expansion, holders, wallet positions, persistence, account access, recommendation, signal, order, or execution behavior.

## M9.43 selected-market direct taxonomy

Each selected-market refresh independently requests the existing bounded `GET /polymarket/markets/:id/tags` resource. The research panel presents directly attached tags as compact labels, using the provider label, nullable slug, or tag identity in that order. An empty direct taxonomy and an unavailable taxonomy are explicit separate states.

The dashboard does not follow related-tag relationships, filter market discovery, infer missing categories, or rank markets by taxonomy. Failure remains isolated from every other selected-market observation. M9.43 adds no backend route, persistence, recommendation, signal, account, order, or execution behavior.

## M9.44 explicit first-level related taxonomy

Direct market-tag labels become explicit controls. Selecting one independently requests the existing `GET /polymarket/tags/:id/related` resource and displays the bounded first-level result with separate loading, empty, and unavailable states. Selection is browser-local, resets when the selected market changes or provider access is disabled, and refreshes only after the initial user choice.

Related results are plain display labels rather than controls, preventing recursive traversal. Request sequencing ignores stale responses when a newer tag is selected. M9.44 adds no backend route, implicit expansion, discovery filtering, relationship weight, ranking, persistence, recommendation, signal, account, order, or execution behavior.

## M9.45 selected-market binary midpoint relationship

The selected-market panel now exposes the exact `midpointSum`, signed `deviationFromOne`, and descriptive `balanced`, `below_one`, or `above_one` classification already returned with the YES and NO midpoint observations. The browser adds percentage formatting for readability while retaining the source decimal strings.

This view reuses the existing midpoint-complement request and therefore adds no provider traffic or backend route. It explicitly labels the observations as independent receipts, non-atomic, and non-executable; a deviation is not presented as arbitrage, incoherence, profit, a recommendation, or an execution opportunity.

## M9.46 selected-market historical alignment context

The trailing 24-hour comparison now also displays the backend-calculated exact combined YES/NO movement and its direction. The same established response supplies separate timestamp and resolution alignment flags for the earlier and later requested boundaries, which the dashboard renders without collapsing those two dimensions.

No additional request or browser-side financial calculation is introduced. The combined movement is an exact sum of two absolute price changes, not a percentage return, synchronized probability path, arbitrage measure, signal, recommendation, or executable observation. Both boundaries remain independently selected and the aggregate remains explicitly non-atomic and non-executable.

## M9.47 selected-market historical observation provenance

The dashboard now expands the existing binary price-change response into four audit cards: YES and NO at the earlier boundary, followed by YES and NO at the later boundary. Each card preserves the exact decimal price, actual provider-selected observation time, resolution in seconds, and whether that observation exactly matched the requested instant or was the latest point at or before it.

The browser only maps the already validated response into a fixed presentation order and adds no request or price selection. These points remain Data API historical observations rather than trades, bids, asks, executable quotes, synchronized snapshots, signals, recommendations, or evidence of a fill.

## M9.48 routed information architecture and legibility

The dashboard now uses a persistent side-navigation shell on desktop and compact responsive navigation on narrow screens. Its content is separated into three browser-local hash routes: `#/` for portfolio, execution, strategy, and backtest overview; `#/polymarket` for prediction-market research; and `#/new-listings` for detection and checkpoint research. Hash routing keeps direct links compatible with both the Vite development server and the compiled `/dashboard/` static mount without adding a backend fallback route or router dependency.

Each research page has its own heading and context label. Higher panel contrast, larger supporting text, clearer spacing, and stronger selected-navigation states improve scanning of dense market observations. Existing data loading, isolated unavailable states, selection state, automatic refresh behavior, financial formatting, provider enablement controls, and read-only execution boundary remain unchanged.

## M9.49 bounded active-event discovery

The Polymarket page independently requests `GET /polymarket/events?limit=6` during the established visibility-aware refresh and displays the first bounded page as a responsive event grid. Each event card shows provider identity, title, nullable start/end schedule, and restricted status without expanding nested markets or requesting event details.

An empty event page is distinct from an unavailable event resource, and event failure does not suppress active-market discovery or selected-market research. The cards are deliberately non-interactive in this increment: no event selection, cursor pagination, taxonomy filter, live volume, ranking, recommendation, persistence, account, order, or execution behavior is added.

## M9.50 selected-event identity and lifecycle

Active-event cards are now explicit selection controls. Selecting one independently requests `GET /polymarket/events/:id` and displays its public description, active/closed lifecycle, nullable resolution source, local receipt time, and count of normalized market references.

Selection is browser-local, stale responses are ignored when a newer event is selected, and disabling Polymarket access clears pending and displayed event detail. Referenced markets are counted but not rendered or queried, and the view adds no tags, live volume, prices, liquidity, outcomes, ranking, recommendation, account, order, or execution behavior.

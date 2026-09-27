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

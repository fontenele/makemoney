# Dashboard

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

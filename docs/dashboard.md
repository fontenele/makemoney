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

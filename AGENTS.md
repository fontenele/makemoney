# Project Rules

## Required project context

- Read `PROJECT_CONTEXT.md` and `docs/maps.md` before starting work.
- Consult the relevant documents linked by `docs/maps.md` before changing a subsystem.
- Update `docs/current-state.md` and `docs/CHANGELOG.md` when a milestone or meaningful project behavior changes.
- Keep plans and delivered scope synchronized in `docs/roadmap.md`; do not mark work complete before verification.
- Keep the API route table in the root `README.md` synchronized whenever a route, method, access requirement, or public parameter is added or changed.

## Scope and delivery

- Build this project incrementally, one milestone at a time.
- Keep the architecture a modular monolith; do not introduce microservices without a concrete need.
- Do not implement future milestones early or create speculative domain tables and abstractions.
- Explain the intent before large changes or important new dependencies.
- Use English for code, identifiers, configuration keys, and technical documentation.

## Current milestone boundaries

- M0 covers the NestJS bootstrap, validated configuration, linting/formatting, Docker Compose, PostgreSQL, and Redis.
- Do not add Binance or other market-provider integrations during M0.
- The first Binance integration must use public, read-only market data and require no credentials.
- Do not integrate Polymarket or Binance Agentic Wallet until their respective milestones.

## Financial safety

- Never execute a real financial transaction without the user's explicit confirmation immediately before the first real order.
- Paper trading and real trading must remain separate implementations behind a shared executor contract.
- Strategies produce signals; they must never submit orders directly. Every order must pass through the Risk Engine.
- Futures, margin, leverage, and automated withdrawals are always disabled.
- Real trading must require multiple independent safeguards; changing one environment variable must never be sufficient to enable it.
- Keep the Binance Agentic Wallet at zero balance during initial development.
- Never request, store, log, or commit private keys, seed/recovery phrases, passwords, API secrets, or sensitive tokens.

## Engineering standards

- Use Node.js 24 LTS, TypeScript strict mode, NestJS, PostgreSQL, Redis, Prisma, and Docker Compose unless a later decision explicitly changes the stack.
- Prefer readable, small units and domain/infrastructure separation where there is a concrete boundary.
- Validate configuration at startup and use structured logging.
- Encapsulate external providers behind interfaces instead of coupling business rules to Binance.
- Add automated tests for behavior introduced in each milestone.
- Financial rules require focused tests, especially fees, net PnL, slippage, sizing, limits, stops, rounding, precision, and minimum orders.
- Do not use native floating-point arithmetic for monetary calculations; adopt an explicit decimal strategy when financial calculations are introduced.

## Operations and resilience

- Keep secrets in local environment files excluded from Git and maintain a safe `.env.example`.
- Never include real credentials or nonzero real-trading defaults in examples.
- Add audit trails, idempotency, rate limits, retries, WebSocket reconnection, circuit breakers, and an emergency stop incrementally when their milestones require them.
- Paper simulations must eventually account for fees, spread, slippage, precision, minimum order constraints, liquidity, and applicable network costs.

## Local runtime startup

- When Codex or other automation starts the local API, launch it as a Windows-host process with normal outbound network access, not inside a restricted command sandbox. The public Binance REST warm-up and WebSocket streams must be reachable from the API process.
- Start the dashboard only after the API is listening. Do not report the local runtime as ready based only on open ports or `GET /health`.
- Before handing the running application back to the user, require HTTP 200 from `GET http://127.0.0.1:3000/paper-wallet/valuation` and from the Vite proxy path `GET http://127.0.0.1:5173/api/paper-wallet/valuation`. A `503` with `BTC/USDT market price is not available yet` means the API was not started correctly and must be restarted with outbound network access.
- Avoid duplicate dev servers. Before restarting, identify the exact listeners on ports 3000 and 5173 and stop only those project-owned processes.

## Verification

- Run relevant tests, linting, formatting checks, builds, and Compose validation after changes.
- Report environmental blockers clearly; do not weaken machine security settings just to make a command work.

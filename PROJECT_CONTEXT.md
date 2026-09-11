# Project Context

This file is the mandatory starting point for work on Crypto Trader. Read it together with `AGENTS.md` and `docs/maps.md` before making changes.

## Purpose

Crypto Trader is a personal, local platform for collecting cryptocurrency market data, realistic paper trading, deterministic strategy research, backtesting, and risk-controlled experimentation. The initial goal is trustworthy data and simulation, not profit.

## Current position

- Completed milestone: **M0 — Bootstrap**.
- Current approved planning target: **M1.1 — Binance public BTC/USDT trades**.
- M1.1 has not been implemented and requires explicit user approval after review of the proposed plan.
- The application is a modular NestJS monolith backed by PostgreSQL, Redis, and Prisma.
- The local API health endpoint is `http://localhost:3000/health`.
- PostgreSQL is exposed on host port `5433` because port `5432` is occupied by another local project.

## Immediate boundary

M1.1 is limited to receiving BTC/USDT public trade events from Binance WebSocket, requiring no authentication, and normalizing those events into the internal domain representation.

Do not add ticker streams, candles, order books, persistence, paper trading, strategies, wallet access, authenticated APIs, or order execution as part of M1.1.

## Non-negotiable safety

- Never request or store wallet recovery material, private keys, passwords, or API secrets.
- Never submit a real financial transaction without explicit confirmation immediately before the first real order.
- Futures, margin, leverage, and automated withdrawals remain disabled.
- Binance Agentic Wallet remains disconnected and at zero balance during early development.

## Documentation navigation

- `docs/maps.md`: keyword and subsystem navigation map.
- `docs/current-state.md`: evidence-based implementation and environment status.
- `docs/roadmap.md`: milestone scope and completion state.
- `docs/CHANGELOG.md`: chronological record of meaningful changes.
- `docs/decisions.md`: durable technical decisions and their reasons.

# Project Context

This file is the mandatory starting point for work on Crypto Trader. Read it together with `AGENTS.md` and `docs/maps.md` before making changes.

## Purpose

Crypto Trader is a personal, local platform for collecting cryptocurrency market data, realistic paper trading, deterministic strategy research, backtesting, and risk-controlled experimentation. The initial goal is trustworthy data and simulation, not profit.

## Current position

- Completed milestones: **M0 — Bootstrap**, **M1.1 — Binance public BTC/USDT trades**, and **M1.2 — WebSocket reconnection**.
- No next increment is approved. Stop and present a minimal plan before starting more market-data work.
- The application is a modular NestJS monolith backed by PostgreSQL, Redis, and Prisma.
- The local API health endpoint is `http://localhost:3000/health`.
- PostgreSQL is exposed on host port `5433` because port `5432` is occupied by another local project.

## Immediate boundary

M1.1 receives BTC/USDT public trade events from Binance WebSocket, requires no authentication, and normalizes those events into the internal domain representation.

Ticker streams, candles, order books, persistence, paper trading, strategies, wallet access, authenticated APIs, and order execution remain unimplemented and require separately approved milestones.

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
- `docs/binance-public-trades.md`: M1.1 stream contract and operation.

# Project Context

This file is the mandatory starting point for work on Crypto Trader. Read it together with `AGENTS.md` and `docs/maps.md` before making changes.

## Purpose

Crypto Trader is a personal, local platform for collecting cryptocurrency market data, realistic paper trading, deterministic strategy research, backtesting, and risk-controlled experimentation. The initial goal is trustworthy data and simulation, not profit.

## Current position

- Completed milestones: **M0 — Bootstrap**, **M1.1 — Binance public BTC/USDT trades**, **M1.2 — WebSocket reconnection**, **M1.3 — Binance public BTC/USDT mini ticker**, **M1.4 — Binance public BTC/USDT 1m candles**, **M1.5 — candle volume**, **M1.6 — BTC/USDT top of book**, **M1.7 — deterministic spread calculation**, and **M1.8 — BTC/USDT pair metadata**.
- No next increment is approved. Stop and present a minimal plan before starting more market-data work.
- The application is a modular NestJS monolith backed by PostgreSQL, Redis, and Prisma.
- The local API health endpoint is `http://localhost:3000/health`.
- PostgreSQL is exposed on host port `5433` because port `5432` is occupied by another local project.

## Immediate boundary

The current market-data scope receives BTC/USDT public trade, mini ticker, one-minute candle, and top-of-book events from Binance WebSocket and loads public pair metadata from Binance REST. It requires no authentication and normalizes provider data into internal domain representations.

Historical candles, aggregate volume analytics, metadata refresh and enforcement, multi-level order books, persistence, paper trading, strategies, wallet access, authenticated APIs, and order execution remain unimplemented and require separately approved milestones.

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
- `docs/binance-public-ticker.md`: M1.3 stream contract and operation.
- `docs/binance-public-candles.md`: M1.4–M1.5 candle and volume contract and operation.
- `docs/binance-public-top-of-book.md`: M1.6–M1.7 best bid/ask and spread contract and operation.
- `docs/binance-pair-metadata.md`: M1.8 public BTC/USDT trading-rule metadata.

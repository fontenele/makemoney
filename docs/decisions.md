# Technical Decisions

## Modular monolith

The project remains a single NestJS application. Feature modules and provider boundaries are introduced only when required by an approved milestone.

## PostgreSQL host port 5433

Container-to-container communication uses PostgreSQL's standard port `5432`. Host access uses `5433` because another local project already binds `5432`.

## Prisma 7.10 with PostgreSQL adapter

Prisma CLI, client, and adapter are aligned on version 7.10. PostgreSQL is accessed through `@prisma/adapter-pg` and `pg`.

## NestJS 12 and Jest ESM execution

NestJS 12 packages use ESM. Jest runs through Node with `--experimental-vm-modules`, and ts-jest emits ES modules for tests.

## Financial and provider boundaries

External market providers must be encapsulated. Domain objects must not expose provider payload shapes. Strategies will produce signals, the Risk Engine will assess them, and only an executor may eventually submit an order. No executor exists in M0 or M1.1.

## M1.1 raw trade stream

M1.1 uses the Binance Spot raw stream `wss://stream.binance.com:9443/ws/btcusdt@trade`, as documented by the official Binance WebSocket Market Streams reference on 2026-09-11. It requires no authentication.

The provider payload is validated and translated at the infrastructure boundary. Price and quantity remain decimal strings to avoid premature floating-point arithmetic. Binance's buyer-maker flag maps to the internal taker side: buyer maker means `sell`; otherwise `buy`.

The `ws` package is the explicit WebSocket transport.

## M1.2 bounded WebSocket reconnection

Unexpected trade-stream closes use exponential backoff starting at one second and capped at 30 seconds. A successful connection resets the retry count. This handles ordinary network interruption and Binance's documented connection lifetime without creating rapid retry loops.

The client owns at most one socket and one reconnect timer. Shutdown marks the client as stopping before closing resources, so close/error events cannot create a new connection. Jitter, application-level heartbeat detection, and circuit breakers are deferred until operational evidence requires them.

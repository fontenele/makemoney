# Binance Public Top of Book (M1.6)

## Scope

M1.6 consumes only public BTC/USDT Spot best bid and ask updates. It does not calculate spread, reconstruct multi-level depth, request snapshots, authenticate, persist data, access an account or wallet, or submit orders.

Official reference: [Binance Spot WebSocket Market Streams](https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams#individual-symbol-book-ticker-streams)

## Connection

- Base URL: `wss://stream.binance.com:9443`
- Raw stream: `/ws/btcusdt@bookTicker`
- Full default URL: `wss://stream.binance.com:9443/ws/btcusdt@bookTicker`
- Configuration: `BINANCE_WS_BASE_URL`
- Documented update speed: real time

The client has an independent connection and follows the NestJS module lifecycle.

## Provider payload

The boundary accepts the documented fields:

- `u`: non-negative safe update ID
- `s`: must be `BTCUSDT`
- `b` and `B`: best bid price and quantity
- `a` and `A`: best ask price and quantity

Prices and quantities must be non-negative decimal strings. Malformed JSON, unexpected symbols, unsafe update IDs, and invalid decimal values are ignored.

## Internal top of book

The normalized `MarketTopOfBook` contains:

- `provider`: `binance`
- `symbol`: `BTC/USDT`
- `updateId`: string
- `bidPrice` and `bidQuantity`: decimal strings
- `askPrice` and `askQuantity`: decimal strings
- `receivedAt`: `Date`

The Binance payload has no event timestamp, so receipt time is the only time in the M1.6 domain object. No numeric conversion or spread calculation is performed.

## Reconnection

Unexpected closes schedule one replacement connection. The delay starts at one second, doubles after each failed connection, and is capped at 30 seconds. A successful connection resets the sequence. Intentional shutdown cancels pending retries and prevents replacement connections.

Scheduled retries use `market.top_of_book.reconnect_scheduled` with `attempt` and `delayMs` fields.

## Operation

Start the stack and follow the API logs:

```bash
docker compose up -d --build
docker compose logs -f api
```

Normalized entries use the event name `market.top_of_book.received`. The health endpoint remains available at `http://localhost:3000/health`.

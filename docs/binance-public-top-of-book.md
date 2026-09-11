# Binance Public Top of Book and Spread (M1.6–M1.7)

## Scope

M1.6 consumes public BTC/USDT Spot best bid and ask updates. M1.7 derives spread metrics from those updates. This scope does not reconstruct multi-level depth, request snapshots, authenticate, persist data, access an account or wallet, or submit orders.

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

The Binance payload has no event timestamp, so receipt time is the only time in the M1.6 domain object.

## Spread calculation

For every valid top-of-book update, M1.7 calculates:

- absolute spread: `askPrice - bidPrice`
- midpoint: `(askPrice + bidPrice) / 2`
- spread basis points: `(absoluteSpread / midPrice) * 10000`

Calculations use `decimal.js` with precision 40 and half-even rounding. Outputs remain decimal strings; basis points always have eight decimal places. Crossed books and non-positive midpoints do not produce a spread. A locked positive book produces zero spread.

## Reconnection

Unexpected closes schedule one replacement connection. The delay starts at one second, doubles after each failed connection, and is capped at 30 seconds. A successful connection resets the sequence. Intentional shutdown cancels pending retries and prevents replacement connections.

Scheduled retries use `market.top_of_book.reconnect_scheduled` with `attempt` and `delayMs` fields.

## Operation

Start the stack and follow the API logs:

```bash
docker compose up -d --build
docker compose logs -f api
```

Normalized entries use `market.top_of_book.received`; derived spread entries use `market.spread.calculated`. The health endpoint remains available at `http://localhost:3000/health`.

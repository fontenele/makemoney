# Binance Public Mini Ticker (M1.3)

## Scope

M1.3 consumes only the public BTC/USDT Spot mini ticker and normalizes the latest price. It does not authenticate, access an account or wallet, persist data, or submit orders.

Official reference: [Binance Spot WebSocket Market Streams](https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams)

## Connection

- Base URL: `wss://stream.binance.com:9443`
- Raw stream: `/ws/btcusdt@miniTicker`
- Full default URL: `wss://stream.binance.com:9443/ws/btcusdt@miniTicker`
- Configuration: `BINANCE_WS_BASE_URL`
- Documented update speed: 1000 milliseconds

The ticker client has an independent connection and follows the NestJS module lifecycle.

## Provider payload

The boundary accepts the documented mini ticker fields:

- `e`: must be `24hrMiniTicker`
- `E`: event timestamp in milliseconds
- `s`: must be `BTCUSDT`
- `c`: latest price
- `o`, `h`, and `l`: rolling-window open, high, and low prices
- `v` and `q`: rolling-window base and quote volumes

All price and volume values must be non-negative decimal strings. Malformed JSON, unexpected symbols/events, unsafe timestamps, and invalid decimals are ignored. Only `c` is exposed by the M1.3 domain model; other rolling-window fields are validated but deferred.

## Internal ticker

The normalized `MarketTicker` contains:

- `provider`: `binance`
- `symbol`: `BTC/USDT`
- `lastPrice`: decimal string
- `eventTime` and `receivedAt`: `Date`

No native floating-point conversion is performed.

## Reconnection

Unexpected closes schedule one replacement connection. The delay starts at one second, doubles after each failed connection, and is capped at 30 seconds. A successful connection resets the sequence. Intentional shutdown cancels pending retries and prevents replacement connections.

Scheduled retries use `market.ticker.reconnect_scheduled` with `attempt` and `delayMs` fields.

## Operation

Start the stack and follow the API logs:

```bash
docker compose up -d --build
docker compose logs -f api
```

Normalized entries use the event name `market.ticker.received`. The health endpoint remains available at `http://localhost:3000/health`.

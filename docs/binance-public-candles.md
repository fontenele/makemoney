# Binance Public One-Minute Candles (M1.4)

## Scope

M1.4 consumes only live BTC/USDT Spot one-minute candle updates. It does not authenticate, retrieve history, persist data, access an account or wallet, or submit orders.

Official reference: [Binance Spot WebSocket Market Streams](https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams#klinecandlestick-streams-for-utc)

## Connection

- Base URL: `wss://stream.binance.com:9443`
- Raw stream: `/ws/btcusdt@kline_1m`
- Full default URL: `wss://stream.binance.com:9443/ws/btcusdt@kline_1m`
- Configuration: `BINANCE_WS_BASE_URL`
- Interval: one minute in UTC
- Documented update speed: 2000 milliseconds

The candle client has an independent connection and follows the NestJS module lifecycle.

## Provider payload

The boundary validates the documented kline envelope and nested candle fields, including:

- event type, event time, and symbol;
- candle open and close time, symbol, and `1m` interval;
- first and last trade IDs and trade count;
- open, high, low, and close prices;
- base, quote, and taker-buy volumes;
- candle close state.

Malformed JSON, unexpected symbols or intervals, unsafe integers and timestamps, invalid decimal strings, and close times before open times are ignored. Volume and trade metadata are validated but not exposed by the M1.4 domain model.

## Internal candle

The normalized `MarketCandle` contains:

- `provider`: `binance`
- `symbol`: `BTC/USDT`
- `interval`: `1m`
- `openPrice`, `highPrice`, `lowPrice`, and `closePrice`: decimal strings
- `openTime`, `closeTime`, `eventTime`, and `receivedAt`: `Date`
- `isClosed`: whether Binance reports the candle as final

No native floating-point conversion is performed. An open candle may be emitted repeatedly as its OHLC values change; `isClosed=true` identifies the final provider update for that minute.

## Reconnection

Unexpected closes schedule one replacement connection. The delay starts at one second, doubles after each failed connection, and is capped at 30 seconds. A successful connection resets the sequence. Intentional shutdown cancels pending retries and prevents replacement connections.

Scheduled retries use `market.candle.reconnect_scheduled` with `attempt` and `delayMs` fields.

## Operation

Start the stack and follow the API logs:

```bash
docker compose up -d --build
docker compose logs -f api
```

Normalized entries use the event name `market.candle.received`. The health endpoint remains available at `http://localhost:3000/health`.

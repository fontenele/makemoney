# Binance Public Trades (M1.1–M1.2)

## Scope

M1.1 consumes only public BTC/USDT Spot trades. It does not authenticate, access an account or wallet, persist data, or submit orders.

Official reference: [Binance Spot WebSocket Market Streams](https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams)

## Connection

- Base URL: `wss://stream.binance.com:9443`
- Raw stream: `/ws/btcusdt@trade`
- Full default URL: `wss://stream.binance.com:9443/ws/btcusdt@trade`
- Configuration: `BINANCE_WS_BASE_URL`
- Update speed: real time

The client starts with the NestJS market-data module and closes with the module lifecycle.

## Reconnection

Unexpected closes schedule one replacement connection. The delay starts at one second, doubles after each failed connection, and is capped at 30 seconds. A successful `open` event resets the sequence to one second.

Only one active socket or pending reconnect timer is allowed. Intentional shutdown cancels the timer, closes an active or connecting socket, and prevents replacement connections. Scheduled retries use the structured event `market.trade.reconnect_scheduled` with `attempt` and `delayMs` fields.

The client relies on the `ws` library for protocol-level ping/pong handling. Application-level liveness detection and circuit breakers are not part of M1.2.

## Provider payload

The boundary accepts the documented trade fields:

- `e`: must be `trade`
- `E`: event timestamp in milliseconds
- `s`: must be `BTCUSDT`
- `t`: provider trade ID
- `p`: decimal price string
- `q`: decimal base-asset quantity string
- `T`: trade timestamp in milliseconds
- `m`: whether the buyer is the maker

Malformed JSON, unexpected symbols/events, unsafe integer IDs/timestamps, and invalid decimal strings are ignored.

## Internal trade

The normalized `MarketTrade` contains:

- `provider`: `binance`
- `symbol`: `BTC/USDT`
- `tradeId`: string
- `price`: decimal string
- `quantity`: decimal string
- `takerSide`: `buy` or `sell`
- `eventTime`, `tradeTime`, and `receivedAt`: `Date`

If the buyer is maker (`m=true`), the seller is the taker and `takerSide` is `sell`. Otherwise it is `buy`.

## Operation

Start the stack and follow the API logs:

```bash
docker compose up -d --build
docker compose logs -f api
```

Normalized entries use the event name `market.trade.received`. The health endpoint remains available at `http://localhost:3000/health`.

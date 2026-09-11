# Binance BTC/USDT Pair Metadata (M1.8)

## Scope

M1.8 loads one public BTC/USDT Spot metadata snapshot when the NestJS market-data module starts. It does not refresh or persist metadata, apply filters to orders, authenticate, access an account or wallet, or submit orders.

Official reference: [Binance Spot REST API](https://developers.binance.com/en/docs/products/spot/rest-api)

## Request

- Base URL: `https://data-api.binance.vision`
- Endpoint: `GET /api/v3/exchangeInfo?symbol=BTCUSDT`
- Configuration: `BINANCE_REST_BASE_URL`
- Authentication: none
- Timeout: 10 seconds

The public-data base URL is separate from the WebSocket configuration. A failed, non-success, or invalid response is logged and does not prevent the rest of the application from starting. Application shutdown aborts an in-flight request.

## Internal metadata

The normalized `MarketPairMetadata` contains:

- provider, normalized symbol, provider status, base asset, and quote asset
- `PRICE_FILTER`: minimum price, maximum price, and tick size
- `LOT_SIZE`: minimum quantity, maximum quantity, and step size
- minimum notional from either the `MIN_NOTIONAL` or `NOTIONAL` filter
- receipt time

All financial values remain decimal strings. Required identity fields, filters, and decimal shapes are validated before the payload reaches the domain.

## Operation

Start the stack and inspect the API logs:

```bash
docker compose up -d --build
docker compose logs api
```

Normalized metadata uses the event name `market.pair_metadata.received`. The health endpoint remains available at `http://localhost:3000/health`.

# Backtesting

M6.1 introduces a provider-neutral, deterministic strategy replay boundary. It accepts an already supplied sequence of normalized historical candles and evaluates the configured strategy once per candle.

## M6.1 replay contract

- Input is limited to closed `BTC/USDT` one-minute candles.
- Candles must have valid time boundaries and strictly increasing, unique close times.
- Each evaluation receives only the current candle and the bounded history available before it. Future candles are never exposed to the strategy.
- The history window follows the strategy's declared `requiredCandleCount`.
- `evaluatedAt` is the current candle close time, making repeated runs over identical input deterministic.
- The result contains the evaluated period, candle and signal totals, buy/sell/hold counts, and the ordered signal timeline.
- Empty input returns an empty result with null period boundaries.

The runner is an internal application service. M6.1 adds no HTTP route and does not fetch or persist historical market data.

## M6.2 public historical candle loading

M6.2 adds a provider-neutral historical-candle source and a Binance Spot implementation backed by public `GET /api/v3/klines`. It uses the existing `BINANCE_REST_BASE_URL`, requires no API key, and delegates normalized output directly to the M6.1 replay runner.

- Requests are fixed to `BTC/USDT` and `1m`.
- Start and end times are mandatory, ordered UTC timestamps.
- Limit is mandatory from 1 through 1,000, and one request may span at most 1,000 minutes.
- The client uses a ten-second timeout and supports caller cancellation.
- Every returned 12-field kline is validated at the Binance boundary.
- A response exceeding the requested limit, returning an out-of-range candle, or containing duplicate/out-of-order close times is rejected.
- Candles whose close time has not passed are discarded before replay.
- Only the strategy projection (close price, time boundaries, and closed state) crosses into the backtesting domain.

This follows Binance's official [Spot REST kline contract](https://github.com/binance/binance-spot-api-docs/blob/master/rest-api.md#klinecandlestick-data) and [market-data-only host guidance](https://github.com/binance/binance-spot-api-docs/blob/master/faqs/market_data_only.md).

## M6.3 complete historical candle model

M6.3 preserves each validated kline as a provider-neutral `HistoricalCandle` instead of discarding all fields except the strategy projection. The model retains OHLC prices, base and quote volumes, taker-buy volumes, trade count, close state, and UTC boundaries as exact strings and timestamps.

- Prices must be positive and volumes must be non-negative canonical decimals.
- High must be at least every other OHLC price; low must be at most every other OHLC price.
- Coherence checks use `decimal.js`; values never pass through native floating-point arithmetic.
- Arbitrary decimal precision is preserved exactly as received.
- Historical replay explicitly projects only symbol, interval, close price, boundaries, and close state into the strategy contract.
- The complete candle remains available to a future separately approved simulator, including a possible next-candle-open execution model.

## Safety and deferred scope

Replay produces signals only. It cannot access a wallet, the Risk Engine, an executor, exchange credentials, or real funds.

Trade simulation, next-candle execution, fills, fees, spread, slippage, minimum-order rules, PnL, ROI, drawdown, profit factor, expectancy, historical-data persistence, multi-request pagination, parameter optimization, and API exposure remain deferred and require separate approval.

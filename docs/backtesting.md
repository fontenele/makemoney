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

## Safety and deferred scope

Replay produces signals only. It cannot access a wallet, the Risk Engine, an executor, exchange credentials, or real funds.

Trade simulation, fills, fees, spread, slippage, minimum-order rules, PnL, ROI, drawdown, profit factor, expectancy, historical-data ingestion, persistence, parameter optimization, and API exposure remain deferred and require separate approval.

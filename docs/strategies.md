# Strategies

## M5.1 moving-average crossover

M5.1 introduces a provider-neutral strategy contract and one deterministic BTC/USDT strategy. A strategy consumes ordered one-minute candle projections and returns a signal; it cannot access the wallet, Risk Engine, or trading executor.

The moving-average crossover uses only candles whose `isClosed` value is true. With the initial default periods of 3 and 5, at least 6 closed candles are required so both the previous and current averages can be compared. Insufficient history returns `hold` with null averages.

- `buy`: the previous short average is at or below the previous long average and the current short average is above the current long average.
- `sell`: the previous short average is at or above the previous long average and the current short average is below the current long average.
- `hold`: neither crossover occurred.

Prices and averages use `decimal.js`; native floating-point monetary arithmetic is not used. Signals record the action, deterministic reason, periods, previous/current averages, evaluation time, and latest closed-candle time. Invalid periods, candle identity, timestamps, ordering, and closed-candle prices fail explicitly.

M5.1 does not subscribe to live candles, retain history, persist signals, size positions, execute orders, expose HTTP routes, backtest, or provide a dashboard. Those require separate increments.

## M5.2 live signal observation

The normalized market-data candle service publishes every received candle to a process-local, provider-neutral feed. Subscribers are isolated so one failing observer does not interrupt another or the Binance stream.

The live strategy evaluator subscribes during the NestJS module lifecycle and retains only the closed-candle count declared by the strategy. Open candles do not trigger evaluation. Duplicate or older close times are ignored with a structured diagnostic, preventing repeated signals after provider duplication or reordering.

Every accepted closed candle triggers one evaluation. The resulting action, reason, periods, averages, latest close time, and evaluation time are written as the structured `strategy.signal_generated` log event. Evaluation time uses the normalized candle receipt time.

This history and every signal are process-local and disappear on restart. M5.2 does not persist data, expose a route, size a position, call the Risk Engine, or submit an order.

## M5.3 latest-signal read model

Every successful live evaluation updates a process-local latest-signal read model. `GET /strategies/signals/latest` exposes that complete signal, including its action, deterministic reason, periods, averages, latest closed-candle time, and evaluation time.

Before the first closed candle is evaluated, the route returns HTTP 503 with reason `strategy_signal_unavailable`. The endpoint is read-only and does not evaluate a strategy on demand. The value disappears on restart and has no connection to position sizing, risk assessment, or execution.

## M5.4 configurable moving-average periods

`STRATEGY_MA_SHORT_PERIOD` and `STRATEGY_MA_LONG_PERIOD` configure the crossover at startup and default to 3 and 5. Both values must be positive integers no greater than 1,000, and the short period must be strictly smaller than the long period. Invalid combinations fail startup configuration validation.

The strategy declares `longPeriod + 1` as its required candle count, covering the current long average and its previous comparison. The live evaluator derives its bounded in-memory retention directly from this declaration. Signals and the latest-signal endpoint expose the effective configured periods.

Configuration changes require an application restart. There is no runtime mutation endpoint, hot reload, parameter persistence, or automatic parameter optimization.

## M5.5 recent signal history

Each successful live evaluation is recorded once in a shared process-local read model. It retains at most 100 signals, discarding the oldest when capacity is exceeded. `GET /strategies/signals` returns the retained signals newest first and accepts an optional integer `limit` from 1 through 100; the default is 50. Before the first evaluation it returns an empty list.

`GET /strategies/signals/latest` reads the same model and preserves its HTTP 503 unavailable state before the first evaluation. Both endpoints are read-only. The history disappears on restart and does not add signal persistence, filters, cursor pagination, statistics, position sizing, risk assessment, or execution.

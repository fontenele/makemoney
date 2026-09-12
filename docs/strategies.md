# Strategies

## M5.1 moving-average crossover

M5.1 introduces a provider-neutral strategy contract and one deterministic BTC/USDT strategy. A strategy consumes ordered one-minute candle projections and returns a signal; it cannot access the wallet, Risk Engine, or trading executor.

The moving-average crossover uses only candles whose `isClosed` value is true. With the initial default periods of 3 and 5, at least 6 closed candles are required so both the previous and current averages can be compared. Insufficient history returns `hold` with null averages.

- `buy`: the previous short average is at or below the previous long average and the current short average is above the current long average.
- `sell`: the previous short average is at or above the previous long average and the current short average is below the current long average.
- `hold`: neither crossover occurred.

Prices and averages use `decimal.js`; native floating-point monetary arithmetic is not used. Signals record the action, deterministic reason, periods, previous/current averages, evaluation time, and latest closed-candle time. Invalid periods, candle identity, timestamps, ordering, and closed-candle prices fail explicitly.

M5.1 does not subscribe to live candles, retain history, persist signals, size positions, execute orders, expose HTTP routes, backtest, or provide a dashboard. Those require separate increments.

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

## M6.4 deterministic long-only simulation

M6.4 adds an internal, historical-only simulator that consumes the replay timeline separately from the strategy. A non-hold signal generated at one candle close can create a hypothetical fill only at the next candle open. A terminal signal without another candle remains explicitly unfilled.

- The model holds at most one long BTC position.
- Buy while flat opens the position; sell while long closes it.
- Repeated buys while long and sells while flat are counted and ignored.
- BTC quantity and taker fee rate are explicit simulation inputs. Quantity must be positive; fee rate must be at least zero and below one.
- Entry and exit notional, fee, total entry cost, net exit proceeds, and each closed trade's net PnL use precision-40 `decimal.js` arithmetic.
- The ordered fill ledger records signal and fill times, making the causal delay inspectable.
- Any remaining position exposes its entry and fee-inclusive cost basis instead of being silently closed.
- Historical orchestration loads candles once and returns both the original replay and simulation result.

These are research-only hypothetical fills. They do not create an order, call an executor, mutate a wallet, use the operational Risk Engine, or access an exchange account.

## M6.5 aggregate realized performance

M6.5 adds a deterministic performance summary derived only from the M6.4 fill ledger and closed trades.

- Fill and closed-trade totals make the measurement population explicit.
- Profitable, losing, and break-even closed trades are counted from net PnL after entry and exit fees.
- Realized win rate is profitable closed trades divided by all closed trades, or `null` when no trade is closed.
- Gross profit sums positive net PnL; gross loss is the absolute sum of negative net PnL; realized net PnL sums every closed trade.
- Total fees include every hypothetical fill, including an entry fill belonging to an ending open position.
- All arithmetic uses precision-40 `decimal.js` and returns decimal strings.

The performance block does not value an open position and therefore does not imply unrealized PnL, equity, or return.

## M6.6 ending open-position valuation

M6.6 marks an ending open position at the close price and close time of the final supplied historical candle. The position remains open; valuation never appends a synthetic sell fill or closed trade.

- Gross market value is final close price multiplied by position quantity.
- Estimated exit fee applies the configured taker fee rate to gross market value.
- Net liquidation value is gross market value less the estimated exit fee.
- Unrealized net PnL is net liquidation value less the fee-inclusive entry cost basis.
- Total net PnL combines realized and unrealized net PnL; when the simulation ends flat, unrealized net PnL and ending valuation are `null`, while total net PnL equals realized net PnL.
- Every calculation uses precision-40 `decimal.js` and produces decimal strings.

This is a deterministic end-of-period research valuation based only on supplied historical data. It does not query a current external price.

## M6.7 closed-trade quality statistics

M6.7 derives additional statistics exclusively from closed-trade net PnL.

- Average net PnL per closed trade and expectancy are realized net PnL divided by all closed trades.
- Average profitable trade uses only positive outcomes; average losing trade is the absolute average magnitude of negative outcomes.
- Profit factor is gross profit divided by absolute gross loss.
- A metric is `null` when its required sample is empty or its denominator is zero. Profit factor is therefore `null` when no losing trade exists.
- Break-even trades participate in the overall average and expectancy but not the winning or losing averages.
- Ending open positions do not enter these closed-trade statistics.
- All results remain deterministic precision-40 decimal strings.

## M6.8 realized PnL curve and drawdown

M6.8 creates one chronological curve point for every closed trade at its exit time.

- Each point records trade net PnL, cumulative realized net PnL, the running realized peak, and absolute drawdown from that peak.
- The zero baseline participates as the initial peak, so a loss on the first closed trade is measurable.
- Maximum realized drawdown exposes its absolute USDT amount, start time, trough time, and recovery time when the prior peak is regained.
- An unrecovered drawdown has a `null` recovery time; no closed trades produce an empty curve and a zero maximum with null timestamps.
- Open-position and intraperiod unrealized results do not enter this realized-only curve.
- All arithmetic uses precision-40 `decimal.js`.

## Safety and deferred scope

Replay produces signals only. It cannot access a wallet, the Risk Engine, an executor, exchange credentials, or real funds.

Intraperiod equity curves, percentage drawdown, spread, slippage, liquidity, minimum-order and precision rules, variable sizing, Risk Engine modeling, ROI, historical-data persistence, multi-request pagination, parameter optimization, and API exposure remain deferred and require separate approval.

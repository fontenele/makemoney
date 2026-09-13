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

## M6.9 simulated capital and total ROI

M6.9 introduces an explicit positive initial USDT capital into the internal simulation configuration and maintains a deterministic cash balance.

- A buy debits its complete fee-inclusive entry cost and is not filled when available cash is insufficient.
- An unfilled insufficient-capital buy is counted separately from a redundant buy while already long.
- A sell credits its net proceeds after the simulated exit fee.
- Cash cannot become negative, and the fixed BTC quantity remains unchanged between trades.
- Final equity is final cash plus the ending position's net liquidation value, or final cash alone when flat.
- Total net return is final equity less initial capital; total ROI is that return divided by initial capital.
- Every capital value and ratio uses precision-40 `decimal.js` and is returned as a decimal string.

This capital ledger is local historical research state. It does not use or mutate the paper wallet.

## M6.10 candle-close equity curve and drawdown

M6.10 reconstructs the capital state from the hypothetical fill ledger and records one equity point at every historical candle close.

- Fills at a candle open update cash and BTC quantity before that candle's close is marked.
- Open BTC is valued at the close price less the configured estimated exit fee; a flat state has zero position value.
- Each point exposes mark time and price, cash, open quantity, net position value, equity, running peak, absolute drawdown, and drawdown rate.
- Initial capital is the first peak, allowing the first marked loss to produce a drawdown.
- Maximum absolute and maximum percentage drawdowns are retained separately because they need not occur at the same trough.
- Each maximum exposes its amount, rate, start, trough, and recovery when its prior peak is regained.
- The last equity point reconciles exactly with the M6.9 final equity.
- All arithmetic uses precision-40 `decimal.js`.

## M6.11 deterministic spread and slippage

M6.11 makes the next-candle-open execution assumption more conservative through two explicit non-negative simulation inputs: the full spread rate and the adverse slippage rate.

- Each fill retains the candle open as `referencePrice` and exposes the adjusted executable value as `price`.
- A buy price is the reference price multiplied by `1 + spreadRate / 2 + slippageRate`.
- A sell price is the reference price multiplied by `1 - spreadRate / 2 - slippageRate`.
- Rates must each be below one, and their combined adverse price impact must remain below one so sell prices stay positive.
- Fees and notionals use the adjusted price. Buy affordability, cash, closed-trade PnL, ending capital, ROI, and equity therefore inherit the modeled costs without parallel accounting.
- Zero spread and slippage preserve the preceding execution behavior.
- All arithmetic uses precision-40 `decimal.js` and produces decimal strings.

## M6.12 time and exposure metrics

M6.12 derives deterministic time-based measurements from the historical period and the existing immutable trade ledger.

- The tested period starts at the first candle open and ends at the final candle close.
- Each closed trade records entry-to-exit holding duration in milliseconds.
- Total time in market sums every closed holding interval and, when present, the ending open position from entry through the final candle close.
- Exposure rate divides total time in market by tested-period duration using precision-40 decimal arithmetic.
- Average closed-trade holding duration includes only closed trades and remains a decimal string so fractional averages are not rounded away.
- Empty input exposes null period boundaries, zero durations, and null ratios. A zero-duration supplied period also has a null exposure rate.
- The calculator rejects negative, unsafe, or collectively impossible time intervals.

## M6.13 quantity and minimum-order constraints

M6.13 requires each historical simulation to carry a provider-neutral execution-rule snapshot rather than consulting current exchange metadata during replay.

- Minimum quantity, maximum quantity, step size, and minimum notional are mandatory positive decimal strings.
- The fixed simulation quantity must remain within the inclusive range and divide exactly by the step size; invalid configuration fails before any financial state is created.
- Every potential buy and sell checks its effective-price notional against the configured minimum before becoming a fill.
- A below-minimum buy leaves cash and position unchanged. A below-minimum sell leaves the existing position open so a later valid sell signal may still close it.
- Rejections share an explicit `minimumNotionalUnfilledSignalCount` and never enter fill, performance, equity, or exposure ledgers.
- Rules are returned with the simulation result, making the research assumption reproducible and inspectable.
- Validation and comparisons use precision-40 `decimal.js`; quantity is never silently rounded.

## M6.14 price precision

M6.14 adds mandatory positive tick size to the historical execution-rule snapshot and quantizes every post-impact price before creating a fill.

- Each potential fill retains the candle-open `referencePrice`, post-spread/slippage `adjustedPrice`, and tick-aligned executable `price`.
- Buy prices round upward to the next tick and sell prices round downward, preserving a conservative adverse assumption on both sides.
- Prices already aligned to the tick remain unchanged.
- Notional, fee, affordability, minimum-notional checks, capital, PnL, ROI, and equity use only the final executable price.
- A sell whose downward rounding reaches zero remains unfilled, preserves the position, and increments `pricePrecisionUnfilledSignalCount`.
- Tick validation and quantization use precision-40 `decimal.js`; no native floating-point financial arithmetic is introduced.

## M6.15 executable price range

M6.15 completes the provider-neutral historical price-filter snapshot with mandatory positive minimum and maximum prices.

- Minimum price must not exceed maximum price; incoherent configuration fails before simulation state is created.
- The final tick-aligned executable price is checked against both inclusive boundaries.
- A buy outside the range leaves cash unchanged. A sell outside the range preserves the existing position so a later valid signal may close it.
- Rejected potential fills increment `priceRangeUnfilledSignalCount` and do not enter fill, performance, equity, or exposure ledgers.
- Price-range approval precedes minimum-notional validation, keeping rejection categories deterministic and mutually ordered.
- The normalized range is returned with the complete execution-rule snapshot and comparisons use precision-40 `decimal.js`.

## M6.16 causal volume participation

M6.16 adds a required maximum volume-participation rate greater than zero and no greater than one. Each hypothetical fill is all-or-none and uses only information available when its signal was produced.

- Maximum fill quantity equals the fully closed signal candle's `baseVolume` multiplied by the configured participation rate.
- The following execution candle supplies the opening reference price but its volume is never inspected, preventing lookahead.
- Equality at the calculated limit is accepted; positive fixed quantity against zero reference volume is rejected.
- A rejected buy preserves cash and a rejected sell preserves the open position so a later signal may still close it.
- Rejections increment `liquidityUnfilledSignalCount` and do not enter fill, performance, equity, or exposure ledgers.
- Accepted fills retain `liquidityReferenceCandleCloseTime`, `liquidityReferenceBaseVolume`, and `maximumLiquidityFillQuantity` for audit.
- Validation and multiplication use precision-40 `decimal.js`; no partial fill or variable sizing is inferred.

## Safety and deferred scope

Replay produces signals only. It cannot access a wallet, the Risk Engine, an executor, exchange credentials, or real funds.

Intracandle equity paths, order-book/depth liquidity, partial fills, variable sizing or reinvestment, Risk Engine modeling, historical-data persistence, multi-request pagination, risk-adjusted or annualized metrics, parameter optimization, and API exposure remain deferred and require separate approval.

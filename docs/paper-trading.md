# Paper Trading

## M3.1 paper market buy quote

M3.1 calculates an internal, non-executing BTC/USDT market-buy quote. It does not change balances, create an order, or expose an HTTP route.

The requested BTC quantity is priced at the latest normalized best ask. The quote includes quantity, price, notional, configured taker fee rate, fee, total USDT cost, quote time, and market-data receipt time. All financial values are canonical decimal strings calculated with `decimal.js` precision 40 and half-even rounding.

Configuration:

- `PAPER_TAKER_FEE_RATE` defaults to `0.001` (0.1%) and represents a simulation assumption, not a dynamically fetched account fee.
- `PAPER_QUOTE_MAX_MARKET_DATA_AGE_MS` defaults to `10000` milliseconds.

Quotes require available normalized top-of-book data and pair metadata, fresh top-of-book data, `TRADING` pair status, valid quantity range and step size, minimum notional, and enough quantity at the best ask. A rejected quote never changes wallet state.

## M3.2 idempotent paper buy execution

M3.2 introduces a shared `TradingExecutor` contract and its only implementation, `PaperTradingExecutor`. The internal intent accepts a caller-generated idempotency key, the fixed `BTC/USDT` symbol, the `buy` side, and BTC quantity. It regenerates the M3.1 quote at execution time.

One PostgreSQL transaction conditionally debits the full USDT cost (notional plus fee), credits BTC, and inserts the immutable execution record. Insufficient USDT or a missing balance row rolls back every change. Reusing an idempotency key returns the original persisted execution with `replayed: true`; it never applies the balance changes twice, including concurrent duplicate attempts.

Persisted quantities and monetary amounts use `DECIMAL(38,18)`. Quote inputs therefore accept at most 18 fractional digits, and calculated notional, fee, and total cost use half-even rounding to that scale. Successful executions and replays emit structured logs.

There is deliberately no HTTP mutation route. Positions, realized or unrealized PnL, multi-level slippage, strategies, the Risk Engine, authenticated providers, and real trading remain deferred.

## M3.3 paper market sell quote

M3.3 calculates an internal, non-executing BTC/USDT market-sell quote at the latest normalized best bid. It returns BTC quantity, price, gross USDT notional, configured taker fee, net USDT proceeds, quote time, and market-data receipt time.

The quote applies the same availability, freshness, `TRADING` status, quantity range, step-size, minimum-notional, and top-level liquidity rules as buy quoting, using bid-side price and quantity. Values accept at most 18 fractional digits and monetary results use half-even rounding to the persistence scale.

The quote itself does not inspect or mutate the BTC balance. M3.4 consumes it when executing an approved internal sell intent.

## M3.4 idempotent paper sell execution

M3.4 extends the shared `TradingExecutor` with a discriminated buy/sell intent and execution result. A sell regenerates its M3.3 quote at execution time, then performs a sufficient-BTC debit, net-USDT credit, and immutable execution insert in one PostgreSQL transaction.

The execution table accepts both sides. Existing buys retain `totalCost`; sells store `netProceeds`. A database constraint requires exactly the settlement field appropriate to the side. Reusing an idempotency key returns the original execution and never mutates balances twice, including concurrent duplicate attempts.

Insufficient BTC and missing balance rows roll back the full transaction. Successful sells and replays emit structured logs. Order mutation routes, positions, PnL, strategies, and real trading remain deferred.

## M3.5 recent execution history

`GET /paper-trading/executions` exposes a read-only audit view of persisted buys and sells, newest first. It returns 50 records by default and accepts an integer `limit` from 1 through 100. Invalid limits return HTTP 400.

Buy records contain `totalCost`; sell records contain `netProceeds`. Financial values remain canonical decimal strings, and quote, market-data receipt, and execution timestamps serialize as ISO UTC values. The history result sets `replayed` to `false` because replay is a property of an execution call, not of the persisted event.

This increment does not expose execution, mutation, deletion, cursor pagination, positions, or PnL.

## M3.6 position and realized PnL

`GET /paper-trading/position` folds the complete execution history in chronological order into a BTC position. Buys add their fee-inclusive `totalCost` to cost basis. Sells allocate weighted-average cost proportionally and add `netProceeds - allocatedCost` to realized PnL.

The response contains tracked BTC `quantity`, remaining `costBasis`, `averageEntryPrice`, cumulative `realizedPnl`, and `totalFees`. All calculations use `decimal.js`, 40-digit working precision, 18-decimal half-even rounding, and canonical decimal strings. A fully closed position has zero cost basis and a null average entry price.

The read model rejects histories where a sell exceeds prior execution-tracked purchases. Wallet BTC created outside paper executions is intentionally not assigned an invented acquisition cost. This implementation reads all executions on demand; persistence and incremental aggregation are deferred until scale requires them.

Unrealized PnL, current market value, ROI, win rate, order mutation routes, and strategies remain deferred.

## M3.7 unrealized and total PnL

For an open position, `GET /paper-trading/position` uses the latest fresh normalized best bid as its mark price. Gross market value is quantity multiplied by that bid. An estimated exit fee uses the configured simulated taker-fee rate, and net liquidation value is gross value minus that fee. Unrealized PnL is net liquidation value minus the fee-inclusive remaining cost basis; total PnL is realized plus unrealized PnL.

The response also exposes the market-data receipt timestamp used for the calculation. An empty position returns null market data and zero current-value fields without requiring a live book. An open position returns HTTP 503 when top-of-book data is unavailable or older than `PAPER_QUOTE_MAX_MARKET_DATA_AGE_MS`.

This remains a level-one estimate. It does not verify that the full position fits at the displayed bid and does not model multi-level slippage. ROI, win rate, order mutation routes, strategies, and real trading remain deferred.

## M3.8 realized performance summary

`GET /paper-trading/performance` folds the complete execution history through the same accounting calculation used by the position endpoint. It returns total, buy, and sell execution counts; profitable, losing, and break-even sell counts; realized win rate; realized PnL; and accumulated execution fees.

Each sell outcome uses its net proceeds after exit fee minus its allocated fee-inclusive weighted-average cost. Win rate is a decimal ratio of profitable sells to profitable plus losing sells. Break-even sells are reported but excluded from that denominator; win rate is null when there are no profitable or losing sells.

The summary is realized-only and requires no current market data. A sell execution is the current outcome unit, including partial sells. ROI, daily/period grouping, drawdown, profit factor, expectancy, order mutation routes, and strategies remain deferred.

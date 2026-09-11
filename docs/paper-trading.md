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

There is deliberately no HTTP mutation route. Sell execution, positions, realized or unrealized PnL, history queries, multi-level slippage, strategies, the Risk Engine, authenticated providers, and real trading remain deferred.

## M3.3 paper market sell quote

M3.3 calculates an internal, non-executing BTC/USDT market-sell quote at the latest normalized best bid. It returns BTC quantity, price, gross USDT notional, configured taker fee, net USDT proceeds, quote time, and market-data receipt time.

The quote applies the same availability, freshness, `TRADING` status, quantity range, step-size, minimum-notional, and top-level liquidity rules as buy quoting, using bid-side price and quantity. Values accept at most 18 fractional digits and monetary results use half-even rounding to the persistence scale.

The quote does not inspect or mutate the BTC balance. Sell execution, persistence, public routes, positions, PnL, and deeper order-book slippage remain deferred.

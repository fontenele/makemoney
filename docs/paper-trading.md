# Paper Trading

## M3.1 paper market buy quote

M3.1 calculates an internal, non-executing BTC/USDT market-buy quote. It does not change balances, create an order, or expose an HTTP route.

The requested BTC quantity is priced at the latest normalized best ask. The quote includes quantity, price, notional, configured taker fee rate, fee, total USDT cost, quote time, and market-data receipt time. All financial values are canonical decimal strings calculated with `decimal.js` precision 40 and half-even rounding.

Configuration:

- `PAPER_TAKER_FEE_RATE` defaults to `0.001` (0.1%) and represents a simulation assumption, not a dynamically fetched account fee.
- `PAPER_QUOTE_MAX_MARKET_DATA_AGE_MS` defaults to `10000` milliseconds.

Quotes require available normalized top-of-book data and pair metadata, fresh top-of-book data, `TRADING` pair status, valid quantity range and step size, minimum notional, and enough quantity at the best ask. A rejected quote never changes wallet state.

Execution, wallet mutation, sells, multi-level slippage, order history, PnL, HTTP order routes, strategies, and real trading remain deferred.

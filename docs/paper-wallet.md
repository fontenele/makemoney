# Paper Wallet

M2.1 introduces a fictional, in-memory wallet for the `BTC` and `USDT` assets. It never connects to an exchange account, holds no credentials, and cannot submit orders.

## Configuration

- `PAPER_INITIAL_USDT_BALANCE` sets the initial USDT balance and defaults to `1000`.
- The initial BTC balance is `0`.
- Configuration accepts only plain, non-negative decimal strings. Exponential notation is rejected.

## Domain behavior

- Balances and mutation amounts cross the API as decimal strings.
- Arithmetic uses a local `decimal.js` constructor with precision 40 and half-even rounding.
- `getBalance` and `getBalances` return the current in-memory state.
- `credit` and `debit` accept strictly positive amounts.
- A debit larger than the available balance is rejected without mutating state.
- Only `BTC` and `USDT` are supported.

The wallet is recreated from configuration whenever the application starts. There is no database persistence or HTTP endpoint in M2.1.

## Observability

Startup emits `paper_wallet.initialized`. Successful mutations emit `paper_wallet.balance_changed` with the operation, asset, amount, and resulting balance.

## Deferred scope

Portfolio valuation, BRL conversion, fees, spread, slippage, PnL, orders, execution, persistence, additional assets, and dashboard exposure require later approved increments.

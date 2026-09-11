# Paper Wallet

M2.1 introduces a fictional, in-memory wallet for the `BTC` and `USDT` assets. M2.2 adds valuation in USDT from the latest normalized BTC/USDT ticker. Neither increment connects to an exchange account, holds credentials, or submits orders.

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

## Portfolio valuation

M2.2 retains the latest normalized BTC/USDT ticker in process memory and calculates:

```text
btcValue = btcBalance × btcPrice
totalValue = usdtBalance + btcValue
```

The result contains the BTC balance and value, USDT balance, BTC price, total USDT value, and ticker event time. All financial fields are decimal strings and calculations use `decimal.js`. Valuation fails explicitly until the first ticker is available and rejects non-positive or malformed prices.

## Observability

Startup emits `paper_wallet.initialized`. Successful mutations emit `paper_wallet.balance_changed` with the operation, asset, amount, and resulting balance.

## Deferred scope

BRL conversion, stale-price policy, fees, spread, slippage, PnL, orders, execution, persistence, additional assets, and dashboard exposure require later approved increments.

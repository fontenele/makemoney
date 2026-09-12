# Risk Engine

## M4.1 maximum order notional

Every new internal paper execution is quoted first and then assessed by the provider-neutral `RiskEngine` before the repository can mutate balances or persist an execution. Idempotent replays return their already-approved persisted result and do not represent a new order attempt.

`RISK_MAX_ORDER_NOTIONAL_USDT` is a positive decimal string and defaults to `100`. The first rule approves buy and sell candidates whose quoted gross notional is less than or equal to the limit and rejects larger candidates with `max_order_notional_exceeded`.

Each assessment produces a structured log containing the candidate ID, symbol, side, quantity, decision, rule, quoted notional, and configured limit. A rejection raises an application error before transaction access, so it cannot change paper balances or create an execution.

M4.1 does not expose an order route and does not add position, exposure, daily-loss, liquidity, stop-loss, strategy, authenticated-provider, or real-trading rules.

## M4.2 emergency stop

`RISK_EMERGENCY_STOP` is a validated boolean and defaults to `false`. When true, the Risk Engine rejects every new buy or sell candidate with rule `emergency_stop` and reason `emergency_stop_active`.

The emergency-stop rule has precedence over candidate validation and maximum-notional assessment, allowing it to fail closed without depending on other order details. The rejection follows the existing pre-transaction path, so it cannot mutate balances or persist an execution. Idempotent replays remain available because they return an already-persisted result without creating a new financial effect.

M4.2 provides configuration-based process startup/runtime behavior only. It does not expose a control endpoint or persist stop state, and it does not enable any form of real trading.

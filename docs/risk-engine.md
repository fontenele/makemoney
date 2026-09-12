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

## M4.3 cumulative BTC position quantity

`RISK_MAX_BTC_POSITION_QUANTITY` is a positive decimal string and defaults to `0.01`. For each new buy, the executor reads the persisted BTC paper balance and supplies it to the provider-neutral risk candidate. The Risk Engine calculates `current BTC + quoted buy quantity` with exact decimal arithmetic and rejects a projected position above the configured limit with rule `max_btc_position_quantity` and reason `max_btc_position_quantity_exceeded`.

The limit boundary is inclusive. Sells bypass this rule because they reduce BTC exposure, while remaining subject to the emergency stop and maximum-order-notional rule. Rule precedence is emergency stop, maximum order notional, then cumulative BTC position. Rejections occur before execution persistence or balance mutation, and idempotent replays remain exempt because they create no new effect.

The application-level balance read and risk assessment remain useful for early rejection and structured decisions. M4.4 adds the transaction-level guarantee required for concurrent attempts.

## M4.4 atomic BTC exposure enforcement

Every buy still passes through the Risk Engine. As a defense in depth, the PostgreSQL transaction also applies `RISK_MAX_BTC_POSITION_QUANTITY` directly in the conditional BTC balance update. PostgreSQL's row locking serializes competing updates, and the update succeeds only when the resulting balance is within the inclusive limit.

If the condition fails, `PaperPositionLimitExceededError` aborts the transaction. The execution insert and USDT debit are rolled back together, leaving no partial financial effect. A database-backed concurrency test submits two buys for the same remaining capacity and verifies that exactly one execution and one balance mutation survive.

No schema migration, external mutation endpoint, loss rule, strategy, authenticated provider, or real trading is introduced.

## M4.5 daily realized loss limit

`RISK_MAX_DAILY_REALIZED_LOSS_USDT` is a positive decimal string and defaults to `25`. Before assessing a new buy, the executor reconstructs fee-inclusive cost basis from the complete chronological execution history and nets realized PnL from sells executed during the current UTC calendar day. Exact `decimal.js` arithmetic is used throughout.

A buy is rejected with rule `max_daily_realized_loss_usdt` and reason `max_daily_realized_loss_reached` when daily realized PnL is less than or equal to the negative configured limit. Profitable sells offset losing sells within that day. A new UTC day starts at zero while older executions remain available to reconstruct cost basis correctly.

Sells remain available because they reduce exposure and may close a position. Persisted idempotent replays also remain available because they create no new effect. Rule precedence is emergency stop, maximum order notional, daily realized loss, then cumulative BTC position.

The application-level daily PnL snapshot remains useful for early, explainable rejection. M4.6 adds the transaction-level concurrency guarantee.

## M4.6 atomic daily realized-loss enforcement

Every paper buy and sell transaction acquires the same PostgreSQL transaction-scoped advisory lock before inserting an execution or mutating balances. This establishes one database serialization order for financial effects without adding a table or migration.

After acquiring the lock, a buy reloads the complete chronological execution history and recalculates the current UTC day's net realized PnL using the M4.5 accounting rule. If the inclusive configured loss threshold is already reached, `PaperDailyLossLimitReachedError` aborts the transaction before the execution insert or either balance update. A sell remains permitted, but its committed outcome is necessarily visible to the next serialized buy.

The provider-neutral Risk Engine remains the first assessment boundary and idempotent replays remain outside new financial effects. A database-backed concurrency test holds the advisory lock, queues a losing sell before a buy, then verifies the sell commits and the buy is rejected without mutation.

The lock is intentionally process-independent but global to the current paper-execution workload. Per-portfolio locking, persistent operator controls, unrealized-loss/drawdown rules, stop-loss behavior, strategies, authenticated providers, and real trading remain deferred.

## M4.7 persistent local emergency-stop control

Emergency-stop changes are stored as immutable `risk_control_events`. Each event contains a caller-supplied idempotency key, the active state, a required operational reason, and a database timestamp. The latest event by timestamp and ID is loaded on startup and takes precedence over `RISK_EMERGENCY_STOP`; configuration is used only when no persisted event exists.

`GET /risk/emergency-stop` returns the current state and its source. `PUT /risk/emergency-stop` requires an `Idempotency-Key` header plus `{ "active": boolean, "reason": string }`. Repeating the same key and payload returns the original event with `replayed: true`; reusing the key for a different change returns HTTP 409. Invalid keys or bodies return HTTP 400.

The in-memory state gives the synchronous Risk Engine an immediately available highest-precedence decision after persistence succeeds. Activating the stop rejects all new paper buys and sells before candidate validation or financial mutation. Existing execution replays remain available.

These endpoints control only the local paper executor. They do not provide remote authentication, authorization, real-trading safeguards, an order endpoint, or a dashboard.

## M4.8 top-of-book participation limit

`RISK_MAX_TOP_OF_BOOK_PARTICIPATION_RATE` is a positive decimal no greater than one and defaults to `0.10`. Buy quotes carry the best-ask quantity and sell quotes carry the best-bid quantity from the same fresh provider-neutral snapshot used for pricing.

For every new order, the Risk Engine calculates `order quantity / available top-of-book quantity` with exact `decimal.js` arithmetic. The configured boundary is inclusive. A larger share is rejected with rule `max_top_of_book_participation_rate` and reason `top_of_book_participation_exceeded` before repository access or balance mutation.

Rule precedence is emergency stop, maximum order notional, top-of-book participation, daily realized loss for buys, then cumulative BTC position for buys. The earlier quote-level check still rejects quantities above all displayed liquidity; M4.8 adds a conservative participation buffer for both sides.

This rule uses only level-one displayed liquidity. Multi-level depth, market impact, partial fills, and deeper slippage modeling remain deferred.

## M4.9 authenticated local risk control

The Compose API port is bound to `127.0.0.1:3000`, preventing Docker from publishing it on every host interface. `GET /risk/emergency-stop` remains read-only, while `PUT /risk/emergency-stop` additionally requires `Authorization: Bearer <token>`.

The application configuration accepts only `RISK_CONTROL_TOKEN_SHA256`, a 64-character hexadecimal SHA-256 digest. The raw token is supplied only by the caller, hashed in memory, compared with `timingSafeEqual`, and never stored, returned, or logged. `.env.example` contains no credential or usable digest.

When the digest is absent, HTTP writes fail closed with 503. A missing, malformed, or incorrect Bearer token returns 401. Authentication runs before idempotency/body handling, while the M4.7 persistence and audit behavior remains unchanged after successful authentication.

This is defense for a local paper-only control surface. It is not user management, remote authorization, rate limiting, or one of the complete multi-party safeguards required before any future real trading.

## M4.10 unrealized loss limit

`RISK_MAX_UNREALIZED_LOSS_USDT` is a positive decimal string and defaults to `25`. Before assessing a new paper buy, the executor obtains the existing execution-tracked BTC position through the same valuation used by `GET /paper-trading/position`: fresh best bid, simulated exit fee, and fee-inclusive remaining cost basis. Exact decimal arithmetic produces net unrealized PnL.

When that PnL is less than or equal to the negative configured limit, the Risk Engine rejects the buy with rule `max_unrealized_loss_usdt` and reason `max_unrealized_loss_reached`. An empty, profitable, or smaller-loss position remains eligible for the later rules. Sells and persisted idempotent replays remain available because they reduce exposure or create no new financial effect.

Rule precedence is emergency stop, maximum order notional, top-of-book participation, daily realized loss, unrealized loss, then cumulative BTC position. An open position without fresh market data fails before risk approval and before persistence. This is a current-snapshot entry guard, not a persistent drawdown metric, automatic stop-loss, liquidation mechanism, or transaction-level guarantee against market-price movement.

## M4.11 approved execution rate limit

`RISK_MAX_EXECUTIONS_PER_WINDOW` is a positive integer defaulting to `10`, and `RISK_EXECUTION_WINDOW_MS` is a positive integer defaulting to `60000`. After all existing synchronous risk rules approve a new buy or sell, the executor must obtain a Redis-backed permit before entering the PostgreSQL execution transaction.

A single Lua script atomically tracks distinct idempotency keys in an expiring Redis hash. The first permitted key starts the fixed window. Up to the inclusive configured count is allowed; a new key above the limit raises `ExecutionRateLimitExceededError` with the current count, limit, and remaining window time. A concurrent repeat of an already-counted key does not consume a second slot, and a persisted replay bypasses quoting, risk assessment, and rate limiting entirely.

Redis is appropriate because the window is ephemeral safety state, not a permanent financial record. Redis errors or malformed script responses raise `ExecutionRateLimiterUnavailableError` and fail closed before balance or execution mutation. A permit can be consumed even if later PostgreSQL execution fails; this conservative behavior avoids opening retry bursts. This does not add an HTTP order route, distributed portfolio identities, strategies, or real execution.

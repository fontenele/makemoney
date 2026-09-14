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
- Total limit is mandatory from 1 through 10,000, and one request may span at most 10,000 minutes.
- The Binance adapter retrieves sequential pages of at most 1,000 candles and advances from the last accepted candle's next one-minute open time.
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

## M6.17 bounded historical pagination

M6.17 expands one provider-neutral historical request to at most 10,000 BTC/USDT one-minute candles while preserving Binance's 1,000-row page boundary.

- Each page is requested sequentially with its own maximum of 1,000 rows and the remaining total limit.
- The next page begins exactly one minute after the last accepted open time, guaranteeing deterministic forward progress.
- Empty and partial pages terminate retrieval instead of repeating or inventing data.
- Existing strict payload, range, OHLCV, ordering, open-candle, timeout, and caller-cancellation validation applies independently to every page.
- The accumulated result never exceeds the caller's total limit and reaches replay only after pagination completes.
- No persistence, cache, retry/rate-limit policy, new interval, symbol, or HTTP route is introduced.

## M6.18 bounded historical retry

M6.18 makes each sequential Binance page tolerant of transient availability failures without making historical loading unbounded.

- A page receives at most three total HTTP attempts.
- Network failures, HTTP 429, and HTTP 5xx are retryable; other HTTP 4xx responses fail immediately.
- Default waits grow from 500 milliseconds to one second between the three attempts.
- A valid delta-seconds or HTTP-date `Retry-After` value replaces the default delay and is capped at 30 seconds.
- Retry waiting receives the caller's abort signal, so cancellation stops both an in-flight request and a pending delay.
- Every attempt receives its own ten-second request timeout.
- Successful malformed payloads still fail validation immediately and are never treated as transient transport failures.
- Retry state is isolated per page; pagination remains sequential and already accepted pages are not requested again.

## M6.19 process-local historical circuit breaker

M6.19 prevents repeated historical Binance calls after the provider has remained unavailable through complete page-level retry cycles.

- Three transient page failures that exhaust all M6.18 attempts open the circuit.
- While open, requests fail before HTTP for 30 seconds.
- At the cooldown boundary, only one concurrent half-open page probe may call the provider; other callers continue to fail fast.
- A successful probe closes the circuit and clears the failure count. An exhausted probe reopens it for a new 30-second interval.
- Any successful page also resets prior consecutive transient-page failures while the circuit is closed.
- Caller cancellation, invalid local requests, permanent HTTP 4xx responses other than 429, and malformed successful payloads neither open nor advance the circuit.
- Circuit state is process-local to the historical Binance client and uses the existing injected clock for deterministic boundaries.

## M6.20 durable historical candle write-through

M6.20 persists a successfully loaded historical batch in PostgreSQL before allowing deterministic replay or simulation to consume it.

- `historical_candles` uses symbol, interval, and open time as its composite primary identity and chronological index.
- Only normalized closed `BTC/USDT` one-minute candles cross the repository boundary.
- OHLC and volume decimals remain their exact validated strings in `TEXT` columns, avoiding fixed-scale truncation or native floating-point conversion.
- Trade count uses a non-negative PostgreSQL `BIGINT`; UTC boundaries retain millisecond precision.
- Batch persistence runs in a serializable transaction, inserts missing identities, then reloads and compares every requested field before commit.
- Repeating identical candles is idempotent. Any existing identity with different content raises an explicit conflict and rolls back new rows from the same batch.
- Persistence failure stops replay and simulation; neither result is produced from a batch that failed durable storage.
- Replay still consumes the freshly loaded validated batch. Stored-range reads, completeness inference, gap filling, and offline operation are not introduced.

## M6.21 explicit stored-only replay

M6.21 adds separate internal replay and simulation methods whose only candle source is PostgreSQL.

- The repository accepts the same bounded BTC/USDT one-minute range and limit contract used by remote historical loading.
- Rows are queried by inclusive open-time boundaries, ordered ascending, and capped at the caller's limit.
- Every row is revalidated for supported identity, closed state, safe trade count, time ordering, canonical decimal syntax, positive coherent OHLC, and non-negative volumes.
- Exact textual decimals map back to the provider-neutral `HistoricalCandle` without numeric conversion.
- `runStored` and `runStoredSimulation` never call the Binance provider and do not perform another write-through.
- Missing rows and time gaps are neither invented nor fetched. Replay uses the ordered subset actually returned, and its period/count fields describe that observed subset.
- Remote write-through methods remain unchanged and explicit; no automatic source selection is introduced.

## M6.22 automatic complete-range cache reuse

M6.22 makes the standard historical replay and simulation paths cache-first without combining partial sources.

- The expected sequence begins at the first epoch-aligned one-minute open at or after `startTime`, ends no later than the inclusive `endTime`, and is capped by the request limit.
- A stored range is complete only when its count and every chronological open time exactly match that sequence.
- A complete cache hit bypasses both Binance and another persistence write.
- Any missing, displaced, or incomplete minute causes the existing full request to load from Binance and persist before replay.
- Invalid persisted rows still fail at the repository boundary and are never hidden by remote fallback.
- Explicit `runStored` operations remain stored-only and continue to replay the actual stored subset without completeness inference.
- Partial gap downloads, stored/remote merging, refresh or expiry policy, a new route, and schema changes are not introduced.

## M6.23 sequential historical gap filling

M6.23 narrows a cache miss to the exact missing portions of the expected one-minute sequence.

- Missing minute identities are grouped into maximal contiguous bounded requests.
- Gap requests run sequentially through the existing Binance pagination, retry, cancellation, and circuit-breaker behavior.
- Stored candles and fetched gaps are merged chronologically without duplicate identities.
- The merged result must prove exact complete coverage before persistence or replay; incomplete provider results fail explicitly.
- All fetched gap candles are persisted together through one existing transactional `saveMany` call after coverage succeeds.
- A complete cache hit still performs no network call or write, while explicit stored-only methods retain their prior behavior.
- Stored candle refresh, conflict overwrite, parallel gap requests, new symbols or intervals, routes, and schema changes are not introduced.

## M6.24 local historical replay API

M6.24 exposes the signal-only historical replay through `POST /backtesting/replay`.

- The JSON body accepts exactly `startTime`, `endTime`, and `limit`; unknown fields are rejected.
- Timestamps must be canonical millisecond-precision ISO 8601 UTC strings, ordered within 10,000 minutes.
- `limit` is an integer from 1 through 10,000. Symbol and interval remain fixed internally to `BTC/USDT` and `1m`.
- Valid requests use the complete cache and sequential gap-loading behavior established through M6.23.
- The route returns HTTP 200 with the deterministic signal timeline and counts, HTTP 400 for invalid input, and HTTP 503 without leaking internal provider or persistence details when replay is unavailable.
- The endpoint may persist public historical candles as cache data but cannot access a wallet, order executor, Risk Engine, exchange account, or real funds.
- Financial simulation configuration and results remain internal and are not exposed by this route.

## M6.25 local historical simulation API

M6.25 exposes the complete research-only simulation through `POST /backtesting/simulate`.

- The top-level request contains exactly the M6.24 UTC range and limit fields plus `configuration`.
- Configuration requires exactly fixed quantity, fee rate, full spread rate, slippage rate, maximum volume-participation rate, initial fictional USDT capital, and the complete execution-rule snapshot.
- Execution rules require minimum and maximum quantity, step size, minimum notional, tick size, and minimum and maximum price as decimal strings.
- A dedicated validator checks shape, unknown fields, bounded decimal-string length and grammar, positivity and rate bounds, combined adverse price impact, quantity ranges, and step alignment before any candle lookup or Binance request.
- Valid requests reuse the same cache and sequential gap loading and return replay, hypothetical fills and trades, performance, ending valuation, capital, ROI, equity and drawdowns, time metrics, and unfilled-signal accounting.
- HTTP 400 represents invalid public input. Operational loading or persistence failure returns a sanitized HTTP 503.
- The route does not persist simulation results and cannot access the paper wallet, operational Risk Engine, executor, exchange account, or real funds.

## M6.26 immutable persisted simulation runs

M6.26 adds `POST /backtesting/runs` as the explicit durable counterpart to the unchanged ephemeral simulation route.

- The route requires a validated `Idempotency-Key` and the exact M6.25 body.
- A SHA-256 fingerprint covers the normalized historical request and complete explicit configuration.
- An existing matching key returns its stored request/result without candle loading or recalculation and marks `replayed: true`; different content returns HTTP 409.
- New runs calculate first and persist the complete JSON-safe request and result with a UUID and UTC creation time. Dates become ISO UTC strings and financial decimals remain strings.
- PostgreSQL enforces unique idempotency keys; a concurrent matching insert resolves to the winner, while conflicting reuse fails explicitly.
- Persistence failure returns no saved-run response. Runs are immutable and have no update or delete operation.
- Retrieval and bounded listing are not introduced yet.

## M6.27 immutable run retrieval

M6.27 adds read-only `GET /backtesting/runs/:id` for one previously persisted simulation snapshot.

- The path identity must be a canonical-shape UUID; malformed values fail before repository access.
- A successful response contains only `id`, `createdAt`, `request`, and `result`; internal idempotency and fingerprint fields remain private.
- Retrieval reads PostgreSQL directly and never recalculates, loads candles, contacts Binance, or mutates the stored artifact.
- Missing runs return HTTP 404, invalid UUIDs return HTTP 400, and operational database failures return a sanitized HTTP 503.
- Listing, pagination, filtering, update, and deletion are not introduced.

## M6.28 bounded recent run listing

M6.28 adds read-only `GET /backtesting/runs` for recent persisted simulation snapshots.

- The optional `limit` query parameter is a canonical positive integer from 1 through 100 and defaults to 50.
- Results are ordered by creation time descending and UUID descending, providing deterministic newest-first ordering.
- Each item uses the same public stored-run shape as direct lookup and excludes idempotency keys and request fingerprints.
- The route reads PostgreSQL only and never recalculates, loads candles, contacts Binance, or mutates a run.
- Invalid limits return HTTP 400 and operational failures return a sanitized HTTP 503.
- Cursor pagination, filtering, deletion, retention, and updates are not introduced.

## M6.29 stable UUID cursor pagination

M6.29 extends `GET /backtesting/runs` with an optional `cursor` while preserving its array response.

- The cursor is the UUID of the last run received on the preceding page.
- The service resolves that immutable run and uses its `createdAt` and `id` as the exclusive descending sort boundary.
- PostgreSQL returns rows with an older creation time or, for equal timestamps, a lexically smaller UUID, matching `createdAt DESC, id DESC`.
- Malformed and unknown cursors return HTTP 400; repository failures remain sanitized HTTP 503 responses.
- A request without a cursor retains the M6.28 behavior, including the validated limit and default.
- Offset pagination, response envelopes, generated next-cursor fields, filtering, deletion, and mutation are not introduced.

## Safety and deferred scope

Replay produces signals only. It cannot access a wallet, the Risk Engine, an executor, exchange credentials, or real funds.

Intracandle equity paths, order-book/depth liquidity, partial fills, variable sizing or reinvestment, Risk Engine modeling, run filtering and deletion, cache refresh, parallel gap loading, shared or persisted circuit state, risk-adjusted or annualized metrics, and parameter optimization remain deferred and require separate approval.

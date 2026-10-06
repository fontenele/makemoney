# Real Trading

## M10.1 — Architecture and safety baseline

M10 begins with a documentation-only gate. It does not install the Binance Agentic Wallet skill or CLI, authenticate a wallet, read a balance, request a quote, fund an account, or submit a transaction.

### Provider boundary

The current official Binance Agentic Wallet is an MPC-based on-chain wallet operated through the `binance-agentic-wallet` skill and the `baw` CLI. It supports BNB Smart Chain, Ethereum, Base, and Solana. Its market-order capability is a decentralized token swap that requires a chain, exact token contract identities, native gas, a quote, slippage policy, and an on-chain completion check.

This is not the Binance centralized Spot REST trading API. Existing BTC/USDT public-market data, pair filters, paper fills, and backtests therefore cannot be connected to Agentic Wallet by substituting an executor. A later milestone must explicitly choose a supported chain and token contracts, prove that the strategy's instrument semantics still hold, and model gas, Web3 Wallet fees, route liquidity, slippage, MEV, token risk, and asynchronous on-chain finality.

### Required architecture

Any future implementation must preserve these boundaries:

- Strategies emit signals only and cannot call the wallet or CLI.
- The Risk Engine remains the only path from an approved intent to an executor.
- Paper and real executors remain separate implementations behind a shared contract.
- The provider adapter owns a pinned, version-checked `baw` CLI contract and invokes an allowlisted command with an argument array, bounded timeout, cancellation, and sanitized output. It must not interpolate a shell command.
- Quote acquisition and transaction submission are different operations. Quotes are non-executable observations and expire or become stale according to an explicit policy.
- A mutating submission is never automatically retried. Reconciliation by provider order identity and transaction hash must precede any operator decision after an ambiguous result.
- Audit records must preserve the approved intent, risk decision, quote facts, explicit confirmation, provider order identity, transaction hash, and terminal status without secrets or authentication material.

### Independent safeguards

Real submission must fail closed unless every safeguard is satisfied at the same time:

1. The compiled application contains a real executor; documentation or configuration alone cannot create one.
2. Startup configuration selects real mode and separately enables real execution. Neither setting alone is sufficient.
3. A durable, local operator arm is active and the emergency stop is inactive.
4. The Agentic Wallet reports a connected session on the explicitly approved chain.
5. Read-only wallet settings match the approved daily limit, limited token scope, and App-confirmation handling for high-risk transactions. The application cannot weaken these settings because Binance permits changes only in the App.
6. Remaining daily quota, source-token balance, and native gas balance are sufficient.
7. Exact source and destination contract addresses are allowlisted; symbols alone are never accepted.
8. The existing Risk Engine approves the exact intent after fees, gas, slippage, liquidity, and bankroll constraints are represented.
9. A fresh quote is bound to the same chain, token addresses, side, quantity, and maximum slippage as the approved intent.
10. The operator gives explicit confirmation after seeing the final quote and immediately before every initial real submission. The first real order always requires this confirmation regardless of other settings.

Futures, margin, leverage, transfers, withdrawals, prediction-market orders, DeFi operations, external contract calls, message signing, and automatic limit orders remain outside the approved executor surface.

### Delivery sequence

The next increments must remain independently reviewable:

1. **Complete in M10.2:** define provider-neutral real-execution intent, quote, result, and capability contracts with no provider process or credentials.
2. **Complete in M10.3:** add fail-closed configuration and pure preflight evaluation with tests; defaults remain disabled.
3. **Complete in M10.4:** add a read-only Agentic Wallet capability adapter for version, connection, chains, settings, quota, address, balances, and gas without a mutating command.
4. **Complete in M10.5:** require a pure, non-authorizing instrument-evidence review before any production candidate can be approved.
5. **Complete in M10.6:** separately approve one exact chain/token candidate without authorizing a quote or submission.
6. **Complete in M10.7:** install and connect the dedicated Agentic Wallet only with explicit operator participation, then validate read-only state while the balance remains zero.
7. Require safe provider settings and add quote-only support before any funding.
8. Add durable arming, confirmation, audit, reconciliation, and emergency-stop integration.
9. Only then consider one real executor command. Its first use requires a separate user request and explicit confirmation immediately before submission.

### Acceptance criteria

M10.1 is complete when the official product distinction, non-goals, independent safeguards, architecture boundary, and staged delivery sequence are documented and the project still has no authenticated or mutating wallet integration.

## M10.2 — Provider-neutral real-execution contracts

The first code increment defines inert domain facts under `src/modules/real-trading/domain`. It is not registered as a NestJS module and exposes no provider, process, command, route, configuration, authentication, quote loader, Risk Engine bridge, or executor.

The contracts model:

- one market-swap intent with a canonical local identity and idempotency key, explicit chain, exact source and target token addresses, exact source quantity, maximum slippage rate, and creation time;
- a non-executable quote carrying the complete validated intent, provider identity, nullable provider quote identity, expected and minimum target quantities, bounded network/provider costs, explicit complete or partial cost coverage, and a strict validity interval;
- a provider result with local intent/quote correlation, provider order identity, nullable transaction hash, pending/finished/failed state, exact actual target quantity only when finished, observation times, and an invariant that forbids automatic retry;
- a bounded capability snapshot with connection state, unique chains, explicit quote/submission operations, read capabilities, and an observation time. Submission capability is invalid unless quote capability is also present.

Token symbols are optional presentation labels and never replace exact token addresses. Chain and address formats remain provider-neutral opaque identities; a later provider adapter must perform chain-specific canonicalization before these facts can pass a preflight gate. All quantities and rates remain canonical decimal strings and comparisons use an isolated exact-decimal context.

M10.2 deliberately defines no submission interface. It cannot call `baw`, cannot construct a shell command, and cannot mutate provider or local financial state.

## M10.3 — Fail-closed configuration and pure capability preflight

M10.3 adds two independent startup gates, `TRADING_MODE` and `REAL_EXECUTION_ENABLED`. They default to `paper` and `false` in application validation and `.env.example`. Simultaneously selecting real mode and enabling real execution is rejected at startup unless an exact provider, chain, source-token address, and distinct target-token address are all configured. No credential or wallet authentication material is accepted.

The pure capability preflight evaluates one M10.2 intent and capability snapshot against that exact allowlist. It fails closed for malformed facts, either disabled gate, missing or divergent identities, a disconnected wallet, future or stale observations, absent chain or quote capability, and unavailable security-settings, quota, balance, or gas reads.

A passing assessment has only `capability_preflight` scope. It permanently reports `quoteAuthorized: false` and `submissionAuthorized: false`; it is not a Risk Engine decision and cannot authorize provider access, a quote, or a transaction. The evaluator has no NestJS module wiring, provider adapter, process invocation, route, persistence, wallet access, or mutable operation.

### M10.3 acceptance criteria

- Safe defaults leave both independent activation gates off.
- Simultaneous activation requires a complete exact instrument allowlist.
- Capability observations are bounded by an explicit freshness policy and every required read capability.
- A ready result remains explicitly non-authorizing.
- Focused tests cover readiness, independent gates, identity divergence, freshness, incomplete reads, and malformed domain facts.

## M10.4 — Read-only Agentic Wallet capability adapter

M10.4 adds an infrastructure boundary for a closed set of official `baw` reads without registering a NestJS module or invoking the wallet during application startup. The command runner can check the pinned CLI version and read wallet status, supported chains, security settings and daily quota, addresses, chain-filtered balances, and gas levels. It accepts no authentication, quote, swap, transfer, withdrawal, approval, signing, prediction, DeFi, or other mutating command.

The process boundary invokes one executable with an argument array and `shell: false`, a 1–30 second bounded timeout, cancellation, a 64 KiB stdout ceiling, discarded stderr, and sanitized local error messages. Provider output must be successful JSON before the adapter validates response shape, bounded collection sizes, unique identities, exact decimal strings, canonical dates, chain consistency, address presence, and the pinned CLI version.

Disconnected and still-creating wallet states return an explicit unavailable observation after version and status only. A connected observation reports successful reads but deliberately advertises no `market_swap_quote` or `market_swap_submit` operation, so it cannot satisfy the M10.3 preflight by itself. The adapter remains unwired and was verified exclusively with test doubles; no `baw` package was installed, no wallet session was opened, and no live balance or gas request occurred.

### M10.4 acceptance criteria

- The command surface is structurally limited to the approved read-only commands.
- Process invocation uses no shell and bounds timeout, output, cancellation, and exposed failures.
- Version, connection, chain, settings/quota, address, balance, and gas responses are strictly normalized or rejected.
- Disconnected state stops before wallet-detail reads, while connected observations still claim no quote or submission capability.
- Focused tests use doubles only and create no provider or financial side effect.

## M10.5 — Non-authorizing instrument compatibility review

The first compatibility gate is specific to the project's established Binance Spot BTC/USDT research instrument and a candidate Agentic Wallet on-chain market swap. It rejects malformed facts and requires the candidate evidence to identify the same exact chain and source/target token addresses as the validated intent. Buy evidence must map USDT to BTC, while sell evidence must map BTC to USDT.

Exact identifiers and symbols are insufficient because an on-chain token representation and route can diverge from centralized Spot through wrapping or bridging risk, independent price formation, different liquidity, provider trading fees, native network fees, route slippage, and asynchronous finality. Each concern therefore has a separate documented/unverified state; no missing concern is collapsed into a general boolean.

A fully documented assessment is only `review_ready`. The result always exposes `instrumentApproved: false`, `quoteAuthorized: false`, and `submissionAuthorized: false`. M10.5 selects no production chain or token contracts and adds no configuration, module wiring, provider process, route, persistence, wallet access, quote loader, Risk Engine bridge, or executor.

### M10.5 acceptance criteria

- The exact intent, chain, and token identities must match the reviewed candidate.
- Buy and sell candidates preserve the correct BTC/USDT economic direction.
- Token identity, representation, cross-venue price, on-chain liquidity, fee, gas, slippage, and finality evidence remain independently visible.
- Malformed, divergent, incomplete, or future-dated evidence fails closed.
- Even complete evidence authorizes neither instrument selection, quote loading, nor submission.

## M10.6 — Exact BSC BTCB/USDT candidate approval

The project owner explicitly approved one bidirectional candidate pair: Agentic Wallet on BSC chain `56`, with BTCB `0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c` as the on-chain BTC representation and USDT `0x55d398326f99059ff775485246999027b3197955`. BTCB remains explicitly modeled as Binance-Peg BTC rather than native Bitcoin.

The pure approval gate re-evaluates the M10.5 evidence and accepts only USDT-to-BTCB for a buy or BTCB-to-USDT for a sell. EVM address comparison is case-insensitive, but every hexadecimal character must match the approved contracts. Another chain, either different token, incomplete compatibility evidence, malformed approval facts, or a future-dated decision fails closed.

`instrument_approved` means only that this candidate may proceed to later wallet and quote investigation. The assessment always returns `quoteAuthorized: false` and `submissionAuthorized: false`. The regular Binance Wallet is not considered an authenticated Agentic Wallet session; no CLI package is installed, no wallet is created or connected, no balance is added, and no provider operation is invoked.

### M10.6 acceptance criteria

- Only BSC chain `56` and the complete approved BTCB/USDT contract addresses can pass.
- Buy and sell preserve exact economic direction and token-address direction.
- The complete M10.5 compatibility review remains mandatory.
- Malformed or future approval facts fail closed.
- Instrument approval grants neither quote nor submission authority.

## M10.7 — Zero-balance read-only wallet onboarding

The operator authorized global installation of the official pinned `@binance/agentic-wallet@1.10.0` CLI and completed the provider-generated pairing link and matching-code confirmation in the Binance App. The provider reported `SUCCESS`, and the independent status read then reported `CONNECTED`.

Bounded live reads confirmed BSC chain `56`, a chain address, `tradeAllTokens=false`, `AutoReject` for abnormal transactions, an empty BSC balance list, and current gas levels. The provider also reported a broad default daily limit; that upstream setting is observed but not approved as a project risk limit, so funding remains blocked until a later safety increment. Wallet addresses and local session material are not committed or logged by the application.

The first live project-adapter attempt exposed Windows `spawn EINVAL` because Node cannot execute the npm `.cmd` wrapper with `shell: false`. The runner now locates the installed package's `dist/index.js` under a `PATH` entry and starts it with the current Node executable. It never parses or invokes the command wrapper, never enables a shell, and fails closed if the package entry is unavailable. The corrected adapter passed the connected BSC read flow and still reported an empty operation list.

### M10.7 acceptance criteria

- CLI version is pinned and verified before protected reads.
- Pairing requires the operator's matching-code confirmation in the official Binance App.
- Live status, BSC support, settings/quota, address, empty balance, and gas normalize through the existing read-only adapter.
- Windows invocation preserves `shell: false` and a closed argument array.
- No quote, provider-setting mutation, funding, transfer, order, or runtime execution path is introduced.

## M10.8 — Manual runtime wallet visibility

M10.8 registers the first runtime Agentic Wallet module, but its surface remains read-only. `GET /real-trading/status` is an always-local provider-free route that reports the application trading mode, independent execution gate, exact approved BSC BTCB/USDT candidate, manual observation policy, and the permanent absence of quote and submission authorization.

`POST /real-trading/wallet-observation` is an explicit operator-triggered read. It uses the existing pinned, shell-free, closed CLI command runner to observe connection, chains, security settings and quota, approved-chain address availability, BSC balances, and gas. Concurrent requests share one in-flight read. The public result deliberately omits wallet addresses and session material and exposes only a balance asset count rather than token holdings.

The dashboard never calls this provider route during automatic refresh. It keeps the result only in browser memory and visually separates the fictional paper portfolio from the real wallet. Provider failure returns a sanitized isolated `503` and does not affect the paper, research, or local-gate panels.

The authenticated CLI session is host-local, so the NestJS API has one supported runtime: the Windows host against Docker-hosted PostgreSQL and Redis. The API container and Dockerfile were removed. `API_BIND_HOST` accepts only `127.0.0.1`, so even a configuration change cannot expose the wallet read surface on all interfaces.

This increment adds no quote command, trade-access mutation, token approval, signing, submission, transfer, funding, persistence, Risk Engine bridge, or real executor. `quoteAuthorized` and `submissionAuthorized` remain false in every public response.

### M10.8 acceptance criteria

- Automatic dashboard refreshes never invoke the Agentic Wallet CLI.
- Wallet reads require one explicit manual request and concurrent reads coalesce.
- Public responses omit addresses, authentication/session data, and executable operations.
- Fictional paper capital and the empty real wallet are visibly separate.
- Quote and submission authorization remain false and no mutating CLI command exists.

## M10.9 — Non-authorizing wallet security posture

M10.9 converts the already observed Agentic Wallet settings into a pure, deterministic safety assessment. It independently blocks an expired session, non-automatic rejection of abnormal transactions, unrestricted token scope, enabled prediction trading, enabled developer mode, malformed settings or quota, and quota values that do not reconcile exactly with the reported provider daily limit.

A result with no blockers is named `restrictive`, not execution-ready. The provider daily limit is always marked as unacceptable as a project Risk Engine limit because the provider's available minimums are materially broader than the intended first experiment. Independent local order, daily-spend, bankroll, fee, gas, and slippage limits remain mandatory later safeguards.

The assessment is included in the existing explicit manual wallet response and displayed by the dashboard without another CLI invocation. It always reports `fundingAuthorized: false`, `quoteAuthorized: false`, and `submissionAuthorized: false`. M10.9 adds no command, quote request, wallet setting mutation, token approval, funding, Risk Engine bridge, durable arm, signing, submission, or executor.

### M10.9 acceptance criteria

- Every restrictive provider setting and quota invariant is evaluated independently with exact decimal arithmetic.
- Missing, malformed, expired, broad, or incoherent observations fail closed with explicit blockers.
- The provider daily limit is never represented as a project risk limit.
- Dashboard visibility reuses the manual observation and does not add provider access to automatic refresh.
- Funding, quote, and submission authorization remain false in every result.

## M10.10 — Explicit local real-risk limits

M10.10 models the independent project controls that M10.9 left mandatory: maximum order notional, UTC-daily spend, bankroll, provider-fee rate, network fee, and slippage. Each value is an explicit canonical decimal environment setting and defaults to absent. The project owner has not yet selected financial values, so `.env.example` deliberately leaves the complete envelope blank rather than inventing a risk appetite.

A pure exact-decimal assessment reports each absent limit independently, rejects malformed or out-of-range values, and requires maximum order notional ≤ maximum daily spend ≤ maximum bankroll. `GET /real-trading/status` exposes the provider-free assessment and configured values for local audit. It never substitutes the provider daily limit and always reports funding, quote, and submission authorization as false.

This increment does not yet evaluate an intent or quote against the limits, persist daily usage, value non-USDT gas, invoke `market-order quote`, enable App trading access, fund the wallet, bridge the operational Risk Engine, arm execution, or add an executor.

### M10.10 acceptance criteria

- All six local limits default to absent and are visible as independent blockers.
- Configured values preserve canonical exact decimals; fee and slippage rates are bounded from zero through one.
- Order, daily-spend, and bankroll containment is evaluated with exact decimal arithmetic.
- The provider daily limit is never consumed as a project limit.
- Funding, quote, and submission authorization remain false in every result.

## M10.11 — Unwired non-executable quote adapter

M10.11 adds a dedicated Agentic Wallet quote boundary for the official `market-order quote` command. The runner checks the pinned CLI version, invokes an argument array with `shell: false`, and shares the existing bounded timeout, cancellation, output ceiling, discarded stderr, sanitized failure, and Windows package-entry behavior. Its command union and argument builder cannot represent `market-order swap` or another mutation.

The adapter accepts only the exact approved BSC chain and BTCB/USDT token directions. It validates the complete provider envelope, exact source quantity, expected source/target symbols, and reported slippage no greater than the intent maximum. Intent slippage is converted from a fractional rate to the provider's percentage argument with exact decimal arithmetic.

Because the published provider response has no quote ID, expiry, complete provider fee, or network fee, normalization is deliberately conservative: `providerQuoteId` is null, `costCoverage` is `partial`, no costs are fabricated, the quote is always `executable: false`, and a one-to-ten-second local validity policy is mandatory. Minimum target quantity is derived from expected output and the intent's maximum slippage rather than from an unreported provider field.

The adapter and runner are not registered in the NestJS module and have not been called live. M10.11 adds no configuration gate, endpoint, dashboard action, automatic task, persistence, funding, Risk Engine bridge, durable arm, confirmation, swap command, reconciliation, or executor.

### M10.11 acceptance criteria

- The quote command is structurally separate from read commands and cannot represent submission.
- CLI version, process bounds, cancellation, no-shell invocation, and sanitized failures remain mandatory.
- Only exact approved chain/token directions and correlated provider output normalize successfully.
- Missing provider fee, gas, quote identity, and expiry remain explicit rather than inferred as complete.
- No runtime or live provider path can invoke the adapter.

## M10.12 — Pure non-authorizing quote risk assessment

M10.12 adds a pure policy that correlates a separately supplied intent with a normalized quote and evaluates only facts that can be compared without another provider call or invented conversion. It requires the approved Agentic Wallet provider and exact BSC BTCB/USDT direction, a currently valid quote, a fully defined M10.10 envelope, complete cost coverage, and explicit provider-fee and network-fee records.

Buy notional is the exact USDT source quantity; sell notional is the quote's exact expected USDT output. Provider fees are comparable only when denominated in the source asset, which permits an exact fee-rate calculation. Network fees are comparable only when already valued in approved BSC USDT. Multiple same-kind records are summed with the isolated precision-40 decimal context before the relevant limit is applied. Partial costs, a native-gas fee without a trusted USDT valuation, missing fee facts, stale quotes, identity divergence, and every exceeded bound fail closed.

The narrow successful status is `within_quote_limits`, not Risk Engine approval. Durable UTC-daily usage and current bankroll exposure are explicitly marked unevaluated, and `riskApproved`, `fundingAuthorized`, `quoteAuthorized`, and `submissionAuthorized` always remain false. Because the M10.11 adapter truthfully emits partial coverage with no provider or network cost, its current quote cannot pass this assessment.

The policy is not registered in NestJS and no endpoint or provider call can reach it. M10.12 adds no local-risk values, persistence, balance/gas conversion, wallet mutation, durable arm, confirmation, audit record, reconciliation, submission command, or executor.

### M10.12 acceptance criteria

- Intent, quote, approved provider, chain, token direction, and validity interval must correlate exactly.
- Order notional, slippage, provider-fee rate, and USDT-valued network fee use exact decimal comparisons.
- Incomplete, missing, or non-comparable cost facts fail closed rather than being estimated.
- Daily spend and bankroll remain explicitly unevaluated, and no result grants Risk Engine approval or authorization.
- The policy remains unwired and cannot invoke the Agentic Wallet adapter.

## M10.13 — Pure non-authorizing budget risk assessment

M10.13 introduces a pure budget snapshot and policy without creating its data source. The snapshot binds one approved provider and chain to a canonical UTC day, exact settled and reserved USDT spend, explicit complete or partial spend coverage, an exact USDT-valued bankroll with its own coverage state, and a bounded observation time. It contains no address, balance list, credential, or session material.

The policy first requires the M10.12 quote assessment to be within its narrow limits. It then treats gross USDT order notional plus the quote-implied provider-fee notional and explicit USDT network fee as a conservative budget charge for both buy and sell directions. That charge is added to settled and already reserved spend before comparison with the UTC-daily limit. The completely valued bankroll must not exceed the configured bankroll cap, and the aggregate bankroll value must cover the new quote charge. All arithmetic uses the isolated precision-40 decimal context.

Snapshots from another provider, chain, or UTC day, observations from the future or older than the caller's bounded one-to-sixty-second freshness policy, partial spend history, partial bankroll valuation, malformed decimals, projected daily excess, bankroll excess, or insufficient aggregate value fail closed. The current M10.11 quote still stops at M10.12 because it lacks complete costs.

`within_budget_limits` remains non-authorizing. The snapshot is caller-supplied and unwired; there is no durable spend reservation, atomic enforcement, source-token balance check, native-gas balance check, provider quota composition, or operational Risk Engine decision. M10.13 adds no configuration value, repository, schema, route, live wallet read, quote request, funding, arm, confirmation, audit record, reconciliation, submission command, or executor.

### M10.13 acceptance criteria

- Budget facts must be exact, complete, fresh, current-day, and bound to the approved provider and chain.
- Daily usage includes settled spend, reserved spend, gross quote notional, provider-fee notional, and USDT-valued network fee.
- Projected daily spend, maximum bankroll, and aggregate quote capacity are enforced with exact decimals.
- Durable enforcement, exact source balance, and native gas remain explicitly unevaluated.
- No result grants Risk Engine approval, funding, quote, or submission authorization, and the policy remains unwired.

## M10.14 — Pure non-authorizing resource sufficiency assessment

M10.14 introduces a pure resource snapshot and policy without connecting it to the existing wallet observation. The snapshot binds the approved provider and BSC chain to exact intent and quote IDs, the exact source-token address and symbol, its available quantity and coverage, the BSC native-gas symbol BNB, an available BNB quantity, an explicit positive required BNB quantity, gas coverage, and a bounded observation time. It contains no wallet address, credential, or session material.

The policy first requires M10.13 to be within its narrow budget limits. Required source quantity is then the intent's exact source quantity plus every source-denominated provider fee already validated by M10.12. Available source balance must meet that amount at an inclusive boundary. Native gas is evaluated separately: BNB availability must meet the explicitly supplied positive BNB requirement. This deliberately does not treat the adapter's gas-price observation or the quote's USDT-valued network fee as proof of native-token balance.

Snapshots from another provider or chain, snapshots tied to another intent or quote, divergent source identity, a native asset other than BNB, observations from the future or older than the bounded one-to-sixty-second policy, partial coverage, malformed decimals, insufficient source balance, or insufficient gas fail closed. Buy and sell directions use the same source-denominated fee rule with precision-40 exact arithmetic.

`resources_sufficient` remains non-authorizing. The snapshot is caller-supplied and unwired; no adapter maps live balances or gas into it, no amount is reserved atomically, and provider quota remains explicitly unevaluated because the provider reports USD while the local budget is denominated in USDT and no conversion policy has been approved. M10.14 adds no configuration, repository, schema, route, live wallet read, quote request, funding, arm, confirmation, audit record, reconciliation, submission command, or executor.

### M10.14 acceptance criteria

- Resource facts must be exact, complete, fresh, and bound to the approved provider, chain, intent, and quote.
- Required source quantity includes every validated source-denominated provider fee.
- Exact source-token and BNB gas sufficiency are evaluated independently at inclusive boundaries.
- Provider quota and durable resource reservation remain explicitly unevaluated.
- No result grants Risk Engine approval, funding, quote, or submission authorization, and the policy remains unwired.

## M10.15 — Pure non-authorizing provider-quota sufficiency assessment

M10.15 introduces a pure provider-quota snapshot and policy without connecting it to the existing wallet observation. The snapshot binds the approved provider and BSC chain to exact intent and quote IDs, a canonical UTC day, positive provider daily limit, used and remaining USD quota, quota coverage, an independently supplied positive USD requirement, explicit external-valuation basis and coverage, and separate bounded observation times. It contains no wallet address, credential, session material, or conversion rule.

The policy first requires M10.14 to report sufficient exact source and BNB resources. It then requires the quota observation to belong to its declared current UTC day, reconciles used plus remaining quota exactly to the reported daily limit, rejects usage above that limit, and checks remaining quota against the externally valued USD requirement at an inclusive boundary. This does not assume that one USDT equals one USD: the caller must supply a complete, fresh USD valuation bound to the same intent and quote.

Snapshots from another provider, chain, intent, quote, or UTC day, observations or valuations from the future or older than their independent one-to-sixty-second policies, partial quota or valuation coverage, malformed decimals, inconsistent totals, excessive usage, or insufficient remaining quota fail closed. All arithmetic uses the isolated precision-40 decimal context.

`provider_quota_sufficient` remains non-authorizing. The provider daily limit is not accepted as a project Risk Engine limit, the snapshot is caller-supplied and unwired, and neither quota nor resources are durably reserved. M10.15 adds no configuration, conversion adapter, repository, schema, route, live wallet read, quote request, funding, arm, confirmation, audit record, reconciliation, submission command, or executor.

### M10.15 acceptance criteria

- Quota and valuation facts must be exact, complete, independently fresh, and bound to the approved provider, chain, current UTC day, intent, and quote.
- Used plus remaining provider quota must exactly equal the reported daily limit, and remaining quota must cover the explicit USD requirement.
- USDT/USD parity is never assumed and the provider daily limit is never accepted as a project risk limit.
- Durable quota and resource reservation remain explicitly absent.
- No result grants Risk Engine approval, funding, quote, or submission authorization, and the policy remains unwired.

## M10.16 — Pure non-authorizing reservation plan

M10.16 adds a pure planner for the future atomic reservation boundary. It first requires the complete M10.15 provider-quota assessment to pass, then materializes the exact facts that a later durable transaction would need: provider, chain, intent, quote, and idempotency identities; current UTC day; conservative USDT budget charge; exact source-token address, symbol, and required quantity; positive BNB gas requirement; independently valued provider-quota USD requirement; and the quote expiry.

The planner derives those quantities from the already validated M10.13 budget and M10.14 resource assessments rather than merging their denominations. Buy and sell directions therefore preserve different source assets while keeping local USDT budget and provider USD quota explicit and separate. Token addresses are canonicalized only after the approved BSC instrument and complete upstream facts pass.

A blocked M10.15 assessment yields no plan. The narrow `reservation_plan_ready` status means only that complete inert inputs exist for a future persistence design. It does not create a row, lock funds, consume provider quota, extend quote validity, grant a Risk Engine approval, or authorize funding, quoting, or submission. M10.16 adds no schema, migration, repository, module wiring, route, provider call, wallet mutation, arm, confirmation, audit record, reconciliation, submission command, or executor.

### M10.16 acceptance criteria

- A plan exists only after quote, budget, resource, and provider-quota sufficiency all pass.
- Budget USDT, source-token quantity, native BNB gas, and provider-quota USD remain separately denominated exact facts.
- Plan identity is bound to the same provider, chain, intent, quote, idempotency key, UTC day, and quote expiry.
- No durable reservation or atomic enforcement is claimed.
- No result grants Risk Engine approval, funding, quote, or submission authorization, and the planner remains unwired.

## M10.17 — Pure non-authorizing aggregate reservation capacity

M10.17 adds the concurrency-safety prerequisite that must exist before durable reservation can be correct. A caller-supplied snapshot binds the approved provider, chain, and current UTC day to at most 100 unique reservation records with exact intent and quote identities, USDT budget charge, source-token address and quantity, BNB requirement, provider-quota USD requirement, expiry, coverage, and observation time.

The policy first requires the complete M10.16 plan. It excludes records expired at the evaluation boundary, rejects reuse of an active intent or quote, and requires the summed active USDT budget reservations to equal the reserved-spend fact already consumed by M10.13. It then adds the proposed plan and independently compares the same-source token total, total BNB requirement, and total provider-quota USD requirement with their complete resource and quota snapshots. Different denominations are never combined.

Malformed or duplicate records, more than 100 records, partial coverage, another provider, chain, or UTC day, future or stale observation, an already-active intent or quote, budget non-reconciliation, or aggregate source, gas, or quota insufficiency fail closed. Expired records do not consume capacity. Exact arithmetic uses the isolated precision-40 decimal context.

`reservation_capacity_available` is still only a pure assessment. It does not serialize concurrent callers, create or expire a database row, lock a wallet balance, consume provider quota, grant Risk Engine approval, or authorize funding, quoting, or submission. M10.17 adds no schema, migration, repository, module wiring, route, provider call, wallet mutation, arm, confirmation, audit record, reconciliation, submission command, or executor.

### M10.17 acceptance criteria

- Active reservation facts are bounded, unique, complete, fresh, current-day, and provider/chain correlated.
- Active budget reservations reconcile exactly with the budget snapshot before a new plan is considered.
- Same-source token, BNB gas, and provider-quota USD capacity are checked independently after adding the plan.
- Expired records release capacity, while an active duplicate intent or quote fails closed.
- No durable reservation or atomic enforcement is claimed, and no result grants Risk Engine approval or financial authorization.

## M10.18 — Durable atomic real-execution reservation

M10.18 adds the first local durable reservation boundary, still without registering it in NestJS or exposing a route. The Prisma store accepts the complete M10.17 input, derives a canonical SHA-256 fingerprint from every request fact, and runs the reservation attempt in one serializable PostgreSQL transaction protected by a transaction-scoped advisory lock.

Inside that transaction, exact idempotent replay is returned before quote-expiry evaluation, while changed reuse of an idempotency key and reuse of an intent or quote fail closed. A new attempt reads the current transaction time, loads up to 101 unexpired records for the same provider, chain, and UTC day, rebuilds the complete reservation snapshot, and reapplies M10.17. Loading one beyond the policy's 100-record limit preserves the fail-closed bound rather than silently truncating capacity facts.

Only an available assessment produces one immutable row. It stores exact provider, chain, intent, quote, idempotency, fingerprint, UTC day, expiry, USDT budget charge, source-token identity and quantity, native-BNB requirement, and provider-quota USD requirement. Unique database constraints protect intent, quote, and idempotency identities. Expired rows remain an audit fact but stop consuming capacity in later transactions; replay does not extend their quote validity.

The reservation is local accounting only. It does not lock wallet balances, consume provider quota, approve risk, arm execution, authorize a quote or submission, or invoke the Agentic Wallet. The store is deliberately unwired and continues to consume caller-supplied budget, resource, quota, and freshness facts. No adapter bridge, route, live provider call, funding, wallet mutation, confirmation, submission command, or executor is added.

### M10.18 acceptance criteria

- A new reservation is inserted only after M10.17 is reevaluated against durable active rows in the same serialized transaction.
- Exact idempotent replay returns the original immutable row; changed key reuse and reused intent or quote identities fail closed.
- USDT budget, source-token, BNB gas, and provider-quota USD remain separately denominated exact strings.
- Quote expiry releases capacity without deleting or extending the audit row.
- PostgreSQL E2E coverage proves exact persistence, replay, and prevention of concurrent over-reservation.
- The store remains unwired and grants no Risk Engine approval or financial authorization.

## M10.19 — Pure reservation-bound arm plan

M10.19 adds a pure planner for the next durable operator-control boundary. An arm request has its own UUID and must identify one exact M10.18 reservation, approved Agentic Wallet provider and BSC chain, intent, and quote. It also carries the explicit literal acknowledgment `reservation_and_quote_reviewed`, request time, and requested expiry. This acknowledgment records only the facts supplied to the planner; it is not the immediate final confirmation required before a future first submission.

The caller supplies independent request-age and maximum-lifetime limits, each restricted to one through sixty seconds. The request must be current, cannot predate the durable reservation, must still be active at evaluation, and cannot expire after the quote-backed reservation. Invalid clocks, malformed reservation or request facts, missing acknowledgment, identity divergence, stale/future timing, expiry, and excessive lifetime all fail closed.

`arm_plan_ready` means only that an inert plan can be reviewed by a later persistence design. The planner creates no durable arm, does not inspect emergency-stop state, does not reclassify the reservation as Risk Engine approval, records no final confirmation, and authorizes no quote or submission. It is unwired and adds no schema, repository, route, provider call, wallet mutation, funding, submission command, or executor.

### M10.19 acceptance criteria

- The arm request is bound to one exact durable reservation, provider, chain, intent, and quote.
- An exact operator-review acknowledgment is mandatory but remains distinct from final pre-submission confirmation.
- Request age and total arm lifetime are explicit, bounded, and cannot exceed the reservation's quote expiry.
- Malformed, divergent, future, stale, predating, expired, or overlong facts fail closed.
- A ready plan remains non-durable and grants no Risk Engine approval or financial authorization.

## M10.20 — Durable reservation-bound arm

M10.20 adds an unwired Prisma store for the M10.19 plan. One serializable PostgreSQL transaction protected by a dedicated advisory lock first checks the caller-supplied arm UUID for exact fingerprinted replay, then reloads the referenced M10.18 reservation and checks whether its reservation, intent, or quote is already armed. A missing reservation or conflicting identity fails closed before insertion.

The transaction evaluates M10.19 again using its current clock. Only a still-valid plan creates one immutable row containing the exact arm, reservation, provider, chain, intent, quote, acknowledgment, request time, expiry, fingerprint, and database creation time. The schema has a restrictive foreign key to the durable reservation and unique reservation, intent, and quote identities. Consequently, an expired arm cannot be replaced for the same quote-backed reservation; a later attempt requires a fresh reservation and quote.

Exact replay is returned before expiry evaluation and never changes the stored expiry. This preserves idempotent observation of the original control record without treating it as currently active. The store remains unregistered and does not compose emergency-stop state, create Risk Engine approval, capture final pre-submission confirmation, authorize provider access, or expose any execution path.

### M10.20 acceptance criteria

- A durable arm can reference only an existing exact reservation and M10.19 is reevaluated inside the serialized transaction.
- One reservation, intent, and quote can produce at most one immutable arm.
- Exact replay returns the original row without extending expiry; changed UUID reuse fails closed.
- PostgreSQL E2E coverage proves exact persistence, post-expiry replay, and concurrent single-arm enforcement.
- The store remains unwired and does not inspect emergency stop, approve risk, capture final confirmation, or authorize submission.

## M10.21 — Pure emergency-stop composition

M10.21 adds a pure, unwired assessment that composes one exact durable M10.20 arm with an explicit emergency-stop snapshot. The arm must still be active and retain the approved Agentic Wallet/BSC identities. The stop snapshot must be complete, fresh under a caller-supplied one-to-sixty-second bound, sourced from a persisted event, inactive, and observed only after the durable arm exists. A configuration-only fallback is intentionally insufficient for this real-execution boundary.

Any persisted stop change after arm creation invalidates that arm, even when the newest state is inactive. This prevents an arm created before or during a stop cycle from becoming usable merely because the stop was later cleared; continued investigation requires a fresh quote-backed reservation, review, and arm. Future, stale, partial, malformed, pre-arm, or active facts fail closed.

`emergency_stop_clear_for_arm` is only a point-in-time observation. M10.21 does not read the runtime service, persist a result, lock emergency-stop state, or enforce the check atomically with a provider mutation. It grants no Risk Engine approval, records no final immediate confirmation, and authorizes no quote or submission.

### M10.21 acceptance criteria

- Only a valid unexpired M10.20 arm and a fresh, complete, persisted inactive stop snapshot can produce a clear assessment.
- The stop must be observed after arm creation, and any later persisted stop change permanently invalidates that arm.
- Configuration fallback, active state, and malformed, partial, future, or stale facts fail closed.
- A clear assessment explicitly remains non-atomic and grants no Risk Engine approval, final confirmation, or submission authorization.
- The assessment remains unwired and adds no schema, provider access, route, wallet mutation, command, or executor.

## M10.22 — Pure pre-approval risk revalidation

M10.22 adds a pure, unwired composition for the point immediately before a future durable Risk Engine approval. It requires the exact active M10.18 reservation to remain present in a complete reservation snapshot and the exact M10.20 arm to remain correlated. To avoid counting the same order twice, it subtracts only the current reservation's USDT charge and removes only its exact aggregate-capacity record before proposing that same reservation again.

The policy then reruns the complete M10.12–M10.17 chain using current quote, local-limit, UTC-day budget, bankroll, source-token, native-BNB, provider-quota, external USD-valuation, and aggregate-reservation facts. The newly derived reservation plan must match every durable economic and identity field exactly. Missing durable membership, changed facts, under-accounted reserved spend, insufficient current capacity, expired artifacts, or divergent identities fail closed. M10.21 is recomposed from the exact arm and current persisted emergency-stop snapshot rather than trusting a caller-supplied assessment result.

`risk_revalidation_ready` creates only an inert plan bound to the reservation, arm, and persisted stop-change identity, expiring no later than either durable artifact. The function does not persist an approval, lock the emergency stop, make external reads, or enforce anything atomically with a provider mutation. `riskApproved`, final confirmation, and submission authorization remain false.

### M10.22 acceptance criteria

- The exact active durable reservation must be present and unchanged in the complete current reservation snapshot.
- Revalidation excludes only that reservation, preventing self-double-counting while preserving every other active reservation.
- Fresh current financial and provider facts must pass the complete M10.12–M10.17 chain and reproduce the durable reservation exactly.
- The exact arm and M10.21 emergency-stop composition must also remain clear.
- A ready plan remains non-atomic, unwired, and explicitly grants no Risk Engine approval, final confirmation, or submission authorization.

## M10.23 — Durable real-execution risk approval

M10.23 adds an unwired Prisma store for the M10.22 plan. A serializable transaction shares the M10.18 reservation advisory lock, so the active reservation set cannot change between its database read, complete-snapshot reconstruction, revalidation, and approval insertion. It reloads the exact durable reservation and arm, reads the newest persisted emergency-stop event directly, and fails closed when any prerequisite is missing.

The transaction reapplies M10.22 using the freshly reconstructed reservation and emergency-stop facts plus caller-supplied current quote, local-limit, budget, bankroll, resource, provider-quota, and external USD-valuation facts. Only an exact still-valid result creates one immutable approval tied by restrictive foreign keys to its reservation and arm. Unique reservation, arm, intent, and quote identities allow at most one approval, while an explicit approval UUID and canonical request fingerprint provide exact replay without extending expiry.

The stored record is a durable Risk Engine decision, but it is not financial authorization. It expires no later than its arm and reservation, records the exact persisted emergency-stop change used by the decision, and permanently reports final confirmation and submission authorization as false. The store is not registered in NestJS and adds no route, provider call, live quote, wallet mutation, funding behavior, final-confirmation record, submission command, or executor.

### M10.23 acceptance criteria

- Approval persistence reloads the exact reservation, arm, active reservation set, and latest persisted emergency-stop event inside one serializable transaction.
- The M10.22 chain is reapplied at transaction time and an absent, active, changed, expired, divergent, or under-capacity prerequisite fails closed.
- Restrictive foreign keys and unique reservation, arm, intent, and quote identities permit at most one immutable approval.
- Exact fingerprinted replay returns the original approval without extending expiry; conflicting reuse fails closed.
- PostgreSQL E2E coverage proves persistence, replay, and concurrent single-approval enforcement.
- The store remains unwired and records neither final confirmation nor submission authorization.

## M10.24 — Pure approval-bound final-confirmation plan

M10.24 adds a pure, unwired planner for the explicit operator confirmation required immediately before a future initial submission. The request has its own UUID and must repeat the exact M10.23 approval, reservation, arm, approved provider and chain, intent, quote, and persisted emergency-stop change identities. It also requires the literal acknowledgment `risk_approval_and_final_quote_reviewed_for_immediate_submission`, which is deliberately distinct from the earlier arm acknowledgment.

The durable approval must be structurally valid, active, and still carry `riskApproved: true` with confirmation and submission authorization false. The request cannot predate the approval, be stale or future-dated, expire at evaluation, or outlive the approval. Independent request-age and total confirmation-lifetime policies are each restricted to one through sixty seconds.

`final_confirmation_plan_ready` is an inert plan only. It does not persist the confirmation, consume the approval, recheck emergency stop at a submission boundary, contact the provider, or authorize a transaction. A later increment must design durable single-use confirmation and a later atomic submission gate; no executor or mutating command is introduced here.

### M10.24 acceptance criteria

- The request is bound to the exact durable approval and every upstream audit identity, including the persisted emergency-stop change.
- The explicit final-quote/immediate-submission acknowledgment is mandatory and remains distinct from arming.
- Request freshness and total lifetime are independently bounded and cannot exceed approval expiry.
- Malformed, divergent, future, stale, predating, expired, or overlong facts fail closed.
- A ready plan records no durable confirmation, performs no final stop recheck, and grants no submission authorization.
- The planner remains unwired and adds no schema, repository, route, provider call, wallet mutation, command, or executor.

## M10.25 — Durable approval-bound final confirmation

M10.25 adds an unwired Prisma store for the M10.24 plan. Each attempt runs in a serializable transaction under a dedicated advisory lock, checks exact fingerprinted replay first, reloads the referenced M10.23 approval, rejects protected identity reuse, and reapplies M10.24 using the transaction-time clock before insertion.

The immutable row preserves the exact approval, reservation, arm, provider, chain, intent, quote, persisted emergency-stop change, acknowledgment, request time, and expiry. A restrictive foreign key binds it to the durable approval, while unique approval, reservation, arm, intent, and quote identities permit at most one confirmation for the complete audit chain. Exact replay remains observable after expiry without extending it.

The emergency-stop change identity uses the same bounded opaque `[A-Za-z0-9_-]` format as the persisted risk-control event rather than assuming UUID identity. The public mapper excludes the internal request fingerprint. A stored confirmation reports `confirmationRecorded: true`, but the emergency stop has not been rechecked at a submission boundary and `submissionAuthorized` remains false.

### M10.25 acceptance criteria

- Persistence reloads the exact durable approval and reapplies M10.24 inside a serializable transaction.
- One approval, reservation, arm, intent, and quote can produce at most one immutable confirmation.
- Exact fingerprinted replay returns the original record without extending expiry; changed ID reuse and protected identity reuse fail closed.
- The persisted emergency-stop change identity remains compatible with the actual risk-control event format, and internal fingerprints are not exposed.
- PostgreSQL E2E coverage proves migration, persistence, replay, and concurrent single-confirmation enforcement.
- The store remains unwired, performs no submission-bound emergency-stop recheck, and grants no submission authorization.

## M10.26 — Pure submission-bound emergency-stop recheck

M10.26 adds a pure, unwired policy for the last emergency-stop observation before a future submission design. It requires one structurally valid, active M10.25 confirmation and a complete persisted emergency-stop snapshot observed after that durable confirmation. Configuration fallback, partial coverage, active state, malformed clocks, future or stale observation, and expired confirmation all fail closed.

The newest persisted stop event must have the exact same bounded opaque change identity already carried from M10.23 through the durable confirmation. A later stop activation followed by another clear therefore still changes the identity and invalidates the entire approval/confirmation chain. The stop change itself must predate confirmation, while its current observation must be strictly later.

`emergency_stop_clear_for_submission_review` remains non-atomic because the assessment consumes caller-supplied state and cannot prevent a stop change immediately afterward. It records no permit, consumes no confirmation, contacts no provider, and permanently reports `submissionAuthorized: false`. A future provider-mutation boundary must re-read and enforce stop state atomically with any submission attempt.

### M10.26 acceptance criteria

- Only a valid unexpired M10.25 confirmation and fresh complete persisted inactive stop observation can pass.
- The observation must occur after confirmation and preserve the exact M10.23 stop-event identity.
- Any later stop change, including a later clear, invalidates the chain.
- Configuration fallback, partial, active, malformed, future, or stale facts fail closed.
- A clear result remains non-atomic, unwired, and grants no submission authorization.
- No schema, repository, route, provider call, wallet mutation, command, or executor is added.

## M10.27 — Pure initial-submission plan

M10.27 adds a pure, unwired planner for the exact initial submission attempt that a later atomic gate may consider. It accepts only one structurally valid and active M10.25 confirmation, the successful M10.26 assessment for that same confirmation and persisted stop-event identity, and a short-lived request repeating the confirmation, approval, reservation, arm, provider, chain, intent, quote, and stop-change identities.

The stop assessment must be fresh, cannot predate confirmation, and the request must be fresh and occur no earlier than that assessment. The plan must remain active, cannot outlive confirmation, and has an independently bounded lifetime. All three policy windows are restricted to one through sixty seconds.

`submission_plan_ready_for_atomic_gate` is not submission permission. The inert plan is explicitly limited to an initial attempt and permanently forbids automatic retry. It also records that a future mutating boundary must atomically re-read emergency-stop state and durably consume the confirmation before provider submission can be considered. M10.27 creates neither boundary and leaves `submissionAuthorized: false`.

### M10.27 acceptance criteria

- Confirmation, stop assessment, and request must carry the exact complete audit chain.
- The stop assessment and request are independently fresh, ordered, and bounded by confirmation expiry.
- A ready plan is initial-only and sets `automaticRetryAllowed: false`.
- Atomic stop enforcement and durable confirmation consumption remain mandatory future boundaries.
- A ready result remains unwired and grants no submission authorization.
- No schema, repository, route, provider call, wallet mutation, command, or executor is added.

## M10.28 — Canonical intent/quote payload commitment

M10.28 addresses a payload-integrity gap identified before designing the durable atomic gate. Reservation, arm, approval, confirmation, and submission-plan artifacts preserve exact audit IDs and selected economic totals, but IDs alone cannot prove that a future provider command was reconstructed from the same complete intent and quote content reviewed by the Risk Engine.

The pure assessment validates the intent and quote, requires their semantic identity, the approved Agentic Wallet provider and BSC BTCB/USDT direction, complete cost coverage, and an active non-future quote. It then hashes a versioned canonical representation with SHA-256. The representation includes every intent field; provider and local quote identities; expected and minimum output; all costs; coverage; timestamps; and the non-executable marker. Decimal spellings, token-address case, and cost order are canonicalized so equivalent facts produce one stable digest.

`payload_commitment_ready` remains non-authorizing. M10.28 does not persist or propagate the digest into reservations and later records, compare a future provider payload, consume confirmation, enforce emergency stop atomically, or call the provider. A later migration/store increment must make the commitment durable across the complete approval chain before an atomic permit can be safely designed.

### M10.28 acceptance criteria

- Only a valid active complete-cost quote over the exact approved intent can produce a commitment.
- The embedded quote intent must semantically match the separately assessed intent.
- Every execution-critical intent and quote fact is included in a versioned SHA-256 digest.
- Equivalent decimal spellings, token-address case, and cost ordering produce the same digest.
- Changed economic or routing facts produce a different digest.
- The commitment remains non-durable, unwired, and grants no submission authorization.
- No schema, repository, route, provider call, wallet mutation, command, or executor is added.

## M10.29 — Durable reservation-bound payload commitment

M10.29 makes the M10.28 commitment durable at the origin of the existing approval chain. Inside the same serializable transaction and advisory lock used for capacity enforcement, the reservation store reevaluates the exact intent and quote at the transaction clock and writes the commitment version and SHA-256 digest beside the new reservation.

The migration uses a nullable version/digest pair so an upgrade never fabricates a commitment for an existing row whose original complete payload cannot be reconstructed. A database check constraint permits only both-null legacy state or the supported version with a lowercase 64-character hexadecimal digest. New store writes always provide both fields. Public reservation mapping, arm-store and approval-store reservation mapping, arm planning, and pre-approval revalidation all fail closed on a missing, unsupported, or malformed commitment.

This increment binds the payload to the reservation but does not duplicate the digest into arm, approval, or confirmation rows. Those later durable artifacts still require explicit propagation before a standalone atomic permit can trust the complete chain. The store remains unregistered, and commitment persistence creates no provider payload, submission authorization, command, or executor.

### M10.29 acceptance criteria

- Reservation persistence reevaluates M10.28 inside the existing serialized transaction.
- Every new reservation stores the supported version and canonical digest.
- The migration preserves legacy uncertainty instead of backfilling a false commitment.
- Database constraints and all reservation mappers fail closed on invalid commitment pairs.
- Arm planning and pre-approval revalidation require a structurally valid reservation commitment.
- PostgreSQL E2E coverage proves migration, persistence, and exact replay with the commitment.
- No runtime wiring, route, provider call, wallet mutation, command, executor, atomic permit, or submission authorization is added.

## M10.30 — Durable arm-bound payload commitment

M10.30 extends the commitment across the next durable decision boundary. The arm plan copies the exact supported commitment version and digest from its validated reservation, and the existing serializable arm transaction persists both values with the immutable arm.

The migration again uses a nullable pair so historical arms are not assigned payload facts that cannot be proven. Its database constraint permits only both-null legacy state or the supported version with a lowercase 64-character hexadecimal digest. Every arm mapper rejects legacy, unsupported, or malformed values before replay or risk approval. The arm-bound emergency-stop assessment also requires a structurally valid commitment, and pre-approval revalidation requires the arm commitment to equal its reservation commitment exactly.

This increment does not yet duplicate the commitment into approval or confirmation rows. It creates no provider payload, atomic permit, confirmation consumption, submission authorization, command, or executor, and the store remains outside runtime wiring.

### M10.30 acceptance criteria

- Every new durable arm stores the commitment version and digest copied from its validated reservation.
- The migration preserves legacy uncertainty and constrains valid database pairs.
- Arm replay and approval-store arm mapping fail closed on absent, unsupported, or malformed commitments.
- Arm-bound emergency-stop assessment requires a structurally valid commitment.
- Pre-approval revalidation requires exact arm/reservation commitment equality.
- PostgreSQL E2E coverage proves migration and arm persistence with the commitment.
- No runtime wiring, route, provider call, wallet mutation, command, executor, atomic permit, or submission authorization is added.

## M10.31 — Durable approval-bound payload commitment

M10.31 propagates the commitment through the durable Risk Engine decision. The pre-approval plan carries the exact supported commitment already proven equal between reservation and arm, and the existing serializable approval transaction writes that version/digest pair beside the immutable approval.

The migration preserves historical uncertainty with nullable columns and a pair constraint. New approvals always store both values. Approval replay, final-confirmation-store approval mapping, and final-confirmation planning reject absent, unsupported, or malformed commitments before a confirmation can be considered.

This increment does not yet copy the commitment into the final-confirmation row. It creates no provider payload, atomic permit, confirmation consumption, submission authorization, command, or executor, and all affected stores remain outside runtime wiring.

### M10.31 acceptance criteria

- Pre-approval revalidation carries the exact validated reservation/arm commitment into its approval plan.
- Every new durable approval stores the supported commitment version and digest.
- The migration preserves legacy uncertainty and constrains valid database pairs.
- Approval replay and final-confirmation persistence fail closed on invalid commitments.
- Final-confirmation planning requires a structurally valid approval commitment.
- PostgreSQL E2E coverage proves migration, approval persistence, and exact replay with the commitment.
- No runtime wiring, route, provider call, wallet mutation, command, executor, atomic permit, or submission authorization is added.

## M10.32 — Durable confirmation-bound payload commitment

M10.32 completes commitment propagation across the existing durable review chain. The final-confirmation plan copies the exact supported version and digest from its validated Risk Engine approval, and the existing serializable confirmation transaction persists the pair with the immutable confirmation.

The migration keeps historical confirmations nullable rather than inventing unprovable payload facts and constrains the stored pair to the supported version and canonical digest. Confirmation replay rejects legacy or malformed rows. Both the submission-bound emergency-stop assessment and the initial-submission planner now require a structurally valid confirmation commitment before producing non-authorizing review state.

Although reservation, arm, approval, and confirmation now carry the same commitment through validated transitions, no implementation yet reconstructs and compares a provider-bound command at an atomic gate. This increment consumes no confirmation, authorizes no submission, calls no provider, and leaves all affected components outside runtime wiring.

### M10.32 acceptance criteria

- Final-confirmation planning copies the exact validated approval commitment into its plan.
- Every new durable final confirmation stores the supported commitment version and digest.
- The migration preserves legacy uncertainty and constrains valid database pairs.
- Confirmation replay fails closed on absent, unsupported, or malformed commitments.
- Submission-bound emergency-stop assessment and initial-submission planning require a valid confirmation commitment.
- PostgreSQL E2E coverage proves migration, confirmation persistence, and exact replay with the commitment.
- No runtime wiring, route, provider call, wallet mutation, command, executor, atomic permit, confirmation consumption, or submission authorization is added.

## M10.33 — Provider-command payload verification

M10.33 adds the first representation of the future provider-bound market-swap payload without adding a command runner or executable capability. The pure assessment requires the exact active M10.32 final confirmation, the correlated active M10.27 initial-submission plan, and the complete intent and quote. It reruns M10.28 at the current evaluation time and requires the resulting version and digest to equal the durable confirmation commitment.

Only after every identity, time, quote, and commitment check passes does the assessment construct an inert Agentic Wallet BSC `market-order swap` payload. Token addresses and decimals are canonicalized, the intent's rate is converted exactly to the provider's percentage unit, and the optional provider controls are made explicit as MEV protection enabled and `MEDIUM` gas rather than relying on implicit defaults. The payload remains marked non-executable and forbids automatic retry.

This comparison closes the non-atomic provider-payload integrity gap but is not a submission permit. A later serializable gate must still re-read emergency-stop state, consume the durable confirmation exactly once, bind the verified payload, and create an auditable submission attempt before any provider mutation can be considered. The existing quote adapter still reports partial costs, so it cannot produce the complete quote required by this assessment.

### M10.33 acceptance criteria

- The exact active confirmation and initial-submission plan must carry one correlated audit identity chain.
- The complete intent and quote are revalidated and their canonical commitment must equal the durable confirmation digest.
- The inert payload fixes the approved provider, BSC chain, exact token addresses, quantity, slippage percentage, MEV protection, and gas level.
- Any malformed input, identity divergence, expiry, incomplete quote, changed committed fact, or digest mismatch fails closed.
- The payload remains non-executable, forbids automatic retry, and explicitly requires a future atomic gate and confirmation consumption.
- Focused tests cover the ready path, canonicalization, tampering, identity mismatch, expiry, and malformed facts.
- No schema, persistence, runtime wiring, route, provider call, wallet mutation, funding, mutating command runner, atomic permit, executor, or submission authorization is added.

## M10.34 — Durable atomic submission gate

M10.34 adds an unwired Prisma store for the final local decision boundary while deliberately stopping before provider execution. Gate creation runs in a serializable PostgreSQL transaction and acquires an advisory transaction lock shared with every persisted emergency-stop change. After taking the lock, it reloads the exact durable final confirmation and newest persisted stop event, then reapplies M10.26 and M10.33 using the transaction clock.

Only an unchanged inactive stop event and an exact active committed provider payload can create a row. The immutable record preserves every protected audit identity, the commitment, canonical source/target/quantity/slippage payload, explicit MEV and gas settings, and one equal timestamp for the atomic stop recheck and confirmation consumption. A unique foreign key from the gate to the confirmation represents single consumption without mutating the append-only confirmation; additional unique identities prevent the same approval chain or plan from being reused.

Canonical request fingerprinting permits exact replay even after later expiry or stop changes, but altered reuse fails closed. Database constraints restrict every new row to the approved provider/chain/commitment version, MEV enabled, `MEDIUM` gas, `prepared_not_submitted` status, and equal atomic timestamps. The public stored artifact reports that the local atomic gate succeeded and the confirmation was consumed, while provider submission remains unstarted and `submissionAuthorized` remains false.

### M10.34 acceptance criteria

- Gate creation and every persisted emergency-stop change share one PostgreSQL advisory transaction lock.
- The store reloads the exact confirmation and latest stop event after acquiring the lock.
- M10.26 stop assessment and M10.33 payload verification are reapplied with the transaction clock.
- One immutable gate consumes a confirmation through a restrictive unique foreign key without rewriting it.
- Exact replay is idempotent; changed IDs, reused protected identities, malformed facts, payload drift, and inactive-stop divergence fail closed.
- PostgreSQL constraints preserve the exact inert status, provider payload policy, commitment shape, and atomic timestamps.
- Unit and PostgreSQL E2E tests prove replay, concurrent single consumption, and active-stop rejection.
- No runtime wiring, route, provider call, wallet mutation, funding, mutating command runner, executor, real order, or submission authorization is added.

## M10.35 — Closed Agentic Wallet swap command preview

M10.35 preserves the M10.27 submission-plan expiry on every new M10.34 gate. The schema column is nullable only so migration does not invent an expiry for preexisting records; the Prisma mapper rejects that uncertain legacy state, and a database constraint requires any stored expiry to be later than confirmation consumption.

A pure, unwired provider translator accepts only one active, structurally exact durable gate. It revalidates every protected UUID, the commitment format, emergency-stop identity, approved Agentic Wallet provider and BSC chain, either exact BTCB/USDT direction, canonical positive source quantity, canonical zero-to-100 slippage percentage, MEV protection enabled, `MEDIUM` gas, `prepared_not_submitted` status, coherent atomic timestamps, and all inert authorization flags. Future, expired, malformed, changed, noncanonical, started, or authorized facts fail closed.

The successful result is an immutable preview of the documented `market-order swap` argument sequence, including explicit `--fromTokenQty`, `--fromToken`, `--toToken`, `--binanceChainId`, `--slippage`, `--mev true`, `--gasLevel MEDIUM`, and `--json`. It deliberately omits an executable path and still reports automatic retry forbidden, provider submission unstarted, and submission authorization false. No process is launched and no provider is contacted.

### M10.35 acceptance criteria

- Every new durable gate stores its exact submission-plan expiry.
- Legacy gates without provable expiry fail closed in application mapping.
- Only an active exact M10.34 gate can produce the closed official argument preview.
- Provider, chain, token direction, quantity, slippage, MEV, gas, status, commitment, identity, timestamps, and inert flags are revalidated.
- The preview remains non-executable, forbids automatic retry, and authorizes no submission.
- Focused tests cover both approved directions, exact arguments, malformed facts, future gates, expiry, and invalid evaluation time.
- PostgreSQL E2E coverage proves expiry migration and persistence.
- No runtime wiring, route, process invocation, provider call, wallet mutation, funding, mutating command runner, executor, retry, reconciliation, or real order is added.

## M10.36 — Safe swap submission response interpretation

M10.36 adds a pure, unwired interpretation boundary for the documented result of a future Agentic Wallet `market-order swap` invocation. It requires a canonical durable gate UUID and accepts an acknowledgment only when the envelope reports literal success with a nonempty, bounded, option-safe ASCII `orderId`.

An accepted order ID means only `submitted_pending_confirmation`. The resulting receipt records the gate correlation and provider order identity while keeping `terminal: false`, `executionSucceeded: false`, `statusLookupRequired: true`, and `automaticRetryAllowed: false`. Provider-added metadata is ignored for lifecycle purposes, so even a status-like field cannot bypass the mandatory separate order lookup.

An invalid envelope, explicit provider failure, unsafe order ID, or invalid gate correlation produces `submission_outcome_unknown`, no receipt, reconciliation required, execution success false, and automatic retry forbidden. This is deliberately conservative because a failed or malformed local response does not prove that the provider saw no request. No command is invoked by this component.

### M10.36 acceptance criteria

- A documented successful envelope yields only a gate-bound pending-confirmation receipt.
- An order ID never proves terminal execution success.
- Additive provider metadata cannot promote the acknowledgment to `FINISHED` or `FAILED`.
- Invalid envelopes, provider-reported failure, unsafe order IDs, and invalid gate IDs remain unknown outcomes.
- Every path requires reconciliation and forbids automatic retry.
- Focused tests cover the documented response, additive metadata, malformed envelopes, negative responses, unsafe IDs, and invalid correlation.
- No schema, persistence, runtime wiring, route, process invocation, provider call, wallet mutation, funding, mutating command runner, executor, polling, retry, reconciliation implementation, or real order is added.

## M10.37 — Closed swap status lookup preview

M10.37 adds the next pure, unwired reconciliation artifact without performing a provider read. It accepts only the exact M10.36 receipt: Agentic Wallet provider, canonical gate UUID, safe provider order ID, pending-confirmation lifecycle, acknowledged submission, nonterminal and unsuccessful execution state, mandatory lookup, and forbidden automatic retry.

The successful result is the documented `market-order list --orderId <orderId> --json` argument sequence. It preserves the gate and provider order identities and is marked read-only, non-executable, and provider-call-unstarted. The shared order-ID grammar requires an alphanumeric first character followed only by bounded ASCII alphanumerics, `.`, `_`, `:`, or `-`, preventing leading options and path-like values from reaching a future CLI boundary.

This preview cannot retry the original submission and does not yet execute one lookup, schedule polling, parse a status response, persist reconciliation, or report a terminal outcome.

### M10.37 acceptance criteria

- Only an exact nonterminal M10.36 receipt can produce a lookup preview.
- The arguments exactly match `market-order list --orderId <orderId> --json`.
- The gate and provider order identities remain correlated.
- Order IDs use the same bounded option-safe ASCII grammar at response and command boundaries.
- Changed lifecycle, success, terminal, lookup, acknowledgment, provider, kind, identity, or retry facts fail closed.
- The preview is read-only and non-executable and starts no provider call.
- Focused tests cover the exact command and every protected receipt invariant.
- No schema, persistence, runtime wiring, route, process invocation, provider call, wallet mutation, funding, mutating command runner, executor, polling, retry, reconciliation, or real order is added.

## M10.38 — Conservative swap status response interpretation

M10.38 adds a pure, unwired interpreter for the documented response shape of a future `market-order list --orderId ... --json` call. It accepts a row only when the durable M10.34 gate and exact M10.36 receipt are both structurally valid and mutually correlated. The response must contain exactly one market order on page one and preserve the provider order ID, BSC chain, approved token addresses and symbols, exact source quantity, and exact slippage. Address case and numerically equivalent decimal representations are normalized without native floating-point arithmetic.

The only accepted provider states are `PENDING`, `FINISHED`, and `FAILED`. `PENDING` remains nonterminal and requires another status lookup. `FINISHED` is accepted only with a valid EVM transaction hash and reports provider execution success. `FAILED` is terminal without execution success. Provider timestamps must be explicit ISO timestamps in chronological order; ambiguous pages, mismatched payloads, unknown states, and invalid hashes fail closed.

Provider execution status is deliberately distinct from financial reconciliation. The published status-row example does not contain actual received quantity, so every valid observation retains `financialReconciliationRequired: true`, `financialReconciliationComplete: false`, and `actualReceivedQuantity: null`. Submission retry is forbidden for every outcome, including provider failure and malformed responses. Additive fields cannot manufacture missing financial evidence.

### M10.38 acceptance criteria

- The exact gate, receipt, provider order ID, market type, chain, token direction, symbols, source quantity, and slippage remain correlated.
- Exactly one documented row is required; malformed envelopes, explicit provider failures, and ambiguous pagination fail closed.
- Only `PENDING`, `FINISHED`, and `FAILED` are accepted, with coherent explicit timestamps.
- `FINISHED` requires a valid EVM transaction hash but does not claim actual received quantity or completed financial reconciliation.
- `PENDING` alone remains nonterminal and requires another lookup; both terminal states stop lookup without permitting submission retry.
- Focused tests cover all states, exact correlation, equivalent decimals and address case, invalid envelopes, pagination, timestamps, statuses, hashes, and altered gate or receipt evidence.
- No schema, persistence, runtime wiring, route, process invocation, provider call, polling, wallet mutation, funding, mutating command runner, executor, automatic retry, completed financial reconciliation, or real order is added.

## M10.39 — Monotonic swap status progression

M10.39 adds a pure, unwired transition policy over structurally complete M10.38 observations. It accepts one initial observation, recognizes an exact repeat without requiring another future write, and permits a pending observation to refresh or progress to either `FINISHED` or `FAILED`. A normalized observation validator rechecks canonical gate and order identities, provider status and transaction hash, valid chronological dates, every derived lifecycle flag, incomplete financial reconciliation, and forbidden submission retry.

Observations for different gates or provider orders cannot be combined. Provider booking time is immutable and update time cannot move backward. A transaction hash may first appear while pending or failed, but once established it cannot change or disappear. A terminal status cannot return to pending or switch between finished and failed; a same-terminal refresh is admissible only with non-regressing time and the same established hash.

When a candidate is blocked, it is not accepted for future persistence and the result preserves only whether the preceding valid state still requires another lookup. Every accepted or blocked transition continues to require financial reconciliation because no actual received quantity exists, and none permits resubmitting the swap.

### M10.39 acceptance criteria

- Complete normalized observation structure and all derived lifecycle invariants are revalidated.
- Initial observations are accepted and exact replay is explicitly idempotent.
- Pending observations may refresh or progress to `FINISHED` or `FAILED`.
- Gate/order identity, booking time, and an established transaction hash are immutable; update time cannot regress.
- Terminal status cannot regress or switch, while a consistent same-terminal refresh may advance provider update time.
- A blocked candidate never replaces prior evidence and preserves only the prior state's lookup requirement.
- Financial reconciliation remains incomplete and submission retry remains forbidden on every path.
- Focused tests cover initial states, replay, valid progression, refreshes, identity drift, time regression, hash mutation, terminal mutation, and malformed evidence.
- No schema, persistence, runtime wiring, route, process invocation, provider call, polling, wallet mutation, funding, mutating command runner, executor, automatic retry, completed financial reconciliation, or real order is added.

## M10.40 — Durable swap submission receipt

M10.40 adds an unwired serializable Prisma store for the exact M10.36 pending-confirmation receipt. Before insertion, the store validates the complete receipt, takes a dedicated PostgreSQL advisory transaction lock, reloads its durable M10.34 gate, and reapplies the structural gate policy. Receipt recording time must be valid and cannot predate gate creation.

The gate ID is the receipt's primary identity and foreign key, so at most one submission acknowledgment can follow a gate. Provider order ID is independently unique across all receipts. Exact gate/order replay returns the original immutable row and recording time; a changed order for the same gate, an order already bound elsewhere, a missing or malformed gate, malformed receipt facts, or an invalid clock fails closed.

PostgreSQL constraints preserve the exact Agentic Wallet provider, bounded option-safe order-ID grammar, `pending_confirmation` lifecycle, acknowledged submission, nonterminal and unsuccessful state, required status lookup, and forbidden automatic retry. The existing gate store now explicitly records `createdAt` from its transaction clock, matching the final stop recheck and confirmation consumption clock rather than relying on an independent database default.

### M10.40 acceptance criteria

- Only an exact M10.36 receipt for an existing structurally valid durable gate can be recorded.
- Each gate has at most one receipt and each provider order ID can belong to at most one gate.
- Exact replay is idempotent and preserves the original recording time; changed identity reuse fails closed.
- Receipt recording cannot predate gate creation.
- Database constraints preserve every closed receipt lifecycle and safety invariant.
- Gate creation uses one explicit transaction clock for creation, final stop recheck, and confirmation consumption.
- Unit and PostgreSQL E2E tests prove persistence, replay, conflict handling, gate validation, temporal validation, and database enforcement.
- No runtime wiring, route, process invocation, provider call, polling, wallet mutation, funding, mutating command runner, executor, automatic retry, status-observation persistence, completed financial reconciliation, or real order is added.

## M10.41 — Durable swap status history

M10.41 adds an unwired serializable Prisma store for accepted M10.38 status observations. The store validates each candidate, takes a dedicated advisory transaction lock, reloads the exact M10.40 receipt, loads the latest durable observation by an immutable database sequence, and delegates every progression decision to the M10.39 monotonic transition policy.

An exact repeat of the latest observation returns its original row and recording time without appending history. An accepted refresh or status progression creates a new immutable row. Missing or malformed receipts, gate/provider/order identity divergence, malformed observations, regressed provider time, changed booking time or transaction hash, terminal mutation, invalid generated identity, and invalid recording clocks fail closed.

PostgreSQL uses a composite foreign key to bind every observation to the exact receipt gate, provider, and provider order ID. Database checks preserve the Agentic Wallet provider, option-safe order identity, the closed `PENDING`/`FINISHED`/`FAILED` vocabulary, canonical lowercase EVM hashes, the mandatory hash for `FINISHED`, and provider timestamp ordering. Persisted rows re-derive all lifecycle flags, keep actual received quantity unknown, forbid submission retry, and leave financial reconciliation incomplete.

### M10.41 acceptance criteria

- Only a structurally complete status observation for an exact durable receipt can enter history.
- Durable sequence order selects the latest fact unambiguously even when timestamps tie.
- Exact latest replay is idempotent; each accepted changed fact is append-only.
- The M10.39 policy blocks identity drift, temporal regression, hash mutation, and terminal-state changes before insertion.
- PostgreSQL repeats identity, status, hash, and timestamp invariants independently of application validation.
- Unit and PostgreSQL E2E tests prove initial persistence, replay, terminal progression, regression rejection, receipt correlation, malformed evidence rejection, and database enforcement.
- Financial reconciliation remains incomplete, actual received quantity remains unknown, and submission retry remains forbidden.
- No runtime wiring, route, process invocation, provider call, lookup, polling, wallet mutation, funding, mutating command runner, executor, automatic retry, completed financial reconciliation, or real order is added.

## M10.42 — Durable swap reconciliation projection

M10.42 adds an unwired read-only Prisma store that reconstructs one conservative state from the exact M10.40 receipt and the highest M10.41 database sequence. A missing receipt returns no state. A receipt without observations remains `awaiting_status_observation`; the three durable provider statuses project to `provider_pending`, `provider_finished_financial_reconciliation_required`, or `provider_failed`.

The reader validates the requested gate identity before persistence access and revalidates every durable receipt and observation field after loading. The receipt must retain the requested gate, and any latest observation must preserve its gate/provider/order identity and cannot have been recorded before the receipt. Malformed or inconsistent database evidence raises a closed error instead of producing a partial or optimistic state.

The projection carries provider status and transaction hash only when durable evidence exists. It derives lookup, terminal, and provider-execution flags from the latest observation, but always keeps `financialReconciliationRequired: true`, `financialReconciliationComplete: false`, `actualReceivedQuantity: null`, and `submissionRetryAllowed: false`. In particular, provider `FINISHED` never becomes a claim about credited target quantity or completed accounting.

### M10.42 acceptance criteria

- A malformed gate identity fails before a database query, while an absent receipt returns no state.
- A receipt without observations remains explicitly awaiting the first status observation and lookup-required.
- Only the latest immutable sequence determines pending, finished, or failed projection state.
- Finished provider status remains financially unreconciled with unknown actual received quantity.
- Failed provider status remains terminal and cannot authorize a submission retry.
- Malformed receipt/observation structure, identity divergence, and pre-receipt observation recording fail closed.
- Unit and PostgreSQL E2E tests cover absence, all projection phases, latest-state selection, conservative financial flags, and inconsistent durable evidence.
- No schema, write, runtime wiring, route, process invocation, provider call, lookup, polling, wallet mutation, funding, mutating command runner, executor, automatic retry, completed financial reconciliation, or real order is added.

## M10.43 — Terminal-aware swap status lookup decision

M10.43 adds a pure unwired decision policy above the M10.42 projection. The immutable M10.40 receipt always retains its original lookup-required acknowledgment state, so it cannot safely decide whether a later lookup should still occur. The new policy instead validates and consumes the latest projected lifecycle state.

`awaiting_status_observation` and `provider_pending` produce the exact inert M10.37 `market-order list --orderId <orderId> --json` preview. `provider_finished_financial_reconciliation_required` and `provider_failed` return `status_lookup_not_required` with no command. This creates an explicit terminal stop without scheduling, invoking, or polling the provider.

The projection validator checks its scope, provider, canonical gate, option-safe provider order ID, valid receipt and observation dates, observation identity presence, canonical optional transaction hash, exact phase/status/terminal/success/lookup combinations, incomplete financial reconciliation, unknown actual received quantity, and forbidden submission retry. Invalid evidence blocks without a command or provider call.

### M10.43 acceptance criteria

- Awaiting-first-observation and pending projections produce only the exact read-only non-executable lookup preview.
- Finished and failed projections require no further status lookup and produce no command.
- Finished still requires financial reconciliation and cannot claim an actual received quantity.
- Failed remains terminal and cannot permit submission retry.
- Every complete projection invariant is revalidated before a decision; malformed evidence blocks closed.
- Provider call remains unstarted on ready, terminal, and blocked paths.
- Focused unit tests cover both lookup-required phases, both terminal phases, and malformed identity, time, hash, lifecycle, financial, and retry facts; PostgreSQL E2E proves the durable projection drives the same terminal stop.
- No schema, persistence, runtime wiring, route, process invocation, provider call, lookup, polling, wallet mutation, funding, mutating command runner, executor, automatic retry, completed financial reconciliation, or real order is added.

## M10.44 — Closed read-only swap status lookup runner

M10.44 adds a dedicated, unwired process runner for one read-only Agentic Wallet operation. Only an M10.43 lookup-ready decision can be converted by the provided boundary helper into `market_order_status_lookup`; terminal and blocked decisions produce no command. The runner independently revalidates the provider order identity and maps the one-item command allowlist to `market-order list --orderId <id> --json`.

Before the lookup, the runner executes the existing pinned CLI check and requires exactly version `1.10.0` with no update required. Quote and status lookup now share one version-contract implementation while retaining operation-specific errors. Both provider commands use the existing JSON process boundary: `spawn` with `shell: false`, hidden Windows process, ignored stdin, suppressed stderr, bounded 1–30 second timeout, caller cancellation, 64 KiB stdout cap, nonzero-exit rejection, and strict JSON parsing.

The runner performs exactly one version check and at most one lookup when explicitly called. It has no retry, loop, schedule, persistence, response interpretation, or terminal-status mutation. It is not registered in NestJS and was not invoked against the local CLI or provider during development or verification.

### M10.44 acceptance criteria

- Only a lookup-ready M10.43 decision converts to the typed runner command; terminal and blocked decisions convert to no command.
- The runner accepts only `market_order_status_lookup` and the bounded option-safe provider order identity.
- Arguments exactly match `market-order list --orderId <id> --json`; unsupported kinds and unsafe IDs fail before process invocation.
- The CLI version must exactly match pinned `1.10.0` before lookup.
- Process execution remains no-shell, bounded, cancelable, JSON-only, and without automatic retry.
- Focused tests cover decision conversion, the one-item allowlist, exact arguments, unsafe identities, unsupported command kinds, timeout bounds, and version acceptance/rejection.
- No schema, persistence, runtime wiring, route, live process invocation, provider call, polling, response interpretation orchestration, status write, wallet mutation, funding, mutating command runner, executor, automatic retry, completed financial reconciliation, or real order is added.

## M10.45 — One-shot swap status reconciliation attempt

M10.45 adds an unwired coordinator for one caller-authorized reconciliation attempt. It accepts the immutable durable gate and receipt, revalidates both, loads the latest M10.42 projection by gate ID, and requires exact gate, provider, and provider-order correlation. Missing, malformed, or divergent evidence blocks before the runner. A valid terminal projection returns `status_lookup_not_required` without provider access.

For a lookup-required projection, the coordinator reuses M10.43 to create the decision and M10.44 to execute at most one read-only command. The raw response passes through the complete M10.38 gate/receipt correlation and response interpretation. Invalid provider evidence is returned without persistence; a valid pending, finished, or failed observation is delegated once to the M10.41 append-only monotonic store. Store validation remains authoritative for concurrent progress, replay, regression, and terminal immutability.

Runner and persistence errors propagate to the explicit caller and are never retried by this component. There is no loop, timer, backoff, schedule, queue, route, or NestJS registration. Tests use doubles only, so development and verification make no local CLI or provider call. Provider completion still supplies no actual received quantity: every result keeps financial reconciliation required and incomplete and forbids submission retry.

### M10.45 acceptance criteria

- Invalid gate, receipt, correlation, missing projection, malformed projection, or divergent durable identity blocks before provider access.
- A terminal latest projection performs no lookup and no persistence attempt.
- One explicit nonterminal invocation performs at most one runner call and forwards caller cancellation.
- Only a fully valid M10.38 response reaches the M10.41 observation store; invalid responses produce no write.
- Pending, finished, and failed observations retain their conservative lookup and execution flags while financial reconciliation remains incomplete.
- Runner and persistence errors propagate without retry, and the monotonic store remains authoritative under concurrent change.
- Focused tests cover successful pending and finished observations, terminal stop, invalid context, absent/divergent projection, invalid response, cancellation forwarding, and single-call failure behavior.
- No schema, runtime wiring, route, live process invocation, provider call during verification, polling, schedule, wallet mutation, funding, mutating command runner, executor, automatic retry, completed financial reconciliation, or real order is added.

## M10.46 — Durable swap status reconciliation context

M10.46 adds an unwired read-only Prisma store for the complete durable input required by a future caller-authorized M10.45 attempt. A canonical gate ID drives one Prisma read operation that includes the immutable submission gate, its exact receipt, and only the latest status observation ordered by the database sequence. A missing gate or missing receipt returns no complete context rather than fabricating lifecycle evidence.

Every returned gate passes the existing structural gate policy. The receipt and optional observation use the same persisted mappers as their authoritative stores, and exact gate/provider/order identities plus receipt-after-gate timing are checked again. One centralized pure projection function now serves both the existing M10.42 state reader and the new context reader, so awaiting, pending, finished-financially-unreconciled, and failed phases cannot drift between read paths.

The reader exposes no runner or write dependency and is not registered in NestJS. It cannot invoke the CLI, call the provider, persist a status, or schedule another read. The M10.45 coordinator remains separately unwired and still requires an explicit caller; connecting these components is future scope.

### M10.46 acceptance criteria

- A malformed gate ID fails before persistence access; an absent gate or receipt returns no complete context.
- One Prisma read operation loads the exact gate, receipt, and latest observation by immutable database sequence.
- Persisted gate, receipt, observation, identity correlation, and receipt-after-gate timing are revalidated.
- The M10.42 state reader and M10.46 context reader share one conservative projection implementation.
- Awaiting and pending contexts retain lookup-required state; terminal projections remain financially unreconciled and forbid submission retry.
- Unit and PostgreSQL E2E tests cover identity rejection, absence, awaiting and pending projections, exact durable correlation, and malformed evidence.
- No schema, runtime wiring, route, process invocation, provider call, lookup, write, polling, schedule, wallet mutation, funding, mutating command runner, executor, retry, completed financial reconciliation, or real order is added.

## M10.47 — Durable-context one-shot status reconciliation

M10.47 narrows the M10.45 attempt API from three caller-supplied durable artifacts to one canonical gate ID. The coordinator loads M10.46 context internally, then independently revalidates the gate, receipt, receipt-after-gate timing, reconciliation projection, and exact gate/provider/order identities. A missing context returns a blocked result before provider access; malformed or inconsistent context also fails closed.

The remainder of the flow stays explicit and bounded. Terminal context returns `status_lookup_not_required`. Nonterminal context can invoke the dedicated read-only runner once, interpret the response conservatively, and delegate one valid observation to the monotonic store. Runner or persistence errors propagate without retry. Caller cancellation is forwarded to the single runner invocation.

PostgreSQL E2E composes the real context and observation stores with a runner test double. It persists one terminal `FINISHED` observation, reloads the durable terminal projection on the next explicit attempt, and proves the runner was called only once. This verifies composition without invoking the Agentic Wallet CLI or provider.

### M10.47 acceptance criteria

- The coordinator accepts only a gate ID and obtains gate, receipt, and projection evidence from M10.46.
- Missing, malformed, temporally invalid, or identity-divergent context blocks before provider access.
- Terminal durable context performs no lookup or write.
- One explicit nonterminal call performs at most one read-only lookup and one monotonic persistence attempt.
- A later explicit call reloads persisted terminal evidence and stops before a second runner invocation.
- Runner and store failures propagate without retry, and caller cancellation remains forwarded.
- Unit tests cover context validation, all provider outcomes, terminal stop, invalid response, cancellation, and failures; PostgreSQL E2E covers durable terminal persistence and reload.
- No schema, runtime wiring, route, live process invocation, provider call, polling, schedule, wallet mutation, funding, mutating command runner, executor, automatic retry, completed financial reconciliation, or real order is added.

## M10.48 — Per-gate concurrent status reconciliation guard

M10.48 places a process-local active-attempt claim around the complete M10.47 one-shot boundary. The first explicit call for a gate proceeds normally. Any overlapping call for that same gate returns a blocked result with `reconciliation_attempt_in_progress` before loading durable context, starting the provider runner, or attempting persistence. It does not wait for or share the first call, so caller cancellation remains isolated.

The claim is released in a `finally` block after every admitted attempt, including runner and persistence failures. A later explicit call can therefore reload the latest durable state and independently apply the terminal stop. Claims are keyed per gate, and the guard intentionally covers only one coordinator instance in the current process. It is not a database lease or distributed lock; multi-process coordination must be designed separately before any multi-instance runtime wiring.

### M10.48 acceptance criteria

- At most one attempt for a gate can be active in one coordinator instance.
- An overlapping same-gate call blocks before context loading, provider access, and persistence.
- The blocked call neither waits for the active call nor shares its cancellation signal.
- Success and propagated failure both release the gate for a later explicit attempt.
- The existing durable validation, terminal stop, one-lookup bound, monotonic write, and no-retry behavior remain unchanged for admitted calls.
- Focused unit tests prove overlap suppression and claim release after success and lookup failure.
- The limitation to process-local coordination is explicit; no multi-process guarantee is claimed.
- No schema, runtime wiring, route, live process invocation, provider call, polling, waiting, schedule, wallet mutation, funding, mutating command runner, executor, automatic retry, completed financial reconciliation, or real order is added.

## M10.49 — Pending-status lookup cadence decision

M10.49 adds a pure, unwired cadence decision above M10.43. A state awaiting its first status observation remains immediately eligible for the existing inert read-only command preview. Once the latest durable state is provider `PENDING`, a repeated preview is withheld until the immutable observation recording time plus an explicit minimum interval. The result exposes that exact next eligible instant but never waits, schedules, invokes, or persists anything.

The caller must supply an evaluation time and a safe-integer interval from 1,000 through 3,600,000 milliseconds. Invalid intervals, invalid clocks, evaluation before the receipt, and evaluation before the latest observation fail closed. At the exact eligibility boundary the preview becomes ready. Finished and failed states preserve M10.43's terminal stop without requiring valid cadence inputs because no further lookup is permitted.

This policy is deliberately not integrated into the M10.48 coordinator yet. Selecting an operational interval, injecting an authoritative clock, and enforcing the decision at the runner boundary remain separately reviewable work. Financial reconciliation remains incomplete, actual received quantity remains unknown, and submission retry stays forbidden.

### M10.49 acceptance criteria

- Awaiting the first observation produces the existing inert lookup preview without a cooldown.
- A provider-pending state before its observation time plus the selected interval returns deferred with no command.
- The exact interval boundary and later evaluation produce the existing read-only preview.
- The interval is an explicit safe integer from one second through one hour; invalid values block closed.
- Invalid or regressed evaluation times block without a command.
- Finished and failed states remain lookup-not-required regardless of unused cadence inputs.
- Every result keeps provider call unstarted, financial reconciliation incomplete, and submission retry forbidden.
- Focused unit tests cover initial, deferred, exact-boundary, terminal, invalid-interval, invalid-clock, and invalid-state behavior.
- No coordinator integration, schema, persistence, runtime wiring, route, process invocation, provider call, waiting, polling, timer, schedule, wallet mutation, funding, mutating command runner, executor, retry, completed financial reconciliation, or real order is added.

## M10.50 — Pending-status cadence enforcement

M10.50 integrates the M10.49 decision into the unwired M10.48 guarded one-shot coordinator. The coordinator receives an injected clock and explicit minimum interval. It validates and correlates durable gate, receipt, and reconciliation evidence first, evaluates cadence second, and reaches the dedicated read-only runner only when the first observation is still absent or a durable provider-`PENDING` state has reached its exact eligibility boundary.

A pending state inside the interval returns `status_lookup_deferred`, the evaluation instant, and the exact next eligible instant without invoking the runner or observation store. Invalid intervals and regressed clocks block closed. Terminal evidence still returns lookup-not-required, and an admitted call remains bounded to one lookup and one monotonic persistence attempt. The process-local per-gate claim continues to cover the entire operation, including deferred decisions, and every later attempt reloads durable context rather than trusting prior in-memory timing state.

The coordinator remains unregistered and has no automatic caller. PostgreSQL E2E composes the real context and observation stores with a runner test double to prove that durable `PENDING` evidence prevents a call one millisecond before the boundary and permits exactly one call at the boundary. No Agentic Wallet CLI or provider was invoked.

### M10.50 acceptance criteria

- The coordinator takes an explicit clock and minimum interval rather than selecting an operational cadence internally.
- Durable context is validated before clock evaluation or provider access.
- Awaiting-first-observation context remains immediately eligible for one read-only lookup.
- Provider-pending context before the exact cadence boundary returns deferred with no runner call or write.
- The exact boundary and later instants admit at most one lookup and one monotonic persistence attempt.
- Invalid or regressed clocks and out-of-range intervals block before provider access.
- Terminal suppression, same-gate overlap protection, cancellation forwarding, propagated failures, and forbidden submission retry remain unchanged.
- Focused unit tests and PostgreSQL E2E cover deferral, exact-boundary admission, malformed inputs, and durable enforcement with test doubles.
- No schema, NestJS registration, route, live process invocation, provider call, waiting, polling, timer, schedule, wallet mutation, funding, mutating command runner, executor, retry, completed financial reconciliation, or real order is added.

## M10.51 — Bounded due status-reconciliation discovery

M10.51 adds an unwired read-only Prisma store that discovers which durable Agentic Wallet status reconciliations are due without invoking them. The caller supplies a valid evaluation time, the same explicit one-second-to-one-hour minimum interval used by M10.49–M10.50, and a limit from one through 100. A receipt with no status observation is eligible from its recording time; a receipt whose latest observation is `PENDING` is eligible at that observation's recording time plus the interval. Latest `FINISHED` and `FAILED` evidence is excluded by the query.

The query uses each receipt's highest observation sequence, orders candidates by the exact derived eligibility instant and then gate ID, and applies the limit in PostgreSQL. Returned records expose the derived phase and exact eligibility instant but remain advisory. They do not contain the complete gate or grant permission to call the provider. A future caller must pass each gate ID to M10.50, which reloads and revalidates all durable evidence and cadence at the runner boundary; a race can therefore only cause a safe terminal/deferred/block result.

The reader validates every input before persistence access and fails closed if a selected row cannot represent either awaiting-first-observation or provider-pending evidence. It is not registered in NestJS and has no claim, lease, runner, coordinator, timer, worker, or loop. PostgreSQL E2E proves awaiting inclusion, pre-boundary omission, exact-boundary inclusion, and terminal exclusion without calling the Agentic Wallet CLI or provider.

### M10.51 acceptance criteria

- Evaluation time, minimum lookup interval, and limit are explicit and validated before database access.
- The limit is a safe integer from one through 100, and the interval remains bounded from one second through one hour.
- Receipts awaiting their first observation are eligible no earlier than their durable recording time.
- Latest provider-`PENDING` evidence is eligible exactly at its recording time plus the interval.
- Latest `FINISHED`, `FAILED`, future, or not-yet-due evidence is not returned.
- Results are deterministically ordered and bounded in PostgreSQL.
- Selected rows are structurally validated and expose only advisory identity/timing facts with reconciliation incomplete and submission retry forbidden.
- M10.50 remains responsible for complete context reload, cadence recheck, per-gate guarding, runner invocation, and persistence.
- Focused unit tests and PostgreSQL E2E cover bounded input, malformed evidence, awaiting, deferred, boundary-ready, and terminal behavior.
- No schema, claim, lease, NestJS registration, route, live process invocation, provider call, waiting, polling, timer, worker, schedule, wallet mutation, funding, mutating command runner, executor, retry, completed financial reconciliation, or real order is added.

## M10.52 — Manual bounded status-reconciliation cycle

M10.52 adds an unwired `runOnce` composition over M10.51 discovery and M10.50 reconciliation attempts. One explicit caller supplies the evaluation time, minimum lookup interval, batch limit, and optional cancellation signal. The cycle validates inputs before discovery, then independently checks that the returned array stays within the limit, contains only structurally valid cadence-coherent candidates evaluated for the exact requested instant, and has no duplicate gate identity.

Admitted candidates are processed sequentially in deterministic discovery order. Each gate is still reloaded and revalidated by M10.50 immediately before its possible read-only provider call. Non-throwing results are retained and counted as observation recorded, lookup deferred, lookup no longer required, invalid provider response, or blocked. Every cycle result explicitly reports that no automatic retry occurred, financial reconciliation remains incomplete, and submission retry remains forbidden.

Candidate-read, runner, or observation-store exceptions stop the cycle at that point and propagate to the explicit caller. The remaining candidates are not attempted and the failed gate is not retried. This fail-fast choice avoids turning one provider outage into the rest of a bounded batch of calls. PostgreSQL E2E uses the real durable readers/writer with a runner double: the first manual cycle records `FINISHED`, and the second finds no due work without another runner call.

### M10.52 acceptance criteria

- One explicit call performs exactly one bounded candidate discovery.
- Invalid cycle input blocks before discovery.
- Oversized, duplicate, structurally invalid, wrong-evaluation, or wrong-cadence candidate batches block before the first attempt.
- Valid candidates execute sequentially in deterministic discovery order with the caller signal forwarded.
- Every candidate still passes through M10.50 complete durable-context and cadence revalidation.
- Non-throwing attempt outcomes are retained and summarized without claiming financial reconciliation.
- Discovery, runner, and persistence errors propagate, stop the remaining batch, and cause no retry.
- Focused unit tests cover empty/summarized cycles, sequentiality, cancellation, invalid batches, discovery failure, and fail-fast attempt failure; PostgreSQL E2E covers durable terminal completion and the next empty cycle.
- No schema, claim, lease, NestJS registration, route, live process invocation, live provider call, waiting, polling, timer, worker, schedule, wallet mutation, funding, mutating command runner, executor, retry, completed financial reconciliation, or real order is added.

## M10.53 — Process-local reconciliation-cycle guard

M10.53 adds one process-local active-call claim around the complete M10.52 `runOnce` boundary. Inputs are still validated first. While one valid call is active, another valid call on the same cycle instance returns immediately with `reconciliation_cycle_in_progress`, an empty candidate/outcome summary, and no candidate-store or attempt access. The blocked caller neither waits for the active call nor shares its cancellation signal.

The claim covers discovery and every sequential attempt and is released in a `finally` block after normal completion or any propagated candidate-read, runner, or persistence failure. A later explicit call can therefore discover and reload current durable evidence normally. The existing M10.48 per-gate guard remains a separate inner defense.

This claim coordinates only one cycle instance in one process. It is not a database lease or distributed lock and provides no guarantee across instances or processes; that decision remains mandatory before any multi-process runtime wiring. The cycle remains explicit and unwired with no automatic caller, waiting, polling, timer, worker, schedule, retry, or live provider invocation.

### M10.53 acceptance criteria

- At most one `runOnce` call can be active per cycle instance.
- A valid overlapping call returns immediately before candidate discovery and every attempt.
- The blocked result reports `reconciliation_cycle_in_progress` with zero candidates, attempts, outcomes, and outcome counts.
- The blocked caller does not wait, share cancellation, or retry.
- Success and propagated discovery, runner, or persistence failure release the claim for a later explicit call.
- Admitted calls preserve bounded discovery, sequential attempts, cadence revalidation, fail-fast propagation, and no retry.
- Focused unit tests prove overlap suppression and release after discovery and attempt failures.
- The limitation to one instance in one process is explicit; no distributed or multi-process guarantee is claimed.
- No schema, database lease, NestJS registration, route, live process invocation, live provider call, waiting, polling, timer, worker, schedule, wallet mutation, funding, mutating command runner, executor, retry, completed financial reconciliation, or real order is added.

## M10.54 — Reconciliation-cycle cancellation gates

M10.54 makes the optional caller signal effective across the complete M10.53 cycle boundary rather than only forwarding it to each admitted attempt. After normal input validation and overlap suppression, an admitted call checks cancellation before candidate discovery. It checks again as soon as discovery returns and before every sequential attempt.

A pre-cancelled call therefore performs no candidate-store access. If cancellation arrives while the non-cancelable bounded candidate read is in progress, its returned batch initiates no attempt. If cancellation arrives during or after one attempt, the in-progress attempt receives the same signal and the next gate is not started. Work already completed successfully is not rolled back.

Cancellation propagates the signal's original abort reason and is never converted into a normal cycle result or retried. The M10.53 `finally` release remains authoritative, so a later explicit uncancelled call can proceed. This milestone does not widen the candidate-store interface, register the cycle, choose an operational cadence, or add any automatic lifecycle.

### M10.54 acceptance criteria

- A pre-cancelled admitted call rejects before candidate discovery.
- Cancellation that arrives during discovery rejects after the bounded read and before batch attempts.
- Cancellation between sequential attempts prevents the next candidate from starting.
- An active attempt continues to receive the exact caller signal for its own cancellation handling.
- The original abort reason propagates without being counted, hidden, or retried.
- Every cancellation path releases the process-local cycle claim for a later explicit call.
- Existing input validation, overlap suppression, bounded discovery, batch validation, cadence revalidation, fail-fast propagation, and no-retry behavior remain unchanged.
- Focused unit tests cover pre-discovery, during-discovery, and between-attempt cancellation plus claim release.
- No schema, candidate-store cancellation contract, database lease, NestJS registration, route, live process invocation, live provider call, waiting, polling, timer, worker, schedule, wallet mutation, funding, mutating command runner, executor, retry, completed financial reconciliation, or real order is added.

## M10.55 — Reconciliation-cycle input snapshot

M10.55 isolates one admitted M10.54 cycle from mutable caller-owned request state. After the existing input validation and before the first asynchronous boundary, the cycle copies the evaluation `Date`, minimum lookup interval, and batch limit into a private snapshot. Overlap reporting, candidate-batch validation, pending cadence correlation, and the final result use only these captured facts.

The candidate store receives a second defensive copy rather than the private snapshot. This matters because TypeScript `readonly` does not make a JavaScript `Date` immutable at runtime: mutation by a caller or adapter could otherwise change the evaluation instant while discovery is pending. Separate copies keep the originally validated request authoritative without changing the store interface.

The snapshot is process-local and ephemeral. It is not persisted, does not claim candidates, and does not provide cross-process coordination. Existing cancellation gates, overlap suppression, sequential attempt order, inner durable-context reload, fail-fast errors, and no-retry behavior remain unchanged.

### M10.55 acceptance criteria

- The complete cycle input is validated before snapshot creation.
- Evaluation time, minimum lookup interval, and limit are copied before the first `await`.
- The internal evaluation `Date` is not the caller-owned instance.
- Candidate discovery receives a separate object and separate `Date` from the internal snapshot.
- Caller mutation after invocation cannot change discovery semantics, batch validation, cadence checks, or reporting.
- Discovery-adapter mutation cannot change internal batch validation, cadence checks, or reporting.
- Cancellation, overlap suppression, bounds, sequential attempts, durable revalidation, fail-fast propagation, and no retry remain unchanged.
- Focused unit coverage mutates caller and discovery inputs while discovery is pending and proves the validated snapshot remains authoritative.
- No schema, persistence change, database lease, NestJS registration, route, live process invocation, live provider call, waiting, polling, timer, worker, schedule, wallet mutation, funding, mutating command runner, executor, retry, completed financial reconciliation, or real order is added.

## M10.56 — Reconciliation-candidate batch snapshot

M10.56 isolates the admitted sequential work from mutable adapter-owned discovery output. After the complete M10.52 candidate-batch validation succeeds and before the first attempt begins, the cycle copies the ordered array, every candidate record, and all candidate `Date` values. Gate selection, attempt order, outcome evidence, and final reporting use only that private snapshot.

Copying occurs after validation so malformed, duplicate, oversized, or cadence-divergent adapter output still fails closed. It occurs before the first attempt `await` so mutation while an earlier gate is being reconciled cannot redirect a later attempt or rewrite its audit row. Each M10.50 attempt still reloads complete durable context, making the snapshot an ephemeral coordination fact rather than a persistence claim or source of financial authority.

### M10.56 acceptance criteria

- The complete discovery batch is validated before snapshot creation.
- Candidate order, identity, phase, and invariant flags are copied before the first attempt.
- Every candidate `Date` is a distinct object in the private snapshot.
- Later mutation, reordering, or truncation of the adapter-owned array cannot alter admitted attempts or reporting.
- Later mutation of an adapter-owned candidate cannot change a gate ID or cadence evidence used by the cycle.
- M10.50 continues to reload and validate authoritative durable context for each copied gate ID.
- Input isolation, cancellation, overlap suppression, bounds, sequential execution, fail-fast propagation, and no retry remain unchanged.
- Focused unit coverage mutates the adapter-owned array and candidates during the first attempt and proves the original validated batch remains authoritative.
- No schema, persistence change, database claim or lease, NestJS registration, route, live process invocation, live provider call, waiting, polling, timer, worker, schedule, wallet mutation, funding, mutating command runner, executor, retry, completed financial reconciliation, or real order is added.

### Official sources reviewed

- [Binance Developer Docs: Agentic Wallet overview](https://developers.binance.com/en/docs/products/agentic-wallet/welcome), install guide, security settings, market-order flow, and Skills reference (reviewed 2026-09-30).
- [Binance's official `binance-skills-hub`](https://github.com/binance/binance-skills-hub), including the Agentic Wallet skill plus preflight, wallet-view, wallet-setting, gas, security, and market-order references (reviewed 2026-09-30).
- [Binance Agentic Wallet market-order reference](https://github.com/binance/binance-skills-hub/blob/main/skills/binance-web3/binance-agentic-wallet/references/market-order.md), including the distinct quote, swap, and order-list commands, explicit MEV/gas controls, and published quote, submission, and status response shapes (reviewed again 2026-10-03).
- [Binance Spot REST security documentation](https://developers.binance.com/en/docs/products/spot/rest-api) was reviewed only to confirm that centralized Spot API keys and permissions are a separate integration model; it is not the selected M10 provider boundary.

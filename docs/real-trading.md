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

### Official sources reviewed

- [Binance Developer Docs: Agentic Wallet overview](https://developers.binance.com/en/docs/products/agentic-wallet/welcome), install guide, security settings, market-order flow, and Skills reference (reviewed 2026-09-30).
- [Binance's official `binance-skills-hub`](https://github.com/binance/binance-skills-hub), including the Agentic Wallet skill plus preflight, wallet-view, wallet-setting, gas, security, and market-order references (reviewed 2026-09-30).
- [Binance Agentic Wallet market-order reference](https://github.com/binance/binance-skills-hub/blob/main/skills/binance-web3/binance-agentic-wallet/references/market-order.md), including the distinct quote and swap commands, explicit MEV/gas controls, and published quote response (reviewed again 2026-10-03).
- [Binance Spot REST security documentation](https://developers.binance.com/en/docs/products/spot/rest-api) was reviewed only to confirm that centralized Spot API keys and permissions are a separate integration model; it is not the selected M10 provider boundary.

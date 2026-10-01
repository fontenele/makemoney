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

### Official sources reviewed

- [Binance Developer Docs: Agentic Wallet overview](https://developers.binance.com/en/docs/products/agentic-wallet/welcome), install guide, security settings, market-order flow, and Skills reference (reviewed 2026-09-30).
- [Binance's official `binance-skills-hub`](https://github.com/binance/binance-skills-hub), including the Agentic Wallet skill plus preflight, wallet-view, wallet-setting, gas, security, and market-order references (reviewed 2026-09-30).
- [Binance Agentic Wallet market-order reference](https://github.com/binance/binance-skills-hub/blob/main/skills/binance-web3/binance-agentic-wallet/references/market-order.md), including the distinct quote and swap commands and published quote response (reviewed 2026-10-01).
- [Binance Spot REST security documentation](https://developers.binance.com/en/docs/products/spot/rest-api) was reviewed only to confirm that centralized Spot API keys and permissions are a separate integration model; it is not the selected M10 provider boundary.

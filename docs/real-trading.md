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
2. Add fail-closed configuration and pure preflight evaluation with tests; defaults remain disabled.
3. Add a read-only Agentic Wallet capability adapter for version, connection, chains, settings, quota, address, balances, and gas. It must not expose a mutating command.
4. Add quote-only support for one explicitly approved chain and exact token pair after instrument compatibility is documented.
5. Add durable arming, confirmation, audit, reconciliation, and emergency-stop integration.
6. Only then consider one real executor command. Its first use requires a separate user request and explicit confirmation immediately before submission.

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

### Official sources reviewed

- [Binance Developer Docs: Agentic Wallet overview](https://developers.binance.com/en/docs/products/agentic-wallet/welcome), install guide, security settings, market-order flow, and Skills reference (reviewed 2026-09-30).
- [Binance's official `binance-skills-hub`](https://github.com/binance/binance-skills-hub), including the Agentic Wallet skill, preflight, security, and market-order references (reviewed 2026-09-30).
- [Binance Spot REST security documentation](https://developers.binance.com/en/docs/products/spot/rest-api) was reviewed only to confirm that centralized Spot API keys and permissions are a separate integration model; it is not the selected M10 provider boundary.

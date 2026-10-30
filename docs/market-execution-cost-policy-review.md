# Current market execution cost policy

## Active operator decision

The active policy is `estimated_net_profit_after_costs`, selected explicitly by the operator after withdrawing the earlier guaranteed-fee-ceiling requirement. A guaranteed native-gas ceiling is NOT an active prerequisite. Keep exclusively the existing Agentic Wallet. No replacement signer, Developer Mode activation, private API, or vendor modification is approved.

For ordinary autonomous entries, require strictly positive expected net profit after fees, spread, slippage and conservative entry/exit gas estimates with a safety margin. Unknown, missing or zero display gas does not prove free execution. Normal autonomous execution remains blocked by missing validated return/cost evidence and risk/accounting/reservation composition.

## Explicitly authorized single diagnostic exception

The operator separately authorized preparing one buy of BTCB with exactly 1 USDT on BSC to measure actual receipt gas, as an exception to the expected-profit entry filter. The diagnostic intentionally has no verified pre-trade gas estimate and no guaranteed gas ceiling. This uncertainty must be disclosed in the concrete immediate order confirmation. The 0.50-USDT network budget is a reference reservation, not an enforceable on-chain maximum. The diagnostic Risk Engine conservatively evaluates the one-USDT input plus all available BNB at observed BNB/USDT prices against the chosen 10-USDT loss budget; it does not call that exposure a predicted gas fee.

No diagnostic order may bypass authentication, explicit provider/chain/instrument and execution flags, restrictive wallet posture, current balances/valuation/quota, network-budget capacity, emergency stop, a durable singleton reservation, the reviewed loss envelope, a final fresh quote, or immediate explicit confirmation of the unexpired plan. Increased loss exposure or an expired/changed plan requires a new review. A consumed or ambiguous attempt never retries automatically. No automatic sell or autonomous strategy activation is authorized by the diagnostic.

## Current review event

On 2026-10-30 the operator explicitly confirmed diagnostic plan 5829788e-0a8f-41f6-a69a-b6e12aafbfce before its expiry. Automatic approval review rejected enabling the submission flag, citing the superseded guaranteed-gas-ceiling policy. Read-only verification showed that the operator-submission flag stayed false. The plan expired during review; no order or signature was submitted. A new unexpired concrete plan requires fresh immediate order confirmation. This document records the operator's existing decisions and does not itself approve or enable a transaction.

## Verified pinned-provider facts

- Official package: `@binance/agentic-wallet` 1.10.0.
- Audited public artifact SHA-256: `7048ff79f6916ff505f79ca923f496625e39348a8c9d47f74e302b9c86f8345d`.
- Quote JSON removes fee/gas-detail objects; displayed zero USD does not prove a zero native fee.
- Ordinary market swap exposes a gas-speed tier, without operator-supplied gas-unit or total-native-fee bounds.
- Gas-price tiers alone do not identify the swap's gas-unit requirement.
- No supported separate SDK was established; no vendor code was patched or copied.

The [official market-order contract](https://github.com/binance/binance-skills-hub/blob/main/skills/binance-web3/binance-agentic-wallet/references/market-order.md) describes the supported quote and swap interfaces. The separately documented external-sign path is outside this approved diagnostic executor.

## Historical decision — withdrawn

The operator previously selected a guaranteed total native-fee ceiling, then explicitly replaced that policy with estimated net profitability. Historical guaranteed-ceiling and alternative-wallet proposals in older project notes are superseded. They must not be interpreted as current prerequisites or as current authorization to use another wallet.

# Agentic Wallet gas-estimate support request

## Current integration blocker

The operator retains the existing Agentic Wallet and accepts conservative gas estimates rather than an enforceable total fee ceiling. The application still needs a usable pre-trade estimate to reject entries whose expected net return is non-positive after both trading legs and network costs. Treating a zero USD display as free gas is not acceptable.

No transaction, signature, Developer Mode change, package patch, credential extraction, or undocumented API access was performed. This document is a draft for the operator to send; no external message has been sent by automation.

## Reviewable message

Hello Binance Agentic Wallet support,

We use the official `@binance/agentic-wallet` CLI version `1.10.0` on BNB Smart Chain (chain 56), with the existing Agentic Wallet and the ordinary `market-order` integration.

A fresh read-only BTCB/USDT buy quote for 1 USDT returned a current quote, human-readable network fee of 0 USD, provider fee of 0 USD and gas mode `fast`. We did not submit an order. The supported JSON quote response exposes output quantity and slippage, but not native gas quantity or raw fee details. The installed quote JSON formatter removes fee/gas detail objects. The documented `wallet gas-price` command provides per-gas price tiers, which do not establish the swap's gas-unit requirement.

We need a supported read-only way to obtain a transaction-specific gas estimate, ideally as a native BNB decimal amount, before submitting a market swap. An estimate is sufficient; we do not require an enforceable on-chain fee ceiling.

Could you clarify:

1. Does 0 USD in the human quote mean rounding, unavailable estimation, sponsorship, or a true zero fee? How can these states be distinguished reliably?
2. Which supported CLI version/command/flag exposes the raw native gas estimate, estimate precision, chain/token identity and observation time for a market swap?
3. Does that estimate cover token allowance/approval transactions when needed, and can it account for both buy and sell legs independently?
4. Which supported fields identify the provider trading-fee token, rate and debit amount without requiring a real order?

Please provide official documentation or a sanitized quote example. No credentials, recovery material, private API access or Developer Mode change should be necessary for this read-only review.

## Public references

- [Official market-order contract](https://github.com/binance/binance-skills-hub/blob/main/skills/binance-web3/binance-agentic-wallet/references/market-order.md).
- [Local cost-policy review](market-execution-cost-policy-review.md).

## Independent remaining work

Resolving the provider estimate does not make autonomous execution ready. A validated return model, authenticated daily economic-PnL/capacity snapshots, reservations and operational Risk Engine composition still need verification. Current background research is descriptive gross BTC Spot performance and does not prove BTCB net profitability. The first real order still requires immediate explicit confirmation.

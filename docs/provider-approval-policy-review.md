# Provider approval policy review

Status: option 2 explicitly selected by the operator on 2026-10-30: provider-managed approvals with automatic targeted revocation after each operation. This authorizes the design/implementation, not immediate broadcasting. The selected policy does not establish bounded approvals, reliable cleanup, profitability or execution readiness. No new financial transaction is proposed for immediate execution.

## Confirmed evidence

The finalized diagnostic spent exactly 1 USDT, but its immediately preceding USDT approval granted MAX_UINT256 to router 0xb300000b72deaeb607a12d5f54773d1c19c7028d on BSC. The exact source is the three-receipt immutable report in [the diagnostic audit](gas-diagnostic-financial-report-2026-10-30.json). The separately authorized revocation then set allowance to zero. A local 1-USDT order limit does not limit what the token contract allows this router to spend. Zero at a dated observation is not a permanent state guarantee.

No bounded approval has been verified for future swaps through the current pinned CLI. The observed behavior must not silently become standing approval authority. This is independent of the accepted estimate-only gas policy; that decision remains unchanged. The existing Agentic Wallet is retained under either choice.

## Reviewed choices (option 2 selected)

1. Require separate operator review before any new USDT approval. Recommended until the delegation is explicitly accepted. Autonomous research and all read-only work continue; a swap that requires a new allowance remains blocked. No migration to another wallet is implied.
2. Accept the design of provider-managed excessive approvals with automatic targeted revocation after each operation. This accepts router spending exposure during the approval window; a later revocation cannot undo spending that already happened, and a crash/network failure may leave the allowance open. Implementation would need a durable one-attempt revocation coordinator, independent monitoring, fail-closed new entries while any approval/revocation is unresolved, and complete estimated approval + swap + revocation + exit costs with a margin. Failed revocations must not silently retry. This is a policy/design choice only, not immediate authorization to broadcast any approval, swap or revocation; existing execution safeguards and explicit confirmation requirements remain.

## Independent blockers

A validated net-return model, fresh buffered entry/exit estimates, authenticated daily-loss accounting, capacity reservation and complete runtime Risk Engine composition are still required. Accepting either option does not make the current system ready to trade autonomously.

## Implementation after selection

M10.215 adds durable one-attempt obligations; M10.216 adds a passive public-receipt monitor; M10.217 blocks ordinary reservations/claims while any cleanup is unresolved. Full automatic revocation composition remains unavailable. No new financial transaction was sent while implementing these milestones.

M10.219–M10.223 preserve provider acceptance before a hash, add an unregistered one-attempt coordinator, require complete six-component gas screening and schedule passive receipt observation only. A separate ledger-gap audit identifies additional mint gas pending operator recognition. No new financial transaction is authorized.

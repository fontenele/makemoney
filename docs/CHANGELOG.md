# Changelog

## 2026-10-26 — M10.155 guarded real-execution accounting balance evidence

- Added Bearer-protected `POST /real-trading/submission-accounting-evidence` for one strict complete canonical M10.85 balance-change package.
- Registered the existing serializable M10.86 store, which reloads completed financial reconciliation and reapplies source, target, provider-fee, network-fee, identity, coverage, arithmetic, and chronology rules.
- Preserved exact replay and divergent conflict behavior while leaving accounting mutation required and incomplete.
- Added focused and E2E coverage for valid composition, strict nested input, missing authentication, malformed evidence, and absent financial completion.
- Added no provider/RPC call, balance mutation, accounting application, PnL calculation, polling, scheduling, resubmission, automatic retry, dashboard action, or strategy bridge.

## 2026-10-26 — M10.154 guarded real-execution financial reconciliation

- Added Bearer-protected `POST /real-trading/submission-reconciliation` for one strict complete canonical M10.81 evidence package.
- Registered the existing serializable M10.82 store, which reloads and revalidates durable terminal context before immutable insertion or exact replay.
- Projected M10.83 financial completion while keeping accounting mutation required and incomplete.
- Added focused and E2E coverage for valid composition, malformed input, missing authentication, and absent durable context.
- Added no provider/RPC call, balance mutation, accounting application, PnL calculation, polling, scheduling, resubmission, automatic retry, dashboard action, or strategy bridge.

## 2026-10-26 — M10.153 guarded manual real-execution status reconciliation

- Added loopback-only Bearer-protected `POST /real-trading/submission-status` with a strict canonical gate identity.
- Registered the existing durable one-shot BTCB/USDT status context, cadence, pinned read-only lookup, response assessment, and monotonic observation store.
- Kept terminal financial reconciliation incomplete and added no polling, scheduling, automatic retry, resubmission, accounting mutation, dashboard action, or strategy bridge.
- Added E2E coverage for missing authentication, malformed input, and absent durable context without live provider access.

## 2026-10-24 — Register a disabled-by-default manual real-execution boundary

- Added `REAL_EXECUTION_OPERATOR_SUBMISSION_ENABLED=false` as a third independent runtime safeguard; startup rejects enabling it without real mode and general execution enablement.
- Registered the M10.151 claim, runner, and outcome composition behind loopback-only Bearer-protected `POST /real-trading/submission`.
- Required canonical attempt/gate UUIDs, the literal immediate-review acknowledgment, and the exact Agentic Wallet/BSC/BTCB/USDT allowlist before claim access.
- Exposed the independent operator gate in the provider-free real-trading status while preserving false per-request submission authorization.
- Added unit and E2E coverage proving malformed, unauthenticated, and disabled requests stop before claim or CLI access.
- All 2,837 backend tests across 253 suites, 113 serial E2E tests across 9 suites, and 115 dashboard tests across 20 files pass with formatting, lint, builds, Prisma validation/migration status, all 47 migrations applied from scratch, Compose validation, and whitespace checks.
- Kept the local environment paper-only with both execution flags false and no control token; verification made no live CLI call, provider request, swap, or financial transaction.

## 2026-10-24 — Close one real-execution submission and preserve every outcome

- Changed a fresh M10.150 claim to release its complete fingerprint-bound command exactly once while exact replay returns no command.
- Added an unregistered pinned-version Agentic Wallet runner restricted to the approved BSC BTCB/USDT market-swap envelope.
- Added one-shot orchestration that verifies claim correlation, performs at most one runner call, and converts failures or malformed responses to a non-retryable unknown outcome.
- Added an immutable submission-outcome model and serializable store that atomically creates the existing pending receipt only for a safe acknowledged provider order identity.
- Preserved safe stranding: a claim without an outcome is never resubmitted, outcome replay performs no provider access, and no state claims execution success before reconciliation.
- Applied the migration locally. All 2,831 backend tests across 252 suites, 111 serial E2E tests across 9 suites, and 115 dashboard tests across 20 files pass with formatting, lint, backend/dashboard builds, Prisma validation and migration status, all 47 migrations applied from scratch in E2E, Compose validation, and whitespace checks.
- Kept the entire path outside NestJS and unreachable; verification made no live CLI call, provider request, swap, financial transaction, or strategy execution.

## 2026-10-24 — Claim each real-execution gate at most once

- Added an immutable real-execution submission-attempt model and additive migration keyed one-to-one to the existing atomic BTCB/USDT gate.
- Added an unregistered serializable claim store sharing the emergency-stop/gate advisory lock and revalidating gate structure, expiry, newest persisted inactive stop identity, and absence of a provider receipt.
- Bound each claim to the durable payload commitment and SHA-256 fingerprint of the complete closed Agentic Wallet command arguments.
- Made exact replay observable before mutable reads while changed identities, concurrent claims, uniqueness races, and serializable conflicts fail closed without automatic retry.
- Kept provider submission unstarted and unauthorized; no NestJS registration, route, runner, provider call, strategy bridge, swap, or financial transaction was added.
- Applied the migration locally. All 2,812 backend tests across 249 suites, 107 serial E2E tests across 9 suites, and 115 dashboard tests across 20 files pass with formatting, lint, backend/dashboard builds, Prisma validation and migration status, all 46 migrations applied from scratch in E2E, Compose validation, and whitespace checks.

## 2026-10-24 — Make local runtime handoff require live valuation

- Identified the recurring paper-valuation 503 as an operational launch error: the API had been started inside a restricted command sandbox even though the host could reach the public Binance ticker endpoint.
- Required automated API launches to use a Windows-host process with normal outbound network access and prohibited declaring readiness from the port or health route alone.
- Added mandatory direct and Vite-proxied paper-valuation HTTP 200 checks before handing the running API and dashboard back to the user.
- Restarted only the project API and dashboard as host processes and confirmed HTTP 200 with the same fresh BTC/USDT valuation through both paths.

## 2026-10-24 — Synchronize reconciled funding conversion into local accounting

- Added an exact finalized-block BSC snapshot covering native BNB plus the approved USDT and BTCB contracts.
- Added a Bearer-protected manual accounting synchronization action keyed by canonical conversion attempt and trusted initialization, with an exact operator-review acknowledgment.
- Required immutable financial reconciliation, a later block, exact BNB/USDT conversion equations, BTCB continuity, unchanged pre-conversion local balances, and valid ledger chronology.
- Added a serializable shared-lock store that conditionally replaces all three balances and records one uniquely correlated immutable receipt atomically; replay is idempotent and races or divergence fail closed.
- Applied the additive accounting-synchronization migration locally. No live provider/RPC call, financial transaction, retry, PnL calculation, or strategy authorization was added.
- All 2,804 backend tests across 248 suites, 105 serial E2E tests across 9 suites, and 115 dashboard tests across 20 files pass with formatting, lint, backend/dashboard builds, Prisma validation and migration status, all 45 migrations applied from scratch in E2E, Compose validation, and whitespace checks.

## 2026-10-24 — Register guarded funding-conversion reconciliation actions

- Added separate loopback-only Bearer-protected manual routes for one-shot funding-conversion status lookup and complete financial reconciliation by canonical submission-attempt UUID.
- Registered the existing pinned status runner, monotonic status store, terminal evidence context, confirmed-receipt reader, later finalized-block balance reader, and immutable reconciliation store without adding polling or automatic retry.
- Kept status lookup and receipt/balance reconciliation as distinct operator actions so one provider read cannot silently trigger the other.
- Added strict single-field request parsing and sanitized 400/409/503 failure mapping; authentication and malformed-input E2E cases stop before provider access.
- No accounting-ledger mutation, strategy authority, provider/RPC call during verification, conversion, or real order was added. Exact ledger synchronization remains next.
- All 2,794 backend tests across 245 suites, 103 serial E2E tests across 9 suites, and 115 dashboard tests across 20 files pass with formatting, lint, backend/dashboard builds, Prisma validation/migration status, Compose validation, and whitespace checks.

## 2026-10-24 — Register guarded funding-conversion operator submission

- Added loopback-only `POST /real-trading/funding-conversion-submission` after explicit user authorization to make this narrowly bounded financial path reachable.
- Reused the SHA-256 Bearer-token guard and exported it from the Risk Engine module; an absent token digest fails with 503 and invalid credentials fail with 401 before application or provider access.
- Registered the existing fresh-quote, exact pre-balance, current provider-fee, serializable one-shot claim, pinned swap runner, and immutable outcome stores without weakening any runtime, emergency-stop, plan, confirmation, gas-reserve, identity, or chronology check.
- Mapped malformed input to 400, safety/plan conflicts to 409, and unexpected dependency failures to sanitized 503 responses.
- Added E2E coverage proving the current environment stops before provider access both without configured operator authentication and with valid authentication while real execution is disabled.
- Updated the root API route table. The local environment remains paper-only, execution-disabled, and without a control-token digest; no CLI provider call, conversion, or real order occurred.
- All 2,794 backend tests across 245 suites, 99 serial E2E tests across 9 suites, and 115 dashboard tests across 20 files pass with formatting, lint, and backend/dashboard builds.

## 2026-10-24 — Compose complete funding-conversion financial evidence

- Bound every new funding-conversion submission claim and request fingerprint to its exact canonical BSC wallet address; applied the backward-compatible nullable migration locally while legacy absence remains fail-closed.
- Added an unregistered terminal-context reader that reconstructs the exact finished attempt, plan, order, status observation, fixed-block pre-balances, and persisted zero provider-fee evidence.
- Added a bounded pinned-CLI 1.10.0 transaction-receipt adapter for `wallet tx-history --tx`, requiring one confirmed BSC swap, exact hash, native-BNB send, approved-USDT receive, same wallet, exact 18-decimal raw quantities, and a positive BNB network fee.
- Reused the finalized-block BSC balance boundary for the post-conversion snapshot and required a strictly later block.
- Composed M10.134 evidence only when the receipt and exact fixed-block equations reconcile both BNB outflow (submitted source plus network fee) and USDT inflow; divergence, malformed chronology, unrelated wallet activity, and incomplete durable context fail closed.
- Marked complete evidence acquisition available while retaining `fundingConversionActivationAllowed: false`; the readers remain unregistered and verification made no provider call, conversion, or real order.
- Added four suites and brought the backend total to 2,794 tests across 245 suites. Full formatting, lint, backend/dashboard builds and tests, serial E2E, Prisma generation/validation/migration status, Compose validation, and whitespace checks pass.

## 2026-10-24 — Capture funding-conversion provider-fee evidence

- Recorded the current official Binance Agentic Wallet service-fee rule: Group-1-to-Group-1 swaps are 0%, while the mutable fee must be checked in real time.
- Added a bounded pinned-CLI text adapter that reads the exact BNB/USDT quote fee, fee USD, estimated gas USD, gas mode, and quote context without submitting a swap.
- Required the later fee quote to retain the exact source/slippage context, report zero provider fee, and remain at or above the fresh approved minimum before claim.
- Atomically fingerprinted and persisted provider-fee and estimated-network-fee evidence with the M10.144 fixed-block pre-balance snapshot; invalid chronology, nonzero fees, corrupt evidence, and legacy absence fail closed.
- Replaced the resolved fee-classification blocker with `complete_post_conversion_evidence_acquisition_unimplemented`; conversion activation remains forbidden.
- Corrected the Nest CLI entry target so `npm run start` and `npm run start:dev` use the generated `dist/src/main` artifact.
- Applied the additive fee-evidence migration locally. All 2,773 backend tests across 241 suites, 97 serial E2E tests across 9 suites, and 115 dashboard tests across 20 files pass with formatting, lint, full build, Prisma validation, Compose validation, and whitespace checks.
- Made the E2E script run in-band because all E2E files intentionally recreate and share the same disposable PostgreSQL schema; parallel workers caused cross-suite cleanup and fixture collisions.

## 2026-10-23 — Review incomplete funding-conversion financial evidence

- Added a bounded read-only BSC JSON-RPC client that fixes one block and reads exact native BNB plus approved USDT balances at that same block.
- Required the unregistered submission flow to compare exact BNB with its fresh quote and block on divergence before a durable claim or swap runner.
- Atomically fingerprinted and persisted pre-conversion block, BNB, USDT, and observation time with the one-shot claim while retaining the existing minimum BNB gas-reserve check.
- Added a backward-compatible nullable migration for legacy attempts; every new claim requires complete snapshot evidence and legacy absence fails closed.
- Audited Agentic Wallet CLI 1.10.0 and current official provider references for market-order status, transaction details, balances, fees, and gas.
- Recorded the facts the provider can supply without discarding them: confirmed transaction send/receive instructions, network fee, and current balances.
- Changed the one-shot evidence port to return typed availability and propagate exact capability blockers instead of collapsing absence to `null`.
- Corrected the ownership boundary and resolved the project-owned snapshot requirement. The remaining fail-closed requirement is authoritative current provider-fee classification.
- Added four focused capability tests, five fixed-block balance-reader tests, and updated coordinator/submission/store coverage, including exact quote/snapshot divergence; all 2,761 backend tests across 240 suites and 115 dashboard tests across 20 files pass alongside formatting, lint, backend/dashboard builds, Prisma validation, Compose validation, and whitespace checks, with no provider call or financial mutation. The additive migration is applied locally.

## 2026-10-23 — Compose one-shot funding-conversion financial reconciliation

- Added an unregistered coordinator that short-circuits completed attempts, suppresses same-attempt overlap, and processes at most one read-only financial-evidence package per explicit call.
- Added an intentionally unimplemented evidence-reader port; concrete receipt, balance-delta, provider-fee, and network-fee acquisition remains a named blocker rather than inferred data.
- Delegated only complete evidence to M10.135 with checked recording identity/time, cancellation boundaries, propagated failures, and no automatic retry.
- Added 12 focused tests and documented a finite M10 closure path toward disabled-by-default real-executor readiness and separately confirmed optional live use.
- Passed all 2,751 backend tests, 115 dashboard tests, formatting, lint, full build, Prisma validation, Compose validation, and whitespace checks.

## 2026-10-23 — Read durable funding-conversion reconciliation by plan

- Added a separate unregistered read contract for the reconciliation associated with one canonical funding-conversion plan UUID.
- Traversed the existing unique plan-to-attempt and optional one-to-one attempt-to-reconciliation relations in one query, requiring no redundant constraint or migration.
- Returned explicit absence for either missing relation edge and reused the M10.135 mapper so corrupt or plan/attempt-divergent evidence fails closed.
- Expanded focused reader coverage to 45 tests without adding a route, provider access, accounting mutation, or conversion authority.
- Passed all 2,739 backend tests, 115 dashboard tests, formatting, lint, full build, Prisma validation, Compose validation, and whitespace checks.

## 2026-10-23 — Read durable funding-conversion reconciliation by request fingerprint

- Added a separate unregistered read contract for the reconciliation associated with one canonical lowercase SHA-256 request fingerprint.
- Shared the M10.135 writer's canonical fingerprint validator and reused the existing unique `requestFingerprint` constraint, requiring no schema or migration change.
- Recalculated fingerprints through the authoritative mapper, returned explicit absence, rejected request-fingerprint divergence, and kept the internal fingerprint out of the public snapshot.
- Expanded focused reader coverage to 38 tests without adding a route, provider access, accounting mutation, or conversion authority.
- Passed all 2,732 backend tests, 115 dashboard tests, formatting, lint, full build, Prisma validation, Compose validation, and whitespace checks.

## 2026-10-23 — Read durable funding-conversion reconciliation by transaction

- Added a separate unregistered read contract for the reconciliation associated with one canonical lowercase EVM transaction hash.
- Shared the funding-conversion status boundary's canonical transaction validator and reused the existing unique `transactionHash` constraint, requiring no schema or migration change.
- Returned explicit absence and reused the M10.135 mapper so corrupt or transaction-divergent evidence fails closed.
- Expanded focused reader coverage to 32 tests without adding a route, provider access, accounting mutation, or conversion authority.
- Passed all 2,726 backend tests, 115 dashboard tests, formatting, lint, full build, Prisma validation, Compose validation, and whitespace checks.

## 2026-10-23 — Read durable funding-conversion reconciliation by provider order

- Added a separate unregistered read contract for the reconciliation associated with one safe Agentic Wallet provider order identity.
- Reused the shared bounded option-safe order-ID grammar and existing unique `providerOrderId` constraint, requiring no schema or migration change.
- Returned explicit absence and reused the M10.135 mapper so corrupt or provider-order-divergent evidence fails closed.
- Expanded focused reader coverage to 26 tests without adding a route, provider access, accounting mutation, or conversion authority.
- Passed all 2,720 backend tests, 115 dashboard tests, formatting, lint, full build, Prisma validation, Compose validation, and whitespace checks.

## 2026-10-23 — Read durable funding-conversion reconciliation by status observation

- Added a separate unregistered read contract for the reconciliation associated with one canonical terminal status-observation UUID.
- Reused the existing unique `statusObservationId` constraint, requiring no schema or migration change.
- Returned explicit absence and reused the M10.135 mapper so corrupt or status-observation-divergent evidence fails closed.
- Expanded focused reader coverage to 18 tests without adding a route, provider access, accounting mutation, or conversion authority.
- Passed all 2,712 backend tests, 115 dashboard tests, formatting, lint, full build, Prisma validation, Compose validation, and whitespace checks.

## 2026-10-23 — Read durable funding-conversion reconciliation by attempt

- Added a separate unregistered read contract for the reconciliation associated with one canonical submission-attempt UUID.
- Reused the existing unique `attemptId` constraint, requiring no schema or migration change.
- Returned explicit absence and reused the M10.135 mapper so corrupt or attempt-divergent evidence fails closed.
- Expanded focused reader coverage to 12 tests without adding a route, provider access, accounting mutation, or conversion authority.
- Passed all 2,706 backend tests, 115 dashboard tests, formatting, lint, full build, Prisma validation, and Compose validation.

## 2026-10-23 — Read durable funding-conversion reconciliation evidence

- Added an unregistered read contract and Prisma reader for one canonical reconciliation UUID.
- Returned explicit absence and rejected invalid identity before persistence access.
- Reused the M10.135 persisted mapper so corrupt fingerprints, financial evidence, classification, chronology, and divergent identity fail closed.
- Added six focused tests without adding schema, route, provider access, accounting mutation, or conversion authority.
- Passed all 2,700 backend tests, 115 dashboard tests, formatting, lint, full build, Prisma validation, and Compose validation.

## 2026-10-23 — Restore Binance new-listing catalog refresh

- Added one shared canonical Unicode Binance Spot identity policy across catalog, checkpoints, research calculations, cursors, and per-symbol routes.
- Accepted current valid provider pairs `币安人生USDT` and `牛来USDT` while retaining normalization, casing, character-class, and database-length checks.
- Restored successful live loading of all 770 current USDT pairs; the first successful snapshot remains baseline-only and does not fabricate historical detections.
- Added focused identity, catalog, and controller coverage; no route, schema, financial behavior, or trading authority changed.

## 2026-10-22 — Persist funding-conversion financial reconciliation

- Added an immutable serializable PostgreSQL store for complete M10.134 evidence.
- Reloaded and revalidated the exact durable attempt, plan, and terminal status before first insert.
- Added deterministic replay/conflict protection and preserved below-minimum output as explicit durable breach evidence.
- Kept the store unregistered, with no route, evidence acquisition, accounting mutation, provider call, retry, or conversion path.
- Applied both local migrations and passed 2,678 backend tests, 115 dashboard tests, formatting, Prisma validation, lint, full build, and Compose validation.

## 2026-10-22 — Gate funding-conversion financial evidence

- Added a pure evidence assessment after durable provider `FINISHED` status.
- Required complete correlated receipt, source/target balance deltas, provider fees, and BNB network fee.
- Classified actual USDT against accepted minimum and expected output without hiding below-minimum evidence.
- Kept reconciliation incomplete pending future persistence; no schema, provider, runtime, or conversion path was added.

## 2026-10-22 — Make wallet valuation initial and manual

- Removed authenticated funding valuation from the ordinary 15-second dashboard refresh.
- Added an adjacent Reload action while preserving the previous value during a reload.
- Added a tested initial/manual-only loader with overlap coalescing.
- Updated the backend and dashboard refresh contract to `initial_and_manual`.

## 2026-10-22 — Compose one-shot funding-conversion status reconciliation

- Added a durable read-only context loader for exact pending conversion-attempt evidence.
- Added an unregistered coordinator for one status lookup, strict response assessment, and monotonic observation storage.
- Suppressed overlapping same-attempt calls and withheld absent, terminal, malformed, or invalid evidence from provider/storage access.
- Kept provider `FINISHED` pending financial reconciliation; no route, polling, retry, live provider call, or conversion was added.

## 2026-10-22 — Decouple wallet valuation from dashboard loading

- Removed the authenticated Agentic Wallet valuation from the aggregate dashboard snapshot request.
- Added an independent valuation loader so unrelated panels render without waiting for the slow CLI sequence.
- Preserved the last valuation while refreshing and suppressed overlapping wallet valuation reads.
- Kept the backend route, exact-decimal calculations, visible-page cadence, and all financial authorization boundaries unchanged.

## 2026-10-22 — Warm paper valuation during API startup

- Added a strict public Binance REST BTC/USDT price snapshot adapter with no credentials.
- Started the WebSocket first, then awaited one REST warm-up before the API becomes available.
- Preserved a streaming price that arrives during warm-up instead of replacing it with the snapshot.
- Kept HTTP 503 for genuine missing or stale price evidence and added focused lifecycle/adapter tests.

## 2026-10-22 — Persist monotonic funding-conversion status

- Added durable status observations correlated to one exact conversion attempt and provider order.
- Enforced immutable booking time, monotonic provider updates, terminal immutability, and exact replay.
- Kept provider `FINISHED` explicitly pending financial reconciliation.
- Applied the migration with explicit short PostgreSQL index names; no provider command or transaction ran.

## 2026-10-22 — Validate funding-conversion terminal status

- Added pure validation for one exact Agentic Wallet funding-conversion order lookup.
- Correlated order identity, BSC BNB-to-USDT payload, quantity, slippage, chronology, status, and hash.
- Kept `FINISHED` separate from financial reconciliation and forbade submission retry in every state.
- Added focused tests without adding a runner, route, provider call, or transaction.

## 2026-10-22 — Compose guarded one-shot funding conversion

- Added an unregistered coordinator for runtime gates, emergency stop, fresh quote, durable claim, one runner call, and durable outcome.
- Blocked replay before provider access and converted provider exceptions into unknown non-retryable outcomes.
- Added focused tests with provider and persistence doubles.
- Kept the coordinator and mutable runner outside the running application; no real transaction ran.

## 2026-10-22 — Bind complete fresh quote evidence to conversion claims

- Added fresh source quantity and slippage to durable funding-conversion attempts and their request fingerprints.
- Required exact decimal equality with the consumed plan before one-shot insertion.
- Added focused mismatch tests and applied the follow-up local migration.
- Kept every mutable component unreachable at runtime; no provider command or transaction ran.

## 2026-10-22 — Persist funding-conversion submission outcomes safely

- Added a funding-specific response assessor that treats an order ID only as pending terminal confirmation.
- Classified malformed, rejected, absent, and unsafe responses as unknown and non-retryable.
- Added serializable outcome recording with deterministic response fingerprints and no raw provider response retention.
- Kept the assessor/store outside runtime wiring; no provider command or financial transaction ran.

## 2026-10-22 — Add durable one-shot funding-conversion claims

- Added one unique serializable submission-attempt claim per durable funding-conversion plan.
- Revalidated the plan fingerprint, confirmation digest/deadline, configuration readiness, fresh minimum USDT, and fresh BNB reserve before consumption.
- Persisted only fresh financial evidence and a request fingerprint, never the raw confirmation phrase.
- Made every claim non-retryable and kept the store outside runtime wiring; no provider command or transaction ran.

## 2026-10-22 — Separate confirmation lifetime and minimum gas reserve

- Added a sixty-second funding-conversion confirmation deadline independent of the five-second provider quote expiry.
- Added a blank-by-default validated `FUNDING_CONVERSION_MIN_GAS_RESERVE_BNB` safeguard.
- Bound the gas-reserve policy and both deadlines into plan fingerprint version 2 and durable storage.
- Exposed missing/insufficient reserve as activation blockers and displayed the policy/deadline in the dashboard.
- Kept gas sufficiency explicitly unproven and left the swap runner unregistered and unused.

## 2026-10-22 — Persist funding-conversion plans before disclosure

- Added an immutable PostgreSQL model and migration for BNB-to-USDT funding-conversion plans.
- Persisted the complete exact plan envelope, unique fingerprint, activation blockers, and chronology before returning a successful plan.
- Stored only a SHA-256 digest of the generated confirmation phrase, never the phrase itself.
- Withheld expired, malformed, or unpersisted plans and added focused service/store coverage.
- Applied the pending local migrations and regenerated Prisma; no wallet mutation or swap runner registration occurred.

## 2026-10-22 — Add a closed unregistered funding-conversion swap runner

- Added a CLI runner that accepts only the pinned BSC native-BNB-to-USDT swap envelope.
- Required canonical positive quantity, bounded explicit slippage, MEV enabled, medium gas, JSON output, and the pinned Agentic Wallet CLI version.
- Added focused rejection tests for altered chain, token direction, command kind, MEV, gas, quantity, slippage, and CLI version.
- Kept the runner outside NestJS registration and all application/controller/dashboard paths; no real CLI process or transaction was started.

## 2026-10-22 — Prepare an inert BNB-to-USDT conversion plan

- Added loopback-only `POST /real-trading/funding-conversion-plan`, which obtains a new verified quote for the exact operator-entered quantity.
- Bound the complete BNB-to-USDT command terms to a unique identity and SHA-256 fingerprint.
- Reported the independent mode, execution, provider, chain, source-token, and target-token activation blockers without treating configuration readiness as authorization.
- Added a dashboard action and inspection panel for the inert plan.
- Kept the command non-executable and left the runtime without a swap runner, final-confirmation endpoint, submission, retry, signature, or conversion capability.
- Verified all 2,553 backend tests across 222 suites and all 112 dashboard tests across 19 files, plus formatting, lint, complete backend/dashboard builds, and whitespace checks.
- Restarted only the host API and verified that malformed plan input returns `400` before wallet/provider access; no live plan or swap was requested.

## 2026-10-22 — Style monetary conversion tooltips

- Replaced native browser title bubbles on monetary conversions with a dashboard-native CSS tooltip.
- Added a consistent dark surface, conversion accent, border, shadow, motion, dotted affordance, and keyboard-focus behavior.
- Kept tooltip content tied to existing exact-decimal conversion evidence and withheld the interactive affordance when evidence is unavailable.
- Added no price request, provider access, quote, conversion, signature, submission, or order behavior.
- Verified focused tooltip tests, dashboard type checking/build, formatting, and whitespace checks.

## 2026-10-22 — Add manual BNB-to-USDT quote preview

- Added loopback-only `POST /real-trading/funding-conversion-quote` with an exact operator-supplied BNB quantity and no inferred default.
- Added a dedicated adapter that invokes only the pinned `market-order quote` surface with the official BSC native-BNB sentinel, approved USDT address, and configured maximum slippage.
- Required fresh approved-wallet verification and a strictly positive remaining BNB balance before provider access.
- Added dashboard presentation for expected/minimum USDT, remaining BNB, expiry, partial cost coverage, and explicitly unverified gas sufficiency.
- Added no `market-order swap` path, automatic quote refresh, conversion, signature, submission, executor, or order authority.
- Verified all 2,549 backend tests across 221 suites and all 111 dashboard tests across 19 files, plus formatting, lint, complete backend/dashboard builds, and whitespace checks.
- Restarted only the host API and verified that malformed input returns `400` before wallet/provider access; no live quote was requested without an operator-selected amount.

## 2026-10-21 — Show automatic wallet valuation and conversion tooltips

- Added loopback-only `GET /real-trading/funding-valuation`, combining a fresh approved-wallet BNB observation with Binance public BNB/USDT and USDT/BRL last prices using exact decimal arithmetic.
- Replaced the dashboard's extra verification click with automatic 15-second visible-page refresh and persistent BNB, USDT, and BRL presentation.
- Added reusable monetary tooltips for USDT, BRL, BNB, and BTC values when the necessary price evidence is available; missing evidence never produces a guessed conversion.
- Kept the valuation indicative and read-only, exposed no wallet address, and added no funding, conversion, executable quote, signature, submission, executor, or order authority.
- Verified all 2,533 backend tests across 219 suites and all 109 dashboard tests across 19 files, plus formatting, lint, complete backend/dashboard builds, and whitespace checks.
- Restarted only the host API and live-verified `0.00975323` BNB as `7.232020045` USDT / `36.4877107330385` BRL, with all financial authorization flags false.

## 2026-10-21 — Verify approved holdings after manual funding

- Added an explicit loopback-only post-funding wallet read for native BNB and the exact approved BSC USDT/BTCB contracts.
- Preserved provider-omitted approved assets as `not_reported`, blocked unsupported or ambiguous holdings, and exposed no wallet address or unapproved asset identity.
- Added dashboard visibility for exact reported quantities and the BNB-only conversion requirement while recording that no additional funding is required.
- Kept BRL valuation, conversion, accounting initialization, funding, quote, signature, submission, executor, and real-order authority unavailable.
- Verified all 2,524 backend tests across 218 suites, all 104 dashboard tests across 18 files, formatting, lint, complete backend/dashboard builds, and whitespace checks.
- Restarted only the host API and live-verified `0.00975323` BNB, USDT/BTCB not reported, no unsupported assets, conversion required, no additional funding required, and all financial authorization flags false.

## 2026-10-21 — Add local funding-address QR code

- Added browser-local PNG QR generation for a successful M10.117 canonical BSC address, using high error correction and no remote QR service.
- Kept the payload address-only so network, asset, amount, fee, and final confirmation remain explicit operator choices in the Binance App.
- Added fail-closed address validation, encoder-error handling, responsive rendering, and focused tests.
- Verified all 103 dashboard tests across 18 files, complete backend/dashboard builds, formatting, lint, and whitespace checks.
- Audited production dependencies: ten unrelated existing advisories remain outside the `qrcode` chain; no automatic broad dependency update was made.

## 2026-10-21 — Add guarded manual funding readiness

- Added an explicit loopback-only read that rechecks the live Agentic Wallet, restrictive security posture, independent local risk limits, reported-empty BSC balance list, gas visibility, and canonical chain-56 address.
- Reveals the exact address only for a fully ready result; blocked results return reasons and withhold it, while the ordinary observation remains redacted.
- Added a separate dashboard action with BSC-only, full-address verification, BSC USDT, and native-BNB gas warnings; no automatic refresh invokes it.
- Kept funding, quote, and submission authorization false and added no transfer, signing, quote, executor, or order command.
- Verified all 2,522 backend tests across 218 suites, all 97 PostgreSQL E2E tests across 9 suites with all 34 migrations, all 98 dashboard tests across 17 files, formatting, lint, Prisma validation, backend/dashboard builds, Compose validation, and whitespace checks.

## 2026-10-21 — Compose latest reconciled accounting balances

- Added the M10.116 unregistered read-only service over M10.114 latest freshness and M10.115 balance projection.
- Validated canonical initialization identity, bounded freshness age, and finite evaluation clock before delegation and defensively captured the clock.
- Converted durable absence into an explicit blocker, preserved stale/future blockers, and failed closed on malformed delegated evidence.
- Added focused and PostgreSQL-chain composition coverage.
- Verified all 2,520 backend tests across 218 suites, including all 9 focused composition cases, all 97 PostgreSQL E2E tests across 9 suites with all 34 migrations, all 96 dashboard tests across 17 files, formatting, lint, Prisma validation, backend/dashboard builds, Compose validation, whitespace checks, and live API health/valuation checks.
- Added no schema, route, runtime registration, provider call, accounting mutation, valuation, PnL, funding, quote/submission authorization, executor, or real order.

## 2026-10-21 — Project fresh reconciled accounting balances

- Added the M10.115 pure projection from fresh M10.110 reconciliation evidence to exact current USDT, BTCB, and native BNB balances.
- Bound the projection to the canonical initialization UUID and retained its durable reconciliation UUID and fingerprint.
- Canonically ordered and defensively copied balances and dates, with regeneration-based validation against tampered claims.
- Added focused and PostgreSQL-chain composition coverage.
- Verified all 2,511 backend tests across 217 suites, including all 6 focused projection cases, all 97 PostgreSQL E2E tests across 9 suites with all 34 migrations, all 96 dashboard tests across 17 files, formatting, lint, Prisma validation, backend/dashboard builds, Compose validation, whitespace checks, and live API health/valuation checks.
- Added no schema, route, runtime registration, provider call, accounting mutation, valuation, PnL, funding, quote/submission authorization, executor, or real order.

## 2026-10-21 — Compose latest reconciliation freshness by initialization

- Added the M10.114 unregistered service over the M10.112 latest reader and M10.110 freshness policy.
- Validated canonical initialization identity, bounded age policy, and finite evaluation clock before durable access.
- Snapshotted the mutable evaluation date before selecting the newest commitment.
- Preserved explicit absence and stale/future blockers while propagating corrupt newest evidence without fallback.
- Verified all 2,505 backend tests across 216 suites, including all 16 focused freshness-composition cases, all 97 PostgreSQL E2E tests across 9 suites with all 34 migrations, all 96 dashboard tests across 17 files, formatting, lint, Prisma validation, backend/dashboard builds, and whitespace checks.
- Added no schema, route, runtime registration, provider call, accounting mutation, valuation, PnL, funding, quote/submission authorization, executor, or real order.

## 2026-10-21 — Add dashboard Agentic Wallet web authentication

- Added an explicit loopback-only dashboard flow for the official Agentic Wallet `auth signin` and `auth verify` sequence.
- Kept the canonical QR identity and blocking verification process on the host backend while exposing only the validated official link, pairing code, expiry, and sanitized lifecycle state.
- Added strict official-host, HTTPS, UUID, pairing-code, expiry, command-allowlist, timeout, and concurrent-start boundaries.
- Added local status polling that performs no provider call and refreshes the existing read-only wallet observation after authentication.
- Added no sign-out, quote, signature, submission, funding, accounting mutation, executor, or real order authority.
- Verified all 2,497 backend tests across 216 suites, all 97 PostgreSQL E2E tests across 9 suites with all 34 migrations, all 96 dashboard tests across 17 files, formatting, lint, Prisma and Compose validation, backend/dashboard builds, whitespace checks, and live API/dashboard/authentication-state checks without implicitly starting a pairing flow.

## 2026-10-17 — Read the latest durable reconciliation deterministically

- Added the M10.112 latest-read contract keyed by canonical accounting initialization UUID.
- Extended the unregistered Prisma reader with total `recordedAt DESC, id DESC` ordering over the existing initialization index.
- Returned explicit absence and reused the authoritative M10.108 mapper for every selected row.
- Failed closed on corrupt newest evidence without querying an older fallback.
- Added focused coverage for deterministic query shape, successful reconstruction, absence, pre-access identity validation, and corrupt latest evidence.
- Added PostgreSQL E2E coverage for present and absent latest-by-initialization lookup.
- Added no schema, route, runtime registration, provider call, accounting mutation, valuation, PnL, funding, quote/submission authorization, executor, or real order.
- Verified all 2,486 backend tests across 214 suites, including 5 focused latest-reader cases and 6 identity-reader cases, all 97 PostgreSQL E2E tests across 9 suites with all 34 migrations, all 94 dashboard tests across 17 files, formatting, lint, Prisma and Compose validation, backend/dashboard builds, whitespace checks, and live API/dashboard checks with fresh Binance-backed valuation.

## 2026-10-17 — Compose durable reconciliation freshness

- Added the unregistered M10.111 read-only service over the M10.109 reader and M10.110 freshness policy.
- Validated canonical identity, bounded age policy, and finite evaluation clock before durable access.
- Snapshotted the mutable evaluation date before the asynchronous read.
- Preserved explicit absence, pure stale/future blockers, and propagated durable corruption.
- Added focused coverage for composition, absence, pre-access validation, defensive request capture, stale evidence, and read failure.
- Added PostgreSQL E2E coverage for record, reconstructed read, and current-evidence assessment.
- Added no schema, route, runtime registration, provider call, accounting mutation, valuation, PnL, funding, quote/submission authorization, executor, or real order.
- Verified all 2,481 backend tests across 214 suites, including 8 focused composition tests and 9 freshness-policy tests, all 97 PostgreSQL E2E tests across 9 suites with all 34 migrations, all 94 dashboard tests across 17 files, formatting, lint, Prisma and Compose validation, backend/dashboard builds, whitespace checks, and live API/dashboard checks with fresh Binance-backed valuation.

## 2026-10-17 — Bound ledger reconciliation evidence freshness

- Added the pure M10.110 freshness assessment over stored M10.109 reconciliation evidence.
- Revalidated the complete stored commitment before retaining any authenticated or reconciled claim.
- Required a finite evaluation clock and integer maximum age from one through sixty seconds.
- Rejected evaluation before the wallet observation or durable recording and measured staleness from the authenticated observation itself.
- Returned deeply defensive, independently revalidatable evidence with quote/submission authorization still false.
- Added focused coverage for the exact age boundary, one-millisecond staleness, future evidence, malformed requests, corrupt stored evidence, defensive copying, and tampered output.
- Added no schema, persistence access, route, runtime registration, provider call, accounting mutation, valuation, PnL, funding, executor, or real order.
- Verified all 2,473 backend tests across 213 suites, including 9 focused freshness tests, all 97 PostgreSQL E2E tests across 9 suites with all 34 migrations, all 94 dashboard tests across 17 files, formatting, lint, Prisma and Compose validation, backend/dashboard builds, whitespace checks, and live API/dashboard checks with fresh Binance-backed valuation.

## 2026-10-17 — Read immutable ledger reconciliation commitments

- Added the M10.109 read-store contract and unregistered Prisma implementation keyed by canonical reconciliation UUID.
- Rejected malformed identity before database access and returned explicit absence for unknown valid identities.
- Reused the authoritative M10.108 persisted mapper to reconstruct and revalidate every present row.
- Preserved immutable historical semantics without reloading current accounting balances or contacting the provider.
- Added focused tests for reconstruction, defensive output, absence, invalid identity, corrupt evidence, and identity divergence, plus PostgreSQL E2E read/absence coverage.
- Added no schema, route, runtime registration, provider call, accounting mutation, valuation, PnL, funding, quote/submission authorization, executor, or real order.
- Verified all 2,464 backend tests across 212 suites, including 6 focused reader tests, all 97 PostgreSQL E2E tests across 9 suites with all 34 migrations, all 94 dashboard tests across 17 files, formatting, lint, Prisma and Compose validation, backend/dashboard builds, whitespace checks, and live API/dashboard checks with fresh Binance-backed valuation.

## 2026-10-17 — Persist immutable ledger reconciliation commitments

- Added the M10.108 PostgreSQL model and migration for immutable accounting-ledger reconciliation evidence.
- Added an unregistered serializable Prisma store with a dedicated advisory transaction lock.
- Revalidated the durable initialization, raw asset identities, complete current balance table, and exact M10.101 snapshot before insertion.
- Enforced unique reconciliation identity and evidence fingerprint with exact replay and divergent-reuse conflict.
- Reconstructed and revalidated persisted JSON balances, dates, fingerprints, and recording chronology before returning them.
- Added focused store tests and PostgreSQL E2E coverage through initialization, reconciliation, first record, and exact replay.
- Added no route, runtime registration, provider call, accounting mutation, valuation, PnL, funding, quote/submission authorization, executor, or real order.
- Verified all 2,458 backend tests across 211 suites, including 9 focused store tests, all 97 PostgreSQL E2E tests across 9 suites with all 34 migrations, all 94 dashboard tests across 17 files, formatting, lint, Prisma and Compose validation, backend/dashboard builds, whitespace checks, and live API/dashboard checks with fresh Binance-backed valuation.

## 2026-10-17 — Prepare deterministic ledger reconciliation evidence

- Added a pure M10.107 commitment boundary over successful authenticated wallet/accounting-ledger reconciliation.
- Revalidated the complete M10.103 reconciliation before preserving any success claim.
- Required a canonical reconciliation UUID and preparation no earlier than reconciliation.
- Deeply copied and canonically ordered initialization, current-ledger, and wallet balances plus every date.
- Calculated and revalidated a deterministic SHA-256 fingerprint independent of balance-array order.
- Kept the commitment persistence-ready but unstored and permanently non-authorizing.
- Added no schema, repository, route, runtime registration, provider call, mutation, valuation, PnL, funding, quote/submission authorization, executor, or real order.
- Verified all 2,449 backend tests across 210 suites, including 9 focused commitment tests, all 96 PostgreSQL E2E tests across 9 suites with all 33 migrations, all 94 dashboard tests across 17 files, formatting, lint, Prisma and Compose validation, backend/dashboard builds, whitespace checks, and live API/dashboard checks with fresh Binance-backed valuation.

## 2026-10-17 — Guard concurrent wallet reconciliation attempts per initialization

- Added an unregistered M10.106 process-local guard around the complete M10.105 one-shot boundary.
- Reused the M10.105 request validator before acquiring a canonical initialization claim.
- Rejected overlapping same-initialization calls immediately without delegation, waiting, or shared cancellation.
- Allowed different initialization identities to proceed independently and released claims after success or propagated failure.
- Documented that the guard is per instance and provides no database lease or distributed coordination.
- Added no schema, route, runtime registration, provider authority, retry, loop, timer, schedule, mutation, valuation, PnL, funding, quote/submission authorization, executor, or real order.
- Verified all 2,440 backend tests across 209 suites, including 7 focused guard tests, all 96 PostgreSQL E2E tests across 9 suites with all 33 migrations, all 94 dashboard tests across 17 files, formatting, lint, Prisma and Compose validation, backend/dashboard builds, whitespace checks, and live API/dashboard checks with fresh Binance-backed valuation.

## 2026-10-17 — Add one bounded read-only wallet reconciliation attempt

- Added an unregistered M10.105 coordinator that permits one Agentic Wallet capability read and one M10.104 reconciliation only.
- Validated initialization identity and observation-age policy before provider access.
- Used separate pre-read and post-read clocks, rejecting invalid or regressed time before durable reconciliation.
- Enforced cancellation before provider access and again after the read, with no retry, loop, timer, or schedule.
- Preserved provider failure, durable absence, and reconciliation blockers without repair or coercion.
- Added PostgreSQL E2E composition with a bounded read-loader double and the real durable reconciliation path.
- Added no route, runtime registration, mutable command, accounting mutation, valuation, PnL, funding, quote/submission authorization, executor, or real order.
- Verified all 2,433 backend tests across 208 suites, including 11 focused attempt tests, all 96 PostgreSQL E2E tests across 9 suites with all 33 migrations, all 94 dashboard tests across 17 files, formatting, lint, Prisma and Compose validation, backend/dashboard builds, whitespace checks, and live API/dashboard checks with fresh Binance-backed valuation.

## 2026-10-17 — Compose durable ledger reading with wallet reconciliation

- Added an unregistered M10.104 read-only service over the M10.102 snapshot store and M10.103 reconciliation policy.
- Rejected malformed initialization identity, evaluation clock, and freshness policy before database access.
- Defensively captured the request and complete capability observation before the asynchronous durable read.
- Preserved explicit missing initialization, policy-level wallet divergence, and fail-closed propagation of durable inconsistency.
- Added PostgreSQL E2E coverage for successful reconciliation from a freshly initialized durable ledger.
- Added no schema, route, runtime registration, provider invocation, mutation, valuation, PnL, funding, quote/submission authorization, executor, or real order.
- Verified all 2,422 backend tests across 207 suites, including 7 focused composition tests, all 96 PostgreSQL E2E tests across 9 suites with all 33 migrations, all 94 dashboard tests across 17 files, formatting, lint, Prisma and Compose validation, backend/dashboard builds, whitespace checks, and live API/dashboard checks with fresh Binance-backed valuation.

## 2026-10-17 — Reconcile the current ledger with authenticated wallet balances

- Added a pure M10.103 reconciliation boundary over one valid M10.102 ledger snapshot and one authenticated pinned-CLI Agentic Wallet observation.
- Reused M10.98 wallet validation and canonical approved-asset extraction instead of accepting caller-supplied wallet quantities.
- Required fresh post-ledger observation chronology and exact canonical USDT, BTCB, and native BNB equality.
- Rejected unavailable, stale, future, predating, partial, identity-divergent, or quantity-divergent wallet evidence.
- Returned defensive non-authorizing reconciliation state with no persistence, route, provider invocation, mutation, valuation, PnL, funding, executor, or real order.
- Verified all 2,415 backend tests across 206 suites, including 15 focused reconciliation tests, all 96 PostgreSQL E2E tests across 9 suites with all 33 migrations, all 94 dashboard tests across 17 files, formatting, lint, Prisma and Compose validation, backend/dashboard builds, whitespace checks, and live API/dashboard checks with fresh Binance-backed valuation.

## 2026-10-17 — Read a consistent durable accounting-ledger snapshot

- Added an unregistered M10.102 Prisma reader selected by canonical initialization UUID and explicit finite evaluation time.
- Loaded the immutable initialization receipt and all current ledger rows in one repeatable-read transaction.
- Reapplied the M10.100 persisted receipt mapper and M10.101 provenance assessment, including exact durable asset-identity checks.
- Returned explicit absence or a defensive complete snapshot while corrupt coverage, quantity, identity, and chronology fail closed.
- Added no schema, route, runtime registration, balance mutation, valuation, PnL, provider call, funding, quote/submission authorization, executor, or real order.
- Verified all 2,400 backend tests across 205 suites, including 11 focused reader tests, all 96 PostgreSQL E2E tests across 9 suites with all 33 migrations, all 94 dashboard tests across 17 files, formatting, lint, Prisma and Compose validation, backend/dashboard builds, whitespace checks, and live API/dashboard checks with fresh Binance-backed valuation.

## 2026-10-17 — Validate current accounting-ledger provenance

- Added a pure M10.101 boundary that combines one valid M10.100 initialization receipt with the current local-accounting balances.
- Required exact unique USDT, BTCB, and native BNB coverage, canonical non-negative decimals, and update timestamps bounded by initialization and explicit evaluation time.
- Rejected missing, extra, duplicate, malformed, unknown, pre-initialization, and future ledger facts without repair or inference.
- Returned defensive initial/current snapshots while keeping quote and submission authorization false.
- Added no persistence access, schema, route, runtime registration, balance mutation, valuation, PnL, provider call, funding, executor, or real order.
- Verified all 2,389 backend tests across 204 suites, including 13 focused snapshot-policy tests, all 96 PostgreSQL E2E tests across 9 suites with all 33 migrations, all 94 dashboard tests across 17 files, formatting, lint, Prisma and Compose validation, backend/dashboard builds, whitespace checks, and live backend health with fresh Binance-backed valuation.

## 2026-10-17 — Read trusted accounting initialization receipts

- Added an unregistered M10.100 read contract and Prisma reader selected by canonical initialization UUID.
- Reused the M10.99 persisted mapper to reconstruct and validate the complete M10.98 initialization artifact, chronology, freshness, and request fingerprint.
- Returned explicit absence or defensive initialized balance/date snapshots while rejecting malformed identity and corrupt or divergent persistence.
- Kept the reader side-effect free with no balance mutation, route, runtime registration, provider call, funding, quote/submission authorization, executor, or real order.
- Verified all 2,376 backend tests across 203 suites, including 10 focused reader tests, all 96 PostgreSQL E2E tests across 9 suites with all 33 migrations, all 94 dashboard tests across 17 files, formatting, lint, Prisma and Compose validation, backend/dashboard builds, whitespace checks, and live backend health with fresh Binance-backed valuation.

## 2026-10-16 — Initialize trusted local-accounting balances atomically

- Added an unregistered M10.99 serializable Prisma store for the prepared M10.98 balance snapshot.
- Revalidated snapshot structure and wallet-observation freshness at transaction time, then required an empty ledger before inserting exactly USDT, BTCB, and native BNB.
- Recorded one immutable provider/chain initialization receipt in the same transaction as all three balances.
- Made exact replay idempotent while changed reuse and pre-existing accounting state fail closed.
- Added database constraints for the fixed provider/chain, bounded freshness, and complete initialization chronology.
- Kept quote/submission authorization false and added no route, runtime registration, provider call, funding, executor, or real order.
- Verified all 2,366 backend tests across 202 suites, including 4 focused store tests, all 96 PostgreSQL E2E tests across 9 suites with all 33 migrations, all 94 dashboard tests across 17 files, formatting, lint, Prisma and Compose validation, backend/dashboard builds, whitespace checks, and live backend health.

## 2026-10-16 — Prepare trusted local-accounting starting balances

- Added a pure M10.98 preflight that derives local USDT, BTCB, and native BNB starting balances only from a fresh authenticated Agentic Wallet capability observation.
- Required the pinned CLI contract, connected approved BSC wallet, successful balance read, complete unique approved-asset coverage, a canonical initialization identity, and an exact operator acknowledgment.
- Canonicalized provider decimal quantities, ignored unrelated assets, and rejected malformed, partial, duplicate, stale, future, or identity-divergent observations.
- Kept the result inert and defensive: no balance is persisted or initialized and quote/submission authorization remains false.
- Added no schema, route, runtime registration, new provider command or call, funding, executor, or real order.
- Verified all 2,362 backend tests across 201 suites, including 22 focused initialization-preflight tests, all 95 PostgreSQL E2E tests across 9 suites with all 32 migrations, all 94 dashboard tests across 17 files, formatting, lint, Prisma and Compose validation, backend/dashboard builds, whitespace checks, and live backend health.

## 2026-10-16 — Read completed accounting applications by gate

- Added a read-only M10.97 store contract with canonical gate UUID validation before persistence access.
- Added a Prisma reader that loads the M10.96 receipt with its complete authorization, commitment, accounting-evidence, and financial-evidence relation.
- Reused the shared persisted application mapper to reconstruct prior policies and reject cross-related, malformed, divergent, invalid-fingerprint, or chronologically invalid state.
- Returned explicit absence or a defensive completed-accounting snapshot without changing balances or contacting a provider.
- Added no schema, route, runtime registration, valuation, PnL calculation, submission retry, funding, executor, or real order.
- Verified all 2,340 backend tests across 200 suites, including 9 focused reader tests, all 95 PostgreSQL E2E tests across 9 suites with all 32 migrations, all 94 dashboard tests across 17 files, formatting, lint, Prisma and Compose validation, backend/dashboard builds, whitespace checks, and live backend health.

## 2026-10-16 — Apply authorized local accounting atomically

- Added explicit local accounting balances plus one immutable application receipt per authorization, commitment, evidence chain, gate, transaction, and plan fingerprint.
- Added an unregistered serializable Prisma writer that reloads the complete durable authorization relation and reruns M10.95 against the exact database balance snapshot.
- Applied every transition with a conditional expected-before update in one transaction, so missing, stale, malformed, or concurrently changed balances roll back the complete application.
- Added canonical request fingerprinting, exact replay without repeated balance mutation, divergent-reuse conflicts, and persisted receipt revalidation.
- Extended generated Prisma support and PostgreSQL E2E coverage across all 32 migrations; no route, runtime registration, provider call, valuation, PnL calculation, submission retry, funding, executor, or real order was added.
- Verified all 2,331 backend tests across 199 suites, including 8 focused writer tests, all 95 PostgreSQL E2E tests across 9 suites, all 94 dashboard tests across 17 files, formatting, lint, Prisma and Compose validation, backend/dashboard builds, whitespace checks, and live backend health.

## 2026-10-16 — Preflight atomic accounting application

- Added a pure fail-closed boundary that accepts only a structurally valid stored accounting authorization and a complete current local-ledger balance snapshot.
- Required canonical application identity, exact authorization/mutation/fingerprint/gate/transaction correlation, literal application-review acknowledgment, and post-authorization chronology.
- Required bounded unique asset coverage and exact equality between every local current quantity and authorized `beforeQuantity`.
- Returned defensive, deterministically ordered balance and transition snapshots while marking preparation only; accounting completion and submission retry remain false.
- Added no schema, repository, route, runtime registration, provider call, ledger/PnL mutation, valuation, funding, executor, or real order.
- Verified all 2,323 backend tests across 198 suites, including all 24 focused application-preflight tests, all 95 PostgreSQL E2E tests across 9 suites with all 31 migrations, all 94 dashboard tests across 17 files, formatting, lint, Prisma and Compose validation, backend/dashboard builds, whitespace checks, and live backend health.

## 2026-10-16 — Read durable accounting mutation authorizations by gate

- Added a read-only authorization-store contract with fail-closed canonical gate UUID validation.
- Added a Prisma reader that loads each M10.93 authorization with its commitment, accounting evidence, and financial evidence and reapplies M10.91 and M10.92 through the shared persisted mapper.
- Returned explicit absence or a defensive stored snapshot while rejecting cross-related, malformed, divergent, invalid-acknowledgment, or chronologically invalid data.
- Kept accounting mutation incomplete and submission retry forbidden; added no schema, route, runtime registration, provider call, ledger/PnL mutation, valuation, funding, executor, or real order.
- Verified all 2,299 backend tests across 197 suites, including the focused 7-test reader suite, all 95 PostgreSQL E2E tests across 9 suites with all 31 migrations applied from scratch, all 94 dashboard tests across 17 files, formatting, lint, Prisma and Compose validation, backend/dashboard builds, whitespace checks, and live backend health.

## 2026-10-16 — Persist immutable accounting mutation authorizations

- Added one immutable PostgreSQL authorization row per commitment, accounting evidence, financial evidence, gate, transaction hash, and canonical plan fingerprint.
- Added a serializable Prisma store that rejects malformed input before access and revalidates the complete M10.91 durable commitment relation before rerunning M10.92.
- Added canonical request fingerprinting, exact idempotent replay, divergent reuse conflict, persisted-row validation, and post-authorization recording chronology.
- Extended generated Prisma support and PostgreSQL E2E coverage across all 31 migrations.
- Kept accounting mutation incomplete and submission retry forbidden; added no route, runtime registration, provider call, ledger/PnL mutation, valuation, funding, executor, or real order.
- Verified all 2,292 backend tests across 196 suites, including 8 new focused authorization-store tests, all 95 PostgreSQL E2E tests across 9 suites, all 94 dashboard tests across 17 files, formatting, lint, Prisma and Compose validation, backend/dashboard builds, and whitespace checks. Live health remained unavailable because the API was not running and the bounded startup probe did not expose the endpoint.

## 2026-10-15 — Authorize exact durable accounting commitments

- Added a pure fail-closed authorization boundary over structurally valid stored M10.90 commitments.
- Required a canonical authorization UUID, exact mutation/fingerprint/gate/transaction correlation, literal durable-evidence review acknowledgment, and post-recording authorization time.
- Returned defensive commitment and timestamp snapshots while changing only accounting authorization; completion stays false and submission retry stays forbidden.
- Added no schema, persistence, route, runtime registration, provider call, wallet-ledger/PnL mutation, funding, executor, or real order.
- Verified all 2,284 backend tests across 195 suites, including the focused 17-test authorization suite, all 95 PostgreSQL E2E tests across 9 suites with all 30 migrations applied from scratch, all 94 dashboard tests across 17 files, formatting, lint, Prisma validation, backend/dashboard builds, whitespace checks, and live backend health.

## 2026-10-15 — Read durable accounting mutation commitments by gate

- Added a read-only commitment store contract with fail-closed canonical gate UUID validation.
- Added a Prisma reader that loads each M10.90 commitment with its accounting and financial evidence and reapplies M10.87, M10.88, and M10.89.
- Returned explicit absence or a defensive stored snapshot while rejecting cross-related, malformed, or divergent durable data.
- Kept accounting mutation unauthorized and incomplete and submission retry forbidden; added no schema, route, runtime registration, provider call, wallet-ledger/PnL mutation, funding, executor, or real order.
- Verified all 2,267 backend tests across 194 suites, including the focused 7-test reader suite, all 95 PostgreSQL E2E tests across 9 suites with all 30 migrations applied from scratch, all 94 dashboard tests across 17 files, formatting, lint, Prisma validation, backend/dashboard builds, whitespace checks, and live backend health. The shared-schema E2E suites passed in their deterministic serial mode after a parallel run exposed cross-suite data collisions.

## 2026-10-15 — Persist immutable accounting mutation commitments

- Added one immutable PostgreSQL commitment row per accounting evidence, financial evidence, gate, transaction hash, and canonical plan fingerprint.
- Added a serializable Prisma store that rejects invalid commitment input before access and reloads the accounting row with its financial relation.
- Reused the M10.87 durable read policy and reapplied M10.88/M10.89 before insertion.
- Added a complete canonical request fingerprint, exact replay without evidence reload, divergent conflict rejection, malformed-row rejection, and recording chronology validation.
- Extended generated Prisma support and PostgreSQL E2E coverage across all 30 migrations.
- Kept accounting mutation unauthorized and incomplete and submission retry forbidden; added no route, runtime registration, provider call, wallet-ledger/PnL mutation, funding, retry, executor, or real order.
- Verified all 2,260 backend tests across 193 suites, including 39 focused commitment/reader tests, all 95 PostgreSQL E2E tests across 9 suites, all 94 dashboard tests across 17 files, formatting, lint, Prisma validation, backend/dashboard builds, and live backend health.

## 2026-10-15 — Commit inert accounting plans canonically

- Added a pure fail-closed commitment boundary that revalidates every M10.88 plan fact and inert safety flag.
- Required a canonical mutation UUID and a finite preparation time at or after durable balance-evidence recording.
- Added deterministic SHA-256 plan fingerprints independent of mutation identity, transition array order, and transition property order.
- Returned defensive plan, transition, and date snapshots and blocked malformed untrusted dates without throwing.
- Kept accounting mutation explicitly unauthorized and incomplete and submission retry forbidden; added no schema, persistence, route, runtime registration, provider call, ledger/PnL mutation, funding, retry, executor, or real order.
- Verified all 2,251 backend tests across 192 suites, including the focused 23-test commitment suite, all 95 PostgreSQL E2E tests across 9 suites with all 29 migrations, all 94 dashboard tests across 17 files, formatting, lint, backend/dashboard builds, and live backend health.

## 2026-10-15 — Project an inert accounting mutation plan

- Added a pure fail-closed projection from one structurally valid stored M10.87 accounting balance-evidence envelope.
- Preserved durable evidence, completion, gate, and transaction identities plus deterministic exact before/after/delta asset transitions and defensive timestamps.
- Blocked invalid stored UUIDs, recording chronology, coverage, duplicate assets, decimal structure, and balance arithmetic.
- Kept accounting mutation explicitly unauthorized and incomplete and kept submission retry forbidden.
- Added no schema, repository, route, runtime registration, provider call, wallet-ledger/PnL mutation, funding, retry, executor, or real order.
- Verified all 2,228 backend tests across 191 suites, including the focused 14-test mutation-plan suite, all 95 PostgreSQL E2E tests across 9 suites with all 29 migrations, all 94 dashboard tests across 17 files, formatting, lint, backend/dashboard builds, and live backend health.

## 2026-10-15 — Read durable accounting balance evidence by gate

- Added a read-only accounting balance-evidence contract with fail-closed canonical gate UUID validation.
- Added a Prisma reader that loads the M10.86 row with its required financial relation and reapplies the shared M10.82, M10.83, and M10.85 policies.
- Returned explicit absence or a defensive stored snapshot while rejecting cross-gate, cross-evidence, malformed, or financially inconsistent rows.
- Extended PostgreSQL E2E coverage through durable accounting-evidence reload while accounting remains required and incomplete.
- Added no schema, acquisition adapter, route, runtime registration, provider call, wallet-ledger/PnL mutation, funding, retry, executor, or real order.
- Verified all 2,214 backend tests across 190 suites, including the focused 7-test reader suite, all 95 PostgreSQL E2E tests across 9 suites with all 29 migrations, all 94 dashboard tests across 17 files, formatting, lint, backend/dashboard builds, and whitespace integrity.

## 2026-10-15 — Persist immutable accounting balance evidence

- Added one immutable PostgreSQL accounting balance-evidence row per financial reconciliation, gate, and transaction hash.
- Added a serializable Prisma store that rejects malformed input early, reloads durable financial evidence, and reapplies M10.83 and M10.85 before insertion.
- Added canonical order-insensitive fingerprints, exact replay, divergent conflict rejection, recording metadata validation, malformed-row rejection, generated Prisma support, focused tests, and PostgreSQL E2E coverage across all 29 migrations.
- Confirmed persistence leaves accounting mutation required and incomplete and keeps submission retry forbidden.
- Added no evidence acquisition, route, runtime registration, provider call, wallet-ledger/PnL mutation, funding, retry, executor, or real order.
- Verified all 2,207 backend tests across 189 suites, including 36 focused M10.85–M10.86 tests, all 95 PostgreSQL E2E tests across 9 suites with all 29 migrations, all 94 dashboard tests across 17 files, formatting, lint, backend/dashboard builds, Prisma validation, and whitespace integrity.

## 2026-10-15 — Gate accounting on correlated wallet balance evidence

- Added a pure fail-closed assessment for complete post-reconciliation wallet balance changes.
- Required exact identity and chronology correlation, canonical unique self-consistent deltas, source debit covering submitted quantity plus source-token fees, exact net target credit, sufficient BNB network-fee debit, and sufficient third-token provider-fee debits.
- Preserved completed financial reconciliation independently when only accounting evidence is blocked, while preventing malformed completion input from claiming completion.
- Produced only a defensive persistence-ready snapshot; added no schema, evidence acquisition, store, route, runtime registration, provider call, wallet mutation, valuation, PnL, funding, retry, executor, or real order.
- Verified all 2,199 backend tests across 188 suites, including the focused 28-test accounting balance-evidence suite, plus formatting, lint, and backend/dashboard builds.

## 2026-10-09 — Load durable financial-reconciliation completion by gate

- Added a read-only completion-store contract with fail-closed canonical gate identity validation.
- Added a Prisma reader that returns explicit absence or maps immutable M10.82 evidence through the shared validator and pure M10.83 completion projection.
- Rejected malformed persisted receipt/cost/time facts and valid rows that contradict the requested gate identity.
- Extended PostgreSQL E2E coverage from immutable evidence insertion/replay through completed reconciliation loading while accounting remains untouched.
- Added no schema change, route, NestJS registration, provider call, funding, wallet mutation, valuation, PnL, retry, executor, or real order.
- Verified all 2,171 backend tests across 187 suites, the focused 8-test completion-reader suite, all 95 PostgreSQL E2E tests across 9 suites with all 28 migrations, all 94 dashboard tests across 17 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace integrity.

## 2026-10-09 — Project durable evidence into completed financial reconciliation

- Added a pure fail-closed completion projection that accepts only a valid stored M10.82 evidence envelope.
- Preserved gate, provider order, terminal observation, transaction, token, actual-receipt, provider-fee, network-fee, and evidence-time facts in a defensive snapshot.
- Marked financial reconciliation complete independently from accounting: balance/PnL mutation remains explicitly required and incomplete, and submission retry remains forbidden.
- Added no evidence loading, persistence change, route, runtime registration, provider call, funding, wallet accounting, valuation, PnL, executor, or real order.
- Verified all 2,163 backend tests across 186 suites, the focused 10-test completion suite, all 95 PostgreSQL E2E tests across 9 suites with all 28 migrations, all 94 dashboard tests across 17 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace integrity.

## 2026-10-09 — Persist immutable financial-reconciliation evidence

- Added one immutable PostgreSQL record for complete, correlated M10.81 financial evidence, including actual receipt and explicit provider/network costs.
- Added a serializable per-gate store that reloads gate, receipt, and latest status context and reapplies the pure fail-closed assessment before inserting.
- Added fingerprint-based exact replay, divergent-payload conflict rejection, unique provider execution identities, generated Prisma client support, focused tests, and PostgreSQL E2E coverage.
- Kept the store unwired and `financialReconciliationComplete: false`; added no evidence adapter, provider call, wallet accounting, valuation, PnL, funding, retry, executor, or real order.
- Verified all 2,153 backend tests across 185 suites, all 95 PostgreSQL E2E tests across 9 suites with all 28 migrations, the focused 22-test evidence/persistence suite, all 94 dashboard tests across 17 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace integrity.

## 2026-10-09 — Gate financial reconciliation on complete correlated evidence

- Added a pure fail-closed evidence gate for provider-`FINISHED` Agentic Wallet swaps without treating terminal status as completed accounting.
- Required exact gate, order, terminal-observation, transaction, chain, token, and source-quantity correlation plus positive actual target receipt.
- Required explicit transaction receipt, target balance delta, bounded complete provider-fee components, complete positive BNB network fee, and post-status observation time.
- Kept ready output unpersisted and `financialReconciliationComplete: false`; added no evidence acquisition, schema, repository, wallet accounting, PnL, runtime wiring, funding, provider call, mutating command, executor, retry, or real order.
- Verified all 2,144 backend tests across 184 suites, the focused 13-test financial-evidence suite, all 94 dashboard tests across 17 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace integrity.

## 2026-10-09 — Share status-transition policy across durable producer and cycle boundary

- Replaced the cycle's duplicated provider-evidence transition comparison with the same pure assessor used by the serializable observation store.
- Required every different-identity pending result to classify canonically as `observation_advanced`.
- Kept UUID immutability and local recording-time chronology independently enforced at the durable-result boundary.
- Added no schema, write behavior, runtime registration, provider call, wait, loop, timer, worker, schedule, wallet mutation, funding, mutating command runner, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,131 backend tests across 183 suites, the focused 51-test reconciliation-cycle suite, all 94 dashboard tests across 17 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace integrity.

## 2026-10-09 — Validate new status rows against discovered pending evidence

- Applied booking-time immutability, provider-time monotonicity, known-hash immutability, and material-advancement checks to non-replayed newly stored observations.
- Rejected a fresh UUID paired with impossible or provider-identical evidence before aggregation and before the next candidate.
- Preserved first-observation behavior and valid new rows carrying actual pending or terminal progress.
- Added no schema, write behavior, runtime registration, provider call, wait, loop, timer, worker, schedule, wallet mutation, funding, mutating command runner, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,131 backend tests across 183 suites, the focused 51-test reconciliation-cycle suite, all 94 dashboard tests across 17 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace integrity.

## 2026-10-09 — Require material advancement for concurrent status replay identity

- Rejected a replayed status observation that claims a different UUID while retaining provider evidence identical to the pending row discovered by the cycle.
- Accepted each producer-coherent advancement independently: later provider update time, newly populated transaction hash, or terminal provider status.
- Preserved equal local recording timestamps because durable sequence remains authoritative for tied rows.
- Added no schema, write behavior, runtime registration, provider call, wait, loop, timer, worker, schedule, wallet mutation, funding, mutating command runner, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,130 backend tests across 183 suites, the focused 50-test reconciliation-cycle suite, all 94 dashboard tests across 17 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace integrity.

## 2026-10-09 — Enforce coherent transitions for concurrent status replays

- Required a different-identity replay returned after pending-candidate discovery to preserve provider booking time, keep provider update time monotonic, and retain any already-known transaction hash.
- Preserved coherent concurrent pending or terminal progress, including population of a previously absent transaction hash.
- Rejected impossible replay transitions before cycle aggregation and before the next candidate.
- Added no schema, write behavior, runtime registration, provider call, wait, loop, timer, worker, schedule, wallet mutation, funding, mutating command runner, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,128 backend tests across 183 suites, the focused 48-test reconciliation-cycle suite, all 94 dashboard tests across 17 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace integrity.

## 2026-10-09 — Preserve complete evidence for known status replays

- Extended due pending candidates with the immutable transaction hash, booking time, and provider update time from their latest durable observation.
- Required an exact replay of the discovered observation UUID to preserve every provider-evidence field as well as its existing pending status and local recording time.
- Rejected malformed candidate snapshots and same-identity hash or provider-time rewrites before cycle aggregation or later work.
- Preserved valid different-identity replay for concurrently advanced durable evidence.
- Added no schema, write behavior, runtime registration, provider call, wait, loop, timer, worker, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,126 backend tests across 183 suites, the focused 46-test reconciliation-cycle suite, the focused 13-test candidate-store suite, the focused 17-test PostgreSQL submission/reconciliation E2E suite with all 27 migrations, all 94 dashboard tests across 17 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace integrity.

## 2026-10-09 — Bound deferred status lookup to one cadence interval

- Passed the cycle's validated minimum lookup interval into the untrusted reconciliation-attempt result boundary.
- Rejected `status_lookup_deferred` evidence whose future deadline exceeds one complete configured interval after its attempt evaluation.
- Preserved the exact interval boundary and valid deferral caused by a concurrent authoritative context reload.
- Added focused coverage proving rejection occurs before aggregation and before the next candidate.
- Added no schema, persistence behavior, runtime registration, provider call, wait, loop, timer, worker, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,123 backend tests across 183 suites, the focused 46-test reconciliation-cycle suite, all 94 dashboard tests across 17 files, formatting, lint, backend/dashboard builds, Compose configuration, and whitespace integrity.

## 2026-10-09 — Show Agentic Wallet expiry and document stale-session recovery

- Confirmed with two sanitized live CLI 1.10.0 reads that authenticated token use advances the inactivity sign-out deadline by 48 hours, independently from the approximately one-year maximum sign-in deadline.
- Extended the existing manual read-only observation with provider-reported effective session, inactivity, and maximum sign-in timestamps while continuing to omit all credentials, session identifiers, wallet addresses, and token holdings.
- Moved the settings read after the other authenticated wallet reads so the reported inactivity deadline follows the immediately preceding token use.
- Added an absolute deadline and live local countdown to the dashboard; the timer never contacts the wallet and cannot renew the session.
- Documented the Windows Credential Manager stale-session cause, `illegal parameter` symptom, explicit sign-out/re-pair recovery, and single loopback host-process requirement.
- Added no automatic wallet refresh, keepalive, funding, quote, mutation, signing, submission, executor, or real order.
- Verified all 2,122 backend tests across 183 suites, all 94 dashboard tests across 17 files, focused wallet tests, formatting, lint, backend/dashboard builds, Compose configuration, whitespace integrity, and a sanitized live observation from the single refreshed host API. Paper valuation remained HTTP 200 through the dashboard proxy.

## 2026-10-09 — Correlate first-observation replay time with its receipt

- Required every replayed status observation to retain a recording time equal to or later than the immutable submission receipt.
- Rejected a concurrently created first-observation row that purportedly predates the receipt authorizing its durable correlation.
- Preserved equality, valid first-observation concurrency, and the stricter identity/time rules for pending candidates.
- Added focused acceptance and rejection coverage at the manual-cycle result boundary.
- Added no schema, persistence behavior, database claim or lease, NestJS registration, route, live process invocation, live provider call, waiting, polling, timer, worker, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,121 backend tests across 183 suites, the focused 45-test reconciliation-cycle suite, the focused 17-test PostgreSQL submission/reconciliation E2E suite with all 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace integrity.

## 2026-10-08 — Correlate concurrent replay recording time

- Required a replay with an identity different from the discovered pending observation to retain a recording time equal to or later than that observation.
- Rejected a purported concurrently newer durable row whose local timestamp predates the discovery snapshot.
- Preserved equal timestamps under database-sequence ordering and the stricter immutable-fact checks for replay of the known identity.
- Added focused acceptance and rejection coverage at the manual-cycle result boundary.
- Added no schema, persistence behavior, database claim or lease, NestJS registration, route, live process invocation, live provider call, waiting, polling, timer, worker, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,119 backend tests across 183 suites, the focused 43-test reconciliation-cycle suite, the focused 17-test PostgreSQL submission/reconciliation E2E suite with all 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace integrity.

## 2026-10-08 — Keep status-observation recording time monotonic

- Required every newly appended status observation to be recorded at or after the latest durable row as well as the submission receipt.
- Preserved equal recording timestamps because the immutable database sequence remains the authoritative history order.
- Kept exact latest replay idempotent and independent from the current recording clock.
- Added focused regression coverage proving that a valid provider-status progression cannot be appended with a regressed local recording time.
- Added no schema, NestJS registration, route, live process invocation, live provider call, polling, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,117 backend tests across 183 suites, the focused 8-test status-observation-store suite, the focused 17-test PostgreSQL submission/reconciliation E2E suite with all 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace integrity.

## 2026-10-08 — Preserve immutable evidence for known observation replays

- Required a replay returning the pending candidate's known observation ID to preserve its exact recording time and `PENDING` provider state.
- Rejected the same UUID paired with a rewritten timestamp or terminal status before aggregation or the next candidate.
- Preserved replay results with newer valid identities created by concurrent persistence.
- Added focused rejection coverage plus acceptance of a coherent known-identity replay.
- Added no schema, persistence behavior, database claim or lease, NestJS registration, route, live process invocation, live provider call, waiting, polling, timer, worker, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,116 backend tests across 183 suites, the focused 41-test reconciliation-cycle suite, the focused 17-test PostgreSQL submission/reconciliation E2E suite with all 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace integrity.

## 2026-10-08 — Require fresh identity for newly stored status observations

- Rejected a non-replayed status observation that reuses the discovered pending candidate's latest observation ID.
- Preserved existing and concurrently newer identities for exact replay results.
- Aligned the untrusted cycle result boundary with the append-only store's fresh-UUID behavior.
- Added focused rejection coverage and corrected valid pending fixtures to represent genuine new rows.
- Added no schema, persistence behavior, database claim or lease, NestJS registration, route, live process invocation, live provider call, waiting, polling, timer, worker, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,115 backend tests across 183 suites, the focused 40-test reconciliation-cycle suite, the focused 17-test PostgreSQL submission/reconciliation E2E suite with all 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace integrity.

## 2026-10-08 — Reject fabricated first-observation cadence boundaries

- Required completed provider-call results for `awaiting_status_observation` candidates to retain `nextStatusLookupAt: null`.
- Completed phase-exact cadence correlation with the non-null monotonic pending-state contract from M10.66–M10.67.
- Rejected invented first-observation boundaries before aggregation or the next candidate without repair or retry.
- Added focused coverage for both invalid responses and recorded observations.
- Added no schema, persistence behavior, database claim or lease, NestJS registration, route, live process invocation, live provider call, waiting, polling, timer, worker, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,113 backend tests across 183 suites, the focused 38-test reconciliation-cycle suite, the focused 17-test PostgreSQL submission/reconciliation E2E suite with all 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace integrity.

## 2026-10-08 — Reject regressed pending-candidate cadence boundaries

- Required retained `nextStatusLookupAt` evidence for a discovered `provider_pending` candidate to be at or after its discovered `eligibleAt`.
- Preserved equality for the unchanged authoritative context and later boundaries for concurrently advanced pending evidence.
- Rejected an arbitrary earlier non-null boundary before aggregation or the next candidate without repair or retry.
- Added focused regression coverage for both invalid responses and recorded observations.
- Added no schema, persistence behavior, database claim or lease, NestJS registration, route, live process invocation, live provider call, waiting, polling, timer, worker, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,112 backend tests across 183 suites, the focused 37-test reconciliation-cycle suite, the focused 17-test PostgreSQL submission/reconciliation E2E suite with all 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace integrity.

## 2026-10-08 — Retain pending-candidate cadence evidence

- Required completed provider-call results for discovered `provider_pending` candidates to retain a non-null `nextStatusLookupAt`.
- Preserved `null` as the valid boundary for candidates awaiting their first status observation.
- Rejected missing pending-state cadence evidence before aggregation or the next candidate without repairing or retrying it.
- Added focused rejection and acceptance coverage for both invalid responses and recorded observations.
- Added no schema, persistence behavior, database claim or lease, NestJS registration, route, live process invocation, live provider call, waiting, polling, timer, worker, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,110 backend tests across 183 suites, the focused 35-test reconciliation-cycle suite, the focused 17-test PostgreSQL submission/reconciliation E2E suite with all 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace integrity.

## 2026-10-08 — Reject impossible status-response blocker combinations

- Added a shared semantic policy for blocker combinations emitted by the Agentic Wallet status-response assessor.
- Rejected mismatch or row-level blockers when invalid gate/receipt structure prevents those checks.
- Made invalid envelope, explicit provider failure, and invalid successful lookup payload mutually exclusive while preserving the valid malformed-pagination-plus-row case.
- Rejected response branches that prevent row parsing when they claim row-level failures, before aggregation or the next candidate and without repair or retry.
- Added focused impossible-combination coverage while preserving canonical order, phase correlation, timing, snapshots, cancellation, bounds, financial incompleteness, and no retry.
- Added no schema, persistence behavior, database claim or lease, NestJS registration, route, live process invocation, live provider call, waiting, polling, timer, worker, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,108 backend tests across 183 suites, the focused 33-test reconciliation-cycle suite, the focused 17-test PostgreSQL submission/reconciliation E2E suite with all 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace integrity.

## 2026-10-08 — Preserve canonical reconciliation-blocker shape

- Required every pre-provider blocked attempt to retain the single blocker emitted by its exact guard.
- Exported one canonical response-blocker order from the assessor and required multi-blocker status-response failures to preserve it.
- Rejected extra pre-call blockers and reordered post-call evidence before aggregation or the next candidate without sorting, repair, or retry.
- Added focused rejection coverage plus acceptance of canonical ordered response evidence while preserving phase correlation, timing, snapshots, cancellation, bounds, financial incompleteness, and no retry.
- Added no schema, persistence behavior, database claim or lease, NestJS registration, route, live process invocation, live provider call, waiting, polling, timer, worker, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,107 backend tests across 183 suites, the focused 32-test reconciliation-cycle suite, the focused 17-test PostgreSQL submission/reconciliation E2E suite with all 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace integrity.

## 2026-10-08 — Correlate reconciliation blockers with attempt status

- Partitioned the closed attempt-blocker vocabulary into pre-provider and status-response sets.
- Rejected response-only failures on no-call `blocked` results and pre-call-only failures on completed-call `status_response_invalid` results.
- Preserved gate, receipt, and gate/receipt mismatch blockers in both phases because response interpretation revalidates them after the awaited runner boundary.
- Added focused negative and shared-blocker positive coverage while preserving temporal coherence, canonical order, snapshots, cancellation, bounded sequential execution, financial incompleteness, and no retry.
- Added no schema, persistence behavior, database claim or lease, NestJS registration, route, live process invocation, live provider call, waiting, polling, timer, worker, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,105 backend tests across 183 suites, the focused 30-test reconciliation-cycle suite, the focused 17-test PostgreSQL submission/reconciliation E2E suite with all 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace integrity.

## 2026-10-08 — Enforce deferred-attempt discovery-time coherence

- Required `status_lookup_deferred` evaluations to occur at or after the discovery snapshot that admitted the candidate.
- Preserved valid deferral after a concurrent durable-context change while rejecting a regressed attempt clock.
- Reused the M10.61 discovery-time comparison and retained the strict future `nextStatusLookupAt` rule.
- Added focused regression coverage and preserved completed-provider timing, cadence, eligibility, observation causality, immutable replay, canonical order, snapshots, cancellation, bounded sequential execution, and no retry.
- Added no schema, persistence behavior, database claim or lease, NestJS registration, route, live process invocation, live provider call, waiting, polling, timer, worker, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,103 backend tests across 183 suites, the focused 28-test reconciliation-cycle suite, the focused 17-test PostgreSQL submission/reconciliation E2E suite with all 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace integrity.

## 2026-10-07 — Enforce discovery-to-attempt clock monotonicity

- Rejected completed provider-call results whose attempt evaluation predates the discovery evaluation embedded in the admitted candidate.
- Closed the case where a regressed attempt clock remained after `eligibleAt` but appeared to precede candidate selection.
- Added focused regression coverage and preserved M10.60 eligibility and observation-recording causality.
- Preserved immutable replay handling, canonical order, snapshots, cancellation, overlap suppression, bounded sequential execution, fail-fast propagation, financial incompleteness, and no retry.
- Added no schema, persistence behavior, database claim or lease, NestJS registration, route, live process invocation, live provider call, polling, timer, worker, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,102 backend tests across 183 suites, the focused 27-test reconciliation-cycle suite, the focused 17-test PostgreSQL submission/reconciliation E2E suite with all 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace integrity.

## 2026-10-06 — Enforce reconciliation-attempt temporal coherence

- Rejected non-throwing results that claim a provider call was evaluated before the discovered candidate's eligibility instant.
- Required a newly persisted status observation to have a recording time at or after the evaluation that produced it.
- Preserved legitimate immutable replays, whose original durable recording time may precede the current evaluation.
- Added focused coverage for both temporal regressions and the valid replay exception, and aligned the PostgreSQL cycle fixture with a monotonic recording clock.
- Preserved canonical candidate order, snapshots, cancellation, overlap suppression, bounded sequential execution, fail-fast propagation, financial incompleteness, and no retry.
- Added no schema, persistence behavior, database claim or lease, NestJS registration, route, live process invocation, live provider call, polling, timer, worker, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,101 backend tests across 183 suites, the focused 17-test PostgreSQL submission/reconciliation E2E suite with all 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-06 — Enforce canonical reconciliation-candidate order

- Revalidated each discovered batch in the same deterministic order promised by M10.51: `eligibleAt` ascending, then canonical `gateId` ascending.
- Rejected structurally valid but reordered batches before the first attempt instead of silently sorting divergent adapter output.
- Added focused coverage for reversed gate tie-break order and regressed eligibility order.
- Preserved bounds, duplicate rejection, cadence correlation, snapshots, cancellation, overlap suppression, fail-fast propagation, and no retry.
- Added no schema, persistence change, database claim or lease, NestJS registration, route, live process invocation, live provider call, polling, timer, worker, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,098 backend tests across 183 suites, the focused 17-test PostgreSQL submission/reconciliation E2E suite with all 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-06 — Enforce cancellation after every reconciliation attempt

- Added a caller-signal gate immediately after each awaited sequential attempt and before result validation or aggregation.
- Prevented a cancellation arriving during the final attempt from producing a misleading completed-cycle result when an inner adapter returns normally.
- Propagated the original abort reason, retained already completed durable work without rollback, started no later candidate, and released the process-local claim for a future explicit call.
- Preserved input/candidate/result isolation, fail-closed attempt-result validation, bounded sequential execution, overlap suppression, fail-fast propagation, and no retry.
- Added no schema, persistence change, candidate-store cancellation contract, database claim or lease, NestJS registration, route, live process invocation, live provider call, polling, timer, worker, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,096 backend tests across 183 suites, the focused 17-test PostgreSQL submission/reconciliation E2E suite with all 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-06 — Validate and snapshot reconciliation-attempt results

- Added fail-closed validation for every non-throwing attempt result before cycle aggregation.
- Required status-specific blockers, provider-call flags, lookup state, dates, financial invariants, stored-observation structure, and exact candidate gate/order correlation.
- Copied accepted blocker arrays, timing values, stored records, and provider observation dates before continuing to the next candidate.
- Added focused coverage proving malformed output stops the batch and later mutation cannot rewrite completed outcome counts or audit evidence.
- Preserved input/candidate isolation, cancellation, overlap suppression, bounded sequential execution, durable inner revalidation, fail-fast propagation, and no retry.
- Added no schema, persistence change, database claim or lease, NestJS registration, route, live process invocation, live provider call, polling, timer, worker, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,095 backend tests across 183 suites, the focused 17-test PostgreSQL submission/reconciliation E2E suite with all 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-06 — Snapshot reconciliation candidate batches

- Captured a private ordered copy of every validated discovery candidate before the first sequential attempt.
- Copied candidate records and every mutable date so later adapter-side mutation cannot change gate selection, attempt order, cadence evidence, or reporting.
- Added focused coverage that mutates candidate identity and dates and reverses the adapter-owned array during the first attempt.
- Preserved input isolation, cancellation, process-local overlap suppression, bounded sequential execution, durable inner revalidation, fail-fast propagation, and no retry.
- Added no schema, persistence change, database lease, NestJS registration, route, live process invocation, live provider call, polling, timer, worker, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,093 backend tests across 183 suites, the focused 17-test PostgreSQL submission/reconciliation E2E suite with all 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-05 — Snapshot reconciliation-cycle inputs

- Captured a private defensive copy of the validated evaluation time, minimum lookup interval, and batch limit before asynchronous work.
- Used the private snapshot for overlap results, candidate validation, cadence boundaries, and final reporting.
- Passed a separate defensive copy to candidate discovery so adapter-side mutation cannot alter the cycle's internal facts.
- Added focused coverage that mutates both the caller request and discovery input while the read is pending.
- Preserved cancellation, process-local overlap suppression, bounded sequential execution, fail-fast propagation, and no retry.
- Added no schema, persistence change, database lease, NestJS registration, route, live process invocation, live provider call, polling, timer, worker, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,092 backend tests across 183 suites, all 94 PostgreSQL E2E tests across 9 suites with 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-05 — Gate reconciliation-cycle work on cancellation

- Checked caller cancellation before candidate discovery, immediately after discovery, and before each sequential reconciliation attempt.
- Prevented pre-cancelled calls from reading persistence and prevented cancellation during discovery from initiating any attempt.
- Stopped before the next candidate when cancellation arrives between attempts while preserving the same signal for an attempt already in progress.
- Propagated the original abort reason without conversion, waiting, or retry and released the process-local cycle claim through `finally`.
- Added focused coverage for pre-discovery, during-discovery, and between-attempt cancellation plus claim release.
- Added no schema, candidate-store cancellation contract, database lease, NestJS registration, route, live process invocation, live provider call, polling, timer, worker, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,091 backend tests across 183 suites, all 94 PostgreSQL E2E tests across 9 suites with 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-05 — Guard concurrent manual reconciliation cycles

- Added one process-local active-cycle claim to each unwired manual status-reconciliation cycle instance.
- Returned `reconciliation_cycle_in_progress` immediately for a valid overlapping call before candidate discovery or any attempt, without waiting or sharing cancellation.
- Released the claim after success and propagated discovery, runner, or persistence failure so later explicit calls remain available.
- Kept the existing bounded, sequential, cadence-aware, fail-fast, and no-retry behavior for admitted calls.
- Documented that the guard is not a distributed lock and provides no multi-process coordination.
- Added focused coverage for overlap suppression and claim release after discovery and attempt failures.
- Added no schema, database lease, NestJS registration, route, live process invocation, live provider call, polling, timer, worker, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,088 backend tests across 183 suites, all 94 PostgreSQL E2E tests across 9 suites with 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-05 — Compose one manual bounded status-reconciliation cycle

- Added an unwired manually invoked cycle that composes one M10.51 due-candidate read with sequential M10.50 reconciliation attempts.
- Revalidated the candidate array, configured bound, candidate structure, exact evaluation time, pending eligibility boundary, and unique gate IDs before the first attempt.
- Processed at most the explicit 1–100 limit sequentially and forwarded one caller cancellation signal to each admitted attempt.
- Summarized recorded, deferred, terminal/no-longer-required, invalid-response, and blocked results while keeping financial reconciliation incomplete and submission retry forbidden.
- Propagated discovery, runner, and persistence failures immediately, stopped the remaining batch, and performed no automatic retry.
- Added unit coverage for bounds, malformed batches, sequential execution, cancellation, summaries, and fail-fast behavior plus PostgreSQL E2E composition with a runner double.
- Added no schema, claim, lease, NestJS registration, route, live process invocation, live provider call, waiting, polling, timer, worker, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,087 backend tests across 183 suites, all 94 PostgreSQL E2E tests across 9 suites with 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-05 — Add bounded due status-reconciliation discovery

- Added an unwired read-only Prisma candidate store for durable Agentic Wallet status reconciliations whose cadence is due.
- Made awaiting-first-observation receipts eligible at their recording time and provider-`PENDING` receipts eligible only at the latest observation recording time plus the explicit interval.
- Excluded terminal latest evidence in the bounded database query and returned deterministic oldest-eligibility-first candidates with gate identity as the tie-breaker.
- Required a valid evaluation time, a one-second-to-one-hour interval, and a limit from 1 through 100 before persistence access.
- Kept discovery advisory: M10.50 must reload and revalidate complete durable context before any runner call, and the reader neither claims work nor invokes the coordinator.
- Added focused unit coverage and PostgreSQL E2E coverage for awaiting, pre-boundary, exact-boundary, terminal, malformed-input, and malformed-row behavior.
- Added no schema, claim, lease, NestJS registration, route, live process invocation, provider call, waiting, polling, timer, worker, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,075 backend tests across 182 suites, all 93 PostgreSQL E2E tests across 9 suites with 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-05 — Enforce pending-status cadence in explicit reconciliation

- Integrated the M10.49 cadence decision into the unwired one-shot status reconciliation coordinator with an injected clock and explicit minimum interval.
- Kept the first status observation immediately eligible and returned `status_lookup_deferred` before runner access while durable `PENDING` evidence remains inside the selected interval.
- Allowed one read-only lookup at the exact durable observation-time boundary plus the interval, while preserving terminal suppression, per-gate overlap protection, one-write maximum, cancellation forwarding, and no retry.
- Exposed the evaluation instant and next eligible lookup instant in admitted/deferred attempt results for audit without waiting or scheduling.
- Added unit and PostgreSQL E2E coverage for pre-boundary deferral, exact-boundary admission, invalid clock/interval rejection, and durable runner-boundary enforcement using test doubles only.
- Added no schema, NestJS registration, route, live process invocation, provider call, polling, timer, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,065 backend tests across 181 suites, all 92 PostgreSQL E2E tests across 9 suites with 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-05 — Add a pending-status lookup cadence decision

- Added a pure, unwired cadence policy above the existing terminal-aware status lookup decision.
- Kept the first status observation immediately eligible while deferring repeated lookups after durable `PENDING` evidence until an exact time boundary.
- Required an explicit safe-integer interval from one second through one hour instead of selecting an operational value implicitly.
- Rejected invalid or regressed evaluation times and exposed the exact next eligible instant without waiting or scheduling.
- Preserved terminal lookup suppression independently of cadence inputs.
- Added 14 focused tests covering initial, deferred, boundary-ready, terminal, malformed interval, malformed clock, and malformed-state behavior.
- Added no coordinator integration, schema, persistence, runtime wiring, route, process invocation, provider call, polling, waiting, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,062 backend tests across 181 suites, all 91 PostgreSQL E2E tests across 9 suites with 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-04 — Guard concurrent status reconciliation per gate

- Added a process-local active-attempt claim around the complete unwired one-shot reconciliation boundary.
- Blocked an overlapping call for the same gate before context loading, provider access, or persistence with the explicit `reconciliation_attempt_in_progress` reason.
- Released the claim after both successful completion and propagated failure so later explicit attempts remain possible.
- Documented that this guard does not provide multi-process coordination and must be revisited before any multi-instance runtime wiring.
- Added focused tests for overlap suppression and release after success and runner failure.
- Added no schema, runtime wiring, route, live process invocation, provider call, polling, waiting, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,048 backend tests across 180 suites, all 91 PostgreSQL E2E tests across 9 suites with 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-04 — Bind one-shot status reconciliation to durable context

- Changed the unwired one-shot coordinator to accept only a gate ID and load M10.46 gate, receipt, and projection evidence itself.
- Removed caller-supplied gate/receipt/state assembly from the reconciliation attempt boundary.
- Revalidated stored gate and receipt structure, receipt timing, projection structure, and exact gate/provider/order correlation before lookup.
- Preserved the terminal stop, single lookup, single monotonic write, cancellation forwarding, and no-retry behavior.
- Added PostgreSQL E2E proof that one test-double terminal response persists once and the next explicit attempt stops before another runner call.
- Added no schema, runtime wiring, route, live process invocation, provider call, polling, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,046 backend tests across 180 suites, all 91 PostgreSQL E2E tests across 9 suites with 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-03 — Load durable swap status reconciliation context

- Added an unwired read-only Prisma store that loads a gate, its receipt, latest sequenced status observation, and conservative projection through one Prisma read operation.
- Returned no complete context for an absent gate or receipt and rejected malformed gate identities before persistence access.
- Revalidated persisted gate, receipt, observation, exact identities, and receipt-after-gate timing before returning context.
- Centralized reconciliation projection and exported the existing persisted mappers so M10.42 and M10.46 cannot drift in lifecycle derivation.
- Added focused unit coverage and PostgreSQL E2E coverage for absence, awaiting and pending context, exact durable correlation, and invalid evidence.
- Added no schema, runtime wiring, route, process invocation, provider call, lookup, write, polling, schedule, wallet mutation, funding, mutating command, executor, retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,045 backend tests across 180 suites, all 90 PostgreSQL E2E tests across 9 suites with 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-03 — Compose one explicit swap status reconciliation attempt

- Added an unwired coordinator that performs at most one read-only status lookup and one monotonic observation persistence attempt per explicit call.
- Revalidated the immutable gate and receipt and their exact correlation with the latest durable reconciliation projection before provider access.
- Stopped before the runner for invalid, missing, divergent, or terminal reconciliation evidence.
- Reused the conservative status response interpreter and persisted only a valid pending, finished, or failed observation through the existing append-only store.
- Propagated lookup and persistence failures without retry; invalid provider responses remain unpersisted and never authorize resubmission.
- Kept financial reconciliation incomplete, actual received quantity unknown, and submission retry forbidden on every returned path.
- Added no schema, runtime wiring, route, live process invocation, provider call, polling, schedule, wallet mutation, funding, mutating command, executor, completed financial reconciliation, real order, or submission authority.
- Verified all 2,039 backend tests across 179 suites, all 89 PostgreSQL E2E tests across 9 suites with 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-03 — Add a closed read-only swap status lookup runner

- Added a dedicated unwired runner interface and CLI process implementation for one Agentic Wallet status lookup command.
- Converted only M10.43 lookup-ready decisions to the typed command; terminal and blocked decisions produce no command.
- Allowlists exactly `market-order list --orderId <id> --json` and rejects unsafe identities or unsupported kinds before process invocation.
- Extracted one shared pinned Agentic Wallet CLI `1.10.0` contract for quote and status lookup runners.
- Reused the existing no-shell, bounded-output, timeout-aware, cancelable JSON process without adding retry or polling.
- Kept runtime wiring, routes, live process invocation, provider calls, response orchestration, status writes, wallet mutation, funding, mutating commands, execution, automatic retry, completed financial reconciliation, real orders, and submission authority absent.
- Verified all 2,028 backend tests across 178 suites, all 89 PostgreSQL E2E tests across 9 suites with 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-03 — Stop swap status lookup at terminal provider state

- Added a pure unwired decision policy over the latest durable reconciliation projection.
- Produced the exact inert read-only lookup preview only for awaiting-first-observation and provider-pending states.
- Returned lookup-not-required with no command for provider-finished and provider-failed states.
- Added full structural validation for projection identity, timestamps, hashes, lifecycle, financial, and retry invariants.
- Kept provider calls unstarted, actual received quantity unknown, financial reconciliation incomplete, and submission retry forbidden on every path.
- Added no schema, persistence, runtime wiring, route, process invocation, provider call, lookup, polling, wallet mutation, funding, mutating command runner, executor, automatic retry, completed financial reconciliation, real order, or submission authority.
- Verified all 2,016 backend tests across 177 suites, all 89 PostgreSQL E2E tests across 9 suites with 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-03 — Project durable swap reconciliation state

- Added an unwired read-only Prisma store that derives one conservative state from the exact durable receipt and latest status sequence.
- Distinguished missing receipt, awaiting first observation, provider pending, provider finished but financially unreconciled, and provider failed.
- Revalidated requested identity, durable receipt/observation structure, exact gate/provider/order correlation, and recording-time order.
- Kept actual received quantity unknown, financial reconciliation incomplete, and submission retry forbidden in every phase.
- Added no schema, write, runtime wiring, route, process invocation, provider call, lookup, polling, wallet mutation, funding, mutating command runner, executor, automatic retry, completed financial reconciliation, real order, or submission authority.
- Verified all 1,992 backend tests across 176 suites, all 89 PostgreSQL E2E tests across 9 suites with 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-03 — Persist monotonic swap status history

- Added an unwired serializable Prisma store for receipt-bound Agentic Wallet status observations.
- Applied the M10.39 monotonic policy against the latest durable fact before every append.
- Made exact latest replay idempotent and introduced a database sequence for unambiguous append order when timestamps tie.
- Bound every row to the exact receipt gate, provider, and provider order identity through a composite foreign key.
- Added PostgreSQL checks for provider, safe order ID, closed status vocabulary, canonical transaction hashes, mandatory finished hashes, and provider timestamp coherence.
- Kept actual received quantity unknown, financial reconciliation incomplete, and submission retry forbidden.
- Kept runtime wiring, routes, process invocation, provider calls, lookup, polling, wallet mutation, funding, a mutating command runner, executor, automatic retry, completed financial reconciliation, real orders, and submission authorization absent.
- Verified all 1,984 backend tests across 175 suites, all 86 PostgreSQL E2E tests across 9 suites with 27 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-03 — Persist the closed swap submission receipt

- Added an unwired serializable Prisma store for the exact M10.36 Agentic Wallet submission receipt.
- Bound one immutable receipt to an existing structurally valid durable gate through a restrictive foreign key.
- Made provider order IDs globally unique and preserved the original recording time on exact replay.
- Rejected changed gate reuse, reused provider order identity, malformed receipt evidence, missing or malformed gates, and invalid or pre-gate recording clocks.
- Added PostgreSQL checks for the provider, safe order-ID grammar, pending lifecycle, acknowledgment, nonterminal/success state, required lookup, and forbidden retry.
- Aligned durable gate `createdAt` with its existing transaction clock to remove application/database clock drift from downstream validation.
- Kept runtime wiring, routes, process invocation, provider calls, polling, wallet mutation, funding, a mutating command runner, executor, automatic retry, status-observation persistence, completed financial reconciliation, real orders, and submission authorization absent.
- Verified all 1,977 backend tests across 174 suites, all 83 PostgreSQL E2E tests across 9 suites with 26 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-03 — Enforce monotonic swap-status progression

- Added a pure unwired transition policy for complete Agentic Wallet status observations.
- Accepted initial observations, idempotent exact replay, pending refreshes, and pending progression to `FINISHED` or `FAILED`.
- Rejected gate/order identity drift, changed booking time, regressed update time, changed or removed established transaction hashes, and every terminal-state change.
- Added structural validation for all normalized observation fields and their derived lifecycle invariants.
- Preserved the prior lookup requirement when a candidate transition is blocked.
- Kept financial reconciliation incomplete and submission retry forbidden on every path.
- Kept schema, persistence, runtime wiring, routes, process invocation, provider calls, polling, wallet mutation, funding, a mutating command runner, executor, automatic retry, completed financial reconciliation, real orders, and submission authorization absent.
- Verified all 1,970 backend tests across 173 suites, all 80 PostgreSQL E2E tests across 9 suites with 25 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-03 — Interpret swap status without overstating reconciliation

- Added a pure unwired interpreter for the documented Agentic Wallet `market-order list` response shape.
- Required exact durable-gate, submission-receipt, order-identity, BSC instrument, source-quantity, and slippage correlation.
- Classified only `PENDING`, `FINISHED`, and `FAILED`, with strict timestamps and a required valid EVM transaction hash for finished orders.
- Kept pending orders lookup-required and terminal provider states separate from financial reconciliation.
- Left actual received quantity unknown and financial reconciliation incomplete because the published response row omits that fact.
- Forbade submission retry on every valid and invalid response path.
- Kept schema, persistence, runtime wiring, routes, process invocation, provider calls, polling, wallet mutation, funding, a mutating command runner, executor, automatic retry, completed financial reconciliation, real orders, and submission authorization absent.
- Verified all 1,944 backend tests across 172 suites, all 80 PostgreSQL E2E tests across 9 suites with 25 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-03 — Add a closed read-only swap-status lookup preview

- Added a pure unwired translator from the exact nonterminal submission receipt to the documented Agentic Wallet order lookup arguments.
- Generated only `market-order list --orderId <orderId> --json`, marked read-only, non-executable, and provider-call-unstarted.
- Restricted provider order IDs at both response and command boundaries to a bounded option-safe ASCII grammar.
- Rejected altered provider, kind, gate, order ID, lifecycle, acknowledgment, terminal, execution-success, lookup, and retry facts.
- Kept submission retry forbidden and separated it from future repeatable read-only status observation.
- Kept schema, persistence, runtime wiring, routes, process invocation, provider calls, wallet mutation, funding, a mutating command runner, executor, polling, status parsing, reconciliation, real orders, and submission authorization absent.
- Verified all 1,903 backend tests across 171 suites, all 80 PostgreSQL E2E tests across 9 suites with 25 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-03 — Interpret swap submission acknowledgments without claiming execution

- Added a pure unwired interpreter for the documented Agentic Wallet market-swap submission envelope.
- Bound an accepted provider order identity to one canonical durable gate ID.
- Classified `success: true` plus `orderId` only as submitted and pending confirmation, never as terminal execution success.
- Ignored additive provider status metadata and required a future separate terminal-status reconciliation.
- Classified malformed envelopes, provider failure, unsafe order IDs, and invalid gate correlation as unknown outcomes.
- Required reconciliation and forbade automatic retry on every response path.
- Kept schema, persistence, runtime wiring, routes, process invocation, provider calls, wallet mutation, funding, a mutating command runner, executor, polling, retry, reconciliation implementation, real orders, and submission authorization absent.
- Verified all 1,889 backend tests across 170 suites, all 80 PostgreSQL E2E tests across 9 suites with 25 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-03 — Add an expiring closed swap-command preview without execution

- Persisted the exact initial-submission expiry on every new durable gate and constrained it to follow confirmation consumption.
- Preserved unknown legacy expiry as nullable during migration while making application mapping reject such rows fail closed.
- Added a pure unwired translator from one exact active gate to the documented Agentic Wallet BSC `market-order swap` argument preview.
- Revalidated the approved provider, chain, token direction, canonical exact decimals, MEV and gas policy, commitment, audit identities, timestamps, inert status, and authorization flags.
- Added focused unit and PostgreSQL E2E coverage for exact arguments, both approved directions, unsafe facts, future/expired gates, migration, persistence, and legacy rejection.
- Kept runtime wiring, routes, process invocation, provider calls, wallet mutation, funding, a mutating command runner, executor, retry, reconciliation, real orders, and submission authorization absent.
- Verified all 1,871 backend tests across 169 suites, all 80 PostgreSQL E2E tests across 9 suites with 25 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-03 — Add a durable atomic submission gate without provider execution

- Added an unwired serializable Prisma store that reloads the exact final confirmation and latest persisted emergency-stop event before creating a gate.
- Serialized every emergency-stop change and gate creation under the same PostgreSQL advisory transaction lock, preventing a stop update from crossing the final decision boundary.
- Reapplied the submission stop assessment and provider-payload commitment comparison inside the transaction.
- Added an immutable `prepared_not_submitted` record with restrictive identity uniqueness, exact payload facts, and equal stop-recheck/confirmation-consumption timestamps.
- Preserved exact idempotent replay while preventing concurrent or alternate reuse of a consumed confirmation and its protected identities.
- Added focused unit and PostgreSQL E2E coverage for persistence, replay, concurrency, active/missing/changed stop state, payload tampering, and malformed durable facts.
- Kept runtime wiring, routes, provider calls, wallet mutation, a mutating command runner, executor, real orders, and submission authorization absent.
- Verified all 1,854 backend tests across 168 suites, all 80 PostgreSQL E2E tests across 9 suites with 24 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-03 — Verify the provider-bound payload against durable confirmation

- Added a pure unwired assessment that correlates the active final confirmation, initial-submission plan, intent, and quote.
- Recalculated the complete canonical payload commitment and required exact equality with the digest carried by the durable confirmation.
- Constructed only an inert approved BSC market-swap representation with canonical provider inputs, MEV protection enabled, `MEDIUM` gas, and automatic retry forbidden.
- Added focused coverage for the ready path, tampering, identity divergence, malformed inputs, expiry, incomplete costs, and canonical variants.
- Stabilized the existing wallet-status test with a fixed test clock so session-expiry behavior remains deterministic without weakening production policy.
- Kept runtime wiring, routes, provider mutation, a mutating command runner, the atomic gate, confirmation consumption, executor, and submission authorization absent.
- Verified all 1,844 backend tests across 166 suites, all 77 PostgreSQL E2E tests across 8 suites with 23 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-02 — Propagate payload commitment into durable final confirmations

- Added nullable, pair-constrained commitment version and SHA-256 digest columns to durable final confirmations without fabricating legacy payload facts.
- Copied the exact validated approval commitment through final-confirmation planning and persistence in the existing serializable transaction.
- Made confirmation replay, submission-bound emergency-stop assessment, and initial-submission planning fail closed on missing or malformed commitments.
- Added focused unit coverage for propagation, malformed values, and legacy-row rejection plus PostgreSQL E2E coverage for migration, persistence, and replay.
- Kept provider-command comparison, the atomic gate, confirmation consumption, provider mutation, and `submissionAuthorized` absent.
- Verified all 1,838 backend tests across 165 suites, all 77 PostgreSQL E2E tests across 8 suites with 23 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-02 — Propagate payload commitment into durable risk approvals

- Added nullable, pair-constrained commitment version and SHA-256 digest columns to durable Risk Engine approvals without fabricating legacy payload facts.
- Carried the exact reservation/arm commitment through pre-approval planning and persisted it in the existing serializable approval transaction.
- Made approval replay, final-confirmation planning, and final-confirmation-store approval mapping fail closed on missing or malformed commitments.
- Added focused unit coverage for propagation, malformed values, and legacy-row rejection plus PostgreSQL E2E coverage for migration, persistence, and replay.
- Kept final-confirmation commitment propagation, the atomic gate, confirmation consumption, provider mutation, and `submissionAuthorized` absent.
- Verified all 1,837 backend tests across 165 suites, all 77 PostgreSQL E2E tests across 8 suites with 22 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-02 — Propagate payload commitment into durable arms

- Added nullable, pair-constrained commitment version and SHA-256 digest columns to durable arms without fabricating legacy payload facts.
- Copied the exact validated reservation commitment through arm planning and persistence in the existing serializable transaction.
- Made arm replay, emergency-stop assessment, approval-store mapping, and pre-approval revalidation fail closed on missing, malformed, or reservation-divergent commitments.
- Added focused unit coverage for propagation, legacy-row rejection, malformed commitments, and cross-artifact mismatch plus PostgreSQL E2E coverage for migration and persistence.
- Kept approval/confirmation commitment propagation, the atomic gate, confirmation consumption, provider mutation, and `submissionAuthorized` absent.
- Verified all 1,835 backend tests across 165 suites, all 77 PostgreSQL E2E tests across 8 suites with 21 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-02 — Persist payload commitment with real-execution reservations

- Added nullable, pair-constrained commitment version and SHA-256 digest columns to durable reservations without fabricating legacy payload facts.
- Reevaluated M10.28 inside the existing serializable reservation transaction and persisted the exact commitment on every new row.
- Exposed the commitment through the stored reservation contract and made reservation, arm-store, approval-store, arm-plan, and pre-approval mappers/validators fail closed on missing or malformed values.
- Added unit coverage for persisted commitments and legacy-row rejection plus PostgreSQL E2E coverage for migration, persistence, and replay.
- Kept later-artifact commitment propagation, the atomic gate, confirmation consumption, provider mutation, and `submissionAuthorized` absent.
- Verified all 1,833 backend tests across 165 suites, all 77 PostgreSQL E2E tests across 8 suites with 20 migrations, all 92 dashboard tests across 16 files, formatting, lint, backend/dashboard builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-02 — Add canonical intent/quote payload commitment

- Identified that audit IDs and selected durable totals alone cannot prove equality of a future provider-bound payload.
- Added a pure versioned SHA-256 commitment over every execution-critical intent and quote fact.
- Canonicalized exact decimals, token-address case, and cost ordering while retaining all routing, amount, slippage, output, fee, provider, and time facts.
- Required the exact approved Agentic Wallet BSC BTCB/USDT intent, semantic quote-intent equality, complete costs, and an active quote.
- Kept commitment persistence, atomic enforcement, confirmation consumption, and `submissionAuthorized` absent; added no route, provider call, command, or executor.
- Verified all 1,832 backend tests across 165 suites, including the 9 focused commitment tests, plus formatting, lint, and the backend build.

## 2026-10-02 — Add pure initial-submission plan

- Added a pure planner over one exact active M10.25 confirmation, its successful fresh M10.26 stop assessment, and one short-lived submission request.
- Bound the request to every confirmation, approval, reservation, arm, provider, chain, intent, quote, and stop-event identity and required strict temporal ordering.
- Bounded request age, stop-assessment age, plan lifetime, and confirmation expiry from one through sixty seconds.
- Marked a ready plan initial-only with automatic retry forbidden while retaining mandatory future atomic stop enforcement and confirmation consumption.
- Kept `submissionAuthorized: false`; added no schema, repository, runtime wiring, route, provider call, wallet mutation, command, or executor.
- Verified all 1,823 backend tests across 164 suites, including the 9 focused planner tests, plus formatting, lint, and the backend build.

## 2026-10-02 — Add pure submission-bound emergency-stop recheck

- Added a pure assessment over one exact active M10.25 confirmation and a fresh complete persisted emergency-stop observation.
- Required the observation after durable confirmation while preserving the exact stop-event identity bound through M10.23–M10.25.
- Invalidated the chain after every later stop change, including a later clear, and rejected configuration fallback, partial coverage, active state, invalid clocks, expiry, future facts, and staleness.
- Kept the result non-atomic and `submissionAuthorized: false`; added no schema, repository, runtime wiring, route, provider call, wallet mutation, command, or executor.
- Verified all 1,814 backend tests across 163 suites, including the 9 focused tests, plus formatting, lint, and the backend build.

## 2026-10-02 — Add durable approval-bound final confirmation

- Audited M10.23 against its implementation, migration, generated Prisma client, unit coverage, and PostgreSQL persistence/concurrency acceptance criteria; no incomplete M10.23 behavior remained.
- Corrected M10.24 to accept the real bounded opaque risk-control event ID format instead of incorrectly requiring a UUID.
- Added an unwired serializable Prisma store that reloads the exact M10.23 approval and reapplies M10.24 before persisting one immutable short-lived confirmation.
- Added restrictive approval persistence plus unique approval/reservation/arm/intent/quote identities, canonical request fingerprinting, and exact replay without expiry extension.
- Prevented the internal request fingerprint from leaking through the public confirmation mapper.
- Added focused unit and PostgreSQL E2E coverage for persistence, replay, missing or changed approval facts, expiry, conflicts, and concurrent single-confirmation enforcement.
- Kept the submission-bound emergency-stop recheck and submission authorization false; added no runtime wiring, route, provider call, wallet mutation, command, or executor.
- Verified all 1,805 backend tests across 162 suites, all 77 E2E tests across 8 suites with 19 migrations applied from scratch, all 92 dashboard tests across 16 files, formatting, lint, builds, Prisma validation, Compose configuration, and whitespace checks.

## 2026-10-02 — Add pure approval-bound final-confirmation plan

- Added a pure planner that requires one active exact M10.23 approval and an explicit final-quote/immediate-submission acknowledgment.
- Bound the request to the approval, reservation, arm, provider, chain, intent, quote, and persisted emergency-stop change identities.
- Bounded request age and confirmation lifetime from one through sixty seconds and prevented confirmation from predating or outliving approval.
- Added focused coverage for readiness, every identity divergence, missing acknowledgment, invalid clocks, expiry, lifetime, and policy bounds.
- Kept durable confirmation, final emergency-stop recheck, and submission authorization absent; added no schema, repository, runtime wiring, route, provider call, wallet mutation, command, or executor.
- Verified all 1,800 backend tests across 161 suites, including the 15 focused tests, plus formatting, lint, backend/dashboard builds, Compose configuration, and whitespace checks. Compose emitted only the existing inaccessible user Docker-config warning.

## 2026-10-02 — Add durable real-execution risk approval

- Added an unwired serializable Prisma store that reloads the exact reservation and arm, reconstructs the complete active-reservation snapshot, reads the latest persisted emergency-stop event, and reapplies M10.22 before approval persistence.
- Added immutable approval storage with restrictive reservation/arm foreign keys, unique reservation/arm/intent/quote identities, canonical request fingerprinting, and exact replay without expiry extension.
- Shared the reservation advisory lock so capacity cannot change between revalidation and approval insertion.
- Added focused unit and PostgreSQL E2E coverage for persistence, replay, conflicts, missing or unsafe prerequisites, changed economics, and concurrent single-approval enforcement.
- Kept the store outside runtime wiring; final confirmation and submission authorization remain false, with no route, live quote, provider mutation, funding, command, or executor.

## 2026-10-01 — Add pure pre-approval real-risk revalidation

- Added a pure composition that correlates one exact durable reservation and arm with current financial, provider-capacity, and emergency-stop facts.
- Removed only the current reservation from reserved-spend and aggregate-capacity inputs before reproposing it, preventing self-double-counting without hiding other reservations.
- Reran the complete quote, budget, resource, provider-quota, reservation-capacity, and M10.21 emergency-stop policies.
- Required every rederived reservation identity and economic amount to match the durable row exactly.
- Produced only an expiring future-approval plan while keeping atomic enforcement, Risk Engine approval, final confirmation, and submission authorization false.
- Added no schema, repository, adapter bridge, runtime wiring, route, provider call, wallet mutation, funding behavior, command, or executor.
- Verified all 1,779 backend tests across 159 suites, all 92 dashboard tests across 16 files, the focused 9-test risk-revalidation suite, formatting, lint, the complete backend/dashboard build, Prisma schema validation, Compose configuration, and whitespace integrity.

## 2026-10-01 — Add pure emergency-stop composition for durable arms

- Added a pure assessment that binds a valid unexpired M10.20 arm to a fresh, complete emergency-stop snapshot.
- Required a persisted inactive stop event observed after arm creation; configuration fallback and active state fail closed.
- Invalidated the arm after any later persisted stop change, including a subsequent clear, so re-entry requires a fresh quote-backed reservation and arm.
- Kept the result point-in-time and non-atomic with Risk Engine approval, final confirmation, and submission authorization always false.
- Added no schema, repository, adapter bridge, runtime wiring, route, provider call, wallet mutation, funding behavior, submission command, or executor.
- Verified all 1,770 backend tests across 158 suites, all 92 dashboard tests across 16 files, the focused 10-test emergency-stop assessment suite, formatting, lint, the complete backend/dashboard build, Prisma schema validation, Compose configuration, and whitespace integrity.

## 2026-10-01 — Add durable reservation-bound real-execution arms

- Added an immutable Prisma arm record with a restrictive reservation foreign key and unique reservation, intent, and quote identities.
- Serialized arm attempts under a PostgreSQL advisory transaction lock, reloaded the durable reservation, and reapplied M10.19 before insertion.
- Added canonical request fingerprinting for exact post-expiry replay without extending the original arm.
- Failed closed on missing reservations, changed UUID reuse, identity reuse, expired plans, and concurrent attempts for the same reservation.
- Kept the store unwired and every emergency-stop, Risk Engine, final-confirmation, provider-access, and financial authorization false.
- Verified all 1,760 backend tests across 157 suites, all 73 PostgreSQL-backed E2E tests across 6 suites, all 92 dashboard tests across 16 files, the focused 5-test arm-store unit suite and 2-test persistence/concurrency E2E suite, Prisma schema/migrations, formatting, lint, the complete backend/dashboard build, Compose configuration, and whitespace integrity.

## 2026-10-01 — Add pure reservation-bound real-execution arm plan

- Added an inert operator-arm request and plan bound to one exact durable reservation, provider, chain, intent, and quote.
- Required the explicit `reservation_and_quote_reviewed` acknowledgment while keeping it distinct from final pre-submission confirmation.
- Bounded request freshness and maximum arm lifetime from one through sixty seconds and prevented the plan from predating or outliving its quote-backed reservation.
- Failed closed on malformed, divergent, stale, future, expired, overlong, or invalid-clock facts.
- Kept durable arm creation, emergency-stop composition, Risk Engine approval, confirmation, and every financial authorization false.
- Verified all 1,755 backend tests across 156 suites, all 71 PostgreSQL-backed E2E tests across 5 suites, all 92 dashboard tests across 16 files, the focused 12-test arm-plan suite, formatting, lint, the complete backend/dashboard build, Compose configuration, and whitespace integrity.

## 2026-10-01 — Add durable atomic real-execution reservations

- Added an immutable Prisma reservation record with unique intent, quote, and idempotency identities plus a canonical request fingerprint.
- Serialized reservation attempts with a PostgreSQL advisory transaction lock and serializable isolation, then rebuilt durable active capacity and reapplied M10.17 before insertion.
- Preserved USDT budget, source-token, native-BNB, and provider-quota USD facts as separate exact strings and retained expired rows without counting them as active capacity.
- Added exact replay and fail-closed conflict behavior without registering the store in NestJS or creating a quote, wallet, Risk Engine, or submission path.
- Added focused unit coverage and PostgreSQL E2E proof for exact persistence, post-expiry replay, and concurrent over-reservation prevention.
- Verified all 1,743 backend tests across 155 suites, all 71 PostgreSQL-backed E2E tests across 5 suites, all 92 dashboard tests across 16 files, the focused 6-test reservation-store unit suite and 2-test persistence/concurrency E2E suite, formatting, lint, the complete backend/dashboard build, Compose configuration, and whitespace integrity.

## 2026-10-01 — Add pure aggregate reservation-capacity assessment

- Added a bounded active-reservation snapshot with exact identity, denomination, expiry, coverage, and freshness facts.
- Reconciled active USDT reservation totals with the budget snapshot before considering a new M10.16 plan.
- Added independent aggregate source-token, native-BNB, and provider-quota USD capacity checks with exact decimals.
- Excluded expired records and failed closed on duplicates, divergence, partial coverage, stale facts, and the 100-active-reservation bound.
- Kept durable reservation, atomic enforcement, Risk Engine approval, and every funding, quote, and submission authorization false.
- Verified all 1,737 backend tests across 154 suites, all 92 dashboard tests across 16 files, the 8 focused reservation-capacity tests, formatting, lint, the complete backend/dashboard build, Compose configuration, and whitespace integrity.

## 2026-10-01 — Add pure non-authorizing real-execution reservation plan

- Added an inert reservation planner that runs only after the complete M10.15 risk chain passes.
- Preserved exact provider, chain, intent, quote, idempotency, UTC-day, and quote-expiry identity in the plan.
- Kept USDT budget charge, source-token quantity, native BNB gas, and explicit provider-quota USD as separate denominations.
- Kept durable reservation, atomic enforcement, Risk Engine approval, and every funding, quote, and submission authorization false.
- Added no schema, repository, adapter bridge, runtime wiring, route, persistence, live provider call, funding, wallet mutation, arm, confirmation, submission command, or executor.
- Verified all 1,729 backend tests across 153 suites, all 92 dashboard tests across 16 files, the 4 focused reservation-plan tests, formatting, lint, the complete backend/dashboard build, Compose configuration, and whitespace integrity.

## 2026-10-01 — Add pure non-authorizing provider-quota sufficiency assessment

- Added bounded provider-quota and explicit external USD-requirement facts tied to the approved provider/chain, current UTC day, and exact intent/quote identities.
- Composed M10.14 resource sufficiency with independent quota and valuation freshness, coverage, identity, day, reconciliation, and remaining-capacity checks.
- Avoided USDT/USD parity assumptions and kept the provider daily limit separate from project-owned risk limits.
- Kept durable quota/resource reservation and every Risk Engine, funding, quote, and submission authorization false.
- Added no adapter bridge, runtime wiring, route, persistence, live provider call, funding, wallet mutation, arm, confirmation, submission command, or executor.
- Verified all 1,725 backend tests across 152 suites, all 92 dashboard tests across 16 files, the 10 focused provider-quota tests, formatting, lint, the complete backend/dashboard build, Compose configuration, and whitespace integrity.

## 2026-10-01 — Add pure non-authorizing resource sufficiency assessment

- Added a bounded resource snapshot tied to the approved provider/chain and exact intent/quote identities.
- Added exact source-token requirements including source-denominated provider fees and independent inclusive balance checks.
- Added explicit positive BNB gas requirements and availability checks without conflating gas prices, USDT-valued network fees, and native-token balance.
- Kept provider quota and durable resource reservation unevaluated and every Risk Engine, funding, quote, and submission authorization false.
- Added no adapter bridge, runtime wiring, route, persistence, live provider call, funding, wallet mutation, arm, confirmation, submission command, or executor.
- Verified all 1,715 backend tests across 151 suites, all 92 dashboard tests across 16 files, the 9 focused resource-risk tests, formatting, lint, the complete backend/dashboard build, Compose configuration, and whitespace integrity.

## 2026-10-01 — Add pure non-authorizing real-budget assessment

- Added a bounded budget snapshot for approved provider/chain identity, UTC-day settled and reserved spend, coverage, valued bankroll, and observation time.
- Composed the M10.12 quote checks with conservative exact quote-budget charge and projected daily-spend calculations.
- Added fail-closed checks for freshness, UTC day, coverage, daily-spend cap, bankroll cap, and aggregate quote capacity.
- Kept durable spend enforcement, source-token balance, native-gas balance, Risk Engine approval, and every financial authorization explicitly false.
- Added no runtime wiring, route, persistence, live provider call, funding, wallet mutation, arm, confirmation, submission command, or executor.
- Verified all 1,706 backend tests across 150 suites, all 92 dashboard tests across 16 files, the 9 focused budget-risk tests, formatting, lint, the complete backend/dashboard build, Compose configuration, and whitespace integrity.

## 2026-10-01 — Add pure non-authorizing quote risk assessment

- Added exact intent/quote correlation plus approved Agentic Wallet and BSC BTCB/USDT direction checks.
- Added pure order-notional, slippage, provider-fee-rate, and USDT-valued network-fee comparisons against the explicit local envelope.
- Failed closed on stale quotes, partial or missing costs, and costs whose asset cannot be compared without an unimplemented conversion.
- Kept UTC-daily spend and bankroll exposure explicitly unevaluated and every Risk Engine, funding, quote, and submission authorization false.
- Kept the policy outside runtime wiring; no route, live quote, persistence, wallet mutation, arm, confirmation, submission command, or executor was added.
- Verified all 1,697 backend tests across 149 suites, all 92 dashboard tests across 16 files, the 8 focused quote-risk tests, formatting, lint, the complete backend/dashboard build, Compose configuration, and whitespace integrity.

## 2026-10-01 — Add unwired non-executable Agentic Wallet quote adapter

- Added a dedicated pinned-version CLI runner whose closed command surface contains only `market-order quote` and no swap/submission operation.
- Added exact BSC BTCB/USDT direction, amount, symbol, and slippage correlation before normalizing provider output.
- Represented the result as a short-lived, non-executable quote with null provider quote identity and explicitly partial fee/gas coverage.
- Reused the shell-free, bounded, cancelable, output-limited, sanitized JSON process boundary for reads and quotes.
- Kept the adapter outside NestJS runtime wiring; no route, live quote, funding, persistence, Risk Engine bridge, arm, confirmation, submission, or executor was added.
- Verified all 1,689 backend tests across 148 suites, all 92 dashboard tests across 16 files, focused quote tests, formatting, lint, the complete backend/dashboard build, Compose configuration, and whitespace integrity.

## 2026-10-01 — Add explicit local real-risk limit envelope

- Added fail-closed configuration for maximum real order notional, UTC-daily spend, bankroll, provider-fee rate, network fee, and slippage; every value defaults to absent.
- Added a pure exact-decimal assessment that reports each missing limit and requires order notional ≤ daily spend ≤ bankroll.
- Exposed the assessment through the existing provider-free local status and synchronized its README route contract.
- Kept the provider daily limit excluded and funding, quote, and submission authorization false; no financial value was selected automatically.
- Added no quote command, wallet access, provider mutation, persistence, Risk Engine bridge, or executor.
- Verified all 1,672 backend tests across 146 suites, all 92 dashboard tests across 16 files, focused tests, formatting, lint, the complete backend/dashboard build, Compose configuration, and whitespace integrity.

## 2026-10-01 — Add non-authorizing Agentic Wallet security posture

- Added a pure exact-decimal assessment for session validity, abnormal-transaction rejection, limited-token scope, prediction trading, developer mode, and provider quota reconciliation.
- Explicitly rejected the provider daily limit as a project risk limit and preserved mandatory independent local safeguards.
- Included the assessment and its blockers in the existing manual wallet response and dashboard without adding a provider call to automatic refresh.
- Kept funding, quote, and submission authorization permanently false and added no wallet command, mutation, or executor.
- Added focused coverage and passed all 1,667 backend tests across 145 suites, all 92 dashboard tests across 16 files, lint, formatting, the complete backend/dashboard build, and a live manual wallet assessment.

## 2026-10-01 — Standardize on a host-only NestJS runtime

- Removed the NestJS `api` service and its dependency-cache volume from Docker Compose; Compose now owns only PostgreSQL and Redis.
- Removed the obsolete API Dockerfile so the unsupported container runtime cannot be started accidentally.
- Restricted both infrastructure port publications to host loopback and changed `API_BIND_HOST` validation to reject every value except `127.0.0.1`.
- Updated the root runbook and project documentation to make the Windows host API the sole supported runtime required by the authenticated Agentic Wallet CLI session.
- Reconciled the running stack by removing the obsolete API container and recreating Redis with loopback-only publication while preserving the existing PostgreSQL and Redis data volumes.
- Restored the ignored local startup setting to `POLYMARKET_ENABLED=false`; after a host API restart, direct and Vite-proxied provider routes failed closed with the expected sanitized `503`, while health and manual wallet observation remained operational.
- Verified Compose configuration, whitespace, formatting, lint, the complete backend/dashboard build, and all 42 environment-configuration tests.
- Preserved all financial safeguards: the wallet remains empty, the observation is read-only, and quote and submission authorization remain false.

## 2026-10-01 — Host Agentic Wallet runtime and loopback binding corrected

- Diagnosed the dashboard `Cannot GET` response as a stale 37-hour-old API container and rebuilt the API with the M10.8 routes.
- Confirmed that a containerized API cannot use the Binance Agentic Wallet CLI session stored on the Windows host; the manual route correctly failed closed with `503` in that runtime.
- Validated the same API on the Windows host: local status, wallet connection, BSC availability, empty balance, limited-token mode, disabled prediction and Developer Mode, `AutoReject`, gas read, and false quote/submission authority all normalized successfully.
- Added validated `API_BIND_HOST` configuration. Host execution defaults to `127.0.0.1`; Compose opts into `0.0.0.0` only inside the container and continues publishing on host loopback.

### Scope confirmation

- PostgreSQL and Redis remain in Docker with their existing volumes. No wallet setting, balance, quote, signature, transfer, approval, or order was changed.

## 2026-09-30 — M10.8 manual Agentic Wallet dashboard visibility completed

- Added provider-free `GET /real-trading/status` for local mode, independent execution gate, exact BSC BTCB/USDT candidate, and explicit false quote/submission authority.
- Added explicit `POST /real-trading/wallet-observation` over the existing closed read-only CLI surface, with concurrent-call coalescing, sanitized failures, no returned wallet address, and no session material.
- Extended strict settings normalization with prediction-trading and Developer Mode flags.
- Separated the dashboard's fictional 1,000 USDT paper portfolio from a dedicated Agentic Wallet / Real trading panel.
- Kept wallet access outside the automatic refresh; only **Check wallet (read only)** invokes the provider.
- Added focused backend and dashboard tests for provider-free status, manual POST behavior, failure isolation, coalescing, output sanitization, and disabled quote/submission authority.
- Verified 1,660 backend tests across 144 suites, 92 dashboard tests across 16 files, lint, formatting, backend/dashboard builds, Compose configuration, and whitespace checks.

### Scope confirmation

- No funding, quote, provider-setting mutation, token approval, signing, transaction submission, transfer, order, persistence, Risk Engine bridge, or real executor was added. Real execution remains disabled.

## 2026-09-30 — Read-only wallet access verified with App trading disabled

- Re-read the connected Agentic Wallet after the operator disabled App-level trading access.
- Confirmed status, supported chains, addresses, empty BSC balances, and gas remain available to bounded reads.
- Confirmed provider settings returned to `tradeAllTokens=false` and `predictionEnabled=false`, while Developer Mode remains disabled.
- Recorded that the application's closed Agentic Wallet command surface exposes no DeFi, prediction, quote, or mutation operation despite provider minimum quota fields.

### Scope confirmation

- No re-pairing, funding, quote, provider mutation, transfer, approval, or order was performed. Trading access remains disabled.

## 2026-09-30 — Agentic Wallet post-pairing settings re-observed

- Confirmed the operator's 365-day maximum sign-in setting is active through 2027-09-30; the current 2026-10-02 session expiry is the separate fixed 48-hour inactivity deadline, so immediate re-pairing is unnecessary.
- Observed that all-token trading and prediction trading are now enabled and that provider minimum quotas remain much larger than the planned R$50 experiment.
- Kept Developer Mode disabled and classified the broad token/scenario permissions as blockers for funding, quotes, and execution pending least-privilege correction or independent project-side denial.

### Scope confirmation

- This was a read-only provider-state observation. No setting, session, balance, quote, transfer, or order was changed by the application.

## 2026-09-30 — M10.7 zero-balance Agentic Wallet read-only onboarding completed

- Installed the official pinned `@binance/agentic-wallet@1.10.0` CLI globally with explicit operator authorization; no project dependency or credential was added.
- Completed the official provider-generated link and matching-code confirmation in the Binance App, then independently confirmed the dedicated session as `CONNECTED`.
- Read BSC support, security settings/quota, chain address, empty BSC balances, and gas levels while invoking no quote or mutation.
- Confirmed `tradeAllTokens=false` and abnormal-transaction `AutoReject`; observed the provider's broad default daily limit without treating it as approved for project funding or execution.
- Fixed Windows `spawn EINVAL` without enabling a shell: the runner now discovers the installed package JavaScript entry under `PATH` and launches it with the current Node executable.
- Added three focused Windows/POSIX invocation tests and passed live normalization through the existing read-only adapter with an empty operation list.
- Verified all 1,658 backend tests across 143 suites, all 90 dashboard tests across 16 files, lint, formatting, the complete backend/dashboard build, Compose validation, and diff integrity.

### Scope confirmation

- The Agentic Wallet remains at zero balance. No quote, provider-setting mutation, transfer, token approval, order, route, persistence, application runtime wiring, Risk Engine bridge, or executor was added; real trading remains disabled.

## 2026-09-30 — M10.6 exact BSC BTCB/USDT candidate approval completed

- Recorded the project owner's explicit selection of BSC chain `56`, BTCB `0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c`, and USDT `0x55d398326f99059ff775485246999027b3197955` as the sole Agentic Wallet candidate.
- Added a pure approval gate that re-runs M10.5 evidence review and accepts only exact USDT-to-BTCB buys or BTCB-to-USDT sells.
- Canonicalized EVM address casing while rejecting any different hexadecimal identity, chain, token, economic direction, malformed approval, incomplete evidence, or future decision.
- Kept quote and submission authorization permanently false even when the candidate is approved.
- Corrected project state to record that the user has only the regular Binance Wallet; the dedicated Agentic Wallet CLI session is not created, connected, or funded.
- Added seven focused tests and verified all 1,655 backend tests across 143 suites, all 90 dashboard tests across 16 files, lint, formatting, the complete backend/dashboard build, Compose validation, and diff integrity.

### Scope confirmation

- No package installation, authentication, wallet creation, funding, live provider call, quote, route, persistence, runtime wiring, Risk Engine bridge, or executor was added. Real trading remains disabled.

## 2026-09-30 — M10.5 non-authorizing instrument compatibility review completed

- Added a pure review model specific to Binance Spot BTC/USDT research versus one exact Agentic Wallet on-chain swap candidate.
- Required exact intent, chain, and token-address correlation plus directionally correct BTC/USDT economic mapping for buy and sell candidates.
- Kept token identity, representation, cross-venue price basis, on-chain liquidity, provider fee, network fee, route slippage, and asynchronous-finality evidence as independent blockers.
- Made complete evidence only `review_ready`; instrument approval, quote authorization, and submission authorization remain permanently false.
- Added eight focused tests for complete evidence, exact-identity divergence, economic direction, every missing evidence class, future review time, and malformed facts.
- Verified all 1,648 backend tests across 142 suites, all 90 dashboard tests across 16 files, lint, formatting, the complete backend/dashboard build, Compose validation, and diff integrity.

### Scope confirmation

- No production chain or token pair was selected; no wallet package, authentication, provider process, route, persistence, live read, quote, mutation, Risk Engine bridge, or executor was added.

## 2026-09-30 — M9.66 disabled Polymarket dashboard requests suppressed

- Changed dashboard refresh into an availability-gated flow: the always-local settings route resolves before any provider-backed Polymarket dashboard request is scheduled.
- Suppressed Data API freshness, global open-interest, active-event, active-market, and selected-research requests whenever Polymarket is disabled or its local availability state cannot be read.
- Preserved the independent settings control so provider access can still be enabled or disabled while external Polymarket services are unavailable.
- Cleared provider-backed browser state on disabled refreshes and invalidated stale refresh generations so an older enabled response cannot undo a manual disable.
- Added focused coverage proving disabled access produces nine local/core requests and zero provider-backed Polymarket requests.
- Verified all 90 dashboard tests across 16 files, lint, formatting, and the complete backend/dashboard build; direct and Vite-proxied local health/backtesting checks returned `200`.

### Scope confirmation

- The backend guard remains fail-closed with expected `503` responses for direct provider-backed routes while disabled; no route, provider contract, persistence, account, order, wallet, or execution behavior changed.

## 2026-09-30 — M10.4 read-only Agentic Wallet capability adapter completed

- Added a closed read-command contract for the pinned CLI check plus wallet status, chains, settings/quota, address, chain-filtered balances, and gas levels.
- Added a process runner that uses argument arrays with no shell, bounded timeout and stdout, cancellation, discarded stderr, and sanitized failures.
- Added strict response normalization for version, connection, chain, security settings, quota, address, exact balance decimals, and chain-specific gas snapshots.
- Made disconnected and still-creating states stop before detail reads and kept every observed chain's quote/submission operations empty, so the existing preflight remains blocked.
- Added 25 focused infrastructure tests using doubles only; no Agentic Wallet package, authentication, live wallet command, route, persistence, quote, mutation, Risk Engine bridge, or executor was introduced.
- Verified all 1,640 backend tests across 141 suites, all 89 dashboard tests across 16 files, lint, formatting, the complete backend/dashboard build, Compose validation, and diff integrity.

### Scope confirmation

- Agentic Wallet remains disconnected and unfunded, real trading remains disabled, and the new adapter is absent from the runtime dependency graph.

## 2026-09-30 — M10.3 fail-closed configuration and capability preflight completed

- Added independent `TRADING_MODE` and `REAL_EXECUTION_ENABLED` startup gates with safe paper/disabled defaults in validation, examples, and Compose.
- Required a complete exact provider, chain, source-token, and distinct target-token allowlist whenever both gates are active.
- Added a pure capability preflight that rejects invalid facts, disabled gates, identity divergence, disconnected state, stale or future snapshots, missing quote support, and unavailable security-settings, quota, balance, or gas reads.
- Made every assessment explicitly non-authorizing for both quotes and submissions, including a fully ready capability assessment.
- Added focused configuration and preflight coverage without creating a NestJS module, provider adapter, route, persistence, wallet read, quote request, Risk Engine bridge, or executor.
- Verified all 1,615 backend tests across 139 suites, all 89 dashboard tests across 16 files, lint, formatting, the complete backend/dashboard build, Compose validation, and diff integrity.

### Scope confirmation

- Agentic Wallet remains disconnected and unfunded; configuration alone cannot create a provider or execution path, and real trading remains disabled.

## 2026-09-30 — M10.2 provider-neutral real-execution contracts completed

- Added inert domain contracts for real-execution capability snapshots, exact-address market-swap intents, non-executable quotes, bounded cost facts, and correlated provider results.
- Added pure validation for canonical identities, exact decimal quantities and slippage, distinct assets, temporal quote validity, bounded costs, unique capabilities, result-state coherence, and the permanent automatic-retry prohibition.
- Kept token symbols presentational while requiring exact opaque token addresses and explicit chains for every intent.
- Added 25 focused tests without registering a NestJS module or adding any provider, process, credential, configuration, route, Risk Engine bridge, wallet read, quote request, or submission path.
- Verified all 1,606 backend tests, 89 dashboard tests, lint, formatting, the complete backend/dashboard build, Compose configuration, and diff integrity.

### Scope confirmation

- Agentic Wallet remains disconnected and unfunded; every new object is an inert validated fact and real trading remains disabled.

## 2026-09-30 — M10.1 real-trading architecture and safety baseline completed

- Closed M9 after confirming that its public, bounded, unauthenticated research goal and acceptance criteria are satisfied through M9.65.
- Reviewed current official Binance Agentic Wallet, Spot security, and official Skills Hub documentation before designing M10.
- Recorded that Agentic Wallet is an MPC on-chain wallet driven by the `baw` CLI, not a centralized Binance Spot API-key executor, so the existing BTC/USDT model cannot be connected by substitution.
- Defined the future provider adapter boundary, independent activation and preflight safeguards, quote/submission separation, non-retry rule for mutations, audit requirements, forbidden capabilities, and read-only-first delivery sequence.
- Added no dependency, configuration, credential, provider process, route, wallet connection, quote, balance read, or execution path.
- Verified 1,581 backend tests, 89 dashboard tests, lint, formatting, the complete backend/dashboard build, Compose configuration, and diff integrity.

### Scope confirmation

- Agentic Wallet remains disconnected and at zero balance; real trading, transfers, withdrawals, futures, margin, leverage, prediction orders, DeFi, external signing, and automatic execution remain disabled.

## 2026-09-30 — M9.65 dashboard resolution identity coherence completed

- Added fail-closed reconciliation between selected-market detail and the already-loaded binary-resolution response.
- Required exact embedded market ID, market condition, indexed token, resolution-condition, and payout-token agreement before displaying result or lifecycle context.
- Classified returned divergence as incoherent and suppressed the complete resolution presentation while preserving unrelated market research.
- Added focused coverage for verified, unavailable, market-divergent, condition-divergent, and payout-token-divergent states.
- Verified all 16 dashboard test files and 89 tests, the complete backend/dashboard build, lint, formatting, and whitespace checks.

### Scope confirmation

- No additional provider request, payout entitlement, holder or wallet position, redemption, recommendation, account, order, or execution behavior was introduced.

## 2026-09-30 — M9.64 dashboard reverse outcome identity verification completed

- Added independent selected-market reverse parent lookups for available indexed YES and NO tokens through the existing public CLOB-backed routes.
- Reconciled requested outcome roles, both token memberships, and canonical condition identity against Gamma market detail before declaring verification.
- Kept missing observations unavailable and classified any returned cross-provider divergence as explicitly incoherent rather than partially verified.
- Added focused coverage for verified, unavailable, and role-divergent identity sets plus dashboard API request coverage.
- Verified all 15 dashboard test files and 84 tests, the complete backend/dashboard build, lint, formatting, and whitespace checks.

### Scope confirmation

- No price, probability, account association, ownership, balance, position, wallet, recommendation, order, redemption, or execution behavior was introduced.

## 2026-09-30 — M9.63 dashboard market identity provenance completed

- Added fixed selected-market provenance rows for the canonical condition identity and indexed YES/NO CLOB token identities.
- Preserved complete provider identifier strings and outcome labels without browser-side calculation or abbreviation.
- Kept nullable identities explicitly unavailable and separated public identifiers from account, wallet, balance, position, and order semantics.
- Added focused coverage for complete and absent identity sets.
- Verified all 14 dashboard test files and 81 tests, the complete backend/dashboard build, lint, formatting, and whitespace checks.

### Scope confirmation

- No provider request, reverse lookup, token metadata expansion, account association, balance, position, wallet, order, redemption, recommendation, or execution behavior was introduced.

## 2026-09-30 — M9.62 dashboard resolution lifecycle context completed

- Displayed nullable provider resolution time and separate local receipt time from the existing binary-resolution response.
- Added independent standard/extended review, disputed/not-disputed, and arbitrated/not-arbitrated presentation states.
- Kept inactive states explicit and avoided inventing a combined severity, confidence, validity, or recommendation score.
- Added focused coverage for inactive and simultaneously active lifecycle dimensions.
- Verified all 13 dashboard test files and 79 tests, the complete backend/dashboard build, lint, formatting, and whitespace checks.

### Scope confirmation

- No additional provider request, payout entitlement, holder or wallet position, redemption, recommendation, persistence, account, order, or execution behavior was introduced.

## 2026-09-30 — M9.61 dashboard binary resolution result completed

- Added the existing indexed binary resolution resource to selected-market dashboard research as an independent request.
- Displayed recognized YES, NO, and 50/50 outcomes with exact indexed payout rates, payout classifications, provider lifecycle status, and explicit non-executable semantics.
- Kept missing or unsupported terminal resolution isolated from identity, price, book, trade, taxonomy, open-interest, and historical resources.
- Extended dashboard API coverage for available resolution and isolated `404` behavior.
- Verified all 12 dashboard test files and 77 tests, the complete backend/dashboard build, lint, formatting, and whitespace checks.

### Scope confirmation

- No payout entitlement, holder or wallet position, redemption, recommendation, persistence, account, order, or execution behavior was introduced.

## 2026-09-30 — M9.60 event-volume-to-market research navigation completed

- Retained correlated market slug, question, condition identity, and closed state in live-volume presentation rows.
- Turned rows correlated to open markets into explicit controls that reuse the existing selected-market research loader.
- Kept closed and unidentified provider rows visible and disabled, with no automatic market expansion or preload.
- Added focused coverage for open-row mapping and closed/unidentified rejection.
- Verified all 12 dashboard test files and 77 tests, the complete backend/dashboard build, lint, formatting, and whitespace checks.

### Scope confirmation

- No backend route, provider request before selection, browser ranking, recommendation, persistence, account, position, order, wallet, or execution behavior was introduced.

## 2026-09-30 — M9.59 dashboard event live-volume pagination completed

- Added independent browser-local eight-item pagination across the selected event's bounded Data API market-volume rows.
- Preserved provider order, condition-to-market correlation, exact share values, and explicit unidentified rows while replacing rather than accumulating pages.
- Reset volume navigation when event selection changes and retained isolated loading and unavailable states.
- Added focused coverage for middle/final pages, stale-page clamping, and invalid page input.
- Verified all 12 dashboard test files and 76 tests, the complete backend/dashboard build, lint, formatting, and whitespace checks.

### Scope confirmation

- No provider request, browser-side aggregation, measurement-window or USDC inference, persistence, account, position, order, wallet, or execution behavior was introduced.

## 2026-09-30 — M9.58 dashboard event-market pagination completed

- Added browser-local eight-item pagination across the bounded selected-event market-reference collection.
- Preserved provider order, replaced the visible page without accumulating rows, and reset navigation when event selection changes.
- Kept closed references visible and disabled while open references retain the explicit M9.57 market-research navigation.
- Added focused coverage for middle/final pages, stale-page clamping, and invalid page input.
- Verified all 12 dashboard test files and 71 tests, the complete backend/dashboard build, lint, and formatting.

### Scope confirmation

- No provider request, backend route, market preload, ranking, recommendation, persistence, account, position, order, wallet, or execution behavior was introduced.

## 2026-09-30 — M9.57 event-to-market research navigation completed

- Turned the bounded selected-event market-reference sample into explicit controls for open references while keeping closed references visible and disabled.
- Reused the existing selected-market summary and research loader without adding a provider route, background request, duplicate research model, or implicit market expansion.
- Decoupled the selected-market research panel from the initial active-market discovery resource, so an event-derived selection remains usable when that independent discovery page is unavailable.
- Preserved provider order, the eight-reference display bound, stale-response suppression, and all non-executable semantics; added no ranking, recommendation, persistence, account, order, wallet, or execution behavior.
- Verified 66 dashboard tests and the production dashboard build.

## 2026-09-30 — M9.56 bounded Polymarket search pagination completed

- Added optional 1-based `page=1..100` validation to `GET /polymarket/search`, with page identity retained in the normalized response and invalid query, limit, or page input rejected as `400` before provider access.
- Passed the documented page directly to Gamma while keeping every response bounded by the existing limit, preserving provider order, and normalizing the documented null event collection as an empty page.
- Added dashboard Previous/Next controls over fixed eight-event pages; a new term returns to page one, continuation follows the submitted term, and pending requests remain stale-safe.
- Added no unbounded accumulation, client-side ranking, persistence, recommendation, account, order, wallet, or execution behavior.
- Verified 1,581 backend tests, 65 dashboard tests, formatting, lint, the complete backend/dashboard build, and diff integrity.
- Live-validated pages one and two for `teste`: each returned eight distinct events from 50 reported matches with no cross-page overlap; page zero returned the expected `400`.

## 2026-09-30 — Polymarket event compatibility correction

- Normalized empty optional Gamma event description and resolution-source values to `null` while continuing to reject non-string provider values.
- Normalized an empty nested market condition identity to `null`, matching the existing provider-neutral model for markets whose condition has not yet been assigned.
- Restored selected-event details and the dependent live-volume composition for valid active events that use either provider representation.
- Restarted the local API to load M9.55's new route and confirmed `GET /polymarket/search?q=teste&limit=8` returns eight bounded events from 50 reported matches.
- Live-validated detail and live-volume responses for all six current dashboard active events; added focused normalization coverage and verified the Polymarket test suite, lint, and backend build.

## 2026-09-29 — M9.55 bounded Polymarket event search completed

- Added guarded read-only `GET /polymarket/search` over Gamma's public search contract with a trimmed 2–100 character query and `limit=1..100` (dashboard fixed at eight).
- Restricted provider results to active, non-closed events and strictly validated bounded unique identity, lifecycle, pagination summary, and timestamps while discarding nested markets, tags, series, metrics, and editorial fields.
- Added a dashboard search form that queries the provider catalog rather than filtering the initial bounded cards, shows total-match and additional-result context, and routes explicit result selection through the existing event-detail research flow.
- Kept search failure isolated and cleared pending search state when provider access is disabled; added no persistence, ranking, recommendation, account, order, wallet, or execution behavior.
- Verified 1,567 backend tests, 65 dashboard tests, lint, formatting, the complete backend/dashboard build, Compose configuration, and diff integrity.

## 2026-09-29 — M9.54 Polymarket dashboard selected-event volume breakdown completed

- Correlated provider-ordered live-volume rows to the event's embedded market references by condition identity.
- Displayed at most eight rows with exact taker-volume shares and question, slug, market identity, or explicit unidentified fallbacks.
- Reused the existing aggregate response without another provider request or browser-side volume calculation.
- Did not sort, sum, convert to USDC, infer a measurement window, or expose trades, holders, positions, recommendations, accounts, orders, or execution behavior.
- Verified 63 dashboard tests, formatting, lint, the complete backend/dashboard build, Compose configuration, and diff integrity.

## 2026-09-29 — M9.53 Polymarket dashboard selected-event market references completed

- Displayed at most eight already-normalized selected-event market references without another provider request.
- Preserved provider order, identity, open/closed state, and question with slug/identity fallbacks.
- Kept the displayed sample count explicit beside the complete normalized reference count.
- Did not join references to live-volume rows or load market prices, liquidity, volume, outcomes, ranking, recommendations, accounts, orders, or execution behavior.
- Verified 61 dashboard tests, formatting, lint, the complete backend/dashboard build, Compose configuration, and diff integrity.

## 2026-09-29 — M9.52 Polymarket dashboard selected-event live volume completed

- Loaded the existing public Data API live-volume resource alongside selected-event details and taxonomy.
- Displayed the exact aggregate taker volume in shares, reported market-row count, and local receipt time.
- Kept live-volume failure isolated from valid event identity, lifecycle, and taxonomy resources.
- Preserved stale-response suppression and provider-disable cleanup across all selected-event resources.
- Did not expose condition-level breakdowns, infer a measurement window or USDC turnover, or add trades, holders, positions, persistence, recommendations, accounts, orders, or execution behavior.
- Verified 59 dashboard tests, formatting, lint, the complete backend/dashboard build, Compose configuration, and diff integrity.

## 2026-09-29 — M9.51 Polymarket dashboard selected-event taxonomy completed

- Loaded the existing bounded direct event-tag resource alongside explicitly selected event details.
- Displayed provider label, slug, or identity fallbacks with distinct empty and unavailable taxonomy states.
- Kept taxonomy failure isolated from valid event identity and lifecycle details.
- Applied existing stale-response suppression and provider-disable cleanup to both selected-event resources.
- Added no related-tag traversal, discovery filtering, nested-market expansion, ranking, persistence, recommendation, account, order, or execution behavior.
- Verified 57 dashboard tests, formatting, lint, the complete backend/dashboard build, Compose configuration, and diff integrity.

## 2026-09-29 — M9.50 Polymarket dashboard selected-event details completed

- Made bounded active-event cards explicit selection controls.
- Loaded the existing public event-detail resource only after selection and suppressed stale responses.
- Displayed description, lifecycle, resolution source, local receipt time, and referenced-market count with isolated loading and unavailable states.
- Cleared event selection and invalidated pending detail work when provider access is disabled.
- Kept market references unexpanded and added no taxonomy, live volume, price, liquidity, outcome, account, order, or execution request.
- Added focused event-detail API coverage and verified 55 dashboard tests plus the production dashboard build.

## 2026-09-29 — M9.49 Polymarket dashboard active-event discovery completed

- Reused the existing bounded public event-discovery route with a fixed six-event dashboard page.
- Added a responsive event grid with identity, title, optional start/end schedule, and restricted status.
- Preserved explicit empty and unavailable states independently from active-market discovery and selected-market research.
- Added no event selection, nested-market expansion, live-volume request, pagination, ranking, recommendation, account, order, or execution behavior.
- Added focused API isolation coverage and verified 53 dashboard tests plus the production dashboard build.

## 2026-09-29 — M9.48 dashboard routed information architecture completed

- Corrected the ultrawide layout so the side navigation stays flush with the viewport edge while the width-bounded content column remains centered in the available area.
- Replaced the dense top navigation with a responsive side-navigation shell and explicit active-page states.
- Split overview, Polymarket, and new-listing research into stable browser-local hash routes compatible with development and compiled static serving.
- Added dedicated research-page headings and improved panel contrast, supporting text size, spacing, and hierarchy for dense observations.
- Preserved every existing API request, isolated unavailable state, automatic refresh rule, provider safeguard, and read-only boundary.
- Added focused route parsing/link coverage and verified 52 dashboard tests plus the production dashboard build.

## 2026-09-29 — M9.47 Polymarket dashboard historical observation provenance completed

- Reused the existing selected-market binary price-change response without adding a provider request or backend route.
- Added a fixed earlier-YES, earlier-NO, later-YES, later-NO provenance view.
- Displayed each exact source price, actual observed time, resolution, and exact-requested-time status.
- Kept the points explicitly descriptive and distinct from trades, bid/ask history, synchronized snapshots, executable quotes, recommendations, or fills.
- Added focused mapping coverage and strengthened the dashboard API contract fixture with all four observations.
- Verified 44 dashboard tests, 1,551 backend tests, formatting, lint, the complete backend/dashboard build, Compose configuration, and diff integrity.

## 2026-09-29 — M9.46 Polymarket dashboard historical alignment context completed

- Reused the existing selected-market 24-hour price-change response without adding a provider request or backend route.
- Displayed the exact combined YES/NO movement and its absolute percentage-point presentation.
- Exposed timestamp and resolution alignment independently at the earlier and later requested boundaries.
- Kept the comparison explicitly non-atomic, non-executable, and distinct from a percentage return or synchronized price series.
- Added focused coverage for all four timestamp/resolution alignment combinations and strengthened the dashboard API contract assertion.
- Verified 43 dashboard tests, 1,551 backend tests, formatting, lint, the complete backend/dashboard build, Compose configuration, and diff integrity.

## 2026-09-29 — M9.45 Polymarket dashboard binary midpoint relationship completed

- Reused the selected market's existing midpoint-complement response without adding a provider request or backend route.
- Displayed the exact midpoint sum, signed deviation from one, percentage presentation, and descriptive relationship classification.
- Preserved independent-receipt, non-atomic, and non-executable semantics without arbitrage, coherence, recommendation, account, order, or execution claims.
- Added focused coverage for all three relationship labels and strengthened the dashboard API contract assertion.
- Verified 39 dashboard tests, 1,551 backend tests, formatting, lint, the complete backend/dashboard build, Compose configuration, and diff integrity.

## 2026-09-29 — M9.44 Polymarket dashboard explicit related taxonomy completed

- Made direct selected-market tags explicit controls that load one existing bounded first-level related-tag resource.
- Displayed related labels with slug and identity fallbacks plus distinct loading, empty, and unavailable states.
- Prevented recursive traversal by keeping related results display-only and suppressed stale responses after newer selections.
- Cleared browser-local relationship state when changing market or disabling provider access.
- Added no backend route, implicit expansion, discovery filtering, ranking, persistence, recommendation, account, order, or execution behavior.
- Verified 36 dashboard tests, 1,551 backend tests, formatting, lint, the complete backend/dashboard build, Compose configuration, and diff integrity.

## 2026-09-29 — M9.43 Polymarket dashboard selected-market taxonomy completed

- Loaded the existing bounded direct market-tag resource independently for each selected market.
- Displayed provider tag labels with slug and identity fallbacks, plus explicit empty and unavailable states.
- Kept taxonomy failure isolated from identity, midpoint, open interest, books, latest trades, and historical observations.
- Added no backend route, related-tag expansion, discovery filtering, ranking, persistence, recommendation, account, order, or execution behavior.
- Verified 34 dashboard tests, 1,551 backend tests, formatting, lint, the complete backend/dashboard build, Compose configuration, and diff integrity.

## 2026-09-29 — M9.42 Polymarket dashboard global open interest completed

- Loaded the existing parameter-free public platform-wide open-interest observation independently during each dashboard refresh.
- Displayed the exact aggregate USDC value and local receipt time separately from selected-market open interest.
- Preserved an isolated unavailable state so aggregate failure does not hide Data API freshness, discovery, or selected-market research.
- Added no backend route, market expansion, holders, wallet positions, persistence, recommendation, account, order, or execution behavior.
- Verified 33 dashboard tests, 1,551 backend tests, formatting, lint, the complete backend/dashboard build, Compose configuration, and diff integrity.

## 2026-09-29 — M9.41 Polymarket dashboard Data API freshness completed

- Loaded the existing parameter-free public Data API freshness snapshot independently during each dashboard refresh.
- Displayed snapshot age/computation time, serving lag/worst mechanism, most-lagged ingestion cursor/network, and cursor count.
- Kept provider freshness separate from local health and avoided extending Data API measurements to Gamma or CLOB.
- Added no thresholds, alerting, persistence, automated response, recommendation, account, order, or execution behavior.
- Verified 32 dashboard tests, 1,551 backend tests, formatting, lint, the complete backend/dashboard build, Compose configuration, and diff integrity.

## 2026-09-29 — M9.40 Polymarket dashboard 24-hour price history chart completed

- Loaded one bounded 30-minute price-history page independently for selected-market YES and NO tokens over the trailing 24-hour UTC window.
- Added a fixed zero-to-one ECharts view that can display either valid outcome without requiring its peer.
- Preserved per-outcome unavailable diagnostics and avoided treating independently bucketed pages as synchronized snapshots.
- Added no backend route, pagination, persistence, historical order book, percentage return, signal, recommendation, account, order, or execution behavior.
- Verified 31 dashboard tests, the unchanged 1,551-test backend suite, formatting, lint, the complete backend/dashboard build, Compose configuration, and diff integrity.

## 2026-09-29 — M9.39 Polymarket dashboard 24-hour price change completed

- Reused the existing binary price-change route for a trailing 24-hour UTC comparison on each selected-market refresh.
- Displayed exact YES and NO absolute changes as percentage points with provider-derived direction.
- Kept historical comparison failures isolated from current midpoint, open-interest, book, and latest-trade observations.
- Added no backend route, persistence, historical chart, percentage return, signal, recommendation, account, order, or execution behavior.
- Verified 27 dashboard tests, 1,551 backend tests, formatting, lint, the complete backend/dashboard build, Compose configuration, and diff integrity.

## 2026-09-29 — M9.38 Polymarket dashboard latest trades completed

- Extended selected-market research with the existing public latest-trade route for indexed YES and NO outcomes.
- Load both trades only after selected-market token identity is available and preserve independent unavailable states.
- Display exact reported price, provider side, and local receipt time while stating that provider quantity and timestamp are unavailable.
- Kept trades separate from independently loaded books and added no trade history, freshness inference, quote, signal, recommendation, account, order, or execution behavior.
- Verified 26 dashboard tests, formatting, lint, the complete backend/dashboard build, Compose configuration, and diff integrity.

## 2026-09-29 — M9.37 Polymarket runtime availability control completed

- Added always-available local `GET` and `PUT /polymarket/settings` routes for current availability and a process-local override.
- Required an explicit access/VPN acknowledgement before runtime enablement; disabling remains immediate.
- Added a responsive dashboard control that reports startup versus runtime state, enables only after acknowledgement, and refreshes provider research after a successful change.
- Centralized the existing provider guard on the availability service; all Gamma, CLOB, and Data API routes still fail before provider access while disabled.
- Kept the safe `false` startup default, reset-on-restart behavior, and complete separation from credentials, accounts, wallets, orders, and execution.

## 2026-09-29 — M9.36 Polymarket dashboard level-one liquidity completed

- Extended selected-market research with existing public CLOB top-of-book routes for indexed YES and NO outcomes.
- Load the two outcome books only after selected-market token identity is available, then request them concurrently with isolated failure states.
- Display best bid/ask price and quantity plus provider spread without presenting level one as full depth, an executable quote, or a fill guarantee.
- Corrected the CLOB snapshot normalization to validate the provider's ascending bids and descending asks and select the final level of each side, eliminating false `503` responses for valid books.
- Validated the dashboard proxy against live VPN-accessible data: one selected market returned coherent two-sided YES and NO books with exact `0.001` spreads.
- Preserved the M9.35 fail-closed default; no provider access occurs while Polymarket research is disabled.

## 2026-09-29 — M9.35 Polymarket operational availability guard completed

- Added one controller-wide guard covering every `/polymarket` route before any Gamma, CLOB, or Data API call.
- Added validated `POLYMARKET_ENABLED` configuration with fail-closed `false` defaults in application and Compose configuration.
- Return a sanitized local `503` while disabled so the dashboard reports the operational state without attempting provider access.
- Documented explicit enablement only when local access is permitted and the required VPN is already active; no network-block bypass or automatic VPN detection was introduced.

## 2026-09-29 — M9.34 Polymarket dashboard research completed

- Added a responsive Polymarket dashboard section backed only by existing local read-only APIs.
- Display up to eight active market questions and allow explicit browser-local market selection.
- Concurrently load selected-market YES/NO labels, independent midpoint percentages, and aggregate open interest with isolated unavailable states.
- Classify provider hostname-resolution failures during market discovery and surface the sanitized local API diagnostic in the dashboard instead of a generic HTTP 503 label.
- Corrected the public CLOB midpoint response contract from the obsolete `mid_price` field to the provider's live and documented `mid` field, restoring selected-market YES/NO midpoint statistics.
- Kept event volume, history, full depth, trades, recommendations, positions, accounts, mutations, orders, and execution outside the view.

## 2026-09-29 — M9.33 outcome parent-market identity completed

- Added `GET /polymarket/outcomes/:tokenId/market` backed by the public CLOB market-by-token endpoint.
- Added a provider-neutral reverse-identity contract, application service, and strict adapter for canonical condition and primary/YES plus secondary/NO token identities.
- Require distinct returned tokens and exact requested-token membership, exposing the requested indexed side while mapping documented absence separately from provider or contract failure.
- Kept the result stateless, identity-only, and explicitly non-executable without prices, holders, positions, accounts, credentials, orders, or execution.

## 2026-09-28 — M9.32 binary point-in-time price change completed

- Added `GET /polymarket/markets/:id/price-change` for one selected binary market and a required positive whole-second UTC interval of at most 31 days.
- Concurrently compose the indexed YES and NO M9.31 changes only after validating present, distinct token identities and returned interval coherence.
- Preserve all four historical observations and expose cross-outcome timestamp and resolution alignment independently at the interval's start and end.
- Calculate the exact combined YES/NO price change and direction with isolated decimal arithmetic while keeping `atomicSnapshot: false` and `executable: false` invariant.

## 2026-09-28 — M9.31 outcome point-in-time price change completed

- Added `GET /polymarket/outcomes/:tokenId/price-change` for one canonical token and a required positive whole-second UTC interval of at most 31 days.
- Concurrently compose two M9.29 observations only after validating token identities, echoed requested times, and nondecreasing provider observation time.
- Calculate the exact signed price change with isolated decimal arithmetic and classify it as `up`, `down`, or `unchanged`.
- Preserve both complete observations and expose same-observed-time and same-resolution flags with invariant non-executable semantics and no percentage-return, quote, trade, or recommendation claim.

## 2026-09-28 — M9.30 binary point-in-time price complement completed

- Added `GET /polymarket/markets/:id/price-complement-at` for one selected binary market and canonical whole-second UTC instant.
- Concurrently compose the indexed YES and NO M9.29 observations only after validating market tokens, response identities, and echoed requested times.
- Calculate exact price sum and signed deviation from one with isolated decimal arithmetic, classify the result, and disclose observed-time and resolution alignment without claiming an atomic snapshot, arbitrage, recommendation, or execution.

## 2026-09-28 — M9.29 point-in-time Polymarket outcome price completed

- Added `GET /polymarket/outcomes/:tokenId/price-at` with one required canonical whole-second UTC `at` parameter.
- Extended the Data API price-history contract with a fixed `as_of`/`limit=1` lookup that requires exactly one terminal non-future observation and preserves exact decimal price plus provider resolution.
- Exposed requested and observed timestamps separately with `exactTimestamp`, while retaining stateless, public, non-executable semantics and no trade, book-history, account, persistence, order, or strategy path.

## 2026-09-28 — M9.28 bounded Polymarket outcome price history completed

- Added `GET /polymarket/outcomes/:tokenId/price-history` with required canonical whole-second UTC bounds, a maximum 31-day window, explicit supported resolution, bounded page size, and opaque continuation cursor.
- Added a dedicated Data API price-history provider contract, application service, and adapter that validate oldest-first in-window timestamps, exact prices from zero through one, provider resolution, response cardinality, and cursor coherence.
- Kept historical observations stateless and explicitly non-executable, without bid/ask history, individual trades, persistence, accounts, positions, orders, or strategy/execution paths.

## 2026-09-28 — M9.27 global Polymarket open interest completed

- Added parameter-free `GET /polymarket/open-interest` backed by the unauthenticated Data API `v2/oi` endpoint without condition filters.
- Added a dedicated global open-interest provider contract and service while reusing the strictly validated Data API adapter from M9.25.
- Require exactly one row with `condition_id: null` and preserve its non-negative aggregate USDC value as a decimal string with local receipt time.
- Map provider, JSON, cardinality, identity, and decimal failures to local `503` rather than presenting market-grain data as a global total.
- Kept market expansion, holders, wallet positions, accounts, persistence, polling, orders, wallets, and execution outside the increment.

## 2026-09-28 — M9.26 selected-event Polymarket live volume completed

- Added `GET /polymarket/events/:id/live-volume` backed by the unauthenticated Data API `v2/live-volume` endpoint.
- Added a provider-neutral event live-volume contract, strict Data API adapter, and selected-event composition service.
- Preserve total and per-market taker volume as non-negative decimal share quantities, enforce a 1,000-row bound, unique condition identities, descending provider order, and exact total reconciliation.
- Reject identified provider conditions outside the selected Gamma event and preserve one explicitly unidentified source row without inventing market identity.
- Kept individual trades, holders, wallet positions, PnL, accounts, persistence, polling, orders, wallets, and execution outside the increment.

## 2026-09-28 — M9.25 selected-market Polymarket open interest completed

- Added `GET /polymarket/markets/:id/open-interest` backed by the unauthenticated Data API `v2/oi` endpoint.
- Added a provider-neutral condition open-interest contract, strict Data API adapter, and selected-market composition service.
- Require one identity-matched provider row and preserve its non-negative USDC value as a decimal string with explicit provenance and local receipt time.
- Map absent market, missing condition identity, and an empty provider result to local `404`; malformed, duplicate, mismatched, and unavailable provider data fail closed as `503`.
- Kept holders, per-wallet positions, PnL, accounts, persistence, polling, orders, wallets, and execution outside the increment.

## 2026-09-27 — M9.24 public Polymarket Data API freshness completed

- Added parameter-free `GET /polymarket/data-freshness` backed by the unauthenticated Data API `v2/status` endpoint.
- Added a dedicated provider contract, service, and adapter for the documented serving and ingestion freshness snapshot.
- Strictly validate snapshot age and computation time, ingestion block bounds and bounded unique lagging cursors, and bounded unique serving mechanisms with a resolvable worst mechanism.
- Map provider `503`, other HTTP failures, transport failures, and malformed or incoherent successful responses to local `503` without presenting missing measurements as healthy data.
- Kept feeds, positions, profiles, account activity, persistence, polling, orders, wallets, and execution outside the increment.

## 2026-09-27 — M9.23 selected Polymarket series events completed

- Added `GET /polymarket/series/:id/events` for one validated positive numeric Gamma series ID.
- Extended the series provider contract and adapter to load and normalize at most 1,000 unique event references from the selected series detail payload.
- Preserve only event ID, nullable slug and dates, required title, and lifecycle flags while rejecting malformed, duplicate, oversized, or identity-divergent payloads.
- Kept nested markets, prices, volume, liquidity, metrics, persistence, accounts, orders, wallets, and execution outside the increment.
- Added focused service, adapter, and controller tests and synchronized the API route table and milestone documentation.

## 2026-09-27 — M9.22 recurrence-filtered Polymarket series discovery completed

- Added optional bounded `recurrence` filtering to `GET /polymarket/series` while retaining its existing offset pagination contract.
- Validate recurrence as non-empty, trimmed, control-free text of at most 100 characters before provider access.
- Apply the exact recurrence to Gamma and reject a complete page if any returned series does not match it exactly.
- Kept fuzzy matching, recurrence catalog discovery, relation expansion, metrics, persistence, accounts, orders, wallets, and execution outside the increment.
- Added focused service, adapter, and controller tests and synchronized the API route table and milestone documentation.

## 2026-09-27 — M9.21 active Polymarket series discovery completed

- Added `GET /polymarket/series` with bounded `limit=1..100` and `offset=0..10000` inputs.
- Extended the provider-neutral series contract and Gamma adapter to request open series in ascending provider-ID order with nested events excluded.
- Reject malformed, duplicate, oversized, or closed results and expose offset continuation with `stablePagination: false`.
- Kept recurrence filters, event and market expansion, metrics, persistence, accounts, orders, wallets, and execution outside the increment.
- Added focused adapter, service, and controller tests and synchronized the API route table and milestone documentation.

## 2026-09-27 — M9.20 selected Polymarket series details completed

- Added `GET /polymarket/series/:id` for one validated positive numeric Gamma series ID.
- Added a dedicated provider-neutral series contract, application service, and unauthenticated Gamma adapter with a ten-second request timeout.
- Strictly validate the returned identity, nullable slug/title/recurrence, and closed state; provider `404` remains distinct from provider or payload failure.
- Kept nested events and markets, metrics, persistence, accounts, orders, wallets, and execution outside the increment.
- Added focused adapter, service, controller, and module tests and synchronized the API route table and milestone documentation.

## 2026-09-27 — M9.19 exact-tag Polymarket market discovery completed

- Added optional positive numeric `tagId` filtering to `GET /polymarket/markets` while retaining the existing bounded keyset pagination contract.
- Sent Gamma's explicit tag filter and requested tag relations, then failed closed unless every returned market proved exact membership in the requested tag.
- Added focused adapter and controller coverage for query construction, exact membership, and invalid public input.
- Kept related-tag expansion, ranking, persistence, polling, accounts, positions, orders, wallets, and execution outside the increment.

## 2026-09-27 — M9.18 exact-tag Polymarket event discovery completed

- Added optional positive numeric `tagId` filtering to `GET /polymarket/events` while retaining the existing bounded keyset pagination contract.
- Requests Gamma's exact `tag_id` with tag relations and verifies every returned event contains the selected identity before exposing its reduced discovery summary.
- Fails closed on missing, malformed, duplicate, or mismatched provider tag relations; an empty filtered page remains valid.
- Adds no implicit related-tag expansion, ranking, recommendation, polling, persistence, accounts, orders, wallet, or execution behavior.

## 2026-09-27 — M9.17 bounded public Polymarket related tags completed

- Added `GET /polymarket/tags/:id/related` for one validated positive numeric Gamma source-tag ID.
- Loads at most 100 related tags and preserves only unique IDs with nullable labels/slugs plus receipt time.
- Maps provider `404` to local `404` and fails closed on malformed, duplicate, oversized, self-referential, or unavailable provider data.
- Adds no recursive traversal, relationship weighting, filters, polling, persistence, accounts, orders, wallet, or execution behavior.

## 2026-09-27 — M9.16 selected public Polymarket tag details completed

- Added `GET /polymarket/tags/:id` for one validated positive numeric Gamma tag ID.
- Requires exact response-identity agreement and strictly normalizes only ID, nullable label/slug, and receipt time.
- Maps provider `404` to local `404`; malformed identity, other provider failures, and successful-response contract violations fail closed as `503`.
- Adds no slug lookup, tag relationships, filters, editorial metadata, polling, persistence, accounts, orders, wallet, or execution behavior.

## 2026-09-27 — M9.15 bounded public Polymarket tag catalog completed

- Added `GET /polymarket/tags` for bounded, unauthenticated global taxonomy discovery.
- Validates `limit=1..100` and `offset=0..10000`, requests ascending provider-ID order, and exposes continuation only as explicitly unstable offset pagination.
- Strictly normalizes unique tag IDs with nullable labels/slugs and rejects malformed, duplicate, or oversized successful responses.
- Keeps the catalog contract separate from selected event and market taxonomy and adds no relationships, filtering, polling, persistence, accounts, orders, wallet, or execution behavior.

## 2026-09-27 — M9.14 selected public Polymarket market taxonomy completed

- Added read-only retrieval of the public tags attached to one validated Gamma market ID.
- Bounds each market taxonomy to 100 entries and strictly normalizes unique tag IDs with nullable labels and slugs.
- Keeps the market taxonomy contract separate from event taxonomy and discards provider editorial, timestamp, and authoring metadata.
- Adds no polling, persistence, prices, positions, accounts, wallet, order, strategy, signal, or execution behavior.

## 2026-09-27 — M9.13 selected public Polymarket event taxonomy completed

- Added read-only retrieval of the public tags attached to one validated Gamma event ID.
- Bounds each taxonomy to 100 entries and strictly normalizes unique tag IDs with nullable labels and slugs.
- Discards provider editorial flags, timestamps, and authoring metadata from the local read model.
- Adds no polling, persistence, prices, positions, accounts, wallet, order, strategy, signal, or execution behavior.

## 2026-09-27 — M9.12 bounded public Polymarket event discovery completed

- Added a read-only active-event discovery route backed by Gamma keyset pagination with default limit 20, maximum 100, and an opaque cursor.
- Strictly normalizes only event identity, dates, and lifecycle summaries; relation-heavy nested markets, series, tags, and financial metrics are not exposed.
- Accepts the documented omitted final-page cursor and fails closed on malformed, closed, or unavailable provider data.
- Adds no polling, persistence, prices, positions, accounts, wallet, order, strategy, signal, or execution behavior.

## 2026-09-27 — M9.11 selected public Polymarket event details completed

- Added read-only lookup of one public Gamma event by validated numeric ID.
- Strictly normalizes event identity, descriptive resolution context, lifecycle flags, timestamps, and receipt time.
- Bounds nested markets to 1,000 and reduces them to validated identity, condition, and closed-state references without importing prices, volume, liquidity, or trading flags.
- Adds no event discovery, polling, persistence, position, account, wallet, order, strategy, signal, or execution behavior.

## 2026-09-27 — M9.10 indexed binary Polymarket resolution result completed

- Added a read-only market route that reconciles selected-market identity and indexed YES/NO outcomes with its condition-grain resolution record.
- Interprets only exact recognized terminal vectors: `[1,0]` for YES, `[0,1]` for NO, and `[0.5,0.5]` for the rare split result.
- Exposes exact payout rates and winner/loser/split classification while keeping the raw vector internal and the M9.9 lifecycle response unchanged.
- Adds no position lookup, user entitlement, redemption, authentication, persistence, account, wallet, order, or execution behavior.

## 2026-09-27 — M9.9 public Polymarket condition resolution state completed

- Added a read-only condition route backed by the unauthenticated public Data API resolution endpoint.
- Strictly validates the requested and returned condition identity and preserves provider status, review/dispute/arbitration flags, nullable resolution time, and receipt time.
- Maps the documented empty response to explicit absence and fails closed on duplicate, mismatched, malformed, or unavailable provider data.
- Does not interpret payouts, infer a winning outcome, persist observations, or add authentication, account, wallet, order, or execution behavior.

## 2026-09-27 — M9.8 binary midpoint complement completed

- Added a read-only market route that loads the indexed YES and NO CLOB midpoints concurrently after selected-market discovery.
- Reports their exact sum, signed deviation from one, and descriptive `balanced`, `below_one`, or `above_one` status using isolated 40-digit decimal arithmetic.
- Rejects absent or duplicate outcome-token identities and mismatched midpoint responses explicitly.
- Exposes `atomicSnapshot: false` and `executable: false` without claiming arbitrage, probability coherence, recommendation, persistence, account, wallet, or execution behavior.

## 2026-09-27 — M9.7 descriptive last-trade book context completed

- Added a read-only aggregate route that concurrently loads the latest reported trade and current displayed top of book.
- Classifies the trade price as below bid, at bid, at both locked sides, inside spread, at ask, or above ask with exact signed decimal distances.
- Represents incomplete displayed liquidity as explicitly unverifiable and rejects component identity divergence.
- Exposes `atomicSnapshot: false` and `executable: false`; the comparison is descriptive and creates no signal, recommendation, persistence, account, wallet, or execution path.

## 2026-09-27 — M9.6 public Polymarket last trade completed

- Added a read-only route for one outcome token's latest public CLOB trade price and provider-reported side.
- Strictly validates exact prices from zero through one, normalizes only documented `BUY` and `SELL` sides, and exposes receipt-only freshness with `executable: false`.
- Converts the documented `0.5` plus empty-side never-traded placeholder into explicit unavailability instead of presenting it as an observed trade.
- Adds no trade history, cache, persistence, authentication, account, wallet, or execution behavior.

## 2026-09-27 — M9.5 coherent outcome market data completed

- Added a read-only aggregate route that loads the public Polymarket midpoint and top of book concurrently.
- Verifies the independent midpoint against the exact bid/ask average with 40-digit decimal arithmetic and fails closed on price or token-identity divergence.
- Represents missing bid/ask liquidity as explicitly unverifiable rather than inventing coherence or liquidity.
- Keeps both source observations, provider timing limitations, and `executable: false` visible without adding persistence, authentication, accounts, wallet access, or execution.

## 2026-09-26 — M8.11 Apache ECharts dashboard migration completed

- Replaced all three manual SVG dashboard plots with Apache ECharts 6.1.
- Added one reusable Vue chart component with reactive updates, SVG rendering, responsive resizing, accessibility labels, and lifecycle cleanup.
- Preserved chronological signal, equity, and checkpoint-return transformations with updated focused tests.
- Removed manual chart paths and styles and split application, ECharts, and ZRender into bounded production chunks.
- Verified the added ECharts dependency is not involved in the four current npm audit findings; the existing Prisma dependency-chain findings remain separately tracked without a forced breaking downgrade.

## 2026-09-26 — M9.4 public Polymarket top of book completed

- Added a public read-only route for one outcome token's best bid, best ask, displayed quantities, and spread.
- Strictly validated snapshot identity, metadata, exact decimals, documented side ordering, and non-crossed books.
- Preserved the provider snapshot timestamp and hash while representing missing bid or ask liquidity explicitly.
- Marked the observation non-executable and added no persistence, authentication, account, wallet, signal, or order path.
- Recorded Apache ECharts as the preferred library for future dashboard chart work without adding the dependency before a concrete visual increment.

## 2026-09-26 — M9.3 public Polymarket outcome midpoint completed

- Added a public read-only route for one selected outcome token's CLOB midpoint.
- Preserved the provider decimal string exactly and constrained it to the documented zero-through-one range.
- Marked the midpoint non-executable and exposed local receipt time separately from an explicitly unavailable provider timestamp.
- Distinguished malformed input, invalid tokens or missing books, and provider failures without adding credentials, persistence, orders, accounts, or wallets.

## 2026-09-26 — M9.2 selected Polymarket outcome identities completed

- Added public lookup of one selected market by validated Gamma market ID.
- Strictly decoded the provider's indexed outcome-label and CLOB-token arrays into explicit YES and NO identities.
- Preserved unavailable token IDs as null and distinguished invalid input, missing markets, and provider unavailability.
- Deliberately ignored provider outcome prices and added no persistence, account, wallet, order, signal, or execution behavior.

## 2026-09-26 — M9.1 public Polymarket market discovery completed

- Added a dedicated prediction-market module and provider-neutral active-market page contract, separate from Spot crypto semantics.
- Added a timeout-bounded public Gamma API adapter with strict payload normalization and keyset cursor propagation.
- Added local `GET /polymarket/markets` with bounded input validation and explicit `503` provider failure.
- Added no credentials, persistence, polling, prices, order books, positions, wallet access, signals, or execution behavior.

## 2026-09-26 — M8.10 compiled dashboard serving completed

- Served generated dashboard assets from the existing loopback-bound NestJS Express application under /dashboard/.
- Added build-only Vite asset paths and same-origin production API paths while retaining the separate development proxy.
- Added a complete build script and corrected the production entry point to the actual TypeScript output path.
- Verified the production script, dashboard HTML, hashed asset, and health API live without adding mutation, authentication changes, external exposure, or trading behavior.

## 2026-09-26 — M8.9 latest persisted backtest equity completed

- Added an independent bounded request for the newest immutable stored simulation snapshot.
- Added its complete fee-adjusted equity curve and stored capital, ROI, drawdown, trade-count, and win-rate facts.
- Added explicit empty and unavailable states plus responsive navigation and layout.
- Added focused API isolation and chart coverage without adding simulation, persistence, deletion, wallet mutation, recommendation, or trading controls.

## 2026-09-26 — M8.8 selected-listing checkpoint research completed

- Added explicit per-card loading of the existing exact T+0-relative listing performance route.
- Added a zero-anchored checkpoint return chart, observed-price cards, and baseline context for the selected durable detection.
- Preserved independent resource failures and translated an unavailable T+0 baseline into an explicit waiting state.
- Added focused API and chart coverage without adding a backend route, ranking, recommendation, mutation, signal, or trading path.

## 2026-09-26 — M8.7 moving-average signal chart completed

- Added a chronological shared-scale SVG chart for the short and long averages already present in persisted strategy signals.
- Added observational buy/sell point markers while retaining the exact signal timeline and explicit empty/unavailable states.
- Added focused chart-transformation coverage for chronology, shared scaling, and incomplete signal exclusion.
- Added no backend route, signal evaluation, financial calculation, recommendation, mutation, order submission, or real trading path.

## 2026-09-26 — M8.6 persisted strategy signal timeline completed

- Added an independent typed request for twenty recent persisted moving-average crossover signals.
- Added a responsive observational timeline for buy, sell, and hold actions with evaluation times, configured periods, and current exact averages.
- Added no evaluation, parameter mutation, position sizing, risk assessment, order submission, or real trading path.

## 2026-09-26 — M8.5 responsive dashboard section navigation completed

- Added semantic header links for Overview, Executions, and New listings using native fragment navigation and explicit section targets.
- Added keyboard focus, destination scroll offsets, smooth scrolling with reduced-motion compatibility, and a narrow-screen scrollable navigation row.
- Added no router dependency, new API request, mutation, authentication, execution behavior, or real trading path.

## 2026-09-26 — M8.4 recent new-listing detection view completed

- Added an independent typed dashboard request for eight recent durable application detections.
- Added responsive cards for provider, pair, detection time, provider status, and current Spot availability with explicit empty and unavailable states.
- Preserved application-detection semantics and independent portfolio/execution availability without adding ranking, recommendation, alerts, mutation, or trading.

## 2026-09-26 — M8.3 recent fictional execution ledger completed

- Added an independent typed request for the twelve newest persisted paper executions.
- Added a responsive read-only ledger showing side, execution time, BTC quantity, price, and side-specific total cost or net proceeds, with explicit empty and unavailable states.
- Added focused client coverage proving an unavailable execution history does not suppress the healthy overview resources.
- Added no backend route, mutation, order action, browser persistence, provider request, authenticated exchange access, or real trading path.

## 2026-09-26 — M8.2 visibility-aware automatic dashboard refresh completed

- Added immediate and completion-relative 15-second overview refreshes without overlapping requests.
- Paused pending refresh work while the browser document is hidden and added an immediate refresh when visibility returns.
- Preserved manual refresh, independent resource availability, and teardown cleanup, with focused fake-timer tests for cadence, overlap prevention, and visibility behavior.
- Added no backend route, mutation, persistent browser state, provider request, signal, order simulation, paper execution, authenticated exchange access, or real trading path.

## 2026-09-26 — M8.1 read-only dashboard foundation completed

- Added a separate Vue 3/Vite dashboard with a responsive local research overview for API health, fictional portfolio valuation, BTC paper position, and realized paper performance.
- Added a typed client that loads resources independently and preserves explicit unavailable states when market data or the local API is unavailable.
- Added dashboard type-check/build scripts, Vitest coverage for success, partial availability, and unreachable API behavior, local Vite proxying, and operating documentation.
- No backend route, mutation, authentication, provider request, signal, order simulation, paper execution, or real trading path was added.

## 2026-09-26 — M7.109 durable listing checkpoint round-trip outcome cohort API completed

- Added local read-only `GET /new-listings/round-trip/outcomes` for one explicit durable round-trip outcome cohort configuration.
- Requires entry/exit labels and fee/slippage rates, with established optional bounded `limit` and Binance `provider` inputs and `%2B` label encoding.
- Updated the root API route table; the endpoint exposes coverage, winning/losing/break-even counts, and conditional average net returns without selection, ranking, optimization, signals, simulation, or trading.

## 2026-09-26 — M7.108 durable listing checkpoint round-trip outcome cohort completed

- Composed M7.107 outcome decomposition over the bounded recent durable top-of-book cohort in the detection read model.
- Shared sample-loading boundary with existing round-trip cohort aggregation and retained incomplete timelines as unavailable coverage.
- Added no route, provider request, projection, selection, ranking, optimization, simulation, or trading behavior.

## 2026-09-21 — M7.107 listing checkpoint round-trip outcome cohort completed

- Added a pure exact-decimal outcome cohort for profitable, losing, exact break-even, and unavailable fixed-configuration round trips.
- Reports nullable exact conditional average net returns for profitable and losing samples without treating absent classes as zero.
- Reuses strict M7.104 validation and adds no repository access, route, selection, ranking, optimization, simulation, or trading behavior.
- 908 unit tests across 99 suites and all 69 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-21 — M7.106 durable listing checkpoint round-trip cohort API completed

- Added local read-only `GET /new-listings/round-trip` for one explicit durable round-trip cohort configuration.
- Requires entry/exit labels and fee/slippage rates, with established optional bounded `limit` and Binance `provider` inputs and `%2B` label encoding.
- Updated the root API route table; the endpoint exposes coverage and exact summaries without selection, ranking, optimization, signals, simulation, or trading.
- 904 unit tests across 98 suites and all 69 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-21 — M7.105 durable listing checkpoint round-trip cohort composition completed

- Added bounded internal read-model composition of one fixed round-trip configuration over durable top-of-book timelines.
- Validates the cohort limit, selected pair, and costs before loading; incomplete timelines remain explicit unavailable samples without checkpoint substitution.
- Reuses M7.101 per available timeline and M7.104 for aggregation, with no route, selection, optimization, signal, simulation, or trading behavior.
- 898 unit tests across 98 suites and all 68 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-21 — M7.104 listing checkpoint round-trip cohort calculation completed

- Added a pure exact-decimal cohort calculator for one fixed entry/exit and fee/slippage configuration.
- Reports explicit available/unavailable coverage, profitable/non-profitable counts, profitability rate, average gross/net return, and median net return.
- Added strict sample identity, configuration, schedule, execution-price, return, and profitability reconciliation without repository or route behavior.
- 894 unit tests across 98 suites and all 68 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-21 — M7.103 durable listing checkpoint round-trip API completed

- Added local read-only `GET /new-listings/:provider/:symbol/round-trip` with mandatory entry/exit labels and explicit fee/slippage rates.
- Added pre-read validation and explicit `400`, `404`, and `503` behavior; documented `%2B` encoding for checkpoint-label plus signs.
- Updated the root API route table; the endpoint does not select, optimize, persist, signal, simulate an order, or trade.
- 888 unit tests across 97 suites and all 68 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-21 — M7.102 durable listing checkpoint round-trip composition completed

- Added internal read-model composition of an explicit forward checkpoint round trip from a known detection's durable top-of-book timeline.
- Validates labels and cost rates before repository access, preserves unknown-detection errors, and returns unavailable when either selected book is missing.
- Reuses the M7.101 exact calculator and adds no route, automatic selection, persistence, signal, fill simulation, or trading behavior.
- 884 unit tests across 97 suites and all 67 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-21 — M7.101 exact cost-adjusted listing checkpoint round trip completed

- Added a pure exact-decimal calculator for one explicit stored-ask-to-later-stored-bid checkpoint round trip.
- Includes observed spread, adverse two-sided slippage, two-sided fees, exact gross/net returns, duration, and profitability after costs.
- Added strict book, identity, schedule, target-time, checkpoint-order, and cost-rate validation without order/fill simulation or automatic strategy selection.
- 880 unit tests across 97 suites and all 67 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-21 — M7.100 durable listing checkpoint price variability cohort API completed

- Added local read-only `GET /new-listings/variability` with optional bounded `limit` and Binance provider input.
- Exposes total and transition-bearing samples with exact nullable medians for average and maximum absolute consecutive returns.
- Updated the root API route table; the endpoint cannot collect, persist, annualize, rank, score, alert, signal, simulate, or trade.
- 875 unit tests across 96 suites and all 67 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-21 — M7.99 durable listing checkpoint price variability cohort composition completed

- Added bounded internal read-model composition of M7.98 over recent durable T+0-eligible completed observation timelines.
- Validates limits before persistence access, derives each exact variability path once, and preserves total versus transition-bearing sample semantics.
- Added no route, provider request, persistence, annualization, score, alert, signal, strategy simulation, or trading behavior.
- 870 unit tests across 96 suites and all 66 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-21 — M7.98 listing checkpoint price variability cohort calculation completed

- Added a pure exact-decimal cohort calculator for median per-path average and maximum absolute consecutive returns.
- Kept total paths and transition-bearing paths as separate samples with explicit nullable empty-sample semantics.
- Added strict identity, schedule, duration, return, and magnitude consistency validation without annualization or scoring.
- 867 unit tests across 96 suites and all 66 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-21 — M7.97 durable listing checkpoint price variability API completed

- Added local read-only `GET /new-listings/:provider/:symbol/variability` for one durable detection.
- Preserved exact transition values and canonical identity validation with explicit `400`, `404`, and missing-T+0 `503` behavior.
- Updated the root API route table; the endpoint cannot collect, persist a projection, aggregate, annualize, score, alert, signal, simulate, or trade.
- 862 unit tests across 95 suites and all 66 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-21 — M7.96 durable listing checkpoint price variability composition completed

- Added on-demand variability composition from one detection's durable completed observation timeline.
- Preserved existing detection-not-found and missing-T+0 semantics through the shared read-model boundary.
- Added no route, provider request, projection persistence, cohort aggregate, annualization, score, alert, signal, strategy simulation, or trading behavior.
- 858 unit tests across 95 suites and all 65 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-21 — M7.95 observed listing checkpoint price variability completed

- Added a pure exact-decimal calculator for consecutive checkpoint simple returns, average absolute return, and the earliest maximum absolute transition.
- Preserved canonical schedule events and actual transition duration, with explicit T+0-only and missing-baseline semantics.
- Kept the result descriptive and non-annualized; added no repository access, route, persistence, score, alert, signal, strategy simulation, or trading behavior.
- 855 unit tests across 95 suites and all 65 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-21 — M7.94 durable listing price-path cohort API completed

- Added local read-only `GET /new-listings/price-path` with optional bounded `limit` and Binance provider input.
- Exposes total path and positive-drawdown samples with exact nullable extrema timing, drawdown-rate, and drawdown-duration medians.
- Updated the root API route table; the endpoint cannot collect, persist a projection, score, alert, signal, simulate a strategy, or trade.
- 851 unit tests across 94 suites and all 65 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-21 — M7.93 durable listing price-path cohort composition completed

- Added bounded internal read-model composition of M7.92 over recent durable T+0-eligible completed observation timelines.
- Derives each exact price path once per request, validates limits before persistence access, and preserves explicit empty-cohort semantics.
- Added no route, provider request, persistence, score, alert, signal, strategy simulation, or trading behavior.
- 846 unit tests across 94 suites and all 64 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-21 — M7.92 listing price-path cohort calculation completed

- Added a pure cohort calculator for median observed-high and observed-low timing plus positive maximum-drawdown rate and duration.
- Kept total trajectory and positive-drawdown samples independent, with explicit nullable empty-sample semantics and exact-decimal medians.
- Added strict identity, schedule, causal-order, positive-price, and drawdown-reconciliation validation without comparing absolute prices across assets.
- Added no repository access, durable composition, route, persistence, score, alert, signal, strategy simulation, or trading behavior.
- 843 unit tests across 94 suites and all 64 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-21 — M7.91 durable listing price-path statistics API completed

- Added local read-only `GET /new-listings/:provider/:symbol/price-path` for exact observed checkpoint-price extrema and maximum causal drawdown.
- Reused canonical identity validation with `400` for invalid input, `404` for an unknown detection, and `503` until T+0 is complete.
- Updated the root API route table; the endpoint cannot collect data, persist a projection, aggregate a cohort, score, alert, signal, simulate a strategy, or trade.
- 838 unit tests across 93 suites and all 64 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-21 — M7.90 durable listing price-path statistics composition completed

- Added on-demand internal read-model composition of M7.89 price-path statistics from a detection's durable completed checkpoint timeline.
- Preserved explicit not-found handling for unknown identities and nullable unavailable semantics for known detections without T+0.
- Added no route, provider request, persistence, cohort aggregate, score, alert, signal, strategy simulation, or trading behavior.
- 834 unit tests across 93 suites and all 63 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-21 — M7.89 observed listing price-path statistics completed

- Added a pure exact-decimal calculator for observed checkpoint-price high, low, and maximum causal peak-to-trough drawdown.
- Preserves the checkpoint events for every extremum, deterministic earliest-event tie handling, explicit zero drawdown, and unavailable-without-T+0 semantics.
- Added no durable composition, route, score, alert, signal, strategy simulation, or trading behavior.
- 831 unit tests across 93 suites and all 63 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-21 — M7.88 durable top-of-book spread widening timing cohort API completed

- Added local read-only `GET /new-listings/top-of-book/spread/classification/timing` with bounded provider/limit input and mandatory positive `wideningBasisPoints`.
- Exposes the independent observed-widening sample size and nullable median T+0-to-first-widening milliseconds calculated on demand from durable books.
- Updated the root API route table; the endpoint cannot collect data, persist a projection, score, alert, signal, or trade.
- 827 unit tests across 92 suites and all 63 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-21 — M7.87 durable top-of-book spread widening timing cohort completed

- Composed median T+0-to-first-widening timing over the shared bounded recent durable classification cohort.
- Reused the existing limit, threshold, T+0 eligibility, spread-evolution, and classification pipeline before applying M7.86.
- Added no route, derived persistence, score, alert, signal, or trading behavior.
- 822 unit tests across 92 suites and all 62 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-21 — M7.86 top-of-book spread widening timing cohort calculation completed

- Added a pure cohort calculator for median T+0-to-first-observed-widening duration under one explicit threshold.
- Publishes an independent widening sample size and null median when no widening qualified.
- Validates canonical checkpoint metadata and causal event ordering without adding repository, HTTP, persistence, scoring, alerting, signaling, or trading behavior.
- 818 unit tests across 92 suites and all 62 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-21 — M7.85 durable top-of-book spread widening magnitude cohort API completed

- Added local read-only `GET /new-listings/top-of-book/spread/classification/magnitudes` with bounded provider/limit input and mandatory positive `wideningBasisPoints`.
- Exposes the independent observed-widening sample size and nullable exact median calculated on demand from durable books.
- Updated the root API route table; the endpoint cannot collect data, persist a projection, score, alert, signal, or trade.
- 814 unit tests across 91 suites and all 62 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.84 durable top-of-book spread widening magnitude cohort completed

- Composed median maximum-widening magnitude over the bounded recent durable classification cohort.
- Centralized durable spread-classification loading so count and magnitude statistics share validation and eligibility rules.
- Added no route, derived persistence, timing statistic, score, alert, signal, or trading behavior.
- 809 unit tests across 91 suites and all 61 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.83 top-of-book spread widening magnitude cohort calculation completed

- Added a pure exact-decimal cohort calculator for median maximum widening among threshold-qualified classifications.
- Publishes an independent observed-widening sample size and null median when no widening qualified.
- Rejects invalid or status-inconsistent maximum magnitudes without adding database or HTTP behavior.
- 805 unit tests across 91 suites and all 61 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.82 durable top-of-book spread widening classification cohort API completed

- Added local read-only `GET /new-listings/top-of-book/spread/classification` with bounded provider/limit input and mandatory positive `wideningBasisPoints`.
- Preserves explicit classification denominators, counts, exact observed rate, and empty-sample semantics without derived persistence.
- Updated the root API route table; the endpoint cannot collect data, score, alert, signal, or trade.
- 801 unit tests across 90 suites and all 61 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.81 durable top-of-book spread widening classification cohort completed

- Composed exact spread evolution, explicit-threshold classification, and cohort statistics over the bounded recent durable top-of-book cohort.
- Validates the limit and threshold before repository access and excludes timelines without a usable T+0 book.
- Added no route, derived persistence, score, alert, signal, or trading behavior.
- 796 unit tests across 90 suites and all 60 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.80 top-of-book spread widening classification cohort calculation completed

- Added a pure exact-decimal cohort calculator for explicit-threshold spread-widening classifications.
- Reports observed/not-observed counts, total denominator, and exact observed rate with explicit empty-sample semantics.
- Rejects duplicate symbols, mixed thresholds, and incoherent classifications without adding database or HTTP behavior.
- 792 unit tests across 90 suites and all 60 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.79 durable top-of-book spread widening classification API completed

- Added local read-only `GET /new-listings/:provider/:symbol/top-of-book/spread/classification` with a mandatory positive `wideningBasisPoints` threshold.
- Preserved `400` malformed-input, `404` unknown-detection, and `503` missing-T+0 semantics without derived persistence.
- Updated the root API route table; the endpoint cannot collect data, score, alert, signal, or trade.
- 789 unit tests across 89 suites and all 60 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.78 durable top-of-book spread widening classification completed

- Composed exact spread evolution and explicit-threshold widening classification over one durable detected-symbol book timeline.
- Validates thresholds before persistence access and preserves unknown-detection versus missing-T+0 semantics.
- Added no route, derived persistence, cohort statistic, score, alert, signal, or trading behavior.
- 783 unit tests across 89 suites and all 59 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.77 explicit top-of-book spread widening classification completed

- Added a pure exact-decimal classifier with a mandatory positive spread-widening threshold.
- Reports the first qualifying checkpoint, maximum observed widening, evaluation horizon, and explicit observed/not-observed status.
- Added no durable composition, route, persistence, score, alert, signal, or trading behavior.
- 779 unit tests across 89 suites and all 59 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.76 durable top-of-book spread evolution cohort API completed

- Added local read-only `GET /new-listings/top-of-book/spread/evolution` with optional validated provider and limit.
- Preserved exact checkpoint averages and independent sample coverage without derived persistence.
- Updated the root API route table; the endpoint cannot collect data, score, alert, signal, or trade.
- 775 unit tests across 88 suites and all 59 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.75 durable top-of-book spread evolution cohort completed

- Composed exact per-detection spread evolution over the bounded recent durable top-of-book cohort.
- Validated limits before repository access and excluded timelines without a usable stored T+0 book.
- Added no route, provider request, derived persistence, score, alert, signal, or trading behavior.
- 770 unit tests across 88 suites and all 58 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.74 top-of-book spread evolution cohort calculation completed

- Added a pure exact-decimal calculator for checkpoint spread-evolution cohort averages.
- Preserved independent checkpoint sample coverage and rejected duplicate symbols or incoherent baseline-relative values.
- Added no database query, route, persistence, score, alert, signal, or trading behavior.
- 766 unit tests across 88 suites and all 58 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.73 durable top-of-book spread evolution API completed

- Added local read-only `GET /new-listings/:provider/:symbol/top-of-book/spread/evolution`.
- Preserved strict identity validation, unknown-detection `404`, and missing-T+0 `503` semantics.
- Updated the root API route table; the endpoint cannot collect data, persist derived results, score, signal, or trade.
- 762 unit tests across 87 suites and all 58 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.72 durable top-of-book spread evolution completed

- Added an internal read-model operation that derives exact T+0-relative spread changes from one durable stored-book timeline.
- Preserved unknown-detection and missing-T+0 semantics without persisting the derived projection.
- Kept HTTP exposure and cohort statistics separate; no provider request, score, signal, or trading path was added.
- 756 unit tests across 87 suites and all 57 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.71 exact top-of-book spread evolution completed

- Added a pure exact-decimal calculator for checkpoint spread-basis-point changes relative to T+0.
- Defined positive changes as spread widening and negative changes as tightening, including a valid zero-spread baseline.
- Kept durable composition and HTTP exposure separate; no persistence, provider request, score, signal, or trading path was added.
- 753 unit tests across 87 suites and all 57 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.70 durable imbalance evolution cohort API completed

- Added local read-only `GET /new-listings/top-of-book/imbalance/evolution` for bounded durable imbalance-change averages.
- Reused strict optional provider and 1–100 limit validation and retained explicit analytical eligibility and checkpoint coverage.
- Updated the root API route table; the endpoint cannot collect data, persist derived results, score, signal, or trade.
- 749 unit tests across 86 suites and all 57 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.69 durable imbalance evolution cohort loading completed

- Composed exact imbalance-evolution aggregation over the existing bounded durable T+0-book cohort.
- Excluded zero-notional T+0 books that cannot establish an analytical baseline while preserving later checkpoint unavailability.
- Kept the operation internal and on demand with no new query, route, persistence, provider request, score, signal, or trading path.
- 744 unit tests across 86 suites and all 56 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.68 top-of-book imbalance evolution cohort completed

- Added a pure exact-decimal cohort calculator for average T+0-relative imbalance change by checkpoint.
- Preserved independent total, available, and unavailable change coverage and rejected incoherent derived inputs.
- Kept durable loading and HTTP exposure separate; no provider request, persistence, score, signal, or trading path was added.
- 740 unit tests across 86 suites and all 56 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.67 durable top-of-book imbalance evolution API completed

- Added local read-only `GET /new-listings/:provider/:symbol/top-of-book/imbalance/evolution`.
- Reused strict identity validation, unknown-detection `404`, and returned `503` until an available T+0 imbalance baseline exists.
- Preserved later zero-notional points as explicit null values without collection, derived persistence, score, alert, signal, or trade.
- 736 unit tests across 85 suites and all 56 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.66 durable top-of-book imbalance evolution completed

- Added an internal read-model operation that derives exact T+0-relative imbalance evolution from one detected symbol's stored books.
- Reused durable detection existence checks, canonical repository reads, and explicit analytical unavailability when no usable baseline exists.
- Kept evolution on demand without derived persistence, a route, score, alert, signal, provider request, or trade.
- 730 unit tests across 85 suites and all 55 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.65 exact top-of-book imbalance evolution completed

- Added a pure exact-decimal calculator for checkpoint imbalance changes relative to an explicit available T+0 baseline.
- Normalized valid timelines into canonical schedule order and preserved unavailable later imbalance as `null` rather than filling it.
- Returned unavailable when T+0 is absent or has zero displayed notional, without adding durable loading, a route, score, alert, signal, or trade.
- 727 unit tests across 85 suites and all 55 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.64 top-of-book imbalance cohort API completed

- Added local read-only `GET /new-listings/top-of-book/imbalance` for bounded durable checkpoint imbalance statistics.
- Reused optional `provider=binance` and `limit=1..100` validation with defaults of Binance and 50 detections.
- Preserved separate stored-book, calculable, and unavailable coverage and documented that imbalance is not pressure or a signal.
- 722 unit tests across 84 suites and all 55 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.63 durable top-of-book imbalance cohort loading completed

- Added an internal read-model operation that composes exact imbalance statistics over the bounded durable T+0-book-eligible cohort.
- Reused the existing newest-first PostgreSQL selection, 1–100 limit validation, and explicit empty-cohort result.
- Kept calculation on demand without adding a route, derived persistence, provider request, score, alert, signal, or trade.
- 717 unit tests across 84 suites and all 54 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.62 top-of-book imbalance cohort calculation completed

- Added a pure exact-decimal cohort calculator for average displayed level-one imbalance by observation checkpoint.
- Reported total book coverage, calculable imbalance coverage, and zero-denominator unavailability independently.
- Kept zero displayed books out of the average denominator instead of fabricating neutral imbalance.
- 713 unit tests across 84 suites and all 54 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.61 durable top-of-book imbalance API completed

- Added local read-only `GET /new-listings/:provider/:symbol/top-of-book/imbalance` for one detected symbol's derived durable timeline.
- Reused strict detection identity validation, unknown-detection `404`, and explicit empty-timeline semantics.
- Kept imbalance descriptive and on demand; the route cannot trigger provider collection or persist derived values.
- 709 unit tests across 83 suites and all 54 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.60 durable top-of-book imbalance composition completed

- Added an internal read-model operation that derives exact imbalance across one detected symbol's stored top-of-book timeline.
- Reused the durable detection existence check, canonical repository ordering, and explicit empty-timeline semantics.
- Preserved checkpoint label, offset, and target time without persisting derived notionals or imbalance rates.
- 704 unit tests across 83 suites and all 53 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.59 exact top-of-book imbalance completed

- Added a pure exact-decimal calculator for displayed bid and ask quote notionals and their normalized level-one imbalance rate.
- Defined exact `-1` and `1` one-sided boundaries and explicit `null` imbalance when both displayed quantities are zero.
- Kept the metric internal and descriptive; it is not market pressure, depth, fill capacity, a score, or a signal.
- 703 unit tests across 83 suites and all 53 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.58 top-of-book cohort API completed

- Added local read-only `GET /new-listings/top-of-book` for the bounded durable top-of-book cohort.
- Reused the shared optional `provider=binance` and `limit=1..100` validation with defaults of Binance and 50 detections.
- Documented that displayed best-level quote notionals are neither depth nor guaranteed executable liquidity.
- 698 unit tests across 82 suites and all 53 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.57 durable top-of-book cohort loading completed

- Added a bounded newest-detection query requiring stored T+0 top-of-book eligibility before loading canonical book timelines.
- Composed those durable timelines through the M7.56 exact cohort calculator in the internal detection read model.
- Added explicit empty-cohort, invalid-limit, and unavailable-repository behavior without adding an HTTP route.
- 693 unit tests across 82 suites and all 52 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.56 top-of-book cohort calculation completed

- Added a pure exact-decimal cohort calculator for average spread basis points and displayed bid/ask quote notionals at each observation checkpoint.
- Preserved independent checkpoint samples and canonical schedule order while rejecting empty member timelines, duplicate symbols, duplicate labels, and invalid books.
- Kept level-one displayed notional explicitly separate from depth or guaranteed executable liquidity; no database query or route was added.
- 688 unit tests across 82 suites and all 52 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.55 opt-in checkpoint top-of-book collection completed

- Composed the existing public rolling-ticker and top-of-book loaders in the production checkpoint processor.
- Changed the checkpoint cycle to select the lease-safe atomic completion path for every successful combined sample.
- Either public-provider failure remains isolated per checkpoint and leaves its lease recoverable; the lifecycle worker remains disabled by default.
- 685 unit tests across 81 suites and all 52 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.54 atomic checkpoint top-of-book completion completed

- Added a validated completion command carrying both the rolling market observation and matching top-of-book snapshot.
- Added one PostgreSQL transaction that verifies active lease ownership, completes the checkpoint, and inserts its immutable book together.
- Lost leases return `false` without inserting a book; any insertion failure rolls back checkpoint completion and market-observation fields.
- Kept the existing worker and processor on their prior completion path pending separate provider-composition work.
- 684 unit tests across 81 suites and all 52 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.53 durable top-of-book timeline API completed

- Added local read-only `GET /new-listings/:provider/:symbol/top-of-book` for the canonical durable checkpoint book timeline.
- Reused durable detection identity semantics: malformed input returns `400`, unknown detections return `404`, and detections without books return `[]`.
- Standardized detection timeline symbols to the persisted 1–30-character canonical provider-symbol limit.
- Kept the route observational: it never triggers provider loading, worker execution, persistence, scoring, alerts, signals, or trading.
- 680 unit tests across 80 suites and all 52 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.52 durable top-of-book timeline loading completed

- Added provider-neutral loading of all stored top-of-book checkpoints for one explicit detection identity.
- Returned an explicit empty timeline or canonically ordered checkpoint records with schedule metadata and exact book fields.
- Added fail-fast request validation and strict validation of persisted schedule and observation data.
- Kept loading internal, with no worker integration, route, scoring, alerts, signals, or trading.
- 673 unit tests across 80 suites and all 52 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.51 durable checkpoint top-of-book storage completed

- Added an optional one-to-one top-of-book record keyed to an existing listing observation checkpoint with cascade ownership.
- Preserved update IDs and decimal strings exactly as text while enforcing positive prices, non-negative quantities, non-crossed books, and immutable checkpoint identity in PostgreSQL.
- Added a provider-neutral repository and Prisma implementation with fail-fast identity validation and create-only storage.
- Kept the repository disconnected from the checkpoint worker, lifecycle collection, routes, scoring, alerts, signals, and trading.
- 670 unit tests across 80 suites and all 52 isolated E2E tests passed together with all 15 migrations, build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.50 listing top-of-book snapshot composition completed

- Added an internal service that loads one explicit provider-neutral top-of-book snapshot and immediately derives its exact spread metrics.
- Preserved caller cancellation and provider errors without calculating from missing data, and registered the service through explicit dependency injection.
- Kept invocation manual and internal: no lifecycle collection, persistence, route, scoring, alerts, signals, or trading was added.
- 668 unit tests across 79 suites and all 52 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.49 listing top-of-book provider registration completed

- Registered the public Binance top-of-book adapter behind its provider-neutral token in the new-listings module.
- Reused the validated `BINANCE_REST_BASE_URL` configuration and added focused registration/factory coverage.
- Kept the provider inactive: no consumer, checkpoint persistence, worker invocation, route, scoring, alerts, signals, or trading was added.
- 666 unit tests across 78 suites and all 52 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.48 Binance listing top-of-book snapshot completed

- Added an inactive unauthenticated Binance Spot depth-snapshot adapter for one explicit listing symbol.
- Preserved `lastUpdateId`, normalized only the best bid/ask and exact quantities, and deliberately discarded deeper returned levels.
- Added timeout, composed cancellation, fail-fast request validation, safe status errors, and strict successful-payload validation.
- Kept module wiring, checkpoint persistence, routes, scoring, alerts, signals, and trading outside this increment.
- 665 unit tests across 77 suites and all 52 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.47 listing top-of-book spread completed

- Added a pure exact-decimal calculator for absolute spread, midpoint, and spread basis points from validated listing top-of-book observations.
- Preserved provider, symbol, update ID, best prices, displayed quantities, and receive time in the derived result.
- Covered ordinary, fractional, locked, and invalid crossed-book behavior without native floating-point arithmetic.
- Kept provider loading, persistence, worker integration, routes, scoring, alerts, signals, and trading outside this increment.
- 648 unit tests across 76 suites and all 52 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.46 listing top-of-book observation contract completed

- Added a provider-neutral arbitrary-symbol top-of-book observation and cancellable loader boundary.
- Preserved exact bid/ask prices and displayed quantities with strict provider, symbol, update-ID, book-coherence, and receive-time validation.
- Kept the existing BTC/USDT streaming contract unchanged and accepted locked books or zero displayed quantities without execution claims.
- Kept provider loading, spread calculation, persistence, worker integration, routes, scoring, alerts, signals, and trading outside this increment.
- 644 unit tests across 75 suites and all 52 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-20 — M7.45 checkpoint market activity API completed

- Added local read-only `GET /new-listings/activity` over the bounded durable activity cohort.
- Retained optional bounded limit and Binance provider input with fail-fast query validation.
- Exposed exact rolling-window activity averages and synchronized the root API route table without claiming executable liquidity.
- Kept derived persistence, order-book modeling, scoring, alerts, signals, and trading outside this increment.
- 633 unit tests across 74 suites and all 52 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-19 — M7.44 durable checkpoint market activity loading completed

- Added internal bounded durable market-activity calculation over recent detections with completed `T+0` observations.
- Reused the existing durable cohort selection while retaining independent later-checkpoint sample coverage.
- Added populated, empty, and fail-fast invalid-limit read-model coverage.
- Kept HTTP exposure, derived persistence, order-book liquidity claims, scoring, alerts, signals, and trading outside this increment.
- 628 unit tests across 74 suites and all 52 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-19 — M7.43 checkpoint market activity cohort completed

- Added a pure cohort calculator for exact average rolling-24-hour base volume, quote volume, and trade count by canonical checkpoint.
- Preserved unequal checkpoint samples and explicit empty cohorts while rejecting duplicate detections and incoherent timelines.
- Classified the output as descriptive market activity rather than order-book or executable liquidity.
- Kept durable loading, HTTP exposure, persistence, scoring, alerts, signals, and trading outside this increment.
- 625 unit tests across 74 suites and all 52 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-19 — M7.42 pattern timing API completed

- Added local read-only `GET /new-listings/classification/timing` over the bounded durable timing cohort.
- Required explicit positive pump and correction thresholds while retaining optional bounded limit and Binance provider input.
- Preserved independent event samples and synchronized the root API route table.
- Kept default hypotheses, derived persistence, scoring, alerts, signals, and trading outside this increment.
- 622 unit tests across 73 suites and all 52 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-19 — M7.41 durable pattern timing loading completed

- Added internal bounded durable pattern-timing calculation over recent detections with completed `T+0` observations.
- Reused the shared explicit-threshold durable classification pipeline used by frequency and magnitude statistics.
- Added populated, empty, and fail-fast invalid-input read-model coverage.
- Kept HTTP exposure, persistence, scoring, alerts, signals, and trading outside this increment.
- 615 unit tests across 73 suites and all 52 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-19 — M7.40 pattern timing medians completed

- Added pure median T+0-to-pump and peak-to-correction duration statistics over classified listing cohorts.
- Kept independent pump and correction timing samples with explicit null empty results.
- Added odd/even median coverage plus canonical checkpoint and causal event-order validation.
- Kept durable loading, HTTP exposure, persistence, scoring, alerts, signals, and trading outside this increment.
- 612 unit tests across 73 suites and all 52 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-19 — M7.39 pattern magnitude API completed

- Added local read-only `GET /new-listings/classification/magnitudes` over the bounded durable magnitude cohort.
- Required explicit positive pump and correction thresholds while retaining optional bounded limit and Binance provider input.
- Preserved independent event samples and synchronized the root API route table.
- Kept default hypotheses, derived persistence, timing statistics, scoring, alerts, signals, and trading outside this increment.
- 608 unit tests across 72 suites and all 52 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-19 — M7.38 durable pattern magnitude loading completed

- Added internal bounded durable pattern-magnitude calculation over recent detections with completed `T+0` observations.
- Shared the validated durable classification composition between frequency and magnitude aggregates.
- Added populated, empty, and fail-fast invalid-input read-model coverage.
- Kept HTTP exposure, default thresholds, derived persistence, scoring, alerts, signals, and trading outside this increment.
- 601 unit tests across 72 suites and all 51 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-19 — M7.37 pattern magnitude medians completed

- Added pure exact-decimal median peak-return and correction-from-peak statistics over classified listing cohorts.
- Kept independent pump and correction sample sizes and explicit null results when an event sample is absent.
- Added odd/even median coverage and rejected observed magnitudes that contradict their classification thresholds.
- Kept durable loading, HTTP exposure, persistence, scoring, alerts, signals, and trading outside this increment.
- 598 unit tests across 72 suites and all 51 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-19 — M7.36 pattern cohort API completed

- Added local read-only `GET /new-listings/classification` over the bounded durable pattern cohort.
- Required explicit positive pump and correction thresholds while retaining optional bounded limit and Binance provider input.
- Added controller and route-level validation coverage and synchronized the root API route table.
- Kept default hypotheses, derived persistence, scoring, alerts, signals, and trading outside this increment.
- 594 unit tests across 71 suites and all 51 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-19 — M7.35 durable pattern cohort loading completed

- Added internal bounded durable pattern-cohort calculation over recent detections with completed `T+0` observations.
- Reused the existing durable cohort query and exact performance/classification pipeline without adding schema or provider work.
- Added fail-fast limit and threshold validation plus focused empty and populated cohort coverage.
- Kept HTTP exposure, default thresholds, persistence, scoring, alerts, signals, and trading outside this increment.
- 587 unit tests across 71 suites and all 50 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-19 — M7.34 pattern cohort statistics completed

- Added pure aggregation of same-threshold listing classifications into explicit no-pump, pump, and correction counts.
- Added exact pump and correction rates over the full cohort plus correction rate among observed pumps, with null undefined denominators.
- Rejected duplicate symbols, mixed thresholds, and incoherent classification states while keeping loading, HTTP, persistence, scoring, alerts, signals, and trading out of scope.
- 584 unit tests across 71 suites and all 50 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-19 — M7.33 pattern classification API completed

- Added local read-only `GET /new-listings/:provider/:symbol/classification` with mandatory explicit pump and correction thresholds.
- Shared exact threshold validation before durable loading and preserved `400`, `404`, and `503` semantics.
- Updated the root API route table and kept defaults, derived persistence, cohort classification statistics, scoring, alerts, signals, and trading out of scope.
- 581 unit tests across 70 suites and all 50 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-19 — M7.32 durable pattern classification completed

- Composed durable completed observation loading, exact T+0 performance, and explicit-threshold pattern classification in the internal read model.
- Preserved explicit unknown-detection errors and unavailable classification until a completed T+0 exists.
- Kept derived persistence, HTTP exposure, threshold defaults, cohort classification statistics, scoring, alerts, signals, and trading out of scope.
- 575 unit tests across 70 suites and all 49 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-19 — M7.31 explicit pump/correction classification completed

- Added a pure exact-decimal classifier with explicit pump-return and correction-from-peak thresholds.
- Added observed-only statuses, first-pump capture, running post-pump peak tracking, and first qualifying correction capture.
- Kept threshold defaults, durable loading, HTTP exposure, persistence, scoring, alerts, signals, and trading out of scope.
- 573 unit tests across 70 suites and all 49 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-19 — M7.30 cohort performance API completed

- Added local read-only `GET /new-listings/performance` over the bounded durable cohort calculation.
- Added strict optional `limit=1..100` and `provider=binance` validation with safe defaults and explicit empty-cohort output.
- Updated the root API route table and kept derived persistence, classification, alerts, signals, and trading out of scope.
- 569 unit tests across 69 suites and all 49 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-19 — M7.29 durable cohort loading completed

- Added a bounded PostgreSQL query for recent durable detections with completed T+0 baselines and their completed observation timelines.
- Composed durable timelines through the existing exact per-detection and cohort calculators with strict 1–100 input bounds.
- Kept HTTP exposure, derived persistence, classification, alerts, signals, and trading out of scope.
- 564 unit tests across 69 suites and all 48 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-19 — M7.28 checkpoint cohort performance completed

- Added a pure deterministic cross-detection calculator grouping available T+0-relative returns by checkpoint.
- Added per-checkpoint sample size, positive/negative/flat counts, and exact-decimal average return without forward-filling incomplete timelines.
- Kept cohort loading, HTTP exposure, persistence, classification, alerts, signals, and trading out of scope.
- 562 unit tests across 69 suites and all 48 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-19 — M7.27 price-performance API completed

- Added a local read-only endpoint that calculates one durable detection's exact T+0-relative price performance on demand.
- Preserved explicit `400` invalid identity, `404` unknown detection, and `503` missing-baseline semantics.
- Updated the root API route table and kept derived persistence, aggregate analysis, classification, alerts, signals, and trading out of scope.
- 559 unit tests across 68 suites and all 48 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-19 — M7.26 exact T+0 price performance completed

- Added a pure deterministic calculator for checkpoint price changes and fractional returns relative to the explicit `T+0` baseline.
- Used isolated 40-digit decimal arithmetic and preserved every derived value as an exact decimal string.
- Added strict timeline identity, label, schedule, and time validation while keeping HTTP exposure, persistence, classification, alerts, signals, and trading out of scope.
- 554 unit tests across 68 suites and all 47 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-19 — M7.25 completed observation timeline API

- Added a local read-only route for one detected symbol's completed checkpoint observations in chronological target order.
- Preserved exact decimal values, excluded incomplete lease state, and distinguished invalid identity, unknown detection, and a valid empty timeline.
- Added application, controller, repository integration, and HTTP route coverage without introducing analysis, alerts, signals, or trading.
- 551 unit tests across 67 suites and all 47 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-19 — M7.24 opt-in checkpoint worker lifecycle completed

- Added a completion-relative lifecycle worker that prevents overlapping cycles, survives cycle-level failures, and shuts down cleanly.
- Added startup validation and documentation for `NEW_LISTINGS_CHECKPOINT_WORKER_ENABLED`, defaulting to `false` so upgrades remain inactive until explicitly enabled.
- Preserved public read-only collection and introduced no trading or order path.

## 2026-09-19 — M7.23 provider-backed checkpoint processor completed

- Added an injected production processor that maps each claimed checkpoint to the provider-neutral public market-observation request.
- Preserved cycle-owned completion and propagated provider failures to existing per-item isolation and lease-expiry recovery.
- Kept background scheduling inactive; no checkpoint is claimed automatically.
- 544 unit tests across 67 suites and all 46 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-19 — M7.22 durable checkpoint market observation completed

- Persisted each validated market observation atomically with ownership-safe checkpoint completion.
- Added database constraints requiring a complete coherent observation on completed checkpoints and reopened legacy lifecycle-only completions without fabricating market data.
- Passed observations through the deterministic cycle while keeping the production processor and timer inactive.
- 538 unit tests across 65 suites and all 46 isolated E2E tests passed together with build, lint, formatting, Prisma generation/migration, Compose, and diff validation.

## 2026-09-19 — M7.21 public Binance market observation adapter completed

- Added an unauthenticated single-symbol Binance Spot rolling 24-hour ticker client behind the M7.20 provider-neutral contract.
- Added strict request, response-identity, payload, timestamp, trade-count, and decimal validation with a ten-second timeout and caller cancellation.
- Registered the adapter for dependency injection without activating checkpoint processing, persistence, or background scheduling.

## 2026-09-14 — M7.20 exact checkpoint market observation completed

- Added a provider-neutral checkpoint market-observation and loader contract for canonical symbols, exact-string prices and volumes, trade counts, provider-window times, and local receive time.
- Added strict pure validation without floating-point conversion or cross-clock assumptions.
- Kept provider loading, observation persistence, production checkpoint processing, and background scheduling inactive and out of scope.
- 515 unit tests across 64 suites and all 46 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-14 — M7.19 deterministic single checkpoint cycle completed

- Added a provider-neutral single-cycle processor contract and orchestration service.
- Each cycle claims one bounded batch, processes it sequentially, completes successes with persisted ownership, and isolates per-item failures for lease-expiry recovery.
- Added explicit claimed/completed/failed/lost-lease results; no timer, production processor, provider request, or live claim was activated.
- 487 unit tests across 63 suites and all 46 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-14 — M7.18 bounded checkpoint-worker configuration completed

- Added startup-validated interval, batch-size, and lease-duration configuration for the future checkpoint worker.
- Added one injected worker-options contract with conservative defaults and strict upper/lower bounds.
- Updated `.env.example`; no timer, automatic claim, provider request, or market sample was activated.
- 484 unit tests and all 46 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-14 — M7.17 ownership-safe checkpoint completion completed

- Added durable terminal checkpoint completion constrained to the recorded active lease interval.
- Completion now requires matching provider, symbol, label, and claim token and is idempotently rejected after the first successful transition.
- Completed checkpoints are excluded from bounded due reads, new claims, and expired-lease recovery.
- Applied the migration locally; 476 unit tests and all 46 isolated E2E tests passed together with build, lint, formatting, Compose, and diff validation.

## 2026-09-14 — M7.16 atomic checkpoint leases completed

- Added durable checkpoint claim token, claim time, and expiry fields with database consistency enforcement.
- Added bounded atomic claims using PostgreSQL `FOR UPDATE SKIP LOCKED`; active leases are excluded and expired work is reclaimable.
- Added application validation and deterministic claimed-batch ordering without introducing a worker or provider request.
- Applied the migration locally; 470 unit tests and all 46 isolated E2E tests passed together with build, lint, and formatting checks.

## 2026-09-14 — M7.15 validated due-checkpoint boundary completed

- Added an internal application service for due-checkpoint reads.
- Enforced a valid reference time and strict integer batch limit from 1 through 100 before database access.
- Added no route, worker, claim, retry, provider request, or market sample.
- 464 unit tests and all 45 isolated E2E tests passed; build, lint, formatting, Compose, and diff validation also passed.

## 2026-09-14 — M6 closure wording clarified

- Clarified that M6.1–M6.32 fully satisfy the accepted M6 scope.
- Reclassified the previously listed advanced capabilities as optional post-M6 enhancements requiring separately planned milestones, not unfinished M6 work.

## 2026-09-14 — M7.14 bounded due-checkpoint read completed

- Added a provider-neutral internal read for checkpoints due by an explicit instant.
- Bounded and deterministically ordered results using the target-time index.
- Added no claiming, worker, retry, provider request, market sample, or financial behavior.
- 457 unit tests and all 45 isolated E2E tests passed; build, lint, formatting, Compose, and diff validation also passed.

## 2026-09-14 — M7.13 durable observation checkpoints completed

- Added an indexed PostgreSQL checkpoint table related to durable detected symbols.
- Created all nine observation targets atomically and idempotently with each new detection.
- Backfilled only existing rows with legitimate detection timestamps; no worker or market sampling was introduced.
- 457 unit tests and all 45 isolated E2E tests passed; build, lint, formatting, Compose, and diff validation also passed.

## 2026-09-14 — M7.12 deterministic observation schedule completed

- Defined the nine planned detection-relative research checkpoints as a provider-neutral domain contract.
- Added a pure validated schedule builder with independent UTC target instants and no mutable-date aliasing.
- Added no persistence, scheduler, provider request, market tracking, alert, signal, or financial behavior.
- 457 unit tests and all 45 isolated E2E tests passed; build, lint, formatting, Compose, and diff validation also passed.

## 2026-09-14 — M7.11 current-state sample composition completed

- Extended the filtered detection summary with deterministic counts grouped by current provider status and Spot-trading availability.
- Read the aggregate and both breakdowns in one PostgreSQL transaction for a consistent snapshot during concurrent catalog refreshes.
- Kept the analysis limited to already persisted current state, without historical-state inference or market tracking.
- 454 unit tests and all 45 isolated E2E tests passed; build, lint, formatting, Compose, and diff validation also passed.

## 2026-09-14 — M7.10 filtered detection summary completed

- Added read-only `GET /new-listings/summary` over the complete matching durable detection sample.
- Reused strict time, provider, status, and Spot-availability filters without pagination semantics.
- Returned an exact count and explicit nullable earliest/latest application detection times without adding market tracking or financial behavior.
- 454 unit tests and all 45 isolated E2E tests passed; build, lint, formatting, Compose, and diff validation also passed.

## 2026-09-14 — M7.9 current provider-state filters completed

- Added strict optional provider, current status, and Spot-availability filters to `GET /new-listings`.
- Composed state filters with the existing limit, detection-time window, and stable cursor query.
- Rejected cursors that do not match the active filters rather than silently changing pagination semantics.
- Isolated all public market-data and symbol-catalog providers in the application E2E harness so controlled paper-market assertions cannot be overwritten by live Binance events.
- 451 unit tests and all 43 isolated E2E tests passed; build, lint, formatting, Compose, and diff validation also passed.

## 2026-09-14 — M7.8 stable detection cursor completed

- Added optional canonical `provider:symbol` cursor pagination to `GET /new-listings`.
- Resolved cursors server-side and continued after the complete immutable detection sort position without offset drift.
- Rejected malformed, missing, baseline-only, and time-filter-incompatible cursors explicitly.
- 445 unit tests and all 43 isolated E2E tests passed; build, lint, formatting, Compose, and diff validation also passed.

## 2026-09-14 — Risk decimal startup validation fixed

- Fixed startup validation so strictly positive fractional risk limits such as the default `RISK_MAX_BTC_POSITION_QUANTITY=0.01` are accepted.
- Kept zero, negative, non-canonical, over-precision, and over-scale values rejected.
- Added regression coverage for all affected positive decimal risk-limit settings.

## 2026-09-14 — M7.7 detection-time filters completed

- Added optional inclusive `detectedFrom` and `detectedTo` filters to `GET /new-listings`.
- Required canonical millisecond-precision UTC timestamps and rejected malformed or inverted ranges before database access.
- Applied the filters within the existing bounded deterministic detection query without a migration or mutation path.
- 429 unit tests and all 42 isolated E2E tests passed; build, lint, formatting, Compose, and diff validation also passed.

## 2026-09-14 — M7.6 bounded detection API completed

- Added local read-only `GET /new-listings` for durable post-baseline detections, newest first.
- Added strict optional `limit=1..100` validation with a default of 50 and deterministic provider/symbol tie-breaking.
- Excluded baseline rows and returned current provider state alongside immutable detection and latest-observation times.
- 425 unit tests and all 42 isolated E2E tests passed; build, lint, formatting, Compose, and diff validation also passed.

## 2026-09-14 — M7.5 durable detection marker completed

- Added nullable immutable `detectedAt` persistence and an index for post-baseline symbol discoveries.
- Kept baseline and pre-migration observations unclassified instead of fabricating historical detection events.
- Verified that later observations update current provider state without rewriting the original application detection time.
- 419 unit tests and all 42 isolated E2E tests passed; build, lint, formatting, Compose, and diff validation also passed.

## 2026-09-14 — M7.4 sequential catalog polling completed

- Added immediate startup loading followed by non-overlapping public catalog refreshes, defaulting to a 60-second completion-relative interval.
- Added validated `NEW_LISTINGS_POLL_INTERVAL_MS` configuration with a five-second minimum and a safe example value.
- Preserved the last successful state across refresh failures and canceled active work and pending timers during shutdown.
- 419 unit tests and all 42 isolated E2E tests passed; build, lint, formatting, Compose, and diff validation also passed.

## 2026-09-14 — M7.3 conservative newly observed detection completed

- Compared each non-empty Spot catalog with its durable provider baseline in the same serializable transaction used for observation upserts.
- Made the first provider population baseline-only and returned only later previously unseen symbols as newly observed.
- Retained the latest newly observed set in the startup catalog service and logged its count without adding polling, routes, alerts, signals, or trading.
- 413 unit tests and all 42 isolated E2E tests passed; build, lint, formatting, Compose, and diff validation also passed.

## 2026-09-14 — M7.2 durable symbol observations completed

- Added transactional PostgreSQL persistence for first/latest application observations and current Spot symbol state.
- Added the `observed_spot_symbols` migration and isolated database-backed idempotency coverage.
- Observation time is explicitly not represented as an official Binance listing time; no polling, route, signal, or trading was added.
- 413 unit tests and all 41 isolated E2E tests passed with build, lint, formatting, Compose, and diff validation.

## 2026-09-14 — M7.1 public Spot symbol catalog completed

- Added a provider-neutral Binance Spot/USDT catalog loaded from public exchange information without credentials.
- Added strict normalization, deterministic ordering, startup retention, timeout, shutdown cancellation, and non-blocking failure handling.
- No polling, persistence, listing claim, API route, signal, order, or financial mutation was introduced.
- 413 unit tests passed across 58 suites; all 40 isolated E2E tests and static checks passed.

## 2026-09-13 — M6.32 isolated E2E validation and M6 closure completed

- Added a disposable `crypto_trader_e2e` schema lifecycle for full E2E runs, with automatic migration and no access to local application records.
- Fixed PostgreSQL adapter schema propagation so generated Prisma operations and raw SQL transactions share the configured schema and validated search path.
- Closed M6 after 407 unit tests across 56 suites and all 40 E2E tests across 3 suites passed together; build, lint, formatting, Compose, and diff checks also passed.

## 2026-09-13 — M6.31 explicit simulation-run deletion completed

- Added `DELETE /backtesting/runs/:id` with validated UUID identity and explicit HTTP 204, 400, 404, and sanitized 503 outcomes.
- A single conditional PostgreSQL deletion removes only the selected simulation snapshot; historical candles and all financial state remain untouched.
- 404 unit tests passed across 55 suites. The focused HTTP deletion test and all 5 backtest-run persistence E2E tests passed; the full E2E run reached 35/40 but remains blocked by pre-existing `e2e-*` paper-trading residue in the shared local database.

## 2026-09-13 — M6.30 persisted-run temporal filtering completed

- Added inclusive canonical UTC `createdFrom` and `createdTo` filters to `GET /backtesting/runs`, composed with limit and cursor.
- Invalid, inverted, and cursor-incompatible ranges return HTTP 400; no response shape, schema, or financial behavior changed.
- 399 unit tests passed across 55 suites; 38 E2E tests passed across 3 suites.

## 2026-09-13 — M6.29 stable simulation-run cursor pagination completed

### Added

- Optional UUID `cursor` on `GET /backtesting/runs`, taken from the last item of the preceding page.
- Exclusive keyset boundary over immutable creation time and UUID with explicit malformed and unknown-cursor handling.
- Unit, HTTP E2E, and PostgreSQL-backed coverage for cursor resolution, boundary semantics, validation, and unchanged no-cursor behavior.

### Changed

- Extended recent-run reads with stable keyset pagination while preserving the existing array response and 1–100 limit contract.
- Updated the root README route table and synchronized backtesting documentation, project context, roadmap, plan, map, decisions, changelog, and current state.

### Verification

- 396 unit tests passed across 55 suites; 37 E2E tests passed across 3 suites.
- Lint, formatting check, TypeScript build, Compose validation, and diff whitespace validation passed.
- No response envelope, offset pagination, filtering, deletion, update, recalculation, Binance access, financial mutation, exchange authentication, order submission, or real trading was introduced.

## 2026-09-13 — M6.28 bounded recent simulation-run listing completed

### Added

- Read-only `GET /backtesting/runs` returning immutable simulation snapshots newest first.
- Strict optional `limit` validation from 1 through 100 with a default of 50 and sanitized operational failure handling.
- Unit, HTTP E2E, and PostgreSQL-backed coverage for projection, bounds, deterministic ordering, and strict limiting.

### Changed

- Extended the backtest-run repository and application service with bounded recent reads using the existing creation-time and UUID index.
- Added the route to the root README and synchronized backtesting documentation, project context, roadmap, plan, map, decisions, changelog, and current state.

### Verification

- 391 unit tests passed across 55 suites; 36 E2E tests passed across 3 suites.
- Lint, formatting check, TypeScript build, Compose validation, and diff whitespace validation passed.
- No cursor pagination, filtering, deletion, update, recalculation, Binance access, financial mutation, exchange authentication, order submission, or real trading was introduced.

## 2026-09-13 — M6.27 immutable simulation-run retrieval completed

### Added

- Read-only `GET /backtesting/runs/:id` returning one complete immutable simulation snapshot by UUID.
- Explicit HTTP 400 for malformed UUIDs, 404 for absent runs, and sanitized 503 for operational lookup failures.
- Unit, HTTP E2E, and PostgreSQL-backed repository coverage for exact retrieval, absence, validation, and failure mapping.

### Changed

- Extended the backtest-run repository and application service with direct primary-key lookup while keeping persistence metadata private.
- Added the route to the root README and synchronized backtesting documentation, project context, roadmap, plan, map, decisions, changelog, and current state.

### Verification

- 381 unit tests passed across 55 suites; 34 E2E tests passed across 3 suites.
- Lint, formatting check, TypeScript build, Compose validation, and diff whitespace validation passed.
- No recalculation, Binance access, listing, pagination, deletion, update, financial mutation, exchange authentication, order submission, or real trading was introduced.

## 2026-09-13 — M6.26 immutable simulation-run persistence completed

### Added

- `POST /backtesting/runs` with the same strict fictional simulation request as the ephemeral route and a required `Idempotency-Key` header.
- Immutable PostgreSQL snapshots containing a UUID, UTC creation time, normalized complete request, and complete JSON-safe simulation result with decimal strings preserved exactly.
- Canonical SHA-256 request fingerprints, replay without recalculation for identical requests, and HTTP 409 conflict detection for mismatched key reuse.
- Unit, HTTP E2E, and PostgreSQL-backed integration coverage for creation, exact replay, serialization, and conflicts.

### Changed

- Registered the backtest-run repository and application service while leaving `POST /backtesting/simulate` unchanged.
- Added the route to the root README and synchronized backtesting documentation, project context, roadmap, plan, map, decisions, changelog, and current state.

### Verification

- 375 unit tests passed across 55 suites; 32 E2E tests passed across 3 suites.
- Prisma generation and deployment of all eight migrations, lint, formatting check, TypeScript build, Compose validation, and diff whitespace validation passed.
- No run retrieval/list/delete route, operational wallet mutation, strategy execution, exchange authentication, order submission, or real trading was introduced.

## 2026-09-13 — M6.25 local historical simulation API completed

### Added

- Local `POST /backtesting/simulate` exposing the complete deterministic fictional simulation result.
- Strict pre-load validator for the full configuration and execution-rule snapshot, including semantic decimal, rate, range, impact, and step checks.
- Controller and E2E coverage for valid simulation mapping, pre-load rejection, sanitized operational failure, and response exposure.

### Changed

- Registered the simulation validator and documented every required configuration group in the root README API table.
- Synchronized backtesting documentation, project context, roadmap, plan, map, decisions, changelog, and current state.

### Verification

- 372 unit tests passed across 54 suites; 29 E2E tests passed across 2 suites.
- Lint, formatting check, TypeScript build, Compose validation, and diff whitespace validation passed.
- No result persistence, paper-wallet mutation, operational Risk Engine access, order submission, exchange authentication, or real trading was introduced.

## 2026-09-13 — M6.24 local historical replay API completed

### Added

- Local `POST /backtesting/replay` for bounded deterministic BTC/USDT one-minute signal replay.
- Strict canonical UTC timestamp, range, limit, shape, and unknown-field validation.
- Controller and E2E coverage for request mapping, response serialization, invalid input, and sanitized operational failure.

### Changed

- Registered the backtesting presentation controller and documented the route in the root README API table.
- Synchronized backtesting documentation, project context, roadmap, plan, map, decisions, changelog, and current state.

### Verification

- 359 unit tests passed across 53 suites; 28 E2E tests passed across 2 suites.
- Lint, formatting check, TypeScript build, Compose validation, and diff whitespace validation passed.
- No simulation API, result persistence, wallet access, signal execution, exchange authentication, or real trading was introduced.

## 2026-09-13 — M6.23 sequential historical gap filling completed

### Added

- Deterministic planner that groups missing expected minute identities into contiguous bounded historical requests.
- Focused coverage for multiple gaps, cache completeness, single-batch persistence, and incomplete provider recovery.

### Changed

- Cache misses now load only missing historical ranges sequentially instead of reloading the complete request.
- Stored and fetched candles are merged only when they form the exact complete request sequence; incomplete recovery and duplicate identities fail before persistence or replay.
- All fetched gaps persist through one existing transactional repository call.
- Synchronized backtesting documentation, project context, roadmap, plan, map, decisions, README, changelog, and current state.

### Verification

- 351 unit tests passed across 52 suites; 27 E2E tests passed across 2 suites.
- Lint, formatting check, TypeScript build, Compose validation, and diff whitespace validation passed.
- No refresh, overwrite, parallel loading, route, migration, wallet access, execution, or real trading was introduced.

## 2026-09-13 — M6.22 automatic complete-range cache reuse completed

### Added

- Pure minute-aligned historical coverage calculation bounded by the inclusive request range and limit.
- Focused tests for complete, limited, missing, displaced, and truncated stored sequences.

### Changed

- Standard historical replay and simulation now read PostgreSQL first, bypassing Binance and persistence on a proven complete cache hit.
- Incomplete coverage falls back to the existing full remote load and transactional write-through; explicit stored-only methods remain unchanged.
- Synchronized backtesting documentation, project context, roadmap, plan, map, decisions, README, changelog, and current state.

### Verification

- 347 unit tests passed across 51 suites; 27 E2E tests passed across 2 suites.
- Lint, formatting check, TypeScript build, Compose validation, and diff whitespace validation passed.
- No partial gap download, mixed-source merge, refresh policy, route, migration, wallet access, execution, or real trading was introduced.

## 2026-09-13 — M6.21 stored historical replay completed

### Added

- Bounded chronological `findRange` reads on the provider-neutral historical-candle repository.
- Strict reconstruction of persisted candles with identity, closed-state, timestamp, safe trade-count, decimal, volume, and OHLC validation.
- Explicit internal stored-only replay and simulation operations that never invoke Binance or repeat write-through persistence.
- Unit coverage for range queries, mapping, invalid requests, invalid rows, stored replay, and provider isolation.
- PostgreSQL integration coverage for chronological ordering and result limits over persisted candles.
- The full unit suite now contains 342 tests across 50 suites; 27 E2E tests pass across 2 suites with the documented safe process-only environment override.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No automatic cache selection, fallback, gap filling, completeness claim, route, migration, candle mutation/deletion, result persistence, wallet access, execution, or real trading was introduced.

## 2026-09-13 — M6.20 historical candle persistence completed

### Added

- PostgreSQL `historical_candles` storage keyed by symbol, interval, and open time, with closed-state, identity, time, and trade-count constraints.
- Exact textual persistence for validated OHLC and volume decimals without floating-point or fixed-scale loss.
- Provider-neutral historical-candle repository with serializable batch writes, duplicate skipping, complete post-write comparison, and explicit conflict rejection.
- Write-through orchestration that blocks replay and simulation until the complete freshly loaded batch persists successfully.
- Unit coverage for mapping, idempotency, conflicts, empty batches, and persistence-before-replay behavior.
- PostgreSQL integration coverage for exact idempotent storage and whole-batch rollback on identity conflict.
- The full unit suite now contains 338 tests across 50 suites; 26 E2E tests pass across 2 suites with the documented safe process-only environment override.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No stored-range reads, cache-first behavior, gap filling, candle deletion, result persistence, route, new market, wallet access, execution, or real trading was introduced.

## 2026-09-13 — M6.19 historical provider circuit breaker completed

### Added

- Process-local circuit state for exhausted transient Binance historical-page failures.
- Three-failure opening threshold, 30-second fail-fast interval, and one concurrent half-open recovery probe.
- Success-driven reset and probe-failure reopening without repeating already accepted historical pages.
- Explicit exclusion of caller cancellation, invalid requests, permanent HTTP responses, and invalid successful payloads from failure accounting.
- Deterministic tests for opening, fail-fast behavior, recovery, single-probe concurrency, reopening, and excluded failures.
- The full suite now contains 333 tests across 49 suites.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No Redis coordination, persistence, operator route, public configuration, metrics endpoint, parallel paging, cache, wallet access, execution, or real trading was introduced.

## 2026-09-13 — M6.18 resilient historical page loading completed

### Added

- At most three total attempts for each Binance historical page when network, HTTP 429, or HTTP 5xx failures occur.
- Bounded 500 ms and 1 s exponential retry waits plus valid `Retry-After` support capped at 30 seconds.
- Caller-cancelable waiting and a fresh ten-second timeout for every HTTP attempt.
- Immediate failure for permanent HTTP client responses and malformed successful payloads.
- Deterministic injected-wait tests covering recovery, exhaustion, rate-limit delay, permanent failure, and cancellation.
- The full suite now contains 329 tests across 49 suites.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No circuit breaker, parallel paging, persistence, cache, resumable job, route, public configuration, wallet access, execution, or real trading was introduced.

## 2026-09-13 — M6.17 bounded historical pagination completed

### Added

- Provider-neutral historical requests for up to 10,000 BTC/USDT one-minute candles and a matching 10,000-minute maximum span.
- Sequential Binance retrieval using pages of at most 1,000 candles and the remaining caller limit.
- Deterministic cursor advancement from the last validated open time, with terminal empty and partial-page handling.
- Focused coverage for multi-page aggregation, page limits, cursor construction, empty termination, and the expanded safety ceiling.
- The full suite now contains 325 tests across 49 suites.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No persistence, cache, retry/rate-limit policy, parallel requests, new symbol or interval, API route, wallet access, execution, or real trading was introduced.

## 2026-09-13 — M6.16 causal volume participation completed

### Added

- Required positive maximum volume-participation rate no greater than one for historical simulation.
- Causal all-or-none liquidity limit based exclusively on the fully closed signal candle's base volume, without reading execution-candle volume.
- Dedicated `liquidityUnfilledSignalCount` with cash and position preservation for rejected buys and sells.
- Auditable fill fields for the liquidity reference candle close, reference base volume, and calculated maximum fill quantity.
- Focused tests for inclusive limits, zero volume, arbitrary decimal precision, causal rejection, sell-state preservation, and configuration validation.
- The full suite now contains 323 tests across 49 suites.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No partial fills, variable sizing, order-book/depth model, route, persistence, wallet access, execution, or real trading was introduced.

## 2026-09-13 — M6.15 executable price range completed

### Added

- Mandatory positive minimum and maximum prices in the provider-neutral historical execution-rule snapshot.
- Early validation of coherent price ranges and inclusive exact-decimal boundary checks on final tick-aligned prices.
- Dedicated `priceRangeUnfilledSignalCount` with cash and position preservation for rejected buys and sells.
- Deterministic validation order placing price range before minimum notional, plus focused boundary and simulator-state tests.
- The full suite now contains 315 tests across 48 suites.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No live metadata dependency, liquidity, partial fill, variable sizing, route, persistence, wallet access, execution, or real trading was introduced.

## 2026-09-13 — M6.14 price precision completed

### Added

- Mandatory positive tick size in each provider-neutral historical execution-rule snapshot.
- Isolated side-aware fill-price calculator retaining reference, post-impact adjusted, and final executable prices.
- Conservative exact-decimal quantization: buys round upward and sells downward, with all downstream financial calculations using the final price.
- Explicit accounting for sells whose tick flooring reaches zero, preserving the open position without creating a fill.
- Focused tests for both sides, aligned prices, zero flooring, arbitrary precision, financial reconciliation, and rule validation.
- The full suite now contains 310 tests across 48 suites.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No price range filter, live metadata dependency, liquidity, partial fill, variable sizing, route, persistence, wallet access, execution, or real trading was introduced.

## 2026-09-13 — M6.13 quantity and minimum-order constraints completed

### Added

- Required provider-neutral historical execution-rule snapshot with minimum/maximum quantity, step size, and minimum notional.
- Early exact-decimal validation of the fixed quantity against range and step-size constraints without silent rounding.
- Per-potential-fill minimum-notional enforcement using effective post-cost price, with dedicated unfilled-signal accounting and no state mutation.
- Returned normalized rule snapshot for reproducible simulations and tests for boundary, precision, buy-rejection, and sell-rejection behavior.
- The full suite now contains 302 tests across 47 suites.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No price tick rounding, live metadata dependency, liquidity, partial fill, variable sizing, route, persistence, wallet access, execution, or real trading was introduced.

## 2026-09-13 — M6.12 time and exposure metrics completed

### Added

- Tested-period duration from the first historical candle open through the final candle close.
- Per-closed-trade holding durations, total time in market, decimal exposure rate, and average closed-trade holding duration.
- Ending open-position exposure measured through the final candle close and explicit null states for undefined ratios or absent samples.
- Isolated temporal calculator with four focused tests for empty, closed, open, and invalid intervals, plus simulator integration assertions.
- The full suite now contains 291 tests across 46 suites.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No annualization, Sharpe or Sortino ratio, liquidity, pair-rule enforcement, variable sizing, route, persistence, wallet access, execution, or real trading was introduced.

## 2026-09-13 — M6.11 deterministic spread and slippage completed

### Added

- Required explicit full-spread and slippage rates for historical simulation, validated as non-negative decimal inputs.
- Adverse effective execution pricing at the next candle open: half-spread plus slippage above reference for buys and below reference for sells.
- Auditable fill-level reference and effective prices, with effective prices feeding notionals, fees, affordability, cash, PnL, ROI, and equity.
- Focused tests for symmetric price impact, downstream reconciliation, configuration boundaries, and a buy made unaffordable by execution costs.
- The full suite now contains 287 tests across 45 suites.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No live spread lookup, stochastic or volume-dependent slippage, liquidity, pair-rule rounding, variable sizing, route, persistence, wallet access, execution, or real trading was introduced.

## 2026-09-13 — M6.10 candle-close equity and drawdown completed

### Added

- Ledger-derived equity point for every historical candle close with cash, BTC quantity, fee-adjusted position value, equity, peak, and drawdown.
- Causal application of opening fills before the same candle's closing valuation.
- Separate maximum absolute and percentage drawdown summaries with start, trough, and optional recovery timestamps.
- Exact reconciliation between the final curve point and the M6.9 final equity.
- Four focused tests for no-trade periods, open and closed positions, recovery, fees, and arbitrary precision.
- The full suite now contains 282 tests across 45 suites.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No intracandle path, variable sizing, reinvestment, Sharpe or Sortino ratio, annualization, route, persistence, spread, slippage, liquidity model, wallet access, execution, or real trading was introduced.

## 2026-09-13 — M6.9 simulated capital and total ROI completed

### Added

- Required positive initial USDT capital and deterministic non-negative cash accounting.
- Fee-inclusive buy debits, net sell credits, and explicit counting of buy signals rejected for insufficient capital.
- Final cash, ending position net value, final equity, total net return, and total ROI using precision-40 `decimal.js`.
- Tests for profitable and open-position outcomes, insufficient capital, invalid capital, fees, and deterministic precision.
- The full suite now contains 278 tests across 44 suites.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No borrowing, negative cash, reinvestment, variable sizing, percentage drawdown, intraperiod equity curve, route, persistence, wallet mutation, order execution, or real trading was introduced.

## 2026-09-13 — M6.8 realized PnL curve and drawdown completed

### Added

- Chronological trade-exit curve with trade net PnL, cumulative realized net PnL, running peak, and absolute drawdown.
- Maximum realized drawdown amount with start, trough, and optional recovery timestamps.
- Zero-baseline handling for an initial losing trade and explicit empty results without closed trades.
- Three focused tests covering empty, consecutive-loss, recovery, new-peak, break-even, and arbitrary-precision behavior.
- The full suite now contains 276 tests across 44 suites.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No intraperiod or unrealized equity curve, percentage drawdown, ROI, initial capital, route, persistence, spread, slippage, liquidity model, wallet access, order execution, or real trading was introduced.

## 2026-09-13 — M6.7 closed-trade quality statistics completed

### Added

- Average net PnL per closed trade, average profitable result, and absolute average losing result.
- Net expectancy per closed trade and profit factor based on fee-inclusive simulated outcomes.
- Explicit nullable results when the required sample or denominator does not exist.
- Coverage for empty, mixed, profitable-only, losing-only, break-even, and arbitrary-precision statistics.
- Two focused tests; the full suite now contains 273 tests across 43 suites.
- Synchronized backtesting documentation, context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No open-position inclusion in closed-trade statistics, ROI, equity curve, drawdown, Sharpe ratio, annualization, route, persistence, spread, slippage, liquidity model, wallet access, order execution, or real trading was introduced.

## 2026-09-13 — M6.6 ending open-position valuation completed

### Added

- Deterministic final-close valuation for an ending historical open position without creating a synthetic sell.
- Mark time and price, gross market value, estimated exit fee, net liquidation value, and unrealized net PnL.
- Combined total net PnL across realized and unrealized results, with explicit nullable unrealized state when flat.
- Precision-40 `decimal.js` coverage for profitable, losing, absent, and arbitrary-precision ending valuations.
- Four focused tests plus simulator integration coverage; the full suite now contains 271 tests across 43 suites.
- Synchronized backtesting documentation, project context, roadmap, plan, map, decisions, README, changelog, and current state.

### Scope boundaries

- No synthetic exit, intraperiod equity curve, ROI, drawdown, profit factor, expectancy, route, persistence, spread, slippage, liquidity model, pair-rule enforcement, variable sizing, wallet access, order execution, or real trading was introduced.

## 2026-09-13 — M6.5 aggregate realized performance completed

### Added

- Deterministic performance calculator derived from hypothetical fills and closed trades.
- Fill and closed-trade totals, profitable/losing/break-even counts, and nullable realized win rate.
- Gross profit, absolute gross loss, realized net PnL, and total fees using precision-40 `decimal.js` arithmetic.
- Explicit fee accounting for an ending open entry without introducing unrealized valuation.
- Three focused calculator tests plus simulator integration coverage; the full suite now contains 267 tests across 42 suites.
- Synchronized backtesting documentation, project context, roadmap, plan, map, changelog, and current state.

### Scope boundaries

- No mark-to-market valuation, unrealized PnL, ROI, drawdown, profit factor, expectancy, route, persistence, spread, slippage, liquidity model, pair-rule enforcement, variable sizing, wallet access, order execution, or real trading was introduced.

## 2026-09-13 — M6.4 deterministic long-only simulation completed

### Added

- Historical-only simulator consuming candles and strategy signals through a separate application boundary.
- Causal next-candle-open hypothetical fills, including explicit handling of terminal signals with no future candle.
- Fixed BTC quantity, explicit taker fee rate, exact notionals, entry cost, net exit proceeds, and per-closed-trade net PnL through precision-40 `decimal.js` arithmetic.
- Ordered buy/sell fill ledger, one-position long state, ignored redundant signal counts, and explicit ending open position.
- Historical orchestration that loads candles once and returns replay and simulation results together.
- Eleven focused tests for causality, fee-inclusive PnL, open positions, redundant actions, terminal signals, arbitrary precision, invalid configuration, inconsistent timelines, and orchestration.
- Synchronized backtesting documentation, project context, README status, roadmap, plan, map, decisions, and current state.

### Scope boundaries

- No real or paper order, wallet mutation, executor call, operational Risk Engine call, exchange-account access, route, persistence, aggregate metric, spread, slippage, liquidity model, pair-rule enforcement, variable sizing, or real trading was introduced.

## 2026-09-12 — M6.3 complete historical candle model completed

### Added

- Provider-neutral `HistoricalCandle` model retaining exact OHLC prices, base and quote volumes, taker-buy volumes, trade count, close state, and UTC boundaries.
- Exact `decimal.js` validation for positive prices, non-negative volumes, coherent highs and lows, and arbitrary-precision preservation.
- Explicit full-candle-to-strategy projection so strategies receive only their existing close-price contract.
- Five additional focused tests for complete normalization, precision preservation, invalid price/volume, incoherent high/low data, and projection isolation.
- Synchronized backtesting documentation, project context, README status, roadmap, plan, map, decisions, and current state.

### Scope boundaries

- No trade simulation, next-candle execution, fee, spread, slippage, sizing, PnL, metric, route, persistence, credential, wallet access, or real trading was introduced.

## 2026-09-12 — M6.2 public historical candle loading completed

### Added

- Provider-neutral historical-candle request and provider contracts.
- Public Binance Spot `GET /api/v3/klines` adapter using the configured market-data-only REST host without authentication.
- Mandatory bounded BTC/USDT one-minute requests with a 1–1,000 result limit and maximum 1,000-minute range.
- Ten-second request timeout, caller cancellation, strict 12-field payload validation, range checks, response-size enforcement, and duplicate/out-of-order rejection.
- Open-candle exclusion based on close time and direct internal delegation from historical loading to deterministic M6.1 replay.
- Eleven focused tests across the provider adapter and orchestration service.
- Synchronized backtesting documentation, project context, README status, roadmap, plan, map, decisions, and current state.

### Scope boundaries

- No API route, database migration, historical persistence, pagination across requests, retries, trade/fill simulation, fees, spread, slippage, financial metrics, optimization, wallet access, execution, credentials, or real trading was introduced.

## 2026-09-12 — M6.1 deterministic strategy replay completed

### Added

- Provider-neutral backtesting module and internal replay service for supplied closed BTC/USDT one-minute candles.
- Strict symbol, interval, close-state, timestamp, ordering, and duplicate validation.
- Candle-by-candle evaluation with strategy-declared bounded history and no exposure to future candles.
- Deterministic ordered signal timeline with evaluated period and buy, sell, and hold counts.
- Six focused tests covering empty input, deterministic output, bounded no-lookahead behavior, open candles, out-of-order candles, and duplicates.
- `docs/backtesting.md` and synchronized project status, roadmap, plan, map, decisions, current state, and README.

### Scope boundaries

- No HTTP route, historical-data retrieval or persistence, trade/fill simulation, fees, spread, slippage, PnL, ROI, drawdown, profit factor, expectancy, optimization, wallet access, execution, authenticated exchange integration, or real trading was introduced.

All notable working-tree changes are recorded here. Dates use `YYYY-MM-DD`.

## 2026-09-12 — M5.6 strategy signal persistence completed

### Added

- Additive `strategy_signals` PostgreSQL migrations with precision-preserving decimal average fields, chronological index, and unique strategy/symbol/candle-close identity.
- Provider-neutral signal repository and Prisma adapter for idempotent writes plus recent/latest reads.
- Database-backed E2E coverage for duplicate suppression, ordering, decimal serialization, and both signal endpoints.

### Changed

- Live evaluation now persists every generated signal and logs structured persistence failures.
- Existing recent and latest signal routes now query PostgreSQL and survive restarts without changing their HTTP contracts.
- Exported the process-local candle feed from the market-data module, fixing full NestJS application dependency resolution discovered by E2E validation.
- Synchronized README routes, project context, roadmap, plan, map, strategy documentation, decisions, and current state.

### Scope confirmation

- No cursor pagination, filters, statistics, historical candle storage, backtesting, position sizing, risk assessment, execution integration, new strategy, or real trading was introduced.

## 2026-09-12 — M5.5 recent signal history completed

### Added

- Bounded process-local retention of the latest 100 generated strategy signals.
- Read-only `GET /strategies/signals` history, newest first, with a validated optional limit from 1 through 100 and a default of 50.
- Focused tests for empty history, ordering, latest consistency, requested limits, invalid limits, and oldest-entry eviction.

### Changed

- The existing latest-signal endpoint and live evaluator now share one signal read model, so each evaluation is stored only once.
- Added the recent-signals endpoint to the root README API route table and synchronized project context, roadmap, plan, map, strategy documentation, decisions, and current state.

### Scope confirmation

- No PostgreSQL signal persistence, cursor pagination, filters, statistics, position sizing, risk assessment, execution, backtesting, or real trading was introduced.

## 2026-09-12 — M5.4 configurable moving-average periods completed

### Added

- Validated `STRATEGY_MA_SHORT_PERIOD` and `STRATEGY_MA_LONG_PERIOD` startup configuration with 3/5 defaults, positive-integer constraints, a 1,000 maximum, and strict `short < long` validation.
- Strategy-declared required candle count used by live retention.
- Focused tests for defaults, custom values, invalid relationships, numeric bounds, declared history, and dynamic retention.

### Changed

- The NestJS strategy provider now constructs the moving-average crossover from validated configuration.
- Updated `.env.example`, project context, roadmap, plan, map, strategy documentation, decisions, and current state for M5.4.

### Scope confirmation

- No runtime configuration mutation, route, hot reload, optimization, persistence, position sizing, risk assessment, execution, or real trading was introduced.

## 2026-09-12 — M5.3 latest-signal API completed

### Added

- Process-local latest-strategy-signal read model updated by every successful live evaluation.
- Read-only `GET /strategies/signals/latest` endpoint with explicit HTTP 503 before a signal exists.
- Unit coverage for initial absence, latest-value replacement, live-evaluation integration, and controller responses.

### Changed

- Added the strategy signal endpoint to the root README API route table.
- Updated project context, roadmap, plan, map, strategy documentation, decisions, and current state for M5.3.

### Scope confirmation

- No signal history or persistence, mutation endpoint, position sizing, risk assessment, order execution, dashboard, exchange authentication, or real trading was introduced.

## 2026-09-12 — M5.2 live signal observation completed

### Added

- Process-local provider-neutral candle feed with subscriber isolation.
- Lifecycle-managed live strategy evaluator with a six-candle closed-history bound.
- Structured signal logs and diagnostics for duplicate or out-of-order closed candles.
- Focused tests for publication, subscriber failure, lifecycle, open-candle exclusion, bounded retention, ordering, deduplication, and live crossover generation.

### Changed

- Normalized public candles now enter the internal feed before their existing market-data log.
- Updated project context, roadmap, plan, map, strategy documentation, decisions, and current-state evidence for M5.2.

### Scope confirmation

- No persistence, API route, dashboard, position sizing, Risk Engine call, executor call, exchange authentication, or real trading was introduced.

## 2026-09-12 — API route index documented

### Changed

- Added every existing HTTP method and route to the root README, including parameters, availability conditions, and emergency-stop write requirements.
- Added a permanent project rule requiring the README route table to remain synchronized with controller changes.
- Added API and controller navigation keywords to the project map.

## 2026-09-12 — M5.1 moving-average crossover completed

### Added

- Provider-neutral strategy input, strategy, and signal contracts.
- Deterministic BTC/USDT moving-average crossover over ordered closed one-minute candles with exact decimal averages.
- Focused tests for buy, sell, hold, equality, incomplete candles, insufficient history, ordering, invalid prices, and invalid periods.
- Strategy documentation and project-map navigation.

### Changed

- Registered the isolated strategies module in the modular monolith.
- Marked M4 complete and M5.1 complete across project status and planning documents.

### Scope confirmation

- No strategy was connected to live data, position sizing, the Risk Engine, an executor, persistence, HTTP, dashboard, authenticated exchange access, or real trading.

## 2026-09-12 — M4.11 execution rate limit completed

### Added

- Validated `RISK_MAX_EXECUTIONS_PER_WINDOW` and `RISK_EXECUTION_WINDOW_MS` configuration, defaulting to 10 distinct approved execution keys per 60 seconds.
- Redis-backed atomic fixed-window permits with idempotency-aware duplicate handling and structured permit/rejection diagnostics.
- Unit and Redis-backed E2E coverage for the inclusive limit, concurrent excess, duplicate keys, expiration, replay bypass, and fail-closed errors.

### Changed

- Every newly approved paper buy or sell now obtains a rate-limit permit before PostgreSQL financial mutation.
- Updated project context, roadmap, plan, map, risk documentation, decisions, and current-state evidence for M4.11.

## 2026-09-12 — M4.10 unrealized loss limit completed

### Added

- Validated `RISK_MAX_UNREALIZED_LOSS_USDT` configuration with a default of `25` USDT.
- Provider-neutral risk rejection for new buys at or beyond the existing position's net unrealized-loss boundary.
- Focused tests for the inclusive boundary, smaller loss, profit, sell exemption, rule precedence, candidate integration, and unavailable market data.

### Changed

- New paper buys reuse the fresh best-bid, estimated-exit-fee position valuation before risk approval.
- Updated project context, roadmap, plan, map, risk documentation, decisions, and current-state evidence for M4.10.

## 2026-09-12 — M4.9 authenticated local risk control completed

### Added

- Optional validated `RISK_CONTROL_TOKEN_SHA256` configuration with no credential in examples.
- Fail-closed Bearer guard for emergency-stop writes using in-memory SHA-256 and constant-time comparison.
- Unit and E2E coverage for correct, missing, malformed, incorrect, and unconfigured credentials without token disclosure.

### Changed

- Docker Compose now publishes the API only on host loopback at `127.0.0.1:3000`.

### Scope confirmation

- No authentication dependency, account/session system, migration, order endpoint, dashboard, strategy, exchange credential, or real trading was introduced.

## 2026-09-12 — M4.8 top-of-book participation limit completed

### Added

- Validated `RISK_MAX_TOP_OF_BOOK_PARTICIPATION_RATE` configuration with a default of `0.10`.
- Best-side available quantity carried from each provider-neutral quote into risk assessment.
- Exact buy/sell participation calculation and structured rejection above the inclusive limit.
- Unit coverage for both sides, exact boundary, and precedence; E2E coverage verifies rejection without execution or balance mutation.

### Scope confirmation

- No migration, multi-level order book, partial-fill, market-impact, deeper-slippage, order endpoint, strategy, authenticated integration, or real trading was introduced.

## 2026-09-12 — M4.7 persistent emergency-stop control completed

### Added

- Append-only `risk_control_events` migration and Prisma model.
- Restart-safe emergency-stop state with configuration fallback when no event exists.
- Local `GET /risk/emergency-stop` and idempotent `PUT /risk/emergency-stop` endpoints.
- Required operational reasons, structured state/change logs, replay responses, and conflict detection for reused keys with different payloads.
- Unit and database-backed E2E coverage for fallback, reload, activation, deactivation, idempotency, conflict, precedence, and rejection without financial mutation.

### Scope confirmation

- The control is local and paper-only. No remote authentication, order endpoint, dashboard, strategy, authenticated market integration, or real trading was introduced.

## 2026-09-12 — M4.6 atomic daily-loss enforcement completed

### Added

- PostgreSQL transaction-scoped advisory-lock serialization for paper buys and sells.
- In-transaction reconstruction and enforcement of the current UTC daily realized-loss limit before buy mutation.
- Specific atomic daily-loss error with rollback before any execution or balance effect.
- Database-backed concurrency coverage proving a queued losing sell is visible to the following buy.

### Changed

- The E2E application bootstrap has an explicit 30-second hook timeout for reliable startup on the local resource-constrained environment.

### Scope confirmation

- No migration, persisted aggregate, external order endpoint, strategy, authenticated integration, or real trading was introduced.

## 2026-09-12 — M4.5 daily realized loss limit completed

### Added

- Validated `RISK_MAX_DAILY_REALIZED_LOSS_USDT` configuration with a safe default of `25` USDT.
- Exact current-UTC-day net realized PnL derived from the complete chronological execution history.
- Buy-only rejection at the inclusive daily-loss threshold, while sells and idempotent replays remain available.
- Unit coverage for threshold behavior, profit offsets, UTC rollover, sells, and rule precedence; database-backed E2E coverage verifies rejection without mutation.

### Scope confirmation

- No migration, atomic daily-loss aggregate, unrealized-loss/drawdown rule, stop-loss, order endpoint, strategy, authenticated integration, or real trading was introduced.

## 2026-09-11 — M4.4 atomic BTC exposure enforcement completed

### Added

- Transaction-level conditional BTC credit using the existing configured position limit.
- Specific atomic position-limit error that aborts and rolls back the entire buy transaction.
- Database-backed concurrency coverage proving that only one of two competing buys can consume the same remaining exposure capacity.

### Scope confirmation

- The Risk Engine remains mandatory before persistence. No migration, order endpoint, loss rule, strategy, authenticated integration, or real trading was introduced.

## 2026-09-11 — M4.3 cumulative BTC position limit completed

### Added

- Validated `RISK_MAX_BTC_POSITION_QUANTITY` configuration with a default of `0.01` BTC.
- Exact projected-position assessment for new paper buys using the persisted BTC balance.
- Structured approval/rejection details containing current, projected, and maximum BTC quantities.
- Unit and E2E coverage for the inclusive boundary, above-limit rejection, sell bypass, precedence, and rejection without mutation.

### Scope confirmation

- No external order route, concurrency-safe exposure transaction, loss limit, strategy, authenticated integration, or real trading was introduced.

## 2026-09-11 — M4.2 emergency stop completed

### Added

- Validated `RISK_EMERGENCY_STOP` configuration with a default of `false`.
- Highest-precedence rejection of every new buy or sell while the stop is active.
- Structured `emergency_stop` / `emergency_stop_active` risk decisions.
- Unit and E2E coverage for inactive behavior, buy/sell rejection, rule precedence, and rejection without mutation.

### Scope confirmation

- No control endpoint, persisted stop state, order route, strategy, authenticated integration, or real trading was introduced.

## 2026-09-11 — M4.1 maximum-order-notional risk rule completed

### Added

- Provider-neutral `RiskEngine`, risk candidate, and assessment contracts.
- Configurable `RISK_MAX_ORDER_NOTIONAL_USDT` with a safe default of `100`.
- Buy/sell maximum-notional assessment between quoting and paper repository mutation.
- Structured approval/rejection logs and explicit risk-rejection application error.
- Unit and E2E coverage for exact-boundary approval, above-limit buy/sell rejection, and no mutation on rejection.

### Scope confirmation

- M3 is formally complete at M3.8. No order HTTP route, cumulative exposure, loss limit, strategy, authenticated integration, or real trading was introduced.

## 2026-09-11 — M3.8 realized performance summary completed

### Added

- Shared execution-accounting fold for position and performance read models.
- Profitable, losing, and break-even sell classification using net realized PnL.
- Realized win rate excluding break-even outcomes, plus execution counts, realized PnL, and total fees.
- Read-only `GET /paper-trading/performance` endpoint with unit and E2E coverage.

### Scope confirmation

- No ROI, time-based metrics, drawdown, order mutation, strategy, Risk Engine, authenticated integration, or real trading was introduced.

## 2026-09-11 — M3.7 unrealized position valuation completed

### Added

- Fresh best-bid marking for open BTC paper positions.
- Gross market value, estimated exit fee, net liquidation value, unrealized PnL, total PnL, and market-data timestamp on the position response.
- HTTP 503 diagnostics for unavailable or stale top-of-book data when a position is open.
- Unit and E2E coverage for profitable, losing, empty, unavailable, and stale valuation paths.

### Scope confirmation

- No wallet mutation, order endpoint, deeper-book slippage, performance statistics, strategy, Risk Engine, authenticated integration, or real trading was introduced.

## 2026-09-11 — M3.6 position and realized PnL completed

### Added

- Deterministic BTC position calculator over chronological paper executions.
- Fee-inclusive weighted-average cost basis, average entry price, accumulated fees, and realized PnL.
- Explicit rejection of sells exceeding execution-tracked BTC quantity.
- Read-only `GET /paper-trading/position` endpoint.
- Financial unit coverage for empty and multiple-buy positions, partial profitable sales, full losing closes, fees, and inconsistent history; E2E coverage verifies the HTTP read model.

### Scope confirmation

- No wallet or execution mutation, unrealized PnL, market valuation, ROI, win rate, strategy, Risk Engine, authenticated integration, or real trading was introduced.

## 2026-09-11 — M3.5 read-only execution history completed

### Added

- Bounded repository query for recent paper executions ordered by execution time and ID descending.
- `GET /paper-trading/executions` with a default limit of 50 and validated maximum of 100.
- Buy/sell response discrimination, canonical decimal strings, and ISO UTC quote, market-data, and execution timestamps.
- Unit and E2E coverage for defaults, explicit limits, invalid limits, ordering, bounding, and serialization.

### Scope confirmation

- No order mutation endpoint, deletion, cursor pagination, position/PnL model, deeper slippage, strategy, Risk Engine, authenticated integration, or real trading was introduced.

## 2026-09-11 — M3.4 idempotent paper sell execution completed

### Added

- Sell intents and results in the shared trading-executor contract.
- Additive migration allowing side-specific buy `totalCost` or sell `netProceeds` settlement.
- Atomic sufficient-BTC debit, net-USDT credit, and sell-execution persistence.
- Unit and database-backed E2E coverage for sell execution, replay, balance changes, insufficient BTC, and rollback.
- Structured successful-sell execution logging.

### Changed

- The existing execution repository and mapper now support discriminated buy and sell records while preserving prior buys.

### Scope confirmation

- No HTTP order route, position/PnL model, history query, deeper slippage, strategy, Risk Engine, authenticated integration, or real trading was introduced.

## 2026-09-11 — M3.3 paper market sell quote completed

### Added

- Internal BTC/USDT market-sell quote at the fresh best bid.
- Exact gross notional, simulated taker fee, and net USDT proceeds with 18-decimal half-even rounding.
- Validation for pair status, quantity rules, minimum notional, freshness, and top-level bid liquidity.
- Focused financial, rounding, and rejection-path tests plus structured sell-quote logging.

### Changed

- Synchronized the mandatory project context with the already committed M3.2 implementation.

### Scope confirmation

- No balance inspection or mutation, sell execution, persistence change, HTTP route, position/PnL model, strategy, Risk Engine, authenticated integration, or real trading was introduced.

## 2026-09-11 — M3.2 idempotent paper buy execution completed

### Added

- Shared trading-executor contract and paper-only BTC/USDT buy executor.
- PostgreSQL paper-execution model and additive migration.
- Atomic USDT debit, BTC credit, and execution persistence with insufficient-funds rollback.
- Caller-supplied idempotency keys with safe replay and concurrent duplicate protection.
- Unit and database-backed E2E coverage for execution, replay, balance changes, rollback, and 18-decimal half-even rounding.
- Structured successful-execution and replay logging.

### Scope confirmation

- No HTTP mutation route, sell, position/PnL model, history query, deeper slippage, strategy, Risk Engine, authenticated integration, or real trading was introduced.

## 2026-09-11 — M3.1 paper market buy quote completed

### Added

- Provider-neutral retention of latest BTC/USDT top-of-book and pair metadata.
- Internal BTC market-buy quote at the best ask with exact notional, simulated taker fee, and total cost.
- Configurable fee assumption and market-data freshness limit.
- Validation for availability, freshness, pair status, quantity bounds, step size, minimum notional, and best-ask liquidity.
- Focused financial and rejection-path tests plus structured successful-quote logging.
- M3 paper-trading documentation.

### Scope confirmation

- No execution, balance mutation, HTTP order route, sell, order history, multi-level slippage, PnL, strategy, Risk Engine, authenticated integration, or real trading was introduced.

## 2026-09-11 — M2.5 paper-wallet persistence completed

### Added

- Additive Prisma migration for constrained BTC/USDT paper balances using `DECIMAL(38,18)`.
- Provider-neutral paper-balance repository contract and PostgreSQL/Prisma implementation.
- Idempotent startup seeding that preserves existing balances.
- Atomic SQL credit and sufficient-balance debit operations.
- E2E verification that a persisted balance survives wallet reinitialization, with test cleanup.

### Changed

- Paper-wallet and valuation services now read balances asynchronously from PostgreSQL.
- Supported balance precision is explicit and validated before persistence.
- M2 is now complete; project context, roadmap, current state, decisions, guide, keyword map, plan, and README reflect the boundary.

### Scope confirmation

- No transaction history, mutation endpoint, order, paper execution, BRL conversion, fee, slippage, PnL, strategy, authenticated integration, dashboard, or real trading was introduced.

## 2026-09-11 — M2.4 stale-price protection completed

### Added

- Validated `PAPER_VALUATION_MAX_PRICE_AGE_MS` configuration with a 10-second default.
- Injectable system-clock boundary for deterministic freshness checks.
- Dedicated stale-price error with observed age and configured limit.
- Structured missing/stale valuation warnings.
- Unit and E2E coverage for stale prices and exact freshness boundaries.

### Changed

- `GET /paper-wallet/valuation` now returns HTTP 503 for stale as well as missing prices.
- Project context, roadmap, current state, decisions, paper-wallet guide, keyword map, plan, and examples now reflect M2.4.

### Scope confirmation

- No order, paper execution, persistence, BRL conversion, fee, slippage, PnL, strategy, authenticated integration, dashboard, or real trading was introduced.

## 2026-09-11 — M2.3 read-only portfolio API completed

### Added

- `GET /paper-wallet/balances` for fictional BTC and USDT balances.
- `GET /paper-wallet/valuation` for the latest portfolio value in USDT.
- HTTP 503 mapping when valuation is requested before the first market price.
- Controller unit tests and deterministic E2E coverage for balances, unavailable valuation, and available valuation.

### Changed

- The missing-price state now uses a dedicated application error.
- Project context, roadmap, current state, decisions, paper-wallet guide, keyword map, and plan now reflect M2.3.

### Scope confirmation

- No HTTP mutation, authentication, dashboard, persistence, BRL conversion, order, execution, fee, slippage, PnL, strategy, authenticated integration, or real trading was introduced.

## 2026-09-11 — M2.2 portfolio valuation completed

### Added

- Process-local retention of the latest normalized BTC/USDT ticker.
- Exact BTC value and total portfolio value in USDT.
- Explicit unavailable-price behavior before the first ticker.
- Validation for malformed, zero, and negative market prices.
- Unit coverage for latest-price replacement, ticker integration, zero BTC, exact arithmetic, unavailable price, and invalid prices.

### Changed

- The market-data module exports its provider-neutral latest-price service to the paper-wallet module.
- Project context, roadmap, current state, decisions, paper-wallet guide, keyword map, plan, and README now reflect M2.2.

### Scope confirmation

- No HTTP endpoint, dashboard, BRL conversion, persistence, stale-price policy, order, execution, fee, slippage, PnL, strategy, authenticated integration, or real trading was introduced.

## 2026-09-11 — M2.1 paper wallet core completed

### Added

- Fictional in-memory wallet with BTC and USDT balances.
- Configurable initial USDT balance with a safe default of `1000`; BTC starts at zero.
- Exact decimal balance queries, credits, and debits with insufficient-funds protection.
- Structured initialization and balance-change logs.
- Unit coverage for exact arithmetic, validation, full debits, insufficient funds, and service delegation.
- M2.1 domain and operational documentation.

### Changed

- The application module now initializes the paper-wallet module.
- Project context, roadmap, current state, decisions, keyword map, and README now reflect completion of M1 and M2.1.

### Scope confirmation

- No persistence, HTTP endpoint, valuation, BRL conversion, order, execution, fee, spread/slippage simulation, PnL, strategy, authenticated integration, or real trading was introduced.

## 2026-09-11 — M1.8 Binance public pair metadata completed

### Added

- Public, unauthenticated Binance Spot BTC/USDT exchange-information request at module startup.
- Provider-neutral pair-metadata contract with status, assets, price filter, lot-size filter, and minimum notional.
- HTTPS-only `BINANCE_REST_BASE_URL` configuration with the Binance public-data endpoint as its safe default.
- Ten-second request timeout, strict payload validation, structured logging, and startup failure isolation.
- Unit coverage for both supported notional filters, invalid metadata, endpoint construction, HTTP failure, and lifecycle behavior.
- M1.8 operational and domain documentation.

### Changed

- The market-data module now loads one pair-metadata snapshot independently of the existing live streams.
- Corrected repository-state documentation after M1.7 was committed.

### Scope confirmation

- No dependency, metadata refresh, cache, persistence, order validation, authentication, wallet, strategy, or order execution was introduced.

## 2026-09-11 — M1.7 deterministic spread calculation completed

### Added

- `decimal.js` as the explicit arbitrary-precision strategy for financial arithmetic.
- Provider-neutral `MarketSpread` with absolute spread, midpoint, and spread basis points.
- Deterministic `SpreadCalculator` with precision 40 and half-even rounding to eight basis-point decimal places.
- Structured `market.spread.calculated` logs derived from live top-of-book updates.
- Unit coverage for exact decimal arithmetic, locked and crossed books, and zero midpoint rejection.

### Changed

- The top-of-book lifecycle service now calculates spread after logging each normalized update.
- Updated project context, roadmap, state, decision, operation, and keyword-map documentation for M1.7.

### Scope confirmation

- No new WebSocket, multi-level depth, snapshot, persistence, authentication, wallet, strategy, or order execution was introduced.

## 2026-09-11 — M1.6 Binance public top of book completed

### Added

- Public, unauthenticated Binance Spot `btcusdt@bookTicker` WebSocket client.
- Provider-neutral top-of-book stream contract and `MarketTopOfBook` domain type.
- Best bid and ask prices and quantities, provider update ID, and receipt time.
- Structured `market.top_of_book.received` and `market.top_of_book.reconnect_scheduled` logs.
- Unit coverage for normalization, invalid payloads, delivery, lifecycle, reconnection reset, and shutdown cancellation.
- M1.6 operational and domain documentation.

### Changed

- The market-data module now starts and stops an independent top-of-book stream.
- Corrected repository-state documentation after M1.5 was committed.

### Scope confirmation

- No dependency, spread calculation, multi-level depth, REST snapshot, persistence, authentication, wallet, strategy, or financial behavior was introduced.

## 2026-09-11 — M1.5 candle volume completed

### Added

- Base and quote volume on normalized one-minute candles.
- Taker-buy base and quote volume on normalized one-minute candles.
- Per-candle trade count.
- Normalization and structured logging coverage for all new fields.

### Changed

- `MarketCandle` now carries the already validated volume fields from the Binance kline payload.
- Corrected repository-state documentation after M1.4 was committed.

### Scope confirmation

- No connection, dependency, persistence, aggregation, arithmetic, indicator, order book, spread, authentication, or financial behavior was introduced.

## 2026-09-11 — M1.4 Binance public one-minute candles completed

### Added

- Public, unauthenticated Binance Spot `btcusdt@kline_1m` WebSocket client.
- Provider-neutral candle stream contract and normalized `MarketCandle` domain type.
- OHLC decimal strings, UTC candle boundaries, and candle close state.
- Structured `market.candle.received` and `market.candle.reconnect_scheduled` logs.
- Unit coverage for normalization, close state, invalid payloads, message delivery, lifecycle, reconnection reset, and shutdown cancellation.
- M1.4 operational and domain documentation.

### Changed

- The market-data module now starts and stops independent trade, mini ticker, and one-minute candle streams.
- Corrected repository-state documentation after M1.3 was committed.

### Scope confirmation

- Volume, taker volume, trade IDs, and trade count are validated but not exposed to the domain.
- No dependency, authentication, persistence, historical retrieval, order book, spread, dashboard, wallet, strategy, or financial behavior was introduced.

## 2026-09-11 — M1.3 Binance public mini ticker completed

### Added

- Public, unauthenticated Binance Spot `btcusdt@miniTicker` WebSocket client.
- Provider-neutral ticker stream contract and minimal `MarketTicker` domain type.
- Structured `market.ticker.received` and `market.ticker.reconnect_scheduled` logs.
- Unit coverage for normalization, invalid payloads, message delivery, lifecycle, reconnection reset, and shutdown cancellation.
- M1.3 operational and domain documentation.

### Changed

- The market-data module now starts and stops independent public trade and mini ticker streams.
- Corrected repository-state documentation after M1.2 was committed.

### Scope confirmation

- Binance volume and rolling-window fields are validated but not exposed to the domain.
- No dependency, authentication, persistence, candles, order book, spread, dashboard, wallet, strategy, or financial behavior was introduced.

## 2026-09-11 — M1.2 WebSocket reconnection completed

### Added

- Automatic reconnection after unexpected Binance trade-stream closes.
- Exponential retry delay starting at one second and capped at 30 seconds.
- Structured `market.trade.reconnect_scheduled` logs with attempt and delay.
- Tests for increasing delays, reset after connection, timer cancellation, and shutdown behavior.

### Changed

- Successful WebSocket connections reset the retry sequence.
- Intentional application shutdown cancels pending retries and never opens a replacement socket.
- Corrected stale repository-state documentation after M0 and M1.1 were committed.

### Scope confirmation

- No new dependency, market-data type, persistence, authentication, or financial behavior was introduced.

## 2026-09-11 — M1.1 Binance public trades completed

### Added

- Public, unauthenticated Binance Spot `btcusdt@trade` WebSocket client.
- Provider-neutral trade stream contract and normalized `MarketTrade` domain type.
- Validation of Binance payload shape before it reaches the domain.
- Structured logging for normalized BTC/USDT trades.
- WebSocket shutdown through the NestJS module lifecycle.
- Unit coverage for payload normalization, taker-side mapping, invalid messages, and service lifecycle.
- M1.1 operational and domain documentation.

### Verified

- Eight unit tests across three suites, lint, formatting, and TypeScript build.
- Docker Compose API, PostgreSQL, and Redis health.
- Live public trades received from Binance with price and quantity preserved as decimal strings.

### Scope confirmation

- No authentication, credentials, persistence, ticker, candles, order book, paper trading, strategy, wallet, or order execution was added.

## 2026-09-11 — Documentation baseline

### Added

- Mandatory root project context and documentation index.
- Current-state, roadmap, technical-decisions, and keyword-map documents.
- Documentation workflow rules in `AGENTS.md`.

## 2026-09-11 — M0 bootstrap completed

### Added

- NestJS application with strict TypeScript configuration.
- Validated environment configuration.
- Prisma/PostgreSQL and Redis infrastructure modules.
- Health endpoint with PostgreSQL and Redis checks.
- Redis shutdown lifecycle handling.
- Dockerfile and Docker Compose stack for API, PostgreSQL, and Redis.
- ESLint, Prettier, unit-test, E2E-test, and build configuration.
- Safe environment example, ignore files, and initial README.

### Fixed

- Reconciled an interrupted Prisma installation on version 7.10 and declared the PostgreSQL adapter/driver dependencies.
- Configured Jest for the ESM packages used by NestJS 12.
- Changed the PostgreSQL host mapping to `5433` to avoid conflict with another local project on `5432`.
- Prevented the Redis connection from keeping E2E test processes open after application shutdown.

### Verified

- Build, lint, unit tests, E2E test, Compose configuration, and live health response.

### Security notes

- No Binance API, credentials, wallet, or trading execution was introduced.
- Dependency audit findings were recorded for later review; no forced breaking upgrade was applied.

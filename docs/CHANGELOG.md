# Changelog

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

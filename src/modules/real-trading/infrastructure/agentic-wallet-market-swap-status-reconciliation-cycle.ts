import {
  AgenticWalletMarketSwapStatusReconciliationAttempt,
  AgenticWalletMarketSwapStatusReconciliationAttemptResult,
} from './agentic-wallet-market-swap-status-reconciliation-attempt';
import { validateAndSnapshotStatusReconciliationAttemptResult } from './agentic-wallet-market-swap-status-reconciliation-attempt-result';
import {
  AgenticWalletMarketSwapStatusReconciliationCandidate,
  AgenticWalletMarketSwapStatusReconciliationCandidateStore,
  ListDueAgenticWalletMarketSwapStatusReconciliationCandidatesInput,
  isValidStatusReconciliationCandidate,
  validateStatusReconciliationCandidateInput,
} from './agentic-wallet-market-swap-status-reconciliation-candidate.store';

export interface AgenticWalletMarketSwapStatusReconciliationCycleOutcome {
  readonly candidate: AgenticWalletMarketSwapStatusReconciliationCandidate;
  readonly attempt: AgenticWalletMarketSwapStatusReconciliationAttemptResult;
}

export interface AgenticWalletMarketSwapStatusReconciliationCycleResult {
  readonly scope: 'agentic_wallet_market_swap_status_reconciliation_cycle';
  readonly status: 'completed' | 'blocked';
  readonly blockers:
    readonly [] | readonly ['reconciliation_cycle_in_progress'];
  readonly evaluatedAt: Date;
  readonly minimumLookupIntervalMs: number;
  readonly limit: number;
  readonly candidateCount: number;
  readonly attemptedCount: number;
  readonly observationRecordedCount: number;
  readonly lookupDeferredCount: number;
  readonly lookupNotRequiredCount: number;
  readonly invalidResponseCount: number;
  readonly blockedCount: number;
  readonly outcomes: readonly AgenticWalletMarketSwapStatusReconciliationCycleOutcome[];
  readonly automaticRetryPerformed: false;
  readonly financialReconciliationComplete: false;
  readonly submissionRetryAllowed: false;
}

export class AgenticWalletMarketSwapStatusReconciliationCycle {
  private active = false;

  constructor(
    private readonly candidateStore: AgenticWalletMarketSwapStatusReconciliationCandidateStore,
    private readonly attempt: Pick<
      AgenticWalletMarketSwapStatusReconciliationAttempt,
      'reconcileOnce'
    >,
  ) {}

  async runOnce(
    input: ListDueAgenticWalletMarketSwapStatusReconciliationCandidatesInput,
    signal?: AbortSignal,
  ): Promise<AgenticWalletMarketSwapStatusReconciliationCycleResult> {
    validateStatusReconciliationCandidateInput(input);
    const cycleInput = snapshotCycleInput(input);
    if (this.active) {
      return cycleResult(cycleInput, [], 'blocked', [
        'reconciliation_cycle_in_progress',
      ]);
    }

    this.active = true;
    try {
      signal?.throwIfAborted();
      const candidates = await this.candidateStore.listDue(
        snapshotCycleInput(cycleInput),
      );
      signal?.throwIfAborted();
      validateCandidateBatch(candidates, cycleInput);
      const cycleCandidates = snapshotCandidateBatch(candidates);

      const outcomes: AgenticWalletMarketSwapStatusReconciliationCycleOutcome[] =
        [];
      for (const candidate of cycleCandidates) {
        signal?.throwIfAborted();
        const attemptResult = await this.attempt.reconcileOnce(
          candidate.gateId,
          signal,
        );
        signal?.throwIfAborted();
        const attempt = validateAndSnapshotStatusReconciliationAttemptResult(
          attemptResult,
          candidate,
        );
        outcomes.push({ candidate, attempt });
      }

      return cycleResult(cycleInput, outcomes, 'completed', []);
    } finally {
      this.active = false;
    }
  }
}

function snapshotCandidateBatch(
  candidates: readonly AgenticWalletMarketSwapStatusReconciliationCandidate[],
): AgenticWalletMarketSwapStatusReconciliationCandidate[] {
  return candidates.map((candidate) => ({
    scope: candidate.scope,
    providerId: candidate.providerId,
    gateId: candidate.gateId,
    providerOrderId: candidate.providerOrderId,
    phase: candidate.phase,
    receiptRecordedAt: new Date(candidate.receiptRecordedAt),
    latestObservationId: candidate.latestObservationId,
    latestObservationRecordedAt:
      candidate.latestObservationRecordedAt === null
        ? null
        : new Date(candidate.latestObservationRecordedAt),
    eligibleAt: new Date(candidate.eligibleAt),
    evaluatedAt: new Date(candidate.evaluatedAt),
    statusLookupRequired: candidate.statusLookupRequired,
    financialReconciliationRequired: candidate.financialReconciliationRequired,
    financialReconciliationComplete: candidate.financialReconciliationComplete,
    submissionRetryAllowed: candidate.submissionRetryAllowed,
  }));
}

function snapshotCycleInput(
  input: ListDueAgenticWalletMarketSwapStatusReconciliationCandidatesInput,
): ListDueAgenticWalletMarketSwapStatusReconciliationCandidatesInput {
  return {
    evaluatedAt: new Date(input.evaluatedAt),
    minimumLookupIntervalMs: input.minimumLookupIntervalMs,
    limit: input.limit,
  };
}

function cycleResult(
  input: ListDueAgenticWalletMarketSwapStatusReconciliationCandidatesInput,
  outcomes: readonly AgenticWalletMarketSwapStatusReconciliationCycleOutcome[],
  status: AgenticWalletMarketSwapStatusReconciliationCycleResult['status'],
  blockers: AgenticWalletMarketSwapStatusReconciliationCycleResult['blockers'],
): AgenticWalletMarketSwapStatusReconciliationCycleResult {
  return {
    scope: 'agentic_wallet_market_swap_status_reconciliation_cycle',
    status,
    blockers,
    evaluatedAt: new Date(input.evaluatedAt),
    minimumLookupIntervalMs: input.minimumLookupIntervalMs,
    limit: input.limit,
    candidateCount: outcomes.length,
    attemptedCount: outcomes.length,
    observationRecordedCount: countStatus(
      outcomes,
      'status_observation_recorded',
    ),
    lookupDeferredCount: countStatus(outcomes, 'status_lookup_deferred'),
    lookupNotRequiredCount: countStatus(outcomes, 'status_lookup_not_required'),
    invalidResponseCount: countStatus(outcomes, 'status_response_invalid'),
    blockedCount: countStatus(outcomes, 'blocked'),
    outcomes,
    automaticRetryPerformed: false,
    financialReconciliationComplete: false,
    submissionRetryAllowed: false,
  };
}

function validateCandidateBatch(
  candidates: readonly AgenticWalletMarketSwapStatusReconciliationCandidate[],
  input: ListDueAgenticWalletMarketSwapStatusReconciliationCandidatesInput,
): void {
  if (!Array.isArray(candidates) || candidates.length > input.limit) {
    throw new Error(
      'Agentic Wallet status reconciliation candidate batch is invalid',
    );
  }
  const candidateBatch =
    candidates as readonly AgenticWalletMarketSwapStatusReconciliationCandidate[];
  const gateIds = new Set<string>();
  let previous: AgenticWalletMarketSwapStatusReconciliationCandidate | null =
    null;
  for (const candidate of candidateBatch) {
    if (
      !isValidStatusReconciliationCandidate(candidate) ||
      candidate.evaluatedAt.getTime() !== input.evaluatedAt.getTime() ||
      (candidate.phase === 'provider_pending' &&
        candidate.eligibleAt.getTime() !==
          candidate.latestObservationRecordedAt!.getTime() +
            input.minimumLookupIntervalMs) ||
      gateIds.has(candidate.gateId) ||
      (previous !== null && !isCanonicalSuccessor(previous, candidate))
    ) {
      throw new Error(
        'Agentic Wallet status reconciliation candidate batch is invalid',
      );
    }
    gateIds.add(candidate.gateId);
    previous = candidate;
  }
}

function isCanonicalSuccessor(
  previous: AgenticWalletMarketSwapStatusReconciliationCandidate,
  candidate: AgenticWalletMarketSwapStatusReconciliationCandidate,
): boolean {
  const previousEligibleAt = previous.eligibleAt.getTime();
  const candidateEligibleAt = candidate.eligibleAt.getTime();
  return (
    candidateEligibleAt > previousEligibleAt ||
    (candidateEligibleAt === previousEligibleAt &&
      candidate.gateId > previous.gateId)
  );
}

function countStatus(
  outcomes: readonly AgenticWalletMarketSwapStatusReconciliationCycleOutcome[],
  status: AgenticWalletMarketSwapStatusReconciliationAttemptResult['status'],
): number {
  return outcomes.filter((outcome) => outcome.attempt.status === status).length;
}

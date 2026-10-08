import {
  AgenticWalletMarketSwapStatusReconciliationAttemptBlocker,
  AgenticWalletMarketSwapStatusReconciliationAttemptResult,
} from './agentic-wallet-market-swap-status-reconciliation-attempt';
import { AgenticWalletMarketSwapStatusReconciliationCandidate } from './agentic-wallet-market-swap-status-reconciliation-candidate.store';
import {
  AGENTIC_WALLET_MARKET_SWAP_STATUS_RESPONSE_BLOCKER_ORDER,
  AgenticWalletMarketSwapStatusResponseBlocker,
  isCoherentAgenticWalletMarketSwapStatusResponseBlockerList,
  isValidAgenticWalletMarketSwapStatusObservation,
} from './agentic-wallet-market-swap-status-response';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ATTEMPT_BLOCKERS =
  new Set<AgenticWalletMarketSwapStatusReconciliationAttemptBlocker>([
    'reconciliation_attempt_in_progress',
    'invalid_submission_gate',
    'invalid_submission_receipt',
    'invalid_submission_receipt_timing',
    'gate_receipt_mismatch',
    'reconciliation_context_not_found',
    'invalid_reconciliation_state',
    'reconciliation_evidence_mismatch',
    'invalid_evaluation_time',
    'invalid_minimum_lookup_interval',
    'invalid_response_envelope',
    'provider_reported_failure',
    'invalid_order_lookup_payload',
    'order_identity_mismatch',
    'order_payload_mismatch',
    'invalid_order_status',
    'invalid_order_timestamps',
    'invalid_transaction_hash',
  ]);
const PRE_PROVIDER_BLOCKERS =
  new Set<AgenticWalletMarketSwapStatusReconciliationAttemptBlocker>([
    'reconciliation_attempt_in_progress',
    'invalid_submission_gate',
    'invalid_submission_receipt',
    'invalid_submission_receipt_timing',
    'gate_receipt_mismatch',
    'reconciliation_context_not_found',
    'invalid_reconciliation_state',
    'reconciliation_evidence_mismatch',
    'invalid_evaluation_time',
    'invalid_minimum_lookup_interval',
  ]);
const STATUS_RESPONSE_BLOCKERS =
  new Set<AgenticWalletMarketSwapStatusReconciliationAttemptBlocker>(
    AGENTIC_WALLET_MARKET_SWAP_STATUS_RESPONSE_BLOCKER_ORDER,
  );

export function validateAndSnapshotStatusReconciliationAttemptResult(
  result: AgenticWalletMarketSwapStatusReconciliationAttemptResult,
  candidate: AgenticWalletMarketSwapStatusReconciliationCandidate,
): AgenticWalletMarketSwapStatusReconciliationAttemptResult {
  if (!isValidAttemptResult(result, candidate)) {
    throw new Error(
      'Agentic Wallet status reconciliation attempt result is invalid',
    );
  }
  return snapshotAttemptResult(result);
}

function isValidAttemptResult(
  result: AgenticWalletMarketSwapStatusReconciliationAttemptResult,
  candidate: AgenticWalletMarketSwapStatusReconciliationCandidate,
): boolean {
  if (
    typeof result !== 'object' ||
    result === null ||
    result.scope !==
      'agentic_wallet_market_swap_status_reconciliation_attempt' ||
    !Array.isArray(result.blockers) ||
    new Set(result.blockers).size !== result.blockers.length ||
    result.blockers.some(
      (blocker: unknown) => !isAttemptResultBlocker(blocker),
    ) ||
    typeof result.observationReplayed !== 'boolean' ||
    typeof result.providerCallStarted !== 'boolean' ||
    typeof result.providerCallCompleted !== 'boolean' ||
    typeof result.statusLookupRequired !== 'boolean' ||
    result.financialReconciliationRequired !== true ||
    result.financialReconciliationComplete !== false ||
    result.submissionRetryAllowed !== false ||
    !isValidOptionalDate(result.evaluatedAt) ||
    !isValidOptionalDate(result.nextStatusLookupAt)
  ) {
    return false;
  }

  const noProviderWork =
    !result.providerCallStarted && !result.providerCallCompleted;
  const noObservation =
    result.storedObservation === null && !result.observationReplayed;
  const noTiming =
    result.evaluatedAt === null && result.nextStatusLookupAt === null;

  if (result.status === 'blocked') {
    return (
      result.blockers.length === 1 &&
      result.blockers.every(isPreProviderBlocker) &&
      noProviderWork &&
      noObservation &&
      noTiming &&
      !result.statusLookupRequired
    );
  }
  if (result.status === 'status_lookup_not_required') {
    return (
      result.blockers.length === 0 &&
      noProviderWork &&
      noObservation &&
      noTiming &&
      !result.statusLookupRequired
    );
  }
  if (result.status === 'status_lookup_deferred') {
    return (
      result.blockers.length === 0 &&
      noProviderWork &&
      noObservation &&
      result.statusLookupRequired &&
      result.evaluatedAt !== null &&
      result.nextStatusLookupAt !== null &&
      isAttemptEvaluationAfterDiscovery(result, candidate) &&
      result.nextStatusLookupAt.getTime() > result.evaluatedAt.getTime()
    );
  }
  if (result.status === 'status_response_invalid') {
    return (
      result.blockers.length > 0 &&
      result.blockers.every(isStatusResponseBlocker) &&
      isCoherentAgenticWalletMarketSwapStatusResponseBlockerList(
        result.blockers as readonly AgenticWalletMarketSwapStatusResponseBlocker[],
      ) &&
      result.providerCallStarted &&
      result.providerCallCompleted &&
      noObservation &&
      result.statusLookupRequired &&
      result.evaluatedAt !== null &&
      isProviderCallTemporallyAdmitted(result, candidate)
    );
  }
  if (result.status !== 'status_observation_recorded') return false;

  const stored = result.storedObservation;
  return (
    result.blockers.length === 0 &&
    result.providerCallStarted &&
    result.providerCallCompleted &&
    result.evaluatedAt !== null &&
    isProviderCallTemporallyAdmitted(result, candidate) &&
    stored !== null &&
    UUID_PATTERN.test(stored.id) &&
    isValidDate(stored.recordedAt) &&
    (result.observationReplayed ||
      stored.recordedAt.getTime() >= result.evaluatedAt.getTime()) &&
    isValidAgenticWalletMarketSwapStatusObservation(stored.observation) &&
    stored.observation.gateId === candidate.gateId &&
    stored.observation.providerOrderId === candidate.providerOrderId &&
    isStoredObservationIdentityCoherent(result, candidate) &&
    result.statusLookupRequired === stored.observation.statusLookupRequired
  );
}

function isStoredObservationIdentityCoherent(
  result: AgenticWalletMarketSwapStatusReconciliationAttemptResult,
  candidate: AgenticWalletMarketSwapStatusReconciliationCandidate,
): boolean {
  const stored = result.storedObservation!;
  if (!result.observationReplayed) {
    return stored.id !== candidate.latestObservationId;
  }
  if (stored.id !== candidate.latestObservationId) return true;
  return (
    candidate.phase === 'provider_pending' &&
    candidate.latestObservationRecordedAt !== null &&
    stored.recordedAt.getTime() ===
      candidate.latestObservationRecordedAt.getTime() &&
    stored.observation.providerStatus === 'PENDING'
  );
}

function isPreProviderBlocker(
  blocker: AgenticWalletMarketSwapStatusReconciliationAttemptBlocker,
): boolean {
  return PRE_PROVIDER_BLOCKERS.has(blocker);
}

function isStatusResponseBlocker(
  blocker: AgenticWalletMarketSwapStatusReconciliationAttemptBlocker,
): boolean {
  return STATUS_RESPONSE_BLOCKERS.has(blocker);
}

function isProviderCallTemporallyAdmitted(
  result: AgenticWalletMarketSwapStatusReconciliationAttemptResult,
  candidate: AgenticWalletMarketSwapStatusReconciliationCandidate,
): boolean {
  return (
    result.evaluatedAt!.getTime() >= candidate.eligibleAt.getTime() &&
    isAttemptEvaluationAfterDiscovery(result, candidate) &&
    isCandidateCadenceEvidenceCoherent(result, candidate) &&
    isAdmittedLookupTime(result)
  );
}

function isCandidateCadenceEvidenceCoherent(
  result: AgenticWalletMarketSwapStatusReconciliationAttemptResult,
  candidate: AgenticWalletMarketSwapStatusReconciliationCandidate,
): boolean {
  if (candidate.phase === 'awaiting_status_observation') {
    return result.nextStatusLookupAt === null;
  }
  return (
    result.nextStatusLookupAt !== null &&
    result.nextStatusLookupAt.getTime() >= candidate.eligibleAt.getTime()
  );
}

function isAttemptEvaluationAfterDiscovery(
  result: AgenticWalletMarketSwapStatusReconciliationAttemptResult,
  candidate: AgenticWalletMarketSwapStatusReconciliationCandidate,
): boolean {
  return result.evaluatedAt!.getTime() >= candidate.evaluatedAt.getTime();
}

function isAttemptResultBlocker(
  value: unknown,
): value is AgenticWalletMarketSwapStatusReconciliationAttemptBlocker {
  return (
    typeof value === 'string' &&
    ATTEMPT_BLOCKERS.has(
      value as AgenticWalletMarketSwapStatusReconciliationAttemptBlocker,
    )
  );
}

function isAdmittedLookupTime(
  result: AgenticWalletMarketSwapStatusReconciliationAttemptResult,
): boolean {
  return (
    result.nextStatusLookupAt === null ||
    result.nextStatusLookupAt.getTime() <= result.evaluatedAt!.getTime()
  );
}

function snapshotAttemptResult(
  result: AgenticWalletMarketSwapStatusReconciliationAttemptResult,
): AgenticWalletMarketSwapStatusReconciliationAttemptResult {
  const stored = result.storedObservation;
  return {
    scope: result.scope,
    status: result.status,
    blockers: [...result.blockers],
    storedObservation:
      stored === null
        ? null
        : {
            id: stored.id,
            observation: {
              kind: stored.observation.kind,
              providerId: stored.observation.providerId,
              gateId: stored.observation.gateId,
              providerOrderId: stored.observation.providerOrderId,
              providerStatus: stored.observation.providerStatus,
              transactionHash: stored.observation.transactionHash,
              bookedAt: new Date(stored.observation.bookedAt),
              updatedAt: new Date(stored.observation.updatedAt),
              terminal: stored.observation.terminal,
              executionSucceeded: stored.observation.executionSucceeded,
              statusLookupRequired: stored.observation.statusLookupRequired,
              financialReconciliationRequired: true,
              financialReconciliationComplete: false,
              actualReceivedQuantity: null,
              submissionRetryAllowed: false,
            },
            recordedAt: new Date(stored.recordedAt),
          },
    observationReplayed: result.observationReplayed,
    evaluatedAt:
      result.evaluatedAt === null ? null : new Date(result.evaluatedAt),
    nextStatusLookupAt:
      result.nextStatusLookupAt === null
        ? null
        : new Date(result.nextStatusLookupAt),
    providerCallStarted: result.providerCallStarted,
    providerCallCompleted: result.providerCallCompleted,
    statusLookupRequired: result.statusLookupRequired,
    financialReconciliationRequired: true,
    financialReconciliationComplete: false,
    submissionRetryAllowed: false,
  };
}

function isValidOptionalDate(value: Date | null): boolean {
  return value === null || isValidDate(value);
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

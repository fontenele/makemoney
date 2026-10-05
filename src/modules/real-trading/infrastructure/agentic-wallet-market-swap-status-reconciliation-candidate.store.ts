import {
  MAXIMUM_STATUS_LOOKUP_INTERVAL_MS,
  MINIMUM_STATUS_LOOKUP_INTERVAL_MS,
} from './agentic-wallet-market-swap-status-lookup-cadence';
import { isSafeAgenticWalletProviderOrderId } from './agentic-wallet-market-swap-submission-response';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export const MAXIMUM_STATUS_RECONCILIATION_CANDIDATE_LIMIT = 100;

export interface AgenticWalletMarketSwapStatusReconciliationCandidate {
  readonly scope: 'agentic_wallet_market_swap_status_reconciliation_candidate';
  readonly providerId: 'agentic_wallet';
  readonly gateId: string;
  readonly providerOrderId: string;
  readonly phase: 'awaiting_status_observation' | 'provider_pending';
  readonly receiptRecordedAt: Date;
  readonly latestObservationId: string | null;
  readonly latestObservationRecordedAt: Date | null;
  readonly eligibleAt: Date;
  readonly evaluatedAt: Date;
  readonly statusLookupRequired: true;
  readonly financialReconciliationRequired: true;
  readonly financialReconciliationComplete: false;
  readonly submissionRetryAllowed: false;
}

export interface ListDueAgenticWalletMarketSwapStatusReconciliationCandidatesInput {
  readonly evaluatedAt: Date;
  readonly minimumLookupIntervalMs: number;
  readonly limit: number;
}

export interface AgenticWalletMarketSwapStatusReconciliationCandidateStore {
  listDue(
    input: ListDueAgenticWalletMarketSwapStatusReconciliationCandidatesInput,
  ): Promise<AgenticWalletMarketSwapStatusReconciliationCandidate[]>;
}

export type AgenticWalletMarketSwapStatusReconciliationCandidateInputBlocker =
  | 'invalid_evaluation_time'
  | 'invalid_minimum_lookup_interval'
  | 'invalid_limit';

export class AgenticWalletMarketSwapStatusReconciliationCandidateInputError extends Error {
  constructor(
    readonly blocker: AgenticWalletMarketSwapStatusReconciliationCandidateInputBlocker,
  ) {
    super(
      `Agentic Wallet status reconciliation candidate input blocked: ${blocker}`,
    );
    this.name =
      AgenticWalletMarketSwapStatusReconciliationCandidateInputError.name;
  }
}

export function validateStatusReconciliationCandidateInput(
  input: ListDueAgenticWalletMarketSwapStatusReconciliationCandidatesInput,
): void {
  if (
    !(input.evaluatedAt instanceof Date) ||
    !Number.isFinite(input.evaluatedAt.getTime())
  ) {
    throw new AgenticWalletMarketSwapStatusReconciliationCandidateInputError(
      'invalid_evaluation_time',
    );
  }
  if (
    !Number.isSafeInteger(input.minimumLookupIntervalMs) ||
    input.minimumLookupIntervalMs < MINIMUM_STATUS_LOOKUP_INTERVAL_MS ||
    input.minimumLookupIntervalMs > MAXIMUM_STATUS_LOOKUP_INTERVAL_MS
  ) {
    throw new AgenticWalletMarketSwapStatusReconciliationCandidateInputError(
      'invalid_minimum_lookup_interval',
    );
  }
  if (
    !Number.isSafeInteger(input.limit) ||
    input.limit < 1 ||
    input.limit > MAXIMUM_STATUS_RECONCILIATION_CANDIDATE_LIMIT
  ) {
    throw new AgenticWalletMarketSwapStatusReconciliationCandidateInputError(
      'invalid_limit',
    );
  }
}

export function isValidStatusReconciliationCandidate(
  candidate: AgenticWalletMarketSwapStatusReconciliationCandidate,
): boolean {
  if (
    typeof candidate !== 'object' ||
    candidate === null ||
    candidate.scope !==
      'agentic_wallet_market_swap_status_reconciliation_candidate' ||
    candidate.providerId !== 'agentic_wallet' ||
    !UUID_PATTERN.test(candidate.gateId) ||
    !isSafeAgenticWalletProviderOrderId(candidate.providerOrderId) ||
    !isValidDate(candidate.receiptRecordedAt) ||
    !isValidDate(candidate.eligibleAt) ||
    !isValidDate(candidate.evaluatedAt) ||
    candidate.receiptRecordedAt.getTime() > candidate.eligibleAt.getTime() ||
    candidate.eligibleAt.getTime() > candidate.evaluatedAt.getTime() ||
    candidate.statusLookupRequired !== true ||
    candidate.financialReconciliationRequired !== true ||
    candidate.financialReconciliationComplete !== false ||
    candidate.submissionRetryAllowed !== false
  ) {
    return false;
  }
  if (candidate.phase === 'awaiting_status_observation') {
    return (
      candidate.latestObservationId === null &&
      candidate.latestObservationRecordedAt === null &&
      candidate.eligibleAt.getTime() === candidate.receiptRecordedAt.getTime()
    );
  }
  return (
    candidate.phase === 'provider_pending' &&
    UUID_PATTERN.test(candidate.latestObservationId ?? '') &&
    isValidDate(candidate.latestObservationRecordedAt) &&
    candidate.latestObservationRecordedAt.getTime() >=
      candidate.receiptRecordedAt.getTime() &&
    candidate.eligibleAt.getTime() >=
      candidate.latestObservationRecordedAt.getTime()
  );
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

import {
  MAXIMUM_STATUS_LOOKUP_INTERVAL_MS,
  MINIMUM_STATUS_LOOKUP_INTERVAL_MS,
} from './agentic-wallet-market-swap-status-lookup-cadence';

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

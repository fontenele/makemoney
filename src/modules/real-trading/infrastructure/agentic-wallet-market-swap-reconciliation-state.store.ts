import { AgenticWalletMarketSwapProviderStatus } from './agentic-wallet-market-swap-status-response';
import { isSafeAgenticWalletProviderOrderId } from './agentic-wallet-market-swap-submission-response';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const CANONICAL_EVM_TRANSACTION_HASH_PATTERN = /^0x[a-f0-9]{64}$/;

export type AgenticWalletMarketSwapReconciliationPhase =
  | 'awaiting_status_observation'
  | 'provider_pending'
  | 'provider_finished_financial_reconciliation_required'
  | 'provider_failed';

export interface AgenticWalletMarketSwapReconciliationState {
  readonly scope: 'agentic_wallet_market_swap_reconciliation_state';
  readonly providerId: 'agentic_wallet';
  readonly gateId: string;
  readonly providerOrderId: string;
  readonly phase: AgenticWalletMarketSwapReconciliationPhase;
  readonly providerStatus: AgenticWalletMarketSwapProviderStatus | null;
  readonly transactionHash: string | null;
  readonly receiptRecordedAt: Date;
  readonly latestObservationId: string | null;
  readonly latestObservationRecordedAt: Date | null;
  readonly terminal: boolean;
  readonly executionSucceeded: boolean;
  readonly statusLookupRequired: boolean;
  readonly financialReconciliationRequired: true;
  readonly financialReconciliationComplete: false;
  readonly actualReceivedQuantity: null;
  readonly submissionRetryAllowed: false;
}

export interface AgenticWalletMarketSwapReconciliationStateStore {
  getByGateId(
    gateId: string,
  ): Promise<AgenticWalletMarketSwapReconciliationState | null>;
}

export function isValidAgenticWalletMarketSwapReconciliationState(
  value: unknown,
): value is AgenticWalletMarketSwapReconciliationState {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const state = value as Record<string, unknown>;
  const receiptRecordedAt = state.receiptRecordedAt;
  const observationRecordedAt = state.latestObservationRecordedAt;
  const observationIdentityValid =
    typeof state.latestObservationId === 'string' &&
    UUID_PATTERN.test(state.latestObservationId) &&
    observationRecordedAt instanceof Date &&
    Number.isFinite(observationRecordedAt.getTime()) &&
    receiptRecordedAt instanceof Date &&
    observationRecordedAt.getTime() >= receiptRecordedAt.getTime();
  const transactionHashValid =
    state.transactionHash === null ||
    (typeof state.transactionHash === 'string' &&
      CANONICAL_EVM_TRANSACTION_HASH_PATTERN.test(state.transactionHash));
  const lifecycleValid =
    (state.phase === 'awaiting_status_observation' &&
      state.providerStatus === null &&
      state.transactionHash === null &&
      state.latestObservationId === null &&
      state.latestObservationRecordedAt === null &&
      state.terminal === false &&
      state.executionSucceeded === false &&
      state.statusLookupRequired === true) ||
    (state.phase === 'provider_pending' &&
      state.providerStatus === 'PENDING' &&
      observationIdentityValid &&
      transactionHashValid &&
      state.terminal === false &&
      state.executionSucceeded === false &&
      state.statusLookupRequired === true) ||
    (state.phase === 'provider_finished_financial_reconciliation_required' &&
      state.providerStatus === 'FINISHED' &&
      observationIdentityValid &&
      typeof state.transactionHash === 'string' &&
      CANONICAL_EVM_TRANSACTION_HASH_PATTERN.test(state.transactionHash) &&
      state.terminal === true &&
      state.executionSucceeded === true &&
      state.statusLookupRequired === false) ||
    (state.phase === 'provider_failed' &&
      state.providerStatus === 'FAILED' &&
      observationIdentityValid &&
      transactionHashValid &&
      state.terminal === true &&
      state.executionSucceeded === false &&
      state.statusLookupRequired === false);

  return (
    state.scope === 'agentic_wallet_market_swap_reconciliation_state' &&
    state.providerId === 'agentic_wallet' &&
    typeof state.gateId === 'string' &&
    UUID_PATTERN.test(state.gateId) &&
    isSafeAgenticWalletProviderOrderId(state.providerOrderId) &&
    receiptRecordedAt instanceof Date &&
    Number.isFinite(receiptRecordedAt.getTime()) &&
    lifecycleValid &&
    state.financialReconciliationRequired === true &&
    state.financialReconciliationComplete === false &&
    state.actualReceivedQuantity === null &&
    state.submissionRetryAllowed === false
  );
}

export class AgenticWalletMarketSwapReconciliationStateIdentityError extends Error {
  constructor() {
    super('Agentic Wallet market-swap reconciliation gate identity is invalid');
    this.name = AgenticWalletMarketSwapReconciliationStateIdentityError.name;
  }
}

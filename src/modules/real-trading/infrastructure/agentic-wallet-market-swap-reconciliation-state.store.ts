import { AgenticWalletMarketSwapProviderStatus } from './agentic-wallet-market-swap-status-response';

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

export class AgenticWalletMarketSwapReconciliationStateIdentityError extends Error {
  constructor() {
    super('Agentic Wallet market-swap reconciliation gate identity is invalid');
    this.name = AgenticWalletMarketSwapReconciliationStateIdentityError.name;
  }
}

import type { StoredRealExecutionSubmissionGate } from '../application/real-execution-submission-gate-store';
import type { AgenticWalletMarketSwapReconciliationState } from './agentic-wallet-market-swap-reconciliation-state.store';
import type { StoredAgenticWalletMarketSwapSubmissionReceipt } from './agentic-wallet-market-swap-submission-receipt.store';

export interface AgenticWalletMarketSwapStatusReconciliationContext {
  readonly gate: StoredRealExecutionSubmissionGate;
  readonly submissionReceipt: StoredAgenticWalletMarketSwapSubmissionReceipt;
  readonly reconciliationState: AgenticWalletMarketSwapReconciliationState;
}

export interface AgenticWalletMarketSwapStatusReconciliationContextStore {
  getByGateId(
    gateId: string,
  ): Promise<AgenticWalletMarketSwapStatusReconciliationContext | null>;
}

export class AgenticWalletMarketSwapStatusReconciliationContextIdentityError extends Error {
  constructor() {
    super('Agentic Wallet status reconciliation gate identity is invalid');
    this.name =
      AgenticWalletMarketSwapStatusReconciliationContextIdentityError.name;
  }
}

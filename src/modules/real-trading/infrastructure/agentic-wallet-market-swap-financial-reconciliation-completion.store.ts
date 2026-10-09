import { AgenticWalletMarketSwapFinancialReconciliationCompletion } from './agentic-wallet-market-swap-financial-reconciliation-completion';

export interface AgenticWalletMarketSwapFinancialReconciliationCompletionStore {
  getByGateId(
    gateId: string,
  ): Promise<AgenticWalletMarketSwapFinancialReconciliationCompletion | null>;
}

export class AgenticWalletMarketSwapFinancialReconciliationCompletionIdentityError extends Error {
  constructor() {
    super('Financial reconciliation completion gate identity is invalid');
    this.name =
      AgenticWalletMarketSwapFinancialReconciliationCompletionIdentityError.name;
  }
}

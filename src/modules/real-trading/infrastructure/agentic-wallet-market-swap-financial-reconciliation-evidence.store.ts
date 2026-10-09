import {
  AgenticWalletMarketSwapFinancialReconciliationEvidence,
  AgenticWalletMarketSwapFinancialReconciliationEvidenceBlocker,
} from './agentic-wallet-market-swap-financial-reconciliation-evidence';

export interface StoredAgenticWalletMarketSwapFinancialReconciliationEvidence {
  readonly id: string;
  readonly evidence: AgenticWalletMarketSwapFinancialReconciliationEvidence;
  readonly recordedAt: Date;
}

export interface AgenticWalletMarketSwapFinancialReconciliationEvidenceStore {
  record(
    evidence: AgenticWalletMarketSwapFinancialReconciliationEvidence,
  ): Promise<{
    stored: StoredAgenticWalletMarketSwapFinancialReconciliationEvidence;
    replayed: boolean;
  }>;
}

export class AgenticWalletMarketSwapFinancialReconciliationEvidenceBlockedError extends Error {
  constructor(
    readonly blockers: readonly AgenticWalletMarketSwapFinancialReconciliationEvidenceBlocker[],
  ) {
    super('Agentic Wallet financial reconciliation evidence is blocked');
    this.name =
      AgenticWalletMarketSwapFinancialReconciliationEvidenceBlockedError.name;
  }
}

export class AgenticWalletMarketSwapFinancialReconciliationEvidenceConflictError extends Error {
  constructor() {
    super('Financial reconciliation evidence already exists differently');
    this.name =
      AgenticWalletMarketSwapFinancialReconciliationEvidenceConflictError.name;
  }
}

export class AgenticWalletMarketSwapFinancialReconciliationContextNotFoundError extends Error {
  constructor() {
    super('Financial reconciliation durable context was not found');
    this.name =
      AgenticWalletMarketSwapFinancialReconciliationContextNotFoundError.name;
  }
}

import {
  AgenticWalletMarketSwapFinancialReconciliationEvidence,
  AgenticWalletMarketSwapFinancialReconciliationEvidenceBlocker,
  isValidAgenticWalletMarketSwapFinancialReconciliationEvidence,
} from './agentic-wallet-market-swap-financial-reconciliation-evidence';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

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

export function isValidStoredAgenticWalletMarketSwapFinancialReconciliationEvidence(
  value: unknown,
): value is StoredAgenticWalletMarketSwapFinancialReconciliationEvidence {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const stored = value as Record<string, unknown>;
  const evidence = stored.evidence;
  const recordedAt = stored.recordedAt;
  return (
    typeof stored.id === 'string' &&
    UUID_PATTERN.test(stored.id) &&
    isValidAgenticWalletMarketSwapFinancialReconciliationEvidence(
      evidence as AgenticWalletMarketSwapFinancialReconciliationEvidence,
    ) &&
    recordedAt instanceof Date &&
    Number.isFinite(recordedAt.getTime()) &&
    recordedAt.getTime() >=
      (
        evidence as AgenticWalletMarketSwapFinancialReconciliationEvidence
      ).observedAt.getTime()
  );
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

import {
  AgenticWalletMarketSwapAccountingBalanceEvidence,
  AgenticWalletMarketSwapAccountingBalanceEvidenceBlocker,
  isValidAgenticWalletMarketSwapAccountingBalanceEvidence,
} from './agentic-wallet-market-swap-accounting-balance-evidence';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export interface StoredAgenticWalletMarketSwapAccountingBalanceEvidence {
  readonly id: string;
  readonly evidence: AgenticWalletMarketSwapAccountingBalanceEvidence;
  readonly recordedAt: Date;
}

export interface AgenticWalletMarketSwapAccountingBalanceEvidenceStore {
  record(evidence: AgenticWalletMarketSwapAccountingBalanceEvidence): Promise<{
    stored: StoredAgenticWalletMarketSwapAccountingBalanceEvidence;
    replayed: boolean;
  }>;
}

export function isValidStoredAgenticWalletMarketSwapAccountingBalanceEvidence(
  value: unknown,
): value is StoredAgenticWalletMarketSwapAccountingBalanceEvidence {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const stored = value as Record<string, unknown>;
  const evidence = stored.evidence;
  const recordedAt = stored.recordedAt;
  return (
    typeof stored.id === 'string' &&
    UUID_PATTERN.test(stored.id) &&
    isValidAgenticWalletMarketSwapAccountingBalanceEvidence(
      evidence as AgenticWalletMarketSwapAccountingBalanceEvidence,
    ) &&
    recordedAt instanceof Date &&
    Number.isFinite(recordedAt.getTime()) &&
    recordedAt.getTime() >=
      (
        evidence as AgenticWalletMarketSwapAccountingBalanceEvidence
      ).observedAt.getTime()
  );
}

export class AgenticWalletMarketSwapAccountingBalanceEvidenceBlockedError extends Error {
  constructor(
    readonly blockers: readonly AgenticWalletMarketSwapAccountingBalanceEvidenceBlocker[],
  ) {
    super('Agentic Wallet accounting balance evidence is blocked');
    this.name =
      AgenticWalletMarketSwapAccountingBalanceEvidenceBlockedError.name;
  }
}

export class AgenticWalletMarketSwapAccountingBalanceEvidenceConflictError extends Error {
  constructor() {
    super('Accounting balance evidence already exists differently');
    this.name =
      AgenticWalletMarketSwapAccountingBalanceEvidenceConflictError.name;
  }
}

export class AgenticWalletMarketSwapAccountingBalanceCompletionNotFoundError extends Error {
  constructor() {
    super('Completed financial reconciliation was not found');
    this.name =
      AgenticWalletMarketSwapAccountingBalanceCompletionNotFoundError.name;
  }
}

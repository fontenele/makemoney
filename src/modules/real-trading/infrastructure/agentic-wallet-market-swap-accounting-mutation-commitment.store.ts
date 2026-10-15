import {
  AgenticWalletMarketSwapAccountingMutationCommitment,
  AgenticWalletMarketSwapAccountingMutationCommitmentBlocker,
  isValidAgenticWalletMarketSwapAccountingMutationCommitment,
} from './agentic-wallet-market-swap-accounting-mutation-commitment';

export interface StoredAgenticWalletMarketSwapAccountingMutationCommitment {
  readonly commitment: AgenticWalletMarketSwapAccountingMutationCommitment;
  readonly recordedAt: Date;
}

export interface AgenticWalletMarketSwapAccountingMutationCommitmentStore {
  record(
    commitment: AgenticWalletMarketSwapAccountingMutationCommitment,
  ): Promise<{
    stored: StoredAgenticWalletMarketSwapAccountingMutationCommitment;
    replayed: boolean;
  }>;
}

export function isValidStoredAgenticWalletMarketSwapAccountingMutationCommitment(
  value: unknown,
): value is StoredAgenticWalletMarketSwapAccountingMutationCommitment {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const stored = value as Record<string, unknown>;
  const commitment = stored.commitment;
  const recordedAt = stored.recordedAt;
  return (
    isValidAgenticWalletMarketSwapAccountingMutationCommitment(commitment) &&
    recordedAt instanceof Date &&
    Number.isFinite(recordedAt.getTime()) &&
    recordedAt.getTime() >= commitment.preparedAt.getTime()
  );
}

export class AgenticWalletMarketSwapAccountingMutationCommitmentBlockedError extends Error {
  constructor(
    readonly blockers: readonly AgenticWalletMarketSwapAccountingMutationCommitmentBlocker[],
  ) {
    super('Agentic Wallet accounting mutation commitment is blocked');
    this.name =
      AgenticWalletMarketSwapAccountingMutationCommitmentBlockedError.name;
  }
}

export class AgenticWalletMarketSwapAccountingMutationCommitmentConflictError extends Error {
  constructor() {
    super('Accounting mutation commitment already exists differently');
    this.name =
      AgenticWalletMarketSwapAccountingMutationCommitmentConflictError.name;
  }
}

export class AgenticWalletMarketSwapAccountingMutationEvidenceNotFoundError extends Error {
  constructor() {
    super('Durable accounting balance evidence was not found');
    this.name =
      AgenticWalletMarketSwapAccountingMutationEvidenceNotFoundError.name;
  }
}

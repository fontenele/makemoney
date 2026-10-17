import {
  AgenticWalletAccountingLedgerReconciliationCommitment,
  AgenticWalletAccountingLedgerReconciliationCommitmentBlocker,
  isValidAgenticWalletAccountingLedgerReconciliationCommitment,
} from './agentic-wallet-accounting-ledger-reconciliation-commitment';

export interface StoredAgenticWalletAccountingLedgerReconciliationCommitment {
  readonly commitment: AgenticWalletAccountingLedgerReconciliationCommitment;
  readonly recordedAt: Date;
}

export interface AgenticWalletAccountingLedgerReconciliationCommitmentStore {
  record(
    commitment: AgenticWalletAccountingLedgerReconciliationCommitment,
  ): Promise<{
    stored: StoredAgenticWalletAccountingLedgerReconciliationCommitment;
    replayed: boolean;
  }>;
}

export interface AgenticWalletAccountingLedgerReconciliationCommitmentReadStore {
  getByReconciliationId(
    reconciliationId: string,
  ): Promise<StoredAgenticWalletAccountingLedgerReconciliationCommitment | null>;
}

export interface AgenticWalletAccountingLedgerReconciliationCommitmentLatestReadStore {
  getLatestByInitializationId(
    initializationId: string,
  ): Promise<StoredAgenticWalletAccountingLedgerReconciliationCommitment | null>;
}

export function isValidStoredAgenticWalletAccountingLedgerReconciliationCommitment(
  value: unknown,
): value is StoredAgenticWalletAccountingLedgerReconciliationCommitment {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const stored = value as Record<string, unknown>;
  const commitment = stored.commitment;
  return (
    isValidAgenticWalletAccountingLedgerReconciliationCommitment(commitment) &&
    stored.recordedAt instanceof Date &&
    Number.isFinite(stored.recordedAt.getTime()) &&
    stored.recordedAt.getTime() >= commitment.preparedAt.getTime()
  );
}

export class AgenticWalletAccountingLedgerReconciliationCommitmentBlockedError extends Error {
  constructor(
    readonly blockers: readonly AgenticWalletAccountingLedgerReconciliationCommitmentBlocker[],
  ) {
    super(
      'Agentic Wallet accounting ledger reconciliation commitment is blocked',
    );
    this.name =
      AgenticWalletAccountingLedgerReconciliationCommitmentBlockedError.name;
  }
}

export class AgenticWalletAccountingLedgerReconciliationCommitmentConflictError extends Error {
  constructor() {
    super(
      'Accounting ledger reconciliation commitment already exists differently',
    );
    this.name =
      AgenticWalletAccountingLedgerReconciliationCommitmentConflictError.name;
  }
}

export class AgenticWalletAccountingLedgerReconciliationInitializationNotFoundError extends Error {
  constructor() {
    super('Durable accounting balance initialization was not found');
    this.name =
      AgenticWalletAccountingLedgerReconciliationInitializationNotFoundError.name;
  }
}

export class AgenticWalletAccountingLedgerReconciliationCommitmentIdentityError extends Error {
  constructor() {
    super('Accounting ledger reconciliation commitment identity is invalid');
    this.name =
      AgenticWalletAccountingLedgerReconciliationCommitmentIdentityError.name;
  }
}

export class AgenticWalletAccountingLedgerReconciliationInitializationIdentityError extends Error {
  constructor() {
    super(
      'Accounting ledger reconciliation initialization identity is invalid',
    );
    this.name =
      AgenticWalletAccountingLedgerReconciliationInitializationIdentityError.name;
  }
}

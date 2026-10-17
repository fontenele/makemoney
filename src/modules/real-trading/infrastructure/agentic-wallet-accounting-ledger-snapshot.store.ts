import { AgenticWalletAccountingLedgerSnapshot } from './agentic-wallet-accounting-ledger-snapshot';

export interface AgenticWalletAccountingLedgerSnapshotReadStore {
  getByInitializationId(
    initializationId: string,
    evaluatedAt: Date,
  ): Promise<AgenticWalletAccountingLedgerSnapshot | null>;
}

export class AgenticWalletAccountingLedgerSnapshotIdentityError extends Error {
  constructor() {
    super('Accounting ledger snapshot identity or evaluation time is invalid');
  }
}

export class AgenticWalletAccountingLedgerSnapshotInconsistentError extends Error {
  constructor() {
    super('Persisted accounting ledger snapshot is inconsistent');
  }
}

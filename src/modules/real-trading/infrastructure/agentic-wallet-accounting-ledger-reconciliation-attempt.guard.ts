import { AgenticWalletAccountingLedgerReconciliationAssessment } from './agentic-wallet-accounting-ledger-reconciliation';
import { assertValidAgenticWalletAccountingLedgerReconciliationAttemptRequest } from './agentic-wallet-accounting-ledger-reconciliation-attempt';

export interface AgenticWalletAccountingLedgerReconciliationAttemptPort {
  run(
    initializationId: string,
    maximumObservationAgeMs: number,
    signal?: AbortSignal,
  ): Promise<AgenticWalletAccountingLedgerReconciliationAssessment | null>;
}

export class AgenticWalletAccountingLedgerReconciliationAttemptInProgressError extends Error {
  constructor() {
    super('Accounting ledger reconciliation attempt is already in progress');
  }
}

export class AgenticWalletAccountingLedgerReconciliationAttemptGuard {
  private readonly activeInitializationIds = new Set<string>();

  constructor(
    private readonly attempt: AgenticWalletAccountingLedgerReconciliationAttemptPort,
  ) {}

  async run(
    initializationId: string,
    maximumObservationAgeMs: number,
    signal?: AbortSignal,
  ): Promise<AgenticWalletAccountingLedgerReconciliationAssessment | null> {
    assertValidAgenticWalletAccountingLedgerReconciliationAttemptRequest(
      initializationId,
      maximumObservationAgeMs,
    );
    if (this.activeInitializationIds.has(initializationId))
      throw new AgenticWalletAccountingLedgerReconciliationAttemptInProgressError();

    this.activeInitializationIds.add(initializationId);
    try {
      return await this.attempt.run(
        initializationId,
        maximumObservationAgeMs,
        signal,
      );
    } finally {
      this.activeInitializationIds.delete(initializationId);
    }
  }
}

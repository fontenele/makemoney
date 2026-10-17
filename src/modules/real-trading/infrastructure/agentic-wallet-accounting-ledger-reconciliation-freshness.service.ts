import {
  AgenticWalletAccountingLedgerReconciliationFreshnessAssessment,
  assessAgenticWalletAccountingLedgerReconciliationFreshness,
  isValidAgenticWalletAccountingLedgerReconciliationFreshnessRequest,
} from './agentic-wallet-accounting-ledger-reconciliation-freshness';
import { AgenticWalletAccountingLedgerReconciliationCommitmentReadStore } from './agentic-wallet-accounting-ledger-reconciliation-commitment.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export interface AgenticWalletAccountingLedgerReconciliationFreshnessRequest {
  readonly maximumAgeMs: number;
  readonly evaluatedAt: Date;
}

export class AgenticWalletAccountingLedgerReconciliationFreshnessRequestError extends Error {
  constructor() {
    super('Accounting ledger reconciliation freshness request is invalid');
    this.name =
      AgenticWalletAccountingLedgerReconciliationFreshnessRequestError.name;
  }
}

export class AgenticWalletAccountingLedgerReconciliationFreshnessService {
  constructor(
    private readonly store: AgenticWalletAccountingLedgerReconciliationCommitmentReadStore,
  ) {}

  async assess(
    reconciliationId: string,
    request: AgenticWalletAccountingLedgerReconciliationFreshnessRequest,
  ): Promise<AgenticWalletAccountingLedgerReconciliationFreshnessAssessment | null> {
    if (
      typeof reconciliationId !== 'string' ||
      !UUID_PATTERN.test(reconciliationId) ||
      typeof request !== 'object' ||
      request === null ||
      !isValidAgenticWalletAccountingLedgerReconciliationFreshnessRequest(
        request.maximumAgeMs,
        request.evaluatedAt,
      )
    )
      throw new AgenticWalletAccountingLedgerReconciliationFreshnessRequestError();

    const requestSnapshot = {
      maximumAgeMs: request.maximumAgeMs,
      evaluatedAt: new Date(request.evaluatedAt),
    };
    const stored = await this.store.getByReconciliationId(reconciliationId);
    if (stored === null) return null;
    return assessAgenticWalletAccountingLedgerReconciliationFreshness(
      stored,
      requestSnapshot.maximumAgeMs,
      requestSnapshot.evaluatedAt,
    );
  }
}

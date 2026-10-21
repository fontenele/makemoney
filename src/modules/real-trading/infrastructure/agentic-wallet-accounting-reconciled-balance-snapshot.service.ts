import {
  AgenticWalletAccountingLedgerReconciliationFreshnessAssessment,
  AgenticWalletAccountingLedgerReconciliationFreshnessBlocker,
  isValidAgenticWalletAccountingLedgerReconciliationFreshnessRequest,
} from './agentic-wallet-accounting-ledger-reconciliation-freshness';
import { AgenticWalletAccountingLedgerReconciliationFreshnessRequest } from './agentic-wallet-accounting-ledger-reconciliation-freshness.service';
import {
  AgenticWalletAccountingReconciledBalanceSnapshot,
  AgenticWalletAccountingReconciledBalanceSnapshotBlocker,
  prepareAgenticWalletAccountingReconciledBalanceSnapshot,
} from './agentic-wallet-accounting-reconciled-balance-snapshot';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export interface AgenticWalletAccountingLatestReconciliationFreshnessPort {
  assessLatest(
    initializationId: string,
    request: AgenticWalletAccountingLedgerReconciliationFreshnessRequest,
  ): Promise<AgenticWalletAccountingLedgerReconciliationFreshnessAssessment | null>;
}

export type AgenticWalletAccountingLatestReconciledBalanceSnapshotBlocker =
  | 'accounting_ledger_reconciliation_evidence_absent'
  | AgenticWalletAccountingLedgerReconciliationFreshnessBlocker
  | AgenticWalletAccountingReconciledBalanceSnapshotBlocker;

export interface AgenticWalletAccountingLatestReconciledBalanceSnapshotAssessment {
  readonly scope: 'agentic_wallet_accounting_latest_reconciled_balance_snapshot_assessment';
  readonly status: 'reconciled_balances_ready' | 'blocked';
  readonly blockers: readonly AgenticWalletAccountingLatestReconciledBalanceSnapshotBlocker[];
  readonly reconciliationFreshnessStatus:
    | 'absent'
    | AgenticWalletAccountingLedgerReconciliationFreshnessAssessment['status'];
  readonly snapshot: AgenticWalletAccountingReconciledBalanceSnapshot | null;
  readonly balanceCoverageComplete: boolean;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
}

export class AgenticWalletAccountingLatestReconciledBalanceSnapshotRequestError extends Error {
  constructor() {
    super('Latest reconciled accounting balance snapshot request is invalid');
    this.name =
      AgenticWalletAccountingLatestReconciledBalanceSnapshotRequestError.name;
  }
}

export class AgenticWalletAccountingLatestReconciledBalanceSnapshotService {
  constructor(
    private readonly freshness: AgenticWalletAccountingLatestReconciliationFreshnessPort,
  ) {}

  async loadLatest(
    initializationId: string,
    request: AgenticWalletAccountingLedgerReconciliationFreshnessRequest,
  ): Promise<AgenticWalletAccountingLatestReconciledBalanceSnapshotAssessment> {
    if (
      typeof initializationId !== 'string' ||
      !UUID_PATTERN.test(initializationId) ||
      typeof request !== 'object' ||
      request === null ||
      !isValidAgenticWalletAccountingLedgerReconciliationFreshnessRequest(
        request.maximumAgeMs,
        request.evaluatedAt,
      )
    )
      throw new AgenticWalletAccountingLatestReconciledBalanceSnapshotRequestError();

    const requestSnapshot = {
      maximumAgeMs: request.maximumAgeMs,
      evaluatedAt: new Date(request.evaluatedAt),
    };
    const freshness = await this.freshness.assessLatest(
      initializationId,
      requestSnapshot,
    );
    if (freshness === null) {
      return assessment(
        ['accounting_ledger_reconciliation_evidence_absent'],
        'absent',
        null,
      );
    }
    if (freshness.evidence === null) {
      return assessment([...freshness.blockers], freshness.status, null);
    }

    const projection = prepareAgenticWalletAccountingReconciledBalanceSnapshot(
      freshness.evidence,
      initializationId,
    );
    return assessment(
      [...projection.blockers],
      freshness.status,
      projection.snapshot,
    );
  }
}

function assessment(
  blockers: readonly AgenticWalletAccountingLatestReconciledBalanceSnapshotBlocker[],
  reconciliationFreshnessStatus: AgenticWalletAccountingLatestReconciledBalanceSnapshotAssessment['reconciliationFreshnessStatus'],
  snapshot: AgenticWalletAccountingReconciledBalanceSnapshot | null,
): AgenticWalletAccountingLatestReconciledBalanceSnapshotAssessment {
  return {
    scope:
      'agentic_wallet_accounting_latest_reconciled_balance_snapshot_assessment',
    status: snapshot === null ? 'blocked' : 'reconciled_balances_ready',
    blockers,
    reconciliationFreshnessStatus,
    snapshot,
    balanceCoverageComplete: snapshot !== null,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
}

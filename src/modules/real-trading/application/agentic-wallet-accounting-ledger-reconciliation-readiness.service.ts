import { AgenticWalletAccountingLatestReconciledBalanceSnapshotAssessment } from '../infrastructure/agentic-wallet-accounting-reconciled-balance-snapshot.service';
import { isValidAgenticWalletAccountingReconciledBalanceSnapshot } from '../infrastructure/agentic-wallet-accounting-reconciled-balance-snapshot';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export interface AgenticWalletAccountingLedgerReconciliationReadinessResult {
  readonly scope: 'agentic_wallet_accounting_ledger_reconciliation_readiness';
  readonly status: 'blocked' | 'fresh_reconciled_balances_ready';
  readonly blockers: readonly string[];
  readonly initializationId: string;
  readonly reconciliationId: string | null;
  readonly reconciliationFingerprint: string | null;
  readonly maximumAgeMs: number;
  readonly evidenceAgeMs: number | null;
  readonly walletObservedAt: Date | null;
  readonly evaluatedAt: Date;
  readonly reconciliationFreshnessStatus: AgenticWalletAccountingLatestReconciledBalanceSnapshotAssessment['reconciliationFreshnessStatus'];
  readonly balanceCoverageComplete: boolean;
  readonly providerReadStarted: false;
  readonly balanceQuantitiesExposed: false;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
  readonly strategyExecutionAuthorized: false;
  readonly automaticRetryAllowed: false;
}

export class AgenticWalletAccountingLedgerReconciliationReadinessRequestError extends Error {}

export interface AgenticWalletAccountingLatestReconciledBalanceSnapshotPort {
  loadLatest(
    initializationId: string,
    request: { maximumAgeMs: number; evaluatedAt: Date },
  ): Promise<AgenticWalletAccountingLatestReconciledBalanceSnapshotAssessment>;
}

export class AgenticWalletAccountingLedgerReconciliationReadinessService {
  constructor(
    private readonly balances: AgenticWalletAccountingLatestReconciledBalanceSnapshotPort,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async assess(
    value: unknown,
  ): Promise<AgenticWalletAccountingLedgerReconciliationReadinessResult> {
    const request = parseRequest(value);
    const evaluatedAt = this.now();
    if (
      !(evaluatedAt instanceof Date) ||
      !Number.isFinite(evaluatedAt.getTime())
    )
      throw new Error('Accounting ledger readiness clock is invalid');

    const assessment = await this.balances.loadLatest(
      request.initializationId,
      {
        maximumAgeMs: request.maximumAgeMs,
        evaluatedAt: new Date(evaluatedAt),
      },
    );
    assertValidAssessment(assessment, request.initializationId);
    if (assessment.snapshot === null)
      return blocked(request, assessment, evaluatedAt);

    const snapshot = assessment.snapshot;
    return {
      scope: 'agentic_wallet_accounting_ledger_reconciliation_readiness',
      status: 'fresh_reconciled_balances_ready',
      blockers: [],
      initializationId: request.initializationId,
      reconciliationId: snapshot.reconciliationId,
      reconciliationFingerprint: snapshot.reconciliationFingerprint,
      maximumAgeMs: request.maximumAgeMs,
      evidenceAgeMs:
        snapshot.evaluatedAt.getTime() - snapshot.observedAt.getTime(),
      walletObservedAt: new Date(snapshot.observedAt),
      evaluatedAt: new Date(snapshot.evaluatedAt),
      reconciliationFreshnessStatus: assessment.reconciliationFreshnessStatus,
      balanceCoverageComplete: true,
      providerReadStarted: false,
      balanceQuantitiesExposed: false,
      quoteAuthorized: false,
      submissionAuthorized: false,
      strategyExecutionAuthorized: false,
      automaticRetryAllowed: false,
    };
  }
}

function parseRequest(value: unknown): {
  initializationId: string;
  maximumAgeMs: number;
} {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(',') !== 'initializationId,maximumAgeMs'
  )
    throw new AgenticWalletAccountingLedgerReconciliationReadinessRequestError();
  const request = value as Record<string, unknown>;
  if (
    typeof request.initializationId !== 'string' ||
    !UUID_PATTERN.test(request.initializationId) ||
    !Number.isSafeInteger(request.maximumAgeMs) ||
    (request.maximumAgeMs as number) < 1 ||
    (request.maximumAgeMs as number) > 60_000
  )
    throw new AgenticWalletAccountingLedgerReconciliationReadinessRequestError();
  return {
    initializationId: request.initializationId,
    maximumAgeMs: request.maximumAgeMs as number,
  };
}

function assertValidAssessment(
  assessment: AgenticWalletAccountingLatestReconciledBalanceSnapshotAssessment,
  initializationId: string,
): void {
  const commonValid =
    assessment.scope ===
      'agentic_wallet_accounting_latest_reconciled_balance_snapshot_assessment' &&
    Array.isArray(assessment.blockers) &&
    assessment.blockers.every((blocker) => typeof blocker === 'string') &&
    assessment.quoteAuthorized === false &&
    assessment.submissionAuthorized === false;
  const readyValid =
    assessment.status === 'reconciled_balances_ready' &&
    assessment.blockers.length === 0 &&
    assessment.balanceCoverageComplete === true &&
    assessment.reconciliationFreshnessStatus ===
      'reconciliation_evidence_fresh' &&
    isValidAgenticWalletAccountingReconciledBalanceSnapshot(
      assessment.snapshot,
    ) &&
    assessment.snapshot.initializationId === initializationId;
  const blockedValid =
    assessment.status === 'blocked' &&
    assessment.blockers.length > 0 &&
    assessment.balanceCoverageComplete === false &&
    assessment.snapshot === null;
  if (!commonValid || (!readyValid && !blockedValid))
    throw new Error('Latest reconciled balance assessment is invalid');
}

function blocked(
  request: { initializationId: string; maximumAgeMs: number },
  assessment: AgenticWalletAccountingLatestReconciledBalanceSnapshotAssessment,
  evaluatedAt: Date,
): AgenticWalletAccountingLedgerReconciliationReadinessResult {
  return {
    scope: 'agentic_wallet_accounting_ledger_reconciliation_readiness',
    status: 'blocked',
    blockers: [...assessment.blockers],
    initializationId: request.initializationId,
    reconciliationId: null,
    reconciliationFingerprint: null,
    maximumAgeMs: request.maximumAgeMs,
    evidenceAgeMs: null,
    walletObservedAt: null,
    evaluatedAt: new Date(evaluatedAt),
    reconciliationFreshnessStatus: assessment.reconciliationFreshnessStatus,
    balanceCoverageComplete: false,
    providerReadStarted: false,
    balanceQuantitiesExposed: false,
    quoteAuthorized: false,
    submissionAuthorized: false,
    strategyExecutionAuthorized: false,
    automaticRetryAllowed: false,
  };
}

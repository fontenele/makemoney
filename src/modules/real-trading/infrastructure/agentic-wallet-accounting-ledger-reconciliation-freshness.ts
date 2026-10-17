import { isDeepStrictEqual } from 'node:util';

import { prepareAgenticWalletAccountingLedgerReconciliationCommitment } from './agentic-wallet-accounting-ledger-reconciliation-commitment';
import {
  isValidStoredAgenticWalletAccountingLedgerReconciliationCommitment,
  StoredAgenticWalletAccountingLedgerReconciliationCommitment,
} from './agentic-wallet-accounting-ledger-reconciliation-commitment.store';

export type AgenticWalletAccountingLedgerReconciliationFreshnessBlocker =
  | 'invalid_stored_accounting_ledger_reconciliation_commitment'
  | 'invalid_accounting_ledger_reconciliation_freshness_request'
  | 'accounting_ledger_reconciliation_evidence_from_future'
  | 'accounting_ledger_reconciliation_evidence_stale';

export interface AgenticWalletAccountingLedgerReconciliationFreshEvidence {
  readonly scope: 'agentic_wallet_accounting_ledger_reconciliation_fresh_evidence';
  readonly stored: StoredAgenticWalletAccountingLedgerReconciliationCommitment;
  readonly maximumAgeMs: number;
  readonly evaluatedAt: Date;
  readonly reconciliationCurrent: true;
  readonly walletObservationAuthenticated: true;
  readonly ledgerBalancesReconciled: true;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
}

export interface AgenticWalletAccountingLedgerReconciliationFreshnessAssessment {
  readonly scope: 'agentic_wallet_accounting_ledger_reconciliation_freshness_assessment';
  readonly status: 'reconciliation_evidence_fresh' | 'blocked';
  readonly blockers: readonly AgenticWalletAccountingLedgerReconciliationFreshnessBlocker[];
  readonly evidence: AgenticWalletAccountingLedgerReconciliationFreshEvidence | null;
  readonly reconciliationCurrent: boolean;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
}

export function assessAgenticWalletAccountingLedgerReconciliationFreshness(
  stored: StoredAgenticWalletAccountingLedgerReconciliationCommitment,
  maximumAgeMs: number,
  evaluatedAt: Date,
): AgenticWalletAccountingLedgerReconciliationFreshnessAssessment {
  const blockers: AgenticWalletAccountingLedgerReconciliationFreshnessBlocker[] =
    [];
  const storedValid =
    isValidStoredAgenticWalletAccountingLedgerReconciliationCommitment(stored);
  addIf(
    blockers,
    !storedValid,
    'invalid_stored_accounting_ledger_reconciliation_commitment',
  );
  const requestValid =
    Number.isInteger(maximumAgeMs) &&
    maximumAgeMs >= 1 &&
    maximumAgeMs <= 60_000 &&
    evaluatedAt instanceof Date &&
    Number.isFinite(evaluatedAt.getTime());
  addIf(
    blockers,
    !requestValid,
    'invalid_accounting_ledger_reconciliation_freshness_request',
  );

  if (storedValid && requestValid) {
    const observedAt = stored.commitment.reconciliation.walletObservedAt;
    const evidenceFromFuture =
      observedAt.getTime() > evaluatedAt.getTime() ||
      stored.recordedAt.getTime() > evaluatedAt.getTime();
    addIf(
      blockers,
      evidenceFromFuture,
      'accounting_ledger_reconciliation_evidence_from_future',
    );
    addIf(
      blockers,
      !evidenceFromFuture &&
        evaluatedAt.getTime() - observedAt.getTime() > maximumAgeMs,
      'accounting_ledger_reconciliation_evidence_stale',
    );
  }

  const evidence =
    blockers.length === 0
      ? buildEvidence(stored, maximumAgeMs, evaluatedAt)
      : null;
  return {
    scope:
      'agentic_wallet_accounting_ledger_reconciliation_freshness_assessment',
    status: evidence === null ? 'blocked' : 'reconciliation_evidence_fresh',
    blockers,
    evidence,
    reconciliationCurrent: evidence !== null,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
}

export function isValidAgenticWalletAccountingLedgerReconciliationFreshEvidence(
  value: unknown,
): value is AgenticWalletAccountingLedgerReconciliationFreshEvidence {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const evidence = value as Record<string, unknown>;
  const assessment = assessAgenticWalletAccountingLedgerReconciliationFreshness(
    evidence.stored as StoredAgenticWalletAccountingLedgerReconciliationCommitment,
    evidence.maximumAgeMs as number,
    evidence.evaluatedAt as Date,
  );
  return (
    evidence.scope ===
      'agentic_wallet_accounting_ledger_reconciliation_fresh_evidence' &&
    evidence.reconciliationCurrent === true &&
    evidence.walletObservationAuthenticated === true &&
    evidence.ledgerBalancesReconciled === true &&
    evidence.quoteAuthorized === false &&
    evidence.submissionAuthorized === false &&
    assessment.evidence !== null &&
    isDeepStrictEqual(assessment.evidence, value)
  );
}

function buildEvidence(
  stored: StoredAgenticWalletAccountingLedgerReconciliationCommitment,
  maximumAgeMs: number,
  evaluatedAt: Date,
): AgenticWalletAccountingLedgerReconciliationFreshEvidence {
  const prepared = prepareAgenticWalletAccountingLedgerReconciliationCommitment(
    stored.commitment.reconciliation,
    stored.commitment.reconciliationId,
    stored.commitment.preparedAt,
  ).commitment;
  if (prepared === null)
    throw new Error('Stored accounting ledger reconciliation became invalid');
  return {
    scope: 'agentic_wallet_accounting_ledger_reconciliation_fresh_evidence',
    stored: {
      commitment: prepared,
      recordedAt: new Date(stored.recordedAt),
    },
    maximumAgeMs,
    evaluatedAt: new Date(evaluatedAt),
    reconciliationCurrent: true,
    walletObservationAuthenticated: true,
    ledgerBalancesReconciled: true,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
}

function addIf(
  blockers: AgenticWalletAccountingLedgerReconciliationFreshnessBlocker[],
  condition: boolean,
  blocker: AgenticWalletAccountingLedgerReconciliationFreshnessBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}

import { isDeepStrictEqual } from 'node:util';

import { AgenticWalletMarketSwapLocalAccountingBalance } from './agentic-wallet-market-swap-accounting-mutation-application';
import {
  AgenticWalletAccountingLedgerReconciliationFreshEvidence,
  assessAgenticWalletAccountingLedgerReconciliationFreshness,
  isValidAgenticWalletAccountingLedgerReconciliationFreshEvidence,
} from './agentic-wallet-accounting-ledger-reconciliation-freshness';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export type AgenticWalletAccountingReconciledBalanceSnapshotBlocker =
  | 'invalid_fresh_accounting_ledger_reconciliation_evidence'
  | 'invalid_accounting_initialization_identity'
  | 'accounting_initialization_identity_mismatch';

export interface AgenticWalletAccountingReconciledBalanceSnapshot {
  readonly scope: 'agentic_wallet_accounting_reconciled_balance_snapshot';
  readonly initializationId: string;
  readonly reconciliationId: string;
  readonly reconciliationFingerprint: string;
  readonly providerId: 'agentic_wallet';
  readonly chainId: '56';
  readonly balances: readonly AgenticWalletMarketSwapLocalAccountingBalance[];
  readonly observedAt: Date;
  readonly evaluatedAt: Date;
  readonly evidence: AgenticWalletAccountingLedgerReconciliationFreshEvidence;
  readonly balanceCoverageComplete: true;
  readonly walletObservationAuthenticated: true;
  readonly ledgerBalancesReconciled: true;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
}

export interface AgenticWalletAccountingReconciledBalanceSnapshotAssessment {
  readonly scope: 'agentic_wallet_accounting_reconciled_balance_snapshot_assessment';
  readonly status: 'reconciled_balances_ready' | 'blocked';
  readonly blockers: readonly AgenticWalletAccountingReconciledBalanceSnapshotBlocker[];
  readonly snapshot: AgenticWalletAccountingReconciledBalanceSnapshot | null;
  readonly balanceCoverageComplete: boolean;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
}

export function prepareAgenticWalletAccountingReconciledBalanceSnapshot(
  evidence: AgenticWalletAccountingLedgerReconciliationFreshEvidence,
  initializationId: string,
): AgenticWalletAccountingReconciledBalanceSnapshotAssessment {
  const blockers: AgenticWalletAccountingReconciledBalanceSnapshotBlocker[] =
    [];
  const evidenceValid =
    isValidAgenticWalletAccountingLedgerReconciliationFreshEvidence(evidence);
  addIf(
    blockers,
    !evidenceValid,
    'invalid_fresh_accounting_ledger_reconciliation_evidence',
  );
  const identityValid =
    typeof initializationId === 'string' && UUID_PATTERN.test(initializationId);
  addIf(blockers, !identityValid, 'invalid_accounting_initialization_identity');
  addIf(
    blockers,
    evidenceValid &&
      identityValid &&
      evidence.stored.commitment.reconciliation.initializationId !==
        initializationId,
    'accounting_initialization_identity_mismatch',
  );

  if (blockers.length > 0 || !evidenceValid || !identityValid) {
    return assessment(blockers, null);
  }

  const canonicalEvidence =
    assessAgenticWalletAccountingLedgerReconciliationFreshness(
      evidence.stored,
      evidence.maximumAgeMs,
      evidence.evaluatedAt,
    ).evidence;
  if (canonicalEvidence === null)
    throw new Error('Fresh reconciliation evidence became invalid');
  const commitment = canonicalEvidence.stored.commitment;
  const reconciliation = commitment.reconciliation;
  return assessment(blockers, {
    scope: 'agentic_wallet_accounting_reconciled_balance_snapshot',
    initializationId,
    reconciliationId: commitment.reconciliationId,
    reconciliationFingerprint: commitment.reconciliationFingerprint,
    providerId: 'agentic_wallet',
    chainId: '56',
    balances: reconciliation.walletBalances
      .map((balance) => ({ ...balance }))
      .sort((left, right) => identity(left).localeCompare(identity(right))),
    observedAt: new Date(reconciliation.walletObservedAt),
    evaluatedAt: new Date(canonicalEvidence.evaluatedAt),
    evidence: canonicalEvidence,
    balanceCoverageComplete: true,
    walletObservationAuthenticated: true,
    ledgerBalancesReconciled: true,
    quoteAuthorized: false,
    submissionAuthorized: false,
  });
}

export function isValidAgenticWalletAccountingReconciledBalanceSnapshot(
  value: unknown,
): value is AgenticWalletAccountingReconciledBalanceSnapshot {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const snapshot = value as Record<string, unknown>;
  const regenerated = prepareAgenticWalletAccountingReconciledBalanceSnapshot(
    snapshot.evidence as AgenticWalletAccountingLedgerReconciliationFreshEvidence,
    snapshot.initializationId as string,
  ).snapshot;
  return regenerated !== null && isDeepStrictEqual(regenerated, value);
}

function assessment(
  blockers: readonly AgenticWalletAccountingReconciledBalanceSnapshotBlocker[],
  snapshot: AgenticWalletAccountingReconciledBalanceSnapshot | null,
): AgenticWalletAccountingReconciledBalanceSnapshotAssessment {
  return {
    scope: 'agentic_wallet_accounting_reconciled_balance_snapshot_assessment',
    status: snapshot === null ? 'blocked' : 'reconciled_balances_ready',
    blockers,
    snapshot,
    balanceCoverageComplete: snapshot !== null,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
}

function identity(
  balance: AgenticWalletMarketSwapLocalAccountingBalance,
): string {
  return balance.assetType === 'token'
    ? `token:${balance.assetAddress}`
    : `native:${balance.assetSymbol}`;
}

function addIf(
  blockers: AgenticWalletAccountingReconciledBalanceSnapshotBlocker[],
  condition: boolean,
  blocker: AgenticWalletAccountingReconciledBalanceSnapshotBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
